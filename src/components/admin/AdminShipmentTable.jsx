import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Truck,
  Edit3,
  Eye,
  MessageSquare,
  Package,
  Clock,
  ExternalLink,
  Boxes,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { formatOrderDate, formatWhatsAppPhone } from '../../utils/formatters';
import './AdminShipmentTable.css';

export default function AdminShipmentTable({
  orders = [],
  onEditShipment,
  onViewOrder
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedTrackingId, setCopiedTrackingId] = useState(null);
  const shipmentTableSectionRef = useRef(null);

  // 1. Aggregate shipped orders and group by Shipment Group where applicable
  const shipmentItems = useMemo(() => {
    const shippedOrders = orders.filter(
      (o) =>
        o.order_status === 'shipped' ||
        o.orderStatus === 'shipped' ||
        Boolean(o.shipment_partner || o.shipmentPartner || o.tracking_id || o.trackingId)
    );

    const groupMap = new Map();
    const items = [];

    for (const ord of shippedOrders) {
      const gCode = ord.shipment_group_code || ord.shipmentGroupCode;
      if (gCode) {
        if (!groupMap.has(gCode)) {
          const groupEntry = {
            id: `group-${gCode}`,
            isGroup: true,
            groupCode: gCode,
            orders: [ord],
            primaryOrder: ord
          };
          groupMap.set(gCode, groupEntry);
          items.push(groupEntry);
        } else {
          groupMap.get(gCode).orders.push(ord);
        }
      } else {
        items.push({
          id: ord.id || ord._id,
          isGroup: false,
          groupCode: null,
          orders: [ord],
          primaryOrder: ord
        });
      }
    }

    return items;
  }, [orders]);

  const totalShippedOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.order_status === 'shipped' ||
        o.orderStatus === 'shipped' ||
        Boolean(o.shipment_partner || o.shipmentPartner || o.tracking_id || o.trackingId)
    ).length;
  }, [orders]);

  // 2. Filter shipments by search query
  const filteredShipments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return shipmentItems;

    return shipmentItems.filter((item) => {
      const o = item.primaryOrder;
      const cleanPhone = (o.phone || '').replace(/\D/g, '');
      const partner = (o.shipment_partner || o.shipmentPartner || '').toLowerCase();
      const tracking = (o.tracking_id || o.trackingId || '').toLowerCase();
      const customerName = (o.name || o.recipient_name || o.recipientName || '').toLowerCase();
      const groupCode = (item.groupCode || '').toLowerCase();
      const orderNos = item.orders.map((x) => String(x.order_no || x.orderNo || '').toLowerCase());

      return (
        customerName.includes(query) ||
        cleanPhone.includes(query) ||
        partner.includes(query) ||
        tracking.includes(query) ||
        groupCode.includes(query) ||
        orderNos.some((num) => num.includes(query))
      );
    });
  }, [shipmentItems, searchQuery]);

  // Auto-reset to page 1 when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // 3. Pagination math
  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedShipments = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, safeCurrentPage, pageSize]);

  const startItem = filteredShipments.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, filteredShipments.length);

  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    if (shipmentTableSectionRef.current) {
      shipmentTableSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyTracking = (tracking) => {
    if (!tracking || tracking === '—') return;
    try {
      navigator.clipboard.writeText(tracking);
      setCopiedTrackingId(tracking);
      setTimeout(() => setCopiedTrackingId(null), 1800);
    } catch (err) {
      console.warn('Failed to copy tracking id:', err);
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  return (
    <div className="adminShipmentSection" ref={shipmentTableSectionRef}>
      <div className="adminCard shipmentTableCard">
        {/* Table Header */}
        <div className="shipmentTableHeader">
          <div className="headerLeft">
            <div className="shipmentBadge">
              <Truck size={18} />
            </div>
            <div>
              <h3>Shipment Details</h3>
              <p>Logistics tracking and dispatch records for fulfilled orders & combined shipments</p>
            </div>
          </div>
          <div className="headerRight">
            <span className="shippedCountBadge">
              <b>{shipmentItems.length}</b> Shipments · <b>{totalShippedOrdersCount}</b> Orders
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="shipmentControlsBar">
          <div className="shipmentSearchBox">
            <Search size={15} className="shipmentSearchIcon" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Phone, Tracking ID, Partner, or Group Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shipmentSearchInput"
            />
            {searchQuery && (
              <button
                type="button"
                className="clearShipmentSearchBtn"
                onClick={() => setSearchQuery('')}
                title="Clear shipment search"
                aria-label="Clear shipment search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="shipmentSearchResultsText">
              Found <b>{filteredShipments.length}</b> matching shipments
            </div>
          )}
        </div>

        {filteredShipments.length > 0 ? (
          <>
            {/* Desktop Table (>= 850px) */}
            <div className="shipmentTableContainer desktopOnlyShipmentTable">
              <table className="shipmentOperationalTable">
                <thead>
                  <tr>
                    <th>Shipment / Order ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Shipment Partner</th>
                    <th>Tracking ID</th>
                    <th>Shipped Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShipments.map((item) => {
                    const o = item.primaryOrder;
                    const cleanPhone = formatWhatsAppPhone(o.phone);
                    const partner = o.shipment_partner || o.shipmentPartner || 'Speed Post';
                    const tracking = o.tracking_id || o.trackingId || '—';
                    const shippedTimestamp = o.shipped_at || o.shippedAt || o.updatedAt || o.created_at;
                    const { dateStr, timeStr } = formatOrderDate(shippedTimestamp);
                    const orderNos = item.orders.map((x) => x.order_no || x.orderNo);
                    const isCopied = copiedTrackingId === tracking;

                    return (
                      <tr key={item.id} className={item.isGroup ? 'combinedShipmentRow' : ''}>
                        {/* 1. Shipment Group / Order ID */}
                        <td className="orderIdCell">
                          {item.isGroup ? (
                            <div className="groupedShipmentCell">
                              <span className="shipmentGroupTag">
                                <Boxes size={12} /> {item.groupCode}
                              </span>
                              <div className="groupOrdersPills">
                                {item.orders.map((subOrd) => (
                                  <span key={subOrd.id || subOrd._id} className="subOrderPill">
                                    #{subOrd.order_no || subOrd.orderNo}
                                  </span>
                                ))}
                              </div>
                              <small className="combinedShipmentNoteText">
                                {item.orders.length} orders in 1 parcel
                              </small>
                            </div>
                          ) : (
                            <b>#{o.order_no || o.orderNo}</b>
                          )}
                        </td>

                        {/* 2. Customer */}
                        <td className="customerCell">
                          <b>{o.name || o.recipient_name || o.recipientName}</b>
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
                              )}%2C%20your%20Nathshikha%20shipment%20${
                                item.isGroup ? `(${item.groupCode} for Orders ${orderNos.join(', ')})` : `(#${o.order_no || o.orderNo})`
                              }%20has%20been%20shipped%20via%20${encodeURIComponent(
                                partner
                              )}%20with%20Tracking%20ID%3A%20${encodeURIComponent(tracking)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="waIconBtn"
                              title="Send Tracking on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                        </td>

                        {/* 4. Shipment Partner */}
                        <td className="partnerCell">
                          <span className="partnerBadge">{partner}</span>
                        </td>

                        {/* 5. Tracking ID with 1-click Copy */}
                        <td className="trackingCell">
                          <div className="trackingCellWrap">
                            <code className="trackingCode">{tracking}</code>
                            {tracking && tracking !== '—' && (
                              <button
                                type="button"
                                className={`copyTrackingBtn ${isCopied ? 'copied' : ''}`}
                                onClick={() => handleCopyTracking(tracking)}
                                title={isCopied ? 'Copied to clipboard!' : 'Copy Tracking ID'}
                                aria-label="Copy tracking ID"
                              >
                                {isCopied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Shipped Date */}
                        <td className="shippedDateCell">
                          <div className="dateWrap">
                            <span className="dateText">{dateStr}</span>
                            {timeStr && <small className="timeText">{timeStr}</small>}
                          </div>
                        </td>

                        {/* 7. Order Status */}
                        <td className="statusCell">
                          <span className="shippedStatusBadge">
                            <Truck size={12} /> Shipped
                          </span>
                        </td>

                        {/* 8. Action */}
                        <td className="actionsCell">
                          <div className="shipmentActionButtons">
                            <button
                              type="button"
                              className="outlineBtn compact editShipmentBtn"
                              onClick={() => onEditShipment(o)}
                              title={item.isGroup ? `Edit shipment for all ${item.orders.length} orders in ${item.groupCode}` : 'Edit shipment details'}
                            >
                              <Edit3 size={13} />
                              <span>{item.isGroup ? 'Edit Group' : 'Edit Shipment'}</span>
                            </button>

                            <button
                              type="button"
                              className="outlineBtn compact viewOrderBtn"
                              onClick={() => onViewOrder(o)}
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

            {/* Mobile Shipment Cards (< 850px) */}
            <div className="mobileShipmentsList">
              {paginatedShipments.map((item) => {
                const o = item.primaryOrder;
                const cleanPhone = formatWhatsAppPhone(o.phone);
                const partner = o.shipment_partner || o.shipmentPartner || 'Speed Post';
                const tracking = o.tracking_id || o.trackingId || '—';
                const shippedTimestamp = o.shipped_at || o.shippedAt || o.updatedAt || o.created_at;
                const { dateStr, timeStr } = formatOrderDate(shippedTimestamp);
                const orderNos = item.orders.map((x) => x.order_no || x.orderNo);
                const isCopied = copiedTrackingId === tracking;

                return (
                  <div key={item.id} className="mobileShipmentCard">
                    <div className="mobileShipmentCardHeader">
                      <div>
                        {item.isGroup ? (
                          <div className="groupedShipmentCell">
                            <span className="shipmentGroupTag">
                              <Boxes size={12} /> {item.groupCode}
                            </span>
                            <small className="combinedShipmentNoteText">
                              {item.orders.length} orders in 1 parcel (#{orderNos.join(', #')})
                            </small>
                          </div>
                        ) : (
                          <b className="mobileShipmentOrderNo">#{o.order_no || o.orderNo}</b>
                        )}
                        <span className="mobileShipmentDate">{dateStr} {timeStr ? `· ${timeStr}` : ''}</span>
                      </div>
                      <span className="shippedStatusBadge">
                        <Truck size={12} /> Shipped
                      </span>
                    </div>

                    <div className="mobileShipmentCustomerRow">
                      <div className="mobileCustomerInfoBlock">
                        <b className="mobileShipmentCustName">{o.name || o.recipient_name || o.recipientName}</b>
                        <span className="mobileShipmentCustPhone">{o.phone}</span>
                      </div>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                            o.name
                          )}%2C%20your%20Nathshikha%20shipment%20${
                            item.isGroup ? `(${item.groupCode})` : `(#${o.order_no || o.orderNo})`
                          }%20has%20been%20shipped%20via%20${encodeURIComponent(
                            partner
                          )}%20with%20Tracking%20ID%3A%20${encodeURIComponent(tracking)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mobileCardWaBtn"
                          title="WhatsApp Tracking to Customer"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    <div className="mobileTrackingBlock">
                      <div className="mobilePartnerRow">
                        <span className="mobileTrackingLabel">Partner:</span>
                        <span className="partnerBadge">{partner}</span>
                      </div>
                      <div className="mobileTrackingIdRow">
                        <span className="mobileTrackingLabel">Tracking ID:</span>
                        <div className="trackingCellWrap">
                          <code className="trackingCode">{tracking}</code>
                          {tracking && tracking !== '—' && (
                            <button
                              type="button"
                              className={`copyTrackingBtn ${isCopied ? 'copied' : ''}`}
                              onClick={() => handleCopyTracking(tracking)}
                              title={isCopied ? 'Copied!' : 'Copy Tracking ID'}
                              aria-label="Copy tracking ID"
                            >
                              {isCopied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mobileShipmentActionsRow">
                      <button
                        type="button"
                        className="outlineBtn compact mobileActionBtn"
                        onClick={() => onEditShipment(o)}
                      >
                        <Edit3 size={13} />
                        <span>{item.isGroup ? 'Edit Group' : 'Edit Shipment'}</span>
                      </button>
                      <button
                        type="button"
                        className="outlineBtn compact mobileActionBtn"
                        onClick={() => onViewOrder(o)}
                      >
                        <Eye size={13} />
                        <span>View Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shipment Pagination Bar */}
            <div className="adminShipmentPaginationBar">
              <div className="shipmentPaginationInfo">
                <span>
                  Showing <b>{startItem}</b>–<b>{endItem}</b> of <b>{filteredShipments.length}</b> shipments
                </span>
                {totalPages > 1 && (
                  <span className="shipmentPageCountLabel">
                    · Page <b>{safeCurrentPage}</b> of <b>{totalPages}</b>
                  </span>
                )}
              </div>

              <div className="shipmentPaginationActions">
                <div className="shipmentPageSizeSelectWrap">
                  <label htmlFor="shipmentPageSizeSelect">Rows per page:</label>
                  <select
                    id="shipmentPageSizeSelect"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="shipmentPageSizeSelect"
                  >
                    <option value={10}>10 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                  </select>
                </div>

                {totalPages > 1 && (
                  <div className="shipmentPaginationNav">
                    <button
                      type="button"
                      className="shipmentPageNavBtn"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      title="Previous Page"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft size={15} />
                      <span className="pageNavText">Prev</span>
                    </button>

                    <div className="shipmentPagePillsList">
                      {getPageNumbers().map((item, idx) =>
                        item === '...' ? (
                          <span key={`dots-${idx}`} className="shipmentPageDots">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`shipmentPagePill ${safeCurrentPage === item ? 'active' : ''}`}
                            onClick={() => handlePageChange(item)}
                            title={`Go to page ${item}`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>

                    <div className="shipmentMobilePageBadge">
                      {safeCurrentPage} / {totalPages}
                    </div>

                    <button
                      type="button"
                      className="shipmentPageNavBtn"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      title="Next Page"
                      aria-label="Next Page"
                    >
                      <span className="pageNavText">Next</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty small shipmentEmpty">
            <Truck size={36} color="var(--gold)" />
            <p>
              {searchQuery
                ? `No shipments found matching "${searchQuery}".`
                : 'No shipped orders recorded yet.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className="outlineBtn compact"
                onClick={() => setSearchQuery('')}
              >
                Clear Search Filter
              </button>
            ) : (
              <small style={{ color: '#8c7d76', fontSize: 11 }}>
                When you change an order's status to <b>Shipped</b> and enter tracking details, it will appear here automatically.
              </small>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
