import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  ShoppingBag,
  Gift,
  Tag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  Sparkles,
  ArrowRight,
  Send,
  Eye,
  CreditCard,
  Edit3
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import './AdminCreateAssistedOrderModal.css';

export default function AdminCreateAssistedOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  products = []
}) {
  // Customer Selection / Search State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Customer & Shipping Form State
  const [formData, setFormData] = useState({
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

  // Gift Options
  const [isGift, setIsGift] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [handwrittenNote, setHandwrittenNote] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Items State
  const [items, setItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState(products || []);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Add Item Sub-Modal / Picker
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedParams, setSelectedParams] = useState({});
  const [selectedQty, setSelectedQty] = useState(1);
  const [pickerError, setPickerError] = useState('');

  // Shipping & Location lookup
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [calculatedShipping, setCalculatedShipping] = useState(0);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Final Admin Review Drawer / Dialog State
  const [showReviewSummary, setShowReviewSummary] = useState(false);

  // Submitting State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const customerSearchRef = useRef(null);

  // Load catalog products if empty
  useEffect(() => {
    if (products && products.length > 0) {
      setCatalogProducts(products);
    } else if (isOpen) {
      setLoadingCatalog(true);
      api('/admin/products')
        .then((data) => {
          if (Array.isArray(data)) setCatalogProducts(data);
        })
        .catch(() => {
          api('/products')
            .then((data) => {
              if (Array.isArray(data)) setCatalogProducts(data);
            })
            .catch(() => {});
        })
        .finally(() => setLoadingCatalog(false));
    }
  }, [isOpen, products]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      setSelectedCustomer(null);
      setShowCustomerDropdown(false);
      setFormData({
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
      setIsGift(false);
      setGiftWrap(false);
      setHandwrittenNote('');
      setRecipientName('');
      setRecipientPhone('');
      setItems([]);
      setShowAddPicker(false);
      setSelectedProduct(null);
      setSelectedParams({});
      setSelectedQty(1);
      setPincodeLoading(false);
      setPincodeError('');
      setLocationData(null);
      setCalculatedShipping(0);
      setCouponCodeInput('');
      setAppliedCoupon(null);
      setCouponError('');
      setShowReviewSummary(false);
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Live Customer Search
  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (q.length >= 2) {
      let active = true;
      setSearchingCustomers(true);
      api(`/admin/customers/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (active && Array.isArray(data)) {
            setCustomerSearchResults(data);
            setShowCustomerDropdown(true);
          }
        })
        .catch(() => {
          if (active) setCustomerSearchResults([]);
        })
        .finally(() => {
          if (active) setSearchingCustomers(false);
        });
      return () => {
        active = false;
      };
    } else {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
  }, [customerSearchQuery]);

  // Handle click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearchQuery(`${cust.name} (${cust.email})`);
    setShowCustomerDropdown(false);

    const defAddr = cust.defaultAddress;
    setFormData((prev) => ({
      ...prev,
      name: cust.name || prev.name,
      phone: cust.phone || prev.phone,
      email: cust.email || prev.email,
      address: defAddr?.addressLine1 || defAddr?.address || prev.address,
      pincode: defAddr?.pincode || prev.pincode,
      city: defAddr?.city || prev.city,
      state: defAddr?.state || prev.state
    }));
  };

  // PIN Code live lookup & shipping calculation
  useEffect(() => {
    const cleanPin = formData.pincode.trim();
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
            if (data.city) setFormData((prev) => ({ ...prev, city: data.city }));
            if (data.state) setFormData((prev) => ({ ...prev, state: data.state }));

            // Select shipping method charge
            const matchedOption = data.options.find(
              (o) => o.name === formData.shippingMethod || o.id === formData.shippingMethod
            ) || data.options[0];

            if (matchedOption) {
              setCalculatedShipping(matchedOption.charge || 0);
              setFormData((prev) => ({ ...prev, shippingMethod: matchedOption.name }));
            }
          } else {
            setLocationData(null);
            setPincodeError(data?.error || "We couldn't verify this PIN code.");
            setCalculatedShipping(70); // default
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLocationData(null);
          setPincodeError(err.message || "We couldn't verify this PIN code.");
          setCalculatedShipping(70);
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
      setCalculatedShipping(0);
    }
  }, [formData.pincode, formData.shippingMethod]);

  // Filter Catalog Products for Add Item Picker
  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts.slice(0, 15);
    const q = productSearch.toLowerCase();
    return catalogProducts.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const code = (p.productCode || p.sku || p.id || p._id || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || code.includes(q);
    });
  }, [catalogProducts, productSearch]);

  const handleSelectProductToConfigure = (prod) => {
    setSelectedProduct(prod);
    setSelectedQty(1);
    setPickerError('');

    // Pre-populate default parameter selections if available
    const initialParams = {};
    if (Array.isArray(prod.productParameters) && prod.productParameters.length > 0) {
      for (const param of prod.productParameters) {
        const isText = param.displayType === 'text' || param.displayType === 'textbox';
        if (isText) {
          initialParams[param.name] = '';
        } else {
          const availableVals = Array.isArray(param.selectedValues) && param.selectedValues.length > 0
            ? param.selectedValues
            : (Array.isArray(param.values) ? param.values : []);
          const firstInStock = availableVals.find((v) => v.inStock !== false);
          if (firstInStock) {
            initialParams[param.name] = firstInStock.value || firstInStock.label;
          }
        }
      }
    }
    setSelectedParams(initialParams);
  };

  const handleAddConfiguredProductToOrder = () => {
    if (!selectedProduct) return;

    // Validate required parameters
    if (Array.isArray(selectedProduct.productParameters) && selectedProduct.productParameters.length > 0) {
      for (const param of selectedProduct.productParameters) {
        if (param.required) {
          const val = selectedParams[param.name];
          if (!val || String(val).trim() === '') {
            setPickerError(`Please specify "${param.name}" for "${selectedProduct.name}".`);
            return;
          }
        }
      }
    }

    const qty = Math.max(1, parseInt(selectedQty, 10) || 1);
    const prodId = selectedProduct.id || selectedProduct._id;

    // Add as line item
    setItems((prev) => [
      ...prev,
      {
        productId: prodId,
        id: prodId,
        name: selectedProduct.name,
        price: selectedProduct.price,
        qty,
        img: selectedProduct.img || (selectedProduct.images && selectedProduct.images[0]) || '/assets/thushi.jpg',
        selectedParameters: { ...selectedParams },
        selectedOptions: { ...selectedParams },
        catalogProduct: selectedProduct
      }
    ]);

    // Reset picker
    setSelectedProduct(null);
    setSelectedParams({});
    setSelectedQty(1);
    setProductSearch('');
    setShowAddPicker(false);
    setPickerError('');
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemQty = (idx, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty } : it)));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);
  }, [items]);

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');

    try {
      const code = couponCodeInput.trim().toUpperCase();
      const res = await api(`/coupons/validate?code=${encodeURIComponent(code)}&orderTotal=${subtotal}`);
      if (res && res.valid && res.coupon) {
        setAppliedCoupon({
          code: res.coupon.code,
          discount: res.coupon.discount || 0,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue
        });
        setCouponError('');
      } else {
        setCouponError(res?.error || 'Invalid or expired coupon code.');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError(err.message || 'Invalid or expired coupon code.');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  const couponDiscount = appliedCoupon ? appliedCoupon.discount || 0 : 0;
  const giftWrapCharge = isGift && giftWrap ? 20 : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + calculatedShipping + giftWrapCharge;

  // Validation before opening Review Summary
  const handleProceedToReview = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please enter the delivery address.');
      return;
    }
    if (!formData.pincode.trim() || formData.pincode.trim().length !== 6) {
      setError('Please enter a valid 6-digit delivery PIN code.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product to the order.');
      return;
    }

    setShowReviewSummary(true);
  };

  // Final Submission: Save & Send to Customer
  const handleSaveAndSendToCustomer = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        userId: selectedCustomer?.userId || null,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        shippingMethod: formData.shippingMethod,
        items: items.map((it) => ({
          productId: it.productId || it.id,
          qty: it.qty,
          price: it.price,
          selectedParameters: it.selectedParameters || {},
          selectedOptions: it.selectedOptions || {}
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        isGift,
        giftWrap,
        handwrittenNote: isGift && handwrittenNote.trim() ? handwrittenNote.trim() : null,
        recipientName: isGift && recipientName.trim() ? recipientName.trim() : null,
        recipientPhone: isGift && recipientPhone.trim() ? recipientPhone.trim() : null,
        adminNotes: formData.adminNotes.trim()
      };

      const res = await api('/admin/orders/assisted', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.order) {
        if (onOrderCreated) {
          onOrderCreated(res.order);
        }
        onClose();
      } else {
        throw new Error(res.error || 'Failed to create assisted order.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create assisted order. Please check inputs.');
      setShowReviewSummary(false); // Back to edit mode
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="assistedOrderModalOverlay" onClick={onClose}>
      <div
        className="assistedOrderModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="assistedModalHeader">
          <div className="assistedModalHeaderLeft">
            <div className="assistedModalBadge">
              <Sparkles size={18} />
            </div>
            <div>
              <h3>Create Admin-Assisted Order</h3>
              <span className="assistedModalSub">
                Prepare or correct an order for a customer · Saved in <b>PAYMENT_PENDING</b> state
              </span>
            </div>
          </div>
          <button
            type="button"
            className="assistedModalCloseBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="assistedModalBody">
          {error && (
            <div className="assistedErrorBanner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Customer Selection & Search */}
          <div className="assistedSectionCard">
            <div className="assistedSectionHeader">
              <User size={16} color="var(--gold, #c69a59)" />
              <h4>1. Customer Details</h4>
            </div>

            <div className="customerSearchWrapper" ref={customerSearchRef}>
              <label htmlFor="customerSearchInput" className="assistedFieldLabel">
                Search Existing Customer (by Name, Phone, or Email)
              </label>
              <div className="assistedSearchInputWrap">
                <Search size={15} />
                <input
                  id="customerSearchInput"
                  type="text"
                  placeholder="Type customer name, email or mobile number…"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (customerSearchResults.length > 0) setShowCustomerDropdown(true);
                  }}
                  autoComplete="off"
                />
                {searchingCustomers && <Loader2 size={15} className="spinIcon" />}
              </div>

              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div className="customerSearchResultsDropdown">
                  {customerSearchResults.map((cust, idx) => (
                    <div
                      key={cust.userId || `${cust.email}-${idx}`}
                      className="customerSearchRow"
                      onClick={() => handleSelectCustomer(cust)}
                    >
                      <div className="custRowMain">
                        <b>{cust.name}</b>
                        <span className="custRowEmail">{cust.email}</span>
                      </div>
                      <div className="custRowMeta">
                        <span className="custRowPhone">+91 {cust.phone || 'N/A'}</span>
                        <span className={`custSourcePill ${cust.source}`}>
                          {cust.source === 'registered' ? 'Registered User' : 'Past Buyer'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="selectedCustomerBanner">
                <CheckCircle2 size={15} color="#15803d" />
                <span>
                  Linked to account: <b>{selectedCustomer.name}</b> ({selectedCustomer.email})
                </span>
                <button
                  type="button"
                  className="clearCustBtn"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearchQuery('');
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}

            <div className="assistedFormGrid">
              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Chavan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">Mobile Number (10 Digits) *</label>
                <div className="phonePrefixWrap">
                  <span className="prefixSpan">+91</span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
                    }
                    required
                  />
                </div>
              </div>

              <div className="assistedFormGroup" style={{ gridColumn: 'span 2' }}>
                <label className="assistedFieldLabel">Email Address (Order tracking link sent here) *</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Order Line Items & Product Customization */}
          <div className="assistedSectionCard">
            <div className="assistedSectionHeader between">
              <div className="headerLeft">
                <ShoppingBag size={16} color="var(--gold, #c69a59)" />
                <h4>2. Products & Variants ({items.length} items)</h4>
              </div>
              <button
                type="button"
                className="goldBtn compact addProductTriggerBtn"
                onClick={() => setShowAddPicker(true)}
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>

            {/* Selected Items List */}
            {items.length === 0 ? (
              <div className="emptyItemsPrompt">
                <ShoppingBag size={28} color="#c69a59" />
                <p>No products added yet. Click <b>+ Add Product</b> to select pieces from the catalogue.</p>
              </div>
            ) : (
              <div className="assistedItemsList">
                {items.map((it, idx) => {
                  const paramEntries = getParameterEntries(it.selectedParameters);

                  return (
                    <div key={`${it.productId}-${idx}`} className="assistedItemRow">
                      <img
                        src={it.img}
                        alt={it.name}
                        className="assistedItemThumb"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/assets/thushi.jpg';
                        }}
                      />
                      <div className="assistedItemDetails">
                        <span className="assistedItemName">{it.name}</span>
                        {paramEntries.length > 0 && (
                          <div className="assistedItemOptionsWrap">
                            {paramEntries.map((p) => (
                              <span
                                key={p.name}
                                className={p.isCustom ? 'assistedOptionBadge custom' : 'assistedOptionBadge'}
                              >
                                {p.isCustom ? '✍️ ' : ''}<b>{p.name}:</b> {p.value}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="assistedItemPrice">{money(it.price)} each</span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="assistedQtyStepper">
                        <button
                          type="button"
                          className="qtyStepBtn"
                          onClick={() => handleUpdateItemQty(idx, it.qty - 1)}
                          disabled={it.qty <= 1}
                        >
                          -
                        </button>
                        <span className="qtyStepVal">{it.qty}</span>
                        <button
                          type="button"
                          className="qtyStepBtn"
                          onClick={() => handleUpdateItemQty(idx, it.qty + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="assistedItemTotalCol">
                        <b>{money(it.price * it.qty)}</b>
                      </div>

                      <button
                        type="button"
                        className="removeItemBtn"
                        onClick={() => handleRemoveItem(idx)}
                        title="Remove product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Delivery Address & Shipping */}
          <div className="assistedSectionCard">
            <div className="assistedSectionHeader">
              <MapPin size={16} color="var(--gold, #c69a59)" />
              <h4>3. Delivery Address & Shipping Method</h4>
            </div>

            <div className="assistedFormGrid">
              <div className="assistedFormGroup" style={{ gridColumn: 'span 2' }}>
                <label className="assistedFieldLabel">Complete Street Address (Flat / House No, Street, Landmark) *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Flat 402, Royal Palms, Near Datta Mandir, Shivaji Nagar"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">PIN Code (6 Digits) *</label>
                <div className="pincodeInputWrap">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 411004"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })
                    }
                    required
                  />
                  {pincodeLoading && <Loader2 size={15} className="spinIcon" />}
                </div>
                {pincodeError && <small className="pincodeErrorText">{pincodeError}</small>}
                {locationData && (
                  <small className="pincodeSuccessText">
                    ✓ {locationData.city}, {locationData.state}
                  </small>
                )}
              </div>

              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">Shipping Method</label>
                <select
                  value={formData.shippingMethod}
                  onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                >
                  {locationData?.options ? (
                    locationData.options.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name} ({opt.charge === 0 ? 'FREE' : money(opt.charge)})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Standard Delivery">Standard Delivery (₹70)</option>
                      <option value="Self Pickup">Self Pickup (FREE)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="assistedFormGroup">
                <label className="assistedFieldLabel">State</label>
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Gift Options */}
          <div className="assistedSectionCard">
            <div className="assistedSectionHeader">
              <Gift size={16} color="#9d174d" />
              <h4>4. Gift Options & Packaging</h4>
            </div>

            <div className="giftTogglesContainer">
              <label className="giftCheckboxItem">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                />
                <span className="giftCustomCheck"></span>
                <span className="giftLabelText">
                  <b>Mark this as a Gift Order</b> (Delivered to recipient with special care)
                </span>
              </label>

              {isGift && (
                <div className="giftExpandedOptions">
                  <label className="giftCheckboxItem luxuryWrapItem">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => setGiftWrap(e.target.checked)}
                    />
                    <span className="giftCustomCheck"></span>
                    <span className="giftLabelText">
                      <b>Add Luxury Gift Wrap (+₹20)</b>
                      <small>Royal Nathshikha box with ribbon & velvet padding</small>
                    </span>
                  </label>

                  <div className="giftNoteGroup">
                    <label className="assistedFieldLabel">Handwritten Note on Royal Parchment</label>
                    <textarea
                      rows={2}
                      placeholder="Write your custom warm message for the recipient…"
                      maxLength={1000}
                      value={handwrittenNote}
                      onChange={(e) => setHandwrittenNote(e.target.value)}
                    />
                  </div>

                  <div className="assistedFormGrid" style={{ marginTop: 10 }}>
                    <div className="assistedFormGroup">
                      <label className="assistedFieldLabel">Recipient Name (if different)</label>
                      <input
                        type="text"
                        placeholder="Recipient full name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>
                    <div className="assistedFormGroup">
                      <label className="assistedFieldLabel">Recipient Contact Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Recipient mobile number"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Coupons & Financial Summary */}
          <div className="assistedSectionCard">
            <div className="assistedSectionHeader">
              <CreditCard size={16} color="var(--gold, #c69a59)" />
              <h4>5. Coupon & Financial Calculation</h4>
            </div>

            {/* Coupon Code Input */}
            <div className="couponInputBox">
              <label className="assistedFieldLabel">Apply Valid Coupon (Optional)</label>
              {!appliedCoupon ? (
                <div className="couponInputRow">
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. FESTIVE10)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    disabled={couponLoading}
                  />
                  <button
                    type="button"
                    className="goldBtn compact applyCouponBtn"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCodeInput.trim()}
                  >
                    {couponLoading ? <Loader2 size={14} className="spinIcon" /> : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="appliedCouponBadge">
                  <span>
                    Coupon <b>{appliedCoupon.code}</b> applied (-{money(appliedCoupon.discount)})
                  </span>
                  <button type="button" className="removeCouponBtn" onClick={handleRemoveCoupon}>
                    Remove
                  </button>
                </div>
              )}
              {couponError && <small className="couponErrorText">{couponError}</small>}
            </div>

            {/* Calculated Breakdown */}
            <div className="assistedFinancialSummary">
              <div className="summaryLine">
                <span>Items Subtotal:</span>
                <b>{money(subtotal)}</b>
              </div>
              {appliedCoupon && (
                <div className="summaryLine discountLine">
                  <span>Coupon Discount ({appliedCoupon.code}):</span>
                  <b>-{money(couponDiscount)}</b>
                </div>
              )}
              <div className="summaryLine">
                <span>Shipping ({formData.shippingMethod}):</span>
                <b>{calculatedShipping === 0 ? 'FREE' : money(calculatedShipping)}</b>
              </div>
              {giftWrapCharge > 0 && (
                <div className="summaryLine">
                  <span>Luxury Gift Wrap:</span>
                  <b>+₹20</b>
                </div>
              )}
              <div className="summaryDivider"></div>
              <div className="summaryLine grandTotalLine">
                <span>Grand Total:</span>
                <b className="grandTotalVal">{money(grandTotal)}</b>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="adminNotesGroup">
              <label className="assistedFieldLabel">Internal Admin Notes (Optional audit note)</label>
              <input
                type="text"
                placeholder="e.g. Phone order requested by customer for anniversary gift"
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="assistedModalFooter">
          <div className="footerTotalPreview">
            <span>Order Total:</span>
            <strong>{money(grandTotal)}</strong>
          </div>
          <div className="footerActionBtns">
            <button type="button" className="outlineBtn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="goldBtn proceedToReviewBtn"
              onClick={handleProceedToReview}
              disabled={items.length === 0}
            >
              <Eye size={15} />
              <span>Review Order Summary</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ADD PRODUCT & PARAMETERS PICKER SUB-MODAL                    */}
        {/* ============================================================ */}
        {showAddPicker && (
          <div className="pickerSubModalOverlay" onClick={() => setShowAddPicker(false)}>
            <div className="pickerSubModal" onClick={(e) => e.stopPropagation()}>
              <div className="pickerSubModalHeader">
                <h4>Select Product from Catalogue</h4>
                <button
                  type="button"
                  className="pickerCloseBtn"
                  onClick={() => setShowAddPicker(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="pickerSubModalBody">
                <div className="pickerSearchWrap">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search catalogue by name or category…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                {!selectedProduct ? (
                  <div className="pickerProductsList">
                    {filteredCatalog.map((prod) => (
                      <div
                        key={prod.id || prod._id}
                        className="pickerProductCard"
                        onClick={() => handleSelectProductToConfigure(prod)}
                      >
                        <img
                          src={prod.img || (prod.images && prod.images[0]) || '/assets/thushi.jpg'}
                          alt={prod.name}
                          className="pickerProdThumb"
                        />
                        <div className="pickerProdInfo">
                          <b>{prod.name}</b>
                          <span className="pickerProdCategory">{prod.category || 'Traditional'}</span>
                          <span className="pickerProdPrice">{money(prod.price)}</span>
                        </div>
                        <button type="button" className="goldBtn compact selectProdBtn">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pickerConfigureProductBox">
                    <div className="selectedProdHeader">
                      <img
                        src={
                          selectedProduct.img ||
                          (selectedProduct.images && selectedProduct.images[0]) ||
                          '/assets/thushi.jpg'
                        }
                        alt={selectedProduct.name}
                        className="selectedProdThumb"
                      />
                      <div>
                        <b>{selectedProduct.name}</b>
                        <span className="selectedProdPrice">{money(selectedProduct.price)}</span>
                      </div>
                      <button
                        type="button"
                        className="changeProdBtn"
                        onClick={() => setSelectedProduct(null)}
                      >
                        Change
                      </button>
                    </div>

                    {/* Parameter Customizers */}
                    {Array.isArray(selectedProduct.productParameters) &&
                      selectedProduct.productParameters.length > 0 && (
                        <div className="productParametersCustomizer">
                          <h5>Configure Product Options / Custom Text</h5>
                          {selectedProduct.productParameters.map((param) => {
                            const isText =
                              param.displayType === 'text' || param.displayType === 'textbox';
                            const availableVals =
                              Array.isArray(param.selectedValues) && param.selectedValues.length > 0
                                ? param.selectedValues
                                : (Array.isArray(param.values) ? param.values : []);

                            return (
                              <div key={param.name} className="paramCustomizerRow">
                                <label className="assistedFieldLabel">
                                  {param.name} {param.required && <span style={{ color: '#dc2626' }}>*</span>}
                                </label>
                                {isText ? (
                                  <input
                                    type="text"
                                    placeholder={`Enter custom ${param.name}…`}
                                    value={selectedParams[param.name] || ''}
                                    onChange={(e) =>
                                      setSelectedParams({
                                        ...selectedParams,
                                        [param.name]: e.target.value
                                      })
                                    }
                                  />
                                ) : (
                                  <div className="paramValuesButtonGrid">
                                    {availableVals.map((v) => {
                                      const valStr = v.value || v.label;
                                      const isSelected = selectedParams[param.name] === valStr;
                                      return (
                                        <button
                                          key={valStr}
                                          type="button"
                                          className={`paramValBtn ${isSelected ? 'selected' : ''}`}
                                          onClick={() =>
                                            setSelectedParams({
                                              ...selectedParams,
                                              [param.name]: valStr
                                            })
                                          }
                                        >
                                          {valStr}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* Quantity Picker */}
                    <div className="pickerQtyRow">
                      <label className="assistedFieldLabel">Quantity</label>
                      <div className="pickerQtyStepper">
                        <button
                          type="button"
                          className="qtyStepBtn"
                          onClick={() => setSelectedQty((prev) => Math.max(1, prev - 1))}
                        >
                          -
                        </button>
                        <span className="qtyStepVal">{selectedQty}</span>
                        <button
                          type="button"
                          className="qtyStepBtn"
                          onClick={() => setSelectedQty((prev) => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {pickerError && <div className="pickerErrorBanner">{pickerError}</div>}

                    <button
                      type="button"
                      className="goldBtn addConfiguredBtn"
                      onClick={handleAddConfiguredProductToOrder}
                    >
                      Add to Order · {money(selectedProduct.price * selectedQty)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ADMIN PRE-SEND ORDER REVIEW SUMMARY MODAL                    */}
        {/* ============================================================ */}
        {showReviewSummary && (
          <div
            className="reviewSummaryModalOverlay"
            onClick={() => setShowReviewSummary(false)}
          >
            <div
              className="reviewSummaryModal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="reviewSummaryHeader">
                <div className="reviewHeaderBadge">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4>Confirm Order Summary Before Sending</h4>
                  <span>Please review details carefully before saving as PAYMENT_PENDING</span>
                </div>
                <button
                  type="button"
                  className="pickerCloseBtn"
                  onClick={() => setShowReviewSummary(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="reviewSummaryBody">
                {/* 1. Customer Details */}
                <div className="reviewBlock">
                  <span className="reviewBlockTitle">CUSTOMER INFORMATION</span>
                  <div className="reviewBlockGrid">
                    <div>
                      <small>Name:</small>
                      <b>{formData.name}</b>
                    </div>
                    <div>
                      <small>Phone:</small>
                      <b>+91 {formData.phone}</b>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <small>Email:</small>
                      <b>{formData.email}</b>
                    </div>
                  </div>
                </div>

                {/* 2. Delivery Destination */}
                <div className="reviewBlock">
                  <span className="reviewBlockTitle">DELIVERY DESTINATION</span>
                  <p className="reviewAddressText">
                    {formData.address}, {formData.city}, {formData.state} - <b>PIN: {formData.pincode}</b>
                  </p>
                  <small className="reviewMethodTag">
                    Method: {formData.shippingMethod} ({calculatedShipping === 0 ? 'FREE' : money(calculatedShipping)})
                  </small>
                </div>

                {/* 3. Products List */}
                <div className="reviewBlock">
                  <span className="reviewBlockTitle">PRODUCTS ({items.length})</span>
                  <div className="reviewItemsTable">
                    {items.map((it, idx) => {
                      const paramEntries = getParameterEntries(it.selectedParameters);
                      return (
                        <div key={idx} className="reviewItemRow">
                          <img src={it.img} alt={it.name} className="reviewItemThumb" />
                          <div className="reviewItemMeta">
                            <b>{it.name}</b>
                            {paramEntries.length > 0 && (
                              <small className="reviewOptionsText">
                                {paramEntries.map((p) => `${p.name}: ${p.value}`).join(' · ')}
                              </small>
                            )}
                            <small>
                              Qty: {it.qty} × {money(it.price)}
                            </small>
                          </div>
                          <b className="reviewItemTotal">{money(it.price * it.qty)}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Gift Details */}
                {isGift && (
                  <div className="reviewBlock giftBlock">
                    <span className="reviewBlockTitle">🎁 GIFT DETAILS</span>
                    <div className="reviewBlockGrid">
                      {recipientName && (
                        <div>
                          <small>Recipient:</small>
                          <b>{recipientName}</b> {recipientPhone ? `(${recipientPhone})` : ''}
                        </div>
                      )}
                      <div>
                        <small>Packaging:</small>
                        <b>{giftWrap ? 'Luxury Gift Wrap (+₹20)' : 'Standard Gift'}</b>
                      </div>
                      {handwrittenNote && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <small>Handwritten Note:</small>
                          <blockquote className="reviewNoteQuote">"{handwrittenNote}"</blockquote>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Financials */}
                <div className="reviewBlock financialsBlock">
                  <span className="reviewBlockTitle">FINANCIAL SUMMARY</span>
                  <div className="financialLines">
                    <div className="fLine">
                      <span>Subtotal:</span>
                      <b>{money(subtotal)}</b>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="fLine discount">
                        <span>Coupon Discount ({appliedCoupon.code}):</span>
                        <b>-{money(couponDiscount)}</b>
                      </div>
                    )}
                    <div className="fLine">
                      <span>Shipping:</span>
                      <b>{calculatedShipping === 0 ? 'FREE' : money(calculatedShipping)}</b>
                    </div>
                    {giftWrapCharge > 0 && (
                      <div className="fLine">
                        <span>Gift Wrap:</span>
                        <b>+₹20</b>
                      </div>
                    )}
                    <div className="fLine total">
                      <span>Grand Total:</span>
                      <strong>{money(grandTotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="reviewConfirmationNotice">
                  <CheckCircle2 size={16} color="#15803d" />
                  <span>
                    Saving this order will set status to <b>PAYMENT_PENDING</b> and email the customer to review and proceed with payment.
                  </span>
                </div>
              </div>

              <div className="reviewSummaryFooter">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setShowReviewSummary(false)}
                  disabled={submitting}
                >
                  <Edit3 size={14} /> Back to Edit
                </button>
                <button
                  type="button"
                  className="goldBtn saveAndSendFinalBtn"
                  onClick={handleSaveAndSendToCustomer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spinIcon" />
                      <span>Saving & Sending…</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>SAVE & SEND TO CUSTOMER · {money(grandTotal)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
