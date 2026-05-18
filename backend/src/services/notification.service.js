import { prisma } from "../config/prisma.js";
import { getQueue } from "../infrastructure/queue/queues.js";
import { logger } from "../infrastructure/logger/logger.js";
import { EmailService } from "./email.service.js";

const emailService = new EmailService();

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value || 0));

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value))
    : "Not scheduled yet";

export class NotificationService {
  async enqueue(jobName, data) {
    const queue = getQueue("notifications");

    if (!queue) {
      logger.warn({ jobName, data }, "Notifications queue unavailable. Processing inline.");
      try {
        await this.processJob(jobName, data);
      } catch (error) {
        logger.error({ err: error, jobName, data }, "Inline notification processing failed.");
      }
      return;
    }

    try {
      await queue.add(jobName, data, {
        jobId: `${jobName}:${data.orderId}:${data.orderItemId || "none"}:${Date.now()}`
      });
    } catch (error) {
      logger.error({ err: error, jobName, data }, "Notification queueing failed. Falling back to inline processing.");

      try {
        await this.processJob(jobName, data);
      } catch (inlineError) {
        logger.error(
          { err: inlineError, jobName, data },
          "Fallback notification processing failed."
        );
      }
    }
  }

  async enqueueOrderCreated(orderId) {
    await this.enqueue("customer.order.created", { orderId });
  }

  async enqueueOrderStatus(orderId, status) {
    await this.enqueue("customer.order.status", { orderId, status });
  }

  async enqueuePaymentPaid(orderId) {
    await this.enqueue("customer.order.payment_paid", { orderId });
  }

  async enqueueRefundCompleted(orderId) {
    await this.enqueue("customer.order.refund_completed", { orderId });
  }

  async enqueueItemUnavailable(orderId, orderItemId) {
    await this.enqueue("customer.order.item_unavailable", { orderId, orderItemId });
  }

  async enqueueItemSubstituted(orderId, orderItemId) {
    await this.enqueue("customer.order.item_substituted", { orderId, orderItemId });
  }

  async retryNotificationLog(notificationLogId) {
    const notificationLog = await prisma.notificationLog.update({
      where: { id: Number(notificationLogId) },
      data: {
        retryCount: { increment: 1 },
        lastRetriedAt: new Date()
      }
    });

    const payload = notificationLog.payloadJson || {};

    await this.enqueue(notificationLog.templateKey, payload);

    return notificationLog;
  }

  async processJob(jobName, data) {
    switch (jobName) {
      case "customer.order.created":
        return this.sendOrderCreated(data.orderId);
      case "customer.order.status":
        return this.sendOrderStatus(data.orderId, data.status);
      case "customer.order.payment_paid":
        return this.sendPaymentPaid(data.orderId);
      case "customer.order.refund_completed":
        return this.sendRefundCompleted(data.orderId);
      case "customer.order.item_unavailable":
        return this.sendItemUnavailable(data.orderId, data.orderItemId);
      case "customer.order.item_substituted":
        return this.sendItemSubstituted(data.orderId, data.orderItemId);
      default:
        logger.info({ jobName, data }, "Skipping unknown notification job.");
        return null;
    }
  }

