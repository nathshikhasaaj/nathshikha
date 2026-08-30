import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  PackagePlus
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './AdminCreateOrderModal.css';

const PAYMENT_APP_OPTIONS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM',
  'Bank Transfer',
  'Other'
];

export default function AdminCreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  products = []
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pincode: ''
  });

  // Selected Product Line Items
  const [selectedItems, setSelectedItems] = useState([]);
  const [pickerProductId, setPickerProductId] = useState('');
  const [pickerQty, setPickerQty] = useState(1);

  // PIN & Shipping State
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('self_pickup');

  // Payment & Status Settings
  const [paymentStatus, setPaymentStatus] = useState('verification_pending');
  const [orderStatus, setOrderStatus] = useState('placed');
  const [transactionId, setTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay');

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        pincode: ''
      });
      setSelectedItems(
        products.length > 0
          ? [{ productId: products[0].id || products[0]._id, qty: 1, product: products[0] }]
          : []
      );
      setPickerProductId(products[0]?.id || products[0]?._id || '');
      setPickerQty(1);
      setLocationData(null);
      setPincodeError('');
      setSelectedShippingMethod('self_pickup');
      setPaymentStatus('verification_pending');
      setOrderStatus('placed');
      setTransactionId('');
      setPaymentApp('Google Pay');
      setCouponCodeInput('');
      setAppliedCoupon(null);
      setCouponError('');
      setError('');
    }
  }, [isOpen, products]);

  // Handle PIN Code live lookup
  useEffect(() => {
    const cleanPin = form.pincode.trim();
    if (cleanPin.length === 6 && /^[1-9][0-9]{5}$/.test(cleanPin)) {
      let isMounted = true;
      setPincodeLoading(true);
      setPincodeError('');

      api(`/shipping/lookup/${cleanPin}`)
        .then((data) => {
          if (!isMounted) return;
          if (data && data.valid && Array.isArray(data.options)) {
            setLocationData(data);
            setPincodeError('');
            // Default to delivery option or self pickup
            const defaultMethod = data.options[1]?.id || data.options[0]?.id || 'self_pickup';
            setSelectedShippingMethod((prev) => {
              return data.options.some((o) => o.id === prev) ? prev : defaultMethod;
            });
          } else {
            setLocationData(null);
            setPincodeError(data?.error || "We couldn't verify this PIN code.");
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLocationData(null);
          setPincodeError(err.message || "We couldn't verify this PIN code.");
        })
        .finally(() => {
          if (isMounted) setPincodeLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (cleanPin.length > 0 && cleanPin.length < 6) {
      setLocationData(null);
      setPincodeError('Please enter a 6-digit PIN code.');
    } else if (cleanPin.length === 0) {
      setLocationData(null);
      setPincodeError('');
    }
  }, [form.pincode]);

  // Add Item to List
  const handleAddProduct = () => {
    if (!pickerProductId) return;
    const prod = products.find(
      (p) => String(p.id || p._id) === String(pickerProductId)
    );
    if (!prod) return;

    const existingIdx = selectedItems.findIndex(
      (item) => String(item.productId) === String(pickerProductId)
    );

    if (existingIdx >= 0) {
      setSelectedItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, qty: item.qty + Math.max(1, Number(pickerQty) || 1) }
            : item
        )
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: prod.id || prod._id,
          qty: Math.max(1, Number(pickerQty) || 1),
          product: prod
        }
      ]);
    }

    setPickerQty(1);
  };

  // Remove Item
  const handleRemoveItem = (idxToRemove) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Update item qty
  const handleUpdateItemQty = (idx, newQty) => {
    const safeQty = Math.max(1, Number(newQty) || 1);
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, qty: safeQty } : item))
    );
  };

  // Calculations
  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + price * item.qty;
    }, 0);
  }, [selectedItems]);

  const activeOption = locationData?.options?.find(
    (opt) => opt.id === selectedShippingMethod
  );
  const shippingCharge = activeOption ? activeOption.charge : 0;
  const couponDiscount = appliedCoupon?.discount || 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + shippingCharge;

  // Handle coupon validation in modal
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCodeInput.trim(),
          items: selectedItems.map((i) => ({ id: i.productId, qty: i.qty }))
        })
      });
      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError('');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Invalid coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Customer full name is required.');
    if (!form.phone.trim() || form.phone.trim().length !== 10) {
      return setError('A valid 10-digit mobile number is required.');
    }
    if (!form.address.trim()) return setError('Delivery address is required.');
    if (!form.pincode.trim() || !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      return setError('A valid 6-digit PIN code is required.');
    }
    if (!selectedItems.length) {
      return setError('Please add at least one product item to the order.');
    }

    if (paymentStatus === 'verified' && !transactionId.trim()) {
      return setError('Transaction ID is required when payment status is marked as Verified.');
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || 'customer@nathshikha.com',
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        shippingMethod: selectedShippingMethod,
        items: selectedItems.map((item) => ({
          id: item.productId,
          qty: item.qty
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod: 'upi',
        paymentStatus,
        orderStatus:
          orderStatus || (paymentStatus === 'verified' ? 'confirmed' : 'placed'),
        transactionId: transactionId.trim(),
        paymentApp
      };

      const result = await api('/admin/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (onOrderCreated && result.order) {
        onOrderCreated(result.order);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalContainer createOrderModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modalHeader">
          <div className="modalHeaderTitle">
            <div className="modalBadge">
              <PackagePlus size={18} />
            </div>
            <div>
              <h3>Create Customer Order</h3>
              <p>Place and record a manual order on behalf of a customer</p>
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="createOrderForm">
          {error && (
            <div className="modalAlert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="createOrderGrid">
            {/* Left Column: Customer & Delivery Details */}
            <div className="formColumn">
              <div className="columnHeader">
                <User size={16} />
                <h4>Customer & Delivery Address</h4>
              </div>

              <div className="formGroup">
                <label>Customer Full Name <span className="reqStar">*</span></label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Priya Deshmukh"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="modalInput"
                />
              </div>

              <div className="formRow">
                <div className="formGroup">
                  <label>10-Digit Mobile Number <span className="reqStar">*</span></label>
                  <input
                    required
                    inputMode="tel"
                    maxLength="10"
                    placeholder="98XXXXXXXX"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                      })
                    }
                    className="modalInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="customer@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="modalInput"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>Complete Delivery Address <span className="reqStar">*</span></label>
                <textarea
                  required
                  placeholder="Flat/House No, Building, Street, Area, Landmark"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="modalTextarea"
                  rows={2}
                />
              </div>

              {/* 6-Digit PIN Code */}
              <div className="formGroup">
                <label>6-Digit PIN Code <span className="reqStar">*</span></label>
                <div className="pincodeFieldWrap">
                  <input
                    required
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="e.g. 410203 or 411001"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6)
                      })
                    }
                    className="modalInput pincodeInput"
                  />
                  {pincodeLoading && <Loader2 size={16} className="pincodeSpinner" />}
                </div>

                {locationData && (
                  <div className="locationVerifiedBadge">
                    <CheckCircle size={13} />
                    <span>
                      <b>{locationData.city}</b>, {locationData.state}{' '}
                      {locationData.location_type === 'khopoli' && (
                        <small className="khopoliTag">✦ Khopoli City</small>
                      )}
                    </span>
                  </div>
                )}

                {pincodeError && (
                  <small className="fieldErrorText">{pincodeError}</small>
                )}
              </div>

              {/* Shipping Method Options */}
              <div className="formGroup">
                <label>Shipping Method <span className="reqStar">*</span></label>
                {locationData && Array.isArray(locationData.options) ? (
                  <div className="shippingRadioGroup">
                    {locationData.options.map((opt) => (
                      <label
                        key={opt.id}
                        className={`shippingRadioCard ${
                          selectedShippingMethod === opt.id ? 'active' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="adminShipping"
                          value={opt.id}
                          checked={selectedShippingMethod === opt.id}
                          onChange={() => setSelectedShippingMethod(opt.id)}
                        />
                        <div className="radioCardContent">
                          <b>{opt.name}</b>
                          <span>{opt.charge === 0 ? 'FREE' : money(opt.charge)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="pincodeHelpNote">
                    <span>Enter a valid 6-digit PIN code to load available shipping options.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Products Picker & Order Configuration */}
            <div className="formColumn">
              <div className="columnHeader">
                <ShoppingBag size={16} />
                <h4>Products & Order Configuration</h4>
              </div>

              {/* Product Selector */}
              <div className="productPickerBox">
                <div className="pickerInputs">
                  <select
                    value={pickerProductId}
                    onChange={(e) => setPickerProductId(e.target.value)}
                    className="modalSelect productSelect"
                  >
                    {products.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name} — {money(p.price)} (Stock: {p.stock ?? 'N/A'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={pickerQty}
                    onChange={(e) => setPickerQty(Math.max(1, Number(e.target.value) || 1))}
                    className="modalInput qtyInput"
                    placeholder="Qty"
                  />

                  <button
                    type="button"
                    className="outlineBtn compact addProductBtn"
                    onClick={handleAddProduct}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Selected Items List */}
              <div className="selectedItemsList">
                <label className="itemsListLabel">
                  Selected Items ({selectedItems.length})
                </label>

                {selectedItems.length > 0 ? (
                  <div className="itemsScrollList">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="selectedItemRow">
                        <img
                          src={item.product?.img || '/assets/thushi.jpg'}
                          alt={item.product?.name}
                          className="itemThumb"
                        />
                        <div className="itemInfo">
                          <b>{item.product?.name}</b>
                          <small>{money(item.product?.price)} each</small>
                        </div>
                        <div className="itemQtyControl">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                            className="itemQtyInput"
                          />
                        </div>
                        <span className="itemLineTotal">
                          {money((item.product?.price || 0) * item.qty)}
                        </span>
                        <button
                          type="button"
                          className="itemRemoveBtn"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="noItemsNotice">
                    <p>No products added yet. Select a product above to add.</p>
                  </div>
                )}
              </div>

              {/* Payment & Order Status */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Initial Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPaymentStatus(next);
                      if (next === 'verified' && orderStatus === 'placed') {
                        setOrderStatus('confirmed');
                      }
                    }}
                    className="modalSelect"
                  >
                    <option value="verification_pending">Pending Verification</option>
                    <option value="verified">Verified (Already Paid)</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Initial Order Status</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="modalSelect"
                  >
                    <option value="placed">Order Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">In Processing</option>
                  </select>
                </div>
              </div>

              {/* If Verified is selected */}
              {paymentStatus === 'verified' && (
                <div className="verifiedFieldsBox">
                  <div className="formGroup">
                    <label>Transaction ID / UTR <span className="reqStar">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. TXN987654321001"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="modalInput"
                    />
                  </div>

                  <div className="formGroup">
                    <label>Payment App / Mode</label>
                    <select
                      value={paymentApp}
                      onChange={(e) => setPaymentApp(e.target.value)}
                      className="modalSelect"
                    >
                      {PAYMENT_APP_OPTIONS.map((app) => (
                        <option key={app} value={app}>{app}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Coupon Code Section */}
              <div className="adminCouponApplySection" style={{ background: '#fdfaf2', border: '1px solid #ebdcc6', padding: 12, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#52433c' }}>Apply Promo Code (Optional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. WELCOME20"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.replace(/\s+/g, '').toUpperCase())}
                    className="modalInput"
                    style={{ textTransform: 'uppercase', flex: 1, fontFamily: 'monospace' }}
                    disabled={Boolean(appliedCoupon)}
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      className="outlineBtn compact"
                      onClick={handleRemoveCoupon}
                      style={{ color: '#dc3545', borderColor: '#f5c2c7' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="goldBtn compact"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCodeInput.trim()}
                    >
                      {couponLoading ? 'Checking…' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && <small style={{ color: '#dc3545', fontSize: 11 }}>{couponError}</small>}
                {appliedCoupon && (
                  <small style={{ color: '#198754', fontWeight: 600, fontSize: 11 }}>
                    ✓ {appliedCoupon.code} applied (-{money(appliedCoupon.discount)})
                  </small>
                )}
              </div>

              {/* Financial Summary */}
              <div className="adminOrderSummary">
                <div className="summaryRow">
                  <span>Items Subtotal:</span>
                  <b>{money(subtotal)}</b>
                </div>
                {appliedCoupon && (
                  <div className="summaryRow" style={{ color: '#198754' }}>
                    <span>Coupon Discount ({appliedCoupon.code}):</span>
                    <b>-{money(appliedCoupon.discount)}</b>
                  </div>
                )}
                <div className="summaryRow">
                  <span>Shipping ({activeOption?.name || 'Self Pickup'}):</span>
                  <b>{shippingCharge === 0 ? 'FREE' : money(shippingCharge)}</b>
                </div>
                <div className="summaryDivider"></div>
                <div className="summaryRow grandTotalRow">
                  <span>Order Total:</span>
                  <b className="totalAmount">{money(grandTotal)}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modalActions">
            <button
              type="button"
              className="outlineBtn modalCancelBtn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn modalSubmitBtn"
              disabled={loading}
            >
              {loading ? 'CREATING ORDER…' : `✓ CREATE ORDER · ${money(grandTotal)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
