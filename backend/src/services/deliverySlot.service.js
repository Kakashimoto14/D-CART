import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import {
  addStoreDays,
  combineStoreDateAndTime,
  endOfStoreDay,
  startOfStoreDay,
  toStoreDateKey
} from "../utils/storeTime.js";

export class DeliverySlotService {
  combineSlotDateTime(date, time) {
    return combineStoreDateAndTime(date, time);
  }

  buildDefaultSchedule(deliveryType) {
    const now = new Date();
    const sameDayCutoffAt = combineStoreDateAndTime(
      now,
      `${String(env.sameDayCutoffHour).padStart(2, "0")}:00`
    );

    if (deliveryType === "STANDARD") {
      const estimatedAt = combineStoreDateAndTime(
        addStoreDays(now, env.standardLeadDays),
        "11:00"
      );

      return {
        deliveryType,
        isEligible: true,
        earliestAt: estimatedAt,
        message: `Standard delivery will be scheduled from ${env.standardLeadDays} day(s) ahead.`
      };
    }

    const estimatedAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    return {
      deliveryType,
      isEligible: now < sameDayCutoffAt,
      earliestAt: estimatedAt,
      cutoffAt: sameDayCutoffAt,
      message:
        now < sameDayCutoffAt
          ? "Same-day delivery is available while the store is still accepting dispatches."
          : "Same-day delivery cutoff has passed for today."
    };
  }

  evaluateSlotEligibility(slot, deliveryType) {
    const now = new Date();
    const slotStart = this.combineSlotDateTime(slot.date, slot.startTime);
    const slotEnd = this.combineSlotDateTime(slot.date, slot.endTime);
    const isToday = toStoreDateKey(slot.date) === toStoreDateKey(now);
    const sameDayCutoffAt = combineStoreDateAndTime(
      now,
      `${String(env.sameDayCutoffHour).padStart(2, "0")}:00`
    );
    const slotCutoffAt = new Date(slotStart.getTime() - env.sameDaySlotCutoffMinutes * 60 * 1000);

    let isEligible = slot.isActive && slot.bookedCount < slot.maxOrders;
    let reason = null;

    if (deliveryType === "STANDARD") {
      const minimumDate = addStoreDays(now, env.standardLeadDays);

      if (slotStart < minimumDate) {
        isEligible = false;
        reason = `Standard delivery requires at least ${env.standardLeadDays} day(s) lead time.`;
      }
    }

    if (deliveryType === "SAME_DAY") {
      if (!isToday) {
        isEligible = false;
        reason = "Same-day delivery only supports slots for today.";
      } else if (now >= sameDayCutoffAt) {
        isEligible = false;
        reason = "Same-day delivery cutoff has passed for today.";
      } else if (now >= slotCutoffAt) {
        isEligible = false;
        reason = `This slot closed ${env.sameDaySlotCutoffMinutes} minutes before dispatch.`;
      }
    }

    if (slot.bookedCount >= slot.maxOrders) {
      isEligible = false;
      reason = "This slot is already fully booked.";
    }

    if (!slot.isActive) {
      isEligible = false;
      reason = "This slot is not active.";
    }

    return {
      id: slot.id,
      deliveryType,
      isEligible,
      reason,
      cutoffAt: deliveryType === "SAME_DAY" ? slotCutoffAt : null,
      startsAt: slotStart,
      endsAt: slotEnd
    };
  }

  /**
   * List available delivery slots for a given date range.
   * Only returns slots that are active and have available capacity.
   */
  async getAvailableSlots(dateFrom, dateTo, options = {}) {
    const from = startOfStoreDay(dateFrom ? new Date(dateFrom) : new Date());
    const to = dateTo
      ? endOfStoreDay(new Date(dateTo))
      : endOfStoreDay(addStoreDays(from, 7)); // default: next 7 days
    const deliveryType = options.deliveryType || "SAME_DAY";

    const slots = await prisma.deliverySlot.findMany({
      where: {
        date: { gte: from, lte: to },
        isActive: true
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    });

    return slots
      .map((slot) => ({
        slot,
        eligibility: this.evaluateSlotEligibility(slot, deliveryType)
      }))
      .filter(({ eligibility }) => eligibility.isEligible)
      .map(({ slot, eligibility }) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxOrders: slot.maxOrders,
        bookedCount: slot.bookedCount,
        available: slot.maxOrders - slot.bookedCount,
        deliveryType,
        cutoffAt: eligibility.cutoffAt,
        startsAt: eligibility.startsAt,
        endsAt: eligibility.endsAt
      }));
  }

  async getSlotById(slotId, txClient) {
    const db = txClient || prisma;
    return db.deliverySlot.findUnique({
      where: { id: slotId }
    });
  }

  async getAllSlots() {
    const slots = await prisma.deliverySlot.findMany({
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    });

    return slots.map((slot) => ({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxOrders: slot.maxOrders,
      bookedCount: slot.bookedCount,
      isActive: slot.isActive,
      available: slot.maxOrders - slot.bookedCount
    }));
  }

  /**
   * Book a delivery slot (increment bookedCount).
   */
  async bookSlot(slotId, deliveryType = "SAME_DAY", txClient) {
    const db = txClient || prisma;
    const slot = await db.deliverySlot.findUnique({ where: { id: slotId } });

    if (!slot) {
      throw new AppError("Delivery slot not found.", 404);
    }

    if (!slot.isActive) {
      throw new AppError("This delivery slot is no longer available.", 400);
    }

    if (slot.bookedCount >= slot.maxOrders) {
      throw new AppError("This delivery slot is fully booked.", 400);
    }

    const eligibility = this.evaluateSlotEligibility(slot, deliveryType);
    if (!eligibility.isEligible) {
      throw new AppError(eligibility.reason || "This delivery slot is not eligible.", 400);
    }

    return db.deliverySlot.update({
      where: { id: slotId },
      data: { bookedCount: { increment: 1 } }
    });
  }

  /**
   * Release a delivery slot (decrement bookedCount) when an order is cancelled.
   * Accepts an optional Prisma transaction client.
   */
  async releaseSlot(slotId, txClient) {
    const db = txClient || prisma;

    const slot = await db.deliverySlot.findUnique({ where: { id: slotId } });

    if (!slot) return; // Slot may have been deleted — skip silently

    if (slot.bookedCount > 0) {
      await db.deliverySlot.update({
        where: { id: slotId },
        data: { bookedCount: { decrement: 1 } }
      });
    }
  }

  /**
   * Admin: Create delivery slots for a date range.
   */
  async generateSlots(date, slots) {
    const targetDate = startOfStoreDay(new Date(date));

    const created = [];
    for (const slot of slots) {
      const record = await prisma.deliverySlot.upsert({
        where: {
          date_startTime_endTime: {
            date: targetDate,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        },
        update: {
          maxOrders: slot.maxOrders || 5,
          isActive: true
        },
        create: {
          date: targetDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: slot.maxOrders || 5,
          isActive: true
        }
      });
      created.push(record);
    }

    return created;
  }
}
