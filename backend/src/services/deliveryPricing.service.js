import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { validateDeliveryLocation } from "../utils/geofencing.js";
import { DeliverySlotService } from "./deliverySlot.service.js";

const deliverySlotService = new DeliverySlotService();

const roundCurrency = (value) => Math.round(value * 100) / 100;

export class DeliveryPricingService {
  async getStoreConfig() {
    const config = await prisma.storeConfig.findFirst();

    if (!config) {
      throw new AppError("Store configuration not found. Please seed the database.", 500);
    }

    return {
      storeName: config.storeName,
      latitude: Number(config.latitude),
      longitude: Number(config.longitude),
      deliveryRadius: Number(config.deliveryRadius),
      baseFee: Number(config.baseFee),
      perKmFee: Number(config.perKmFee)
    };
  }

  async quote({
    latitude,
    longitude,
    accuracyMeters = null,
    deliveryType = "SAME_DAY",
    deliverySlotId = null,
    orderSubtotal = 0
  }) {
    const config = await this.getStoreConfig();
    const geoBaseResult = validateDeliveryLocation(
      latitude,
      longitude,
      config.latitude,
      config.longitude,
      config.deliveryRadius,
      config.baseFee,
      config.perKmFee,
      accuracyMeters
    );
    const geoResult = {
      ...geoBaseResult,
      store: {
        name: config.storeName,
        latitude: config.latitude,
        longitude: config.longitude,
        deliveryRadius: config.deliveryRadius
      },
      fees: {
        baseFee: config.baseFee,
        perKmFee: config.perKmFee
      }
    };

    if (!geoResult.isWithinRadius) {
      return {
        ...geoResult,
        feeBreakdown: null,
        scheduling: null
      };
    }

    const subtotal = Number(orderSubtotal) || 0;
    const distanceFee = Number(geoResult.deliveryFee);
    const feeBreakdown = [
      {
        code: "DISTANCE_BASE",
        label: "Distance-based delivery fee",
        amount: distanceFee
      }
    ];

    let scheduledSlot = null;
    if (deliverySlotId) {
      scheduledSlot = await deliverySlotService.getSlotById(Number(deliverySlotId));
    }

    const scheduling = scheduledSlot
      ? deliverySlotService.evaluateSlotEligibility(scheduledSlot, deliveryType)
      : deliverySlotService.buildDefaultSchedule(deliveryType);

    let urgencySurcharge = 0;
    if (deliveryType === "SAME_DAY") {
      urgencySurcharge = env.sameDaySurcharge;
      feeBreakdown.push({
        code: "SAME_DAY",
        label: "Same-day fulfillment surcharge",
        amount: urgencySurcharge
      });
    }

    let scheduledWindowSurcharge = 0;
    if (scheduledSlot) {
      scheduledWindowSurcharge = env.scheduledWindowSurcharge;
      feeBreakdown.push({
        code: "SCHEDULED_WINDOW",
        label: "Reserved delivery window",
        amount: scheduledWindowSurcharge
      });
    }

    let smallOrderSurcharge = 0;
    if (subtotal > 0 && subtotal < env.smallOrderThreshold) {
      smallOrderSurcharge = env.smallOrderSurcharge;
      feeBreakdown.push({
        code: "SMALL_ORDER",
        label: `Small basket surcharge below PHP ${env.smallOrderThreshold}`,
        amount: smallOrderSurcharge
      });
    }

    let discount = 0;
    if (subtotal >= env.freeDeliveryThreshold) {
      discount = Math.min(
        distanceFee + urgencySurcharge + scheduledWindowSurcharge + smallOrderSurcharge,
        distanceFee
      );
      feeBreakdown.push({
        code: "FREE_DELIVERY_THRESHOLD",
        label: `Large basket delivery discount at PHP ${env.freeDeliveryThreshold}`,
        amount: -discount
      });
    }

    const totalDeliveryFee = roundCurrency(
      distanceFee + urgencySurcharge + scheduledWindowSurcharge + smallOrderSurcharge - discount
    );

    return {
      ...geoResult,
      deliveryFee: totalDeliveryFee,
      feeBreakdown,
      scheduling
    };
  }
}
