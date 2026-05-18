import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { getQueueStats } from "../infrastructure/queue/queues.js";
import { getRedis } from "../infrastructure/redis/redis.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { hashPassword } from "../utils/password.js";
import { endOfStoreDay, startOfStoreDay } from "../utils/storeTime.js";
import { AuditService } from "./audit.service.js";
import { InventoryService } from "./inventory.service.js";
import { NotificationService } from "./notification.service.js";

const notificationService = new NotificationService();
const inventoryService = new InventoryService();
const auditService = new AuditService();

export class AdminService {
  async getDashboardMetrics() {
    const queueStatsPromise = getQueueStats().catch(() => ({
      enabled: env.redisEnabled,
      queues: {},
      totals: {
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0
      }
    }));
    const overdueReservationsPromise = inventoryService
      .countOverdueActiveReservations()
      .catch(() => 0);

    const [
      orderCount,
      deliveredCount,
      productCount,
      pendingOrders,
      salesAggregate,
      pendingRefundCount,
      cancelledCount,
      deliveredTodayCount,
      refundedAggregate,
      recentDeliveredOrders,
      topSellingItems
    ] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: { status: "DELIVERED" }
        }),
        prisma.product.count(),
        prisma.order.count({
          where: {
            status: {
              in: ["PENDING", "CONFIRMED", "PACKING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"]
            }
          }
        }),
        prisma.order.aggregate({
          _sum: {
            total: true
          }
        }),
        prisma.order.count({
          where: {
            refundStatus: "PENDING",
            refundAmount: {
              gt: 0
            }
          }
        }),
        prisma.order.count({
          where: {
            status: "CANCELLED"
          }
        }),
        prisma.order.count({
          where: {
            status: "DELIVERED",
            updatedAt: {
              gte: startOfStoreDay(new Date()),
              lte: endOfStoreDay(new Date())
            }
          }
        }),
        prisma.order.aggregate({
          _sum: {
            refundAmount: true
          },
          where: {
            refundStatus: {
              in: ["PENDING", "COMPLETED"]
            }
          }
        }),
        prisma.order.findMany({
          where: {
            status: "DELIVERED"
          },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            readyForDispatchAt: true,
            packedAt: true
          },
          orderBy: {
            updatedAt: "desc"
          },
          take: 50
        }),
        prisma.orderItem.groupBy({
          by: ["productId"],
          _sum: {
            finalQuantity: true,
            quantity: true
          },
          orderBy: {
            _sum: {
              finalQuantity: "desc"
            }
          },
          take: 5
        })
      ]);
    const queueStats = await queueStatsPromise;
    const overdueActiveReservations = await overdueReservationsPromise;
    const notificationSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        batches: true
      }
    });

    const now = new Date();
    const nearExpiryLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lowStockAlerts = inventoryItems.filter(
      (item) => item.availableQty <= item.reorderPoint
    ).length;
    const nearExpiryAlerts = inventoryItems.filter((item) =>
      item.batches.some(
        (batch) =>
          batch.remainingQty > 0 &&
          batch.expiresAt &&
          new Date(batch.expiresAt) >= now &&
          new Date(batch.expiresAt) <= nearExpiryLimit
      )
    ).length;

    const recentOrders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        delivery: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    const pendingRefundOrders = await prisma.order.findMany({
      where: {
        refundStatus: "PENDING",
        refundAmount: {
          gt: 0
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fulfillmentAdjustedAt: "desc"
      },
      take: 5
    });

    const [recentNotificationLogs, notificationStatusCounts, recentAuditLogs] = await Promise.all([
      prisma.notificationLog.findMany({
        include: {
          order: {
            select: {
              id: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      prisma.notificationLog.groupBy({
        by: ["status"],
        where: {
          createdAt: {
            gte: notificationSince
          }
        },
        _count: {
          _all: true
        }
      })
      ,
      prisma.auditLog.findMany({
        where: {
          OR: [
            {
              action: {
                startsWith: "admin."
              }
            },
            {
              action: {
                startsWith: "inventory."
              }
            }
          ]
        },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      })
    ]);

    const notificationTotals = notificationStatusCounts.reduce(
      (totals, item) => ({
        sent: totals.sent + (item.status === "SENT" ? item._count._all : 0),
        failed: totals.failed + (item.status === "FAILED" ? item._count._all : 0),
        skipped: totals.skipped + (item.status === "SKIPPED" ? item._count._all : 0)
      }),
      {
        sent: 0,
        failed: 0,
        skipped: 0
      }
    );

    const topSellingProductsRaw = await prisma.product.findMany({
      where: {
        id: {
          in: topSellingItems.map((item) => item.productId)
        }
      },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const topSellingProducts = topSellingItems
      .map((item) => {
        const product = topSellingProductsRaw.find((entry) => entry.id === item.productId);
        return {
          productId: item.productId,
          name: product?.name || `Product #${item.productId}`,
          category: product?.category?.name || null,
          fulfilledQty: item._sum.finalQuantity || 0,
          requestedQty: item._sum.quantity || 0
        };
      })
      .sort((left, right) => right.fulfilledQty - left.fulfilledQty);

    const deliveredDurations = recentDeliveredOrders
      .map((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        const deliveredAt = new Date(order.updatedAt).getTime();
        const packedAt = order.packedAt ? new Date(order.packedAt).getTime() : null;
        const readyAt = order.readyForDispatchAt
          ? new Date(order.readyForDispatchAt).getTime()
          : null;

        return {
          totalMinutes: Math.max(0, Math.round((deliveredAt - createdAt) / 60000)),
          packToDispatchMinutes:
            packedAt && readyAt ? Math.max(0, Math.round((readyAt - packedAt) / 60000)) : null,
          dispatchToDoorMinutes:
            readyAt ? Math.max(0, Math.round((deliveredAt - readyAt) / 60000)) : null
        };
      })
      .filter((entry) => Number.isFinite(entry.totalMinutes));

    const average = (values) =>
      values.length > 0
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

    const averageOrderValue = orderCount > 0 ? Number(salesAggregate._sum.total || 0) / orderCount : 0;
    const cancellationRate = orderCount > 0 ? (cancelledCount / orderCount) * 100 : 0;
    const fulfillmentRate = orderCount > 0 ? (deliveredCount / orderCount) * 100 : 0;

    return {
      totals: {
        orders: orderCount,
        delivered: deliveredCount,
        products: productCount,
        pendingOrders,
        pendingRefunds: pendingRefundCount,
        deliveredToday: deliveredTodayCount,
        lowStockAlerts,
        nearExpiryAlerts,
        overdueReservations: overdueActiveReservations,
        sales: Number(salesAggregate._sum.total || 0)
      },
      analytics: {
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        cancellationRate: Number(cancellationRate.toFixed(1)),
        fulfillmentRate: Number(fulfillmentRate.toFixed(1)),
        refundedAmount: Number(refundedAggregate._sum.refundAmount || 0),
        averageCompletionMinutes: average(deliveredDurations.map((entry) => entry.totalMinutes)),
        averagePackToDispatchMinutes: average(
          deliveredDurations
            .map((entry) => entry.packToDispatchMinutes)
            .filter((value) => Number.isFinite(value))
        ),
        averageDispatchToDoorMinutes: average(
          deliveredDurations
            .map((entry) => entry.dispatchToDoorMinutes)
            .filter((value) => Number.isFinite(value))
        )
      },
      runtime: {
        redisEnabled: env.redisEnabled,
        redisStatus: env.redisEnabled ? getRedis()?.status || "disconnected" : "disabled",
        queueTotals: queueStats.totals,
        queues: queueStats.queues
      },
      notifications: {
        last24Hours: notificationTotals,
        recentLogs: recentNotificationLogs.map((log) => ({
          id: log.id,
          orderId: log.order?.id || log.orderId,
          templateKey: log.templateKey,
          recipient: log.recipient,
          subject: log.subject,
          status: log.status,
          provider: log.provider,
          retryCount: log.retryCount,
          lastRetriedAt: log.lastRetriedAt,
          errorMessage: log.errorMessage,
          sentAt: log.sentAt,
          createdAt: log.createdAt,
          customer: log.user
        }))
      },
      audit: {
        recentLogs: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          createdAt: log.createdAt,
          actor: log.actor,
          before: log.beforeJson,
          after: log.afterJson,
          metadata: log.metadataJson
        }))
      },
      topSellingProducts,
      pendingRefundOrders: pendingRefundOrders.map((order) => ({
        id: order.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        refundStatus: order.refundStatus,
        refundAmount: Number(order.refundAmount || 0),
        fulfillmentAdjustedAt: order.fulfillmentAdjustedAt,
        customer: order.user
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        createdAt: order.createdAt,
        customer: order.user,
        delivery: order.delivery
      }))
    };
  }

  async completeRefund(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.refundStatus !== "PENDING" || Number(order.refundAmount || 0) <= 0) {
      throw new AppError("This order does not have a pending refund to complete.", 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        refundStatus: "COMPLETED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await notificationService.enqueueRefundCompleted(updated.id);
    await auditService.record({
      action: "admin.refund.completed",
      entityType: "order",
      entityId: updated.id,
      before: {
        refundStatus: order.refundStatus,
        refundAmount: Number(order.refundAmount || 0)
      },
      after: {
        refundStatus: updated.refundStatus,
        refundAmount: Number(updated.refundAmount || 0)
      }
    });

    return {
      id: updated.id,
      refundStatus: updated.refundStatus,
      refundAmount: Number(updated.refundAmount || 0),
      customer: updated.user
    };
  }

  async createStaff(payload) {
    const email = normalizeEmail(payload.email);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError("Email is already registered.", 409);
    }

    const hashedPassword = await hashPassword(payload.password);

    const staff = await prisma.user.create({
      data: {
        name: payload.name,
        email,
        phone: payload.phone,
        password: hashedPassword,
        role: ROLES.STAFF
      }
    });

    await auditService.record({
      action: "admin.staff.created",
      entityType: "user",
      entityId: staff.id,
      after: {
        email: staff.email,
        role: staff.role
      }
    });

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      createdAt: staff.createdAt
    };
  }

  async retryNotification(notificationLogId) {
    const notificationLog = await prisma.notificationLog.findUnique({
      where: { id: notificationLogId }
    });

    if (!notificationLog) {
      throw new AppError("Notification log not found.", 404);
    }

    if (!["FAILED", "SKIPPED"].includes(notificationLog.status)) {
      throw new AppError("Only failed or skipped notifications can be retried.", 400);
    }

    await notificationService.retryNotificationLog(notificationLogId);
    await auditService.record({
      action: "admin.notification.retried",
      entityType: "notification_log",
      entityId: notificationLog.id,
      before: {
        status: notificationLog.status,
        retryCount: notificationLog.retryCount ?? 0
      },
      metadata: {
        templateKey: notificationLog.templateKey,
        recipient: notificationLog.recipient
      }
    });

    return {
      id: notificationLog.id,
      status: notificationLog.status,
      templateKey: notificationLog.templateKey,
      recipient: notificationLog.recipient
    };
  }
}
