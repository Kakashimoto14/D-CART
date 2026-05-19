import { prisma } from "../config/prisma.js";
import { buildUserEntity } from "../models/buildUserEntity.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { InventoryService } from "./inventory.service.js";

const inventoryService = new InventoryService();

export class ProductService {
  mapProduct(record) {
    const mapped = new Product({
      ...record,
      stock: record.inventoryItem?.availableQty ?? record.stock
    }).toJSON();

    return {
      ...mapped,
      inventory: record.inventoryItem
        ? {
            onHandQty: record.inventoryItem.onHandQty,
            reservedQty: record.inventoryItem.reservedQty,
            availableQty: record.inventoryItem.availableQty,
            reorderPoint: record.inventoryItem.reorderPoint,
            reorderQty: record.inventoryItem.reorderQty,
            safetyStockQty: record.inventoryItem.safetyStockQty,
            batches: record.inventoryItem.batches?.map((batch) => ({
              id: batch.id,
              batchCode: batch.batchCode,
              supplier: batch.supplier,
              receivedAt: batch.receivedAt,
              expiresAt: batch.expiresAt,
              unitCost: batch.unitCost != null ? Number(batch.unitCost) : null,
              receivedQty: batch.receivedQty,
              remainingQty: batch.remainingQty,
              status: batch.status
            })) || []
          }
        : null
    };
  }

  verifyInventoryAccess(user) {
    if (!user) return;
    const entity = buildUserEntity(user);
    if (!entity.canManageInventory()) {
      throw new AppError("You do not have inventory management permission.", 403);
    }
  }

  buildInclude(includeBatches = false) {
    return {
      category: {
        select: {
          id: true,
          name: true
        }
      },
      inventoryItem: {
        include: {
          batches: includeBatches
        }
      }
    };
  }

  async listProducts({ page, limit, categoryId } = {}) {
    const where = categoryId ? { categoryId: Number(categoryId) } : {};
    const include = this.buildInclude(false);

    if (!page && !limit) {
      const products = await prisma.product.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" }
      });

      return { products: products.map((product) => this.mapProduct(product)) };
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (currentPage - 1) * perPage;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage
      }),
      prisma.product.count({ where })
    ]);

    return {
      products: products.map((product) => this.mapProduct(product)),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    };
  }

  async getProductById(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: this.buildInclude(true)
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return this.mapProduct(product);
  }

  async createProduct(payload, user) {
    this.verifyInventoryAccess(user);
    await this.ensureCategoryExists(payload.categoryId);

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: payload.name,
          description: payload.description,
          image: payload.image,
          price: payload.price,
          stock: payload.stock,
          unit: payload.unit,
          weight: payload.weight,
          barcode: payload.barcode,
          categoryId: payload.categoryId
        },
        include: this.buildInclude(false)
      });

      await inventoryService.createInventoryForNewProduct(product, payload, tx);

      return tx.product.findUnique({
        where: { id: product.id },
        include: this.buildInclude(true)
      });
    });

    return this.mapProduct(created);
  }

  async updateProduct(productId, payload, user) {
    this.verifyInventoryAccess(user);
    const existing = await this.getProductById(productId);

    if (payload.categoryId) {
      await this.ensureCategoryExists(payload.categoryId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await inventoryService.ensureInventoryForProduct(productId, tx);

      if (typeof payload.stock === "number") {
        await inventoryService.adjustProductStock(
          productId,
          payload.stock,
          {
            actorUserId: user?.id || null,
            reason: "Manual stock adjustment from product update."
          },
          tx
        );
      }

      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name: payload.name ?? existing.name,
          description: payload.description === undefined ? existing.description : payload.description,
          image: payload.image === undefined ? existing.image : payload.image,
          price: payload.price ?? existing.price,
          unit: payload.unit ?? existing.unit,
          weight: payload.weight ?? existing.weight,
          barcode: payload.barcode === undefined ? existing.barcode : payload.barcode,
          categoryId: payload.categoryId ?? existing.categoryId
        },
        include: this.buildInclude(true)
      });

      if (
        payload.reorderPoint != null ||
        payload.reorderQty != null ||
        payload.safetyStockQty != null
      ) {
        await tx.inventoryItem.update({
          where: { productId },
          data: {
            reorderPoint: payload.reorderPoint ?? product.inventoryItem?.reorderPoint ?? 0,
            reorderQty: payload.reorderQty ?? product.inventoryItem?.reorderQty ?? 0,
            safetyStockQty:
              payload.safetyStockQty ?? product.inventoryItem?.safetyStockQty ?? 0
          }
        });
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: this.buildInclude(true)
      });
    });

    return this.mapProduct(updated);
  }

  async deleteProduct(productId, user) {
    this.verifyInventoryAccess(user);
    await this.getProductById(productId);

    await prisma.product.delete({
      where: { id: productId }
    });
  }

  async ensureCategoryExists(categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });

    if (!category) {
      throw new AppError("Category not found.", 404);
    }
  }
}
