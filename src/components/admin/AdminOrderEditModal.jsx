import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Plus,
  Trash2,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';
import { money, formatOrderStatus } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
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
  onSaveOrderEdit,
  products = []
}) {
  // Customer & Shipping Form State
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

  // Gift Options State
  const [giftWrap, setGiftWrap] = useState(false);
  const [handwrittenNoteEnabled, setHandwrittenNoteEnabled] = useState(false);
  const [handwrittenNote, setHandwrittenNote] = useState('');

  // Order Items State
  const [items, setItems] = useState([]);

  // Catalog Products State (fallback load if products prop is empty)
  const [catalogProducts, setCatalogProducts] = useState(products || []);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Add Product Sub-Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [selectedParams, setSelectedParams] = useState({});
  const [selectedQty, setSelectedQty] = useState(1);
  const [addProductError, setAddProductError] = useState('');

  // Remove Product Confirmation Dialog State
  const [itemIndexToRemove, setItemIndexToRemove] = useState(null);

  // General Modal State
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpPincode, setLookingUpPincode] = useState(false);

  // Filter Catalog Products for Add Modal (called unconditionally)
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

  // Fetch catalog products if needed
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
          // fallback to public products
          api('/products')
            .then((data) => {
              if (Array.isArray(data)) setCatalogProducts(data);
            })
            .catch(() => {});
        })
        .finally(() => setLoadingCatalog(false));
    }
  }, [isOpen, products]);

  // Initialize form and order items on open
  useEffect(() => {
    if (isOpen && order) {
      const isGiftBool = Boolean(order.is_gift || order.isGift);
      const recipientName = order.recipient_name || order.recipientName || (isGiftBool ? (order.name || '') : '');
      const recipientPhone = order.recipient_phone || order.recipientPhone || (isGiftBool ? (order.phone || '') : '');

      const noteText = String(order.handwritten_note || order.handwrittenNote || '').trim();
      const wrapBool = Boolean(order.gift_wrap || order.giftWrap || (Number(order.gift_wrap_charge || order.giftWrapCharge) > 0));

      setFormData({
        address: order.address || '',
        pincode: order.pincode || '',
        city: order.city || '',
        state: order.state || 'Maharashtra',
        isGift: isGiftBool,
        recipientName,
        recipientPhone,
        customizationDetails: order.customization?.details || '',
        adminEditNotes: ''
      });

      setGiftWrap(wrapBool);
      setHandwrittenNote(noteText);
      setHandwrittenNoteEnabled(Boolean(noteText));

      // Clone items
      const rawItems = Array.isArray(order.items) ? order.items : [];
      const clonedItems = rawItems.map((item, idx) => ({
        _key: `${item.productId || item.id || item._id || 'item'}_${idx}_${Date.now()}`,
        productId: item.productId || item.id || item._id || null,
        name: item.name || item.product_name || item.productName || 'Jewellery Item',
        price: Number(item.price || item.unitPrice || 0),
        qty: Math.max(1, Number(item.qty || item.quantity || 1)),
        img: item.img || item.image || '/assets/thushi.jpg',
        sku: item.sku || item.productCode || item.product_code || '',
        selectedParameters: item.selectedParameters || item.selectedOptions || {},
        customizationNote: item.customizationNote || ''
      }));
      setItems(clonedItems);

      setError('');
      setSubmitting(false);
      setShowAddProductModal(false);
      setItemIndexToRemove(null);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const orderStatus = String(order.order_status || order.orderStatus || 'placed').toLowerCase();
  const isShipped = orderStatus === 'shipped';
  const isDelivered = orderStatus === 'delivered';
  const isMaking = orderStatus === 'making';
  const isPacking = orderStatus === 'packing' || orderStatus === 'processing';
  const isProductionLocked = isMaking || isPacking || isShipped || isDelivered;

  const isVerified =
    order.payment_status === 'verified' ||
    order.paymentStatus === 'verified' ||
    order.payment_status === 'paid';

  // Live Financial Calculation
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
  const couponDiscount = Number(order.coupon_discount ?? order.couponDiscount ?? 0);
  const couponCode = order.coupon_code || order.couponCode || null;
  const shippingCharge = Number(order.shipping_charge !== undefined ? order.shipping_charge : (order.shipping !== undefined ? order.shipping : 0));
  const giftWrapCharge = giftWrap ? 20 : 0;
  const newGrandTotal = Math.max(0, subtotal - couponDiscount) + shippingCharge + giftWrapCharge;
  const previousTotal = Number(order.total || 0);
  const totalDifference = newGrandTotal - previousTotal;

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
      // Admin can type city/state manually
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

  // Quantity Change Handler
  const handleQtyChange = (index, delta) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (!target) return prev;
      const newQty = Math.max(1, (target.qty || 1) + delta);
      copy[index] = { ...target, qty: newQty };
      return copy;
    });
  };

  // Remove Item Handler
  const confirmRemoveItem = () => {
    if (itemIndexToRemove === null) return;
    if (items.length <= 1) {
      setError('An order must contain at least 1 product. Cannot remove all items.');
      setItemIndexToRemove(null);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== itemIndexToRemove));
    setItemIndexToRemove(null);
  };

  // Open Add Product Dialog
  const handleOpenAddProduct = () => {
    setSelectedCatalogProduct(null);
    setSelectedParams({});
    setSelectedQty(1);
    setProductSearch('');
    setAddProductError('');
    setShowAddProductModal(true);
  };

  // Select Catalog Product in Add Modal
  const handleSelectCatalogProduct = (prod) => {
    setSelectedCatalogProduct(prod);
    setSelectedQty(1);
    setAddProductError('');

    // Pre-populate default parameter selections if product has parameters
    const initialParams = {};
    if (prod && Array.isArray(prod.parameters)) {
      prod.parameters.forEach((param) => {
        if (param.selectedValues && param.selectedValues.length > 0) {
          initialParams[param.name] = param.selectedValues[0].label || param.selectedValues[0].value;
        }
      });
    }
    setSelectedParams(initialParams);
  };

  // Confirm Add Product to Order Items
  const handleConfirmAddProduct = () => {
    if (!selectedCatalogProduct) {
      setAddProductError('Please choose a product to add.');
      return;
    }

    if (selectedQty < 1) {
      setAddProductError('Quantity must be at least 1.');
      return;
    }

    // Check stock if available
    const availableStock = selectedCatalogProduct.stock !== undefined ? selectedCatalogProduct.stock : 999;
    if (availableStock <= 0) {
      setAddProductError(`"${selectedCatalogProduct.name}" is currently Out of Stock.`);
      return;
    }

    const newItem = {
      _key: `${selectedCatalogProduct.id || selectedCatalogProduct._id}_${Date.now()}`,
      productId: selectedCatalogProduct.id || selectedCatalogProduct._id,
      name: selectedCatalogProduct.name,
      price: Number(selectedCatalogProduct.price || 0),
      qty: Number(selectedQty),
      img: selectedCatalogProduct.img || (selectedCatalogProduct.images && selectedCatalogProduct.images[0]) || '/assets/thushi.jpg',
      sku: selectedCatalogProduct.productCode || selectedCatalogProduct.sku || `PRD-${String(selectedCatalogProduct.id || selectedCatalogProduct._id || '').slice(-6).toUpperCase()}`,
      selectedParameters: { ...selectedParams },
      customizationNote: ''
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddProductModal(false);
  };

  // Submit Main Order Edits
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Products Check
    if (!items || items.length === 0) {
      setError('An order must contain at least 1 product item.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].qty || items[i].qty < 1) {
        setError(`Quantity for "${items[i].name}" must be at least 1.`);
        return;
      }
    }

    // Client-side validations
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
      const payload = {
        address: cleanAddress,
        pincode: cleanPincode,
        city: formData.city.trim(),
        state: formData.state.trim(),
        isGift: formData.isGift,
        recipientName: formData.isGift
          ? formData.recipientName.trim()
          : (formData.recipientName?.trim() || null),
        recipientPhone: formData.isGift
          ? (formData.recipientPhone.replace(/\D/g, '').slice(-10) || null)
          : (formData.recipientPhone?.replace(/\D/g, '').slice(-10) || null),
        customizationDetails: formData.customizationDetails.trim(),
        adminEditNotes: formData.adminEditNotes.trim(),
        // Gift Options
        giftWrap: Boolean(giftWrap),
        giftWrapCharge: giftWrap ? 20 : 0,
        handwrittenNote: (handwrittenNoteEnabled && handwrittenNote.trim()) ? handwrittenNote.trim() : '',
        // Order Products
        items: items.map((it) => ({
          productId: it.productId || it.id || it._id || null,
          name: it.name,
          price: Number(it.price || 0),
          qty: Number(it.qty || 1),
          img: it.img || '/assets/thushi.jpg',
          sku: it.sku || '',
          productCode: it.sku || '',
          selectedParameters: it.selectedParameters || {},
          selectedOptions: it.selectedParameters || {},
          customizationNote: it.customizationNote || ''
        }))
      };

      await onSaveOrderEdit(order.id || order._id, payload);
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
                Modify products, customer contact info, delivery address & gift options
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

        {/* Lifecycle Warning Banner if order is in production or shipped */}
        {isProductionLocked && (
          <div className="adminEditShippedWarning">
            <AlertTriangle size={18} color="#b45309" />
            <div>
              <strong>
                {isShipped
                  ? 'Order has already been marked as Dispatched / Shipped'
                  : isDelivered
                  ? 'Order has already been Delivered'
                  : isPacking
                  ? 'Order is currently in Quality Check & Packaging stage'
                  : 'Order is currently in Making / Crafting stage'}
              </strong>
              <p>
                {isShipped || isDelivered
                  ? `Tracking ID: ${order.tracking_id || order.trackingId || 'Recorded'} (${order.shipment_partner || order.shipmentPartner || 'Speed Post'}). Changes made here update records, customer views, and invoices, but do not physically reroute or recall a parcel in transit.`
                  : `Please verify with the workshop team before changing product quantities or parameters as artisan crafting is already underway.`}
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
          {/* ============================================================ */}
          {/* SECTION 1: ORDER PRODUCTS & ITEMS (PART 1 OF MASTER TASK)   */}
          {/* ============================================================ */}
          <div className="adminEditSectionCard adminEditProductsCard">
            <div className="adminEditSectionHeader" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={16} color="var(--maroon, #6d1b29)" />
                <h4>Order Products & Items ({items.length})</h4>
              </div>
              <button
                type="button"
                className="goldBtn compact adminAddProductTriggerBtn"
                onClick={handleOpenAddProduct}
              >
                <Plus size={14} />
                <span>+ ADD PRODUCT</span>
              </button>
            </div>

            <div className="adminOrderItemsTableWrap">
              <table className="adminOrderItemsEditTable">
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Product & Options</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ width: '18%', textAlign: 'center' }}>Quantity</th>
                    <th style={{ width: '19%', textAlign: 'right' }}>Item Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const params = getParameterEntries(item.selectedParameters || item.selectedOptions);
                    const itemTotal = Number(item.price || 0) * Number(item.qty || 1);

                    return (
                      <tr key={item._key || idx} className="adminOrderItemEditRow">
                        <td>
                          <div className="adminItemCardCol">
                            <img
                              src={item.img || '/assets/thushi.jpg'}
                              alt={item.name}
                              className="adminItemThumb"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/assets/thushi.jpg';
                              }}
                            />
                            <div className="adminItemMetaCol">
                              <span className="adminItemName">{item.name}</span>
                              {item.sku && (
                                <span className="adminItemSku">Code: {item.sku}</span>
                              )}
                              {params.length > 0 && (
                                <div className="adminItemParamsList">
                                  {params.map((p) => (
                                    <span key={p.name} className="adminItemParamBadge">
                                      {p.name}: <b>{p.value}</b>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <button
                                type="button"
                                className="adminItemRemoveBtn"
                                onClick={() => setItemIndexToRemove(idx)}
                                title="Remove this product from order"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="adminItemUnitPrice">{money(item.price)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="adminItemQtyStepper">
                            <button
                              type="button"
                              className="adminQtyStepBtn"
                              onClick={() => handleQtyChange(idx, -1)}
                              disabled={item.qty <= 1}
                              title="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="adminQtyVal">{item.qty}</span>
                            <button
                              type="button"
                              className="adminQtyStepBtn"
                              onClick={() => handleQtyChange(idx, 1)}
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="adminItemRowTotal">{money(itemTotal)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Financial Calculations Strip */}
            <div className="adminEditFinancialCalculationStrip">
              <div className="finCol">
                <span className="finLabel">Subtotal:</span>
                <span className="finVal">{money(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="finCol discountCol">
                  <span className="finLabel">Coupon {couponCode ? `(${couponCode})` : ''}:</span>
                  <span className="finVal">-{money(couponDiscount)}</span>
                </div>
              )}
              <div className="finCol">
                <span className="finLabel">Shipping:</span>
                <span className="finVal">{shippingCharge === 0 ? 'FREE' : money(shippingCharge)}</span>
              </div>
              {giftWrap && (
                <div className="finCol giftWrapCol">
                  <span className="finLabel">Gift Wrap:</span>
                  <span className="finVal">+₹20</span>
                </div>
              )}
              <div className="finCol grandTotalCol">
                <span className="finLabel">New Total:</span>
                <span className="finVal grandTotalVal">{money(newGrandTotal)}</span>
              </div>
              {totalDifference !== 0 && (
                <div className={`finCol diffCol ${totalDifference > 0 ? 'diffPositive' : 'diffNegative'}`}>
                  <span className="finLabel">Difference:</span>
                  <span className="finVal">
                    {totalDifference > 0 ? `+${money(totalDifference)}` : `-${money(Math.abs(totalDifference))}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: SEND AS GIFT & GIFT OPTIONS (PART 3)              */}
          {/* ============================================================ */}
          <div className="adminEditSectionCard">
            <div className="adminEditSectionHeader">
              <Gift size={16} color="#9d174d" />
              <h4>Gift Options & Packaging</h4>
            </div>

            <div className="adminEditGiftOptionsGrid">
              {/* Gift Wrap Toggle */}
              <div className={`adminEditGiftOptionCard ${giftWrap ? 'activeGiftCard' : ''}`}>
                <label className="adminEditCheckboxLabel">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="adminEditCheckbox"
                  />
                  <span className="adminEditCheckboxCustom"></span>
                  <span className="adminGiftCardText">
                    <strong>Luxury Gift Wrap</strong>
                    <span className="adminGiftPriceBadge">₹20 Charge</span>
                  </span>
                </label>
                <p className="adminGiftCardDesc">
                  High-quality royal packaging with satin ribbon and gold-stamped Nathshikha box.
                </p>
              </div>

              {/* Handwritten Note Toggle */}
              <div className={`adminEditGiftOptionCard ${handwrittenNoteEnabled ? 'activeGiftCard' : ''}`}>
                <label className="adminEditCheckboxLabel">
                  <input
                    type="checkbox"
                    checked={handwrittenNoteEnabled}
                    onChange={(e) => setHandwrittenNoteEnabled(e.target.checked)}
                    className="adminEditCheckbox"
                  />
                  <span className="adminEditCheckboxCustom"></span>
                  <span className="adminGiftCardText">
                    <strong>Handwritten Note</strong>
                    <span className="adminGiftFreeBadge">Complimentary</span>
                  </span>
                </label>
                <p className="adminGiftCardDesc">
                  Personalized calligraphy message penned on handcrafted parchment paper.
                </p>
              </div>
            </div>

            {handwrittenNoteEnabled && (
              <div className="adminEditHandwrittenNoteWrap">
                <label htmlFor="adminHandwrittenNoteInput">
                  Handwritten Note Message
                </label>
                <textarea
                  id="adminHandwrittenNoteInput"
                  value={handwrittenNote}
                  onChange={(e) => setHandwrittenNote(e.target.value)}
                  placeholder="Write the personalized greeting message to be handwritten for the recipient..."
                  rows={2}
                  maxLength={500}
                  className="adminEditTextarea"
                />
                <small className="adminEditFieldHint">
                  Displayed on customer order tracking, admin view & invoice. Max 500 characters.
                </small>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: PURCHASER (READ-ONLY) & DELIVERY DETAILS (PART 2) */}
          {/* ============================================================ */}
          <div className="adminEditFormGrid">
            {/* LEFT COLUMN: Read-Only Purchaser & Delivery Recipient */}
            <div className="adminEditSectionCard">
              {/* READ ONLY PURCHASER CARD */}
              <div className="adminEditPurchaserCard">
                <div className="adminEditPurchaserHeader">
                  <div className="adminEditPurchaserTitle">
                    <User size={14} color="#6d1b29" />
                    <span>Purchaser / Buyer</span>
                  </div>
                  <span className="adminEditLockedBadge">
                    <Lock size={11} />
                    <span>Immutable</span>
                  </span>
                </div>
                <div className="adminEditPurchaserGrid">
                  <div className="adminEditPurchaserRow">
                    <span className="adminEditPurchaserLabel">Name:</span>
                    <span className="adminEditPurchaserValue">
                      {order.customer_name || order.customerName || order.name || 'Nathshikha Customer'}
                    </span>
                  </div>
                  <div className="adminEditPurchaserRow">
                    <span className="adminEditPurchaserLabel">Phone:</span>
                    <span className="adminEditPurchaserValue">
                      {order.customer_phone || order.customerPhone || order.phone || '—'}
                    </span>
                  </div>
                  <div className="adminEditPurchaserRow">
                    <span className="adminEditPurchaserLabel">Email:</span>
                    <span className="adminEditPurchaserValue">
                      {order.customer_email || order.customerEmail || order.email || '—'}
                    </span>
                  </div>
                </div>
                <div className="adminEditPurchaserNote">
                  <Lock size={12} />
                  <span>🔒 Original purchaser information cannot be changed.</span>
                </div>
              </div>

              {/* DELIVERY RECIPIENT SETTINGS */}
              <div className="adminEditSectionHeader" style={{ marginTop: 2 }}>
                <Truck size={16} />
                <h4>Delivery Recipient</h4>
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
                    <strong>This is a Gift Order (Separate Recipient)</strong>
                  </span>
                </label>
              </div>

              {formData.isGift ? (
                /* Gift Recipient Fields */
                <div className="adminEditFieldsStack">
                  <div className="adminEditGiftSubHeader">
                    <span>🎁 Delivery Recipient (Receives Parcel)</span>
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
                    <small className="adminEditFieldHint">
                      Delivery SMS, tracking and OTP will be directed to the recipient.
                    </small>
                  </div>
                </div>
              ) : (
                /* Direct Delivery to Purchaser Mode */
                <div className="adminEditFieldsStack">
                  <div className="adminEditGiftSubHeader">
                    <span>📦 Direct Delivery to Purchaser</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                    Delivery parcel is addressed directly to <strong>{order.customer_name || order.customerName || order.name}</strong>.
                    To specify a different recipient name or contact, check <em>"This is a Gift Order"</em> above.
                  </p>
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
                    placeholder="e.g. Customer requested extra piece via WhatsApp"
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

        {/* ============================================================ */}
        {/* SUB-MODAL 1: ADD PRODUCT FROM CATALOG MODAL                  */}
        {/* ============================================================ */}
        {showAddProductModal && (
          <div className="adminSubModalOverlay" onClick={() => setShowAddProductModal(false)}>
            <div
              className="adminSubModalContainer"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
            >
              <div className="adminSubModalHeader">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={18} color="var(--gold, #d4af37)" />
                  <h4>Add Product from Catalog</h4>
                </div>
                <button
                  type="button"
                  className="adminSubModalCloseBtn"
                  onClick={() => setShowAddProductModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {addProductError && (
                <div className="adminEditErrorAlert" style={{ margin: '10px 16px 0' }}>
                  <AlertTriangle size={15} />
                  <span>{addProductError}</span>
                </div>
              )}

              <div className="adminSubModalBody">
                {/* Search Bar */}
                <div className="adminCatalogSearchBar">
                  <Search size={15} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name, category, or code..."
                    autoFocus
                  />
                </div>

                {/* Catalog Product Selection Grid */}
                <div className="adminCatalogGrid">
                  {filteredCatalog.map((prod) => {
                    const isSelected = selectedCatalogProduct && (selectedCatalogProduct.id === prod.id || selectedCatalogProduct._id === prod._id);
                    const stock = prod.stock !== undefined ? prod.stock : 99;

                    return (
                      <div
                        key={prod.id || prod._id}
                        className={`adminCatalogCard ${isSelected ? 'selectedCatalogCard' : ''}`}
                        onClick={() => handleSelectCatalogProduct(prod)}
                      >
                        <img
                          src={prod.img || (prod.images && prod.images[0]) || '/assets/thushi.jpg'}
                          alt={prod.name}
                          className="adminCatalogThumb"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/assets/thushi.jpg';
                          }}
                        />
                        <div className="adminCatalogInfo">
                          <span className="adminCatalogName">{prod.name}</span>
                          <div className="adminCatalogMetaRow">
                            <span className="adminCatalogPrice">{money(prod.price)}</span>
                            <span className={`adminCatalogStock ${stock <= 0 ? 'outOfStock' : ''}`}>
                              {stock <= 0 ? 'Out of Stock' : `Stock: ${stock}`}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="adminCatalogCheck">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <div className="adminCatalogEmpty">
                      <Package size={24} color="#94a3b8" />
                      <p>No catalog products match your search.</p>
                    </div>
                  )}
                </div>

                {/* Selected Product Variant / Parameter Picker */}
                {selectedCatalogProduct && (
                  <div className="adminSelectedProductOptionsBox">
                    <h5>Configure Selected Product: {selectedCatalogProduct.name}</h5>

                    {/* Parameters if available */}
                    {Array.isArray(selectedCatalogProduct.parameters) && selectedCatalogProduct.parameters.length > 0 && (
                      <div className="adminParamsFormStack">
                        {selectedCatalogProduct.parameters.map((param) => (
                          <div key={param.name} className="adminParamFieldGroup">
                            <label>{param.name}:</label>
                            <select
                              value={selectedParams[param.name] || ''}
                              onChange={(e) =>
                                setSelectedParams((prev) => ({
                                  ...prev,
                                  [param.name]: e.target.value
                                }))
                              }
                              className="adminParamSelect"
                            >
                              {(param.selectedValues || []).map((val) => (
                                <option key={val.valueId || val.value || val.label} value={val.label || val.value}>
                                  {val.label || val.value}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quantity Picker */}
                    <div className="adminAddQtyRow">
                      <label>Quantity to Add:</label>
                      <div className="adminItemQtyStepper">
                        <button
                          type="button"
                          className="adminQtyStepBtn"
                          onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                        >
                          −
                        </button>
                        <span className="adminQtyVal">{selectedQty}</span>
                        <button
                          type="button"
                          className="adminQtyStepBtn"
                          onClick={() => setSelectedQty((q) => q + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="adminSubModalFooter">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setShowAddProductModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="goldBtn"
                  onClick={handleConfirmAddProduct}
                  disabled={!selectedCatalogProduct}
                >
                  <Plus size={14} />
                  <span>Add to Order</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SUB-MODAL 2: REMOVE PRODUCT CONFIRMATION DIALOG              */}
        {/* ============================================================ */}
        {itemIndexToRemove !== null && (
          <div className="adminSubModalOverlay" onClick={() => setItemIndexToRemove(null)}>
            <div
              className="adminRemoveConfirmBox"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
            >
              <div className="adminRemoveConfirmHeader">
                <AlertTriangle size={24} color="#dc2626" />
                <h4>Remove Product from Order?</h4>
              </div>
              <p>
                Are you sure you want to remove{' '}
                <b>"{items[itemIndexToRemove]?.name}"</b> from this order?
              </p>
              <div className="adminRemoveConfirmActions">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setItemIndexToRemove(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adminDeleteConfirmBtn"
                  onClick={confirmRemoveItem}
                >
                  <Trash2 size={14} />
                  <span>Remove Product</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
