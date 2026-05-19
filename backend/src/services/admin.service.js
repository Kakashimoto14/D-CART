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
const categorySummarySelect = { id: true, name: true };

const startOfRange = (range, from) => {
  const now = new Date();
  if (range === "today") return startOfStoreDay(now);
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "custom" && from) return new Date(from);
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
};

const endOfRange = (range, to) => {
  if (range === "custom" && to) return endOfStoreDay(new Date(to));
  return new Date();
};

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
          },
          where: {
            status: "DELIVERED"
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

    const averageOrderValue = deliveredCount > 0 ? Number(salesAggregate._sum.total || 0) / deliveredCount : 0;
    const cancellationRate = orderCount > 0 ? (cancelledCount / orderCount) * 100 : 0;
    const fulfillmentRate = orderCount > 0 ? (deliveredCount / orderCount) * 100 : 0;

    return {
      totals: {
        orders: orderCount,
        delivered: deliveredCount,
        products: productCount,
        pendingOrders,
        pendingRefunds: pendingRefundCount,
        cancelled: cancelledCount,
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

  async listCustomers({ q = "", status = "ALL" } = {}) {
    const search = q.trim();
    const where = {
      role: ROLES.CUSTOMER,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const customers = await prisma.user.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            paymentStatus: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const mapped = customers.map((customer) => {
      const completedOrders = customer.orders.filter((order) => order.status === "DELIVERED");
      const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const activeOrders = customer.orders.filter((order) =>
        ["PENDING", "CONFIRMED", "PACKING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(
          order.status
        )
      ).length;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: activeOrders > 0 ? "ACTIVE" : customer.orders.length > 0 ? "RETURNING" : "NEW",
        totalOrders: customer.orders.length,
        completedOrders: completedOrders.length,
        activeOrders,
        totalSpent,
        lastOrderDate: customer.orders[0]?.createdAt || null,
        createdAt: customer.createdAt
      };
    });

    return status === "ALL" ? mapped : mapped.filter((customer) => customer.status === status);
  }

  async listSuppliers({ q = "", status = "ALL" } = {}) {
    const search = q.trim();
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        supplier: {
          not: null
        },
        ...(search ? { supplier: { contains: search, mode: "insensitive" } } : {})
      },
      include: {
        inventoryItem: {
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
      },
      orderBy: { updatedAt: "desc" },
      take: 500
    });

    const supplierMap = new Map();
    for (const batch of batches) {
      const name = batch.supplier?.trim();
      if (!name || ["SYSTEM_MIGRATION", "INITIAL_STOCK", "MANUAL_ADJUSTMENT"].includes(name)) {
        continue;
      }

      const existing = supplierMap.get(name) || {
        id: name,
        name,
        contactPerson: null,
        phone: null,
        email: null,
        status: "ACTIVE",
        suppliedProducts: [],
        batchCount: 0,
        receivedQty: 0,
        remainingQty: 0,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt
      };

      existing.batchCount += 1;
      existing.receivedQty += batch.receivedQty;
      existing.remainingQty += batch.remainingQty;
      existing.createdAt =
        new Date(batch.createdAt) < new Date(existing.createdAt) ? batch.createdAt : existing.createdAt;
      existing.updatedAt =
        new Date(batch.updatedAt) > new Date(existing.updatedAt) ? batch.updatedAt : existing.updatedAt;

      const product = batch.inventoryItem?.product;
      if (product && !existing.suppliedProducts.some((item) => item.id === product.id)) {
        existing.suppliedProducts.push({
          id: product.id,
          name: product.name,
          category: product.category?.name || null
        });
      }

      supplierMap.set(name, existing);
    }

    const suppliers = [...supplierMap.values()].map((supplier) => ({
      ...supplier,
      status: supplier.remainingQty > 0 ? "ACTIVE" : "INACTIVE"
    }));

    return status === "ALL" ? suppliers : suppliers.filter((supplier) => supplier.status === status);
  }

  async getSalesAnalytics({ range = "30d", from, to } = {}) {
    const gte = startOfRange(range, from);
    const lte = endOfRange(range, to);
    const where = {
      createdAt: { gte, lte }
    };
    const salesWhere = {
      ...where,
      status: { not: "CANCELLED" }
    };

    const [
      revenue,
      totalOrders,
      topItems,
      paymentBreakdown,
      statusBreakdown,
      orders
    ] = await Promise.all([
      prisma.order.aggregate({
        where: salesWhere,
        _sum: { total: true }
      }),
      prisma.order.count({ where }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: salesWhere
        },
        _sum: {
          finalQuantity: true,
          quantity: true
        },
        orderBy: {
          _sum: {
            finalQuantity: "desc"
          }
        },
        take: 10
      }),
      prisma.order.groupBy({
        by: ["paymentMethod"],
        where,
        _count: { _all: true },
        _sum: { total: true }
      }),
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: { _all: true }
      }),
      prisma.order.findMany({
        where: salesWhere,
        select: {
          id: true,
          total: true,
          createdAt: true
        },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const products = await prisma.product.findMany({
      where: { id: { in: topItems.map((item) => item.productId) } },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } }
      }
    });

    const salesByDayMap = new Map();
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const current = salesByDayMap.get(key) || { date: key, revenue: 0, orders: 0 };
      current.revenue += Number(order.total || 0);
      current.orders += 1;
      salesByDayMap.set(key, current);
    }

    const totalRevenue = Number(revenue._sum.total || 0);

    return {
      range: { from: gte, to: lte, preset: range },
      totals: {
        revenue: totalRevenue,
        orders: totalOrders,
        averageOrderValue: totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0
      },
      salesByDay: [...salesByDayMap.values()],
      topSellingProducts: topItems
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          return {
            productId: item.productId,
            name: product?.name || `Product #${item.productId}`,
            category: product?.category?.name || null,
            quantity: item._sum.finalQuantity || item._sum.quantity || 0
          };
        })
        .sort((left, right) => right.quantity - left.quantity),
      paymentBreakdown: paymentBreakdown.map((item) => ({
        paymentMethod: item.paymentMethod,
        orders: item._count._all,
        revenue: Number(item._sum.total || 0)
      })),
      orderStatusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        orders: item._count._all
      }))
    };
  }

  async getNotifications() {
    const [dashboard, inventoryAlerts, failedPayments, completedOrders] = await Promise.all([
      this.getDashboardMetrics(),
      inventoryService.getInventoryAlerts(),
      prisma.order.findMany({
        where: { paymentStatus: "FAILED" },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 8
      }),
      prisma.order.findMany({
        where: { status: "DELIVERED" },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 8
      })
    ]);

    const events = [
      ...inventoryAlerts.lowStock.slice(0, 8).map((item) => ({
        id: `low-stock-${item.productId}`,
        type: "LOW_STOCK",
        title: "Low stock",
        message: `${item.product?.name || "A product"} is at or below its reorder point.`,
        status: "UNREAD",
        createdAt: item.updatedAt,
        metadata: { productId: item.productId }
      })),
      ...dashboard.recentOrders.map((order) => ({
        id: `order-${order.id}`,
        type: "NEW_ORDER",
        title: "New order",
        message: `Order #${order.id} from ${order.customer?.name || "customer"} is ${order.status.toLowerCase()}.`,
        status: "UNREAD",
        createdAt: order.createdAt,
        metadata: { orderId: order.id }
      })),
      ...failedPayments.map((order) => ({
        id: `failed-payment-${order.id}`,
        type: "FAILED_PAYMENT",
        title: "Failed payment",
        message: `GCash payment failed for order #${order.id}.`,
        status: "UNREAD",
        createdAt: order.updatedAt,
        metadata: { orderId: order.id, customer: order.user }
      })),
      ...completedOrders.map((order) => ({
        id: `completed-order-${order.id}`,
        type: "COMPLETED_ORDER",
        title: "Completed order",
        message: `Order #${order.id} was delivered.`,
        status: "UNREAD",
        createdAt: order.updatedAt,
        metadata: { orderId: order.id, customer: order.user }
      }))
    ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    return {
      events: events.slice(0, 30),
      deliveryLogs: dashboard.notifications.recentLogs,
      auditLogs: dashboard.audit.recentLogs
    };
  }

  async getSettings() {
    const config = await prisma.storeConfig.findFirst();
    if (!config) {
      throw new AppError("Store configuration not found.", 404);
    }

    return {
      id: config.id,
      storeName: config.storeName,
      latitude: Number(config.latitude),
      longitude: Number(config.longitude),
      deliveryRadius: Number(config.deliveryRadius),
      baseFee: Number(config.baseFee),
      perKmFee: Number(config.perKmFee),
      currency: "PHP"
    };
  }

  async updateSettings(payload, actorUserId = null) {
    const existing = await prisma.storeConfig.findFirst();
    if (!existing) {
      throw new AppError("Store configuration not found.", 404);
    }

    const updated = await prisma.storeConfig.update({
      where: { id: existing.id },
      data: {
        storeName: payload.storeName,
        latitude: payload.latitude,
        longitude: payload.longitude,
        deliveryRadius: payload.deliveryRadius,
        baseFee: payload.baseFee,
        perKmFee: payload.perKmFee
      }
    });

    await auditService.record({
      action: "admin.settings.updated",
      entityType: "store_config",
      entityId: updated.id,
      actorUserId,
      before: {
        storeName: existing.storeName,
        deliveryRadius: Number(existing.deliveryRadius),
        baseFee: Number(existing.baseFee),
        perKmFee: Number(existing.perKmFee)
      },
      after: {
        storeName: updated.storeName,
        deliveryRadius: Number(updated.deliveryRadius),
        baseFee: Number(updated.baseFee),
        perKmFee: Number(updated.perKmFee)
      }
    });

    return this.getSettings();
  }

  async globalSearch(query) {
    const search = query.trim();
    const [products, orders, categories, inventory, customers] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
            { category: { name: { contains: search, mode: "insensitive" } } }
          ]
        },
        include: {
          category: {
            select: categorySummarySelect
          }
        },
        take: 6
      }),
      prisma.order.findMany({
        where: Number.isInteger(Number(search))
          ? { id: Number(search) }
          : {
              user: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } }
                ]
              }
            },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.category.findMany({
        where: {
          name: { contains: search, mode: "insensitive" }
        },
        select: {
          id: true,
          name: true
        },
        take: 6
      }),
      prisma.inventoryItem.findMany({
        where: {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } }
            ]
          }
        },
        include: { product: true },
        take: 6
      }),
      prisma.user.findMany({
        where: {
          role: ROLES.CUSTOMER,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        },
        take: 6
      })
    ]);

    return {
      products: products.map((product) => ({
        id: product.id,
        label: product.name,
        detail: product.category?.name || "Product",
        to: "/admin/products"
      })),
      orders: orders.map((order) => ({
        id: order.id,
        label: `Order #${order.id}`,
        detail: `${order.user?.name || "Customer"} - ${order.status}`,
        to: "/admin/orders"
      })),
      categories: categories.map((category) => ({
        id: category.id,
        label: category.name,
        detail: "Category",
        to: "/admin/categories"
      })),
      inventory: inventory.map((item) => ({
        id: item.productId,
        label: item.product?.name || `Product #${item.productId}`,
        detail: `${item.availableQty} available`,
        to: "/admin/inventory"
      })),
      customers: customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        detail: customer.email,
        to: "/admin/customers"
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
