import { jest } from "@jest/globals";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test_db?schema=public";
process.env.JWT_SECRET ||= "test-secret";
process.env.SAME_DAY_CUTOFF_HOUR ||= "17";
process.env.SAME_DAY_SLOT_CUTOFF_MINUTES ||= "90";
process.env.STANDARD_LEAD_DAYS ||= "1";

jest.useFakeTimers();

jest.unstable_mockModule("../src/config/prisma.js", () => ({
  prisma: {}
}));

const { DeliverySlotService } = await import("../src/services/deliverySlot.service.js");

describe("DeliverySlotService.evaluateSlotEligibility", () => {
  beforeEach(() => {
    jest.setSystemTime(new Date("2026-05-17T10:00:00+08:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("allows a same-day slot that is still ahead of cutoff", () => {
    const service = new DeliverySlotService();
    const result = service.evaluateSlotEligibility(
      {
        id: 1,
        date: new Date("2026-05-17T00:00:00+08:00"),
        startTime: "13:00",
        endTime: "15:00",
        maxOrders: 5,
        bookedCount: 1,
        isActive: true
      },
      "SAME_DAY"
    );

    expect(result.isEligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("blocks same-day slots after the per-slot cutoff window", () => {
    const service = new DeliverySlotService();
    const result = service.evaluateSlotEligibility(
      {
        id: 2,
        date: new Date("2026-05-17T00:00:00+08:00"),
        startTime: "11:00",
        endTime: "13:00",
        maxOrders: 5,
        bookedCount: 0,
        isActive: true
      },
      "SAME_DAY"
    );

    expect(result.isEligible).toBe(false);
    expect(result.reason).toMatch(/closed 90 minutes/i);
  });

  it("requires at least one day lead time for standard delivery", () => {
    const service = new DeliverySlotService();
    const result = service.evaluateSlotEligibility(
      {
        id: 3,
        date: new Date("2026-05-17T00:00:00+08:00"),
        startTime: "15:00",
        endTime: "17:00",
        maxOrders: 5,
        bookedCount: 0,
        isActive: true
      },
      "STANDARD"
    );

    expect(result.isEligible).toBe(false);
    expect(result.reason).toMatch(/lead time/i);
  });
});
