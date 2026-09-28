import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, CheckCircle2, ShoppingBag, Package, Instagram, Facebook, Sparkles, AlertTriangle, Truck, Gift } from 'lucide-react';
import { money, formatOrderDate } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import { api } from '../../services/api';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import CheckoutSteps from '../../components/common/CheckoutSteps';
import './OrderSuccess.css';

export default function OrderSuccess() {
  const { orderNo } = useParams();
  const saved = JSON.parse(localStorage.getItem('nw-last-order') || 'null');
  const initialOrder = saved?.order?.order_no === orderNo ? saved.order : null;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);

  // If order was not in localStorage (e.g. page refresh or direct link), fetch via tracking API
  useEffect(() => {
    if (!order && orderNo) {
      setLoading(true);
      api('/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNo })
      })
        .then((res) => {
          if (res?.ok && res.order) {
            setOrder(res.order);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch order details for success screen:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [orderNo, order]);

  const isVerified = order?.payment_status === 'verified' || order?.payment_status === 'paid';
  const custom = order?.customization;
  const hasCustomization = Boolean(custom?.requested || custom?.details || custom?.referenceImage || custom?.reference_image);

  const customerName = order?.recipient_name || order?.recipientName || order?.customer_name || order?.customerName || order?.name || 'Valued Customer';
  const rawDate = order?.created_at || order?.createdAt;
  const orderDate = rawDate ? formatOrderDate(rawDate).dateStr : 'Today';
  const totalQty = (order?.items || []).reduce((sum, item) => sum + (item.qty || 1), 0);
  const shippingLabel = order?.shipping_method || order?.shippingMethod || 'Standard Delivery';
  const rawShippingCharge = order?.shipping_charge !== undefined ? order.shipping_charge : (order?.shipping !== undefined ? order.shipping : 0);
  const couponCode = order?.coupon_code || order?.couponCode;
  const couponDiscount = order?.coupon_discount || order?.couponDiscount || 0;
  const hasGiftWrap = Boolean(order?.gift_wrap || order?.giftWrap);
  const giftWrapAmount = order?.gift_wrap_charge || order?.giftWrapCharge || (hasGiftWrap ? 20 : 0);

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
        <span className="eyebrow">ORDER CONFIRMATION</span>
        <h1 className="successHeading">Order Received!</h1>

        {/* PAYMENT VERIFICATION NOTICE CARD */}
        <div className="verificationStatusCard">
          <div className={`statusBadge ${isVerified ? 'badgeVerified' : 'badgePending'}`}>
            <span className="badgeDot">🟡</span>
            <span>{isVerified ? 'Payment Verified' : 'Payment Pending Verification'}</span>
          </div>

          <p className="verificationNoticeText">
            {isVerified
              ? 'Your payment has been verified by our team and your order is confirmed.'
              : 'We have received your order details and are verifying your payment against your name. You will receive an email confirmation once verified.'}
          </p>
        </div>

        {/* ORDER DETAILS SUMMARY SECTION */}
        <div className="orderDetailsCard">
          <div className="orderDetailsHeader">
            <Package size={15} />
            <span>Order Summary</span>
          </div>

          <div className="orderDetailsGrid">
            <div className="orderDetailRow">
              <span className="detailLabel">Order Number:</span>
              <b className="detailVal highlightOrderNo">#{orderNo}</b>
            </div>

            <div className="orderDetailRow">
              <span className="detailLabel">Order Date:</span>
              <b className="detailVal">{orderDate}</b>
            </div>

            <div className="orderDetailRow">
              <span className="detailLabel">Customer Name:</span>
              <b className="detailVal">{customerName}</b>
            </div>

            <div className="orderDetailRow">
              <span className="detailLabel">Quantity:</span>
              <b className="detailVal">{totalQty} {totalQty === 1 ? 'item' : 'items'}</b>
            </div>

            <div className="orderDetailRow">
              <span className="detailLabel">Shipping:</span>
              <b className="detailVal">
                {shippingLabel} {rawShippingCharge === 0 ? '(FREE)' : `(${money(rawShippingCharge)})`}
              </b>
            </div>

            {hasGiftWrap && (
              <div className="orderDetailRow">
                <span className="detailLabel">Gift Wrap:</span>
                <b className="detailVal">{money(giftWrapAmount)}</b>
              </div>
            )}

            {couponCode && (
              <div className="orderDetailRow">
                <span className="detailLabel">Coupon Discount ({couponCode}):</span>
                <b className="detailVal discountVal">-{money(couponDiscount)}</b>
              </div>
            )}

            <div className="orderDetailRow summaryDividerRow">
              <span className="detailLabel totalLabel">Final Total:</span>
              <b className="detailVal grandTotalVal">{money(order?.total || 0)}</b>
            </div>

            <div className="orderDetailRow paymentStatusRow">
              <span className="detailLabel">Payment Status:</span>
              <span className={`paymentStatusBadge ${isVerified ? 'badgeVerified' : 'badgePending'}`}>
                {isVerified ? 'Verified' : 'Payment Pending Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Customization Request Summary Banner if Present */}
        {hasCustomization && (
          <div className="customizationSummaryBanner">
            <div className="customizationBannerHeader">
              <Sparkles size={15} color="#d4af37" />
              <span>🎨 Jewellery Customization Request Received</span>
            </div>
            <p className="customizationBannerText">
              Your customization instructions have been received. Our team will review your requirement during crafting.
            </p>
            {custom.details && (
              <blockquote className="customizationQuote">
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
                const entries = getParameterEntries(params);

                return (
                  <div key={idx} className="successPageItemRow">
                    <img
                      src={item.img || '/assets/thushi.jpg'}
                      alt={item.name}
                      className="successPageItemImg"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/thushi.jpg';
                      }}
                    />
                    <div className="successPageItemDetails">
                      <b>{item.name}</b>
                      {entries.length > 0 && (
                        <div className="successPageItemParams">
                          {entries.map((p) => (
                            <span key={p.name} className={p.isCustom ? 'successCustomPill' : 'successStandardPill'}>
                              {p.isCustom ? '✍️ ' : ''}{p.name}: <b>{p.value}</b>
                            </span>
                          ))}
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

        {/* Action Buttons */}
        <div className="successActions">
          <Link className="goldBtn" to="/shop">
            <ShoppingBag size={15} /> CONTINUE SHOPPING
          </Link>
          <Link className="outlineBtn" to="/orders">
            <Package size={15} /> VIEW MY ORDERS
          </Link>
          <a
            className="outlineBtn whatsappActionBtn"
            href={`https://wa.me/919699668421?text=${encodeURIComponent(
              `Hi Nathshikha Studio, I have placed Order #${orderNo} and need assistance.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            CHAT ON WHATSAPP
          </a>
          <a
            className="outlineBtn instagramActionBtn"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={15} /> INSTAGRAM
          </a>
          <a
            className="outlineBtn facebookActionBtn"
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
