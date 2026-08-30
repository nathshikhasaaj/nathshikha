import React, { useMemo } from 'react';
import { Truck, Edit3, Eye, MessageSquare, Package, Clock, ExternalLink, Boxes } from 'lucide-react';
import { formatOrderDate } from '../../utils/formatters';
import './AdminShipmentTable.css';

export default function AdminShipmentTable({
  orders = [],
  onEditShipment,
  onViewOrder
}) {
  // Aggregate shipped orders and group by Shipment Group where applicable
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

  return (
    <div className="adminShipmentSection">
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

        {shipmentItems.length > 0 ? (
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
                  {shipmentItems.map((item) => {
                    const o = item.primaryOrder;
                    const cleanPhone = (o.phone || '').replace(/\D/g, '');
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
              {shipmentItems.map((item) => {
                const o = item.primaryOrder;
                const cleanPhone = (o.phone || '').replace(/\D/g, '');
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
          </>
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
