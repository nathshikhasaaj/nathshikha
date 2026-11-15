import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  Box,
  Truck,
  Boxes,
  Calendar,
  Trash2,
  Loader2,
  ShieldAlert,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
  Flame,
  Check,
  Edit3
} from 'lucide-react';
import {
  money,
  getOrderAgeInDays,
  formatOrderAge,
  formatOrderDate,
  formatWhatsAppPhone
} from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import {
  calculateOrderPriority,
  categorizeOrders,
  PRIORITY_LEVELS,
  PRIORITY_RANKS
} from '../../utils/orderPriorityEngine';
import AdminDropdown from './AdminDropdown';
import AdminOrderPriorityModal from './AdminOrderPriorityModal';
import './AdminOrderList.css';

export default function AdminOrderList({
  orders = [],
  filter = 'all',
  setFilter,
  searchQuery = '',
  setSearchQuery,
  updateOrderStatus,
  onVerifyPaymentClick,
  onViewOrderClick,
  onOpenShipmentModal,
  onReviewCancellationClick,
  onDeleteOrder,
  onOpenCreateAssistedOrder,
  onOrderUpdated
}) {
  const [sortBy, setSortBy] = useState('newest');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Layout / Scroll refs
  const tabsBarRef = useRef(null);
  const ordersContainerRef = useRef(null);

  // Modals state
  const [priorityModalOrder, setPriorityModalOrder] = useState(null);
  const [deleteModalOrder, setDeleteModalOrder] = useState(null);
  const [deleteReasonType, setDeleteReasonType] = useState('Duplicate order');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [deleteReasonError, setDeleteReasonError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Categorize and compute intelligence metrics across all orders
  const { processedOrders, counts } = useMemo(() => {
    return categorizeOrders(orders);
  }, [orders]);

  // Handle status update
  const handleStatusChange = (order, newStatus) => {
    if (newStatus === 'shipped') {
      if (onOpenShipmentModal) {
        onOpenShipmentModal(order, Boolean(order.shipment_partner || order.tracking_id));
      }
      return;
    }
    updateOrderStatus(order.id || order._id, newStatus);
  };

  const getProductCode = (item, order, index) => {
    if (item.itemType === 'free_gift' || item.item_type === 'free_gift' || item.name === 'Free Complimentary Gift') {
      return 'FREE-GIFT';
    }
    if (item.itemType === 'custom' || item.item_type === 'custom' || order.order_type === 'custom' || order.orderType === 'custom') {
      return `CUSTOM-${String(index + 1).padStart(2, '0')}`;
    }
    if (item.productCode) return String(item.productCode);
    if (item.sku) return String(item.sku);
    if (item.productId) {
      return `PRD-${String(item.productId).slice(-6).toUpperCase()}`;
    }
    if (item.id) {
      return `PRD-${String(item.id).slice(-6).toUpperCase()}`;
    }
    return `PRD-${String(order.order_no || order.orderNo).slice(-4)}-${index + 1}`;
  };

  // Filter Pipeline
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      const meta = o._priorityMeta;
      const orderStatus = String(o.order_status || o.orderStatus || 'placed').toLowerCase();

      // 1. Primary Operational Queue Filter
      if (filter === 'needs_attention') {
        if (!meta.isNeedsAttention) return false;
      } else if (filter === 'urgent_critical') {
        if (!meta.isUrgentOrCritical) return false;
      } else if (filter === 'verification_pending') {
        if (meta.primaryQueue !== 'payment_pending') return false;
      } else if (filter === 'to_process') {
        if (orderStatus !== 'confirmed') return false;
      } else if (filter === 'making') {
        if (orderStatus !== 'making') return false;
      } else if (filter === 'packing') {
        if (orderStatus !== 'packing' && orderStatus !== 'processing') return false;
      } else if (filter === 'shipped') {
        if (orderStatus !== 'shipped') return false;
      } else if (filter === 'delivered') {
        if (orderStatus !== 'delivered') return false;
      } else if (filter === 'cancelled') {
        if (!meta.isCancelled) return false;
      } else if (filter === 'cancellation_requested') {
        if (o.cancellation_status !== 'cancellation_requested' && o.cancellationStatus !== 'cancellation_requested') {
          return false;
        }
      } else if (filter === 'assisted') {
        const isAssisted =
          o.assisted_order?.is_assisted ||
          o.assistedOrder?.isAssisted ||
          orderStatus === 'payment_pending';
        if (!isAssisted) return false;
      }

      // 2. Secondary Priority Filter
      if (priorityFilter !== 'ALL' && meta.level !== priorityFilter) {
        return false;
      }

      // 3. Secondary Order Type Filter
      if (orderTypeFilter !== 'ALL') {
        const isCustom = o.order_type === 'custom' || o.orderType === 'custom';
        const isAssisted = o.assisted_order?.is_assisted || o.assistedOrder?.isAssisted;
        const isGift = Boolean(o.is_gift || o.isGift);

        if (orderTypeFilter === 'CUSTOM' && !isCustom) return false;
        if (orderTypeFilter === 'REGULAR' && isCustom) return false;
        if (orderTypeFilter === 'ASSISTED' && !isAssisted) return false;
        if (orderTypeFilter === 'GIFT' && !isGift) return false;
      }

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderNo = String(o.order_no || o.orderNo || '').toLowerCase();
        const name = String(o.recipient_name || o.name || '').toLowerCase();
        const custName = String(o.customer_name || o.customerName || '').toLowerCase();
        const phone = String(o.phone || o.customerPhone || '');
        const email = String(o.customer_email || o.email || '').toLowerCase();
        const txId = String(o.payment_transaction_id || o.upi_utr || '').toLowerCase();
        const group = String(o.shipment_group_code || o.shipmentGroupCode || '').toLowerCase();
        const track = String(o.tracking_id || o.trackingId || '').toLowerCase();

        const itemMatch = (o.items || []).some((i) =>
          String(i.name || '').toLowerCase().includes(q)
        );

        const matches =
          orderNo.includes(q) ||
          name.includes(q) ||
          custName.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          txId.includes(q) ||
          group.includes(q) ||
          track.includes(q) ||
          itemMatch;

        if (!matches) return false;
      }

      return true;
    });
  }, [processedOrders, filter, priorityFilter, orderTypeFilter, searchQuery]);

  // Sort Pipeline: Default to strict createdAt DESC (Newest Created First)
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];

    return list.sort((a, b) => {
      const metaA = a._priorityMeta;
      const metaB = b._priorityMeta;
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();

      if (sortBy === 'newest') {
        if (timeB !== timeA) return timeB - timeA;
        const idA = String(a.order_no || a.orderNo || a.id || a._id || '');
        const idB = String(b.order_no || b.orderNo || b.id || b._id || '');
        return idB.localeCompare(idA);
      }

      if (sortBy === 'oldest') {
        if (timeA !== timeB) return timeA - timeB;
        const idA = String(a.order_no || a.orderNo || a.id || a._id || '');
        const idB = String(b.order_no || b.orderNo || b.id || b._id || '');
        return idA.localeCompare(idB);
      }

      if (sortBy === 'priority_first') {
        // Sort primarily by priority rank (Critical=4, High=3, Medium=2, Normal=1, NoAction=0)
        if (metaA.rank !== metaB.rank) {
          return metaB.rank - metaA.rank;
        }
        // Within same rank, older production age comes first
        return metaB.productionAgeDays - metaA.productionAgeDays;
      }

      if (sortBy === 'delay_desc') {
        // Longest production aging first
        return metaB.productionAgeDays - metaA.productionAgeDays;
      }

      if (sortBy === 'sla_earliest') {
        // Earliest deadline first
        const slaA = metaA.expectedDeliveryDate ? new Date(metaA.expectedDeliveryDate).getTime() : 9999999999999;
        const slaB = metaB.expectedDeliveryDate ? new Date(metaB.expectedDeliveryDate).getTime() : 9999999999999;
        return slaA - slaB;
      }

      if (sortBy === 'amount_desc') {
        const amtA = Number(a.total_amount ?? a.totalPrice ?? a.final_amount ?? a.total ?? 0);
        const amtB = Number(b.total_amount ?? b.totalPrice ?? b.final_amount ?? b.total ?? 0);
        return amtB - amtA;
      }

      if (sortBy === 'customer_asc') {
        const nameA = String(a.name || a.customer?.name || '').toLowerCase();
        const nameB = String(b.name || b.customer?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }

      // Default fallback: newest created first
      return timeB - timeA;
    });
  }, [filteredOrders, sortBy]);

  // Reset to page 1 whenever filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, priorityFilter, orderTypeFilter, searchQuery, sortBy, pageSize]);

  // Ensure active queue tab smoothly scrolls into view when selected
  useEffect(() => {
    if (tabsBarRef.current) {
      const activeBtn = tabsBarRef.current.querySelector('.queueTabBtn.active');
      if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [filter]);

  // Page navigation helper with smooth scroll to table top
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (ordersContainerRef.current) {
      ordersContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pagination calculation
  const totalItems = sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, safeCurrentPage, pageSize]);

  // Priority options for dropdown
  const priorityDropdownOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: PRIORITY_LEVELS.CRITICAL, label: '🚨 Critical Priority', color: '#b91c1c' },
    { value: PRIORITY_LEVELS.HIGH, label: '🔴 High Priority', color: '#d97706' },
    { value: PRIORITY_LEVELS.MEDIUM, label: '🟡 Medium Priority', color: '#b45309' },
    { value: PRIORITY_LEVELS.NORMAL, label: '🟢 Normal Priority', color: '#15803d' },
    { value: PRIORITY_LEVELS.NO_ACTION, label: '⚪ No Action / Completed', color: '#6b7280' }
  ];

  const orderTypeDropdownOptions = [
    { value: 'ALL', label: 'All Order Types' },
    { value: 'REGULAR', label: 'Regular Orders' },
    { value: 'CUSTOM', label: '✨ Bespoke Custom Orders' },
    { value: 'ASSISTED', label: '✦ Assisted Checkout Orders' },
    { value: 'GIFT', label: '🎁 Gift Wrapped Orders' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Sort: Newest Created First' },
    { value: 'priority_first', label: 'Sort: Highest Priority First' },
    { value: 'delay_desc', label: 'Sort: Longest Production Delay' },
    { value: 'sla_earliest', label: 'Sort: Delivery Deadline' },
    { value: 'oldest', label: 'Sort: Oldest First' },
    { value: 'amount_desc', label: 'Sort: Order Total (High to Low)' },
    { value: 'customer_asc', label: 'Sort: Customer Name (A-Z)' }
  ];

  const pageSizeOptions = [
    { value: 10, label: '10 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' },
    { value: 100, label: '100 / page' }
  ];

  const hasActiveSecondaryFilters =
    priorityFilter !== 'ALL' ||
    orderTypeFilter !== 'ALL' ||
    sortBy !== 'newest' ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setFilter('all');
    setPriorityFilter('ALL');
    setOrderTypeFilter('ALL');
    setSearchQuery('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handleNextActionClick = (e, order, nextAction) => {
    e.stopPropagation();
    switch (nextAction.key) {
      case 'verify_payment':
        if (onVerifyPaymentClick) onVerifyPaymentClick(order);
        break;
      case 'review_cancellation':
        if (onReviewCancellationClick) onReviewCancellationClick(order);
        break;
      case 'start_making':
        handleStatusChange(order, 'making');
        break;
      case 'start_packing':
        handleStatusChange(order, 'packing');
        break;
      case 'ship_order':
        if (onOpenShipmentModal) onOpenShipmentModal(order, false);
        break;
      case 'track_shipment':
      case 'confirm_order':
      default:
        if (onViewOrderClick) onViewOrderClick(order);
        break;
    }
  };

  return (
    <div className="adminOrdersSection">
      {/* ========================================================================= */}
      {/* 1. SMART OPERATIONAL PRIORITY DASHBOARD (SUMMARY CARDS)                   */}
      {/* ========================================================================= */}
      <section className="orderSummaryKpiGrid" aria-label="Order Operations Overview">
        <div
          className={`orderKpiCard ${filter === 'all' ? 'activeCard' : ''}`}
          onClick={() => setFilter('all')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon totalIcon">
            <Package size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Total Orders</span>
            <span className="orderKpiVal">{counts.total}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'urgent_critical' ? 'activeCard' : ''} ${counts.critical > 0 ? 'kpiAlertPulsing' : ''}`}
          onClick={() => setFilter('urgent_critical')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon criticalIcon">
            <Flame size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Critical / Urgent</span>
            <span className="orderKpiVal criticalVal">{counts.critical + counts.high}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'needs_attention' ? 'activeCard' : ''}`}
          onClick={() => setFilter('needs_attention')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon attentionIcon">
            <ShieldAlert size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Needs Attention</span>
            <span className="orderKpiVal attentionVal">{counts.needsAttention}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'verification_pending' ? 'activeCard' : ''}`}
          onClick={() => setFilter('verification_pending')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon paymentIcon">
            <Clock size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Payment Verification</span>
            <span className="orderKpiVal paymentVal">{counts.paymentPending}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'making' ? 'activeCard' : ''}`}
          onClick={() => setFilter('making')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon makingIcon">
            <Sparkles size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">In Production</span>
            <span className="orderKpiVal makingVal">{counts.inProduction}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'packing' ? 'activeCard' : ''}`}
          onClick={() => setFilter('packing')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon packingIcon">
            <Box size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Ready to Ship</span>
            <span className="orderKpiVal packingVal">{counts.readyToShip}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'shipped' ? 'activeCard' : ''}`}
          onClick={() => setFilter('shipped')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon shippedIcon">
            <Truck size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">In Transit</span>
            <span className="orderKpiVal shippedVal">{counts.shipped}</span>
          </div>
        </div>

        <div
          className={`orderKpiCard ${filter === 'delivered' ? 'activeCard' : ''}`}
          onClick={() => setFilter('delivered')}
          role="button"
          tabIndex={0}
        >
          <div className="orderKpiIcon deliveredIcon">
            <CheckCircle2 size={18} />
          </div>
          <div className="orderKpiContent">
            <span className="orderKpiLabel">Delivered</span>
            <span className="orderKpiVal deliveredVal">{counts.delivered}</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. OPERATIONAL QUEUES (TABS)                                              */}
      {/* ========================================================================= */}
      <div className="operationalQueuesBar" ref={tabsBarRef}>
        <button
          type="button"
          className={`queueTabBtn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders <span className="tabCountBadge">{counts.total}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn tabAttention ${filter === 'needs_attention' ? 'active' : ''} ${counts.needsAttention > 0 ? 'hasAction' : ''}`}
          onClick={() => setFilter('needs_attention')}
        >
          ⚡ Needs Attention
          {counts.needsAttention > 0 && (
            <span className="tabCountBadge badgeAmber">{counts.needsAttention}</span>
          )}
        </button>

        <button
          type="button"
          className={`queueTabBtn tabUrgent ${filter === 'urgent_critical' ? 'active' : ''} ${(counts.critical + counts.high) > 0 ? 'hasCritical' : ''}`}
          onClick={() => setFilter('urgent_critical')}
        >
          🚨 Urgent & Critical
          {(counts.critical + counts.high) > 0 && (
            <span className="tabCountBadge badgeRed">{counts.critical + counts.high}</span>
          )}
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'verification_pending' ? 'active' : ''}`}
          onClick={() => setFilter('verification_pending')}
        >
          ⚠️ Payment Verification
          {counts.paymentPending > 0 && (
            <span className="tabCountBadge badgeAmber">{counts.paymentPending}</span>
          )}
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'to_process' ? 'active' : ''}`}
          onClick={() => setFilter('to_process')}
        >
          ✦ Confirmed <span className="tabCountBadge">{counts.toProcess}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'making' ? 'active' : ''}`}
          onClick={() => setFilter('making')}
        >
          ✨ In Production <span className="tabCountBadge">{counts.inProduction}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'packing' ? 'active' : ''}`}
          onClick={() => setFilter('packing')}
        >
          📦 Ready to Ship <span className="tabCountBadge">{counts.readyToShip}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'shipped' ? 'active' : ''}`}
          onClick={() => setFilter('shipped')}
        >
          🚚 In Transit <span className="tabCountBadge">{counts.shipped}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'delivered' ? 'active' : ''}`}
          onClick={() => setFilter('delivered')}
        >
          ✓ Delivered <span className="tabCountBadge">{counts.delivered}</span>
        </button>

        <button
          type="button"
          className={`queueTabBtn ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          ✕ Cancelled <span className="tabCountBadge">{counts.cancelled}</span>
        </button>

        {counts.cancellationRequests > 0 && (
          <button
            type="button"
            className={`queueTabBtn tabDanger ${filter === 'cancellation_requested' ? 'active' : ''}`}
            onClick={() => setFilter('cancellation_requested')}
          >
            🚨 Cancellation Review
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTROLS TOOLBAR: SEARCH & ADVANCED FILTERS                            */}
      {/* ========================================================================= */}
      <div className="orderControlsToolbar">
        <div className="orderSearchWrap">
          <Search size={16} className="searchMagnifier" />
          <input
            type="text"
            className="orderSearchInput"
            placeholder="Search by #order, customer name, phone, email, piece, Tx ID, tracking ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="orderFilterDropdownsRow">
          {/* Priority Filter */}
          <div className="filterItemWrap">
            <span className="filterItemLabel">Priority:</span>
            <AdminDropdown
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityDropdownOptions}
              minWidth="160px"
              placeholder="All Priorities"
            />
          </div>

          {/* Order Type Filter */}
          <div className="filterItemWrap">
            <span className="filterItemLabel">Type:</span>
            <AdminDropdown
              value={orderTypeFilter}
              onChange={setOrderTypeFilter}
              options={orderTypeDropdownOptions}
              minWidth="170px"
              placeholder="All Types"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="filterItemWrap">
            <span className="filterItemLabel">Sort:</span>
            <AdminDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              minWidth="190px"
              placeholder="Sort By"
            />
          </div>

          {/* Assisted Order Action Button */}
          {onOpenCreateAssistedOrder && (
            <button
              type="button"
              className="goldBtn assistedActionBtn"
              onClick={onOpenCreateAssistedOrder}
              title="Create assisted checkout order for a customer"
            >
              <Sparkles size={14} />
              <span>+ Assisted Order</span>
            </button>
          )}

          {/* Reset Filters Button */}
          {hasActiveSecondaryFilters && (
            <button
              type="button"
              className="resetOrderFiltersBtn"
              onClick={resetAllFilters}
              title="Reset all filters and search"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ORDERS TABLE / CARDS CONTAINER                                         */}
      {/* ========================================================================= */}
      <div className="orderTableCardContainer" ref={ordersContainerRef}>
        <div className="orderTableHeaderMeta">
          <div className="orderHeaderTitleGroup">
            <h3>
              {filter === 'all'
                ? 'All Orders Database'
                : filter === 'needs_attention'
                ? 'Orders Requiring Attention'
                : filter === 'urgent_critical'
                ? 'Urgent & Critical Orders'
                : filter === 'verification_pending'
                ? 'Awaiting Payment Verification'
                : filter === 'to_process'
                ? 'To Be Processed (Confirmed)'
                : filter === 'making'
                ? 'In Production (Artisan Crafting)'
                : filter === 'packing'
                ? 'Ready to Ship (Packaging)'
                : filter === 'shipped'
                ? 'Dispatched & In Transit'
                : filter === 'delivered'
                ? 'Delivered Orders'
                : `${filter.toUpperCase()} Orders`}
            </h3>
            <span className="orderQueueSubText">
              Real-time SLA monitoring · Automatic production delay detection · Guaranteed isolation
            </span>
          </div>

          <div className="orderHeaderResultCount">
            Showing <b>{(safeCurrentPage - 1) * pageSize + 1}</b>–
            <b>{Math.min(safeCurrentPage * pageSize, totalItems)}</b> of <b>{totalItems}</b> orders
            {totalItems !== orders.length && (
              <span className="filteredTotalNote"> (filtered from {orders.length})</span>
            )}
          </div>
        </div>

        {paginatedOrders.length > 0 ? (
          <>
            {/* DESKTOP ORDERS TABLE (>= 768px) */}
            <div className="orderTableScrollWrap desktopOnlyTable">
              <table className="enterpriseOrderTable">
                <thead>
                  <tr>
                    <th className="thOrderNo">Order Details</th>
                    <th className="thCustomer">Customer</th>
                    <th className="thItems">Items & Value</th>
                    <th className="thTimeline">Aging & SLA</th>
                    <th className="thStage">Current Stage</th>
                    <th className="thPriority">Priority Status</th>
                    <th className="thNextAction">Next Action</th>
                    <th className="thActions" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((o) => {
                    const meta = o._priorityMeta;
                    const cleanPhone = formatWhatsAppPhone(o.phone);
                    const itemsCount = (o.items || []).length;
                    const firstItem = o.items?.[0] || { name: 'Handcrafted Piece' };
                    const { dateStr, timeStr } = formatOrderDate(o.created_at || o.createdAt);
                    const isCustom = o.order_type === 'custom' || o.orderType === 'custom';
                    const isAssisted = o.assisted_order?.is_assisted || o.assistedOrder?.isAssisted;
                    const isGift = Boolean(o.is_gift || o.isGift);
                    const isVerified =
                      o.payment_status === 'verified' ||
                      o.paymentStatus === 'verified' ||
                      o.payment_status === 'paid';

                    return (
                      <tr
                        key={o.id || o.order_no}
                        className={`orderTableRow ${meta.level === PRIORITY_LEVELS.CRITICAL ? 'rowCritical' : ''} ${meta.level === PRIORITY_LEVELS.HIGH ? 'rowHigh' : ''} ${meta.isDelivered ? 'rowDelivered' : ''}`}
                        onClick={() => onViewOrderClick && onViewOrderClick(o)}
                      >
                        {/* 1. Order Details & Badges */}
                        <td className="tdOrderNo">
                          <div className="orderIdentityGroup">
                            <span className="orderNumberText">#{o.order_no || o.orderNo}</span>
                            <div className="orderBadgesFlow">
                              {isCustom && (
                                <span className="badgeCustomOrder" title="Bespoke Custom Order">
                                  ✨ Custom
                                </span>
                              )}
                              {isAssisted && (
                                <span className="badgeAssistedOrder" title="Assisted Checkout Order">
                                  ✦ Assisted
                                </span>
                              )}
                              {isGift && (
                                <span className="badgeGiftOrder" title="Gift Wrapped Order">
                                  🎁 Gift
                                </span>
                              )}
                              {Boolean(o.customization?.requested || o.customization?.referenceImage) && (
                                <span className="badgeCustomizationReq" title="Customization Attached">
                                  🎨 Note
                                </span>
                              )}
                            </div>
                            {o.shipment_group_code && (
                              <span className="shipmentGroupMiniTag" title={`Shipment Group: ${o.shipment_group_code}`}>
                                <Boxes size={10} /> {o.shipment_group_code}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Customer & Phone */}
                        <td className="tdCustomer" onClick={(e) => e.stopPropagation()}>
                          <div className="customerMetaGroup">
                            <span className="customerNameText">
                              {o.recipient_name || o.recipientName || o.name}
                            </span>
                            <div className="customerContactRow">
                              <span className="customerPhoneText">{o.phone}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                                    o.name || o.recipient_name
                                  )}%2C%20regarding%20your%20Nathshikha%20order%20%23${o.order_no || o.orderNo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="waQuickLinkBtn"
                                  title="Chat on WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageSquare size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Items & Amount */}
                        <td className="tdItems">
                          <div className="itemsValueGroup">
                            <span className="primaryItemName" title={firstItem.name}>
                              {firstItem.name}
                            </span>
                            <div className="itemsValueSub">
                              <b className="orderTotalVal">{money(o.total)}</b>
                              <span className="itemCountTag">
                                ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
                              </span>
                              <span className="payMethodTag">
                                {(o.payment_method || 'UPI').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Aging & SLA */}
                        <td className="tdTimeline">
                          <div className="timelineSlaGroup">
                            <div className="orderAgeText">
                              <span>Age: <b>{formatOrderAge(meta.orderAgeDays)}</b></span>
                              <small className="placedDateSub">{dateStr}</small>
                            </div>

                            {/* Delivery SLA Status */}
                            {!meta.isTerminal && (
                              <div className="slaStatusWrap">
                                {meta.isOverdue ? (
                                  <span className="slaBadge overdue">
                                    <AlertTriangle size={11} /> {meta.daysOverdue}d Overdue
                                  </span>
                                ) : meta.daysRemaining !== null ? (
                                  <span className={`slaBadge ${meta.daysRemaining <= 3 ? 'dueSoon' : 'onTime'}`}>
                                    <Clock size={11} /> {meta.daysRemaining}d to SLA
                                  </span>
                                ) : (
                                  <span className="slaBadge pendingSla">SLA Pending</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Current Stage Dropdown */}
                        <td className="tdStage" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={o.order_status || o.orderStatus || 'placed'}
                            onChange={(e) => handleStatusChange(o, e.target.value)}
                            className={`stageSelectDropdown stage_${o.order_status || o.orderStatus}`}
                          >
                            <option value="payment_pending">Payment Pending</option>
                            <option value="placed">Order Received</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="making">Artisan Crafting</option>
                            <option value="packing">QC & Packed</option>
                            <option value="shipped">Dispatched</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {/* Payment status pill */}
                          <div className="paymentStatusSubPill">
                            {isVerified ? (
                              <span className="verifiedPaymentText">
                                <Check size={11} /> Verified
                              </span>
                            ) : (
                              <span className="unverifiedPaymentText">
                                <Clock size={11} /> Unverified
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Dynamic Priority Status */}
                        <td className="tdPriority" onClick={(e) => e.stopPropagation()}>
                          <div
                            className={`priorityStatusPill ${meta.badgeClass}`}
                            title={`Priority: ${meta.level} — ${meta.reason}`}
                            onClick={() => setPriorityModalOrder(o)}
                            role="button"
                            tabIndex={0}
                          >
                            <span className="priorityBullet" />
                            <span className="priorityLabelText">{meta.label}</span>
                            {meta.isManualApplied && (
                              <span className="manualTagBadge" title="Manually assigned by admin">
                                Manual
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Next Action Recommendation */}
                        <td className="tdNextAction" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`nextActionCtaBtn variant_${meta.nextAction.variant}`}
                            onClick={(e) => handleNextActionClick(e, o, meta.nextAction)}
                            title={`Recommended Next Action: ${meta.nextAction.label}`}
                          >
                            <span>{meta.nextAction.label}</span>
                          </button>
                        </td>

                        {/* 8. Action Buttons */}
                        <td className="tdActions" onClick={(e) => e.stopPropagation()}>
                          <div className="tableActionBtns">
                            <button
                              type="button"
                              className="orderActionBtn inspectBtn"
                              onClick={() => onViewOrderClick && onViewOrderClick(o)}
                              title="View full order details"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className="orderActionBtn priorityBtn"
                              onClick={() => setPriorityModalOrder(o)}
                              title="Set priority or internal operational note"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              className="orderActionBtn deleteBtn"
                              onClick={() => {
                                setDeleteModalOrder(o);
                                setDeleteReasonType('Duplicate order');
                                setCustomDeleteReason('');
                                setDeleteReasonError('');
                              }}
                              title="Move order to Trash (Recoverable for 30 days)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE TOUCH CARDS VIEW (<= 640px) */}
            <div className="orderMobileCardsList">
              {paginatedOrders.map((o) => {
                const meta = o._priorityMeta;
                const cleanPhone = formatWhatsAppPhone(o.phone);
                const itemsCount = (o.items || []).length;
                const firstItem = o.items?.[0] || { name: 'Handcrafted Piece' };
                const isCustom = o.order_type === 'custom' || o.orderType === 'custom';
                const isAssisted = o.assisted_order?.is_assisted || o.assistedOrder?.isAssisted;
                const isGift = Boolean(o.is_gift || o.isGift);

                return (
                  <div
                    key={o.id || o.order_no}
                    className={`orderMobileCard ${meta.level === PRIORITY_LEVELS.CRITICAL ? 'mobileCritical' : ''} ${meta.isDelivered ? 'mobileDelivered' : ''}`}
                    onClick={() => onViewOrderClick && onViewOrderClick(o)}
                  >
                    {/* Card Top Row */}
                    <div className="mobileCardHeader">
                      <div className="mobileOrderNoBadge">
                        <b>#{o.order_no || o.orderNo}</b>
                        {isCustom && <span className="badgeCustomOrder">✨ Custom</span>}
                        {isAssisted && <span className="badgeAssistedOrder">✦ Assisted</span>}
                        {isGift && <span className="badgeGiftOrder">🎁 Gift</span>}
                      </div>

                      <div
                        className={`priorityStatusPill ${meta.badgeClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPriorityModalOrder(o);
                        }}
                      >
                        <span className="priorityBullet" />
                        <span>{meta.label}</span>
                      </div>
                    </div>

                    {/* Card Customer & Items Info */}
                    <div className="mobileCardBody">
                      <div className="mobileCustomerRow">
                        <span className="mobileCustomerName">
                          {o.recipient_name || o.recipientName || o.name}
                        </span>
                        <b className="mobileOrderTotal">{money(o.total)}</b>
                      </div>

                      <p className="mobileItemSummary">
                        {firstItem.name} {itemsCount > 1 ? `(+${itemsCount - 1} more)` : ''}
                      </p>

                      <div className="mobileTimelineMeta">
                        <span>Age: <b>{formatOrderAge(meta.orderAgeDays)}</b></span>
                        {!meta.isTerminal && (
                          <span className={`mobileSlaTag ${meta.isOverdue ? 'overdue' : ''}`}>
                            {meta.isOverdue
                              ? `⚠️ ${meta.daysOverdue}d Overdue`
                              : meta.daysRemaining !== null
                              ? `⏱ ${meta.daysRemaining}d to SLA`
                              : 'SLA Active'}
                          </span>
                        )}
                        <span className="mobileStageTag">
                          Stage: <b>{(o.order_status || o.orderStatus || 'placed').toUpperCase()}</b>
                        </span>
                      </div>
                    </div>

                    {/* Card Actions & CTA */}
                    <div className="mobileCardFooter" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`mobileNextActionBtn variant_${meta.nextAction.variant}`}
                        onClick={(e) => handleNextActionClick(e, o, meta.nextAction)}
                      >
                        <span>{meta.nextAction.label}</span>
                      </button>

                      <div className="mobileSecondaryActions">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                              o.name || o.recipient_name
                            )}%2C%20regarding%20your%20Nathshikha%20order%20%23${o.order_no || o.orderNo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mobileWaBtn"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}

                        <button
                          type="button"
                          className="mobileIconBtn"
                          onClick={() => setPriorityModalOrder(o)}
                          title="Priority"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          className="mobileIconBtn"
                          onClick={() => onViewOrderClick && onViewOrderClick(o)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ========================================================================= */}
            {/* 5. ENTERPRISE PAGINATION CONTROLS                                         */}
            {/* ========================================================================= */}
            <footer className="orderPaginationBar">
              <div className="orderPaginationInfo">
                <span>
                  Showing <b>{(safeCurrentPage - 1) * pageSize + 1}</b>–
                  <b>{Math.min(safeCurrentPage * pageSize, totalItems)}</b> of <b>{totalItems}</b> orders
                  {totalItems !== orders.length && (
                    <span className="filteredHint"> (filtered from {orders.length})</span>
                  )}
                </span>
              </div>

              <div className="orderPaginationControls">
                <div className="pageSizePickerWrap">
                  <span className="pageSizeLabel">Per page:</span>
                  <AdminDropdown
                    value={pageSize}
                    onChange={(val) => setPageSize(Number(val))}
                    options={pageSizeOptions}
                    direction="up"
                    minWidth="105px"
                  />
                </div>

                <div className="orderPageNavButtons">
                  <button
                    type="button"
                    className="orderNavBtn"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {totalPages > 1 && (
                    <div className="orderPagePills">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) {
                            acc.push(-1 * idx);
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p) =>
                          p < 0 ? (
                            <span key={`ellipsis-${p}`} className="pageEllipsis">…</span>
                          ) : (
                            <button
                              key={`page-${p}`}
                              type="button"
                              className={`pagePillBtn ${p === safeCurrentPage ? 'active' : ''}`}
                              onClick={() => handlePageChange(p)}
                              aria-label={`Go to page ${p}`}
                            >
                              {p}
                            </button>
                          )
                        )}
                    </div>
                  )}

                  <span className="currentPageBadge">
                    Page <b>{safeCurrentPage}</b> of <b>{totalPages}</b>
                  </span>

                  <button
                    type="button"
                    className="orderNavBtn"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="orderEmptyState">
            <div className="emptyStateIcon">
              <Package size={36} />
            </div>
            <h3>No orders found in this queue</h3>
            <p>
              {hasActiveSecondaryFilters
                ? `No orders match your current search "${searchQuery}" or selected priority filters.`
                : filter === 'needs_attention'
                ? 'All active orders are on schedule with no pending operational actions!'
                : filter === 'urgent_critical'
                ? 'Great news! There are zero critical or overdue orders in the queue.'
                : 'No orders available in this operational view.'}
            </p>
            {hasActiveSecondaryFilters && (
              <button type="button" className="goldBtn emptyResetBtn" onClick={resetAllFilters}>
                <X size={14} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODALS: PRIORITY & SOFT DELETE                                         */}
      {/* ========================================================================= */}
      {priorityModalOrder && (
        <AdminOrderPriorityModal
          order={priorityModalOrder}
          isOpen={Boolean(priorityModalOrder)}
          onClose={() => setPriorityModalOrder(null)}
          onPriorityUpdated={(updatedOrder) => {
            if (onOrderUpdated) {
              onOrderUpdated(updatedOrder);
            }
          }}
        />
      )}

      {/* Soft Delete Confirmation Modal (Preserved exactly) */}
      {deleteModalOrder && (
        <div
          className="adminProductDetailOverlay"
          onClick={() => setDeleteModalOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="deleteSafetyDialog"
            style={{ maxWidth: '520px', textAlign: 'left', alignItems: 'stretch' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #fee2e2', paddingBottom: '12px' }}>
              <div className="deleteSafetyIconWrap" style={{ width: '42px', height: '42px' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Move Order to Trash?</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Order #{deleteModalOrder.order_no || deleteModalOrder.orderNo} ({deleteModalOrder.name})
                </p>
              </div>
            </div>

            <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#991b1b', lineHeight: 1.4 }}>
                <b>Safety Notice:</b> This order will be moved to the <b>Deleted Orders (Trash)</b> tab and hidden from active fulfillment. It can be restored at any time within <b>30 days</b> before permanent purge.
              </div>

              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Select Reason for Deletion *
              </label>
              <select
                value={deleteReasonType}
                onChange={(e) => {
                  setDeleteReasonType(e.target.value);
                  setDeleteReasonError('');
                }}
                style={{
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '13px',
                  background: '#ffffff',
                  color: '#1e293b'
                }}
              >
                <option value="Duplicate order">Duplicate order</option>
                <option value="Test / demo order placed by admin">Test / demo order placed by admin</option>
                <option value="Customer requested cancellation before payment">Customer requested cancellation before payment</option>
                <option value="Spam / fraudulent / unverified attempt">Spam / fraudulent / unverified attempt</option>
                <option value="Payment failed permanently / abandoned">Payment failed permanently / abandoned</option>
                <option value="Other">Other reason (specify below)</option>
              </select>

              <textarea
                rows={2}
                placeholder={deleteReasonType === 'Other' ? 'Please specify why this order is being deleted *' : 'Optional notes or reference details…'}
                value={customDeleteReason}
                onChange={(e) => {
                  setCustomDeleteReason(e.target.value);
                  setDeleteReasonError('');
                }}
                maxLength={500}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: deleteReasonError ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {deleteReasonError ? (
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{deleteReasonError}</span>
                ) : (
                  <span>Maximum 500 characters</span>
                )}
                <span>{customDeleteReason.length}/500</span>
              </div>
            </div>

            <div className="adminDeleteModalActions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <button
                type="button"
                className="safetyCancelBtn"
                onClick={() => setDeleteModalOrder(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="safetyDeleteConfirmBtn"
                onClick={async () => {
                  if (!onDeleteOrder) return;

                  let finalReason = '';
                  if (deleteReasonType === 'Other') {
                    finalReason = customDeleteReason.trim();
                  } else {
                    finalReason = customDeleteReason.trim()
                      ? `${deleteReasonType}: ${customDeleteReason.trim()}`
                      : deleteReasonType;
                  }

                  if (!finalReason || !finalReason.trim()) {
                    setDeleteReasonError('Please provide a valid deletion reason.');
                    return;
                  }

                  setIsDeleting(true);
                  try {
                    const idToDelete =
                      deleteModalOrder._id ||
                      deleteModalOrder.id ||
                      deleteModalOrder.order_no ||
                      deleteModalOrder.orderNo;
                    await onDeleteOrder(idToDelete, finalReason);
                    setDeleteModalOrder(null);
                  } catch (err) {
                    console.error('Delete order error:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Moving to Trash…' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
