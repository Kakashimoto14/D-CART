import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";

const adjustProductStockMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {}
}));

jest.unstable_mockModule("../src/realtime/socket.js", () => ({
  emitOrderChanged: jest.fn()
}));

jest.unstable_mockModule("../src/services/inventory.service.js", () => ({
  InventoryService: class {
    ensureInventoryForProduct = jest.fn();

    adjustProductStock = adjustProductStockMock;
  }
}));

jest.unstable_mockModule("../src/services/notification.service.js", () => ({
  NotificationService: class {
    enqueueItemUnavailable = jest.fn();

    enqueueItemSubstituted = jest.fn();
  }
}));

const { PickerService } = await import("../src/services/picker.service.js");

describe("PickerService.recalculateOrderFinancials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a paid order with a pending refund when fulfilled quantity reduces the total", async () => {
    const service = new PickerService();
    const update = jest.fn().mockResolvedValue({});
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 42,
          deliveryFee: 50,
          total: 450,
          refundAmount: 0,
          refundStatus: "NONE",
          paymentStatus: "PAID",
          fulfillmentAdjustedAt: null,
          items: [
            { price: 100, finalQuantity: 2 },
            { price: 50, finalQuantity: 1 }
          ]
        }),
        update
      }
    };

    await service.recalculateOrderFinancials(42, tx);

    expect(update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        subtotal: 250,
        total: 300,
        refundAmount: 150,
        refundStatus: "PENDING",
        fulfillmentAdjustedAt: expect.any(Date)
      }
    });
  });

  it("marks an unpaid order adjustment as not requiring a refund", async () => {
    const service = new PickerService();
    const update = jest.fn().mockResolvedValue({});
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          deliveryFee: 40,
          total: 340,
          refundAmount: 0,
          refundStatus: "NONE",
          paymentStatus: "PENDING",
          fulfillmentAdjustedAt: null,
          items: [
            { price: 100, finalQuantity: 2 }
          ]
        }),
        update
      }
    };

    await service.recalculateOrderFinancials(7, tx);

    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        subtotal: 200,
        total: 240,
        refundAmount: 0,
        refundStatus: "NOT_REQUIRED",
        fulfillmentAdjustedAt: expect.any(Date)
      }
    });
  });
});
