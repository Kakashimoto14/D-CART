export class DeliveryStrategy {
  constructor(type) {
    if (new.target === DeliveryStrategy) {
      throw new Error("DeliveryStrategy is abstract and must be extended.");
    }

    this.type = type;
  }

  createDeliveryRecord() {
    throw new Error("createDeliveryRecord must be implemented by subclasses.");
  }
}
