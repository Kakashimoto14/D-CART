import { AppError } from "../utils/AppError.js";

export class Product {
  #stock;

  constructor({ id, name, description, image, price, stock, unit, weight, barcode, categoryId, category }) {
    this.id = id;
    this.name = name;
    this.description = description || "";
    this.image = image || "";
    this.price = Number(price);
    this.unit = unit || "pc";
    this.weight = weight != null ? Number(weight) : null;
    this.barcode = barcode || null;
    this.categoryId = categoryId;
    this.category = category || null;
    this.#stock = Number(stock);
  }

  get stock() {
    return this.#stock;
  }

  reserveStock(quantity) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    if (quantity > this.#stock) {
      throw new AppError(`Insufficient stock for ${this.name}.`, 400);
    }

    this.#stock -= quantity;
    return this.#stock;
  }

  restock(quantity) {
    if (quantity <= 0) {
      throw new AppError("Restock quantity must be greater than zero.", 400);
    }

    this.#stock += quantity;
    return this.#stock;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      image: this.image,
      price: this.price,
      stock: this.#stock,
      unit: this.unit,
      weight: this.weight,
      barcode: this.barcode,
      categoryId: this.categoryId,
      category: this.category
    };
  }
}
