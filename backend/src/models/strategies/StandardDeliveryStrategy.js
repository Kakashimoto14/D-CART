import { DeliveryStrategy } from "./DeliveryStrategy.js";
import { env } from "../../config/env.js";
import { addStoreDays, combineStoreDateAndTime } from "../../utils/storeTime.js";

export class StandardDeliveryStrategy extends DeliveryStrategy {
  constructor() {
    super("STANDARD");
  }

  createDeliveryRecord({ orderId, address, deliverySlot }) {
    const estimatedAt = deliverySlot
      ? combineStoreDateAndTime(deliverySlot.date, deliverySlot.endTime)
      : combineStoreDateAndTime(addStoreDays(new Date(), env.standardLeadDays), "11:00");

    return {
      orderId,
      address,
      status: "SCHEDULED",
      type: this.type,
      estimatedAt
    };
  }
}
