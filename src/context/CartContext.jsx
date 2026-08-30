import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nw-cart') || '[]');
      return Array.isArray(saved)
        ? saved.filter((item) => item && typeof item.id === 'string' && item.id.length > 5)
        : [];
    } catch {
      return [];
    }
  });

  const { setToast } = useToast();

  useEffect(() => {
    localStorage.setItem('nw-cart', JSON.stringify(cart));
  }, [cart]);

  // Clean stale / removed items when catalog refreshes
  const syncWithCatalog = (catalogProducts = []) => {
    if (!Array.isArray(catalogProducts) || !catalogProducts.length) return;
    const validIds = new Set(catalogProducts.map((p) => String(p.id)));

    setCart((prev) => {
      const cleaned = prev.filter((item) => validIds.has(String(item.id)));
      if (cleaned.length !== prev.length) {
        localStorage.setItem('nw-cart', JSON.stringify(cleaned));
      }
      return cleaned;
    });
  };

  const addToCart = (product, qty = 1) => {
    const pId = String(product.id || product._id);
    setCart((prev) => {
      const existing = prev.find((item) => String(item.id) === pId);
      if (existing) {
        return prev.map((item) =>
          String(item.id) === pId ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { ...product, id: pId, qty }];
    });
    setToast(`${product.name} added to bag`);
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );
  const shipping = subtotal >= 2999 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        syncWithCatalog,
        cartCount,
        subtotal,
        shipping,
        total
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
