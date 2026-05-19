import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { logger } from "../infrastructure/logger/logger.js";
import { buildUserEntity } from "../models/buildUserEntity.js";
import { Delivery } from "../models/Delivery.js";
import { Order } from "../models/Order.js";
import { SameDayDeliveryStrategy } from "../models/strategies/SameDayDeliveryStrategy.js";
import { StandardDeliveryStrategy } from "../models/strategies/StandardDeliveryStrategy.js";
import { emitOrderChanged } from "../realtime/socket.js";
import { AppError } from "../utils/AppError.js";
import { DeliverySlotService } from "./deliverySlot.service.js";
import { GeofencingService } from "./geofencing.service.js";
import { InventoryService } from "./inventory.service.js";
import { PaymentService } from "./payment.service.js";
import { ReceiptService } from "./receipt.service.js";
import { DeliveryPricingService } from "./deliveryPricing.service.js";
import { NotificationService } from "./notification.service.js";

const geofencingService = new GeofencingService();
const deliverySlotService = new DeliverySlotService();
const paymentService = new PaymentService();
const receiptService = new ReceiptService();
const inventoryService = new InventoryService();
const deliveryPricingService = new DeliveryPricingService();
const notificationService = new NotificationService();
const categorySummarySelect = { id: true, name: true };

const runAfterCheckoutResponse = (task, context) => {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        // Non-critical post-checkout work must never keep the customer waiting.
        logger.error({ err: error, ...context }, "Post-checkout task failed.");
      });
  });
};

const orderInclude = {
  items: {
    include: {
      product: true,
      substituteProduct: true
    }
  },
  delivery: {
    include: {
      assignments: {
        include: {
          rider: {
            include: {
              user: true
            }
          }
        },
        orderBy: { assignedAt: "desc" }
      }
    }
  },
  deliverySlot: true,
  inventoryReservation: true
};

export class OrderService {
  buildDeliveryStrategy(type) {
    return type === "STANDARD"
      ? new StandardDeliveryStrategy()
      : new SameDayDeliveryStrategy();
  }

