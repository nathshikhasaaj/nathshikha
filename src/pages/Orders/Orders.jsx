import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  ShoppingBag,
  Star,
  Edit3,
  ShieldCheck,
  Search,
  Truck,
  MapPin,
  ExternalLink,
  AlertCircle,
  Loader2,
  Sparkles,
  PackageCheck,
  User,
  ArrowRight,
  RefreshCw,
  X,
  Phone,
  Mail,
  History,
  XCircle,
  MessageSquare,
  Box,
  Check,
  Instagram,
  Facebook
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import ReviewModal from '../../components/review/ReviewModal';
import CancelOrderModal from '../../components/common/CancelOrderModal';
import OrderStatusVisualBanner, { ORDER_STAGE_CONFIG } from '../../components/common/OrderStatusVisualBanner';
import './Orders.css';

const LIFECYCLE_STAGES = [
  { key: 'placed', label: 'Order Received' },
  { key: 'confirmed', label: 'Order Confirmed' },
  { key: 'making', label: 'Artisan Crafting' },
  { key: 'packing', label: 'QC & Packaging' },
  { key: 'shipped', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' }
];

const getStepIndex = (status) => {
  switch (status) {
    case 'placed':
    case 'payment_pending':
    case 'verification_pending':
      return 0;
    case 'confirmed':
      return 1;
    case 'making':
      return 2;
    case 'packing':
    case 'processing':
      return 3;
    case 'shipped':
      return 4;
    case 'delivered':
      return 5;
    default:
      return 0;
  }
};

export default function Orders() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { setToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active lookup mode: 'order_id' or 'contact'
  const [lookupMode, setLookupMode] = useState('order_id');

  // Live Order Tracking State (Single order by ID)
  const [trackOrderNo, setTrackOrderNo] = useState(searchParams.get('orderNo') || '');
  const [trackPhoneOrEmail, setTrackPhoneOrEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  // Bulk Order Lookup State (By Email or Phone)
  const [contactLookup, setContactLookup] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactResultNotice, setContactResultNotice] = useState('');

  // Review Modal State
  const [reviewModalState, setReviewModalState] = useState({
    isOpen: false,
    product: null,
    order: null,
    existingReview: null
  });

  // Cancel Order Modal State
  const [cancelModalState, setCancelModalState] = useState({
    isOpen: false,
    order: null
  });

  const loadData = async () => {
    setLoading(true);
    let loadedOrders = [];

    try {
      if (user) {
        const [ordersData, reviewsData] = await Promise.all([
          api('/orders').catch(() => []),
          api('/reviews/my-reviews').catch(() => [])
        ]);
        if (Array.isArray(ordersData) && ordersData.length > 0) {
          loadedOrders = ordersData;
        }
        if (Array.isArray(reviewsData)) {
          setMyReviews(reviewsData);
        }
      }

      if (!loadedOrders.length) {
        try {
          const saved = JSON.parse(localStorage.getItem('nw-saved-checkout-details') || 'null');
          const lastOrder = JSON.parse(localStorage.getItem('nw-last-order') || 'null');
          const contact = saved?.email || saved?.phone || lastOrder?.order?.email || lastOrder?.order?.phone;

          if (contact) {
            const guestOrders = await api('/orders/lookup-orders', {
              method: 'POST',
              body: JSON.stringify({ contact })
            }).catch(() => []);

            if (Array.isArray(guestOrders) && guestOrders.length > 0) {
              loadedOrders = guestOrders;
            }
          }
        } catch {
          // ignore
        }
      }

      setOrders(loadedOrders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle URL param auto-track (e.g. /orders?orderNo=NW12345678 or /track?orderNo=NW12345678)
  useEffect(() => {
    const paramOrderNo = searchParams.get('orderNo');
    if (paramOrderNo && paramOrderNo.trim()) {
      setTrackOrderNo(paramOrderNo.trim());
      executeTracking(paramOrderNo.trim(), '');
    }
  }, [searchParams]);

  const executeTracking = async (orderNoToTrack, identifierToTrack) => {
    if (!orderNoToTrack.trim()) {
      setTrackError('Please enter your Order ID / Number (e.g. NW12345678).');
      return;
    }
    setTrackLoading(true);
    setTrackError('');
    try {
      const res = await api('/orders/track', {
        method: 'POST',
        body: JSON.stringify({
          orderNo: orderNoToTrack.trim(),
          identifier: identifierToTrack.trim()
        })
      });
      if (res.ok && res.order) {
        setTrackResult(res.order);
      }
    } catch (err) {
      setTrackError(err.message || 'No order found matching the provided details.');
      setTrackResult(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleTrackSubmit = (e) => {
    if (e) e.preventDefault();
    executeTracking(trackOrderNo, trackPhoneOrEmail);
  };

  const handleContactLookupSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!contactLookup.trim()) {
      setContactError('Please enter your email address or 10-digit mobile number.');
      return;
    }
    setContactLoading(true);
    setContactError('');
    setContactResultNotice('');

    try {
      const res = await api('/orders/lookup-orders', {
        method: 'POST',
        body: JSON.stringify({ contact: contactLookup.trim() })
      });

      if (Array.isArray(res) && res.length > 0) {
        setOrders(res);
        setContactResultNotice(`Found ${res.length} order(s) for "${contactLookup.trim()}"`);
        setToast(`Loaded ${res.length} order(s) successfully!`);
      } else {
        setContactError('No orders found matching this contact.');
      }
    } catch (err) {
      setContactError(err.message || 'No orders found matching this contact.');
    } finally {
      setContactLoading(false);
    }
  };

  const clearTrackResult = () => {
    setTrackResult(null);
    setTrackError('');
    setTrackOrderNo('');
    setTrackPhoneOrEmail('');
  };

  const openReviewModal = (product, order, existingReview = null) => {
    setReviewModalState({
      isOpen: true,
      product,
      order,
      existingReview
    });
  };

  const closeReviewModal = () => {
    setReviewModalState({
      isOpen: false,
      product: null,
      order: null,
      existingReview: null
    });
  };

  const handleReviewSuccess = () => {
    loadData();
  };

  const openCancelModal = (order) => {
    setCancelModalState({ isOpen: true, order });
  };

  const closeCancelModal = () => {
    setCancelModalState({ isOpen: false, order: null });
  };

  const handleCancelSuccess = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) =>
        (o.id === updatedOrder.id || o.order_no === updatedOrder.order_no)
          ? { ...o, ...updatedOrder, cancellation_status: 'cancellation_requested', cancellationStatus: 'cancellation_requested' }
          : o
      )
    );
    if (trackResult && (trackResult.id === updatedOrder.id || trackResult.order_no === updatedOrder.order_no)) {
      setTrackResult((prev) => ({
        ...prev,
        ...updatedOrder,
        cancellation_status: 'cancellation_requested',
        cancellationStatus: 'cancellation_requested'
      }));
    }
  };

  const getProductReview = (orderId, productId) => {
    return myReviews.find(
      (r) =>
        String(r.order_id || r.orderId) === String(orderId) &&
        String(r.product_id || r.productId) === String(productId)
    );
  };

  // Helper to render the 6-Stage Lifecycle Progress Bar
  const renderProgress = (orderStatus) => {
    const currentStep = getStepIndex(orderStatus);

    return (
      <div className="lifecycleProgressContainer">
        <div className="lifecycleProgressBar">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={stage.key}
                className={`lifecycleStep ${isCompleted ? 'stepCompleted' : ''} ${
                  isCurrent ? 'stepCurrent' : ''
                }`}
              >
                <div className="stepDotWrapper">
                  {isCompleted ? (
                    <span className="dotIcon completedDot">✓</span>
                  ) : isCurrent ? (
                    <span className="dotIcon currentDot">●</span>
                  ) : (
                    <span className="dotIcon pendingDot">○</span>
                  )}
                </div>
                <span className="stepTitle">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="page ordersPageContainer">
      <SectionTitle
        title={t('my_orders_title', 'Track Order & My Orders')}
        sub={t('my_orders_sub', 'Track your live shipment status and manage your jewellery journey.')}
      />

      {/* ============================================================ */}
      {/* 1. LIVE ORDER TRACKER SEARCH WIDGET */}
      {/* ============================================================ */}
      <section className="liveOrderTrackerWidget">
        <div className="trackerHeader">
          <div className="trackerIconWrap">
            <Truck size={22} color="var(--gold)" />
          </div>
          <div>
            <h3>Live Order Tracking & Lookup</h3>
            <p>Track by your Order ID (e.g. NW89463805) or look up all orders using your phone or email.</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="trackerModeTabs">
          <button
            type="button"
            className={`trackerModeTab ${lookupMode === 'order_id' ? 'active' : ''}`}
            onClick={() => setLookupMode('order_id')}
          >
            <Search size={14} />
            <span>Track by Order ID</span>
          </button>
          <button
            type="button"
            className={`trackerModeTab ${lookupMode === 'contact' ? 'active' : ''}`}
            onClick={() => setLookupMode('contact')}
          >
            <History size={14} />
            <span>Find All Orders by Phone / Email</span>
          </button>
        </div>

        {lookupMode === 'order_id' ? (
          <form className="orderTrackerForm" onSubmit={handleTrackSubmit}>
            <div className="trackerInputGroup">
              <label htmlFor="trackOrderNo">Order ID / Number *</label>
              <div className="inputFieldWrap">
                <Search size={15} />
                <input
                  id="trackOrderNo"
                  type="text"
                  placeholder="e.g. NW89463805"
                  value={trackOrderNo}
                  onChange={(e) => {
                    setTrackOrderNo(e.target.value.toUpperCase());
                    setTrackError('');
                  }}
                  required
                />
              </div>
            </div>

            <div className="trackerInputGroup">
              <label htmlFor="trackPhoneOrEmail">Phone or Email (Optional)</label>
              <div className="inputFieldWrap">
                <User size={15} />
                <input
                  id="trackPhoneOrEmail"
                  type="text"
                  placeholder="Mobile number or email"
                  value={trackPhoneOrEmail}
                  onChange={(e) => setTrackPhoneOrEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="goldBtn trackerSubmitBtn"
              disabled={trackLoading || !trackOrderNo.trim()}
            >
              {trackLoading ? (
                <>
                  <Loader2 size={14} className="spinIcon" />
                  <span>Tracking…</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>TRACK ORDER</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form className="orderTrackerForm" onSubmit={handleContactLookupSubmit}>
            <div className="trackerInputGroup" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="contactLookup">Your Mobile Number or Email Address *</label>
              <div className="inputFieldWrap">
                <Mail size={15} />
                <input
                  id="contactLookup"
                  type="text"
                  placeholder="Enter email (e.g. ansari@gmail.com) or 10-digit mobile number"
                  value={contactLookup}
                  onChange={(e) => {
                    setContactLookup(e.target.value);
                    setContactError('');
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="goldBtn trackerSubmitBtn"
              disabled={contactLoading || !contactLookup.trim()}
            >
              {contactLoading ? (
                <>
                  <Loader2 size={14} className="spinIcon" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>FIND MY ORDERS</span>
                </>
              )}
            </button>
          </form>
        )}

        {trackError && (
          <div className="trackErrorNotice">
            <AlertCircle size={15} />
            <span>{trackError}</span>
          </div>
        )}

        {contactError && (
          <div className="trackErrorNotice">
            <AlertCircle size={15} />
            <span>{contactError}</span>
          </div>
        )}

        {contactResultNotice && (
          <div className="contactSuccessNotice">
            <CheckCircle2 size={15} />
            <span>{contactResultNotice}</span>
          </div>
        )}

        {/* Live Track Result Card */}
        {trackResult && (
          <div className="trackResultCard">
            <div className="trackResultHeader">
              <div>
                <span className="trackResultEyebrow">LIVE SHIPMENT STATUS</span>
                <h4>ORDER #{trackResult.order_no}</h4>
                <small>
                  Placed on {new Date(trackResult.created_at || trackResult.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </small>
              </div>
              <div className="trackResultHeaderRight">
                <span
                  className={`status ${
                    trackResult.order_status === 'delivered'
                      ? 'green'
                      : ['confirmed', 'making', 'packing', 'processing', 'shipped'].includes(trackResult.order_status)
                      ? 'green'
                      : 'pending'
                  }`}
                >
                  {trackResult.order_status === 'delivered'
                    ? 'Successfully Delivered ✓'
                    : trackResult.order_status === 'shipped'
                    ? 'Dispatched & In Transit 🚚'
                    : trackResult.order_status === 'packing' || trackResult.order_status === 'processing'
                    ? 'Quality Check & Packaging 📦'
                    : trackResult.order_status === 'making'
                    ? 'Artisan Crafting ✨'
                    : trackResult.order_status === 'confirmed'
                    ? 'Order Confirmed ✓'
                    : 'Order Received'}
                </span>
                <button
                  type="button"
                  className="closeTrackBtn"
                  onClick={clearTrackResult}
                  title="Close search result"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Status Progress Bar */}
            {renderProgress(trackResult.order_status)}

            {/* Dynamic Status / Crafting / Cancellation Notification Banner */}
            {trackResult.cancellation_status === 'cancellation_requested' || trackResult.cancellationStatus === 'cancellation_requested' ? (
              <div className="cancellationPendingBanner">
                <Clock size={18} color="#b45309" />
                <div>
                  <h4>Cancellation Request Pending</h4>
                  <p>Your cancellation request has been sent to our team for review. The request is pending admin approval.</p>
                  {trackResult.cancellation_reason && (
                    <small className="cancellationReasonNote">Reason: "{trackResult.cancellation_reason}"</small>
                  )}
                </div>
              </div>
            ) : trackResult.cancellation_status === 'cancellation_approved' || trackResult.cancellationStatus === 'cancellation_approved' ? (
              <div className="cancellationApprovedBanner">
                <CheckCircle2 size={18} color="#0d6efd" />
                <div>
                  <h4>Cancellation Approved</h4>
                  <p>Your cancellation request has been approved.</p>
                  <div className="cancellationRefundDetails">
                    <span>Refund Amount: <b>{money(trackResult.refund_amount || trackResult.total)}</b></span>
                    <span>Refund Status: <b className="statusPendingBadge">Pending</b></span>
                  </div>
                </div>
              </div>
            ) : trackResult.cancellation_status === 'refund' || trackResult.refund_status === 'refund' ? (
              <div className="cancellationRefundCompletedBanner">
                <CheckCircle2 size={18} color="#198754" />
                <div>
                  <h4>Refund Completed ✓</h4>
                  <p>Your refund has been processed successfully by our team.</p>
                  <div className="cancellationRefundDetails">
                    <span>Refund Amount: <b>{money(trackResult.refund_amount || trackResult.total)}</b></span>
                    {trackResult.refund_processed_at && (
                      <span>
                        Refund Date: <b>{new Date(trackResult.refund_processed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <OrderStatusVisualBanner status={trackResult.order_status} />
            )}

            {/* Combined Shipment Group Information */}
            {trackResult.shipment_group_code && (
              <div className="combinedShipmentOrderBanner">
                <Boxes size={18} color="var(--gold)" />
                <div className="combinedBannerContent">
                  <div className="combinedBannerTitleRow">
                    <strong>Combined Shipment · Group #{trackResult.shipment_group_code}</strong>
                    <span className="combinedPill">Joint Package</span>
                  </div>
                  <p>
                    This order is travelling together with {trackResult.co_shipped_orders?.length > 0 ? (
                      <span>Order <b>{trackResult.co_shipped_orders.map((no) => `#${no}`).join(', ')}</b></span>
                    ) : 'your other order'} in a single physical package.
                  </p>
                </div>
              </div>
            )}

            {/* Courier Tracking Dispatch Details */}
            {trackResult.shipment_partner && trackResult.tracking_id && (
              <div className="courierTrackingBanner">
                <div className="courierInfoLeft">
                  <PackageCheck size={20} color="var(--gold)" />
                  <div>
                    <span className="courierPartnerName">
                      Courier Partner: <b>{trackResult.shipment_partner}</b>
                    </span>
                    <span className="consignmentNo">
                      Tracking / AWB No: <code>{trackResult.tracking_id}</code>
                    </span>
                  </div>
                </div>

                {trackResult.courier_portal_url && (
                  <a
                    href={trackResult.courier_portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="courierTrackLinkBtn"
                  >
                    <span>Open Courier Portal</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* Delivery Location & Financial Summary */}
            <div className="trackMetaSummaryGrid">
              <div className="metaSummaryCol">
                <span className="metaColLabel">
                  <MapPin size={13} /> Delivery Destination:
                </span>
                <p>
                  {trackResult.address && `${trackResult.address}, `}
                  {trackResult.city}, {trackResult.state} - {trackResult.pincode}
                </p>
                <small className="shippingMethodBadge">
                  Method: {trackResult.shipping_method || 'Standard Delivery'}
                </small>
              </div>

              <div className="metaSummaryCol financialCol">
                <span className="metaColLabel">Payment & Total:</span>
                <b>{money(trackResult.total)}</b>
                <small>
                  Payment: {trackResult.payment_method?.toUpperCase()} (
                  {trackResult.payment_status === 'verified' || trackResult.payment_status === 'paid'
                    ? 'Verified ✓'
                    : 'Pending Verification'}
                  )
                </small>
              </div>
            </div>

            {/* Tracked Items Breakdown */}
            <div className="trackResultItemsList">
              <span className="itemsListTitle">Ordered Items ({trackResult.items?.length || 0}):</span>
              {trackResult.items?.map((item, idx) => (
                <div key={idx} className="trackItemRow">
                  <img
                    src={item.img || '/assets/thushi.jpg'}
                    alt={item.name}
                    className="trackItemThumb"
                  />
                  <div className="trackItemMeta">
                    <b>{item.name}</b>
                    <small>
                      Qty: {item.qty} · {money(item.price)}
                    </small>
                  </div>
                  <b className="trackItemTotal">{money(item.price * item.qty)}</b>
                </div>
              ))}
            </div>

            {/* Customer Cancellation / WhatsApp Action Footer */}
            {(!trackResult.cancellation_status || trackResult.cancellation_status === 'no_cancellation') && (
              <div className="orderCardActionFooter">
                {['placed', 'payment_pending', 'verification_pending', 'confirmed'].includes(trackResult.order_status) ? (
                  <button
                    type="button"
                    className="cancelOrderTriggerBtn"
                    onClick={() => openCancelModal(trackResult)}
                  >
                    <XCircle size={14} />
                    <span>Cancel Order</span>
                  </button>
                ) : (
                  <div className="discussWhatsAppCancelBox">
                    <div className="discussWhatsAppLeft">
                      <span className="discussTitle">Need to discuss cancellation or changes?</span>
                      <p>Your jewellery is in production or dispatch. Connect with our studio on WhatsApp, Instagram (@nakharewali.handmade) or Facebook (Nakharewali.handmade) for manual assistance.</p>
                    </div>
                    <div className="discussActionBtns">
                      <a
                        href={`https://wa.me/919699668421?text=${encodeURIComponent(
                          `Hi Nathshikha Studio, I would like to discuss cancellation for Order #${trackResult.order_no}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="waDiscussCancelBtn"
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp Help</span>
                      </a>
                      <a
                        href="https://www.instagram.com/nakharewali.handmade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="instaDiscussBtn"
                      >
                        <Instagram size={13} />
                        <span>Instagram</span>
                      </a>
                      <a
                        href="https://www.facebook.com/Nakharewali.handmade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fbDiscussBtn"
                      >
                        <Facebook size={13} />
                        <span>Facebook</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 2. CUSTOMER ACCOUNT ORDERS HISTORY */}
      {/* ============================================================ */}
      <section className="accountOrdersSection">
        <div className="accountOrdersSectionHeader">
          <div>
            <h2>{user ? 'My Order History' : 'Your Order History'}</h2>
            <p>
              {user
                ? `Logged in as ${user.name} (${user.email}). All orders placed with your details are displayed below.`
                : 'All orders matched with your account or recent purchases are displayed below.'}
            </p>
          </div>
          <button
            type="button"
            className="refreshOrdersBtn"
            onClick={loadData}
            title="Refresh order history"
          >
            <RefreshCw size={13} className={loading ? 'spinIcon' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* If user is not logged in and has 0 orders: Show Login CTA Card */}
        {!user && orders.length === 0 && !loading && (
          <div className="guestLoginPromptCard">
            <div className="promptIconWrap">
              <User size={28} />
            </div>
            <div className="promptContent">
              <h3>Have an Account or Placed Past Orders?</h3>
              <p>
                Sign in to your Nathshikha account to view all your previous purchases, or use the <b>Find All Orders</b> tab above with your phone or email.
              </p>
            </div>
            <Link to="/login" className="goldBtn promptLoginBtn">
              <span>LOGIN TO MY ACCOUNT</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {loading ? (
          <div className="empty">
            <Loader2 size={24} className="spinIcon" color="var(--gold)" />
            <p>{t('processing', 'Loading orders…')}</p>
          </div>
        ) : orders.length > 0 ? (
          orders.map((o) => {
            const isDelivered = o.order_status === 'delivered';
            const isMaking = o.order_status === 'making';
            const isPacking = o.order_status === 'packing';
            const isShipped = o.order_status === 'shipped';
            const isConfirmed = o.order_status === 'confirmed';
            const isCancellationRequested = o.cancellation_status === 'cancellation_requested' || o.cancellationStatus === 'cancellation_requested';
            const isCancellationApproved = o.cancellation_status === 'cancellation_approved' || o.cancellationStatus === 'cancellation_approved';
            const isRefundCompleted = o.cancellation_status === 'refund' || o.refund_status === 'refund';

            return (
              <div className="orderCard" key={o.id}>
                <div className="orderCardHeader">
                  <div>
                    <span
                      className={`status ${
                        isRefundCompleted
                          ? 'green'
                          : isCancellationApproved
                          ? 'blue'
                          : isCancellationRequested
                          ? 'pending'
                          : isDelivered
                          ? 'green'
                          : isShipped || isMaking || isPacking || isConfirmed
                          ? 'green'
                          : 'pending'
                      }`}
                    >
                      {isRefundCompleted
                        ? 'Refund Completed ✓'
                        : isCancellationApproved
                        ? 'Cancellation Approved'
                        : isCancellationRequested
                        ? 'Cancellation Requested'
                        : isDelivered
                        ? 'Successfully Delivered ✓'
                        : isShipped
                        ? 'Dispatched & In Transit 🚚'
                        : isPacking
                        ? 'QC & Packaging 📦'
                        : isMaking
                        ? 'Artisan Crafting ✨'
                        : isConfirmed
                        ? 'Order Confirmed ✓'
                        : 'Order Received'}
                    </span>
                    <small>
                      ORDER #{o.order_no} ·{' '}
                      {new Date(o.created_at || o.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </small>
                    <h3>{o.items?.map((i) => i.name).join(', ')}</h3>
                    <p>
                      {money(o.total)} · {o.items?.reduce((a, i) => a + i.qty, 0)}{' '}
                      {t('pieces_count', 'item(s)')}
                      {o.coupon_code && (
                        <span style={{ marginLeft: 8, color: '#198754', fontSize: '11.5px', fontWeight: 600 }}>
                          · Coupon {o.coupon_code} (-{money(o.coupon_discount || 0)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {renderProgress(o.order_status)}

                {/* Dynamic Status / Crafting / Cancellation Notification Banner */}
                {isCancellationRequested ? (
                  <div className="cancellationPendingBanner">
                    <Clock size={18} color="#b45309" />
                    <div>
                      <h4>Cancellation Request Pending</h4>
                      <p>Your cancellation request has been sent to our team for review. The request is pending admin approval.</p>
                      {o.cancellation_reason && (
                        <small className="cancellationReasonNote">Reason: "{o.cancellation_reason}"</small>
                      )}
                    </div>
                  </div>
                ) : isCancellationApproved ? (
                  <div className="cancellationApprovedBanner">
                    <CheckCircle2 size={18} color="#0d6efd" />
                    <div>
                      <h4>Cancellation Approved</h4>
                      <p>Your cancellation request has been approved.</p>
                      <div className="cancellationRefundDetails">
                        <span>Refund Amount: <b>{money(o.refund_amount || o.total)}</b></span>
                        <span>Refund Status: <b className="statusPendingBadge">Pending</b></span>
                      </div>
                    </div>
                  </div>
                ) : isRefundCompleted ? (
                  <div className="cancellationRefundCompletedBanner">
                    <CheckCircle2 size={18} color="#198754" />
                    <div>
                      <h4>Refund Completed ✓</h4>
                      <p>Your refund has been processed successfully by our team.</p>
                      <div className="cancellationRefundDetails">
                        <span>Refund Amount: <b>{money(o.refund_amount || o.total)}</b></span>
                        {o.refund_processed_at && (
                          <span>
                            Refund Date: <b>{new Date(o.refund_processed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <OrderStatusVisualBanner status={o.order_status} />
                )}

                {/* Combined Shipment info in order card if part of a group */}
                {(o.shipment_group_code || o.shipmentGroupCode) && (
                  <div className="orderCardCombinedShipmentRow">
                    <Boxes size={14} color="var(--gold)" />
                    <span>
                      Combined Shipment: <b>#{o.shipment_group_code || o.shipmentGroupCode}</b>
                      {o.co_shipped_orders && o.co_shipped_orders.length > 0 && (
                        <small className="coShippedOrdersList">
                          · Dispatched together with Order {o.co_shipped_orders.map((no) => `#${no}`).join(', ')}
                        </small>
                      )}
                    </span>
                  </div>
                )}

                {/* Courier details in order card if available */}
                {o.shipment_partner && o.tracking_id && (
                  <div className="orderCardShipmentRow">
                    <Truck size={14} color="var(--gold)" />
                    <span>
                      Shipped via <b>{o.shipment_partner}</b> · AWB/Tracking No: <code>{o.tracking_id}</code>
                    </span>
                  </div>
                )}

                {/* Delivered Order Product Reviews Section */}
                {isDelivered && o.items && o.items.length > 0 && (
                  <div className="orderItemsReviewSection">
                    <div className="reviewSectionBanner">
                      <Star size={14} color="var(--gold)" fill="var(--gold)" />
                      <span>Rate & Review Purchased Pieces</span>
                    </div>

                    <div className="orderItemsReviewList">
                      {o.items.map((item, idx) => {
                        const prodId = item.productId || item.id || item._id;
                        const existingReview = getProductReview(o.id || o._id, prodId);

                        return (
                          <div key={idx} className="orderItemReviewRow">
                            <img
                              src={item.img || '/assets/thushi.jpg'}
                              alt={item.name}
                              className="orderReviewItemThumb"
                            />
                            <div className="orderReviewItemDetails">
                              <span className="orderReviewItemName">{item.name}</span>
                              <small className="orderReviewItemMeta">
                                Qty: {item.qty} · {money(item.price)}
                              </small>
                            </div>

                            <div className="orderReviewActionCol">
                              {existingReview ? (
                                <div className="existingReviewBadge">
                                  <span className="reviewDonePill">
                                    Review Submitted ✓ ({existingReview.rating}★)
                                  </span>
                                  <button
                                    type="button"
                                    className="editReviewTextBtn"
                                    onClick={() => openReviewModal(item, o, existingReview)}
                                  >
                                    <Edit3 size={12} /> Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="goldBtn compact writeReviewTriggerBtn"
                                  onClick={() => openReviewModal(item, o, null)}
                                >
                                  <Star size={13} fill="currentColor" /> Write a Review
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Cancellation / WhatsApp Action Footer */}
                {(!o.cancellation_status || o.cancellation_status === 'no_cancellation') && (
                  <div className="orderCardActionFooter">
                    {['placed', 'payment_pending', 'verification_pending', 'confirmed'].includes(o.order_status) ? (
                      <button
                        type="button"
                        className="cancelOrderTriggerBtn"
                        onClick={() => openCancelModal(o)}
                      >
                        <XCircle size={14} />
                        <span>Cancel Order</span>
                      </button>
                    ) : (
                      <div className="discussWhatsAppCancelBox">
                        <div className="discussWhatsAppLeft">
                          <span className="discussTitle">Need to discuss cancellation or changes?</span>
                          <p>Your jewellery is in production or dispatch. Connect with our studio on WhatsApp, Instagram (@nakharewali.handmade) or Facebook (Nakharewali.handmade) for manual assistance.</p>
                        </div>
                        <div className="discussActionBtns">
                          <a
                            href={`https://wa.me/919699668421?text=${encodeURIComponent(
                              `Hi Nathshikha Studio, I would like to discuss cancellation for Order #${o.order_no}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="waDiscussCancelBtn"
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp Help</span>
                          </a>
                          <a
                            href="https://www.instagram.com/nakharewali.handmade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="instaDiscussBtn"
                          >
                            <Instagram size={13} />
                            <span>Instagram</span>
                          </a>
                          <a
                            href="https://www.facebook.com/Nakharewali.handmade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fbDiscussBtn"
                          >
                            <Facebook size={13} />
                            <span>Facebook</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty">
            <Package size={36} color="var(--gold)" />
            <p>{t('no_orders_yet', 'No orders found.')}</p>
            <Link className="goldBtn" to="/shop">
              {t('shop_now', 'EXPLORE COLLECTION')}
            </Link>
          </div>
        )}
      </section>

      {/* Review Submission Modal */}
      <ReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={closeReviewModal}
        product={reviewModalState.product}
        order={reviewModalState.order}
        existingReview={reviewModalState.existingReview}
        onSuccess={handleReviewSuccess}
        setToast={setToast}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={cancelModalState.isOpen}
        onClose={closeCancelModal}
        order={cancelModalState.order}
        onSuccess={handleCancelSuccess}
        setToast={setToast}
      />
    </main>
  );
}
