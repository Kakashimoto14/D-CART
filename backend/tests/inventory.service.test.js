import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";

const addMock = jest.fn();
const findReservationMock = jest.fn();
const findReservationsMock = jest.fn();
const countReservationsMock = jest.fn();
const transactionMock = jest.fn();
const auditRecordMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {
    inventoryReservation: {
      findUnique: findReservationMock,
      findMany: findReservationsMock,
      count: countReservationsMock
    },
    $transaction: transactionMock
  }
}));

jest.unstable_mockModule("../src/config/env.js", () => ({
  env: {
    nodeEnv: "test",
    redisEnabled: true,
    queueEnabled: true
  }
}));

jest.unstable_mockModule("../src/infrastructure/queue/queues.js", () => ({
  getQueue: jest.fn(() => null)
}));

jest.unstable_mockModule("../src/infrastructure/redis/redis.js", () => ({
  getRedis: jest.fn(() => null)
}));

jest.unstable_mockModule("../src/services/audit.service.js", () => ({
  AuditService: class {
    record = auditRecordMock;
  }
}));

const queueModule = await import("../src/infrastructure/queue/queues.js");
const { InventoryService } = await import("../src/services/inventory.service.js");

describe("InventoryService queue runtime helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("schedules a delayed reservation-expiry job when the queue is available", async () => {
    queueModule.getQueue.mockReturnValue({
      add: addMock.mockResolvedValue({})
    });

    const service = new InventoryService();
    await service.enqueueReservationExpiry(99, 15);

    expect(addMock).toHaveBeenCalledWith(
      "inventory.reservation.expire",
      { reservationId: 99 },
      {
        jobId: "reservation-expiry:99",
        delay: 15 * 60 * 1000
      }
    );
  });

  it("releases an expired active reservation inside a transaction", async () => {
    findReservationMock.mockResolvedValue({
      id: 12,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 60_000)
    });

    const service = new InventoryService();
    service.releaseReservation = jest.fn().mockResolvedValue({ id: 12, status: "EXPIRED" });
    transactionMock.mockImplementation(async (callback) => callback({ tx: true }));

    const result = await service.expireReservationIfNeeded(12);

    expect(transactionMock).toHaveBeenCalled();
    expect(service.releaseReservation).toHaveBeenCalledWith(
      12,
      { status: "EXPIRED", reason: "Reservation expired after checkout timeout." },
      { tx: true }
    );
    expect(result).toEqual({ id: 12, status: "EXPIRED" });
  });

  it("cleans up multiple overdue reservations and reports the result", async () => {
    findReservationsMock.mockResolvedValue([
      { id: 3, status: "ACTIVE", expiresAt: new Date(Date.now() - 60_000) },
      { id: 4, status: "ACTIVE", expiresAt: new Date(Date.now() - 30_000) }
    ]);

    const service = new InventoryService();
    service.expireReservationIfNeeded = jest
      .fn()
      .mockResolvedValueOnce({ id: 3, status: "EXPIRED" })
      .mockResolvedValueOnce({ id: 4, status: "EXPIRED" });

    const result = await service.cleanupExpiredReservations({ limit: 10 });

    expect(findReservationsMock).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: expect.any(Date)
        }
      },
      orderBy: {
        expiresAt: "asc"
      },
      take: 10
    });
    expect(service.expireReservationIfNeeded).toHaveBeenCalledWith(3);
    expect(service.expireReservationIfNeeded).toHaveBeenCalledWith(4);
    expect(auditRecordMock).toHaveBeenCalledWith({
      action: "inventory.reservations.cleanup_expired",
      entityType: "inventory_reservation",
      entityId: "3,4",
      actorUserId: null,
      metadata: {
        overdueCount: 2,
        cleanedCount: 2,
        cleanedReservationIds: [3, 4]
      }
    });
    expect(result).toEqual({
      overdueCount: 2,
      cleanedCount: 2,
      cleanedReservationIds: [3, 4]
    });
  });

  it("counts overdue active reservations", async () => {
    countReservationsMock.mockResolvedValue(6);

    const service = new InventoryService();
    const result = await service.countOverdueActiveReservations();

    expect(countReservationsMock).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: expect.any(Date)
        }
      }
    });
    expect(result).toBe(6);
  });
});
