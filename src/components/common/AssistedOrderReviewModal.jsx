import React, { useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  ShoppingBag,
  Gift,
  CreditCard,
  ShieldCheck,
  Edit3,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import './AssistedOrderReviewModal.css';

export default function AssistedOrderReviewModal({
  isOpen,
  onClose,
  order,
  onProceedToPayment,
  onOpenAddressEdit
}) {
  useEffect(() => {
    if (isOpen && order) {
      // Record review view timestamp non-blockingly
      const orderId = order.id || order._id || order.order_no;
      if (orderId) {
        api(`/orders/${encodeURIComponent(orderId)}/mark-reviewed`, {
          method: 'POST',
          body: JSON.stringify({
            guestToken: order.guest_token || order.guestToken,
            email: order.email,
            phone: order.phone
          })
        }).catch(() => {});
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const isGift = Boolean(order.is_gift || order.isGift);
  const isGiftWrap = Boolean(order.gift_wrap || order.giftWrap || Number(order.gift_wrap_charge || order.giftWrapCharge) > 0);
  const giftWrapCharge = isGiftWrap ? (order.gift_wrap_charge || order.giftWrapCharge || 20) : 0;
  const note = order.handwritten_note || order.handwrittenNote;
  const isShipped = ['shipped', 'delivered', 'cancelled'].includes(order.order_status || order.orderStatus);

  const subtotal = order.subtotal || items.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);
  const couponDiscount = order.coupon_discount || order.couponDiscount || 0;
  const shippingCharge = order.shipping_charge !== undefined ? order.shipping_charge : (order.shipping !== undefined ? order.shipping : 0);
  const grandTotal = order.total || Math.max(0, subtotal - couponDiscount) + shippingCharge + giftWrapCharge;

  return (
    <div className="assistedReviewOverlay" onClick={onClose}>
      <div
        className="assistedReviewContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="assistedReviewHeader">
          <div className="assistedReviewHeaderLeft">
            <div className="reviewBadgeIcon">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>Review Updated Order</h3>
              <span>ORDER #{order.order_no || order.orderNo} · Prepared by Nathshikha Team</span>
            </div>
          </div>
          <button
            type="button"
            className="assistedReviewCloseBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="assistedReviewBody">
          {/* Notice Banner */}
          <div className="assistedReviewNoticeBanner">
            <ShieldCheck size={18} color="#15803d" />
            <div>
              <strong>Order Details Updated by Nathshikha Team</strong>
              <p>
                Please review your jewellery selection, recipient delivery details, and order summary.
                Once confirmed, proceed to complete payment to initiate crafting and dispatch.
              </p>
            </div>
          </div>

          {/* 1. Customer & Delivery Address */}
          <div className="reviewSectionCard">
            <div className="reviewSectionCardHeader">
              <div className="headerWithIcon">
                <MapPin size={16} color="var(--maroon, #6d1b29)" />
                <h4>Delivery Address & Contact</h4>
              </div>
              {!isShipped && onOpenAddressEdit && (
                <button
                  type="button"
                  className="editAddressActionBtn"
                  onClick={() => {
                    onClose();
                    onOpenAddressEdit(order);
                  }}
                  title="Update delivery contact or shipping address"
                >
                  <Edit3 size={12} />
                  <span>Edit Address</span>
                </button>
              )}
            </div>

            <div className="reviewContactGrid">
              <div className="contactDetailItem">
                <span className="contactDetailLabel">Recipient Name:</span>
                <b>{order.recipient_name || order.recipientName || order.name}</b>
              </div>
              <div className="contactDetailItem">
                <span className="contactDetailLabel">Contact Mobile:</span>
                <b>+91 {order.recipient_phone || order.recipientPhone || order.phone}</b>
              </div>
              <div className="contactDetailItem" style={{ gridColumn: 'span 2' }}>
                <span className="contactDetailLabel">Delivery Address:</span>
                <p className="contactAddressText">
                  {order.address}, {order.city}, {order.state} - <b>PIN: {order.pincode}</b>
                </p>
              </div>
            </div>

            <div className="shippingMethodPillRow">
              <Truck size={13} color="var(--gold, #c69a59)" />
              <span>
                Shipping Method: <b>{order.shipping_method || order.shippingMethod || 'Standard Delivery'}</b>
                {shippingCharge === 0 ? ' (FREE)' : ` (₹${shippingCharge})`}
              </span>
            </div>
          </div>

          {/* 2. Products List (Locked Read-Only) */}
          <div className="reviewSectionCard">
            <div className="reviewSectionCardHeader">
              <div className="headerWithIcon">
                <ShoppingBag size={16} color="var(--maroon, #6d1b29)" />
                <h4>Ordered Jewellery Pieces ({items.length})</h4>
              </div>
              <span className="lockedTag">
                <Lock size={11} /> Read-Only
              </span>
            </div>

            <div className="reviewItemsTableContainer">
              {items.map((item, idx) => {
                const itemParams =
                  (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
                  (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});
                const paramEntries = getParameterEntries(itemParams);

                return (
                  <div key={idx} className="reviewItemRow">
                    <img
                      src={item.img || '/assets/thushi.jpg'}
                      alt={item.name}
                      className="reviewItemThumb"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/thushi.jpg';
                      }}
                    />
                    <div className="reviewItemDetails">
                      <b className="reviewItemName">{item.name}</b>
                      {paramEntries.length > 0 && (
                        <div className="reviewItemParamsList">
                          {paramEntries.map((p) => (
                            <span
                              key={p.name}
                              className={p.isCustom ? 'reviewParamBadge custom' : 'reviewParamBadge'}
                            >
                              {p.isCustom ? '✍️ ' : ''}<b>{p.name}:</b> {p.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <small className="reviewItemPriceBreakdown">
                        Qty: {item.qty} × {money(item.price)}
                      </small>
                    </div>
                    <b className="reviewItemTotal">{money(item.price * item.qty)}</b>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Gift Details (if enabled) */}
          {isGift && (
            <div className="reviewSectionCard giftCard">
              <div className="reviewSectionCardHeader">
                <div className="headerWithIcon">
                  <Gift size={16} color="#9d174d" />
                  <h4 style={{ color: '#831843' }}>Gift Order Packaging & Note</h4>
                </div>
              </div>

              <div className="reviewGiftBody">
                <div className="giftLine">
                  <span>Gift Packaging:</span>
                  <span className="giftWrapBadge">
                    {isGiftWrap ? `Luxury Gift Wrap (+₹${giftWrapCharge})` : 'Standard Gift Packaging'}
                  </span>
                </div>
                {note && (
                  <div className="giftNoteWrap">
                    <span>Handwritten Note:</span>
                    <blockquote className="giftNoteQuote">"{note}"</blockquote>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Financial Summary */}
          <div className="reviewSectionCard financialsCard">
            <div className="reviewSectionCardHeader">
              <div className="headerWithIcon">
                <CreditCard size={16} color="var(--maroon, #6d1b29)" />
                <h4>Financial Summary</h4>
              </div>
            </div>

            <div className="financialLinesWrap">
              <div className="financialRow">
                <span>Items Subtotal:</span>
                <b>{money(subtotal)}</b>
              </div>

              {couponDiscount > 0 && (
                <div className="financialRow discountRow">
                  <span>Coupon Discount ({order.coupon_code || order.couponCode}):</span>
                  <b>-{money(couponDiscount)}</b>
                </div>
              )}

              <div className="financialRow">
                <span>Delivery Charge:</span>
                <b>{shippingCharge === 0 ? 'FREE' : money(shippingCharge)}</b>
              </div>

              {giftWrapCharge > 0 && (
                <div className="financialRow">
                  <span>Luxury Gift Wrap:</span>
                  <b>+₹{giftWrapCharge}</b>
                </div>
              )}

              <div className="financialDivider"></div>

              <div className="financialRow grandTotalRow">
                <span>Grand Total Payable:</span>
                <b className="grandTotalAmount">{money(grandTotal)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="assistedReviewFooter">
          <div className="footerPayablePreview">
            <span className="payableLabel">Total Amount:</span>
            <strong className="payableVal">{money(grandTotal)}</strong>
          </div>
          <div className="footerActionGroup">
            <button type="button" className="outlineBtn" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="goldBtn proceedToPayBtn"
              onClick={() => {
                onClose();
                if (onProceedToPayment) onProceedToPayment(order);
              }}
            >
              <span>PROCEED TO PAYMENT</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