  mapOrder(record) {
    return {
      id: record.id,
      userId: record.userId,
      subtotal: Number(record.subtotal),
      deliveryFee: Number(record.deliveryFee),
      total: Number(record.total),
      status: record.status,
      substitutionPreference: record.substitutionPreference,
      paymentMethod: record.paymentMethod,
      paymentStatus: record.paymentStatus,
      paymentProvider: record.paymentProvider,
      paymentReference: record.paymentReference,
      paymentCheckoutId: record.paymentCheckoutId,
      refundStatus: record.refundStatus,
      refundAmount: Number(record.refundAmount || 0),
      fulfillmentAdjustedAt: record.fulfillmentAdjustedAt,
      inventoryReservationId: record.inventoryReservationId || null,
      paidAt: record.paidAt,
      pickerId: record.pickerId,
      pickerNotes: record.pickerNotes,
      packedAt: record.packedAt,
      packedByUserId: record.packedByUserId,
      stagingLabel: record.stagingLabel,
      stagingZone: record.stagingZone,
      readyForDispatchAt: record.readyForDispatchAt,
      items: record.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
        pickedQty: item.pickedQty,
        finalQuantity: item.finalQuantity,
        substitutionDecision: item.substitutionDecision,
        pickStatus: item.pickStatus,
        pickIssueNote: item.pickIssueNote,
        product: item.product,
        substituteProductId: item.substituteProductId,
        substitutionNote: item.substitutionNote,
        substituteProduct: item.substituteProduct || null
      })),
      delivery: record.delivery
        ? {
            ...record.delivery,
            distanceKm: record.delivery.distanceKm ? Number(record.delivery.distanceKm) : null,
            deliveryFee: Number(record.delivery.deliveryFee),
            estimatedAt: record.delivery.estimatedAt,
            assignments: (record.delivery.assignments || []).map((assignment) => ({
              id: assignment.id,
              status: assignment.status,
              assignedAt: assignment.assignedAt,
              pickedUpAt: assignment.pickedUpAt,
              recipientName: assignment.recipientName,
              proofNote: assignment.proofNote,
              completedAt: assignment.completedAt,
              rider: assignment.rider
                ? {
                    id: assignment.rider.id,
                    userId: assignment.rider.userId,
                    vehicleType: assignment.rider.vehicleType,
                    isActive: assignment.rider.isActive,
                    isAvailable: assignment.rider.isAvailable,
                    currentLatitude: assignment.rider.currentLatitude
                      ? Number(assignment.rider.currentLatitude)
                      : null,
                    currentLongitude: assignment.rider.currentLongitude
                      ? Number(assignment.rider.currentLongitude)
                      : null,
                    lastSeenAt: assignment.rider.lastSeenAt,
                    user: assignment.rider.user
                      ? {
                          id: assignment.rider.user.id,
                          name: assignment.rider.user.name,
                          email: assignment.rider.user.email,
                          phone: assignment.rider.user.phone
                        }
                      : null
                  }
                : null
            }))
          }
        : null,
      deliverySlot: record.deliverySlot || null,
      inventoryReservation: record.inventoryReservation || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  async checkout(userId, payload) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const userEntity = buildUserEntity(user);
    if (!userEntity.canCheckout()) {
      throw new AppError("Your account does not have checkout permission.", 403);
    }

    const cartSnapshot = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: categorySummarySelect
                }
              }
            }
          }
        }
      }
    });

    if (!cartSnapshot || cartSnapshot.items.length === 0) {
      throw new AppError("Cart is empty.", 400, null, "VALIDATION_ERROR");
    }

    const subtotal = cartSnapshot.items.reduce(
      (total, item) => total + Number(item.product.price) * item.quantity,
      0
    );
    const deliverySlotId = payload.deliverySlotId || null;
    const geoLat = payload.latitude;
    const geoLon = payload.longitude;

    const geoResult = await geofencingService.validateLocation(
      geoLat,
      geoLon,
      payload.accuracyMeters
    );

    if (!geoResult.isWithinRadius) {
      throw new AppError(
        geoResult.reason ||
          `Your location is ${geoResult.displayDistanceKm}km away. We only deliver within ${geoResult.store.deliveryRadius}km.`,
        400,
        null,
        "VALIDATION_ERROR"
      );
    }

    const deliveryQuote = await deliveryPricingService.quote({
      latitude: geoLat,
      longitude: geoLon,
      accuracyMeters: payload.accuracyMeters,
      deliveryType: payload.deliveryType,
      deliverySlotId,
      orderSubtotal: subtotal
    });

    if (!deliveryQuote.isWithinRadius) {
      throw new AppError(
        deliveryQuote.reason ||
          `Your location is ${deliveryQuote.displayDistanceKm}km away. We only deliver within ${deliveryQuote.store.deliveryRadius}km.`,
        400,
        null,
        "VALIDATION_ERROR"
      );
    }

    if (deliveryQuote.scheduling && !deliveryQuote.scheduling.isEligible) {
      throw new AppError(
        deliveryQuote.scheduling.reason || "The selected delivery schedule is not available.",
        400,
        null,
        "VALIDATION_ERROR"
      );
    }

    const selectedDeliverySlot = deliverySlotId
      ? await deliverySlotService.getSlotById(deliverySlotId)
      : null;
    const deliveryFee = deliveryQuote.deliveryFee;
    const distanceKm = deliveryQuote.distanceKm || geoResult.distanceKm;
    const strategy = this.buildDeliveryStrategy(payload.deliveryType);
    const delivery = new Delivery({
      address: payload.address,
      strategy
    });

    const result = await prisma.$transaction(
      async (tx) => {
        const cart = await tx.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: {
                      select: categorySummarySelect
                    }
                  }
                }
              }
            }
          }
        });

        if (!cart || cart.items.length === 0) {
          throw new AppError("Cart is empty.", 400, null, "VALIDATION_ERROR");
        }

        const transactionSubtotal = cart.items.reduce(
          (total, item) => total + Number(item.product.price) * item.quantity,
          0
        );

        if (transactionSubtotal !== subtotal) {
          throw new AppError(
            "Your cart changed during checkout. Please review your cart and try again.",
            409,
            null,
            "VALIDATION_ERROR"
          );
        }

        if (deliverySlotId) {
          await deliverySlotService.bookSlot(deliverySlotId, payload.deliveryType, tx);
        }

      const orderEntity = new Order({
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: Number(item.product.price)
        }))
      });

      orderEntity.calculateTotal();
      const grandTotal = orderEntity.total + deliveryFee;

      const reservation = await inventoryService.reserveStock(
        {
          userId,
          cartSessionKey: `user:${userId}:cart:${cart.id}`,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          trackExpiry: false
        },
        tx
      );

      const createdOrder = await tx.order.create({
        data: {
          userId,
          subtotal,
          deliveryFee,
          total: grandTotal,
          status: "PENDING",
          substitutionPreference: payload.substitutionPreference || "BEST_MATCH",
          paymentMethod: payload.paymentMethod || "COD",
          paymentStatus: "PENDING",
          paymentProvider: payload.paymentMethod === "GCASH" ? "PAYMONGO" : null,
          inventoryReservationId: reservation.id,
          deliverySlotId,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
              finalQuantity: item.quantity
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      const deliveryRecord = delivery.schedule(createdOrder.id, {
        deliverySlot: selectedDeliverySlot
      });

      await tx.delivery.create({
        data: {
          ...deliveryRecord,
          latitude: geoLat,
          longitude: geoLon,
          distanceKm,
          deliveryFee
        }
      });

      if (payload.paymentMethod !== "GCASH") {
        await inventoryService.commitReservation(reservation.id, {}, tx);
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      const order = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: orderInclude
      });

      const mappedOrder = this.mapOrder(order);
      mappedOrder.deliveryFeeBreakdown = deliveryQuote.feeBreakdown;
      mappedOrder.deliveryScheduling = deliveryQuote.scheduling;

      return mappedOrder;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    if (payload.paymentMethod === "GCASH" && result.inventoryReservation) {
      await inventoryService.trackReservationExpiry(result.inventoryReservation).catch(() => null);
    }

    if (payload.paymentMethod === "GCASH") {
      try {
        const checkoutSession = await paymentService.createGcashCheckoutSession({
          order: result,
          user,
          successUrl: env.checkoutSuccessUrl,
          cancelUrl: env.checkoutCancelUrl
        });

        await prisma.order.update({
          where: { id: result.id },
          data: {
            paymentCheckoutId: checkoutSession.checkoutSessionId
          }
        });

        result.paymentCheckoutUrl = checkoutSession.checkoutUrl;
        result.paymentCheckoutId = checkoutSession.checkoutSessionId;
      } catch (error) {
        await this.markPaymentFailed({ orderId: result.id }).catch(() => null);
        throw new AppError(
          "Payment could not be completed. Please check your GCash details or try another payment method.",
          error.statusCode || 503,
          { orderId: result.id },
          "PAYMENT_FAILED"
        );
      }
    }

    emitOrderChanged({
      orderId: result.id,
      userId,
      status: result.status,
      type: "created"
    });
    runAfterCheckoutResponse(
      () => notificationService.enqueueOrderCreated(result.id),
      { orderId: result.id, task: "customer.order.created" }
    );

    return result;
  }

  async cancelOrder(userId, orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.userId !== userId) {
      throw new AppError("You can only cancel your own orders.", 403);
    }

    if (order.status !== "PENDING") {
      throw new AppError(
        `Cannot cancel this order because it is already "${order.status}". Only PENDING orders can be cancelled.`,
        400
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (order.inventoryReservationId) {
        const reservation = await tx.inventoryReservation.findUnique({
          where: { id: order.inventoryReservationId }
        });

        if (reservation?.status === "ACTIVE") {
          await inventoryService.releaseReservation(
            order.inventoryReservationId,
            { status: "RELEASED", reason: "Customer cancelled order before fulfillment." },
            tx
          );
        }
      }

      if (order.deliverySlotId) {
        await deliverySlotService.releaseSlot(order.deliverySlotId, tx);
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: orderInclude
      });

      if (updated.delivery) {
        await tx.delivery.update({
          where: { id: updated.delivery.id },
          data: { status: "CANCELLED" }
        });
        updated.delivery.status = "CANCELLED";
      }

      return this.mapOrder(updated);
    });

    emitOrderChanged({
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
      status: updatedOrder.status,
      type: "cancelled"
    });
    await notificationService.enqueueOrderStatus(updatedOrder.id, updatedOrder.status);

    return updatedOrder;
  }

  async listOrders(user, { page, limit } = {}) {
    const where = user.role === ROLES.ADMIN ? {} : { userId: user.id };

    if (!page && !limit) {
      const orders = await prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" }
      });

      return { orders: orders.map((order) => this.mapOrder(order)) };
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (currentPage - 1) * perPage;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage
      }),
      prisma.order.count({ where })
    ]);

    return {
      orders: orders.map((order) => this.mapOrder(order)),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    };
  }

  async getOrder(user, orderId) {
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: orderInclude
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const canAccess =
      user.role === ROLES.ADMIN || user.role === ROLES.STAFF || order.userId === user.id;

    if (!canAccess) {
      throw new AppError("You do not have permission to access this order.", 403);
    }

    return this.mapOrder(order);
  }

  getDeliveryStatusForOrder(orderStatus) {
    const statusMap = {
      PENDING: "PENDING",
      CONFIRMED: "SCHEDULED",
      PACKING: "SCHEDULED",
      READY_FOR_DELIVERY: "SCHEDULED",
      OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
      DELIVERED: "DELIVERED",
      CANCELLED: "CANCELLED"
    };

    return statusMap[orderStatus] || null;
  }

  async updateStatus(orderId, status) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude
    });

    if (!existing) {
      throw new AppError("Order not found.", 404);
    }

    const entity = new Order(existing);
    entity.markStatus(status);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: entity.status },
      include: orderInclude
    });

    const deliveryStatus = this.getDeliveryStatusForOrder(status);
    if (updated.delivery && deliveryStatus) {
      await prisma.delivery.update({
        where: { id: updated.delivery.id },
        data: { status: deliveryStatus }
      });

      updated.delivery.status = deliveryStatus;
    }

    const mappedOrder = this.mapOrder(updated);

    emitOrderChanged({
      orderId: mappedOrder.id,
      userId: mappedOrder.userId,
      status: mappedOrder.status,
      type: "status_updated"
    });
    await notificationService.enqueueOrderStatus(mappedOrder.id, mappedOrder.status);

    return mappedOrder;
  }

  async recalculateOrderFinancials(orderId, tx) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

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

    return tx.order.update({
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

  async refreshOrderStatusAfterSubstitutionReview(orderId, tx) {
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
  }

  async reviewSubstitution(userId, orderId, itemId, decision) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.userId !== userId) {
      throw new AppError("You can only review substitutions on your own orders.", 403);
    }

    const item = order.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new AppError("Order item not found.", 404);
    }

    if (item.substitutionDecision !== "PENDING" || !item.substituteProductId) {
      throw new AppError("This order item does not have a pending substitute to review.", 400);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (decision === "APPROVED") {
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            substitutionDecision: "APPROVED",
            finalQuantity: item.quantity
          }
        });
      }

      if (decision === "REJECTED") {
        const substituteInventory = await tx.inventoryItem.findUnique({
          where: { productId: item.substituteProductId }
        });

        await inventoryService.adjustProductStock(
          item.substituteProductId,
          (substituteInventory?.availableQty || 0) + item.quantity,
          {
            actorUserId: userId,
            reason: `Customer rejected substitute for order #${orderId}.`
          },
          tx
        );

        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            price: item.product.price,
            substitutionDecision: "REJECTED",
            finalQuantity: 0,
            pickStatus: "UNAVAILABLE",
            pickIssueNote: item.substitutionNote || "Customer rejected substitute."
          }
        });
      }

      await this.recalculateOrderFinancials(orderId, tx);
      await this.refreshOrderStatusAfterSubstitutionReview(orderId, tx);

      return tx.order.findUnique({
        where: { id: orderId },
        include: orderInclude
      });
    });

    emitOrderChanged({
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
      status: updatedOrder.status,
      type: decision === "APPROVED" ? "substitution_approved" : "substitution_rejected"
    });

    await notificationService.enqueueOrderStatus(updatedOrder.id, updatedOrder.status);

    return this.mapOrder(updatedOrder);
  }

  async generateReceipt(user, orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            substituteProduct: true
          }
        },
        delivery: true,
        deliverySlot: true
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const canAccess =
      user.role === ROLES.ADMIN || user.role === ROLES.STAFF || order.userId === user.id;

    if (!canAccess) {
      throw new AppError("You do not have permission to access this receipt.", 403);
    }

    if (order.status !== "DELIVERED") {
      throw new AppError("Receipts are available once an order has been delivered.", 400);
    }

    return receiptService.createOrderReceipt(order);
  }

  async findPaymentOrder(orderId, checkoutSessionId, include = undefined) {
    return prisma.order.findFirst({
      where: {
        OR: [
          orderId ? { id: Number(orderId) } : undefined,
          checkoutSessionId ? { paymentCheckoutId: checkoutSessionId } : undefined
        ].filter(Boolean)
      },
      include
    });
  }

  async markPaymentPaid({ orderId, checkoutSessionId, paymentReference }) {
    const order = await this.findPaymentOrder(orderId, checkoutSessionId);

    if (!order) {
      throw new AppError("Order not found for payment event.", 404);
    }

    if (order.paymentStatus === "PAID" || order.status === "CANCELLED") {
      return order;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            paymentReference: paymentReference || order.paymentReference,
            paidAt: new Date(),
            paymentProvider: "PAYMONGO"
          }
        });

        if (order.inventoryReservationId) {
          const reservation = await tx.inventoryReservation.findUnique({
            where: { id: order.inventoryReservationId }
          });

          if (reservation?.status === "ACTIVE") {
            await inventoryService.commitReservation(order.inventoryReservationId, {}, tx);
          }
        }
      },
      { timeout: 15000, maxWait: 10000 }
    );

    const updated = await prisma.order.findUnique({
      where: { id: order.id }
    });

    emitOrderChanged({
      orderId: updated.id,
      userId: updated.userId,
      status: updated.status,
      type: "payment_paid"
    });
    runAfterCheckoutResponse(
      () => notificationService.enqueuePaymentPaid(updated.id),
      { orderId: updated.id, task: "customer.order.payment_paid" }
    );

    return updated;
  }

  async markPaymentClosed({ orderId, checkoutSessionId, nextPaymentStatus }) {
    const order = await this.findPaymentOrder(orderId, checkoutSessionId, {
      delivery: true
    });

    if (!order || order.paymentStatus === "PAID") {
      return order;
    }

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        if (order.inventoryReservationId) {
          const reservation = await tx.inventoryReservation.findUnique({
            where: { id: order.inventoryReservationId }
          });

          if (reservation?.status === "ACTIVE") {
            await inventoryService.releaseReservation(
              order.inventoryReservationId,
              {
                status: nextPaymentStatus === "EXPIRED" ? "EXPIRED" : "RELEASED",
                reason:
                  nextPaymentStatus === "EXPIRED"
                    ? "Payment expired before reservation commit."
                    : "Payment failed before reservation commit."
              },
              tx
            );
          }
        }

        if (order.deliverySlotId) {
          await deliverySlotService.releaseSlot(order.deliverySlotId, tx);
        }

        if (order.delivery) {
          await tx.delivery.update({
            where: { id: order.delivery.id },
            data: { status: "CANCELLED" }
          });
        }

        return tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            paymentStatus: nextPaymentStatus
          }
        });
      },
      { timeout: 15000, maxWait: 10000 }
    );

    if (updatedOrder) {
      emitOrderChanged({
        orderId: updatedOrder.id,
        userId: updatedOrder.userId,
        status: updatedOrder.status,
        type: nextPaymentStatus === "FAILED" ? "payment_failed" : "payment_expired"
      });
      runAfterCheckoutResponse(
        () => notificationService.enqueueOrderStatus(updatedOrder.id, updatedOrder.status),
        { orderId: updatedOrder.id, task: "customer.order.status" }
      );
    }

    return updatedOrder;
  }

  async markPaymentExpired({ orderId, checkoutSessionId }) {
    return this.markPaymentClosed({
      orderId,
      checkoutSessionId,
      nextPaymentStatus: "EXPIRED"
    });
  }

  async markPaymentFailed({ orderId, checkoutSessionId }) {
    return this.markPaymentClosed({
      orderId,
      checkoutSessionId,
      nextPaymentStatus: "FAILED"
    });
  }

  async handlePaymongoWebhook(rawBody, signatureHeader) {
    paymentService.verifyWebhookSignature(rawBody, signatureHeader);

    const event = JSON.parse(rawBody.toString("utf8"));
    const eventType = event?.data?.attributes?.type;
    const resource = event?.data?.attributes?.data;
    const resourceAttributes = resource?.attributes || {};
    const metadata = resourceAttributes.metadata || {};
    const orderId = metadata.orderId;
    const checkoutSessionId = resource?.id || resourceAttributes.id || metadata.checkoutSessionId;
    const paymentReference =
      resourceAttributes.reference_number ||
      resourceAttributes.payments?.[0]?.attributes?.id ||
      resourceAttributes.payments?.[0]?.id ||
      null;

    if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
      await this.markPaymentPaid({
        orderId,
        checkoutSessionId,
        paymentReference
      });
    }

    if (eventType === "checkout_session.expired") {
      await this.markPaymentExpired({
        orderId,
        checkoutSessionId
      });
    }

    if (eventType === "payment.failed" || eventType === "checkout_session.payment.failed") {
      await this.markPaymentFailed({
        orderId,
        checkoutSessionId
      });
    }

    return { received: true };
  }
}
