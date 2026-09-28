import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  User,
  Phone,
  Mail,
  MapPin,
  Gift,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Package,
  CreditCard,
  Truck,
  Loader2,
  FileText
} from 'lucide-react';
import { money, formatOrderStatus } from '../../utils/formatters';
import { api } from '../../services/api';
import './AdminOrderEditModal.css';

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

export default function AdminOrderEditModal({
  order,
  isOpen,
  onClose,
  onSaveOrderEdit
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pincode: '',
    city: '',
    state: 'Maharashtra',
    isGift: false,
    recipientName: '',
    recipientPhone: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customizationDetails: '',
    adminEditNotes: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpPincode, setLookingUpPincode] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      const isGiftBool = Boolean(order.is_gift || order.isGift);
      const buyerName = order.customer_name || order.customerName || order.name || '';
      const buyerPhone = order.customer_phone || order.customerPhone || order.phone || '';
      const buyerEmail = order.customer_email || order.customerEmail || order.email || '';
      const recipientName = order.recipient_name || order.recipientName || order.name || '';
      const recipientPhone = order.recipient_phone || order.recipientPhone || order.phone || '';

      setFormData({
        name: isGiftBool ? recipientName : (order.name || buyerName),
        phone: isGiftBool ? recipientPhone : (order.phone || buyerPhone),
        email: buyerEmail,
        address: order.address || '',
        pincode: order.pincode || '',
        city: order.city || '',
        state: order.state || 'Maharashtra',
        isGift: isGiftBool,
        recipientName,
        recipientPhone,
        customerName: buyerName,
        customerPhone: buyerPhone,
        customerEmail: buyerEmail,
        customizationDetails: order.customization?.details || '',
        adminEditNotes: ''
      });
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const isShipped =
    order.order_status === 'shipped' ||
    order.orderStatus === 'shipped' ||
    Boolean(order.shipment_partner || order.tracking_id || order.trackingId);

  const isVerified =
    order.payment_status === 'verified' ||
    order.paymentStatus === 'verified' ||
    order.payment_status === 'paid';

  const handlePincodeLookup = async (pincodeVal) => {
    const cleanPin = String(pincodeVal || '').trim();
    if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      return;
    }

    setLookingUpPincode(true);
    try {
      const res = await api(`/orders/shipping/lookup/${cleanPin}`);
      if (res && res.valid) {
        setFormData((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state
        }));
      }
    } catch {
      // Ignore background lookup errors, admin can type city/state manually
    } finally {
      setLookingUpPincode(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val
    }));

    if (name === 'pincode' && String(val).trim().length === 6) {
      handlePincodeLookup(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    const cleanName = formData.name.trim();
    if (!cleanName) {
      setError('Please enter the customer / recipient name.');
      return;
    }

    const cleanPhoneDigits = formData.phone.replace(/\D/g, '');
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const cleanAddress = formData.address.trim();
    if (!cleanAddress) {
      setError('Please enter the complete delivery address.');
      return;
    }

    const cleanPincode = formData.pincode.trim();
    if (cleanPincode && !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      setError('Please enter a valid 6-digit PIN code.');
      return;
    }

    if (formData.isGift) {
      if (!formData.recipientName.trim()) {
        setError('Please enter the gift recipient name.');
        return;
      }
      const cleanRecPhone = formData.recipientPhone.replace(/\D/g, '');
      if (!cleanRecPhone || cleanRecPhone.length < 10) {
        setError('Please enter a valid 10-digit phone number for the gift recipient.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSaveOrderEdit(order.id || order._id, {
        name: cleanName,
        phone: cleanPhoneDigits.slice(-10),
        email: cleanEmail,
        address: cleanAddress,
        pincode: cleanPincode,
        city: formData.city.trim(),
        state: formData.state.trim(),
        isGift: formData.isGift,
        recipientName: formData.isGift ? formData.recipientName.trim() : cleanName,
        recipientPhone: formData.isGift ? formData.recipientPhone.replace(/\D/g, '').slice(-10) : cleanPhoneDigits.slice(-10),
        customerName: formData.isGift ? (formData.customerName.trim() || cleanName) : cleanName,
        customerPhone: formData.isGift ? (formData.customerPhone.replace(/\D/g, '').slice(-10) || cleanPhoneDigits.slice(-10)) : cleanPhoneDigits.slice(-10),
        customerEmail: formData.isGift ? (formData.customerEmail.trim().toLowerCase() || cleanEmail) : cleanEmail,
        customizationDetails: formData.customizationDetails.trim(),
        adminEditNotes: formData.adminEditNotes.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save order updates. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adminEditModalOverlay" onClick={onClose}>
      <div
        className="adminEditModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editOrderModalTitle"
      >
        {/* Modal Header */}
        <div className="adminEditModalHeader">
          <div className="adminEditModalHeaderTitle">
            <div className="adminEditModalBadge">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 id="editOrderModalTitle">Edit Order #{order.order_no || order.orderNo}</h3>
              <p>
                Update customer contact info, delivery address & customization details
              </p>
            </div>
          </div>
          <button
            className="adminEditModalCloseBtn"
            onClick={onClose}
            type="button"
            aria-label="Close"
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Shipped Warning Alert if applicable */}
        {isShipped && (
          <div className="adminEditShippedWarning">
            <AlertTriangle size={18} color="#b45309" />
            <div>
              <strong>Order has already been marked as Shipped</strong>
              <p>
                Tracking ID: <code>{order.tracking_id || order.trackingId || 'Recorded'}</code> ({order.shipment_partner || order.shipmentPartner || 'Speed Post'}).
                Editing delivery details here updates records, invoices, and customer tracking views, but will not automatically reroute a parcel already in physical transit.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="adminEditErrorAlert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="adminEditOrderForm">
          <div className="adminEditFormGrid">
            {/* LEFT COLUMN: Customer & Recipient Details */}
            <div className="adminEditSectionCard">
              <div className="adminEditSectionHeader">
                <User size={16} />
                <h4>Customer & Buyer Information</h4>
              </div>

              {/* Gift Order Toggle */}
              <div className="adminEditGiftToggleWrap">
                <label className="adminEditCheckboxLabel">
                  <input
                    type="checkbox"
                    name="isGift"
                    checked={formData.isGift}
                    onChange={handleInputChange}
                    className="adminEditCheckbox"
                  />
                  <span className="adminEditCheckboxCustom"></span>
                  <span className="adminEditGiftText">
                    <Gift size={14} color="#9d174d" />
                    <strong>This is a Gift Order (Separate Buyer & Recipient)</strong>
                  </span>
                </label>
              </div>

              {!formData.isGift ? (
                /* Standard Single Customer Mode */
                <div className="adminEditFieldsStack">
                  <div className="adminEditFieldGroup">
                    <label htmlFor="customerNameInput">
                      Full Name <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <User size={15} />
                      <input
                        id="customerNameInput"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Customer Full Name"
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="customerPhoneInput">
                      Mobile Number <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <Phone size={15} />
                      <input
                        id="customerPhoneInput"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="10-digit mobile number (e.g. 9876543210)"
                        required
                        maxLength={15}
                      />
                    </div>
                    <small className="adminEditFieldHint">
                      Used for order status updates, WhatsApp tracking & delivery SMS.
                    </small>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="customerEmailInput">
                      Email Address <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <Mail size={15} />
                      <input
                        id="customerEmailInput"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="customer@gmail.com"
                        required
                        maxLength={120}
                      />
                    </div>
                    <small className="adminEditFieldHint">
                      Official invoice, confirmations and order tracking emails are sent here.
                    </small>
                  </div>
                </div>
              ) : (
                /* Gift Order Mode: Separate Recipient & Buyer */
                <div className="adminEditFieldsStack">
                  <div className="adminEditGiftSubHeader">
                    <span>🎁 Delivery Recipient (Receives the Parcel)</span>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="recipientNameInput">
                      Recipient Name <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <User size={15} />
                      <input
                        id="recipientNameInput"
                        type="text"
                        name="recipientName"
                        value={formData.recipientName}
                        onChange={handleInputChange}
                        placeholder="Recipient Full Name"
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="recipientPhoneInput">
                      Recipient Phone <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <Phone size={15} />
                      <input
                        id="recipientPhoneInput"
                        type="tel"
                        name="recipientPhone"
                        value={formData.recipientPhone}
                        onChange={handleInputChange}
                        placeholder="Recipient 10-digit Mobile"
                        required
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="adminEditGiftSubHeader" style={{ marginTop: 12 }}>
                    <span>💳 Buyer / Purchaser Details (Who Placed the Order)</span>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="buyerNameInput">Buyer Name</label>
                    <div className="adminEditInputWrap">
                      <User size={15} />
                      <input
                        id="buyerNameInput"
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        placeholder="Buyer Full Name"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="buyerPhoneInput">Buyer Phone</label>
                    <div className="adminEditInputWrap">
                      <Phone size={15} />
                      <input
                        id="buyerPhoneInput"
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="Buyer Mobile Number"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="buyerEmailInput">
                      Buyer Email <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <Mail size={15} />
                      <input
                        id="buyerEmailInput"
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="buyer@gmail.com"
                        required
                        maxLength={120}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Shipping Address & Customization */}
            <div className="adminEditSectionCard">
              <div className="adminEditSectionHeader">
                <MapPin size={16} />
                <h4>Delivery / Shipping Address</h4>
              </div>

              <div className="adminEditFieldsStack">
                <div className="adminEditFieldGroup">
                  <label htmlFor="deliveryAddressInput">
                    Complete Street Address <span className="reqStar">*</span>
                  </label>
                  <textarea
                    id="deliveryAddressInput"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House/Flat No., Building Name, Street, Landmark, Area..."
                    rows={3}
                    className="adminEditTextarea"
                    required
                    maxLength={500}
                  />
                  <small className="adminEditFieldHint">
                    Accurate house number, building & street ensure timely doorstep delivery.
                  </small>
                </div>

                <div className="adminEditRowTwoCol">
                  <div className="adminEditFieldGroup">
                    <label htmlFor="pincodeInput">
                      PIN Code <span className="reqStar">*</span>
                    </label>
                    <div className="adminEditInputWrap">
                      <input
                        id="pincodeInput"
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        placeholder="6-digit PIN"
                        maxLength={6}
                        required
                      />
                      {lookingUpPincode && (
                        <Loader2 size={14} className="spinIcon pinLookupSpinner" />
                      )}
                    </div>
                  </div>

                  <div className="adminEditFieldGroup">
                    <label htmlFor="cityInput">City / District</label>
                    <input
                      id="cityInput"
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Pune / Mumbai"
                      className="adminEditStandardInput"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="adminEditFieldGroup">
                  <label htmlFor="stateSelect">State</label>
                  <select
                    id="stateSelect"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="adminEditSelect"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customization Request Notes */}
                <div className="adminEditFieldGroup" style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 12, marginTop: 6 }}>
                  <label htmlFor="customizationDetailsInput" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="var(--gold, #d4af37)" />
                    <span>Customization Instructions / Notes (Optional)</span>
                  </label>
                  <textarea
                    id="customizationDetailsInput"
                    name="customizationDetails"
                    value={formData.customizationDetails}
                    onChange={handleInputChange}
                    placeholder="e.g. Customized bead color, length adjustment, urgent delivery request..."
                    rows={2}
                    className="adminEditTextarea"
                    maxLength={2000}
                  />
                </div>

                {/* Admin Audit Note */}
                <div className="adminEditFieldGroup">
                  <label htmlFor="adminEditNotesInput" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color="#64748b" />
                    <span>Admin Change Reason / Internal Note (Optional)</span>
                  </label>
                  <input
                    id="adminEditNotesInput"
                    type="text"
                    name="adminEditNotes"
                    value={formData.adminEditNotes}
                    onChange={handleInputChange}
                    placeholder="e.g. Customer corrected flat number via WhatsApp"
                    className="adminEditStandardInput"
                    maxLength={500}
                  />
                  <small className="adminEditFieldHint">
                    Recorded in internal order edit audit history.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* PROTECTED SUMMARY ACCORDION / BOX */}
          <div className="adminEditProtectedBox">
            <div className="adminEditProtectedHeader">
              <div className="adminEditProtectedTitle">
                <Lock size={15} color="#475569" />
                <strong>Protected Order Specifications (Read-Only)</strong>
              </div>
              <span className="adminEditLockBadge">🛡️ Authoritative & Invariant</span>
            </div>

            <div className="adminEditProtectedGrid">
              <div className="adminEditProtectedItem">
                <span className="protLabel">
                  <Package size={12} /> Ordered Items:
                </span>
                <span className="protVal">
                  {order.items?.length || 0} product(s) (
                  {(order.items || []).map((i) => `${i.name} × ${i.qty}`).join(', ') || 'None'}
                  )
                </span>
              </div>

              <div className="adminEditProtectedItem">
                <span className="protLabel">
                  <CreditCard size={12} /> Financial Total:
                </span>
                <span className="protVal">
                  <b>{money(order.total)}</b> (Subtotal: {money(order.subtotal || order.total)}, Shipping: {money(order.shipping || order.shipping_charge || 0)})
                </span>
              </div>

              <div className="adminEditProtectedItem">
                <span className="protLabel">
                  <CheckCircle2 size={12} /> Payment Status:
                </span>
                <span className="protVal">
                  <b>{isVerified ? 'Verified ✓' : 'Pending Verification'}</b> {order.payment_transaction_id ? `(Tx: ${order.payment_transaction_id})` : ''}
                </span>
              </div>

              <div className="adminEditProtectedItem">
                <span className="protLabel">
                  <Truck size={12} /> Order Status:
                </span>
                <span className="protVal">
                  <b>{formatOrderStatus(order.order_status || order.orderStatus)}</b>
                  {order.tracking_id ? ` (AWB: ${order.tracking_id})` : ''}
                </span>
              </div>
            </div>

            <p className="adminEditProtectedNotice">
              ✦ Note: Financial amounts, item quantities, payment verification, and order lifecycle statuses are protected to ensure 100% financial and inventory consistency. Use dedicated Payment Verification, Shipment Dispatch, or Status Changer actions for those workflows.
            </p>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="adminEditModalFooter">
            <button
              type="button"
              className="outlineBtn adminEditCancelBtn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn adminEditSaveBtn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="spinIcon" />
                  <span>SAVING CHANGES…</span>
                </>
              ) : (
                <>
                  <Edit3 size={15} />
                  <span>SAVE ORDER CHANGES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
