import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../infrastructure/logger/logger.js";
import { getQueue } from "../infrastructure/queue/queues.js";
import { getRedis } from "../infrastructure/redis/redis.js";
import { AppError } from "../utils/AppError.js";
import { AuditService } from "./audit.service.js";

const DEFAULT_RESERVATION_MINUTES = Number(process.env.INVENTORY_RESERVATION_TTL_MINUTES || 15);
const DEFAULT_NEAR_EXPIRY_DAYS = 7;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const auditService = new AuditService();
const categorySummarySelect = { id: true, name: true };

export class InventoryService {
  resolveLowStockThreshold(value) {
    const threshold = Number(value);
    if (Number.isInteger(threshold) && threshold >= 0) {
      return threshold;
    }

    return DEFAULT_LOW_STOCK_THRESHOLD;
  }

  buildBatches(batches = [], expiryDays = DEFAULT_NEAR_EXPIRY_DAYS) {
    const now = new Date();
    const nearExpiryThreshold = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    return batches.map((batch) => {
      const expiresAt = batch.expiresAt ? new Date(batch.expiresAt) : null;
      const isNearExpiry = Boolean(
        expiresAt &&
          expiresAt >= now &&
          expiresAt <= nearExpiryThreshold &&
          batch.remainingQty > 0 &&
          batch.status !== "EXPIRED"
      );

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        supplier: batch.supplier,
        receivedAt: batch.receivedAt,
        expiresAt: batch.expiresAt,
        unitCost: batch.unitCost != null ? Number(batch.unitCost) : null,
        receivedQty: batch.receivedQty,
        remainingQty: batch.remainingQty,
        status: batch.status,
        isNearExpiry
      };
    });
  }

  mapInventorySnapshot({
    product,
    inventoryItem,
    expiryDays = DEFAULT_NEAR_EXPIRY_DAYS
  }) {
    const batches = this.buildBatches(inventoryItem?.batches || [], expiryDays);
    const lowStockThreshold = this.resolveLowStockThreshold(inventoryItem?.reorderPoint);
    const availableQty = inventoryItem?.availableQty ?? Math.max(0, Number(product?.stock) || 0);
    const reservedQty = inventoryItem?.reservedQty ?? 0;
    const onHandQty = inventoryItem?.onHandQty ?? availableQty + reservedQty;

    return {
      productId: product.id,
      product: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock: availableQty,
        unit: product.unit,
        barcode: product.barcode,
        categoryId: product.categoryId,
        category: product.category || null,
        lowStockThreshold,
        reorderPoint: lowStockThreshold
      },
      onHandQty,
      reservedQty,
      availableQty,
      lowStockThreshold,
      reorderPoint: lowStockThreshold,
      reorderQty: inventoryItem?.reorderQty ?? 0,
      safetyStockQty: inventoryItem?.safetyStockQty ?? 0,
      isActive: inventoryItem?.isActive ?? true,
      isLowStock: availableQty <= lowStockThreshold,
      batches,
      createdAt: inventoryItem?.createdAt ?? product.createdAt,
      updatedAt: inventoryItem?.updatedAt ?? product.updatedAt
    };
  }

  async enqueueReservationExpiry(reservationId, ttlMinutes) {
    if (!env.queueEnabled || !env.redisEnabled) {
      return;
    }

    const queue = getQueue("reservation-expiry");
    if (!queue) {
      logger.warn(
        { reservationId },
        "Reservation expiry queue unavailable. Reservation expiry will rely on explicit cleanup."
      );
      return;
    }

    await queue.add(
      "inventory.reservation.expire",
      { reservationId },
      {
        jobId: `reservation-expiry:${reservationId}`,
        delay: ttlMinutes * 60 * 1000
      }
    );
  }

  async trackReservationExpiry(reservation) {
    if (!reservation || !env.redisEnabled || !env.queueEnabled) {
      return;
    }

    const ttlSeconds = Math.max(
      1,
      Math.ceil((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000)
    );
    const redis = getRedis();
    if (redis) {
      await redis.set(
        `inventory:reservation:${reservation.id}`,
        JSON.stringify({ reservationId: reservation.id, expiresAt: reservation.expiresAt }),
        "EX",
        ttlSeconds
      );
    }

    await this.enqueueReservationExpiry(reservation.id, Math.ceil(ttlSeconds / 60));
  }

  mapInventoryRecord(record, expiryDays = DEFAULT_NEAR_EXPIRY_DAYS) {
    return this.mapInventorySnapshot({
      product: record.product,
      inventoryItem: record,
      expiryDays
    });
  }

  async ensureInventoryForProduct(productId, tx = prisma) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        inventoryItem: {
          include: {
            batches: true
          }
        }
      }
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    if (product.inventoryItem) {
      return product.inventoryItem;
    }

    const initialQty = Math.max(0, Number(product.stock) || 0);
    const inventoryItem = await tx.inventoryItem.create({
      data: {
        productId: product.id,
        onHandQty: initialQty,
        reservedQty: 0,
        availableQty: initialQty,
        reorderPoint: DEFAULT_LOW_STOCK_THRESHOLD
      }
    });

    if (initialQty > 0) {
      await tx.inventoryBatch.create({
        data: {
          inventoryItemId: inventoryItem.id,
          batchCode: `MIG-${product.id}-${randomUUID().slice(0, 8)}`,
          supplier: "SYSTEM_MIGRATION",
          receivedAt: product.createdAt || new Date(),
          receivedQty: initialQty,
          remainingQty: initialQty,
          status: "ACTIVE"
        }
      });
    }

    return tx.inventoryItem.findUnique({
      where: { id: inventoryItem.id },
      include: { batches: true }
    });
  }

  async createInventoryForNewProduct(product, options = {}, tx = prisma) {
    const startingQty = Math.max(0, Number(product.stock) || 0);

    const inventoryItem = await tx.inventoryItem.create({
      data: {
        productId: product.id,
        onHandQty: startingQty,
        reservedQty: 0,
        availableQty: startingQty,
        reorderPoint: this.resolveLowStockThreshold(options.lowStockThreshold ?? options.reorderPoint),
        reorderQty: Number(options.reorderQty || 0),
        safetyStockQty: Number(options.safetyStockQty || 0)
      }
    });

    if (startingQty > 0) {
      const batch = await tx.inventoryBatch.create({
        data: {
          inventoryItemId: inventoryItem.id,
          batchCode: options.batchCode || `INIT-${product.id}-${randomUUID().slice(0, 8)}`,
          supplier: options.supplier || "INITIAL_STOCK",
          receivedAt: options.receivedAt ? new Date(options.receivedAt) : new Date(),
          expiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
          unitCost: options.unitCost ?? null,
          receivedQty: startingQty,
          remainingQty: startingQty,
          status: this.resolveBatchStatus({
            remainingQty: startingQty,
            expiresAt: options.expiresAt ? new Date(options.expiresAt) : null
          })
        }
      });

      await this.createMovement(
        {
          productId: product.id,
          batchId: batch.id,
          type: "RECEIVE",
          quantityDelta: startingQty,
          referenceType: "product",
          referenceId: String(product.id),
          reason: "Initial stock created during product setup."
        },
        tx
      );
    }

    return inventoryItem;
  }

  async getInventoryItemByProductId(productId, { expiryDays = DEFAULT_NEAR_EXPIRY_DAYS } = {}, tx = prisma) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: categorySummarySelect
        },
        inventoryItem: {
          include: {
            batches: {
              orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }]
            }
          }
        }
      }
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return this.mapInventorySnapshot({
      product,
      inventoryItem: product.inventoryItem,
      expiryDays
    });
  }

  async listInventory({ page, limit, lowStockOnly = false, nearExpiryOnly = false, expiryDays = DEFAULT_NEAR_EXPIRY_DAYS } = {}) {
    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (currentPage - 1) * perPage;

    const products = await prisma.product.findMany({
      include: {
        category: {
          select: categorySummarySelect
        },
        inventoryItem: {
          include: {
            batches: {
              orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }]
            }
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    let mappedItems = products
      .map((product) =>
        this.mapInventorySnapshot({
          product,
          inventoryItem: product.inventoryItem,
          expiryDays
        })
      )
      .filter((item) => item.isActive);

    if (lowStockOnly) {
      mappedItems = mappedItems.filter((item) => item.isLowStock);
    }

    if (nearExpiryOnly) {
      mappedItems = mappedItems.filter((item) => item.batches.some((batch) => batch.isNearExpiry));
    }

    mappedItems = mappedItems.sort((left, right) => {
      if (left.isLowStock !== right.isLowStock) {
        return left.isLowStock ? -1 : 1;
      }

      if (left.availableQty !== right.availableQty) {
        return left.availableQty - right.availableQty;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

    const total = mappedItems.length;
    const pagedItems = mappedItems.slice(skip, skip + perPage);

    return {
      inventory: pagedItems,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    };
  }

  async getInventoryAlerts({ expiryDays = DEFAULT_NEAR_EXPIRY_DAYS } = {}) {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: categorySummarySelect
        },
        inventoryItem: {
          include: {
            batches: {
              orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }]
            }
          }
        }
      }
    });

    const mapped = products
      .map((product) =>
        this.mapInventorySnapshot({
          product,
          inventoryItem: product.inventoryItem,
          expiryDays
        })
      )
      .filter((item) => item.isActive);

    return {
      lowStock: mapped
        .filter((item) => item.isLowStock)
        .sort((left, right) => left.availableQty - right.availableQty),
      nearExpiry: mapped.filter((item) => item.batches.some((batch) => batch.isNearExpiry))
    };
  }

  resolveBatchStatus({ remainingQty, expiresAt }) {
    if (remainingQty <= 0) {
      return "DEPLETED";
    }

    if (expiresAt && expiresAt < new Date()) {
      return "EXPIRED";
    }

    return "ACTIVE";
  }

  async syncProductStock(productId, tx = prisma) {
    const item = await tx.inventoryItem.findUnique({
      where: { productId }
    });

    if (!item) {
      return null;
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        stock: item.availableQty
      }
    });

    return item;
  }

  async createMovement(data, tx = prisma) {
    return tx.inventoryMovement.create({
      data
    });
  }

  async reserveStock({ userId, items, cartSessionKey = null, ttlMinutes = DEFAULT_RESERVATION_MINUTES, trackExpiry = true }, tx = prisma) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const reservation = await tx.inventoryReservation.create({
      data: {
        cartSessionKey,
        status: "ACTIVE",
        expiresAt,
        createdByUserId: userId || null
      }
    });

    for (const item of items) {
      const inventoryItem = await this.ensureInventoryForProduct(item.productId, tx);
      const quantity = Number(item.quantity);

      if (inventoryItem.availableQty < quantity) {
        throw new AppError(`Insufficient stock for product #${item.productId}.`, 400);
      }

      const batches = [...inventoryItem.batches]
        .filter((batch) => {
          if (batch.status === "QUARANTINED" || batch.status === "EXPIRED" || batch.remainingQty <= 0) {
            return false;
          }

          if (batch.expiresAt && batch.expiresAt < new Date()) {
            return false;
          }

          return true;
        })
        .sort((left, right) => {
          const leftExpiry = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
          const rightExpiry = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;

          if (leftExpiry !== rightExpiry) {
            return leftExpiry - rightExpiry;
          }

          return new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime();
        });

      let remainingToAllocate = quantity;

      for (const batch of batches) {
        if (remainingToAllocate <= 0) break;

        const allocatedQty = Math.min(remainingToAllocate, batch.remainingQty);
        if (allocatedQty <= 0) continue;

        const nextRemainingQty = batch.remainingQty - allocatedQty;

        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            remainingQty: nextRemainingQty,
            status: this.resolveBatchStatus({
              remainingQty: nextRemainingQty,
              expiresAt: batch.expiresAt
            })
          }
        });

        await tx.inventoryReservationItem.create({
          data: {
            reservationId: reservation.id,
            productId: item.productId,
            batchId: batch.id,
            quantity: allocatedQty
          }
        });

        await this.createMovement(
          {
            productId: item.productId,
            batchId: batch.id,
            type: "RESERVE",
            quantityDelta: -allocatedQty,
            referenceType: "inventory_reservation",
            referenceId: String(reservation.id),
            reason: "Stock reserved for checkout."
          },
          tx
        );

        remainingToAllocate -= allocatedQty;
      }

      if (remainingToAllocate > 0) {
        throw new AppError(`Insufficient batch stock for product #${item.productId}.`, 400);
      }

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          reservedQty: { increment: quantity },
          availableQty: { decrement: quantity }
        }
      });

      await this.syncProductStock(item.productId, tx);
    }

    const createdReservation = await tx.inventoryReservation.findUnique({
      where: { id: reservation.id },
      include: { items: true }
    });

    if (trackExpiry) {
      await this.trackReservationExpiry(createdReservation);
    }

    return createdReservation;
  }

  async commitReservation(reservationId, _options = {}, tx = prisma) {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
      include: { items: true }
    });

    if (!reservation) {
      throw new AppError("Inventory reservation not found.", 404);
    }

    if (reservation.status === "COMMITTED") {
      return reservation;
    }

    if (reservation.status !== "ACTIVE") {
      throw new AppError("Only active reservations can be committed.", 400);
    }

    const quantitiesByProduct = new Map();
    for (const item of reservation.items) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) || 0) + item.quantity
      );

      await this.createMovement(
        {
          productId: item.productId,
          batchId: item.batchId,
          type: "COMMIT",
          quantityDelta: -item.quantity,
          referenceType: "inventory_reservation",
          referenceId: String(reservation.id),
          reason: "Reserved stock committed to order."
        },
        tx
      );
    }

    for (const [productId, quantity] of quantitiesByProduct.entries()) {
      const updatedItem = await tx.inventoryItem.update({
        where: { productId },
        data: {
          onHandQty: { decrement: quantity },
          reservedQty: { decrement: quantity }
        }
      });

      await tx.inventoryItem.update({
        where: { id: updatedItem.id },
        data: {
          availableQty: updatedItem.availableQty
        }
      });

      await this.syncProductStock(productId, tx);
    }

    const updatedReservation = await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: "COMMITTED" }
    });

    return updatedReservation;
  }

  async releaseReservation(reservationId, { status = "RELEASED", reason = "Reservation released." } = {}, tx = prisma) {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
      include: { items: true }
    });

    if (!reservation) {
      throw new AppError("Inventory reservation not found.", 404);
    }

    if (reservation.status === "RELEASED" || reservation.status === "EXPIRED") {
      return reservation;
    }

    if (reservation.status === "COMMITTED") {
      throw new AppError("Committed reservations cannot be released.", 400);
    }

    const quantitiesByProduct = new Map();
    for (const item of reservation.items) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) || 0) + item.quantity
      );

      const batch = await tx.inventoryBatch.findUnique({ where: { id: item.batchId } });

      await tx.inventoryBatch.update({
        where: { id: item.batchId },
        data: {
          remainingQty: { increment: item.quantity },
          status: this.resolveBatchStatus({
            remainingQty: (batch?.remainingQty || 0) + item.quantity,
            expiresAt: batch?.expiresAt || null
          })
        }
      });

      await this.createMovement(
        {
          productId: item.productId,
          batchId: item.batchId,
          type: "RELEASE",
          quantityDelta: item.quantity,
          referenceType: "inventory_reservation",
          referenceId: String(reservation.id),
          reason
        },
        tx
      );
    }

    for (const [productId, quantity] of quantitiesByProduct.entries()) {
      await tx.inventoryItem.update({
        where: { productId },
        data: {
          reservedQty: { decrement: quantity },
          availableQty: { increment: quantity }
        }
      });

      await this.syncProductStock(productId, tx);
    }

    const updatedReservation = await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status }
    });

    return updatedReservation;
  }

  async expireReservationIfNeeded(reservationId) {
    const reservation = await prisma.inventoryReservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      return null;
    }

    if (reservation.status !== "ACTIVE") {
      return reservation;
    }

    if (reservation.expiresAt > new Date()) {
      return reservation;
    }

    return prisma.$transaction(async (tx) =>
      this.releaseReservation(
        reservationId,
        { status: "EXPIRED", reason: "Reservation expired after checkout timeout." },
        tx
      )
    );
  }

  async countOverdueActiveReservations() {
    return prisma.inventoryReservation.count({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: new Date()
        }
      }
    });
  }

  async cleanupExpiredReservations({ limit = 100, actorUserId = null } = {}) {
    const overdueReservations = await prisma.inventoryReservation.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: new Date()
        }
      },
      orderBy: {
        expiresAt: "asc"
      },
      take: Math.min(500, Math.max(1, Number(limit) || 100))
    });

    const cleanedReservationIds = [];

    for (const reservation of overdueReservations) {
      const result = await this.expireReservationIfNeeded(reservation.id);
      if (result?.status === "EXPIRED") {
        cleanedReservationIds.push(reservation.id);
      }
    }

    if (cleanedReservationIds.length > 0) {
      await auditService.record({
        action: "inventory.reservations.cleanup_expired",
        entityType: "inventory_reservation",
        entityId: cleanedReservationIds.join(","),
        actorUserId,
        metadata: {
          overdueCount: overdueReservations.length,
          cleanedCount: cleanedReservationIds.length,
          cleanedReservationIds
        }
      });
    }

    return {
      overdueCount: overdueReservations.length,
      cleanedCount: cleanedReservationIds.length,
      cleanedReservationIds
    };
  }

  async adjustProductStock(productId, targetAvailableQty, { actorUserId = null, reason = "Manual stock adjustment." } = {}, tx = prisma) {
    const inventoryItem = await this.ensureInventoryForProduct(productId, tx);
    const currentAvailableQty = inventoryItem.availableQty;
    const targetQty = Number(targetAvailableQty);

    if (!Number.isInteger(targetQty) || targetQty < 0) {
      throw new AppError("Stock must be a non-negative integer.", 400);
    }

    if (targetQty === currentAvailableQty) {
      return inventoryItem;
    }

    const delta = targetQty - currentAvailableQty;

    if (delta > 0) {
      const batch = await tx.inventoryBatch.create({
        data: {
          inventoryItemId: inventoryItem.id,
          batchCode: `ADJ-ADD-${productId}-${randomUUID().slice(0, 8)}`,
          supplier: "MANUAL_ADJUSTMENT",
          receivedAt: new Date(),
          receivedQty: delta,
          remainingQty: delta,
          status: "ACTIVE"
        }
      });

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          onHandQty: { increment: delta },
          availableQty: { increment: delta }
        }
      });

      await this.createMovement(
        {
          productId,
          batchId: batch.id,
          type: "ADJUST",
          quantityDelta: delta,
          referenceType: "product",
          referenceId: String(productId),
          reason,
          actorUserId
        },
        tx
      );
    } else {
      let remainingReduction = Math.abs(delta);
      const batches = await tx.inventoryBatch.findMany({
        where: {
          inventoryItemId: inventoryItem.id,
          remainingQty: { gt: 0 },
          status: { in: ["ACTIVE", "NEAR_EXPIRY"] }
        },
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }]
      });

      const totalBatchAvailable = batches.reduce((sum, batch) => sum + batch.remainingQty, 0);
      if (totalBatchAvailable < remainingReduction) {
        throw new AppError("Unable to reduce stock below available batch quantity.", 400);
      }

      for (const batch of batches) {
        if (remainingReduction <= 0) break;

        const deduction = Math.min(remainingReduction, batch.remainingQty);
        const nextRemaining = batch.remainingQty - deduction;

        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            remainingQty: nextRemaining,
            status: this.resolveBatchStatus({
              remainingQty: nextRemaining,
              expiresAt: batch.expiresAt
            })
          }
        });

        await this.createMovement(
          {
            productId,
            batchId: batch.id,
            type: "ADJUST",
            quantityDelta: -deduction,
            referenceType: "product",
            referenceId: String(productId),
            reason,
            actorUserId
          },
          tx
        );

        remainingReduction -= deduction;
      }

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          onHandQty: { decrement: Math.abs(delta) },
          availableQty: { decrement: Math.abs(delta) }
        }
      });
    }

    return this.syncProductStock(productId, tx);
  }

  async receiveStock(productId, payload, user) {
    return prisma.$transaction(async (transaction) => {
      const inventoryItem = await this.ensureInventoryForProduct(productId, transaction);
      const quantity = Number(payload.quantity);
      const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
      const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

      const batch = await transaction.inventoryBatch.create({
        data: {
          inventoryItemId: inventoryItem.id,
          batchCode: payload.batchCode || `RCV-${productId}-${randomUUID().slice(0, 8)}`,
          supplier: payload.supplier || "UNSPECIFIED",
          receivedAt,
          expiresAt,
          unitCost: payload.unitCost ?? null,
          receivedQty: quantity,
          remainingQty: quantity,
          status: this.resolveBatchStatus({
            remainingQty: quantity,
            expiresAt
          })
        }
      });

      await transaction.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          onHandQty: { increment: quantity },
          availableQty: { increment: quantity },
          reorderPoint:
            payload.lowStockThreshold ?? payload.reorderPoint ?? inventoryItem.reorderPoint,
          reorderQty: payload.reorderQty ?? inventoryItem.reorderQty,
          safetyStockQty: payload.safetyStockQty ?? inventoryItem.safetyStockQty
        }
      });

      await this.createMovement(
        {
          productId,
          batchId: batch.id,
          type: "RECEIVE",
          quantityDelta: quantity,
          referenceType: "inventory_receiving",
          referenceId: batch.batchCode,
          reason: payload.notes || "Stock received into inventory.",
          actorUserId: user?.id || null
        },
        transaction
      );

      await this.syncProductStock(productId, transaction);

      return this.getInventoryItemByProductId(productId, {}, transaction);
    });
  }
}
