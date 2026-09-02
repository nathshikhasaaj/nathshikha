import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import SectionTitle from '../../components/common/SectionTitle';
import './Cart.css';

const FREE_SHIPPING_THRESHOLD = 2999;

export default function Cart() {
  const { cart, updateCartQty, removeFromCart, subtotal, shipping, total } = useCart();
  const { t } = useLanguage();

  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeShippingLeft = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <main className="page cartPageMain">
      <SectionTitle
        title={t('your_bag', 'Your Bag')}
        sub={t('your_bag_sub', 'Your handcrafted treasures are almost home.')}
      />

      {cart.length > 0 ? (
        <div className="cartLayout">
          <div className="cartList">
            {/* Free Shipping Progress Indicator */}
            <div className="freeShippingBarCard">
              <div className="freeShippingTextRow">
                {isFreeShipping ? (
                  <span className="freeShippingUnlocked">
                    <CheckCircle2 size={15} color="#2e7d32" />
                    <strong>{t('free_shipping_unlocked', "You've unlocked FREE Pan-India Delivery! 🎉")}</strong>
                  </span>
                ) : (
                  <span className="freeShippingNeeded">
                    <Sparkles size={15} color="var(--gold, #b8860b)" />
                    <span>
                      Add <strong>{money(freeShippingLeft)}</strong> more for <strong>FREE Delivery</strong>
                    </span>
                  </span>
                )}
              </div>
              <div className="freeShippingTrack">
                <div
                  className={`freeShippingProgress ${isFreeShipping ? 'freeShippingProgress--full' : ''}`}
                  style={{ width: `${freeShippingProgress}%` }}
                ></div>
              </div>
            </div>

            {cart.map((p) => {
              const selectedParams =
                (p.selectedParameters && typeof p.selectedParameters === 'object' ? p.selectedParameters : null) ||
                (p.selectedOptions && typeof p.selectedOptions === 'object' ? p.selectedOptions : {});
              const hasOptions = Object.keys(selectedParams).length > 0;

              return (
                <div className="cartItem" key={itemKey}>
                  <Link to={`/product/${p.id}`} className="cartItemImgLink">
                    <img src={p.img || '/assets/thushi.jpg'} alt={p.name} />
                  </Link>
                  <div className="cartItemDetails">
                    <div>
                      <Link to={`/product/${p.id}`}>
                        <h3>{p.name}</h3>
                      </Link>

                      {/* Dynamic Selected Parameters Badges */}
                      {hasOptions && (
                        <div className="cartItemOptionsRow">
                          {Object.entries(selectedParams).map(([optName, optVal]) => (
                            <span key={optName} className="cartOptionPill">
                              <span className="cartOptionLabel">{optName}:</span>
                              <b>{optVal}</b>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="cartItemPriceRow">
                        <strong className="cartItemUnitPrice">{money(p.price)}</strong>
                        {p.qty > 1 && (
                          <span className="cartItemTotalSub">({money(p.price * p.qty)})</span>
                        )}
                      </div>
                    </div>

                    <div className="qty">
                      <button
                        type="button"
                        onClick={() => updateCartQty(itemKey, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <b>{p.qty}</b>
                      <button
                        type="button"
                        onClick={() => updateCartQty(itemKey, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        className="trash"
                        type="button"
                        onClick={() => removeFromCart(itemKey)}
                        aria-label={`Remove ${p.name} from bag`}
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                {isFreeShipping ? (
                  <b style={{ color: '#2e7d32' }}>FREE</b>
                ) : (
                  t('calculated_on_checkout', 'Calculated on checkout')
                )}
              </span>
            </p>
            <hr />
            <p className="total">
              <span>{t('total', 'Total')}</span>
              <b>{money(subtotal)}</b>
            </p>
            <Link className="goldBtn cartCheckoutBtn" to="/checkout">
              <span>{t('proceed_checkout', 'PROCEED TO CHECKOUT')}</span>
              <ArrowRight size={15} />
            </Link>
          </aside>

          {/* Sticky Mobile Checkout Bar for Thumb-Reach UX */}
          <div className="mobileStickyCartBar">
            <div className="mobileStickyCartPrice">
              <small>{t('total', 'Total')}</small>
              <strong>{money(subtotal)}</strong>
            </div>
            <Link className="mobileStickyCheckoutBtn" to="/checkout">
              <span>{t('checkout', 'CHECKOUT')}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="empty">
          <ShoppingBag size={48} color="var(--gold, #b8860b)" style={{ marginBottom: 12 }} />
          <h2>{t('bag_empty', 'Your bag is empty')}</h2>
          <p>{t('bag_empty_sub', 'Discover handcrafted Maharashtrian jewellery designed for every auspicious moment.')}</p>
          <Link className="goldBtn" to="/shop" style={{ marginTop: 16 }}>
            {t('start_shopping', 'EXPLORE COLLECTIONS')}
          </Link>
        </div>
      )}
    </main>
  );
}

