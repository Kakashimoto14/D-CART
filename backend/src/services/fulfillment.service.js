import { prisma } from "../config/prisma.js";
import { emitOrderChanged } from "../realtime/socket.js";
import { AppError } from "../utils/AppError.js";
import { AuditService } from "./audit.service.js";
import { NotificationService } from "./notification.service.js";

const notificationService = new NotificationService();
const auditService = new AuditService();

export class FulfillmentService {
  async getOrderForPacking(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        delivery: true,
        deliverySlot: true
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    return order;
  }

  mapOrder(order) {
    return {
      id: order.id,
      status: order.status,
      packedAt: order.packedAt,
      packedByUserId: order.packedByUserId,
      stagingLabel: order.stagingLabel,
      stagingZone: order.stagingZone,
      readyForDispatchAt: order.readyForDispatchAt
    };
  }

  async markOrderPacked(userId, orderId, payload) {
    const order = await this.getOrderForPacking(orderId);

    if (order.status !== "PACKING") {
      throw new AppError("Only packing orders can be marked as packed.", 400);
    }

    const incompleteItems = order.items.filter(
      (item) =>
        !["PICKED", "SUBSTITUTED", "UNAVAILABLE"].includes(item.pickStatus) ||
        (item.pickStatus === "SUBSTITUTED" && item.substitutionDecision === "PENDING")
    );

    if (incompleteItems.length > 0) {
      throw new AppError("All order items must be picked or substituted before packing.", 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        packedAt: new Date(),
        packedByUserId: userId,
        stagingLabel: payload.stagingLabel,
        stagingZone: payload.stagingZone
      }
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "packed"
    });
    await auditService.record({
      action: "fulfillment.order.packed",
      entityType: "order",
      entityId: updated.id,
      actorUserId: userId,
      before: { status: order.status, packedAt: order.packedAt },
      after: {
        status: updated.status,
        packedAt: updated.packedAt,
        stagingLabel: updated.stagingLabel,
        stagingZone: updated.stagingZone
      }
    });

    return this.mapOrder(updated);
  }

  async markOrderReadyForDispatch(userId, orderId) {
    const order = await this.getOrderForPacking(orderId);

    if (order.status !== "PACKING") {
      throw new AppError("Only packing orders can be marked ready for dispatch.", 400);
    }

    if (!order.packedAt || !order.stagingLabel || !order.stagingZone) {
      throw new AppError("Order must be packed and staged before dispatch handoff.", 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_DELIVERY",
        readyForDispatchAt: new Date(),
        packedByUserId: order.packedByUserId || userId
      }
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "ready_for_delivery"
    });
    await auditService.record({
      action: "fulfillment.order.ready",
      entityType: "order",
      entityId: updated.id,
      actorUserId: userId,
      before: { status: order.status },
      after: { status: updated.status },
      metadata: {
        oldStatus: order.status,
        newStatus: updated.status
      }
    });
    await notificationService.enqueueOrderStatus(updated.id, updated.status);

    return this.mapOrder(updated);
  }
}
