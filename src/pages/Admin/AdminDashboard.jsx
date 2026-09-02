import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  LogOut,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Layers,
  ShoppingBag,
  Plus,
  PackagePlus,
  Tag,
  Star,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { compressImage, compressMultipleImages } from '../../utils/imageCompressor';
import AdminStats from '../../components/admin/AdminStats';
import AdminProductForm from '../../components/admin/AdminProductForm';
import AdminProductList from '../../components/admin/AdminProductList';
import AdminOrderList from '../../components/admin/AdminOrderList';
import AdminPaymentVerificationModal from '../../components/admin/AdminPaymentVerificationModal';
import AdminOrderDetailsModal from '../../components/admin/AdminOrderDetailsModal';
import AdminCreateOrderModal from '../../components/admin/AdminCreateOrderModal';
import AdminShipmentModal from '../../components/admin/AdminShipmentModal';
import AdminShipmentTable from '../../components/admin/AdminShipmentTable';
import AdminCouponManager from '../../components/admin/AdminCouponManager';
import AdminReviewManager from '../../components/admin/AdminReviewManager';
import AdminShowcaseReviewManager from '../../components/admin/AdminShowcaseReviewManager';
import AdminHallOfFameManager from '../../components/admin/AdminHallOfFameManager';
import AdminHeroManager from '../../components/admin/AdminHeroManager';
import AdminParameterManager from '../../components/admin/AdminParameterManager';
import AdminCancellationModal from '../../components/admin/AdminCancellationModal';
import { Camera, MessageSquareQuote, SlidersHorizontal } from 'lucide-react';
import './AdminDashboard.css';

const emptyForm = {
  name: '',
  price: '',
  category: 'Traditional',
  tag: 'NEW',
  img: '',
  images: [],
  description: '',
  productParameters: [],
  stock: 10,
  active: 1,
  isBestseller: false
};

