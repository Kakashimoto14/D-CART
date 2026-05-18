import { AppError } from "../utils/AppError.js";

export class Delivery {
  #address;
  #status;

  constructor({ id, orderId, address, status = "PENDING", type = "SAME_DAY", estimatedAt, strategy }) {
    this.id = id;
    this.orderId = orderId;
    this.type = type;
    this.estimatedAt = estimatedAt || null;
    this.strategy = strategy;
    this.#address = address;
    this.#status = status;
  }

  get address() {
    return this.#address;
  }

  get status() {
    return this.#status;
  }

  schedule(orderId, options = {}) {
    if (!this.strategy) {
      throw new AppError("Delivery strategy is required.", 500);
    }

    const record = this.strategy.createDeliveryRecord({
      orderId,
      address: this.#address,
      ...options
    });

    this.#status = record.status;
    this.type = record.type;
    this.estimatedAt = record.estimatedAt;

    return record;
  }

  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      address: this.#address,
      status: this.#status,
      type: this.type,
      estimatedAt: this.estimatedAt
    };
  }
}
