import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Truck,
  Edit3,
  PackageCheck,
  Tag,
  Link2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Boxes
} from 'lucide-react';
import { api } from '../../services/api';
import { money, formatOrderStatus } from '../../utils/formatters';
import './AdminOrderDetailsModal.css';

export default function AdminOrderDetailsModal({
  order,
  isOpen,
  onClose,
  onVerifyPaymentClick,
  onEditShipmentClick,
  onStatusChange,
  onReviewCancellationClick
}) {
  const [copiedItemIndex, setCopiedItemIndex] = useState(null);
  const [generatingItemIndex, setGeneratingItemIndex] = useState(null);
  const [copyNotice, setCopyNotice] = useState('');

  if (!isOpen || !order) return null;

  const isVerified =
    order.payment_status === 'verified' ||
    order.paymentStatus === 'verified' ||
    order.payment_status === 'paid';
  const isShipped =
    order.order_status === 'shipped' ||
    order.orderStatus === 'shipped' ||
    Boolean(order.shipment_partner || order.tracking_id);
  const cleanPhone = (order.phone || '').replace(/\D/g, '');

  const isCancelRequested =
    order.cancellation_status === 'cancellation_requested' ||
    order.cancellationStatus === 'cancellation_requested';
  const isCancelApproved =
    order.cancellation_status === 'cancellation_approved' ||
    order.cancellationStatus === 'cancellation_approved';
  const isRefundCompleted =
    order.cancellation_status === 'refund' ||
    order.cancellationStatus === 'refund' ||
    order.refund_status === 'refund' ||
    order.refundStatus === 'refund';
  const hasCancellation = isCancelRequested || isCancelApproved || isRefundCompleted;

  const getProductCode = (item, index) => {
    if (item.productId) {
      return `PRD-${String(item.productId).slice(-6).toUpperCase()}`;
    }
    if (item.id) {
      return `PRD-${String(item.id).slice(-6).toUpperCase()}`;
    }
    return `PRD-${String(order.order_no).slice(-4)}-${index + 1}`;
  };

  const isDelivered =
    order.order_status === 'delivered' || order.orderStatus === 'delivered';

  const handleCopyReviewLink = async (item, idx) => {
    const prodId = item.productId || item.id || item._id;
    const orderId = order.id || order._id;
    if (!prodId || !orderId) return;

    setGeneratingItemIndex(idx);
    setCopyNotice('');

    try {
      const res = await api(`/admin/orders/${orderId}/products/${prodId}/review-link`, {
        method: 'POST'
      });

      if (res.ok && res.reviewUrl) {
        const fullUrl = `${window.location.origin}${res.reviewUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedItemIndex(idx);
        setCopyNotice(`Review link for "${item.name}" copied to clipboard!`);
        setTimeout(() => {
          setCopiedItemIndex(null);
          setCopyNotice('');
        }, 3000);
      }
    } catch (err) {
      setCopyNotice(err.message || 'Failed to generate review link');
      setTimeout(() => setCopyNotice(''), 4000);
    } finally {
      setGeneratingItemIndex(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="orderDetailsOverlay" onClick={onClose}>
      <div
        className="orderDetailsContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="orderDetailsHeader">
          <div className="modalHeaderTitle">
            <div className="modalBadge">
              <Package size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3>Order #{order.order_no}</h3>
                {(order.is_gift || order.isGift) && (
                  <span
                    style={{
                      background: '#fce7f3',
                      color: '#9d174d',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🎁 Gift Order
                  </span>
                )}
              </div>
              <p>
                Placed on{' '}
                {new Date(order.created_at || order.createdAt).toLocaleString(
                  'en-IN',
                  {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }
                )}
              </p>
            </div>
          </div>

          <div className="modalHeaderRight">
            <button
              type="button"
              className="outlineBtn printBtn"
              onClick={handlePrint}
              title="Print order receipt"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button
              className="modalCloseBtn"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="orderDetailsBody">
          {/* Status Bar */}
          <div className="orderStatusBanner">
            <div className="bannerStatusItem">
              <span>Order Status:</span>
              <b className={`statusTag status_${order.order_status}`}>
                {formatOrderStatus(order.order_status)}
              </b>
            </div>

            <div className="bannerStatusItem">
              <span>Cancellation Status:</span>
              {isCancelRequested ? (
                <b className="cancelTagReq">
                  <AlertTriangle size={12} /> CANCELLATION REQUESTED
                </b>
              ) : isCancelApproved ? (
                <b className="cancelTagApproved">
                  <CheckCircle2 size={12} /> APPROVED (REFUND PENDING)
                </b>
              ) : isRefundCompleted ? (
                <b className="cancelTagRefunded">
                  <CheckCircle2 size={12} /> REFUND COMPLETED
                </b>
              ) : (
                <b className="cancelTagNone">NO CANCELLATION</b>
              )}
            </div>

            <div className="bannerStatusItem">
              <span>Payment Status:</span>
              <b
                className={`paymentTag ${
                  isVerified ? 'paymentTagVerified' : 'paymentTagPending'
                }`}
              >
                {isVerified ? (
                  <>
                    <CheckCircle2 size={13} /> VERIFIED
                  </>
                ) : (
                  <>
                    <Clock size={13} /> PENDING VERIFICATION
                  </>
                )}
              </b>
            </div>

            {!isVerified && onVerifyPaymentClick && (
              <button
                type="button"
                className="goldBtn compact verifyHeaderBtn"
                onClick={() => {
                  onClose();
                  onVerifyPaymentClick(order);
                }}
              >
                <ShieldCheck size={14} /> Verify Payment
              </button>
            )}

            {isCancelRequested && onReviewCancellationClick && (
              <button
                type="button"
                className="goldBtn compact reviewCancelHeaderBtn"
                onClick={() => {
                  onClose();
                  onReviewCancellationClick(order);
                }}
              >
                <AlertTriangle size={14} /> Review Cancellation
              </button>
            )}

            {isCancelApproved && onReviewCancellationClick && (
              <button
                type="button"
                className="outlineBtn compact processRefundHeaderBtn"
                onClick={() => {
                  onClose();
                  onReviewCancellationClick(order);
                }}
              >
                <RotateCcw size={14} /> Process Refund
              </button>
            )}
          </div>

          {/* Cancellation Information Card if Applicable */}
          {hasCancellation && (
            <div className="detailsSectionCard cancellationDetailCard">
              <div className="sectionHeader" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#b45309" />
                  <h3 style={{ color: '#92400e' }}>Customer Cancellation & Refund Details</h3>
                </div>
                {onReviewCancellationClick && (
                  <button
                    type="button"
                    className="outlineBtn compact"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => {
                      onClose();
                      onReviewCancellationClick(order);
                    }}
                  >
                    {isCancelRequested ? 'Review Request' : 'Manage Refund'}
                  </button>
                )}
              </div>

              <div className="infoList cancellationInfoGrid">
                <div className="infoItem" style={{ gridColumn: 'span 2' }}>
                  <span className="infoLabel">Customer Reason</span>
                  <blockquote className="modalReasonQuote">
                    "{order.cancellation_reason || order.cancellationReason || 'No reason specified'}"
                  </blockquote>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Requested On</span>
                  <span className="infoVal">
                    {order.cancellation_requested_at
                      ? new Date(order.cancellation_requested_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })
                      : '—'}
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Eligible Paid Amount</span>
                  <span className="infoVal">
                    <b>{money(order.total)}</b>
                  </span>
                </div>

                {order.cancellation_charge !== undefined && order.cancellation_charge > 0 && (
                  <div className="infoItem">
                    <span className="infoLabel">Cancellation Charge</span>
                    <span className="infoVal" style={{ color: '#dc3545' }}>
                      <b>- {money(order.cancellation_charge)}</b>
                    </span>
                  </div>
                )}

                {(isCancelApproved || isRefundCompleted) && (
                  <div className="infoItem">
                    <span className="infoLabel">Approved Refund Amount</span>
                    <span className="infoVal" style={{ color: '#198754' }}>
                      <b style={{ fontSize: '1.05rem' }}>
                        {money(order.refund_amount || order.total)}
                      </b>
                    </span>
                  </div>
                )}

                {(isCancelApproved || isRefundCompleted) && (
                  <div className="infoItem">
                    <span className="infoLabel">Refund Status</span>
                    <span className="infoVal">
                      {isRefundCompleted ? (
                        <b style={{ color: '#15803d' }}>✓ Refund Processed</b>
                      ) : (
                        <b style={{ color: '#d97706' }}>Pending Execution</b>
                      )}
                    </span>
                  </div>
                )}

                {order.cancellation_admin_notes && (
                  <div className="infoItem" style={{ gridColumn: 'span 2' }}>
                    <span className="infoLabel">Admin Notes</span>
                    <span className="infoVal">{order.cancellation_admin_notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3-Column Info Grid */}
          <div className="detailsGrid">
            {/* 1. Customer / Recipient Details Box */}
            <div className="detailsSectionCard">
              <div className="sectionHeader">
                <User size={16} />
                <h3>{(order.is_gift || order.isGift) ? 'Delivery Recipient & Buyer Details' : 'Customer Details'}</h3>
              </div>
              <div className="infoList">
                {(order.is_gift || order.isGift) ? (
                  <>
                    <div className="infoItem">
                      <span className="infoLabel">Recipient Name (Gift)</span>
                      <span className="infoVal"><b>{order.recipient_name || order.recipientName || order.name}</b></span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Recipient Phone</span>
                      <span className="infoVal phoneVal">
                        <Phone size={13} />
                        <span>{order.recipient_phone || order.recipientPhone || order.phone}</span>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${(order.recipient_phone || order.recipientPhone || order.phone).replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                              order.recipient_name || order.name
                            )}%2C%20regarding%20your%20Nathshikha%20gift%20delivery%20%23${order.order_no}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsappDirectLink"
                            title="Chat with Recipient"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        )}
                      </span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Delivery Address</span>
                      <span className="infoVal addressVal">
                        <MapPin size={13} />
                        <span>{order.address}</span>
                      </span>
                    </div>

                    <div className="infoItem" style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                      <span className="infoLabel">Ordered / Paid By (Buyer)</span>
                      <span className="infoVal"><b>{order.customer_name || order.customerName || 'Customer'}</b></span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Buyer Phone & Email</span>
                      <span className="infoVal" style={{ fontSize: '12px' }}>
                        {order.customer_phone || order.customerPhone || '—'} · {order.customer_email || order.customerEmail || order.email || '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="infoItem">
                      <span className="infoLabel">Full Name</span>
                      <span className="infoVal"><b>{order.name}</b></span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Phone Number</span>
                      <span className="infoVal phoneVal">
                        <Phone size={13} />
                        <span>{order.phone}</span>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                              order.name
                            )}%2C%20regarding%20your%20Nathshikha%20order%20%23${order.order_no}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsappDirectLink"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        )}
                      </span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Email Address</span>
                      <span className="infoVal">
                        <Mail size={13} /> {order.email || 'Not provided'}
                      </span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Delivery Address</span>
                      <span className="infoVal addressVal">
                        <MapPin size={13} />
                        <span>{order.address}</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. Shipping Information Box */}
            <div className="detailsSectionCard">
              <div className="sectionHeader">
                <Truck size={16} />
                <h3>Shipping Information</h3>
              </div>
              <div className="infoList">
                {(order.shipment_group_code || order.shipmentGroupCode) && (
                  <div className="infoItem shipmentGroupInfoItem">
                    <span className="infoLabel">Shipment Group</span>
                    <span className="infoVal">
                      <span className="shipmentGroupModalBadge">
                        <Boxes size={12} /> {order.shipment_group_code || order.shipmentGroupCode}
                      </span>
                      {order.co_shipped_orders && order.co_shipped_orders.length > 0 && (
                        <small className="coShippedOrdersModalText">
                          (Packaged together with Order #{order.co_shipped_orders.join(', #')})
                        </small>
                      )}
                    </span>
                  </div>
                )}

                <div className="infoItem">
                  <span className="infoLabel">Shipping Method</span>
                  <span className="infoVal">
                    <b>{order.shipping_method || 'Standard Delivery'}</b>
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">PIN Code</span>
                  <span className="infoVal">
                    {order.pincode ? (
                      <code className="utrHighlight">{order.pincode}</code>
                    ) : (
                      <span className="mutedText">Not provided</span>
                    )}
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">City</span>
                  <span className="infoVal">
                    {order.city || <span className="mutedText">Not available</span>}
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">State</span>
                  <span className="infoVal">
                    {order.state || <span className="mutedText">Not available</span>}
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Shipping Charge</span>
                  <span className="infoVal">
                    <b>
                      {order.shipping_charge === 0 || order.shipping === 0
                        ? 'FREE (₹0)'
                        : money(order.shipping_charge || order.shipping || 0)}
                    </b>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Payment Details Box */}
            <div className="detailsSectionCard">
              <div className="sectionHeader">
                <CreditCard size={16} />
                <h3>Payment Details</h3>
              </div>
              <div className="infoList">
                <div className="infoItem">
                  <span className="infoLabel">Payment Status</span>
                  <span className="infoVal">
                    <b>{isVerified ? 'Verified' : 'Pending Verification'}</b>
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Transaction ID</span>
                  <span className="infoVal">
                    {order.payment_transaction_id ? (
                      <code className="utrHighlight">
                        {order.payment_transaction_id}
                      </code>
                    ) : (
                      <span className="mutedText">Not available</span>
                    )}
                  </span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Payment Mode</span>
                  <span className="infoVal">
                    {order.payment_app ? (
                      <b>{order.payment_app}</b>
                    ) : (
                      <span className="mutedText">Not available</span>
                    )}
                  </span>
                </div>

                {isVerified && (
                  <div className="infoItem">
                    <span className="infoLabel">Verified At</span>
                    <span className="infoVal">
                      {order.verified_at ? (
                        new Date(order.verified_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })
                      ) : (
                        'Verified'
                      )}
                    </span>
                  </div>
                )}

                {isVerified && order.verified_by && (
                  <div className="infoItem">
                    <span className="infoLabel">Verified By</span>
                    <span className="infoVal">
                      <b>{order.verified_by}</b>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Shipment Information Box */}
            <div className="detailsSectionCard">
              <div className="sectionHeader" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PackageCheck size={16} />
                  <h3>Shipment Information</h3>
                </div>
                {onEditShipmentClick && (
                  <button
                    type="button"
                    className="outlineBtn compact"
                    style={{ padding: '3px 8px', fontSize: 10 }}
                    onClick={() => {
                      onClose();
                      onEditShipmentClick(order, isShipped);
                    }}
                  >
                    <Edit3 size={11} /> {isShipped ? 'Edit' : 'Mark Shipped'}
                  </button>
                )}
              </div>
              <div className="infoList">
                <div className="infoItem">
                  <span className="infoLabel">Shipment Status</span>
                  <span className="infoVal">
                    {isShipped ? (
                      <b style={{ color: '#6d28d9' }}>Shipped</b>
                    ) : (
                      <span className="mutedText">Not Shipped</span>
                    )}
                  </span>
                </div>

                {isShipped && (
                  <>
                    <div className="infoItem">
                      <span className="infoLabel">Shipment Partner</span>
                      <span className="infoVal">
                        <b>{order.shipment_partner || order.shipmentPartner || 'Speed Post'}</b>
                      </span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Tracking ID</span>
                      <span className="infoVal">
                        <code className="utrHighlight">
                          {order.tracking_id || order.trackingId || '—'}
                        </code>
                      </span>
                    </div>

                    <div className="infoItem">
                      <span className="infoLabel">Shipped On</span>
                      <span className="infoVal">
                        {order.shipped_at || order.shippedAt ? (
                          new Date(order.shipped_at || order.shippedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        ) : (
                          'Recorded'
                        )}
                      </span>
                    </div>

                    {order.shipped_by || order.shippedBy ? (
                      <div className="infoItem">
                        <span className="infoLabel">Shipped By</span>
                        <span className="infoVal">
                          <b>{order.shipped_by || order.shippedBy}</b>
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="productsSection">
            <div className="sectionHeader">
              <Package size={16} />
              <h3>Ordered Products ({order.items?.length || 0})</h3>
            </div>

            {copyNotice && (
              <div
                style={{
                  background: '#eef9f2',
                  border: '1px solid #b7ebd0',
                  color: '#198754',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10
                }}
              >
                <CheckCircle2 size={14} />
                <span>{copyNotice}</span>
              </div>
            )}

            <div className="productsTableWrap">
              <table className="productsTable">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                    {isDelivered && <th>Review Request</th>}
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="itemThumbCell">
                          <img
                            src={item.img || '/assets/thushi.jpg'}
                            alt={item.name}
                            className="itemThumb"
                          />
                        </td>
                        <td className="codeCell">
                          <code>{getProductCode(item, idx)}</code>
                        </td>
                        <td className="nameCell">
                          <b>{item.name}</b>
                          {(() => {
                            const itemParams =
                              (item.selectedParameters && typeof item.selectedParameters === 'object'
                                ? item.selectedParameters
                                : null) ||
                              (item.selectedOptions && typeof item.selectedOptions === 'object'
                                ? item.selectedOptions
                                : {});
                            const hasParams = Object.keys(itemParams).length > 0;

                            if (!hasParams) return null;

                            return (
                              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {Object.entries(itemParams).map(([optName, optVal]) => (
                                  <span
                                    key={optName}
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                      color: '#78350f',
                                      background: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      display: 'inline-block'
                                    }}
                                  >
                                    {optName}: {optVal}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td>{money(item.price)}</td>
                        <td>
                          <b>× {item.qty}</b>
                        </td>
                        <td>
                          <b>{money(item.price * item.qty)}</b>
                        </td>
                        {isDelivered && (
                          <td>
                            <button
                              type="button"
                              className="outlineBtn compact"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                padding: '5px 10px',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => handleCopyReviewLink(item, idx)}
                              disabled={generatingItemIndex === idx}
                              title="Generate and copy direct customer review link"
                            >
                              {generatingItemIndex === idx ? (
                                <Loader2 size={12} className="spinIcon" />
                              ) : copiedItemIndex === idx ? (
                                <span style={{ color: '#198754', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Check size={12} /> Copied!
                                </span>
                              ) : (
                                <>
                                  <Link2 size={12} /> Copy Review Link
                                </>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isDelivered ? 7 : 6} style={{ textAlign: 'center', padding: 20 }}>
                        No product breakdown found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="orderTotalSummary">
              <div className="summaryRow">
                <span>Subtotal:</span>
                <b>{money(order.subtotal || order.total)}</b>
              </div>
              {(order.coupon_discount > 0 || order.couponDiscount > 0 || order.coupon_code || order.couponCode) && (
                <div className="summaryRow couponDiscountRow" style={{ color: '#198754' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={12} /> Coupon Discount ({order.coupon_code || order.couponCode || 'APPLIED'}):
                  </span>
                  <b>-{money(order.coupon_discount || order.couponDiscount || 0)}</b>
                </div>
              )}
              <div className="summaryRow">
                <span>Shipping ({order.shipping_method || 'Delivery'}):</span>
                <b>
                  {order.shipping_charge === 0 || order.shipping === 0
                    ? 'FREE'
                    : money(order.shipping_charge || order.shipping || 0)}
                </b>
              </div>
              <div className="summaryRow grandTotalRow">
                <span>Grand Total:</span>
                <b>{money(order.total)}</b>
              </div>
            </div>

            {/* Email Notifications Management Section */}
            <div className="adminEmailNotificationsCard" style={{
              marginTop: 20,
              padding: '16px 20px',
              background: '#fdfbf7',
              border: '1.5px solid #ebdcc6',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 13.5, color: '#6d1b29', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Mail size={15} /> Email Notifications & Delivery Status
                </h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    id="resendEmailSelect"
                    defaultValue="ORDER_CONFIRMED"
                    style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #d8c7b0', background: '#fff' }}
                  >
                    <option value="ORDER_PLACED">Order Placed Email</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed Email</option>
                    <option value="ORDER_SHIPPED">Order Shipped Email</option>
                    <option value="ORDER_DELIVERED">Order Delivered Email</option>
                    <option value="CANCELLATION_APPROVED">Cancellation Approved Email</option>
                    <option value="REFUND_COMPLETED">Refund Completed Email</option>
                  </select>
                  <button
                    type="button"
                    className="goldBtn compact"
                    style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      const select = document.getElementById('resendEmailSelect');
                      const emailType = select ? select.value : 'ORDER_CONFIRMED';
                      const orderId = order.id || order._id;
                      try {
                        const res = await api(`/admin/orders/${orderId}/resend-email`, {
                          method: 'POST',
                          body: JSON.stringify({ emailType })
                        });
                        alert(res.message || 'Email resent successfully!');
                      } catch (err) {
                        alert(err.message || 'Failed to resend email');
                      }
                    }}
                  >
                    Resend Email
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6e5d56', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>
                  Recipient: <strong>{order.customer_email || order.email || 'customer@nathshikha.com'}</strong> · All emails are dispatched automatically using Nathshikha business Gmail SMTP.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="orderDetailsFooter">
          <div className="statusChangerRow">
            <span className="statusChangerLabel">Update Status:</span>
            <select
              value={order.order_status}
              onChange={(e) => onStatusChange && onStatusChange(order, e.target.value)}
              className={`orderStatusSelect statusSelect_${order.order_status}`}
            >
              <option value="placed">Order Received</option>
              <option value="confirmed">Order Confirmed</option>
              <option value="making">Artisan Crafting</option>
              <option value="packing">QC & Packaging</option>
              <option value="shipped">Dispatched & In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="modalFooterActions">
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                  order.name
                )}%2C%20regarding%20your%20Nathshikha%20order%20%23${order.order_no}`}
                target="_blank"
                rel="noopener noreferrer"
                className="goldBtn compact modalWaBtn"
                title="Chat on WhatsApp"
              >
                <MessageSquare size={13} />
                <span>WhatsApp Customer</span>
              </a>
            )}
            <button
              type="button"
              className="outlineBtn compact modalCloseBottomBtn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
