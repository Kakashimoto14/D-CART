import { prisma } from "../config/prisma.js";
import { emitOrderChanged } from "../realtime/socket.js";
import { AppError } from "../utils/AppError.js";
import { InventoryService } from "./inventory.service.js";
import { NotificationService } from "./notification.service.js";

const inventoryService = new InventoryService();
const notificationService = new NotificationService();
const categorySummarySelect = { id: true, name: true };

export class PickerService {
  mapPickerOrder(order) {
    const requestedQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const pickedQty = order.items.reduce((sum, item) => sum + item.pickedQty, 0);

    return {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      customer: order.user,
      pickerId: order.pickerId,
      pickerNotes: order.pickerNotes,
      substitutionPreference: order.substitutionPreference,
      refundStatus: order.refundStatus,
      refundAmount: Number(order.refundAmount || 0),
      pickProgress: {
        requestedQty,
        pickedQty,
        percent: requestedQty > 0 ? Math.round((pickedQty / requestedQty) * 100) : 0,
        completedItems: order.items.filter((item) =>
          ["PICKED", "SUBSTITUTED", "UNAVAILABLE"].includes(item.pickStatus)
        ).length,
        totalItems: order.items.length
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
        pickedQty: item.pickedQty,
        finalQuantity: item.finalQuantity,
        pickStatus: item.pickStatus,
        substitutionDecision: item.substitutionDecision,
        pickedAt: item.pickedAt,
        pickedByUserId: item.pickedByUserId,
        scannedBarcode: item.scannedBarcode,
        pickIssueNote: item.pickIssueNote,
        product: item.product,
        substituteProductId: item.substituteProductId,
        substitutionNote: item.substitutionNote,
        substituteProduct: item.substituteProduct
      })),
      delivery: order.delivery,
      deliverySlot: order.deliverySlot,
      createdAt: order.createdAt
    };
  }

  async getPickerOrders(pickerId) {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { pickerId },
          {
            pickerId: null,
            status: { in: ["CONFIRMED", "PACKING"] }
          }
        ]
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: categorySummarySelect
                }
              }
            },
            substituteProduct: true
          }
        },
        delivery: true,
        deliverySlot: true
      },
      orderBy: { createdAt: "desc" }
    });

    return orders.map((order) => this.mapPickerOrder(order));
  }

  async claimOrder(pickerId, orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.pickerId && order.pickerId !== pickerId) {
      throw new AppError("This order is already claimed by another picker.", 409);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        pickerId,
        status: order.status === "CONFIRMED" ? "PACKING" : order.status
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true, substituteProduct: true } },
        delivery: true,
        deliverySlot: true
      }
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "claimed"
    });

    return this.mapPickerOrder(updated);
  }

  async getAssignedOrder(pickerId, orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            substituteProduct: true
          }
        },
        user: { select: { id: true, name: true, email: true } },
        delivery: true,
        deliverySlot: true
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.pickerId !== pickerId) {
      throw new AppError("You are not assigned to this order.", 403);
    }

    return order;
  }

  resolveExpectedBarcode(orderItem) {
    return orderItem.substituteProduct?.barcode || orderItem.product?.barcode || null;
  }

  async refreshOrderStatusAfterPick(orderId, tx) {
    const items = await tx.orderItem.findMany({
      where: { orderId }
    });

    const allHandled = items.every((item) =>
      ["PICKED", "SUBSTITUTED", "UNAVAILABLE"].includes(item.pickStatus)
    );
    const pendingSubstitutionReview = items.some(
      (item) => item.pickStatus === "SUBSTITUTED" && item.substitutionDecision === "PENDING"
    );

    if (allHandled && !pendingSubstitutionReview) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PACKING" }
      });
    }

    return { allHandled, pendingSubstitutionReview };
  }

  async recalculateOrderFinancials(orderId, tx) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    const newSubtotal = order.items.reduce(
      (sum, item) => sum + Number(item.price) * item.finalQuantity,
      0
    );
    const newTotal = newSubtotal + Number(order.deliveryFee);
    const currentTotal = Number(order.total);
    const reduction = Math.max(0, currentTotal - newTotal);
    const nextRefundStatus =
      reduction > 0
        ? order.paymentStatus === "PAID"
          ? "PENDING"
          : "NOT_REQUIRED"
        : order.refundStatus;

    await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        total: newTotal,
        refundAmount:
          order.paymentStatus === "PAID" && reduction > 0
            ? Number(order.refundAmount || 0) + reduction
            : Number(order.refundAmount || 0),
        refundStatus: nextRefundStatus,
        fulfillmentAdjustedAt: reduction > 0 ? new Date() : order.fulfillmentAdjustedAt
      }
    });
  }

  async pickItem(pickerId, orderId, itemId, payload) {
    const order = await this.getAssignedOrder(pickerId, orderId);
    const orderItem = order.items.find((item) => item.id === itemId);

    if (!orderItem) {
      throw new AppError("Order item not found.", 404);
    }

    const requestedQty = orderItem.quantity;
    const nextPickedQty = Number(payload.quantity);

    if (nextPickedQty > requestedQty) {
      throw new AppError("Picked quantity cannot exceed requested quantity.", 400);
    }

    const expectedBarcode = this.resolveExpectedBarcode(orderItem);
    if (payload.scannedBarcode && expectedBarcode && payload.scannedBarcode !== expectedBarcode) {
      throw new AppError("Scanned barcode does not match the expected product.", 400);
    }

    const pickStatus = nextPickedQty >= requestedQty ? "PICKED" : "PARTIAL";

    const updatedItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          pickedQty: nextPickedQty,
          finalQuantity: nextPickedQty,
          pickStatus,
          substitutionDecision: "NONE",
          pickedAt: new Date(),
          pickedByUserId: pickerId,
          scannedBarcode: payload.scannedBarcode || orderItem.scannedBarcode || null,
          pickIssueNote: null
        },
        include: {
          product: true,
          substituteProduct: true
        }
      });

      await this.recalculateOrderFinancials(orderId, tx);
      await this.refreshOrderStatusAfterPick(orderId, tx);
      return updated;
    });

    emitOrderChanged({
      orderId,
      userId: order.userId,
      status: order.status,
      type: "item_picked"
    });

    return updatedItem;
  }

  async markItemUnavailable(pickerId, orderId, itemId, note) {
    const order = await this.getAssignedOrder(pickerId, orderId);
    const orderItem = order.items.find((item) => item.id === itemId);

    if (!orderItem) {
      throw new AppError("Order item not found.", 404);
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          pickedQty: 0,
          finalQuantity: 0,
          pickStatus: "UNAVAILABLE",
          substitutionDecision: "NONE",
          pickedAt: new Date(),
          pickedByUserId: pickerId,
          pickIssueNote: note
        },
        include: {
          product: true,
          substituteProduct: true
        }
      });

      await this.recalculateOrderFinancials(orderId, tx);
      await this.refreshOrderStatusAfterPick(orderId, tx);
      return updated;
    });

    emitOrderChanged({
      orderId,
      userId: order.userId,
      status: order.status,
      type: "item_unavailable"
    });
    await notificationService.enqueueItemUnavailable(orderId, updatedItem.id);

    return updatedItem;
  }

  async substituteItem(pickerId, orderId, orderItemId, substituteProductId, note) {
    const order = await this.getAssignedOrder(pickerId, orderId);
    const orderItem = order.items.find((item) => item.id === orderItemId);

    if (!orderItem) {
      throw new AppError("Order item not found.", 404);
    }

    const substituteProduct = await prisma.product.findUnique({
      where: { id: substituteProductId }
    });

    if (!substituteProduct) {
      throw new AppError("Substitute product not found.", 404);
    }

    if (order.substitutionPreference === "NO_SUBSTITUTIONS") {
      throw new AppError("This order does not allow substitutions.", 400);
    }

    if (substituteProduct.stock < orderItem.quantity) {
      throw new AppError("Substitute product does not have enough stock.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      await inventoryService.ensureInventoryForProduct(orderItem.productId, tx);
      await inventoryService.ensureInventoryForProduct(substituteProductId, tx);

      const originalInventory = await tx.inventoryItem.findUnique({
        where: { productId: orderItem.productId }
      });
      const substituteInventory = await tx.inventoryItem.findUnique({
        where: { productId: substituteProductId }
      });

      await inventoryService.adjustProductStock(
        orderItem.productId,
        (originalInventory?.availableQty || 0) + orderItem.quantity,
        {
          actorUserId: pickerId,
          reason: `Returned stock from substitution on order #${orderId}.`
        },
        tx
      );

      await inventoryService.adjustProductStock(
        substituteProductId,
        (substituteInventory?.availableQty || 0) - orderItem.quantity,
        {
          actorUserId: pickerId,
          reason: `Allocated substitute stock for order #${orderId}.`
        },
        tx
      );

      const updatedItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          substituteProductId,
          substitutionNote: note || `Substituted with ${substituteProduct.name}`,
          price: substituteProduct.price,
          pickedQty: orderItem.quantity,
          finalQuantity:
            order.substitutionPreference === "ASK_BEFORE_REPLACE" ? 0 : orderItem.quantity,
          pickStatus: "SUBSTITUTED",
          substitutionDecision:
            order.substitutionPreference === "ASK_BEFORE_REPLACE" ? "PENDING" : "APPROVED",
          pickedAt: new Date(),
          pickedByUserId: pickerId,
          scannedBarcode: substituteProduct.barcode || null,
          pickIssueNote: null
        },
        include: { product: true, substituteProduct: true }
      });

      await this.recalculateOrderFinancials(orderId, tx);
      await this.refreshOrderStatusAfterPick(orderId, tx);

      return updatedItem;
    });

    emitOrderChanged({
      orderId,
      userId: order.userId,
      status: order.status,
      type: "substituted"
    });
    await notificationService.enqueueItemSubstituted(orderId, result.id);

    return result;
  }

  async updatePickerNotes(pickerId, orderId, notes) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new AppError("Order not found.", 404);
    if (order.pickerId !== pickerId) throw new AppError("You are not assigned to this order.", 403);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { pickerNotes: notes }
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "note_updated"
    });

    return updated;
  }
}
