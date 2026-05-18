import { prisma } from "../config/prisma.js";
import { validateDeliveryLocation } from "../utils/geofencing.js";
import { AppError } from "../utils/AppError.js";
import { DeliveryPricingService } from "./deliveryPricing.service.js";

const deliveryPricingService = new DeliveryPricingService();

export class GeofencingService {
  /**
   * Get the store configuration (location, radius, fees).
   */
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

  /**
   * Validate a customer's delivery location against the store's radius.
   */
  async validateLocation(latitude, longitude, accuracyMeters) {
    const config = await this.getStoreConfig();

    const result = validateDeliveryLocation(
      latitude,
      longitude,
      config.latitude,
      config.longitude,
      config.deliveryRadius,
      config.baseFee,
      config.perKmFee,
      accuracyMeters
    );

    return {
      ...result,
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
  }

  async quoteDelivery(options) {
    return deliveryPricingService.quote(options);
  }

  /**
   * Get store zone info for map rendering.
   */
  async getStoreZone() {
    const config = await this.getStoreConfig();

    return {
      storeName: config.storeName,
      center: {
        latitude: config.latitude,
        longitude: config.longitude
      },
      deliveryRadiusKm: config.deliveryRadius,
      baseFee: config.baseFee,
      perKmFee: config.perKmFee
    };
  }
}
