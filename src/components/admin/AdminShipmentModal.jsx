import React, { useState, useEffect } from 'react';
import { X, Truck, PackageCheck, AlertCircle, Hash, User, Phone, IndianRupee, Boxes } from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminShipmentModal.css';

const SHIPMENT_PARTNERS = [
  'Speed Post',
  'Shree Anjani',
  'Shree Mahaveer',
  'Shree Maruti',
  'Other'
];

export default function AdminShipmentModal({
  order,
  isOpen,
  onClose,
  onSaveShipment,
  isEditing = false
}) {
  const [shipmentPartner, setShipmentPartner] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setShipmentPartner(order.shipment_partner || order.shipmentPartner || 'Speed Post');
      setTrackingId(order.tracking_id || order.trackingId || '');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const groupCode = order.shipment_group_code || order.shipmentGroupCode || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPartner = String(shipmentPartner || '').trim();
    const cleanTracking = String(trackingId || '').trim();

    if (!cleanPartner) {
      setError('Please select a shipment partner.');
      return;
    }

    if (!cleanTracking) {
      setError('Please enter the tracking ID.');
      return;
    }

    setSubmitting(true);
    try {
      await onSaveShipment(order.id || order._id, {
        shipmentPartner: cleanPartner,
        trackingId: cleanTracking
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save shipment details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalContainer shipmentModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modalHeader">
          <div className="modalHeaderTitle">
            <div className="modalBadge">
              <Truck size={18} />
            </div>
            <div>
              <h3>Shipment Details</h3>
              <p>
                {isEditing
                  ? 'Update tracking & logistics partner information'
                  : 'Record shipment information and mark order as Shipped'}
              </p>
            </div>
          </div>
          <button
            className="modalCloseBtn"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shipment Group Notice if applicable */}
        {groupCode && (
          <div className="modalShipmentGroupNotice">
            <Boxes size={16} />
            <div>
              <b>Combined Shipment · Group #{groupCode}</b>
              <p>
                Saving tracking details here will automatically update and synchronize all member orders in this Shipment Group (Order #{order.order_no || order.orderNo}
                {order.co_shipped_orders?.length > 0 ? `, #${order.co_shipped_orders.join(', #')}` : ''}).
              </p>
            </div>
          </div>
        )}

        {/* Order Info Summary Strip */}
        <div className="shipmentOrderContextBox">
          <div className="contextItem">
            <span className="contextLabel">
              <Hash size={11} /> Order ID
            </span>
            <span className="contextVal"><b>#{order.order_no || order.orderNo}</b></span>
          </div>

          <div className="contextItem">
            <span className="contextLabel">
              <User size={11} /> Customer Name
            </span>
            <span className="contextVal">{order.name}</span>
          </div>

          <div className="contextItem">
            <span className="contextLabel">
              <Phone size={11} /> Contact Number
            </span>
            <span className="contextVal">{order.phone}</span>
          </div>

          <div className="contextItem">
            <span className="contextLabel">
              <IndianRupee size={11} /> Order Amount
            </span>
            <span className="contextVal"><b>{money(order.total)}</b></span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="shipmentDetailsForm">
          {error && (
            <div className="modalAlert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="shipmentFieldsGroup">
            {/* 1. Shipment Partner */}
            <div className="formGroup">
              <label htmlFor="shipmentPartnerSelect">
                Shipment Partner <span className="reqStar">*</span>
              </label>
              <select
                id="shipmentPartnerSelect"
                value={shipmentPartner}
                onChange={(e) => setShipmentPartner(e.target.value)}
                className="modalSelect"
                required
              >
                <option value="">-- Select Shipment Partner --</option>
                {SHIPMENT_PARTNERS.map((partner) => (
                  <option key={partner} value={partner}>
                    {partner}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Tracking ID */}
            <div className="formGroup">
              <label htmlFor="trackingIdInput">
                Tracking ID <span className="reqStar">*</span>
              </label>
              <input
                id="trackingIdInput"
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking ID (e.g. EM123456789IN / SM123456)"
                className="modalInput trackingInput"
                required
              />
              <small className="fieldHintText">
                ✦ Exact tracking number provided by the courier partner for customer reference.
              </small>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modalActions">
            <button
              type="button"
              className="outlineBtn modalCancelBtn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn modalSubmitBtn"
              disabled={submitting}
            >
              <PackageCheck size={15} />
              <span>
                {submitting
                  ? 'SAVING…'
                  : isEditing
                  ? 'Update Shipment Details'
                  : 'Mark as Shipped'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
