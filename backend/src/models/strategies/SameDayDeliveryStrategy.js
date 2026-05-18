import { DeliveryStrategy } from "./DeliveryStrategy.js";
import { combineStoreDateAndTime } from "../../utils/storeTime.js";

export class SameDayDeliveryStrategy extends DeliveryStrategy {
  constructor() {
    super("SAME_DAY");
  }

  createDeliveryRecord({ orderId, address, deliverySlot }) {
    const estimatedAt = deliverySlot
      ? combineStoreDateAndTime(deliverySlot.date, deliverySlot.endTime)
      : new Date(Date.now() + 4 * 60 * 60 * 1000);

    return {
      orderId,
      address,
      status: "SCHEDULED",
      type: this.type,
      estimatedAt
    };
  }
}
