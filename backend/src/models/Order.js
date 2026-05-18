export class Order {
  #status;
  #items;

  constructor({ id, userId, total = 0, status = "PENDING", items = [] }) {
    this.id = id;
    this.userId = userId;
    this.total = Number(total);
    this.#status = status;
    this.#items = [...items];
  }

  get status() {
    return this.#status;
  }

  get items() {
    return [...this.#items];
  }

  markStatus(status) {
    this.#status = status;
  }

  calculateTotal() {
    this.total = this.#items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    return this.total;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      total: this.total,
      status: this.#status,
      items: this.items
    };
  }
}
