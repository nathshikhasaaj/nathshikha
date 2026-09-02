import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from './ToastContext';
import { getCartParameterKey, formatSelectedParametersText } from '../utils/parameterHelpers';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nw-cart') || '[]');
      return Array.isArray(saved)
        ? saved
            .filter((item) => item && typeof item.id === 'string' && item.id.length > 5)
            .map((item) => {
              const selectedParams =
                (item.selectedParameters && typeof item.selectedParameters === 'object'
                  ? item.selectedParameters
                  : null) ||
                (item.selectedOptions && typeof item.selectedOptions === 'object'
                  ? item.selectedOptions
                  : {});
              return {
                ...item,
                selectedParameters: selectedParams,
                selectedOptions: selectedParams,
                cartKey: item.cartKey || getCartParameterKey(item.id, selectedParams)
              };
            })
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

  const addToCart = useCallback((product, qty = 1, options = {}) => {
    if (!product) return;
    const pId = String(product.id || product._id);
    const selectedParameters =
      (options?.selectedParameters && typeof options.selectedParameters === 'object'
        ? options.selectedParameters
        : null) ||
      (options?.selectedOptions && typeof options.selectedOptions === 'object'
        ? options.selectedOptions
        : {});
    const itemCartKey = getCartParameterKey(pId, selectedParameters);

    let isExisting = false;
    let newQty = qty;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => (item.cartKey || getCartParameterKey(item.id, item.selectedParameters || item.selectedOptions)) === itemCartKey
      );

      if (existingIndex !== -1) {
        isExisting = true;
        const existing = prev[existingIndex];
        newQty = existing.qty + qty;
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: newQty } : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          id: pId,
          cartKey: itemCartKey,
          selectedParameters,
          selectedOptions: selectedParameters,
          img: product.img || (Array.isArray(product.images) ? product.images[0] : '/assets/thushi.jpg'),
          qty
        }
      ];
    });

    if (options?.showToast !== false) {
      const productImg = product.img || (Array.isArray(product.images) && product.images[0]) || '/assets/thushi.jpg';
      const optionsSubtext = formatSelectedParametersText(selectedParameters);

      setToast({
        type: 'success',
        product: {
          id: pId,
          name: product.name,
          img: productImg,
          price: product.price
        },
        message: isExisting
          ? `Updated quantity in bag (${newQty})${optionsSubtext ? ` · ${optionsSubtext}` : ''}`
          : qty > 1
          ? `${qty} items added to bag${optionsSubtext ? ` (${optionsSubtext})` : ''}`
          : `✓ Added to bag${optionsSubtext ? ` (${optionsSubtext})` : ''}`,
        action: {
          label: 'VIEW BAG',
          to: '/cart'
        },
        duration: 4000
      });
    }

    return { success: true, isExisting, qty: newQty };
  }, [setToast]);

  const updateCartQty = useCallback((cartKeyOrId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemKey = item.cartKey || getCartParameterKey(item.id, item.selectedParameters || item.selectedOptions);
        const match = itemKey === String(cartKeyOrId) || String(item.id) === String(cartKeyOrId);
        return match ? { ...item, qty: Math.max(1, item.qty + delta) } : item;
      })
    );
  }, []);

  const removeFromCart = useCallback((cartKeyOrId) => {
    setCart((prev) => {
      const item = prev.find((x) => {
        const itemKey = x.cartKey || getCartParameterKey(x.id, x.selectedParameters || x.selectedOptions);
        return itemKey === String(cartKeyOrId) || String(x.id) === String(cartKeyOrId);
      });
      if (item) {
        const optionsSubtext = formatSelectedParametersText(item.selectedParameters || item.selectedOptions);
        setToast({
          type: 'info',
          message: `${item.name}${optionsSubtext ? ` (${optionsSubtext})` : ''} removed from bag`,
          duration: 3000
        });
      }
      return prev.filter((x) => {
        const itemKey = x.cartKey || getCartParameterKey(x.id, x.selectedParameters || x.selectedOptions);
        return itemKey !== String(cartKeyOrId) && String(x.id) !== String(cartKeyOrId);
      });
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

