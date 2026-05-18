import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";

const emitOrderChangedMock = jest.fn();
const adjustProductStockMock = jest.fn();
const enqueueOrderStatusMock = jest.fn();

const orderFindUniqueMock = jest.fn();
const transactionMock = jest.fn();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: orderFindUniqueMock
    },
    $transaction: transactionMock
  }
}));

jest.unstable_mockModule("../src/realtime/socket.js", () => ({
  emitOrderChanged: emitOrderChangedMock
}));

jest.unstable_mockModule("../src/services/inventory.service.js", () => ({
  InventoryService: class {
    reserveStock = jest.fn();
    commitReservation = jest.fn();
    releaseReservation = jest.fn();
    adjustProductStock = adjustProductStockMock;
  }
}));

jest.unstable_mockModule("../src/services/payment.service.js", () => ({
  PaymentService: class {}
}));

jest.unstable_mockModule("../src/services/receipt.service.js", () => ({
  ReceiptService: class {}
}));

jest.unstable_mockModule("../src/services/deliveryPricing.service.js", () => ({
  DeliveryPricingService: class {}
}));

jest.unstable_mockModule("../src/services/deliverySlot.service.js", () => ({
  DeliverySlotService: class {}
}));

jest.unstable_mockModule("../src/services/geofencing.service.js", () => ({
  GeofencingService: class {}
}));

jest.unstable_mockModule("../src/services/notification.service.js", () => ({
  NotificationService: class {
    enqueueOrderCreated = jest.fn();
    enqueuePaymentPaid = jest.fn();
    enqueueItemUnavailable = jest.fn();
    enqueueItemSubstituted = jest.fn();
    enqueueOrderStatus = enqueueOrderStatusMock;
  }
}));

const { OrderService } = await import("../src/services/order.service.js");

const buildOrderRecord = (itemOverrides = {}) => ({
  id: 55,
  userId: 9,
  subtotal: 180,
  deliveryFee: 30,
  total: 210,
  status: "CONFIRMED",
  substitutionPreference: "ASK_BEFORE_REPLACE",
  paymentMethod: "GCASH",
  paymentStatus: "PAID",
  paymentProvider: "PAYMONGO",
  paymentReference: null,
  paymentCheckoutId: null,
  refundStatus: "PENDING",
  refundAmount: 40,
  fulfillmentAdjustedAt: new Date("2026-05-17T10:00:00.000Z"),
  inventoryReservationId: null,
  paidAt: null,
  pickerId: null,
  pickerNotes: null,
  packedAt: null,
  packedByUserId: null,
  stagingLabel: null,
  stagingZone: null,
  readyForDispatchAt: null,
  createdAt: new Date("2026-05-17T08:00:00.000Z"),
  items: [
    {
      id: 501,
      productId: 10,
      quantity: 2,
      price: 90,
      pickedQty: 2,
      finalQuantity: 0,
      substitutionDecision: "PENDING",
      pickStatus: "SUBSTITUTED",
      pickIssueNote: null,
      product: { id: 10, name: "Milk", price: 90 },
      substituteProductId: 11,
      substitutionNote: "Closest available brand",
      substituteProduct: { id: 11, name: "Organic Milk", barcode: "111" },
      ...itemOverrides
    }
  ],
  delivery: {
    id: 88,
    address: "123 Street",
    distanceKm: 2.5,
    deliveryFee: 30,
    estimatedAt: new Date("2026-05-17T12:00:00.000Z"),
    assignments: []
  },
  deliverySlot: null,
  inventoryReservation: null
});

describe("OrderService.reviewSubstitution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("approves a pending substitute and finalizes quantity", async () => {
    orderFindUniqueMock.mockResolvedValue(buildOrderRecord());

    const tx = {
      orderItem: {
        update: jest.fn().mockResolvedValue({})
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(buildOrderRecord({
          substitutionDecision: "APPROVED",
          finalQuantity: 2
        }))
      }
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    const service = new OrderService();
    service.recalculateOrderFinancials = jest.fn().mockResolvedValue();
    service.refreshOrderStatusAfterSubstitutionReview = jest.fn().mockResolvedValue();

    const result = await service.reviewSubstitution(9, 55, 501, "APPROVED");

    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 501 },
      data: {
        substitutionDecision: "APPROVED",
        finalQuantity: 2
      }
    });
    expect(service.recalculateOrderFinancials).toHaveBeenCalledWith(55, tx);
    expect(service.refreshOrderStatusAfterSubstitutionReview).toHaveBeenCalledWith(55, tx);
    expect(emitOrderChangedMock).toHaveBeenCalledWith({
      orderId: 55,
      userId: 9,
      status: "CONFIRMED",
      type: "substitution_approved"
    });
    expect(enqueueOrderStatusMock).toHaveBeenCalledWith(55, "CONFIRMED");
    expect(result.items[0].substitutionDecision).toBe("APPROVED");
  });

  it("rejects a pending substitute and returns stock to the substitute product", async () => {
    orderFindUniqueMock.mockResolvedValue(buildOrderRecord());

    const tx = {
      inventoryItem: {
        findUnique: jest.fn().mockResolvedValue({
          productId: 11,
          availableQty: 3
        })
      },
      orderItem: {
        update: jest.fn().mockResolvedValue({})
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(buildOrderRecord({
          substitutionDecision: "REJECTED",
          finalQuantity: 0,
          pickStatus: "UNAVAILABLE",
          pickIssueNote: "Closest available brand"
        }))
      }
    };
    transactionMock.mockImplementation(async (callback) => callback(tx));

    const service = new OrderService();
    service.recalculateOrderFinancials = jest.fn().mockResolvedValue();
    service.refreshOrderStatusAfterSubstitutionReview = jest.fn().mockResolvedValue();

    const result = await service.reviewSubstitution(9, 55, 501, "REJECTED");

    expect(adjustProductStockMock).toHaveBeenCalledWith(
      11,
      5,
      {
        actorUserId: 9,
        reason: "Customer rejected substitute for order #55."
      },
      tx
    );
    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 501 },
      data: {
        price: 90,
        substitutionDecision: "REJECTED",
        finalQuantity: 0,
        pickStatus: "UNAVAILABLE",
        pickIssueNote: "Closest available brand"
      }
    });
    expect(emitOrderChangedMock).toHaveBeenCalledWith({
      orderId: 55,
      userId: 9,
      status: "CONFIRMED",
      type: "substitution_rejected"
    });
    expect(result.items[0].pickStatus).toBe("UNAVAILABLE");
    expect(result.items[0].price).toBe(90);
  });
});
