import React, { createContext, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { cartApi } from "../api/cartApi";
import { orderApi } from "../api/orderApi";
import { useAuth } from "../hooks/useAuth";

export const CustomerContext = createContext(null);

const ACTIVE_ORDER_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY"
]);

const LAST_ORDER_KEY = "dcart_latest_order_id";

const buildEmptyCart = () => ({
  id: null,
  userId: null,
  items: [],
  subtotal: 0
});

const cloneCart = (cart) =>
  cart
    ? {
        ...cart,
        items: cart.items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            category: item.product.category ? { ...item.product.category } : null
          }
        }))
      }
    : null;

const resolveCartTotals = (cart) => ({
  ...cart,
  subtotal: cart.items.reduce(
    (total, item) => total + Number(item.product.price || 0) * Number(item.quantity || 0),
    0
  )
});

const selectFeaturedOrder = (orders, preferredOrderId) => {
  const latestPreferred = preferredOrderId
    ? orders.find((order) => Number(order.id) === Number(preferredOrderId))
    : null;

  if (latestPreferred && ACTIVE_ORDER_STATUSES.has(latestPreferred.status)) {
    return latestPreferred;
  }

  return orders.find((order) => ACTIVE_ORDER_STATUSES.has(order.status)) || null;
};

export function CustomerProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(buildEmptyCart);
  const [isCartReady, setIsCartReady] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isOrdersReady, setIsOrdersReady] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = "success") => {
    setToast({
      id: Date.now(),
      message,
      tone
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const refreshCart = useCallback(async () => {
    const nextCart = await cartApi.get();

    startTransition(() => {
      setCart(nextCart);
      setIsCartReady(true);
    });

    return nextCart;
  }, []);

  const refreshOrders = useCallback(async () => {
    const result = await orderApi.list({ page: 1, limit: 6 });
    const preferredOrderId = window.sessionStorage.getItem(LAST_ORDER_KEY);
    const nextActiveOrder = selectFeaturedOrder(result.orders || [], preferredOrderId);

    startTransition(() => {
      setActiveOrder(nextActiveOrder);
      setIsOrdersReady(true);
    });

    return nextActiveOrder;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      setCart(buildEmptyCart());
      setIsCartReady(false);
      setActiveOrder(null);
      setIsOrdersReady(false);
      setToast(null);
      return;
    }

    let isMounted = true;

    Promise.allSettled([refreshCart(), refreshOrders()]).then(() => {
      if (!isMounted) {
        return;
      }

      setIsCartReady(true);
      setIsOrdersReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, refreshCart, refreshOrders, user?.role]);

  const mutateCart = useCallback(async (request, optimisticCart = null) => {
    const previousCart = cloneCart(cart);

    if (optimisticCart) {
      setCart(resolveCartTotals(optimisticCart));
    }

    try {
      const nextCart = await request();
      setCart(nextCart);
      return nextCart;
    } catch (error) {
      if (previousCart) {
        setCart(previousCart);
      }
      throw error;
    }
  }, [cart]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    const currentCart = cloneCart(cart) || buildEmptyCart();
    const existingItem = currentCart.items.find((item) => item.productId === product.id);
    const nextQuantity = Number(existingItem?.quantity || 0) + quantity;

    let optimisticCart = null;
    if (product.stock >= nextQuantity) {
      optimisticCart = cloneCart(currentCart);

      if (existingItem) {
        optimisticCart.items = optimisticCart.items.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQuantity } : item
        );
      } else {
        optimisticCart.items.unshift({
          id: `temp-${product.id}`,
          productId: product.id,
          quantity,
          product: {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            stock: product.stock,
            category: product.category || null,
            image: product.image || null,
            unit: product.unit || null
          }
        });
      }
    }

    const nextCart = await mutateCart(
      () =>
        cartApi.addItem({
          productId: product.id,
          quantity
        }),
      optimisticCart
    );

    showToast(existingItem ? "Cart updated" : "Added to cart");
    return nextCart;
  }, [cart, mutateCart, showToast]);

  const updateCartItem = useCallback(async (productId, quantity) => {
    const currentCart = cloneCart(cart) || buildEmptyCart();
    const optimisticCart = cloneCart(currentCart);

    if (optimisticCart) {
      optimisticCart.items = optimisticCart.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );
    }

    const nextCart = await mutateCart(
      () => cartApi.updateItem(productId, { quantity }),
      optimisticCart
    );

    return nextCart;
  }, [cart, mutateCart]);

  const removeCartItem = useCallback(async (productId) => {
    const currentCart = cloneCart(cart) || buildEmptyCart();
    const optimisticCart = cloneCart(currentCart);

    if (optimisticCart) {
      optimisticCart.items = optimisticCart.items.filter((item) => item.productId !== productId);
    }

    const nextCart = await mutateCart(() => cartApi.removeItem(productId), optimisticCart);
    showToast("Item removed", "neutral");
    return nextCart;
  }, [cart, mutateCart, showToast]);

  const clearCart = useCallback(async () => {
    const nextCart = await mutateCart(() => cartApi.clear(), buildEmptyCart());
    showToast("Cart cleared", "neutral");
    return nextCart;
  }, [mutateCart, showToast]);

  const registerOrder = useCallback((order) => {
    window.sessionStorage.setItem(LAST_ORDER_KEY, String(order.id));
    setActiveOrder(order);
    setCart(buildEmptyCart());
  }, []);

  const cartCount = useMemo(
    () => cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    [cart.items]
  );

  const value = useMemo(() => ({
    cart,
    cartCount,
    cartSubtotal: Number(cart.subtotal || 0),
    isCartReady,
    activeOrder,
    isOrdersReady,
    toast,
    showToast,
    refreshCart,
    refreshOrders,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    registerOrder
  }), [
    activeOrder,
    addToCart,
    cart,
    cartCount,
    clearCart,
    isCartReady,
    isOrdersReady,
    refreshCart,
    refreshOrders,
    registerOrder,
    removeCartItem,
    showToast,
    toast,
    updateCartItem
  ]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}
