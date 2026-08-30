import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nw-wishlist') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const { setToast } = useToast();

  useEffect(() => {
    localStorage.setItem('nw-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('nw-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Clean stale / removed items when catalog refreshes
  const syncWithCatalog = useCallback((catalogProducts = []) => {
    if (!Array.isArray(catalogProducts) || !catalogProducts.length) return;
    const validIds = new Set(catalogProducts.map((p) => String(p.id)));

    setCart((prev) => {
      const cleaned = prev.filter((item) => validIds.has(String(item.id)));
      if (cleaned.length !== prev.length) {
        localStorage.setItem('nw-cart', JSON.stringify(cleaned));
      }
      return cleaned;
    });
  }, []);

  const addToCart = useCallback((product, qty = 1, options = { showToast: true }) => {
    if (!product) return;
    const pId = String(product.id || product._id);
    let isExisting = false;
    let newQty = qty;

    setCart((prev) => {
      const existing = prev.find((item) => String(item.id) === pId);
      if (existing) {
        isExisting = true;
        newQty = existing.qty + qty;
        return prev.map((item) =>
          String(item.id) === pId ? { ...item, qty: newQty } : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          id: pId,
          img: product.img || (Array.isArray(product.images) ? product.images[0] : '/assets/thushi.jpg'),
          qty
        }
      ];
    });

    if (options?.showToast !== false) {
      const productImg = product.img || (Array.isArray(product.images) && product.images[0]) || '/assets/thushi.jpg';
      setToast({
        type: 'success',
        product: {
          id: pId,
          name: product.name,
          img: productImg,
          price: product.price
        },
        message: isExisting
          ? `Updated quantity in bag (${newQty})`
          : qty > 1
          ? `${qty} items added to bag`
          : '✓ Added to your bag',
        action: {
          label: 'VIEW BAG',
          to: '/cart'
        },
        duration: 4000
      });
    }

    return { success: true, isExisting, qty: newQty };
  }, [setToast]);

  const updateCartQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => {
      const item = prev.find((x) => String(x.id) === String(id));
      if (item) {
        setToast({
          type: 'info',
          message: `${item.name} removed from bag`,
          duration: 3000
        });
      }
      return prev.filter((x) => String(x.id) !== String(id));
    });
  }, [setToast]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Wishlist functionality
  const isInWishlist = useCallback(
    (id) => wishlist.some((item) => String(item.id || item._id) === String(id)),
    [wishlist]
  );

  const toggleWishlist = useCallback((product) => {
    if (!product) return false;
    const pId = String(product.id || product._id);

    setWishlist((prev) => {
      const exists = prev.some((item) => String(item.id || item._id) === pId);
      if (exists) {
        setToast({
          type: 'info',
          message: `${product.name} removed from Wishlist`,
          duration: 3000
        });
        return prev.filter((item) => String(item.id || item._id) !== pId);
      } else {
        setToast({
          type: 'success',
          product: {
            id: pId,
            name: product.name,
            img: product.img || (Array.isArray(product.images) && product.images[0]) || '/assets/thushi.jpg'
          },
          message: 'Saved to your Wishlist ♥',
          action: {
            label: 'VIEW BAG',
            to: '/cart'
          },
          duration: 3500
        });
        return [...prev, { ...product, id: pId }];
      }
    });
  }, [setToast]);

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
        total,
        wishlist,
        toggleWishlist,
        isInWishlist
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