  async getOrderForNotification(orderId) {
    return prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        user: true,
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
              orderBy: {
                assignedAt: "desc"
              }
            }
          }
        },
        deliverySlot: true
      }
    });
  }

  buildOrderContext(order) {
    const assignment = order.delivery?.assignments?.[0] || null;

    return {
      customerName: order.user.name,
      deliveryAddress: order.delivery?.address || "No delivery address",
      slotLabel: order.deliverySlot
        ? `${order.deliverySlot.startTime} - ${order.deliverySlot.endTime}`
        : "Earliest available",
      etaLabel: formatDateTime(order.delivery?.estimatedAt),
      riderName: assignment?.rider?.user?.name || null,
      recipientName: assignment?.recipientName || null,
      proofNote: assignment?.proofNote || null,
      orderTotal: formatCurrency(order.total)
    };
  }

  async createNotificationLog({
    orderId = null,
    userId = null,
    templateKey,
    recipient,
    subject,
    status,
    provider = "email",
    errorMessage = null,
    payload = null,
    sentAt = null
  }) {
    return prisma.notificationLog.create({
      data: {
        orderId,
        userId,
        channel: "EMAIL",
        templateKey,
        recipient,
        subject,
        status,
        provider,
        retryCount: 0,
        errorMessage,
        payloadJson: payload,
        sentAt
      }
    });
  }

  async sendMailForOrder(order, subject, lines, htmlLines, metadata = {}) {
    if (!order?.user?.email) {
      await this.createNotificationLog({
        orderId: order?.id || null,
        userId: order?.userId || order?.user?.id || null,
        templateKey: metadata.templateKey || "unknown",
        recipient: order?.user?.email || "missing-email",
        subject,
        status: "SKIPPED",
        errorMessage: "Customer email is not available.",
        payload: metadata.payload || null
      });
      return null;
    }

    try {
      const result = await emailService.sendMessage({
        to: order.user.email,
        subject,
        text: lines.join("\n"),
        html: `<div>${htmlLines.map((line) => `<p>${line}</p>`).join("")}</div>`
      });

      await this.createNotificationLog({
        orderId: order.id,
        userId: order.user.id,
        templateKey: metadata.templateKey || "unknown",
        recipient: order.user.email,
        subject,
        status: "SENT",
        payload: metadata.payload || null,
        sentAt: new Date()
      });

      logger.info(
        {
          orderId: order.id,
          email: order.user.email,
          subject,
          preview: result.preview || null
        },
        "Customer notification sent."
      );

      return result;
    } catch (error) {
      await this.createNotificationLog({
        orderId: order.id,
        userId: order.user.id,
        templateKey: metadata.templateKey || "unknown",
        recipient: order.user.email,
        subject,
        status: "FAILED",
        errorMessage: error.message,
        payload: metadata.payload || null
      });

      throw error;
    }
  }

  async sendOrderCreated(orderId) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    const context = this.buildOrderContext(order);
    return this.sendMailForOrder(
      order,
      `D'Cart order #${order.id} received`,
      [
        `Hello ${context.customerName},`,
        "",
        `We received your grocery order #${order.id}.`,
        `Delivery address: ${context.deliveryAddress}`,
        `Delivery window: ${context.slotLabel}`,
        `Order total: ${context.orderTotal}`,
        "",
        "We will notify you again as the order moves through picking and delivery."
      ],
      [
        `Hello ${context.customerName},`,
        `We received your grocery order <strong>#${order.id}</strong>.`,
        `Delivery address: ${context.deliveryAddress}`,
        `Delivery window: ${context.slotLabel}`,
        `Order total: <strong>${context.orderTotal}</strong>`,
        "We will notify you again as the order moves through picking and delivery."
      ],
      {
        templateKey: "customer.order.created",
        payload: { orderId: order.id }
      }
    );
  }

  async sendOrderStatus(orderId, status) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    const context = this.buildOrderContext(order);
    const templates = {
      CONFIRMED: {
        subject: `D'Cart order #${order.id} confirmed`,
        lines: [
          `Hello ${context.customerName},`,
          "",
          `Your grocery order #${order.id} has been confirmed and is queued for fulfillment.`,
          `Delivery window: ${context.slotLabel}`,
          `Current ETA: ${context.etaLabel}`
        ]
      },
      READY_FOR_DELIVERY: {
        subject: `D'Cart order #${order.id} packed and ready`,
        lines: [
          `Hello ${context.customerName},`,
          "",
          `Your grocery order #${order.id} has been packed and staged for dispatch.`,
          `Delivery window: ${context.slotLabel}`,
          `Current ETA: ${context.etaLabel}`
        ]
      },
      OUT_FOR_DELIVERY: {
        subject: `D'Cart order #${order.id} is out for delivery`,
        lines: [
          `Hello ${context.customerName},`,
          "",
          `Your grocery order #${order.id} is now out for delivery.`,
          context.riderName ? `Rider: ${context.riderName}` : null,
          `Current ETA: ${context.etaLabel}`
        ].filter(Boolean)
      },
      DELIVERED: {
        subject: `D'Cart order #${order.id} delivered`,
        lines: [
          `Hello ${context.customerName},`,
          "",
          `Your grocery order #${order.id} has been delivered.`,
          context.recipientName ? `Received by: ${context.recipientName}` : null,
          context.proofNote ? `Delivery note: ${context.proofNote}` : null
        ].filter(Boolean)
      },
      CANCELLED: {
        subject: `D'Cart order #${order.id} cancelled`,
        lines: [
          `Hello ${context.customerName},`,
          "",
          `Your grocery order #${order.id} has been cancelled.`,
          "If this was unexpected, please contact the store team."
        ]
      }
    };

    const template = templates[status];
    if (!template) {
      return null;
    }

    return this.sendMailForOrder(order, template.subject, template.lines, template.lines, {
      templateKey: `customer.order.status.${status.toLowerCase()}`,
      payload: { orderId: order.id, status }
    });
  }

  async sendPaymentPaid(orderId) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    const context = this.buildOrderContext(order);
    return this.sendMailForOrder(
      order,
      `D'Cart payment received for order #${order.id}`,
      [
        `Hello ${context.customerName},`,
        "",
        `We confirmed your payment for order #${order.id}.`,
        `Payment reference: ${order.paymentReference || "Pending capture details"}`,
        `Order total: ${context.orderTotal}`
      ],
      [
        `Hello ${context.customerName},`,
        `We confirmed your payment for order <strong>#${order.id}</strong>.`,
        `Payment reference: ${order.paymentReference || "Pending capture details"}`,
        `Order total: <strong>${context.orderTotal}</strong>`
      ],
      {
        templateKey: "customer.order.payment_paid",
        payload: {
          orderId: order.id,
          paymentReference: order.paymentReference || null
        }
      }
    );
  }

  async sendItemUnavailable(orderId, orderItemId) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    const item = order.items.find((entry) => entry.id === Number(orderItemId));
    if (!item) return null;

    return this.sendMailForOrder(
      order,
      `D'Cart update for order #${order.id}: item unavailable`,
      [
        `Hello ${order.user.name},`,
        "",
        `While picking order #${order.id}, we marked "${item.product.name}" as unavailable.`,
        item.pickIssueNote ? `Picker note: ${item.pickIssueNote}` : null,
        "The team may substitute, partially fulfill, or adjust the final total based on availability."
      ].filter(Boolean),
      [
        `Hello ${order.user.name},`,
        `While picking order <strong>#${order.id}</strong>, we marked <strong>${item.product.name}</strong> as unavailable.`,
        item.pickIssueNote ? `Picker note: ${item.pickIssueNote}` : null,
        "The team may substitute, partially fulfill, or adjust the final total based on availability."
      ].filter(Boolean),
      {
        templateKey: "customer.order.item_unavailable",
        payload: { orderId: order.id, orderItemId }
      }
    );
  }

  async sendItemSubstituted(orderId, orderItemId) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    const item = order.items.find((entry) => entry.id === Number(orderItemId));
    if (!item || !item.substituteProduct) return null;

    return this.sendMailForOrder(
      order,
      `D'Cart update for order #${order.id}: substitute selected`,
      [
        `Hello ${order.user.name},`,
        "",
        `We substituted "${item.product.name}" with "${item.substituteProduct.name}" for order #${order.id}.`,
        item.substitutionNote ? `Picker note: ${item.substitutionNote}` : null,
        `Updated line price: ${formatCurrency(item.price)}`,
        item.substitutionDecision === "PENDING"
          ? "Please review this substitute in your order history before fulfillment continues."
          : "The order total has been updated with the approved substitute."
      ].filter(Boolean),
      [
        `Hello ${order.user.name},`,
        `We substituted <strong>${item.product.name}</strong> with <strong>${item.substituteProduct.name}</strong> for order <strong>#${order.id}</strong>.`,
        item.substitutionNote ? `Picker note: ${item.substitutionNote}` : null,
        `Updated line price: <strong>${formatCurrency(item.price)}</strong>`,
        item.substitutionDecision === "PENDING"
          ? "Please review this substitute in your order history before fulfillment continues."
          : "The order total has been updated with the approved substitute."
      ].filter(Boolean),
      {
        templateKey: "customer.order.item_substituted",
        payload: { orderId: order.id, orderItemId }
      }
    );
  }

  async sendRefundCompleted(orderId) {
    const order = await this.getOrderForNotification(orderId);
    if (!order) return null;

    return this.sendMailForOrder(
      order,
      `D'Cart refund completed for order #${order.id}`,
      [
        `Hello ${order.user.name},`,
        "",
        `Your partial fulfillment refund for order #${order.id} has been marked completed.`,
        `Refund amount: ${formatCurrency(order.refundAmount)}`,
        "If the refund does not reflect as expected, please contact the store team."
      ],
      [
        `Hello ${order.user.name},`,
        `Your partial fulfillment refund for order <strong>#${order.id}</strong> has been marked completed.`,
        `Refund amount: <strong>${formatCurrency(order.refundAmount)}</strong>`,
        "If the refund does not reflect as expected, please contact the store team."
      ],
      {
        templateKey: "customer.order.refund_completed",
        payload: {
          orderId: order.id,
          refundAmount: Number(order.refundAmount || 0)
        }
      }
    );
  }
}
