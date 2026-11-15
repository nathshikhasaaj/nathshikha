import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Truck, Edit3, Eye, MessageSquare, Package, Clock, ExternalLink, Boxes, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatOrderDate, formatWhatsAppPhone } from '../../utils/formatters';
import AdminDropdown from './AdminDropdown';
import './AdminShipmentTable.css';

export default function AdminShipmentTable({
  orders = [],
  onEditShipment,
  onViewOrder
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const shipmentSectionRef = useRef(null);

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

  // 2. Default Sort: Newest shipments first (by shipped/dispatch date or createdAt)
  const sortedShipmentItems = useMemo(() => {
    return [...shipmentItems].sort((a, b) => {
      const oA = a.primaryOrder;
      const oB = b.primaryOrder;
      const timeA = new Date(
        oA.shipped_at || oA.shippedAt || oA.dispatched_at || oA.dispatchedAt || oA.shipment_date || oA.created_at || oA.createdAt || 0
      ).getTime();
      const timeB = new Date(
        oB.shipped_at || oB.shippedAt || oB.dispatched_at || oB.dispatchedAt || oB.shipment_date || oB.created_at || oB.createdAt || 0
      ).getTime();

      if (timeB !== timeA) return timeB - timeA;
      const idA = String(oA.order_no || oA.orderNo || oA.id || oA._id || '');
      const idB = String(oB.order_no || oB.orderNo || oB.id || oB._id || '');
      return idB.localeCompare(idA);
    });
  }, [shipmentItems]);

  // 3. Search Filter: Filter shipments by #order, group code, customer, phone, courier partner, tracking ID
  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return sortedShipmentItems;
    const q = searchQuery.trim().toLowerCase();
    return sortedShipmentItems.filter((item) => {
      const o = item.primaryOrder;
      const orderNo = String(o.order_no || o.orderNo || '').toLowerCase();
      const groupCode = String(item.groupCode || '').toLowerCase();
      const name = String(o.name || '').toLowerCase();
      const phone = String(o.phone || '').toLowerCase();
      const partner = String(o.shipment_partner || o.shipmentPartner || '').toLowerCase();
      const tracking = String(o.tracking_id || o.trackingId || '').toLowerCase();
      const subNos = item.orders.map((x) => String(x.order_no || x.orderNo || '').toLowerCase()).join(' ');

      return (
        orderNo.includes(q) ||
        groupCode.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        partner.includes(q) ||
        tracking.includes(q) ||
        subNos.includes(q)
      );
    });
  }, [sortedShipmentItems, searchQuery]);

  // 4. Reset to page 1 on search or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // 5. Pagination Calculation
  const totalShipments = filteredShipments.length;
  const totalPages = Math.max(1, Math.ceil(totalShipments / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedShipments = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (shipmentSectionRef.current) {
      shipmentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalShippedOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.order_status === 'shipped' ||
        o.orderStatus === 'shipped' ||
        Boolean(o.shipment_partner || o.shipmentPartner || o.tracking_id || o.trackingId)
    ).length;
  }, [orders]);

  const pageSizeOptions = [
    { value: 10, label: '10 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' },
    { value: 100, label: '100 / page' }
  ];

  return (
    <div className="adminShipmentSection" ref={shipmentSectionRef}>
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

          <div className="headerRight shipmentHeaderControls">
            {/* Shipment Quick Search */}
            <div className="shipmentSearchWrap">
              <Search size={14} className="shipmentSearchMagnifier" />
              <input
                type="text"
                className="shipmentSearchInput"
                placeholder="Search shipments by order #, tracking ID, customer, partner…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search shipments"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="shipmentClearSearchBtn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <span className="shippedCountBadge">
              <b>{shipmentItems.length}</b> Shipments · <b>{totalShippedOrdersCount}</b> Orders
            </span>
          </div>
        </div>

        {shipmentItems.length > 0 ? (
          filteredShipments.length > 0 ? (
            <>
              {/* Desktop Table */}
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

                          {/* 5. Tracking ID */}
                          <td className="trackingCell">
                            <code className="trackingCode">{tracking}</code>
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
                                title="View order details"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Shipment Cards */}
              <div className="mobileShipmentsList">
                {paginatedShipments.map((item) => {
                  const o = item.primaryOrder;
                  const cleanPhone = formatWhatsAppPhone(o.phone);
                  const partner = o.shipment_partner || o.shipmentPartner || 'Speed Post';
                  const tracking = o.tracking_id || o.trackingId || '—';
                  const shippedTimestamp = o.shipped_at || o.shippedAt || o.updatedAt || o.created_at;
                  const { dateStr, timeStr } = formatOrderDate(shippedTimestamp);
                  const orderNos = item.orders.map((x) => x.order_no || x.orderNo);

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
                        <div>
                          <b className="mobileShipmentCustName">{o.name}</b>
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
                          <code className="trackingCode">{tracking}</code>
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

              {/* Independent Shipment Pagination Bar */}
              <footer className="shipmentPaginationBar">
                <div className="shipmentPaginationInfo">
                  <span>
                    Showing <b>{(safeCurrentPage - 1) * pageSize + 1}</b>–
                    <b>{Math.min(safeCurrentPage * pageSize, totalShipments)}</b> of <b>{totalShipments}</b> shipments
                    {totalShipments !== shipmentItems.length && (
                      <span className="filteredShipmentHint"> (filtered from {shipmentItems.length})</span>
                    )}
                  </span>
                </div>

                <div className="shipmentPaginationControls">
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

                  <div className="shipmentPageNavButtons">
                    <button
                      type="button"
                      className="shipmentNavBtn"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                      title="Previous page"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {totalPages > 1 && (
                      <div className="shipmentPagePills">
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
                              <span key={`s-ellipsis-${p}`} className="pageEllipsis">…</span>
                            ) : (
                              <button
                                key={`s-page-${p}`}
                                type="button"
                                className={`pagePillBtn ${p === safeCurrentPage ? 'active' : ''}`}
                                onClick={() => handlePageChange(p)}
                                aria-label={`Go to shipment page ${p}`}
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
                      className="shipmentNavBtn"
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
            <div className="empty small shipmentEmpty">
              <Search size={36} color="var(--gold)" />
              <p>No shipments match "{searchQuery}"</p>
              <button
                type="button"
                className="outlineBtn compact emptyShipmentClearBtn"
                onClick={() => setSearchQuery('')}
              >
                Clear Shipment Search
              </button>
            </div>
          )
        ) : (
          <div className="empty small shipmentEmpty">
            <Truck size={36} color="var(--gold)" />
            <p>No shipped orders recorded yet.</p>
            <small style={{ color: '#8c7d76', fontSize: 11 }}>
              When you change an order's status to <b>Shipped</b> and enter tracking details, it will appear here automatically.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
