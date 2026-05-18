import { CartService } from "../services/cart.service.js";

const cartService = new CartService();

export const getCart = async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  res.status(200).json({ cart });
};

export const addCartItem = async (req, res) => {
  const cart = await cartService.addItem(req.user.id, req.body);
  res.status(200).json({ cart });
};

export const updateCartItem = async (req, res) => {
  const cart = await cartService.updateItemQuantity(
    req.user.id,
    Number(req.params.productId),
    req.body.quantity
  );

  res.status(200).json({ cart });
};

export const removeCartItem = async (req, res) => {
  const cart = await cartService.removeItem(req.user.id, Number(req.params.productId));
  res.status(200).json({ cart });
};

export const clearCart = async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  res.status(200).json({ cart });
};
