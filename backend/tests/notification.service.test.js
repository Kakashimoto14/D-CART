import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";

const addMock = jest.fn();
const warnMock = jest.fn();
const createNotificationLogMock = jest.fn();
const findOrderMock = jest.fn();
const updateNotificationLogMock = jest.fn();
const sendMessageMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: findOrderMock
    },
    notificationLog: {
      create: createNotificationLogMock,
      update: updateNotificationLogMock
    }
  }
}));

jest.unstable_mockModule("../src/infrastructure/queue/queues.js", () => ({
  getQueue: jest.fn(() => null)
}));

jest.unstable_mockModule("../src/infrastructure/logger/logger.js", () => ({
  logger: {
    warn: warnMock,
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule("../src/services/email.service.js", () => ({
  EmailService: class {
    sendMessage = sendMessageMock;
  }
}));

const queueModule = await import("../src/infrastructure/queue/queues.js");
const { NotificationService } = await import("../src/services/notification.service.js");

describe("NotificationService.enqueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to inline processing when the notifications queue is unavailable", async () => {
    queueModule.getQueue.mockReturnValue(null);

    const service = new NotificationService();
    service.processJob = jest.fn().mockResolvedValue(null);

    await service.enqueue("customer.order.created", { orderId: 42 });

    expect(warnMock).toHaveBeenCalled();
    expect(service.processJob).toHaveBeenCalledWith("customer.order.created", { orderId: 42 });
  });

  it("enqueues a job when the notifications queue is available", async () => {
    queueModule.getQueue.mockReturnValue({
      add: addMock.mockResolvedValue({})
    });

    const service = new NotificationService();
    service.processJob = jest.fn().mockResolvedValue(null);

    await service.enqueue("customer.order.status", { orderId: 7, status: "DELIVERED" });

    expect(addMock).toHaveBeenCalledWith(
      "customer.order.status",
      { orderId: 7, status: "DELIVERED" },
      expect.objectContaining({
        jobId: expect.stringMatching(/^customer\.order\.status:7:none:/)
      })
    );
    expect(service.processJob).not.toHaveBeenCalled();
  });
});

describe("NotificationService.sendPaymentPaid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists a sent notification log after successful delivery", async () => {
    findOrderMock.mockResolvedValue({
      id: 14,
      userId: 5,
      paymentReference: "pay-123",
      refundAmount: 0,
      total: 180,
      user: {
        id: 5,
        name: "Dana Customer",
        email: "dana@example.com"
      },
      items: [],
      delivery: {
        address: "123 Test St",
        estimatedAt: new Date("2026-05-17T14:00:00.000Z"),
        assignments: []
      },
      deliverySlot: null
    });
    sendMessageMock.mockResolvedValue({ preview: null });

    const service = new NotificationService();
    await service.sendPaymentPaid(14);

    expect(createNotificationLogMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 14,
        userId: 5,
        templateKey: "customer.order.payment_paid",
        recipient: "dana@example.com",
        status: "SENT",
        provider: "email"
      })
    });
  });

  it("persists a failed notification log and rethrows when delivery fails", async () => {
    findOrderMock.mockResolvedValue({
      id: 15,
      userId: 6,
      paymentReference: "pay-456",
      refundAmount: 0,
      total: 220,
      user: {
        id: 6,
        name: "Fail Case",
        email: "fail@example.com"
      },
      items: [],
      delivery: {
        address: "456 Test St",
        estimatedAt: null,
        assignments: []
      },
      deliverySlot: null
    });
    sendMessageMock.mockRejectedValue(new Error("SMTP down"));

    const service = new NotificationService();

    await expect(service.sendPaymentPaid(15)).rejects.toThrow("SMTP down");
    expect(createNotificationLogMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 15,
        userId: 6,
        templateKey: "customer.order.payment_paid",
        recipient: "fail@example.com",
        status: "FAILED",
        errorMessage: "SMTP down"
      })
    });
  });
});

describe("NotificationService.retryNotificationLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("re-enqueues the original template using stored payload", async () => {
    updateNotificationLogMock.mockResolvedValue({
      id: 9,
      templateKey: "customer.order.payment_paid",
      retryCount: 1,
      payloadJson: {
        orderId: 14
      }
    });
    queueModule.getQueue.mockReturnValue({
      add: addMock.mockResolvedValue({})
    });

    const service = new NotificationService();
    const result = await service.retryNotificationLog(9);

    expect(updateNotificationLogMock).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        retryCount: { increment: 1 },
        lastRetriedAt: expect.any(Date)
      }
    });
    expect(addMock).toHaveBeenCalledWith(
      "customer.order.payment_paid",
      { orderId: 14 },
      expect.objectContaining({
        jobId: expect.stringMatching(/^customer\.order\.payment_paid:14:none:/)
      })
    );
    expect(result).toEqual({
      id: 9,
      templateKey: "customer.order.payment_paid",
      retryCount: 1,
      payloadJson: {
        orderId: 14
      }
    });
  });
});
