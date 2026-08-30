import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import SectionTitle from '../../components/common/SectionTitle';
import './Cart.css';

export default function Cart() {
  const { cart, updateCartQty, removeFromCart, subtotal, shipping, total } = useCart();
  const { t } = useLanguage();

  return (
    <main className="page">
      <SectionTitle
        title={t('your_bag', 'Your Bag')}
        sub={t('your_bag_sub', 'Your handcrafted treasures are almost home.')}
      />

      {cart.length > 0 ? (
        <div className="cartLayout">
          <div className="cartList">
            {cart.map((p) => (
              <div className="cartItem" key={p.id}>
                <img src={p.img} alt={p.name} />
                <div>
                  <div>
                    <h3>{p.name}</h3>
                    <strong>{money(p.price)}</strong>
                  </div>
                  <div className="qty">
                    <button
                      type="button"
                      onClick={() => updateCartQty(p.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus />
                    </button>
                    <b>{p.qty}</b>
                    <button
                      type="button"
                      onClick={() => updateCartQty(p.id, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus />
                    </button>
                    <button
                      className="trash"
                      type="button"
                      onClick={() => removeFromCart(p.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="summary">
            <h3>{t('order_summary', 'Order Summary')}</h3>
            <p>
              <span>{t('subtotal', 'Subtotal')}</span>
              <b>{money(subtotal)}</b>
            </p>
            <p>
              <span>{t('shipping', 'Shipping')}</span>
              <span className="shippingCalculatedText">
                {t('calculated_on_checkout', 'Calculated on checkout')}
              </span>
            </p>
            <hr />
            <p className="total">
              <span>{t('total', 'Total')}</span>
              <b>{money(subtotal)}</b>
            </p>
            <Link className="goldBtn" to="/checkout">
              {t('proceed_checkout', 'PROCEED TO CHECKOUT')}
            </Link>
          </aside>
        </div>
      ) : (
        <div className="empty">
          <ShoppingBag />
          <p>{t('bag_empty', 'Your bag is empty.')}</p>
          <Link className="goldBtn" to="/shop">
            {t('start_shopping', 'START SHOPPING')}
          </Link>
        </div>
      )}
    </main>
  );
}
