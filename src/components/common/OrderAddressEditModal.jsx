import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  User,
  Phone,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save
} from 'lucide-react';
import { api } from '../../services/api';
import './OrderAddressEditModal.css';

const INDIAN_STATES = [
  'Maharashtra',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh'
];

export default function OrderAddressEditModal({
  isOpen,
  onClose,
  order,
  onSuccess,
  setToast
}) {
  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    address: '',
    pincode: '',
    city: '',
    state: 'Maharashtra'
  });

  const [loading, setLoading] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setForm({
        recipientName: order.recipient_name || order.recipientName || order.name || '',
        recipientPhone: order.recipient_phone || order.recipientPhone || order.phone || '',
        address: order.address || '',
        pincode: order.pincode || '',
        city: order.city || '',
        state: order.state || 'Maharashtra'
      });
      setError('');
      setLoading(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const orderStatus = String(order.order_status || order.orderStatus || 'placed').toLowerCase();
  const isLocked = ['shipped', 'delivered', 'cancelled'].includes(orderStatus);

  const handlePincodeLookup = async (pinVal) => {
    const clean = String(pinVal || '').trim();
    if (clean.length !== 6 || !/^[1-9][0-9]{5}$/.test(clean)) return;

    setLookingUpPin(true);
    try {
      const res = await api(`/orders/shipping/lookup/${clean}`);
      if (res && res.valid) {
        setForm((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state
        }));
      }
    } catch {
      // Ignore background lookup failure
    } finally {
      setLookingUpPin(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'pincode' && String(value).trim().length === 6) {
      handlePincodeLookup(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError('This order has already reached shipment or completion stage and its delivery address is permanently locked.');
      return;
    }

    const cleanAddress = form.address.trim();
    if (!cleanAddress) {
      setError('Please enter your complete delivery street address.');
      return;
    }

    const cleanPin = form.pincode.trim();
    if (cleanPin && !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    const cleanPhone = form.recipientPhone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const orderId = order.id || order._id;
      const res = await api(`/orders/${orderId}/address`, {
        method: 'PUT',
        body: JSON.stringify({
          address: cleanAddress,
          pincode: cleanPin,
          city: form.city.trim(),
          state: form.state.trim(),
          recipientName: form.recipientName.trim(),
          recipientPhone: cleanPhone.slice(-10)
        })
      });

      if (res && (res.ok || res.success)) {
        if (setToast) {
          setToast('✓ Delivery address updated successfully for this order.');
        }
        if (onSuccess) {
          onSuccess(res.order || { ...order, ...form });
        }
        onClose();
      } else {
        throw new Error(res.message || 'Failed to update delivery address.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save address changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custAddressModalOverlay" onClick={onClose}>
      <div
        className="custAddressModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="custAddressModalTitle"
      >
        <div className="custAddressModalHeader">
          <div className="custAddressModalTitleWrap">
            <div className="custAddressModalIcon">
              <MapPin size={18} />
            </div>
            <div>
              <h3 id="custAddressModalTitle">Update Delivery Address</h3>
              <p>Order #{order.order_no || order.orderNo}</p>
            </div>
          </div>
          <button
            type="button"
            className="custAddressModalClose"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isLocked && (
          <div className="custAddressLockedNotice">
            <Lock size={16} color="#92400e" />
            <div>
              <strong>🔒 Shipping Address Locked</strong>
              <p>
                Your shipping details can no longer be changed because this order has already been shipped.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="custAddressErrorAlert">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="custAddressForm">
          {/* Customer / Recipient Name Field */}
          {order.isGift ? (
            <div className="custAddressFieldGroup">
              <label htmlFor="modalRecipientName">
                Gift Recipient Full Name <span className="reqStar">*</span>
              </label>
              <div className="custAddressInputWrap">
                <User size={15} />
                <input
                  id="modalRecipientName"
                  type="text"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleInputChange}
                  placeholder="Recipient Name"
                  disabled={isLocked || loading}
                  maxLength={100}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="custAddressFieldGroup lockedField">
              <label htmlFor="modalCustomerName">
                Customer Name <Lock size={12} />
              </label>
              <div className="custAddressInputWrap">
                <User size={15} />
                <input
                  id="modalCustomerName"
                  type="text"
                  value={order.name || form.recipientName}
                  disabled
                  readOnly
                  className="lockedModalInput"
                />
                <span className="modalLockBadge">🔒 Locked</span>
              </div>
              <small className="fieldHintSmall">Customer name on order is permanent.</small>
            </div>
          )}

          <div className="custAddressFieldGroup">
            <label htmlFor="modalRecipientPhone">
              {order.isGift ? 'Recipient Contact Number' : 'Contact Mobile Number (10 digits)'}{' '}
              <span className="reqStar">*</span>
            </label>
            <div className="custAddressInputWrap">
              <Phone size={15} />
              <input
                id="modalRecipientPhone"
                type="tel"
                name="recipientPhone"
                value={form.recipientPhone}
                onChange={handleInputChange}
                placeholder="10-digit mobile number"
                disabled={isLocked || loading}
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="custAddressFieldGroup">
            <label htmlFor="modalStreetAddress">
              Complete Street Address <span className="reqStar">*</span>
            </label>
            <textarea
              id="modalStreetAddress"
              name="address"
              value={form.address}
              onChange={handleInputChange}
              placeholder="Flat/House No., Building Name, Street, Area, Landmark..."
              rows={3}
              required
              disabled={isLocked || loading}
              maxLength={400}
            />
          </div>

          <div className="custAddressRowTwoCol">
            <div className="custAddressFieldGroup">
              <label htmlFor="modalPincode">
                PIN Code <span className="reqStar">*</span>
              </label>
              <div className="custAddressInputWrap">
                <input
                  id="modalPincode"
                  type="text"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleInputChange}
                  placeholder="6-digit PIN"
                  maxLength={6}
                  required
                  disabled={isLocked || loading}
                />
                {lookingUpPin && (
                  <Loader2 size={14} className="spinIcon pinSpinner" />
                )}
              </div>
            </div>

            <div className="custAddressFieldGroup">
              <label htmlFor="modalCity">City / District</label>
              <input
                id="modalCity"
                type="text"
                name="city"
                value={form.city}
                onChange={handleInputChange}
                placeholder="City Name"
                disabled={isLocked || loading}
                maxLength={100}
              />
            </div>
          </div>

          <div className="custAddressFieldGroup">
            <label htmlFor="modalState">State</label>
            <select
              id="modalState"
              name="state"
              value={form.state}
              onChange={handleInputChange}
              disabled={isLocked || loading}
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="custAddressModalFooter">
            <button
              type="button"
              className="outlineBtn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn"
              disabled={isLocked || loading}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spinIcon" />
                  <span>SAVING…</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>UPDATE ADDRESS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
