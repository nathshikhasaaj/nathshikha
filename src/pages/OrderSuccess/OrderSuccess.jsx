import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, CheckCircle2, ShoppingBag, Package, Instagram, Facebook } from 'lucide-react';
import { money } from '../../utils/formatters';
import './OrderSuccess.css';

export default function OrderSuccess() {
  const { orderNo } = useParams();
  const saved = JSON.parse(localStorage.getItem('nw-last-order') || 'null');
  const order = saved?.order?.order_no === orderNo ? saved.order : null;

  const isVerified = order?.payment_status === 'verified' || order?.payment_status === 'paid';

  return (
    <main className="page successPage">
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
