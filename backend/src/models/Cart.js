export class Cart {
  #items;

  constructor({ id, userId, items = [] }) {
    this.id = id;
    this.userId = userId;
    this.#items = [...items];
  }

  get items() {
    return [...this.#items];
  }

  addItem(item) {
    const existing = this.#items.find((entry) => entry.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
      return existing;
    }

    this.#items.push(item);
    return item;
  }

  updateItemQuantity(productId, quantity) {
    this.#items = this.#items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    );
  }

  removeItem(productId) {
    this.#items = this.#items.filter((item) => item.productId !== productId);
  }

  calculateSubtotal() {
    return this.#items.reduce(
      (total, item) => total + Number(item.product.price) * Number(item.quantity),
      0
    );
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      subtotal: this.calculateSubtotal()
    };
  }
}
