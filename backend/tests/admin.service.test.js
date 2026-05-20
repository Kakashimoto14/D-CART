import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";

const findUniqueMock = jest.fn();
const updateMock = jest.fn();
const adminNotificationReadFindManyMock = jest.fn();
const adminNotificationReadUpsertMock = jest.fn();
const adminNotificationReadCreateManyMock = jest.fn();
const enqueueRefundCompletedMock = jest.fn();
const retryNotificationLogMock = jest.fn();
const auditRecordMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: findUniqueMock,
      update: updateMock
    },
    notificationLog: {
      findUnique: findUniqueMock
    },
    adminNotificationRead: {
      findMany: adminNotificationReadFindManyMock,
      upsert: adminNotificationReadUpsertMock,
      createMany: adminNotificationReadCreateManyMock
    }
  }
}));

jest.unstable_mockModule("../src/services/notification.service.js", () => ({
  NotificationService: class {
    enqueueRefundCompleted = enqueueRefundCompletedMock;
    retryNotificationLog = retryNotificationLogMock;
  }
}));

jest.unstable_mockModule("../src/services/audit.service.js", () => ({
  AuditService: class {
    record = auditRecordMock;
  }
}));

const { AdminService } = await import("../src/services/admin.service.js");

describe("AdminService.completeRefund", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a pending refund as completed and enqueues customer notification", async () => {
    findUniqueMock.mockResolvedValue({
      id: 12,
      refundStatus: "PENDING",
      refundAmount: 180,
      user: {
        id: 3,
        name: "Ari Customer",
        email: "ari@example.com"
      }
    });
    updateMock.mockResolvedValue({
      id: 12,
      refundStatus: "COMPLETED",
      refundAmount: 180,
      user: {
        id: 3,
        name: "Ari Customer",
        email: "ari@example.com"
      }
    });

    const service = new AdminService();
    const result = await service.completeRefund(12);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 12 },
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
    expect(enqueueRefundCompletedMock).toHaveBeenCalledWith(12);
    expect(auditRecordMock).toHaveBeenCalledWith({
      action: "admin.refund.completed",
      entityType: "order",
      entityId: 12,
      before: {
        refundStatus: "PENDING",
        refundAmount: 180
      },
      after: {
        refundStatus: "COMPLETED",
        refundAmount: 180
      }
    });
    expect(result).toEqual({
      id: 12,
      refundStatus: "COMPLETED",
      refundAmount: 180,
      customer: {
        id: 3,
        name: "Ari Customer",
        email: "ari@example.com"
      }
    });
  });

  it("rejects completion when no pending refund exists", async () => {
    findUniqueMock.mockResolvedValue({
      id: 20,
      refundStatus: "NONE",
      refundAmount: 0,
      user: {
        id: 5,
        name: "No Refund",
        email: "norefund@example.com"
      }
    });

    const service = new AdminService();

    await expect(service.completeRefund(20)).rejects.toThrow(
      "This order does not have a pending refund to complete."
    );
    expect(updateMock).not.toHaveBeenCalled();
    expect(enqueueRefundCompletedMock).not.toHaveBeenCalled();
  });
});

describe("AdminService.retryNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requeues a failed notification log", async () => {
    findUniqueMock.mockResolvedValue({
      id: 4,
      status: "FAILED",
      templateKey: "customer.order.payment_paid",
      recipient: "retry@example.com"
    });

    const service = new AdminService();
    const result = await service.retryNotification(4);

    expect(retryNotificationLogMock).toHaveBeenCalledWith(4);
    expect(auditRecordMock).toHaveBeenCalledWith({
      action: "admin.notification.retried",
      entityType: "notification_log",
      entityId: 4,
      before: {
        status: "FAILED",
        retryCount: 0
      },
      metadata: {
        templateKey: "customer.order.payment_paid",
        recipient: "retry@example.com"
      }
    });
    expect(result).toEqual({
      id: 4,
      status: "FAILED",
      templateKey: "customer.order.payment_paid",
      recipient: "retry@example.com"
    });
  });

  it("rejects retry for successful notifications", async () => {
    findUniqueMock.mockResolvedValue({
      id: 5,
      status: "SENT",
      templateKey: "customer.order.created",
      recipient: "done@example.com"
    });

    const service = new AdminService();

    await expect(service.retryNotification(5)).rejects.toThrow(
      "Only failed or skipped notifications can be retried."
    );
    expect(retryNotificationLogMock).not.toHaveBeenCalled();
  });
});

describe("AdminService notification read state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only unread admin notification events with an unread count", async () => {
    adminNotificationReadFindManyMock.mockResolvedValue([
      { notificationKey: "order-10", readAt: new Date("2026-05-20T12:00:00.000Z") }
    ]);

    const service = new AdminService();
    jest.spyOn(service, "buildAdminNotificationEvents").mockResolvedValue({
      events: [
        {
          id: "order-10",
          type: "NEW_ORDER",
          title: "New order",
          message: "Order #10 is pending.",
          createdAt: new Date("2026-05-20T11:00:00.000Z"),
          metadata: { orderId: 10 }
        },
        {
          id: "failed-payment-11",
          type: "FAILED_PAYMENT",
          title: "Failed payment",
          message: "Payment failed.",
          createdAt: new Date("2026-05-20T12:30:00.000Z"),
          metadata: { orderId: 11 }
        }
      ],
      deliveryLogs: [],
      auditLogs: []
    });

    const result = await service.getNotifications(1);

    expect(result.unreadCount).toBe(1);
    expect(result.events).toEqual([
      expect.objectContaining({
        id: "failed-payment-11",
        isRead: false,
        status: "UNREAD"
      })
    ]);
    expect(result.recentRead).toEqual([
      expect.objectContaining({
        id: "order-10",
        isRead: true,
        status: "READ"
      })
    ]);
  });

  it("marks all current unread admin notifications as read", async () => {
    adminNotificationReadFindManyMock.mockResolvedValue([]);
    adminNotificationReadCreateManyMock.mockResolvedValue({ count: 2 });

    const service = new AdminService();
    jest.spyOn(service, "buildAdminNotificationEvents").mockResolvedValue({
      events: [
        { id: "order-12", type: "NEW_ORDER", title: "New order", message: "Order #12", metadata: {} },
        { id: "low-stock-7", type: "LOW_STOCK", title: "Low stock", message: "Low stock", metadata: {} }
      ],
      deliveryLogs: [],
      auditLogs: []
    });

    const result = await service.markAllNotificationsRead(1);

    expect(adminNotificationReadCreateManyMock).toHaveBeenCalledWith({
      data: [
        { adminUserId: 1, notificationKey: "order-12" },
        { adminUserId: 1, notificationKey: "low-stock-7" }
      ],
      skipDuplicates: true
    });
    expect(result).toEqual({
      readCount: 2,
      unreadCount: 0
    });
  });
});
