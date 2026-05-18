import { prisma } from "../config/prisma.js";
import { Cart } from "../models/Cart.js";
import { AppError } from "../utils/AppError.js";

export class CartService {
  async getOrCreateCart(userId) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    return cart;
  }

  mapCart(cart) {
    const entity = new Cart({
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.price),
          stock: item.product.stock,
          category: item.product.category
        }
      }))
    });

    return entity.toJSON();
  }

  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    return this.mapCart(cart);
  }

  async addItem(userId, payload) {
    const cartRecord = await this.getOrCreateCart(userId);

    const product = await prisma.product.findUnique({
      where: { id: payload.productId }
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    // Use the Cart model for in-memory cart logic
    const cartEntity = new Cart({
      id: cartRecord.id,
      userId: cartRecord.userId,
      items: cartRecord.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: item.product
      }))
    });

    const updatedItem = cartEntity.addItem({
      productId: payload.productId,
      quantity: payload.quantity,
      product
    });

    // Validate stock against the merged quantity
    if (product.stock < updatedItem.quantity) {
      throw new AppError("Requested quantity exceeds available stock.", 400);
    }

    // Persist via Prisma
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cartRecord.id,
          productId: payload.productId
        }
      },
      update: {
        quantity: updatedItem.quantity
      },
      create: {
        cartId: cartRecord.id,
        productId: payload.productId,
        quantity: updatedItem.quantity
      }
    });

    return this.getCart(userId);
  }

  async updateItemQuantity(userId, productId, quantity) {
    const cart = await this.getOrCreateCart(userId);

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      },
      include: {
        product: true
      }
    });

    if (!item) {
      throw new AppError("Cart item not found.", 404);
    }

    if (item.product.stock < quantity) {
      throw new AppError("Requested quantity exceeds available stock.", 400);
    }

    await prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      },
      data: { quantity }
    });

    return this.getCart(userId);
  }

  async removeItem(userId, productId) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId
      }
    });

    return this.getCart(userId);
  }

  async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    return this.getCart(userId);
  }
}
