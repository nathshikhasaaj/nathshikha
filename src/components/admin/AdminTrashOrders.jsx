import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  Eye,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  Boxes,
  Loader2,
  X,
  Sparkles,
  ExternalLink,
  Gift
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { money, formatOrderStatus, formatOrderDate, formatWhatsAppPhone } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import './AdminTrashOrders.css';

export default function AdminTrashOrders({ onOrderRestored }) {
  const { setToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [expiringSoonFilter, setExpiringSoonFilter] = useState(false);
  const [sortBy, setSortBy] = useState('recently_deleted');

  // Modals
  const [viewOrder, setViewOrder] = useState(null);
  const [restoreModalOrder, setRestoreModalOrder] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch deleted orders from server
  const fetchTrashOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('q', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_status', paymentFilter);
      if (expiringSoonFilter) params.append('expiring_soon', 'true');
      if (sortBy) params.append('sort', sortBy);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await api(`/admin/orders/trash?${params.toString()}`);
      if (res && res.orders) {
        setOrders(res.orders);
        setTotalCount(res.total || res.orders.length);
        setTotalPages(res.pages || 1);
      } else if (Array.isArray(res)) {
        setOrders(res);
        setTotalCount(res.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch deleted orders:', err);
      setToast('Failed to load deleted orders from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, paymentFilter, expiringSoonFilter, sortBy, page, setToast]);

  useEffect(() => {
    fetchTrashOrders();
  }, [fetchTrashOrders]);

  // Handle Order Restore
  const handleRestore = async (order) => {
    if (!order) return;
    setIsRestoring(true);

    try {
      const targetId = order._id || order.id || order.order_no || order.orderNo;
      const res = await api(`/admin/orders/${encodeURIComponent(targetId)}/restore`, {
        method: 'POST'
      });

      if (res && (res.ok || res.order)) {
        setToast(`Order #${order.order_no || order.orderNo} restored successfully to active orders!`);
        setRestoreModalOrder(null);
        if (viewOrder && (viewOrder._id === order._id || viewOrder.id === order.id)) {
          setViewOrder(null);
        }

        // Notify parent to append to active orders list
        if (onOrderRestored && res.order) {
          onOrderRestored(res.order);
        }

        // Refresh trash list
        fetchTrashOrders(true);
      } else {
        throw new Error(res.error || 'Restoration failed');
      }
    } catch (err) {
      console.error('Restore error:', err);
      const errMsg = err.message || 'Failed to restore order';
      if (errMsg.includes('expired') || errMsg.includes('410')) {
        setToast('Retention period for this order has expired. It can no longer be restored.');
      } else {
        setToast(`Failed to restore order: ${errMsg}`);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Helper to calculate days remaining
  const calculateDaysRemaining = (restoreUntil) => {
    if (!restoreUntil) return 0;
    const expiry = new Date(restoreUntil).getTime();
    const diff = expiry - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="adminTrashContainer">
      {/* Header Bar */}
      <div className="adminTrashHeader">
        <div className="trashHeaderLeft">
          <div className="trashHeaderIcon">
            <Trash2 size={24} />
          </div>
          <div>
            <h2>Deleted Orders &amp; Trash</h2>
            <p className="trashSubtitle">
              Secure soft-deleted orders archive. Orders are safely retained for 30 days before permanent cleanup and can be restored at any time.
            </p>
          </div>
        </div>

        <div className="trashHeaderActions">
          <button
            type="button"
            className="trashRefreshBtn"
            onClick={() => fetchTrashOrders(true)}
            disabled={loading || refreshing}
            title="Refresh Trash List"
          >
            <RefreshCw size={16} className={refreshing ? 'spinIcon' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Retention Policy Banner */}
      <div className="trashNoticeBanner">
        <AlertTriangle size={18} className="noticeIcon" />
        <div className="noticeContent">
          <strong>30-Day Recovery Guarantee:</strong> Soft-deleted orders remain safely preserved with complete buyer, payment, items, and audit history intact. Restoring an order preserves its exact original MongoDB document and Order ID.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="trashFilterBar">
        <div className="trashSearchInputWrapper">
          <Search size={16} className="searchIcon" />
          <input
            type="text"
            placeholder="Search by Order ID (#NS-..., #NW...), buyer name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="trashSearchInput"
          />
          {search && (
            <button
              type="button"
              className="clearSearchBtn"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="trashFilterControls">
          {/* Order Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="trashSelect"
          >
            <option value="">All Order Statuses</option>
            <option value="placed">Placed / Received</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="making">Making</option>
            <option value="packing">QC &amp; Packing</option>
            <option value="shipped">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="trashSelect"
          >
            <option value="">All Payments</option>
            <option value="verified">Verified / Paid</option>
            <option value="verification_pending">Verification Pending</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="trashSelect"
          >
            <option value="recently_deleted">Recently Deleted</option>
            <option value="oldest_deleted">Oldest Deleted</option>
            <option value="expiring_soon">Expiring Soonest</option>
            <option value="order_date">Order Date</option>
          </select>

          {/* Expiring Soon Quick Toggle */}
          <button
            type="button"
            className={`trashToggleBtn ${expiringSoonFilter ? 'active' : ''}`}
            onClick={() => {
              setExpiringSoonFilter((prev) => !prev);
              setPage(1);
            }}
          >
            <Clock size={14} />
            <span>Expiring Soon (≤7d)</span>
          </button>
        </div>
      </div>

      {/* Orders List / Table */}
      {loading ? (
        <div className="trashLoadingContainer">
          <Loader2 size={32} className="spinIcon" color="#d4af37" />
          <p>Loading deleted orders…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="trashEmptyState">
          <Trash2 size={48} className="emptyIcon" />
          <h3>Trash is Empty</h3>
          <p>
            {search || statusFilter || paymentFilter || expiringSoonFilter
              ? 'No deleted orders match the selected filters.'
              : 'There are currently no deleted orders in the Trash.'}
          </p>
        </div>
      ) : (
        <div className="trashTableContainer">
          <table className="trashTable">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer Name</th>
                <th>Order Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Deleted Info</th>
                <th>Delete Reason</th>
                <th>Retention / Expiry</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const orderNo = order.order_no || order.orderNo || '—';
                const buyerName = order.customer_name || order.customerName || order.name || 'Unknown';
                const total = order.total || 0;
                const deletedAt = order.deleted_at || order.deletedAt;
                const deletedByName = order.deleted_by_name || order.deletedByName || 'Admin';
                const deleteReason = order.delete_reason || order.deleteReason || 'No reason specified';
                const restoreUntil = order.restore_until || order.restoreUntil;
                const daysRemaining = order.days_remaining !== undefined ? order.days_remaining : calculateDaysRemaining(restoreUntil);
                const isExpired = order.is_expired !== undefined ? order.is_expired : daysRemaining <= 0;
                const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
                const { dateStr: orderDateStr, timeStr: orderTimeStr, fullStr: orderFullDateStr } = formatOrderDate(order.created_at || order.createdAt);

                return (
                  <tr key={order._id || order.id || orderNo} className={isExpired ? 'rowExpired' : ''}>
                    {/* Order ID */}
                    <td className="cellOrderNo">
                      <span className="orderBadge">#{orderNo}</span>
                    </td>

                    {/* Buyer */}
                    <td className="cellBuyer">
                      <div className="buyerName">{buyerName}</div>
                      <div className="buyerContact">
                        {order.customer_phone || order.phone || ''}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="cellDate" title={orderFullDateStr}>
                      <div className="dateCellWrap">
                        <span className="orderDateText">{orderDateStr}</span>
                        {orderTimeStr && (
                          <small className="orderTimeText" style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{orderTimeStr}</small>
                        )}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="cellTotal">
                      <b>{money(total)}</b>
                    </td>

                    {/* Order & Payment Status */}
                    <td className="cellStatus">
                      <span className={`statusPill status_${order.order_status || order.orderStatus || 'placed'}`}>
                        {formatOrderStatus(order.order_status || order.orderStatus)}
                      </span>
                      <span className={`paymentPill payment_${order.payment_status || order.paymentStatus || 'pending'}`}>
                        {order.payment_status === 'verified' || order.payment_status === 'paid' ? 'Paid ✓' : 'Unverified'}
                      </span>
                    </td>

                    {/* Deleted Info */}
                    <td className="cellDeletedInfo">
                      <div className="deletedDate">
                        {deletedAt ? new Date(deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                      <div className="deletedBy">by {deletedByName}</div>
                    </td>

                    {/* Delete Reason */}
                    <td className="cellReason" title={deleteReason}>
                      <span className="reasonText">{deleteReason}</span>
                    </td>

                    {/* Retention & Expiry */}
                    <td className="cellExpiry">
                      {isExpired ? (
                        <span className="expiryBadge badgeExpired">
                          <AlertTriangle size={12} /> RESTORE EXPIRED
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="expiryBadge badgeExpiringSoon" title={`Restore until ${restoreUntil ? new Date(restoreUntil).toLocaleDateString() : ''}`}>
                          <Clock size={12} /> {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left (Expiring Soon)
                        </span>
                      ) : (
                        <span className="expiryBadge badgeActive" title={`Restore until ${restoreUntil ? new Date(restoreUntil).toLocaleDateString() : ''}`}>
                          <Clock size={12} /> {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="cellActions" style={{ textAlign: 'right' }}>
                      <div className="actionBtnGroup">
                        <button
                          type="button"
                          className="viewTrashBtn"
                          onClick={() => setViewOrder(order)}
                          title="View Deleted Order Details (Read-Only)"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="restoreTrashBtn"
                          onClick={() => setRestoreModalOrder(order)}
                          disabled={isExpired}
                          title={isExpired ? 'Restoration period has expired' : 'Restore Order to Active List'}
                        >
                          <RotateCcw size={14} />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="trashPagination">
          <button
            type="button"
            className="pageBtn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="pageInfo">
            Page {page} of {totalPages} ({totalCount} total deleted)
          </span>
          <button
            type="button"
            className="pageBtn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Read-Only View Deleted Order Modal */}
      {viewOrder && (
        <div className="trashModalOverlay" onClick={() => setViewOrder(null)}>
          <div className="trashModalContainer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="trashModalHeader">
              <div className="modalHeaderTitle">
                <span className="orderBadgeLarge">#{viewOrder.order_no || viewOrder.orderNo}</span>
                <span className="readOnlyBadge">READ-ONLY (DELETED ORDER)</span>
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => setViewOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="trashModalBody">
              {/* Deletion Information Card */}
              <div className="trashDeletionNoticeCard">
                <div className="deletionNoticeHeader">
                  <Trash2 size={18} color="#dc2626" />
                  <strong>Deletion Details &amp; Retention Status</strong>
                </div>
                <div className="deletionGrid">
                  <div>
                    <span className="label">Deleted At:</span>
                    <span className="val">
                      {viewOrder.deleted_at || viewOrder.deletedAt
                        ? new Date(viewOrder.deleted_at || viewOrder.deletedAt).toLocaleString('en-GB')
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="label">Deleted By:</span>
                    <span className="val">{viewOrder.deleted_by_name || viewOrder.deletedByName || 'Admin'}</span>
                  </div>
                  <div>
                    <span className="label">Restore Until:</span>
                    <span className="val">
                      {viewOrder.restore_until || viewOrder.restoreUntil
                        ? new Date(viewOrder.restore_until || viewOrder.restoreUntil).toLocaleDateString('en-GB')
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="label">Reason:</span>
                    <span className="val reasonHighlight">
                      {viewOrder.delete_reason || viewOrder.deleteReason || 'No reason recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Overview Grid */}
              <div className="trashDetailsGrid">
                {/* Customer / Buyer Information */}
                <div className="detailsSectionCard">
                  <div className="cardHeader">
                    <User size={16} />
                    <h4>Buyer Identity (Immutable)</h4>
                  </div>
                  <div className="cardRows">
                    <div className="cardRow">
                      <span>Customer Name:</span>
                      <b>{viewOrder.customer_name || viewOrder.customerName || viewOrder.name || '—'}</b>
                    </div>
                    <div className="cardRow">
                      <span>Customer Phone:</span>
                      <b>{viewOrder.customer_phone || viewOrder.customerPhone || viewOrder.phone || '—'}</b>
                    </div>
                    <div className="cardRow">
                      <span>Customer Email:</span>
                      <b>{viewOrder.customer_email || viewOrder.customerEmail || viewOrder.email || '—'}</b>
                    </div>
                    {viewOrder.userId && (
                      <div className="cardRow">
                        <span>User Account ID:</span>
                        <code>{String(viewOrder.userId)}</code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery / Recipient Information */}
                <div className="detailsSectionCard">
                  <div className="cardHeader">
                    <MapPin size={16} />
                    <h4>Delivery &amp; Recipient</h4>
                  </div>
                  <div className="cardRows">
                    <div className="cardRow">
                      <span>Recipient Name:</span>
                      <b>{viewOrder.recipient_name || viewOrder.recipientName || viewOrder.name || '—'}</b>
                    </div>
                    <div className="cardRow">
                      <span>Recipient Phone:</span>
                      <b>{viewOrder.recipient_phone || viewOrder.recipientPhone || viewOrder.phone || '—'}</b>
                    </div>
                    <div className="cardRow">
                      <span>Delivery Address:</span>
                      <b>{viewOrder.address || '—'}</b>
                    </div>
                    <div className="cardRow">
                      <span>City / State / PIN:</span>
                      <b>{[viewOrder.city, viewOrder.state, viewOrder.pincode].filter(Boolean).join(', ') || '—'}</b>
                    </div>
                    {viewOrder.isGift && (
                      <div className="giftIndicator">
                        <Gift size={14} color="#d4af37" />
                        <span>Gift Order (Wrap: {viewOrder.giftWrap ? 'Yes' : 'No'})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment & Financials */}
                <div className="detailsSectionCard">
                  <div className="cardHeader">
                    <CreditCard size={16} />
                    <h4>Payment &amp; Financials</h4>
                  </div>
                  <div className="cardRows">
                    <div className="cardRow">
                      <span>Total Amount:</span>
                      <b className="totalHighlight">{money(viewOrder.total)}</b>
                    </div>
                    <div className="cardRow">
                      <span>Payment Status:</span>
                      <span className={`paymentPill payment_${viewOrder.payment_status || viewOrder.paymentStatus || 'pending'}`}>
                        {viewOrder.payment_status || viewOrder.paymentStatus || 'pending'}
                      </span>
                    </div>
                    <div className="cardRow">
                      <span>Payment Method:</span>
                      <b>{viewOrder.payment_method || viewOrder.paymentMethod || 'UPI / Manual'}</b>
                    </div>
                    {(viewOrder.payment_transaction_id || viewOrder.upiUtr || viewOrder.upi_utr) && (
                      <div className="cardRow">
                        <span>UTR / Transaction ID:</span>
                        <code>{viewOrder.payment_transaction_id || viewOrder.upiUtr || viewOrder.upi_utr}</code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fulfillment Status */}
                <div className="detailsSectionCard">
                  <div className="cardHeader">
                    <Package size={16} />
                    <h4>Fulfillment Status</h4>
                  </div>
                  <div className="cardRows">
                    <div className="cardRow">
                      <span>Order Status:</span>
                      <span className={`statusPill status_${viewOrder.order_status || viewOrder.orderStatus || 'placed'}`}>
                        {formatOrderStatus(viewOrder.order_status || viewOrder.orderStatus)}
                      </span>
                    </div>
                    <div className="cardRow">
                      <span>Shipping Method:</span>
                      <b>{viewOrder.shipping_method || viewOrder.shippingMethod || 'Standard'}</b>
                    </div>
                    {viewOrder.shipmentPartner && (
                      <div className="cardRow">
                        <span>Courier Partner:</span>
                        <b>{viewOrder.shipmentPartner}</b>
                      </div>
                    )}
                    {viewOrder.trackingId && (
                      <div className="cardRow">
                        <span>Tracking ID:</span>
                        <code>{viewOrder.trackingId}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="trashItemsSection">
                <h4>Ordered Items ({(viewOrder.items || []).length})</h4>
                <div className="trashItemsList">
                  {(viewOrder.items || []).map((item, idx) => (
                    <div key={idx} className="trashItemCard">
                      {item.img && <img src={item.img} alt={item.name} className="itemThumb" />}
                      <div className="itemInfo">
                        <div className="itemName">{item.name}</div>
                        <div className="itemMeta">
                          Qty: {item.qty} × {money(item.price)} = <b>{money((item.qty || 1) * (item.price || 0))}</b>
                        </div>
                        {getParameterEntries(item.selectedParameters || item.selectedOptions).length > 0 && (
                          <div className="itemOptions">
                            {getParameterEntries(item.selectedParameters || item.selectedOptions).map(([k, v]) => (
                              <span key={k} className="optChip">{k}: {v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit / Edit History */}
              {Array.isArray(viewOrder.editHistory) && viewOrder.editHistory.length > 0 && (
                <div className="trashAuditSection">
                  <h4>Audit &amp; Edit History</h4>
                  <div className="auditTimeline">
                    {viewOrder.editHistory.map((entry, idx) => (
                      <div key={idx} className="auditEntry">
                        <div className="auditDot" />
                        <div className="auditContent">
                          <div className="auditHeader">
                            <span className="auditAuthor">{entry.editedBy || entry.action || 'System'}</span>
                            <span className="auditTime">
                              {entry.timestamp || entry.editedAt
                                ? new Date(entry.timestamp || entry.editedAt).toLocaleString('en-GB')
                                : ''}
                            </span>
                          </div>
                          {entry.note || entry.notes ? (
                            <p className="auditNote">{entry.note || entry.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="trashModalFooter">
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setViewOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="restorePrimaryBtn"
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  setRestoreModalOrder(target);
                }}
                disabled={viewOrder.is_expired || calculateDaysRemaining(viewOrder.restore_until || viewOrder.restoreUntil) <= 0}
              >
                <RotateCcw size={16} />
                <span>Restore Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreModalOrder && (
        <div className="trashModalOverlay" onClick={() => !isRestoring && setRestoreModalOrder(null)}>
          <div className="restoreConfirmModal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="restoreModalIcon">
              <RotateCcw size={28} color="#d4af37" />
            </div>

            <h3>Restore this order?</h3>
            <p className="restoreModalDesc">
              Order <b>#{restoreModalOrder.order_no || restoreModalOrder.orderNo}</b> will be returned to active orders with the exact same Order ID, MongoDB document, buyer identity, and payment record preserved.
            </p>

            <div className="restoreSummaryBox">
              <div className="summaryRow">
                <span>Order ID:</span>
                <b>#{restoreModalOrder.order_no || restoreModalOrder.orderNo}</b>
              </div>
              <div className="summaryRow">
                <span>Buyer Name:</span>
                <b>{restoreModalOrder.customer_name || restoreModalOrder.customerName || restoreModalOrder.name}</b>
              </div>
              <div className="summaryRow">
                <span>Order Date:</span>
                <b>{formatOrderDate(restoreModalOrder.created_at || restoreModalOrder.createdAt).fullStr}</b>
              </div>
              <div className="summaryRow">
                <span>Deleted Date:</span>
                <b>
                  {restoreModalOrder.deleted_at || restoreModalOrder.deletedAt
                    ? new Date(restoreModalOrder.deleted_at || restoreModalOrder.deletedAt).toLocaleDateString('en-GB')
                    : '—'}
                </b>
              </div>
              <div className="summaryRow">
                <span>Remaining Recovery Period:</span>
                <b style={{ color: '#10b981' }}>
                  {calculateDaysRemaining(restoreModalOrder.restore_until || restoreModalOrder.restoreUntil)} days remaining
                </b>
              </div>
            </div>

            <div className="restoreModalActions">
              <button
                type="button"
                className="outlineBtn cancelRestoreBtn"
                onClick={() => setRestoreModalOrder(null)}
                disabled={isRestoring}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="confirmRestoreBtn"
                onClick={() => handleRestore(restoreModalOrder)}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <>
                    <Loader2 size={16} className="spinIcon" />
                    <span>RESTORING…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>RESTORE ORDER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
