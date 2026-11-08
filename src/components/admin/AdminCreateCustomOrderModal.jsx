import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Search,
  Check,
  ShieldCheck,
  Gift
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import './AdminCreateCustomOrderModal.css';

const DEFAULT_INDIAN_STATES = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Goa',
  'Madhya Pradesh',
  'Delhi',
  'Rajasthan',
  'Telangana',
  'Andhra Pradesh',
  'Tamil Nadu',
  'Kerala',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'West Bengal',
  'Bihar',
  'Odisha',
  'Other State / UT'
];

function createBlankCustomItem(index = 1) {
  return {
    id: `custom_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    notes: '',
    price: '',
    qty: 1,
    img: '',
    previewUrl: '',
    uploading: false,
    fileError: ''
  };
}

export default function AdminCreateCustomOrderModal({
  isOpen,
  onClose,
  onOrderCreated
}) {
  const { setToast } = useToast();

  // Customer Details Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pincode: '',
    city: '',
    state: 'Maharashtra',
    shippingMethod: 'Standard Delivery',
    adminNotes: ''
  });

  // Customer Autocomplete Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef(null);

  // Custom Items State (Must start with at least 1 item)
  const [customItems, setCustomItems] = useState([createBlankCustomItem(1)]);

  // Manual Shipping Charge (Entered by Admin, defaults to 0)
  const [manualShipping, setManualShipping] = useState(0);

  // Optional Free Gift Toggle
  const [freeGiftIncluded, setFreeGiftIncluded] = useState(false);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form and prevent background scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      setForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        pincode: '',
        city: '',
        state: 'Maharashtra',
        shippingMethod: 'Standard Delivery',
        adminNotes: ''
      });
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      setSelectedCustomer(null);
      setCustomItems([createBlankCustomItem(1)]);
      setManualShipping(0);
      setFreeGiftIncluded(false);
      setError('');
      setLoading(false);

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Customer Search
  useEffect(() => {
    let active = true;
    const q = customerSearchQuery.trim();
    if (q.length >= 2 && !selectedCustomer) {
      setSearchingCustomers(true);
      api(`/admin/customers/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (active && Array.isArray(data)) {
            setCustomerSearchResults(data);
            setShowCustomerDropdown(data.length > 0);
          }
        })
        .catch(() => {
          if (active) setCustomerSearchResults([]);
        })
        .finally(() => {
          if (active) setSearchingCustomers(false);
        });
    } else {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
    return () => {
      active = false;
    };
  }, [customerSearchQuery, selectedCustomer]);

  // Click outside to close customer dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearchQuery(`${cust.name} (${cust.phone || cust.email || ''})`);
    setForm((prev) => ({
      ...prev,
      name: cust.name || prev.name,
      phone: cust.phone || prev.phone,
      email: cust.email || prev.email,
      address: cust.address || prev.address,
      pincode: cust.pincode || prev.pincode,
      city: cust.city || prev.city,
      state: cust.state || prev.state || 'Maharashtra'
    }));
    setShowCustomerDropdown(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  // Add Item
  const handleAddItem = () => {
    setCustomItems((prev) => [...prev, createBlankCustomItem(prev.length + 1)]);
  };

  // Remove Item
  const handleRemoveItem = (itemId) => {
    if (customItems.length <= 1) return;
    setCustomItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Update Item Field
  const handleUpdateItem = (itemId, field, value) => {
    setCustomItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Upload Design Image for specific item
  const handleItemImageUpload = async (itemId, file) => {
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      handleUpdateItem(itemId, 'fileError', 'Please select a valid JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      handleUpdateItem(itemId, 'fileError', 'Image size exceeds 15MB limit.');
      return;
    }

    handleUpdateItem(itemId, 'fileError', '');
    const preview = URL.createObjectURL(file);
    handleUpdateItem(itemId, 'previewUrl', preview);
    handleUpdateItem(itemId, 'uploading', true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('nw-auth-token');
      // Try dedicated admin design upload first, fallback to orders customization upload
      let res = await fetch('/api/admin/upload-custom-design', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) {
        res = await fetch('/api/orders/upload-customization', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload design artwork.');
      }

      handleUpdateItem(itemId, 'img', data.url);
      setToast({ type: 'success', message: 'Design artwork uploaded & attached! 🎨' });
    } catch (err) {
      handleUpdateItem(itemId, 'fileError', err.message || 'Upload failed.');
    } finally {
      handleUpdateItem(itemId, 'uploading', false);
    }
  };

  const handleRemoveItemImage = (itemId) => {
    const it = customItems.find((i) => i.id === itemId);
    if (it && it.previewUrl) {
      URL.revokeObjectURL(it.previewUrl);
    }
    handleUpdateItem(itemId, 'img', '');
    handleUpdateItem(itemId, 'previewUrl', '');
    handleUpdateItem(itemId, 'fileError', '');
  };

  // Calculations (Live)
  const productSubtotal = useMemo(() => {
    return customItems.reduce((sum, item) => {
      const p = Number(item.price) || 0;
      const q = parseInt(item.qty, 10) || 0;
      return sum + (p >= 0 && q >= 0 ? p * q : 0);
    }, 0);
  }, [customItems]);

  const validatedShipping = useMemo(() => {
    const s = Number(manualShipping);
    return !isNaN(s) && s >= 0 ? s : 0;
  }, [manualShipping]);

  const grandTotal = useMemo(() => {
    return Math.round((productSubtotal + validatedShipping) * 100) / 100;
  }, [productSubtotal, validatedShipping]);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Customer Details Validation
    const cleanName = form.name.trim();
    if (!cleanName) {
      setError('Customer name is required.');
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const cleanEmail = form.email.trim() ? form.email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Please enter a valid email address or leave it blank.');
        return;
      }
    }

    const cleanAddress = form.address.trim();
    if (!cleanAddress) {
      setError('Delivery address is required.');
      return;
    }

    const cleanPincode = form.pincode.replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      setError('Please enter a valid 6-digit delivery PIN code.');
      return;
    }

    // 2. Custom Items Validation
    if (!customItems || customItems.length === 0) {
      setError('Please add at least one custom jewellery item.');
      return;
    }

    const anyUploading = customItems.some((item) => item.uploading);
    if (anyUploading) {
      setError('Please wait for all design images to finish uploading.');
      return;
    }

    for (let idx = 0; idx < customItems.length; idx++) {
      const it = customItems[idx];
      const name = it.name.trim();
      if (!name) {
        setError(`Please enter a custom product/design name for Item #${idx + 1}.`);
        return;
      }

      const p = Number(it.price);
      if (isNaN(p) || p < 0 || it.price === '') {
        setError(`Please enter a valid unit price (₹) for "${name}".`);
        return;
      }

      const q = parseInt(it.qty, 10);
      if (isNaN(q) || q < 1) {
        setError(`Quantity for "${name}" must be a whole positive number (at least 1).`);
        return;
      }
    }

    // 3. Shipping Validation
    const shipVal = Number(manualShipping);
    if (isNaN(shipVal) || shipVal < 0) {
      setError('Shipping charges must be a non-negative number (enter 0 for free shipping).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        orderType: 'custom',
        userId: selectedCustomer?.userId || null,
        name: cleanName,
        phone: cleanPhone.slice(-10),
        email: cleanEmail,
        customerName: cleanName,
        customerPhone: cleanPhone.slice(-10),
        customerEmail: cleanEmail,
        address: cleanAddress,
        pincode: cleanPincode,
        city: form.city.trim() || 'Khopoli',
        state: form.state.trim() || 'Maharashtra',
        shippingMethod: form.shippingMethod || 'Standard Delivery',
        shipping: shipVal,
        freeGiftIncluded: Boolean(freeGiftIncluded),
        adminNotes: form.adminNotes.trim() || 'Custom Order Created by Admin',
        items: customItems.map((it) => ({
          name: it.name.trim(),
          price: Number(it.price),
          qty: parseInt(it.qty, 10),
          img: it.img || '',
          notes: it.notes.trim() || null
        }))
      };

      const result = await api('/admin/orders/custom', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.ok && result.order) {
        if (onOrderCreated) {
          onOrderCreated(result.order);
        }
        setToast({
          type: 'success',
          message: `✓ Custom Order #${result.order.order_no || result.order.orderNo} created successfully!`
        });
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create custom order.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create custom order. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="adminCustomOrderModalOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="customModalHeading">
      <div className="adminCustomOrderModalDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="adminCustomOrderHeader">
          <div className="customHeaderLeft">
            <div className="customIconBadge">
              <Sparkles size={20} />
            </div>
            <div className="customTitleGroup">
              <h2 id="customModalHeading">Create Custom Order</h2>
              <span className="customSubtitleBadge">Bespoke Handcrafted Jewellery • Manual Pricing</span>
            </div>
          </div>
          <button
            type="button"
            className="customModalCloseBtn"
            onClick={onClose}
            aria-label="Close"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="adminCustomOrderForm">
          {/* Scrollable Form Body */}
          <div className="adminCustomOrderBody">
            {error && (
              <div className="customOrderErrorAlert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="customOrderGrid">
              {/* -------------------------------------------------------- */}
              {/* LEFT COLUMN: CUSTOMER INFORMATION & ADDRESS              */}
              {/* -------------------------------------------------------- */}
              <div className="customGridCol">
                <section className="customSectionCard">
                  <div className="customSectionHeader">
                    <div className="customSectionTitleBox">
                      <User size={16} />
                      <h3>1. Customer Details</h3>
                    </div>
                  </div>

                  {/* Customer Autocomplete Search */}
                  <div className="custSearchBox" ref={customerSearchRef}>
                    <div className="custSearchInputWrap">
                      <Search size={14} className="searchIcon" />
                      <input
                        type="text"
                        className="custSearchInput"
                        placeholder="Search existing customer by name, phone or email…"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          if (selectedCustomer) setSelectedCustomer(null);
                        }}
                        onFocus={() => {
                          if (customerSearchResults.length > 0) setShowCustomerDropdown(true);
                        }}
                      />
                      {searchingCustomers && <Loader2 size={13} className="spinAnimation" style={{ position: 'absolute', right: 28 }} />}
                      {customerSearchQuery && (
                        <button
                          type="button"
                          className="custSearchClearBtn"
                          onClick={handleClearSelectedCustomer}
                          title="Clear customer search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {showCustomerDropdown && customerSearchResults.length > 0 && (
                      <div className="custSearchResultsMenu">
                        {customerSearchResults.map((c) => (
                          <div
                            key={c.id || c._id}
                            className="custResultRow"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <div className="custResultName">{c.name}</div>
                            <div className="custResultMeta">
                              Phone: {c.phone || '—'} · Email: {c.email || 'None'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Name & Phone */}
                  <div className="formTwoCol">
                    <div className="customFormField">
                      <label>
                        Customer Name <span className="reqStar">*</span>
                      </label>
                      <input
                        type="text"
                        className="customInput"
                        placeholder="e.g. Radhika Deshmukh"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="customFormField">
                      <label>
                        Mobile Number <span className="reqStar">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="customInput"
                        placeholder="10-digit Indian Mobile"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address (STRICTLY OPTIONAL) */}
                  <div className="customFormField">
                    <label>
                      Email Address <span className="optHint">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      className="customInput"
                      placeholder="e.g. customer@example.com (Leave blank if none)"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="customFormField">
                    <label>
                      Delivery Address <span className="reqStar">*</span>
                    </label>
                    <textarea
                      className="customTextarea"
                      placeholder="House/Flat No., Building, Street, Landmark"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>

                  {/* Pincode, City, State */}
                  <div className="formTwoCol">
                    <div className="customFormField">
                      <label>
                        PIN Code <span className="reqStar">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="customInput"
                        placeholder="6-digit PIN code"
                        maxLength={6}
                        value={form.pincode}
                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                        required
                      />
                    </div>

                    <div className="customFormField">
                      <label>City</label>
                      <input
                        type="text"
                        className="customInput"
                        placeholder="e.g. Mumbai, Pune"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="formTwoCol">
                    <div className="customFormField">
                      <label>State</label>
                      <select
                        className="customSelect"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                      >
                        {DEFAULT_INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="customFormField">
                      <label>Delivery Method</label>
                      <select
                        className="customSelect"
                        value={form.shippingMethod}
                        onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
                      >
                        <option value="Standard Delivery">Standard Delivery</option>
                        <option value="Speed Post">Speed Post (India Post)</option>
                        <option value="Express Courier">Express Courier</option>
                        <option value="Studio Pickup">Studio Pickup (Khopoli)</option>
                      </select>
                    </div>
                  </div>

                  {/* Internal Admin Notes */}
                  <div className="customFormField" style={{ marginBottom: 0 }}>
                    <label>
                      Internal Admin Notes <span className="optHint">(Optional)</span>
                    </label>
                    <textarea
                      className="customTextarea"
                      placeholder="e.g. Order placed via WhatsApp consultation. Delivery before festive date."
                      value={form.adminNotes}
                      onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </section>
              </div>

              {/* -------------------------------------------------------- */}
              {/* RIGHT COLUMN: CUSTOM PRODUCT ENTRIES & MANUAL PRICING    */}
              {/* -------------------------------------------------------- */}
              <div className="customGridCol">
                <section className="customSectionCard">
                  <div className="customSectionHeader">
                    <div className="customSectionTitleBox">
                      <Sparkles size={16} />
                      <h3>2. Custom Product Items ({customItems.length})</h3>
                    </div>
                    <span className="sectionHeaderSubtitle">
                      Manual pricing & artwork
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="customItemsList">
                    {customItems.map((item, idx) => {
                      const unitPrice = Number(item.price) || 0;
                      const qty = parseInt(item.qty, 10) || 1;
                      const lineTotal = unitPrice * qty;

                      return (
                        <div key={item.id} className="customProductItemCard">
                          <div className="customItemCardHeader">
                            <span className="itemNumBadge">
                              <Sparkles size={12} />
                              <span>Custom Piece #{idx + 1}</span>
                            </span>
                            {customItems.length > 1 && (
                              <button
                                type="button"
                                className="removeItemBtn"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove this custom item"
                              >
                                <Trash2 size={12} />
                                <span>Remove Piece</span>
                              </button>
                            )}
                          </div>

                          {/* Custom Design Name */}
                          <div className="customFormField">
                            <label>
                              Custom Product / Design Name <span className="reqStar">*</span>
                            </label>
                            <input
                              type="text"
                              className="customInput"
                              placeholder="e.g. Royal Peshwai Peacock Nath with Red Pearls"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              required
                            />
                          </div>

                          {/* Upload Design Image */}
                          <div className="itemUploadRow">
                            <label className="uploadSectionLabel">
                              Upload Design Artwork / Reference Sketch <span className="optHint">(JPG, PNG, WEBP)</span>
                            </label>
                            
                            <input
                              type="file"
                              id={`design_file_${item.id}`}
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleItemImageUpload(item.id, file);
                              }}
                              disabled={item.uploading}
                            />

                            {(item.previewUrl || item.img) ? (
                              <div className="itemAttachedCard">
                                <img
                                  src={item.previewUrl || item.img}
                                  alt="Design Preview"
                                  className="itemAttachedThumb"
                                />
                                <div className="itemAttachedMeta">
                                  <span className="itemAttachedStatus">Artwork Attached ✓</span>
                                  <span className="itemAttachedFilename">Reference design uploaded</span>
                                </div>
                                <div className="itemAttachedBtns">
                                  <label htmlFor={`design_file_${item.id}`} className="itemReplacePhotoBtn">
                                    Replace
                                  </label>
                                  <button
                                    type="button"
                                    className="itemRemovePhotoBtn"
                                    onClick={() => handleRemoveItemImage(item.id)}
                                    title="Remove artwork"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label htmlFor={`design_file_${item.id}`} className="itemUploadTapZone">
                                <div className="itemUploadIconBox">
                                  {item.uploading ? (
                                    <Loader2 size={18} className="spinAnimation" />
                                  ) : (
                                    <Upload size={18} />
                                  )}
                                </div>
                                <div className="itemUploadText">
                                  <span className="uploadMainText">
                                    {item.uploading ? 'Uploading Design Artwork…' : 'Tap to Attach Design Artwork / Sketch'}
                                  </span>
                                  <span className="uploadSubText">Select JPG, PNG or WEBP from device</span>
                                </div>
                              </label>
                            )}

                            {item.fileError && (
                              <span className="uploadErrorMsg">
                                {item.fileError}
                              </span>
                            )}
                          </div>

                          {/* Design Notes / Customer Instructions */}
                          <div className="customFormField">
                            <label>
                              Design Notes / Customer Instructions <span className="optHint">(Artisan specifications)</span>
                            </label>
                            <textarea
                              className="customTextarea"
                              placeholder="e.g. 24k gold plating finish, left-side piercing clip, maroon hydro-bead drops, 4.5 cm diameter"
                              value={item.notes}
                              onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                              rows={2}
                            />
                          </div>

                          {/* Pricing & Qty Grid */}
                          <div className="itemPricingGrid">
                            <div className="itemPricingCol priceCol">
                              <label>Unit Price (₹) <span className="reqStar">*</span></label>
                              <div className="inputCurrencyWrap">
                                <span className="inputCurrencyPrefix">₹</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="1"
                                  className="customInput inputWithCurrency"
                                  placeholder="1500"
                                  value={item.price}
                                  onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="itemPricingCol qtyCol">
                              <label>Quantity <span className="reqStar">*</span></label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="100"
                                step="1"
                                className="customInput"
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(item.id, 'qty', e.target.value)}
                                required
                              />
                            </div>

                            <div className="lineTotalBox">
                              <span className="lineTotalLabel">Line Total</span>
                              <span className="lineTotalVal">{money(lineTotal)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* + Add Another Custom Product */}
                  <button
                    type="button"
                    className="addItemRowBtn"
                    onClick={handleAddItem}
                  >
                    <Plus size={16} />
                    <span>+ Add Another Custom Item</span>
                  </button>

                  {/* ---------------------------------------------------- */}
                  {/* 3. LIVE PRICING & SHIPPING BREAKDOWN                 */}
                  {/* ---------------------------------------------------- */}
                  <div className="pricingSummaryCard">
                    <div className="pricingBreakdownRow">
                      <span className="pricingLabel">Product Subtotal ({customItems.length} {customItems.length === 1 ? 'item' : 'items'}):</span>
                      <b className="pricingVal">{money(productSubtotal)}</b>
                    </div>

                    <div className="pricingBreakdownRow shippingRow">
                      <div className="shippingLabelGroup">
                        <span className="shippingTitle">🚚 Shipping Charges (₹):</span>
                        <small className="shippingSubtitle">
                          Manual charge (enter 0 for Free Delivery)
                        </small>
                      </div>
                      <div className="manualShippingWrap">
                        <span className="shippingCurrency">₹</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          className="shippingInput"
                          value={manualShipping}
                          onChange={(e) => setManualShipping(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Optional Free Gift */}
                    <label className="freeGiftToggleWrap">
                      <input
                        type="checkbox"
                        checked={freeGiftIncluded}
                        onChange={(e) => setFreeGiftIncluded(e.target.checked)}
                      />
                      <Gift size={16} />
                      <span>Include Complimentary Free Gift (₹0 Line Item)</span>
                    </label>

                    <div className="pricingGrandTotalRow">
                      <span className="grandTotalLabel">Final Order Total:</span>
                      <span className="grandTotalVal">{money(grandTotal)}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Modal Bottom Action Footer (Always Visible & Accessible) */}
          <footer className="adminCustomOrderFooter">
            <div className="footerLeftNotice">
              <ShieldCheck size={16} color="#15803d" />
              <span>
                Order will be created in <b>Pending Payment Verification</b> status. No inventory stock deducted.
              </span>
            </div>

            <div className="footerBtnGroup">
              <button
                type="button"
                className="customCancelBtn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="customSubmitBtn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinAnimation" />
                    <span>Placing Custom Order…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Place Custom Order ({money(grandTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

