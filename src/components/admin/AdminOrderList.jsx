import React, { useState, useMemo } from 'react';
import {
  Package,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Search,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  Box,
  Truck,
  Boxes
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

  return (
    <div className="adminOrdersSection">
      {/* Search, Filter & Sort Controls */}
      <div className="ordersControlBar">
        <div className="searchBox">
          <Search size={16} className="searchIcon" />
          <input
            type="text"
            placeholder="Search by customer, contact, order #, product or Tx ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="searchInput"
          />
          {searchQuery && (
            <button
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
              type="button"
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

        {/* Filter Pills */}
        <div className="filterPills">
          <button
            type="button"
            className={`filterPill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </button>

          <button
            type="button"
            className={`filterPill pillAlert ${
              filter === 'verification_pending' ? 'active' : ''
            }`}
            onClick={() => setFilter('verification_pending')}
          >
            Payment Verification Pending
            {pendingVerificationTotal > 0 && (
              <span className="badgeCount">{pendingVerificationTotal}</span>
            )}
          </button>

          {/* Cancellation Requests Filter Pill */}
          <button
            type="button"
            className={`filterPill pillCancellation ${
              filter === 'cancellation_requested' ? 'active' : ''
            }`}
            onClick={() => setFilter('cancellation_requested')}
          >
            ⚠️ Cancellation Requests
            {cancellationRequestsCount > 0 && (
              <span className="badgeCount cancelBadgeCount">{cancellationRequestsCount}</span>
            )}
          </button>

          {/* Quick Filter: Priority Orders (15+ Days) */}
          <button
            type="button"
            className={`filterPill pillPriority ${filter === 'priority' ? 'active' : ''}`}
            onClick={() => setFilter('priority')}
          >
            🔴 Priority (15+ Days)
            {priorityCount > 0 && (
              <span className="badgeCount priorityBadgeCount">{priorityCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`filterPill ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Order Confirmed
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
            📦 QC & Packaging
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
            Delivered
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="adminCard tableCard">
        <div className="tableHeaderStats">
          <h3>Orders Management</h3>
          <span>
            Showing <b>{filteredOrders.length}</b> of {orders.length} orders
          </span>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="ordersTableContainer">
            <table className="ordersOperationalTable">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Product</th>
                  <th>Product Code</th>
                  <th>Amount</th>
                  <th>Order Date</th>
                  <th>Order Age</th>
                  <th>Shipment Group</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th>Cancellation Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
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
                  const isPriority = orderAgeDays > 15; // Strictly more than 15 days

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
                      key={o.id}
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
                          {o.user_id ? 'Registered User' : 'Guest'}
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
                            Total {o.items.reduce((a, i) => a + i.qty, 0)} items in order
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

                      {/* 7. Order Date */}
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
                            <Clock size={12} /> Pending Verification
                          </span>
                        )}
                      </td>

                      {/* 11. Order Status Dropdown */}
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
                            <AlertTriangle size={11} /> Cancellation Requested
                          </span>
                        ) : isCancelApproved ? (
                          <span className="cancelApprovedBadge">
                            <CheckCircle2 size={11} /> Approved · Pending Refund ({money(o.refund_amount || o.total)})
                          </span>
                        ) : isRefundCompleted ? (
                          <span className="cancelRefundedBadge">
                            <CheckCircle2 size={11} /> Refund ({money(o.refund_amount || o.total)})
                          </span>
                        ) : (
                          <span className="noCancelText">No Cancellation</span>
                        )}
                      </td>

                      {/* 13. Action */}
                      <td className="actionsCell">
                        <div className="actionButtonsGroup">
                          {isCancelRequested && onReviewCancellationClick && (
                            <button
                              type="button"
                              className="goldBtn compact reviewCancelActionBtn"
                              onClick={() => onReviewCancellationClick(o)}
                              title="Review cancellation request"
                            >
                              <AlertTriangle size={13} />
                              <span>Review</span>
                            </button>
                          )}

                          {isCancelApproved && onReviewCancellationClick && (
                            <button
                              type="button"
                              className="outlineBtn compact processRefundTableBtn"
                              onClick={() => onReviewCancellationClick(o)}
                              title="Process & mark refund completed"
                            >
                              <CheckCircle2 size={13} />
                              <span>Refund</span>
                            </button>
                          )}

                          {!isVerified && (
                            <button
                              type="button"
                              className="goldBtn compact verifyBtn"
                              onClick={() => onVerifyPaymentClick(o)}
                              title="Verify payment for this order"
                            >
                              <ShieldCheck size={14} />
                              <span>Verify Payment</span>
                            </button>
                          )}

                          {(o.order_status === 'shipped' || o.shipment_partner || o.tracking_id) && (
                            <button
                              type="button"
                              className="outlineBtn compact editShipmentBtn"
                              onClick={() => onOpenShipmentModal && onOpenShipmentModal(o, true)}
                              title="Edit tracking & shipment details"
                            >
                              <span>Edit Shipment</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="outlineBtn compact viewOrderBtn"
                            onClick={() => onViewOrderClick(o)}
                            title="View complete order details"
                          >
                            <Eye size={14} />
                            <span>View Order</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
