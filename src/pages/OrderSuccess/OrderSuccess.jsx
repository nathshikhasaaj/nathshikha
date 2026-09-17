import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, CheckCircle2, ShoppingBag, Package, Instagram, Facebook, Sparkles } from 'lucide-react';
import { money } from '../../utils/formatters';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import CheckoutSteps from '../../components/common/CheckoutSteps';
import './OrderSuccess.css';

export default function OrderSuccess() {
  const { orderNo } = useParams();
  const saved = JSON.parse(localStorage.getItem('nw-last-order') || 'null');
  const order = saved?.order?.order_no === orderNo ? saved.order : null;

  const isVerified = order?.payment_status === 'verified' || order?.payment_status === 'paid';
  const custom = order?.customization;
  const hasCustomization = Boolean(custom?.requested || custom?.details || custom?.referenceImage || custom?.reference_image);

  return (
    <main className="page successPage">
      <Breadcrumbs
        items={[
          { label: 'Orders', path: '/orders' },
          { label: `Order #${orderNo}` }
        ]}
        showBack={false}
      />

      <CheckoutSteps currentStep={3} />

      <div className="successCard">
        <div className="successIcon">🎉</div>
        <span className="eyebrow">ORDER RECEIVED</span>
        <h1>Order Placed Successfully</h1>
        <p>
          Thank you for choosing Nathshikha. Your order <b>#{orderNo}</b> has been placed.
        </p>

        <div className="successSummary">
          {order && (
            <>
              <span>
                Total <b>{money(order.total)}</b>
              </span>
              {order.coupon_code && (
                <span>
                  Coupon <b>{order.coupon_code} (-{money(order.coupon_discount || 0)})</b>
                </span>
              )}
              <span>
                Payment{' '}
                <b>
                  {isVerified
                    ? 'UPI · Verified'
                    : 'UPI · Verification Pending'}
                </b>
              </span>
              <span>
                Status <b>{isVerified ? 'Confirmed' : 'Order Placed'}</b>
              </span>
            </>
          )}
        </div>

        {/* Customization Request Summary Banner if Present */}
        {hasCustomization && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fffdf8 0%, #fffbf2 100%)',
              border: '1.5px solid #d4af37',
              borderRadius: 8,
              padding: '12px 16px',
              margin: '14px 0',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: '0 2px 6px rgba(212, 175, 55, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--maroon, #5b1420)', fontWeight: 700, fontSize: 13 }}>
              <Sparkles size={15} color="#d4af37" />
              <span>🎨 Jewellery Customization Request Received</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: '#4a3d36', lineHeight: 1.45 }}>
              Your customization instructions have been received. Our team will review your requirement during crafting.
            </p>
            {custom.details && (
              <blockquote
                style={{
                  margin: '4px 0 0',
                  padding: '6px 10px',
                  background: '#ffffff',
                  borderLeft: '3px solid #d4af37',
                  borderRadius: '0 4px 4px 0',
                  fontSize: 12,
                  color: '#2b1f1a',
                  fontStyle: 'italic'
                }}
              >
                "{custom.details}"
              </blockquote>
            )}
          </div>
        )}

        {/* Ordered Items Breakdown */}
        {order?.items && order.items.length > 0 && (
          <div className="successPageItemsCard">
            <h3 className="successPageItemsTitle">Ordered Jewellery ({order.items.length})</h3>
            <div className="successPageItemsList">
              {order.items.map((item, idx) => {
                const params =
                  (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
                  (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});
                const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '');

                return (
                  <div key={idx} className="successPageItemRow">
                    <img src={item.img || '/assets/thushi.jpg'} alt={item.name} className="successPageItemImg" />
                    <div className="successPageItemDetails">
                      <b>{item.name}</b>
                      {entries.length > 0 && (
                        <div className="successPageItemParams">
                          {entries.map(([pName, pVal]) => {
                            const isCustom = String(pName).toLowerCase().includes('name') ||
                              String(pName).toLowerCase().includes('custom') ||
                              String(pName).toLowerCase().includes('text') ||
                              String(pName).toLowerCase().includes('engrav');
                            return (
                              <span key={pName} className={isCustom ? 'successCustomPill' : 'successStandardPill'}>
                                {isCustom ? '✍️ ' : ''}{pName}: <b>{pVal}</b>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <small>Qty: {item.qty} · {money(item.price)} each</small>
                    </div>
                    <b className="successPageItemTotal">{money((item.price || 0) * (item.qty || 1))}</b>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="successStatusNotice">
          {isVerified ? (
            <div className="statusNoticeVerified">
              <CheckCircle2 size={18} />
              <div>
                <b>Order Confirmed ✓</b>
                <p>Your payment has been verified and your order is confirmed.</p>
              </div>
            </div>
          ) : (
            <div className="statusNoticePending">
              <Clock size={18} />
              <div>
                <b>Payment Verification Pending</b>
                <p>
                  Payment verification is pending from our side. Once we verify your payment, your order will be confirmed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="successActions">
          <Link className="goldBtn" to="/shop">
            <ShoppingBag size={15} /> CONTINUE SHOPPING
          </Link>
          <Link className="outlineBtn" to="/orders">
            <Package size={15} /> VIEW MY ORDERS
          </Link>
          <a
            className="outlineBtn"
            style={{
              borderColor: '#25d366',
              color: '#128c7e',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
            href={`https://wa.me/919699668421?text=${encodeURIComponent(
              `Hi Nathshikha Studio, I have placed Order #${orderNo} and need assistance.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            CHAT ON WHATSAPP
          </a>
          <a
            className="outlineBtn"
            style={{
              borderColor: '#dc2743',
              color: '#bc1888',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={15} /> INSTAGRAM
          </a>
          <a
            className="outlineBtn"
            style={{
              borderColor: '#1877f2',
              color: '#1877f2',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
            href="https://www.facebook.com/Nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook size={15} /> FACEBOOK
          </a>
        </div>
      </div>
    </main>
  );
}