export default function AdminDashboard({ products = [], refreshProducts }) {
  const { adminUser, logoutAdmin } = useAuth();
  const { setToast } = useToast();

  const [tab, setTab] = useState('control_center');
  const [orders, setOrders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviewsData, setReviewsData] = useState({ reviews: [], summary: {} });
  const [showcaseReviews, setShowcaseReviews] = useState([]);
  const [hallOfFameStories, setHallOfFameStories] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [allProducts, setAllProducts] = useState(products);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [orderFilter, setOrderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [verifyModalOrder, setVerifyModalOrder] = useState(null);
  const [detailsModalOrder, setDetailsModalOrder] = useState(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [shipmentModalOrder, setShipmentModalOrder] = useState(null);
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [cancellationModalOrder, setCancellationModalOrder] = useState(null);

  const handleOrderCreated = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setToast(`Order #${newOrder.order_no || newOrder.orderNo} created successfully!`);
    load();
  };

  const handleSaveShipment = async (orderId, { shipmentPartner, trackingId }) => {
    try {
      const res = await api(`/admin/orders/${orderId}/ship`, {
        method: 'POST',
        body: JSON.stringify({ shipmentPartner, trackingId })
      });
      if (res.ok && res.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === res.order.id || o.order_no === res.order.order_no ? res.order : o
          )
        );
        setToast(
          `Order #${res.order.order_no} marked as Shipped via ${shipmentPartner}!`
        );
        load();
      }
    } catch (err) {
      setToast(err.message || 'Failed to save shipment details');
      throw err;
    }
  };

  const handleReviewCancellation = async (
    orderId,
    { action, refundType, cancellationCharge, notes }
  ) => {
    try {
      const res = await api(`/admin/orders/${orderId}/cancellation/review`, {
        method: 'POST',
        body: JSON.stringify({ action, refundType, cancellationCharge, notes })
      });
      if (res.ok && res.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.order_no === res.order.order_no ? { ...o, ...res.order } : o
          )
        );
        if (detailsModalOrder && (detailsModalOrder.id === orderId || detailsModalOrder.order_no === res.order.order_no)) {
          setDetailsModalOrder((prev) => ({ ...prev, ...res.order }));
        }
        setToast(res.message || 'Cancellation request updated successfully!');
        load();
      }
    } catch (err) {
      setToast(err.message || 'Failed to review cancellation');
      throw err;
    }
  };

  const handleProcessRefund = async (orderId, { notes, transactionRef }) => {
    try {
      const res = await api(`/admin/orders/${orderId}/cancellation/process-refund`, {
        method: 'POST',
        body: JSON.stringify({ notes, transactionRef })
      });
      if (res.ok && res.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.order_no === res.order.order_no ? { ...o, ...res.order } : o
          )
        );
        if (detailsModalOrder && (detailsModalOrder.id === orderId || detailsModalOrder.order_no === res.order.order_no)) {
          setDetailsModalOrder((prev) => ({ ...prev, ...res.order }));
        }
        setToast(res.message || 'Refund marked as Completed!');
        load();
      }
    } catch (err) {
      setToast(err.message || 'Failed to process refund');
      throw err;
    }
  };

  const load = async () => {
    setRefreshing(true);
    try {
      const [o, p, s, c, r, h, sr, hs] = await Promise.all([
        api('/admin/orders'),
        api('/admin/products'),
        api('/suggestions/admin').catch(() => []),
        api('/admin/coupons').catch(() => []),
        api('/admin/reviews').catch(() => ({ reviews: [], summary: {} })),
        api('/hall-of-fame/admin').catch(() => []),
        api('/showcase-reviews/admin').catch(() => []),
        api('/hero-slides/admin/all').catch(() => [])
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setAllProducts(Array.isArray(p) ? p : []);
      setSuggestions(Array.isArray(s) ? s : []);
      setCoupons(Array.isArray(c) ? c : []);
      setReviewsData(r && Array.isArray(r.reviews) ? r : { reviews: [], summary: {} });
      setHallOfFameStories(Array.isArray(h) ? h : []);
      setShowcaseReviews(Array.isArray(sr) ? sr : []);
      setHeroSlides(Array.isArray(hs) ? hs : []);
    } catch (e) {
      setToast(e.message || 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      setAllProducts(products);
    }
  }, [products]);

  // Derived Analytics Values
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const paymentVerificationCount = orders.filter(
      (o) =>
        o.payment_status === 'verification_pending' ||
        o.paymentStatus === 'verification_pending'
    ).length;
    const cancellationRequestsCount = orders.filter(
      (o) =>
        o.cancellation_status === 'cancellation_requested' ||
        o.cancellationStatus === 'cancellation_requested'
    ).length;
    const confirmedOrdersCount = orders.filter(
      (o) => o.order_status === 'confirmed' || o.orderStatus === 'confirmed'
    ).length;
    const makingOrdersCount = orders.filter(
      (o) => o.order_status === 'making' || o.orderStatus === 'making'
    ).length;
    const packingOrdersCount = orders.filter(
      (o) =>
        o.order_status === 'packing' ||
        o.orderStatus === 'packing' ||
        o.order_status === 'processing'
    ).length;
    const deliveredOrdersCount = orders.filter(
      (o) => o.order_status === 'delivered' || o.orderStatus === 'delivered'
    ).length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const activeCouponsCount = coupons.filter(
      (c) => c.status === 'active' || (c.is_active && (!c.expiry_date || new Date(c.expiry_date) > new Date()))
    ).length;

    return {
      totalOrders,
      paymentVerificationCount,
      cancellationRequestsCount,
      confirmedOrdersCount,
      makingOrdersCount,
      packingOrdersCount,
      deliveredOrdersCount,
      totalRevenue,
      activeCouponsCount
    };
  }, [orders, coupons]);

  // Handle Order Status Update (dropdown)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus, orderStatus: newStatus } : o))
      );

      if (detailsModalOrder && detailsModalOrder.id === orderId) {
        setDetailsModalOrder((prev) => ({
          ...prev,
          order_status: newStatus,
          orderStatus: newStatus
        }));
      }

      await api(`/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ orderStatus: newStatus })
      });

      setToast(`Order #${orders.find((o) => o.id === orderId)?.order_no || ''} updated to ${newStatus}`);
    } catch (err) {
      setToast(err.message || 'Failed to update order status');
      await load(); // Revert on failure
    }
  };

  // Handle Payment Verification Submission
  const handleVerifyPayment = async (orderId, { transactionId, paymentApp }) => {
    const result = await api(`/admin/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ transactionId, paymentApp })
    });

    const updatedOrder = result.order;

    // Immediately update local state
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              ...updatedOrder,
              payment_status: 'verified',
              paymentStatus: 'verified',
              order_status: 'confirmed',
              orderStatus: 'confirmed',
              payment_transaction_id: transactionId,
              paymentTransactionId: transactionId,
              upi_utr: transactionId,
              upiUtr: transactionId,
              payment_app: paymentApp,
              paymentApp: paymentApp,
              verified_at: new Date().toISOString(),
              verifiedAt: new Date(),
              verified_by: adminUser?.name || 'Admin',
              verifiedBy: adminUser?.name || 'Admin'
            }
          : o
      )
    );

    if (detailsModalOrder && detailsModalOrder.id === orderId) {
      setDetailsModalOrder((prev) => ({
        ...prev,
        payment_status: 'verified',
        paymentStatus: 'verified',
        order_status: 'confirmed',
        orderStatus: 'confirmed',
        payment_transaction_id: transactionId,
        payment_app: paymentApp,
        verified_at: new Date().toISOString(),
        verified_by: adminUser?.name || 'Admin'
      }));
    }

    setToast('✓ Payment verified! Order automatically updated to Confirmed.');
  };

  // Product Operations
  const saveProduct = async (e) => {
    e.preventDefault();
    const imagesList = Array.isArray(form.images) && form.images.length > 0
      ? form.images.filter(Boolean)
      : (form.img ? [form.img.trim()].filter(Boolean) : []);

    if (!form.name?.trim()) {
      return setToast('Please enter a product name');
    }
    if (!form.price || Number(form.price) <= 0) {
      return setToast('Please enter a valid product price');
    }
    if (imagesList.length === 0) {
      return setToast('Please upload at least 1 product photo');
    }

    setBusy(true);
    try {
      const path = editing ? `/admin/products/${editing.id}` : '/admin/products';
      await api(path, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          category: form.category || 'Traditional',
          tag: form.tag || (form.isBestseller ? 'BESTSELLER' : 'NEW'),
          img: imagesList[0] || form.img,
          images: imagesList,
          productParameters: Array.isArray(form.productParameters) ? form.productParameters : [],
          price: Number(form.price),
          stock: Number(form.stock !== undefined ? form.stock : 10),
          active: form.active !== undefined ? Number(form.active) : 1,
          isBestseller: Boolean(form.isBestseller)
        })
      });

      setToast(editing ? `✓ "${form.name}" updated successfully` : `✓ "${form.name}" added to catalogue!`);
      setForm(emptyForm);
      setEditing(null);
      await load();
      if (refreshProducts) refreshProducts();
      setTab('products');
    } catch (e) {
      setToast(e.message || 'Failed to save product');
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name || 'this product'}"?\n\nThis will completely remove it from the database.`)) {
      return;
    }
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' });
      setToast(`Product "${name || ''}" permanently deleted from database`);
      await load();
      if (refreshProducts) refreshProducts();
    } catch (e) {
      setToast(e.message);
    }
  };

  const toggleProductActive = async (p) => {
    const nextActive = p.active ? 0 : 1;
    try {
      await api(`/admin/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: nextActive })
      });
      setToast(nextActive ? `"${p.name}" is now Live in store` : `"${p.name}" is now Hidden from store`);
      await load();
      if (refreshProducts) refreshProducts();
    } catch (e) {
      setToast(e.message);
    }
  };

  const toggleProductBestseller = async (p) => {
    const nextBestseller = !(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER');
    try {
      await api(`/admin/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isBestseller: nextBestseller,
          tag: nextBestseller ? 'BESTSELLER' : (p.tag === 'BESTSELLER' ? 'NEW' : p.tag)
        })
      });
      setToast(
        nextBestseller
          ? `⭐ "${p.name}" added to Homepage Bestsellers!`
          : `"${p.name}" removed from Homepage Bestsellers.`
      );
      await load();
      if (refreshProducts) refreshProducts();
    } catch (e) {
      setToast(e.message);
    }
  };

  const editProduct = (p) => {
    const images = Array.isArray(p.images) && p.images.length > 0
      ? p.images.filter(Boolean)
      : (p.img ? [p.img.trim()].filter(Boolean) : []);

    setEditing(p);
    setForm({
      name: p.name || '',
      price: p.price || '',
      category: p.category || 'Traditional',
      tag: p.tag || (p.isBestseller ? 'BESTSELLER' : 'NEW'),
      img: p.img || images[0] || '',
      images: images,
      description: p.description || '',
      productParameters: Array.isArray(p.productParameters) ? p.productParameters : [],
      stock: p.stock !== undefined ? p.stock : 10,
      active: p.active !== undefined ? p.active : 1,
      isBestseller: Boolean(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER')
    });
    setTab('products');
    const formElement = document.getElementById('adminProductFormTop');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateSuggestion = async (id, status, notes) => {
    try {
      await api(`/suggestions/admin/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
      await load();
      setToast('Suggestion updated');
    } catch (e) {
      setToast(e.message);
    }
  };

  const uploadImage = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setToast('Optimizing & preparing photo…');
      const optimizedFile = await compressImage(file);
      const fd = new FormData();
      fd.append('image', optimizedFile);
      const r = await api('/admin/upload', {
        method: 'POST',
        body: fd
      });
      setForm((f) => {
        const currentList = Array.isArray(f.images) ? [...f.images.filter(Boolean)] : (f.img ? [f.img] : []);
        const baseList = (currentList.length === 1 && currentList[0] === '/assets/thushi.jpg')
          ? []
          : currentList;
        const updated = [...baseList, r.url].slice(0, 10);
        return { ...f, img: updated[0] || r.url, images: updated };
      });
      setToast('✓ Photo uploaded & watermarked successfully');
    } catch (err) {
      setToast(err.message || 'Failed to upload photo');
    } finally {
      setBusy(false);
    }
  };

  const uploadMultipleImages = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const optimizedFiles = await compressMultipleImages(files, {}, (current, total) => {
        setToast(`Optimizing photo ${current} of ${total}…`);
      });

      const fd = new FormData();
      optimizedFiles.forEach((f) => fd.append('images', f));

      const r = await api('/admin/upload-multiple', {
        method: 'POST',
        body: fd
      });
      const newUrls = r.urls || (r.url ? [r.url] : []);
      setForm((prev) => {
        const currentList = Array.isArray(prev.images) ? [...prev.images.filter(Boolean)] : (prev.img ? [prev.img] : []);
        const baseList = (currentList.length === 1 && currentList[0] === '/assets/thushi.jpg')
          ? []
          : currentList;
        const combined = [...baseList, ...newUrls].slice(0, 10);
        return {
          ...prev,
          images: combined,
          img: combined[0] || ''
        };
      });
      setToast(`✓ ${newUrls.length} photo(s) uploaded & watermarked!`);
    } catch (err) {
      setToast(err.message || 'Failed to upload images');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page admin">
      {/* Top Header */}
      <div className="adminHeader">
        <div>
          <span className="eyebrow">NATHSHIKHA STUDIO CONTROL CENTER</span>
          <h1>Admin Dashboard</h1>
          <p>
            Welcome back, <b>{adminUser?.name || 'Studio Admin'}</b>. Operational overview and order fulfilment.
          </p>
        </div>
        <div className="adminHeaderActions">
          <button
            className="goldBtn createOrderActionBtn"
            onClick={() => setShowCreateOrderModal(true)}
            type="button"
            title="Create a new customer order manually"
          >
            <Plus size={15} />
            <span>+ CREATE ORDER</span>
          </button>
          <button
            className="outlineBtn refreshActionBtn"
            onClick={load}
            disabled={refreshing}
            type="button"
          >
            <RefreshCw className={refreshing ? 'spinIcon' : ''} size={15} />
            <span>{refreshing ? 'REFRESHING…' : 'REFRESH'}</span>
          </button>
          <button className="outlineBtn" onClick={logoutAdmin} type="button">
            <LogOut size={15} /> <span>LOG OUT</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="adminTabs">
        <button
          className={tab === 'control_center' ? 'active' : ''}
          onClick={() => setTab('control_center')}
          type="button"
        >
          <Layers size={15} />
          <span>Operational Control Center</span>
          {analytics.paymentVerificationCount > 0 && (
            <b className="tabAlertBadge">{analytics.paymentVerificationCount}</b>
          )}
        </button>

        <button
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
          type="button"
        >
          <ShoppingBag size={15} />
          <span>Products Catalogue ({allProducts.length})</span>
        </button>

        <button
          className={tab === 'parameters' ? 'active' : ''}
          onClick={() => setTab('parameters')}
          type="button"
        >
          <SlidersHorizontal size={15} />
          <span>Parameter Library</span>
        </button>

        <button
          className={tab === 'coupons' ? 'active' : ''}
          onClick={() => setTab('coupons')}
          type="button"
        >
          <Tag size={15} />
          <span>Coupons & Offers ({coupons.length})</span>
          {analytics.activeCouponsCount > 0 && <b>{analytics.activeCouponsCount}</b>}
        </button>

        <button
          className={tab === 'reviews' ? 'active' : ''}
          onClick={() => setTab('reviews')}
          type="button"
        >
          <Star size={15} />
          <span>Customer Reviews ({reviewsData.reviews?.length || 0})</span>
          {reviewsData.summary?.averageRating > 0 && (
            <b>{reviewsData.summary.averageRating}★</b>
          )}
        </button>

        <button
          className={tab === 'showcase_reviews' ? 'active' : ''}
          onClick={() => setTab('showcase_reviews')}
          type="button"
        >
          <MessageSquareQuote size={15} />
          <span>Homepage Showcase / Google ({showcaseReviews.length})</span>
        </button>

        <button
          className={tab === 'suggestions' ? 'active' : ''}
          onClick={() => setTab('suggestions')}
          type="button"
        >
          <Lightbulb size={15} />
          <span>Design Requests & Ideas</span>
          {suggestions.length > 0 && <b>{suggestions.length}</b>}
        </button>

        <button
          className={tab === 'hall_of_fame' ? 'active' : ''}
          onClick={() => setTab('hall_of_fame')}
          type="button"
        >
          <Camera size={15} />
          <span>Hall of Fame / Our Brides ({hallOfFameStories.length})</span>
        </button>

        <button
          className={tab === 'hero_showcase' ? 'active' : ''}
          onClick={() => setTab('hero_showcase')}
          type="button"
        >
          <Sparkles size={15} />
          <span>Hero Banners ({heroSlides.length || 3})</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL CONTROL CENTER */}
      {tab === 'control_center' && (
        <div className="controlCenterView">
          {/* 1. Analytics / Summary Cards */}
          <AdminStats
            totalOrders={analytics.totalOrders}
            paymentVerificationCount={analytics.paymentVerificationCount}
            cancellationRequestsCount={analytics.cancellationRequestsCount}
            confirmedOrdersCount={analytics.confirmedOrdersCount}
            makingOrdersCount={analytics.makingOrdersCount}
            packingOrdersCount={analytics.packingOrdersCount}
            deliveredOrdersCount={analytics.deliveredOrdersCount}
            totalRevenue={analytics.totalRevenue}
            activeCouponsCount={analytics.activeCouponsCount}
            onCardClick={(targetFilter) => {
              if (targetFilter === 'coupons_tab') {
                setTab('coupons');
              } else {
                setOrderFilter(targetFilter);
              }
            }}
          />

          {/* 2. Cancellation Requests Attention Area */}
          {analytics.cancellationRequestsCount > 0 && (
            <div className="cancellationAttentionBanner">
              <div className="attentionIconWrap iconAmber">
                <AlertTriangle size={24} />
              </div>
              <div className="attentionText">
                <h4>Cancellation Requests ({analytics.cancellationRequestsCount})</h4>
                <p>
                  <b>{analytics.cancellationRequestsCount}</b> customer cancellation {analytics.cancellationRequestsCount === 1 ? 'request requires' : 'requests require'} review and refund approval.
                </p>
              </div>
              <button
                type="button"
                className="goldBtn attentionActionBtn cancelActionBtn"
                onClick={() => {
                  setOrderFilter('cancellation_requested');
                  document.querySelector('.adminOrdersSection')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Review Cancellations ({analytics.cancellationRequestsCount})</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* 3. Payment Verification Attention Area */}
          {analytics.paymentVerificationCount > 0 ? (
            <div className="paymentAttentionBanner">
              <div className="attentionIconWrap">
                <ShieldAlert size={24} />
              </div>
              <div className="attentionText">
                <h4>Payment Verification Pending</h4>
                <p>
                  <b>{analytics.paymentVerificationCount}</b> orders require payment verification. Verify the transaction IDs to confirm orders.
                </p>
              </div>
              <button
                type="button"
                className="goldBtn attentionActionBtn"
                onClick={() => {
                  setOrderFilter('verification_pending');
                  document.querySelector('.adminOrdersSection')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Review Payments ({analytics.paymentVerificationCount})</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="allClearBanner">
              <CheckCircle2 size={18} />
              <span>All customer payments are reviewed and up to date.</span>
            </div>
          )}

          {/* 4. Main Orders Table */}
          <AdminOrderList
            orders={orders}
            filter={orderFilter}
            setFilter={setOrderFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            updateOrderStatus={handleUpdateOrderStatus}
            onVerifyPaymentClick={(order) => setVerifyModalOrder(order)}
            onViewOrderClick={(order) => setDetailsModalOrder(order)}
            onOpenShipmentModal={(order, isEdit) => {
              setShipmentModalOrder(order);
              setIsEditingShipment(isEdit);
            }}
            onReviewCancellationClick={(order) => setCancellationModalOrder(order)}
          />

          {/* 5. Shipment Details Table */}
          <AdminShipmentTable
            orders={orders}
            onEditShipment={(order) => {
              setShipmentModalOrder(order);
              setIsEditingShipment(true);
            }}
            onViewOrder={(order) => setDetailsModalOrder(order)}
          />
        </div>
      )}

      {/* TAB 2: PRODUCTS CATALOGUE */}
      {tab === 'products' && (
        <div className="adminTwoCol">
          <AdminProductForm
            form={form}
            setForm={setForm}
            editing={editing}
            setEditing={setEditing}
            saveProduct={saveProduct}
            uploadImage={uploadImage}
            uploadMultipleImages={uploadMultipleImages}
            busy={busy}
            emptyForm={emptyForm}
          />
          <AdminProductList
            allProducts={allProducts}
            editProduct={editProduct}
            removeProduct={removeProduct}
            toggleProductActive={toggleProductActive}
            toggleProductBestseller={toggleProductBestseller}
          />
        </div>
      )}

      {/* TAB: MASTER PARAMETER LIBRARY */}
      {tab === 'parameters' && (
        <div className="adminParametersView">
          <AdminParameterManager />
        </div>
      )}

      {/* TAB 3: CUSTOMER DESIGN SUGGESTIONS */}
      {tab === 'suggestions' && (
        <div className="adminCard">
          <div className="cardHeading">
            <h3>Customer Design Ideas & Suggestions</h3>
            <span>{suggestions.length} total received</span>
          </div>

          {suggestions.length > 0 ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #e7ddc8',
                    padding: 18,
                    borderRadius: 6,
                    background: '#fffdf9',
                    display: 'grid',
                    gap: 10
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div>
                      <span
                        className="eyebrow"
                        style={{ color: 'var(--maroon)', fontSize: 10 }}
                      >
                        {s.category}
                      </span>
                      <h4
                        style={{
                          margin: '4px 0',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 16,
                          color: 'var(--char)'
                        }}
                      >
                        {s.title}
                      </h4>
                      <div style={{ fontSize: 12, color: '#7a6b65' }}>
                        By <b>{s.name}</b> · {s.email} ·{' '}
                        <a
                          href={`https://wa.me/${s.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                            s.name
                          )}%2C%20regarding%20your%20Nathshikha%20design%20suggestion`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#128c7e',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 600
                          }}
                        >
                          <MessageSquare size={12} /> {s.phone}
                        </a>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={s.status}
                        onChange={(e) => updateSuggestion(s.id, e.target.value, s.admin_notes)}
                        style={{
                          fontSize: 12,
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #c9bcae'
                        }}
                      >
                        <option value="new">New</option>
                        <option value="in_review">In Review</option>
                        <option value="planned">Planned</option>
                        <option value="launched">Launched</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#4a3c36', lineHeight: 1.5 }}>
                    {s.description}
                  </p>

                  {s.admin_notes && (
                    <div
                      style={{
                        background: '#f4ede2',
                        padding: 8,
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#6d1b29'
                      }}
                    >
                      <b>Admin Notes:</b> {s.admin_notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="outlineBtn"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => {
                        const note = window.prompt('Update admin notes:', s.admin_notes || '');
                        if (note !== null) updateSuggestion(s.id, s.status, note);
                      }}
                    >
                      Edit Notes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty small">
              <Lightbulb size={32} color="var(--gold)" />
              <p>No customer design suggestions submitted yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COUPONS & DISCOUNTS */}
      {tab === 'coupons' && (
        <AdminCouponManager
          coupons={coupons}
          onCouponUpdated={load}
          setToast={setToast}
        />
      )}

      {/* TAB 5: CUSTOMER REVIEWS */}
      {tab === 'reviews' && (
        <AdminReviewManager
          reviewsData={reviewsData}
          onReviewUpdated={load}
          setToast={setToast}
        />
      )}

      {/* TAB 5B: HOMEPAGE SHOWCASE & GOOGLE REVIEWS */}
      {tab === 'showcase_reviews' && (
        <AdminShowcaseReviewManager
          reviews={showcaseReviews}
          onRefresh={load}
          setToast={setToast}
        />
      )}

      {/* TAB 6: HALL OF FAME / OUR BRIDES */}
      {tab === 'hall_of_fame' && (
        <AdminHallOfFameManager
          stories={hallOfFameStories}
          onRefresh={load}
          loading={refreshing}
        />
      )}

      {/* TAB 7: HERO SHOWCASE BANNERS */}
      {tab === 'hero_showcase' && (
        <AdminHeroManager
          slides={heroSlides}
          onRefresh={load}
          loading={refreshing}
        />
      )}

      {/* Payment Verification Modal */}
      <AdminPaymentVerificationModal
        order={verifyModalOrder}
        isOpen={Boolean(verifyModalOrder)}
        onClose={() => setVerifyModalOrder(null)}
        onVerify={handleVerifyPayment}
      />

      {/* Full Order Details Modal */}
      <AdminOrderDetailsModal
        order={detailsModalOrder}
        isOpen={Boolean(detailsModalOrder)}
        onClose={() => setDetailsModalOrder(null)}
        onVerifyPaymentClick={(order) => setVerifyModalOrder(order)}
        onEditShipmentClick={(order, isEdit) => {
          setShipmentModalOrder(order);
          setIsEditingShipment(isEdit);
        }}
        onStatusChange={handleUpdateOrderStatus}
        onReviewCancellationClick={(order) => setCancellationModalOrder(order)}
      />

      {/* Manual Order Creation Modal */}
      <AdminCreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onOrderCreated={handleOrderCreated}
        products={allProducts}
      />

      {/* Shipment Details Modal */}
      <AdminShipmentModal
        order={shipmentModalOrder}
        isOpen={Boolean(shipmentModalOrder)}
        onClose={() => setShipmentModalOrder(null)}
        onSaveShipment={handleSaveShipment}
        isEditing={isEditingShipment}
      />

      {/* Admin Cancellation Review & Refund Modal */}
      <AdminCancellationModal
        isOpen={Boolean(cancellationModalOrder)}
        onClose={() => setCancellationModalOrder(null)}
        order={cancellationModalOrder}
        onReviewCancellation={handleReviewCancellation}
        onProcessRefund={handleProcessRefund}
      />
    </main>
  );
}
