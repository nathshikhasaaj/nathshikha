import React, { useState, useMemo } from 'react';
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
  Calendar
} from 'lucide-react';
import {
  money,
  getOrderAgeInDays,
  formatOrderAge,
  formatOrderDate
} from '../../utils/formatters';
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
  onReviewCancellationClick
}) {
  const [sortBy, setSortBy] = useState('newest');

  const handleStatusChange = (order, newStatus) => {
    if (newStatus === 'shipped') {
      // Intercept 'shipped' to collect shipment partner & tracking details
      if (onOpenShipmentModal) {
        onOpenShipmentModal(order, Boolean(order.shipment_partner || order.tracking_id));
      }
      return;
    }
    updateOrderStatus(order.id || order._id, newStatus);
  };

  const getProductCode = (item, order, index) => {
    if (item.productId) {
      return `PRD-${String(item.productId).slice(-6).toUpperCase()}`;
    }
    if (item.id) {
      return `PRD-${String(item.id).slice(-6).toUpperCase()}`;
    }
    return `PRD-${String(order.order_no).slice(-4)}-${index + 1}`;
  };

  // Status mapping for friendly labels
  const getStatusLabel = (status) => {
    switch (status) {
      case 'placed':
        return 'Order Received';
      case 'confirmed':
        return 'Confirmed';
      case 'making':
        return 'Crafting';
      case 'packing':
      case 'processing':
        return 'QC & Packed';
      case 'shipped':
        return 'Dispatched';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status ? status.toUpperCase() : 'Received';
    }
  };

  // Count priority orders (order age strictly > 15 days)
  const priorityCount = useMemo(() => {
    return orders.filter((o) => {
      const age = getOrderAgeInDays(o.created_at || o.createdAt);
      return age > 15;
    }).length;
  }, [orders]);

  const pendingVerificationTotal = useMemo(() => {
    return orders.filter(
      (o) =>
        o.payment_status === 'verification_pending' ||
        o.paymentStatus === 'verification_pending' ||
        (o.payment_status !== 'verified' && o.payment_status !== 'paid')
    ).length;
  }, [orders]);

  const cancellationRequestsCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.cancellation_status === 'cancellation_requested' ||
        o.cancellationStatus === 'cancellation_requested'
    ).length;
  }, [orders]);

  // Filter & Sort Pipeline
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      const isVerified =
        o.payment_status === 'verified' ||
        o.paymentStatus === 'verified' ||
        o.payment_status === 'paid';
      const isPendingVerification =
        !isVerified &&
        (o.payment_status === 'verification_pending' ||
          o.paymentStatus === 'verification_pending' ||
          o.payment_status === 'pending');

      const age = getOrderAgeInDays(o.created_at || o.createdAt);
      const isPriority = age > 15;

      const isCancelReq =
        o.cancellation_status === 'cancellation_requested' ||
        o.cancellationStatus === 'cancellation_requested';

      // 1. Filter Tab
      if (filter === 'verification_pending') {
        if (!isPendingVerification) return false;
      } else if (filter === 'cancellation_requested') {
        if (!isCancelReq) return false;
      } else if (filter === 'priority') {
        if (!isPriority) return false;
      } else if (filter === 'placed') {
        if (o.order_status !== 'placed' && o.orderStatus !== 'placed') return false;
      } else if (filter === 'confirmed') {
        if (o.order_status !== 'confirmed' && o.orderStatus !== 'confirmed') return false;
      } else if (filter === 'making') {
        if (o.order_status !== 'making' && o.orderStatus !== 'making') return false;
      } else if (filter === 'packing') {
        if (o.order_status !== 'packing' && o.orderStatus !== 'packing' && o.order_status !== 'processing')
          return false;
      } else if (filter === 'shipped') {
        if (o.order_status !== 'shipped' && o.orderStatus !== 'shipped') return false;
      } else if (filter === 'delivered') {
        if (o.order_status !== 'delivered' && o.orderStatus !== 'delivered') return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (o.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.phone || '').includes(q);
        const orderNoMatch = (o.order_no || '').toLowerCase().includes(q);
        const groupMatch = (o.shipment_group_code || o.shipmentGroupCode || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((i) =>
          (i.name || '').toLowerCase().includes(q)
        );
        const txMatch = (o.payment_transaction_id || o.upi_utr || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || orderNoMatch || groupMatch || itemMatch || txMatch;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      const ageA = getOrderAgeInDays(a.created_at || a.createdAt);
      const ageB = getOrderAgeInDays(b.created_at || b.createdAt);

      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      if (sortBy === 'age_desc') {
        return ageB - ageA;
      }
      if (sortBy === 'priority_first') {
        const isPriorityA = ageA > 15 ? 1 : 0;
        const isPriorityB = ageB > 15 ? 1 : 0;
        if (isPriorityA !== isPriorityB) {
          return isPriorityB - isPriorityA;
        }
        return ageB - ageA;
      }
      // Default 'newest'
      return timeB - timeA;
    });
  }, [orders, filter, searchQuery, sortBy]);

  const [visibleCount, setVisibleCount] = useState(6);

  // Auto-reset to 6 when filters, search or sort change
  React.useEffect(() => {
    setVisibleCount(6);
  }, [filter, searchQuery, sortBy]);

  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  return (
    <div className="adminOrdersSection">
      {/* Search, Filter & Sort Controls */}
      <div className="ordersControlBar">
        <div className="searchBox">
          <Search size={16} className="searchIcon" />
          <input
            type="text"
            placeholder="Search customer, phone, #order, piece, Tx ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="searchInput"
          />
          {searchQuery && (
            <button
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
              type="button"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="sortControlWrap">
          <ArrowUpDown size={14} className="sortIcon" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sortSelect"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="age_desc">Sort: Order Age (Highest)</option>
            <option value="priority_first">Sort: Priority Orders (15+ Days)</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filterPills">
        <button
          type="button"
          className={`filterPill ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders <span className="pillBadge">{orders.length}</span>
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'verification_pending' ? 'active' : ''} ${
            pendingVerificationTotal > 0 ? 'pillAlert' : ''
          }`}
          onClick={() => setFilter('verification_pending')}
        >
          ⚠️ Pending Verification
          {pendingVerificationTotal > 0 && (
            <span className="pillBadge badgeAmber">{pendingVerificationTotal}</span>
          )}
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'cancellation_requested' ? 'active' : ''} ${
            cancellationRequestsCount > 0 ? 'pillDanger' : ''
          }`}
          onClick={() => setFilter('cancellation_requested')}
        >
          🚨 Cancellation Requests
          {cancellationRequestsCount > 0 && (
            <span className="pillBadge badgeRed">{cancellationRequestsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'priority' ? 'active' : ''} ${
            priorityCount > 0 ? 'pillPriority' : ''
          }`}
          onClick={() => setFilter('priority')}
        >
          🔴 Urgent (&gt;15d)
          {priorityCount > 0 && (
            <span className="pillBadge badgeRed">{priorityCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'making' ? 'active' : ''}`}
          onClick={() => setFilter('making')}
        >
          ✨ Artisan Crafting
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'packing' ? 'active' : ''}`}
          onClick={() => setFilter('packing')}
        >
          📦 QC & Packed
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'shipped' ? 'active' : ''}`}
          onClick={() => setFilter('shipped')}
        >
          🚚 Dispatched
        </button>

        <button
          type="button"
          className={`filterPill ${filter === 'delivered' ? 'active' : ''}`}
          onClick={() => setFilter('delivered')}
        >
          ✓ Delivered
        </button>
      </div>

      {/* Main Orders Display Card */}
      <div className="adminCard tableCard">
        <div className="tableHeaderStats">
          <h3>
            {filter === 'all'
              ? 'All Orders'
              : filter === 'verification_pending'
              ? 'Payment Verification Pending'
              : filter === 'cancellation_requested'
              ? 'Cancellation Requests'
              : filter === 'priority'
              ? 'Priority Orders (>15 Days Old)'
              : `${filter.toUpperCase()} Orders`}
          </h3>
          <span className="resultsCountText">
            Showing <b>{Math.min(visibleCount, filteredOrders.length)}</b> of{' '}
            <b>{filteredOrders.length}</b> orders
          </span>
        </div>

        {filteredOrders.length > 0 ? (
          <>
            {/* 1. Desktop Operational Table (>= 850px) */}
            <div className="ordersTableContainer desktopOnlyTable">
              <table className="ordersOperationalTable">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Product</th>
                    <th>Product Code</th>
                    <th>Amount</th>
                    <th>Placed</th>
                    <th>Aging</th>
                    <th>Shipment Group</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Cancellation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => {
                    const isVerified =
                      o.payment_status === 'verified' ||
                      o.paymentStatus === 'verified' ||
                      o.payment_status === 'paid';
                    const cleanPhone = (o.phone || '').replace(/\D/g, '');
                    const itemsCount = (o.items || []).length;
                    const firstItem = o.items?.[0] || { name: 'Handcrafted Piece' };

                    // Date & Aging Calculations
                    const createdAt = o.created_at || o.createdAt;
                    const { dateStr, timeStr, fullStr } = formatOrderDate(createdAt);
                    const orderAgeDays = getOrderAgeInDays(createdAt);
                    const isPriority = orderAgeDays > 15;

                    const isCancelRequested =
                      o.cancellation_status === 'cancellation_requested' ||
                      o.cancellationStatus === 'cancellation_requested';
                    const isCancelApproved =
                      o.cancellation_status === 'cancellation_approved' ||
                      o.cancellationStatus === 'cancellation_approved';
                    const isRefundCompleted =
                      o.cancellation_status === 'refund' || o.refund_status === 'refund';

                    const groupCode = o.shipment_group_code || o.shipmentGroupCode || null;

                    return (
                      <tr
                        key={o.id || o.order_no}
                        className={`${!isVerified ? 'rowNeedsVerification' : ''} ${
                          isCancelRequested ? 'rowNeedsCancellationReview' : ''
                        } ${isPriority ? 'rowPriority' : ''}`}
                      >
                        {/* 1. Order No */}
                        <td className="orderNoCell">
                          <b>#{o.order_no}</b>
                        </td>

                        {/* 2. Customer */}
                        <td className="customerCell">
                          <b>{o.name}</b>
                          <small className="userBadge">
                            {o.user_id ? 'Registered' : 'Guest'}
                          </small>
                        </td>

                        {/* 3. Contact */}
                        <td className="contactCell">
                          <span className="phoneText">{o.phone}</span>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                                o.name
                              )}%2C%20regarding%20your%20Nathshikha%20order%20%23${o.order_no}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="waIconBtn"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                        </td>

                        {/* 4. Product Name */}
                        <td className="productNameCell">
                          <span className="productNameText" title={firstItem.name}>
                            {firstItem.name}
                          </span>
                          {itemsCount > 1 && (
                            <small className="totalItemsCount">
                              Total {o.items.reduce((a, i) => a + (i.qty || 1), 0)} items
                            </small>
                          )}
                        </td>

                        {/* 5. Product Code */}
                        <td className="productCodeCell">
                          <code>{getProductCode(firstItem, o, 0)}</code>
                          {itemsCount > 1 && (
                            <span
                              className="multiItemBadge"
                              title={o.items.map((i) => i.name).join(', ')}
                            >
                              +{itemsCount - 1} more
                            </span>
                          )}
                        </td>

                        {/* 6. Amount */}
                        <td className="amountCell">
                          <b>{money(o.total)}</b>
                          <small>{(o.payment_method || 'UPI').toUpperCase()}</small>
                        </td>

                        {/* 7. Placed Date */}
                        <td className="orderDateCell" title={fullStr}>
                          <div className="dateCellWrap">
                            <span className="orderDateText">{dateStr}</span>
                            {timeStr && (
                              <small className="orderTimeText">{timeStr}</small>
                            )}
                          </div>
                        </td>

                        {/* 8. Order Age */}
                        <td className="orderAgeCell">
                          {isPriority ? (
                            <span
                              className="orderAgeBadge priorityBadge"
                              title="Priority Order — More than 15 days old"
                            >
                              🔴 {formatOrderAge(orderAgeDays)} · Priority
                            </span>
                          ) : (
                            <span className="orderAgeBadge normalAgeBadge">
                              {formatOrderAge(orderAgeDays)}
                            </span>
                          )}
                        </td>

                        {/* 9. Shipment Group */}
                        <td className="shipmentGroupCell">
                          {groupCode ? (
                            <div className="shipmentGroupWrap">
                              <span className="adminShipmentGroupBadge" title={`Shipment Group #${groupCode}`}>
                                <Boxes size={11} />
                                <b>{groupCode}</b>
                              </span>
                              {o.co_shipped_orders && o.co_shipped_orders.length > 0 && (
                                <small className="coShippedAdminList">
                                  with #{o.co_shipped_orders.join(', #')}
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="singleShipmentText">—</span>
                          )}
                        </td>

                        {/* 10. Payment Status */}
                        <td className="paymentStatusCell">
                          {isVerified ? (
                            <span className="verifiedPaymentBadge">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <span className="pendingPaymentBadge">
                              <Clock size={12} /> Pending Verif.
                            </span>
                          )}
                        </td>

                        {/* 11. Status Dropdown */}
                        <td className="statusCell">
                          <select
                            value={o.order_status}
                            onChange={(e) => handleStatusChange(o, e.target.value)}
                            className={`orderStatusSelect statusSelect_${o.order_status}`}
                          >
                            <option value="placed">Order Received</option>
                            <option value="confirmed">Order Confirmed</option>
                            <option value="making">Artisan Crafting</option>
                            <option value="packing">QC & Packaging</option>
                            <option value="shipped">Dispatched & In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* 12. Cancellation Status */}
                        <td className="cancellationStatusCell">
                          {isCancelRequested ? (
                            <span className="cancelReqBadge" title={o.cancellation_reason || 'Requested'}>
                              <AlertTriangle size={11} /> Requested
                            </span>
                          ) : isCancelApproved ? (
                            <span className="cancelApprovedBadge">
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          ) : isRefundCompleted ? (
                            <span className="cancelRefundedBadge">
                              <CheckCircle2 size={11} /> Refunded
                            </span>
                          ) : (
                            <span className="noCancelText">—</span>
                          )}
                        </td>

                        {/* 13. Actions */}
                        <td className="actionsCell">
                          <div className="actionButtonsGroup">
                            {isCancelRequested && onReviewCancellationClick && (
                              <button
                                type="button"
                                className="goldBtn compact reviewCancelActionBtn"
                                onClick={() => onReviewCancellationClick(o)}
                                title="Review cancellation request"
                              >
                                <AlertTriangle size={12} />
                                <span>Review</span>
                              </button>
                            )}

                            {!isVerified && (
                              <button
                                type="button"
                                className="goldBtn compact verifyBtn"
                                onClick={() => onVerifyPaymentClick(o)}
                                title="Verify payment for this order"
                              >
                                <ShieldCheck size={13} />
                                <span>Verify</span>
                              </button>
                            )}

                            {(o.order_status === 'shipped' || o.shipment_partner || o.tracking_id) && (
                              <button
                                type="button"
                                className="outlineBtn compact editShipmentBtn"
                                onClick={() => onOpenShipmentModal && onOpenShipmentModal(o, true)}
                                title="Edit tracking & shipment details"
                              >
                                <span>Shipment</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="outlineBtn compact viewOrderBtn"
                              onClick={() => onViewOrderClick(o)}
                              title="View complete order details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Dedicated Mobile Order Cards (< 850px) */}
            <div className="mobileOrdersList">
              {visibleOrders.map((o) => {
                const isVerified =
                  o.payment_status === 'verified' ||
                  o.paymentStatus === 'verified' ||
                  o.payment_status === 'paid';
                const cleanPhone = (o.phone || '').replace(/\D/g, '');
                const itemsCount = (o.items || []).length;
                const firstItem = o.items?.[0] || { name: 'Handcrafted Piece' };
                const totalQty = (o.items || []).reduce((a, i) => a + (i.qty || 1), 0);

                const createdAt = o.created_at || o.createdAt;
                const { dateStr, timeStr } = formatOrderDate(createdAt);
                const orderAgeDays = getOrderAgeInDays(createdAt);
                const isPriority = orderAgeDays > 15;

                const isCancelRequested =
                  o.cancellation_status === 'cancellation_requested' ||
                  o.cancellationStatus === 'cancellation_requested';
                const isCancelApproved =
                  o.cancellation_status === 'cancellation_approved' ||
                  o.cancellationStatus === 'cancellation_approved';

                const groupCode = o.shipment_group_code || o.shipmentGroupCode || null;

                return (
                  <div
                    key={o.id || o.order_no}
                    className={`mobileOrderCard ${!isVerified ? 'cardNeedsVerification' : ''} ${
                      isCancelRequested ? 'cardNeedsCancellationReview' : ''
                    } ${isPriority ? 'cardPriority' : ''}`}
                  >
                    {/* Card Header: Order No + Placed Date + Status Badge */}
                    <div className="mobileCardHeader">
                      <div className="mobileCardPrimaryInfo">
                        <span className="mobileCardOrderNo">#{o.order_no}</span>
                        <span className="mobileCardDate">{dateStr}</span>
                        {isPriority && (
                          <span className="mobilePriorityTag">🔴 {formatOrderAge(orderAgeDays)} old</span>
                        )}
                      </div>
                      <div className="mobileCardHeaderBadges">
                        <span className={`statusChip statusChip_${o.order_status}`}>
                          {getStatusLabel(o.order_status)}
                        </span>
                      </div>
                    </div>

                    {/* Customer & Verification Row */}
                    <div className="mobileCardCustomerRow">
                      <div className="mobileCustomerMeta">
                        <b className="mobileCustomerName">{o.name}</b>
                        <span className="mobileCustomerPhone">{o.phone}</span>
                      </div>
                      <div className="mobileVerificationChipWrap">
                        {isVerified ? (
                          <span className="verifiedChip">🟢 Verified</span>
                        ) : (
                          <span className="pendingChip">🟡 Pending Verif.</span>
                        )}
                      </div>
                    </div>

                    {/* Product & Total Summary Row */}
                    <div className="mobileCardProductRow">
                      <div className="mobileProductTitle">
                        <span className="mobilePieceName">{firstItem.name}</span>
                        {itemsCount > 1 && (
                          <span className="mobileMoreItemsBadge">
                            +{itemsCount - 1} more ({totalQty} total items)
                          </span>
                        )}
                      </div>
                      <div className="mobileAmountBlock">
                        <b className="mobileOrderTotal">{money(o.total)}</b>
                        <span className="mobilePaymentMethod">
                          {(o.payment_method || 'UPI').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Shipment Group Pill if Grouped */}
                    {groupCode && (
                      <div className="mobileCardGroupRow">
                        <span className="adminShipmentGroupBadge">
                          <Boxes size={11} /> Group #{groupCode}
                        </span>
                        {o.co_shipped_orders && o.co_shipped_orders.length > 0 && (
                          <small className="coShippedAdminList">
                            Co-shipped with #{o.co_shipped_orders.join(', #')}
                          </small>
                        )}
                      </div>
                    )}

                    {/* Urgent Action Prompts */}
                    {!isVerified && (
                      <button
                        type="button"
                        className="mobileCardUrgentActionBtn"
                        onClick={() => onVerifyPaymentClick(o)}
                      >
                        <ShieldCheck size={14} />
                        <span>Verify Customer Payment</span>
                      </button>
                    )}

                    {isCancelRequested && onReviewCancellationClick && (
                      <button
                        type="button"
                        className="mobileCardCancelActionBtn"
                        onClick={() => onReviewCancellationClick(o)}
                      >
                        <AlertTriangle size={14} />
                        <span>Review Cancellation Request</span>
                      </button>
                    )}

                    {/* Card Actions Row: Status Select + WhatsApp + View Order */}
                    <div className="mobileCardActionsRow">
                      <div className="mobileStatusSelectWrap">
                        <select
                          value={o.order_status}
                          onChange={(e) => handleStatusChange(o, e.target.value)}
                          className={`orderStatusSelect statusSelect_${o.order_status}`}
                        >
                          <option value="placed">Received</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="making">Crafting</option>
                          <option value="packing">QC / Packed</option>
                          <option value="shipped">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="mobileCardQuickBtns">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                              o.name
                            )}%2C%20regarding%20your%20Nathshikha%20order%20%23${o.order_no}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mobileCardWaLink"
                            title="WhatsApp Customer"
                          >
                            <MessageSquare size={15} />
                          </a>
                        )}

                        <button
                          type="button"
                          className="goldBtn compact mobileCardDetailsBtn"
                          onClick={() => onViewOrderClick(o)}
                        >
                          <Eye size={13} />
                          <span>View Order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredOrders.length > visibleCount && (
              <div className="adminPaginationBar">
                <button
                  type="button"
                  className="goldBtn loadMoreBtn"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  title="Load next 6 orders"
                >
                  <span>Load More Orders (+6)</span>
                </button>
                <button
                  type="button"
                  className="outlineBtn showAllBtn"
                  onClick={() => setVisibleCount(filteredOrders.length)}
                  title="Show all orders at once"
                >
                  <span>Show All ({filteredOrders.length})</span>
                </button>
              </div>
            )}

            {filteredOrders.length <= visibleCount && filteredOrders.length > 6 && (
              <div className="allOrdersLoadedNotice">
                <span>✓ All {filteredOrders.length} orders are currently displayed</span>
              </div>
            )}
          </>
        ) : (
          <div className="empty small">
            <Package size={36} color="var(--gold)" />
            <p>No orders found matching your filter criteria.</p>
            {(filter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="outlineBtn compact"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
