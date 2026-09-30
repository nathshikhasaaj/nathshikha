import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackagePlus,
  Search,
  Check,
  Gift,
  Tag,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Type,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { money, formatOrderStatus } from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import { useToast } from '../../context/ToastContext';
import './AdminCreateOrderModal.css';

const PAYMENT_APP_OPTIONS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM',
  'Bank Transfer',
  'Cash on Delivery',
  'WhatsApp Pay',
  'Other'
];

export default function AdminCreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  products = []
}) {
  const { setToast } = useToast();

  // Navigation Step: 'configure' | 'review'
  const [currentStep, setCurrentStep] = useState('configure');

  // Customer State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef(null);

  // Form State (Buyer & Delivery)
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

  // Gift Options
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [handwrittenNoteEnabled, setHandwrittenNoteEnabled] = useState(false);
  const [handwrittenNote, setHandwrittenNote] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);

  // Customization Options
  const [hasCustomization, setHasCustomization] = useState(false);
  const [customizationDetails, setCustomizationDetails] = useState('');
  const [customizationPreviewUrl, setCustomizationPreviewUrl] = useState('');
  const [customizationUploadedUrl, setCustomizationUploadedUrl] = useState('');
  const [customizationUploading, setCustomizationUploading] = useState(false);
  const [customizationFileError, setCustomizationFileError] = useState('');

  // Selected Order Line Items - STRICTLY EMPTY BY DEFAULT!
  const [selectedItems, setSelectedItems] = useState([]);

  // Product Catalog & Picker Sub-Modal / Drawer State
  const [catalogProducts, setCatalogProducts] = useState(products || []);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [pickerSelectedProduct, setPickerSelectedProduct] = useState(null); // STRICTLY NULL
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerSelectedParams, setPickerSelectedParams] = useState({});
  const [pickerParamErrors, setPickerParamErrors] = useState({});

  // PIN & Shipping State
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('Standard Delivery');
  const [calculatedShippingCharge, setCalculatedShippingCharge] = useState(0);

  // Payment & Order Status Settings
  const [paymentStatus, setPaymentStatus] = useState('verification_pending');
  const [orderStatus, setOrderStatus] = useState('placed');
  const [transactionId, setTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay');

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load catalog products if not passed or empty
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

  // Reset ALL state cleanly when modal opens — STRICTLY ZERO DEFAULT PRODUCTS
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('configure');
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      setSelectedCustomer(null);
      setShowCustomerDropdown(false);
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
      setIsGift(false);
      setRecipientName('');
      setRecipientPhone('');
      setHandwrittenNoteEnabled(false);
      setHandwrittenNote('');
      setGiftWrap(false);
      setHasCustomization(false);
      setCustomizationDetails('');
      setCustomizationPreviewUrl('');
      setCustomizationUploadedUrl('');
      setCustomizationUploading(false);
      setCustomizationFileError('');
      
      // STRICTLY EMPTY ORDER ITEMS LIST
      setSelectedItems([]);
      setShowProductPicker(false);
      setProductSearchQuery('');
      setSelectedCategoryFilter('all');
      setPickerSelectedProduct(null);
      setPickerQty(1);
      setPickerSelectedParams({});
      setPickerParamErrors({});

      setLocationData(null);
      setPincodeError('');
      setSelectedShippingMethod('Standard Delivery');
      setCalculatedShippingCharge(0);

      setPaymentStatus('verification_pending');
      setOrderStatus('placed');
      setTransactionId('');
      setPaymentApp('Google Pay');

      setCouponCodeInput('');
      setAppliedCoupon(null);
      setCouponError('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Live Customer Search
  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (q.length >= 2 && !selectedCustomer) {
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
  }, [customerSearchQuery, selectedCustomer]);

  // Close customer dropdown on outside click
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
    setCustomerSearchQuery(`${cust.name} (${cust.email || cust.phone || ''})`);
    setShowCustomerDropdown(false);

    const defAddr = cust.defaultAddress;
    setForm((prev) => ({
      ...prev,
      name: cust.name || prev.name,
      phone: cust.phone || prev.phone,
      email: cust.email || prev.email,
      address: defAddr?.addressLine1
        ? `${defAddr.addressLine1}${defAddr.addressLine2 ? ', ' + defAddr.addressLine2 : ''}`
        : (defAddr?.address || prev.address),
      pincode: defAddr?.pincode || prev.pincode,
      city: defAddr?.city || prev.city,
      state: defAddr?.state || prev.state
    }));
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  const handleUseSavedAddress = (addr) => {
    if (!addr) return;
    setForm((prev) => ({
      ...prev,
      name: addr.recipientName || addr.name || prev.name,
      phone: addr.recipientPhone || addr.phone || prev.phone,
      address: addr.addressLine1
        ? `${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}`
        : (addr.address || prev.address),
      pincode: addr.pincode || prev.pincode,
      city: addr.city || prev.city,
      state: addr.state || prev.state
    }));
    if (isGift) {
      setRecipientName(addr.recipientName || addr.name || '');
      setRecipientPhone(addr.recipientPhone || addr.phone || '');
    }
  };

  // PIN Code live lookup
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
            if (data.city) setForm((prev) => ({ ...prev, city: data.city }));
            if (data.state) setForm((prev) => ({ ...prev, state: data.state }));

            const matchedOption = data.options.find(
              (o) => o.id === selectedShippingMethod || o.name === selectedShippingMethod
            ) || data.options[0];

            if (matchedOption) {
              setSelectedShippingMethod(matchedOption.name || matchedOption.id);
              setCalculatedShippingCharge(matchedOption.charge || 0);
            }
          } else {
            setLocationData(null);
            setPincodeError(data?.error || "We couldn't verify this PIN code.");
            setCalculatedShippingCharge(0);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLocationData(null);
          setPincodeError(err.message || "We couldn't verify this PIN code.");
          setCalculatedShippingCharge(0);
        })
        .finally(() => {
          if (isMounted) setPincodeLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (cleanPin.length > 0 && cleanPin.length < 6) {
      setLocationData(null);
      setPincodeError('Please enter a full 6-digit PIN code.');
    } else if (cleanPin.length === 0) {
      setLocationData(null);
      setPincodeError('');
      setCalculatedShippingCharge(0);
    }
  }, [form.pincode]);

  const handleSelectShippingOption = (opt) => {
    setSelectedShippingMethod(opt.name || opt.id);
    setCalculatedShippingCharge(opt.charge || 0);
  };

  // Unique categories in catalog
  const catalogCategories = useMemo(() => {
    const cats = new Set();
    catalogProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [catalogProducts]);

  // Filter Catalog Products in picker
  const filteredCatalogProducts = useMemo(() => {
    let list = catalogProducts;
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((p) => p.category === selectedCategoryFilter);
    }
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const code = (p.productCode || p.sku || p.id || p._id || '').toLowerCase();
        return name.includes(q) || cat.includes(q) || code.includes(q);
      });
    }
    return list;
  }, [catalogProducts, productSearchQuery, selectedCategoryFilter]);

  // Parameters for currently selected product in picker
  const pickerProductParameters = useMemo(() => {
    if (!pickerSelectedProduct) return [];
    return Array.isArray(pickerSelectedProduct.productParameters) && pickerSelectedProduct.productParameters.length > 0
      ? pickerSelectedProduct.productParameters
      : Array.isArray(pickerSelectedProduct.parameters) && pickerSelectedProduct.parameters.length > 0
      ? pickerSelectedProduct.parameters
      : Array.isArray(pickerSelectedProduct.options) && pickerSelectedProduct.options.length > 0
      ? pickerSelectedProduct.options
      : [];
  }, [pickerSelectedProduct]);

  // Select a product to configure in the picker
  const handleSelectProductForPicker = (prod) => {
    if (!prod) return;
    setPickerSelectedProduct(prod);
    setPickerQty(1);
    setPickerParamErrors({});

    const params = Array.isArray(prod.productParameters) && prod.productParameters.length > 0
      ? prod.productParameters
      : Array.isArray(prod.parameters) && prod.parameters.length > 0
      ? prod.parameters
      : Array.isArray(prod.options) ? prod.options : [];

    if (params.length > 0) {
      const initialParams = {};
      params.forEach((param) => {
        const isText = param.displayType === 'text' || param.displayType === 'textbox';
        if (isText) {
          initialParams[param.name] = '';
        } else {
          const vals = Array.isArray(param.selectedValues) && param.selectedValues.length > 0
            ? param.selectedValues
            : Array.isArray(param.values) ? param.values : [];
          const firstInStock = vals.find((v) => v.inStock !== false) || vals[0];
          if (firstInStock) {
            initialParams[param.name] = firstInStock.value || firstInStock.label;
          }
        }
      });
      setPickerSelectedParams(initialParams);
    } else {
      setPickerSelectedParams({});
    }
  };

  const handleSelectPickerParam = (paramName, value) => {
    setPickerSelectedParams((prev) => ({
      ...prev,
      [paramName]: value
    }));
    if (pickerParamErrors[paramName]) {
      setPickerParamErrors((prev) => {
        const next = { ...prev };
        delete next[paramName];
        return next;
      });
    }
  };

  // Add Item to Order from Picker
  const handleAddProductToOrder = () => {
    if (!pickerSelectedProduct) return;
    const maxStock = pickerSelectedProduct.stock !== undefined ? pickerSelectedProduct.stock : 10;
    if (maxStock <= 0) {
      setToast({ type: 'warning', message: `"${pickerSelectedProduct.name}" is currently out of stock.` });
      return;
    }

    // Validate required parameters
    const errors = {};
    for (const param of pickerProductParameters) {
      const isText = param.displayType === 'text' || param.displayType === 'textbox';
      const vals = Array.isArray(param.selectedValues) && param.selectedValues.length > 0
        ? param.selectedValues
        : Array.isArray(param.values) ? param.values : [];
      if (!isText && vals.length === 0) continue;

      if (param.required && (!pickerSelectedParams[param.name] || !String(pickerSelectedParams[param.name]).trim())) {
        errors[param.name] = isText ? `Please enter ${param.name}` : `Please select ${param.name}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setPickerParamErrors(errors);
      setToast({ type: 'warning', message: 'Please configure required options before adding.' });
      return;
    }

    const requestedQty = Math.max(1, Number(pickerQty) || 1);
    const pId = pickerSelectedProduct.id || pickerSelectedProduct._id;

    // Check if identical item (same product ID + identical parameters) is already in the list
    const existingIdx = selectedItems.findIndex((item) => {
      if (String(item.productId) !== String(pId)) return false;
      const paramsA = item.selectedParameters || {};
      const paramsB = pickerSelectedParams || {};
      const keysA = Object.keys(paramsA).sort();
      const keysB = Object.keys(paramsB).sort();
      if (keysA.length !== keysB.length) return false;
      return keysA.every((k) => String(paramsA[k]).trim() === String(paramsB[k]).trim());
    });

    const currentTotalForProduct = selectedItems
      .filter((it) => String(it.productId) === String(pId))
      .reduce((sum, it) => sum + it.qty, 0);

    if (currentTotalForProduct + requestedQty > maxStock) {
      setToast({
        type: 'warning',
        message: `Only ${maxStock} unit(s) available in stock for "${pickerSelectedProduct.name}". Cannot add ${requestedQty} more.`
      });
      return;
    }

    if (existingIdx >= 0) {
      setSelectedItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: item.qty + requestedQty } : item
        )
      );
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: pId,
          id: pId,
          name: pickerSelectedProduct.name,
          price: pickerSelectedProduct.price,
          qty: requestedQty,
          stock: maxStock,
          img: pickerSelectedProduct.img || (Array.isArray(pickerSelectedProduct.images) ? pickerSelectedProduct.images[0] : '/assets/thushi.jpg'),
          selectedParameters: { ...pickerSelectedParams },
          selectedOptions: { ...pickerSelectedParams },
          catalogProduct: pickerSelectedProduct
        }
      ]);
    }

    setToast({
      type: 'success',
      message: `✓ Added ${requestedQty} × "${pickerSelectedProduct.name}" to order`
    });

    // Reset picker configuration
    setPickerSelectedProduct(null);
    setPickerSelectedParams({});
    setPickerQty(1);
    setShowProductPicker(false);
    setProductSearchQuery('');
  };

  // Remove Item
  const handleRemoveItem = (idxToRemove) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Update Item Quantity with Stock Bounds
  const handleUpdateItemQty = (idx, newQty) => {
    const targetItem = selectedItems[idx];
    if (!targetItem) return;

    const safeQty = Math.max(1, Number(newQty) || 1);
    const maxStock = targetItem.stock !== undefined ? targetItem.stock : 10;

    const otherQtyForProduct = selectedItems
      .filter((it, i) => i !== idx && String(it.productId) === String(targetItem.productId))
      .reduce((sum, it) => sum + it.qty, 0);

    if (otherQtyForProduct + safeQty > maxStock) {
      setToast({
        type: 'warning',
        message: `Only ${maxStock} unit(s) available in stock for "${targetItem.name}".`
      });
      return;
    }

    setSelectedItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, qty: safeQty } : item))
    );
  };

  // Customization Reference Image Upload
  const handleCustomizationImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomizationFileError('');
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setCustomizationFileError('Please select a valid JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCustomizationFileError('Image size exceeds 10MB limit.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setCustomizationPreviewUrl(preview);
    setCustomizationUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('nw-auth-token');
      const res = await fetch('/api/orders/upload-customization', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload customization image');
      }

      setCustomizationUploadedUrl(data.url);
      setToast({ type: 'success', message: 'Customization reference image attached! ✨' });
    } catch (err) {
      setCustomizationFileError(err.message || 'Failed to upload image.');
    } finally {
      setCustomizationUploading(false);
    }
  };

  const handleRemoveCustomizationImage = () => {
    if (customizationPreviewUrl) {
      URL.revokeObjectURL(customizationPreviewUrl);
    }
    setCustomizationPreviewUrl('');
    setCustomizationUploadedUrl('');
    setCustomizationFileError('');
  };

  // Live Calculations
  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
  }, [selectedItems]);

  const giftWrapCharge = isGift && giftWrap ? 20 : 0;
  const couponDiscount = appliedCoupon?.discount || 0;
  const shippingCharge = calculatedShippingCharge;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + shippingCharge + giftWrapCharge;

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCodeInput.trim().toUpperCase(),
          items: selectedItems.map((i) => ({ id: i.productId, qty: i.qty, selectedOptions: i.selectedParameters }))
        })
      });
      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError('');
        setToast({ type: 'success', message: `✓ Coupon ${res.code} applied! (-${money(res.discount)})` });
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid coupon code.');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
    setToast({ type: 'info', message: 'Coupon removed.' });
  };

  // Proceed to Step 2: Review
  const handleProceedToReview = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (isGift) {
      if (!recipientName.trim()) return setError('Please enter the Gift Recipient full name.');
      if (!recipientPhone.trim() || recipientPhone.trim().length !== 10) {
        return setError('Please enter a valid 10-digit mobile number for the Gift Recipient.');
      }
      if (!form.name.trim()) return setError('Please enter the Buyer / Sender full name.');
      if (!form.phone.trim() || form.phone.trim().length !== 10) {
        return setError('Please enter a valid 10-digit mobile number for the Buyer / Sender.');
      }
    } else {
      if (!form.name.trim()) return setError('Customer full name is required.');
      if (!form.phone.trim() || form.phone.trim().length !== 10) {
        return setError('A valid 10-digit mobile number is required.');
      }
    }

    if (!form.email.trim() || !form.email.includes('@')) {
      return setError('A valid email address is required.');
    }
    if (!form.address.trim()) return setError('Delivery address is required.');
    if (!form.pincode.trim() || !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      return setError('A valid 6-digit delivery PIN code is required.');
    }
    if (!selectedItems.length) {
      return setError('Please add at least one product item to the order.');
    }

    if (paymentStatus === 'verified' && !transactionId.trim()) {
      return setError('Transaction ID / UTR is required when payment status is marked as Verified.');
    }

    setCurrentStep('review');
  };

  // Final Order Creation
  const handleFinalOrderSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const cleanCustomDetails = (hasCustomization && customizationDetails.trim())
        ? customizationDetails.trim().slice(0, 2000)
        : null;

      const payload = {
        userId: selectedCustomer?.userId || null,
        name: isGift ? recipientName.trim() : form.name.trim(),
        phone: isGift ? recipientPhone.trim() : form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim().toLowerCase(),
        recipientName: isGift ? recipientName.trim() : null,
        recipientPhone: isGift ? recipientPhone.trim() : null,
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        city: form.city || locationData?.city || '',
        state: form.state || locationData?.state || 'Maharashtra',
        shippingMethod: selectedShippingMethod,
        isGift: Boolean(isGift),
        giftWrap: isGift && Boolean(giftWrap),
        giftWrapCharge,
        handwrittenNote: (isGift && handwrittenNoteEnabled && handwrittenNote.trim())
          ? handwrittenNote.trim().slice(0, 1000)
          : null,
        customizationDetails: cleanCustomDetails,
        customizationImage: (hasCustomization && customizationUploadedUrl) ? customizationUploadedUrl : null,
        customization: hasCustomization ? {
          requested: true,
          details: cleanCustomDetails,
          referenceImage: customizationUploadedUrl || null,
          requestedAt: new Date()
        } : { requested: false },
        items: selectedItems.map((item) => ({
          id: item.productId,
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          selectedParameters: item.selectedParameters || {},
          selectedOptions: item.selectedOptions || item.selectedParameters || {}
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod: 'upi',
        paymentStatus,
        orderStatus: orderStatus || (paymentStatus === 'verified' ? 'confirmed' : 'placed'),
        transactionId: (paymentStatus === 'verified' || paymentStatus === 'paid') ? transactionId.trim() : null,
        paymentApp: (paymentStatus === 'verified' || paymentStatus === 'paid') ? paymentApp : null,
        adminNotes: form.adminNotes.trim() || 'Manual Order Created by Admin'
      };

      const result = await api('/admin/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.ok && result.order) {
        if (onOrderCreated) {
          onOrderCreated(result.order);
        }
        setToast({
          type: 'success',
          message: `✓ Order #${result.order.order_no || result.order.orderNo} created successfully!`
        });
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create order.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create order. Please try again.');
      setCurrentStep('configure');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="adminOrderModalOverlay" onClick={onClose}>
      <div
        className="adminOrderModalDialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminModalHeading"
      >
        {/* ============================================================ */}
        {/* 1. TOP HEADER (BRANDED, LUXURY MAROON & GOLD)                 */}
        {/* ============================================================ */}
        <header className="adminOrderModalHeader">
          <div className="adminModalHeaderLeft">
            <div className="adminModalIconBadge">
              <PackagePlus size={20} />
            </div>
            <div className="adminModalTitleGroup">
              <h2 id="adminModalHeading" className="adminModalMainTitle">Create Customer Order</h2>
              <span className="adminModalSubtitle">Admin order desk synchronized with live customer catalog & pricing</span>
            </div>
          </div>

          <div className="adminModalStepPillTrack">
            <button
              type="button"
              className={`stepPillButton ${currentStep === 'configure' ? 'active' : ''}`}
              onClick={() => setCurrentStep('configure')}
            >
              <span className="stepNum">1</span>
              <span className="stepLabel">Order Details & Products</span>
            </button>
            <ChevronRight size={14} className="stepArrowIcon" />
            <button
              type="button"
              className={`stepPillButton ${currentStep === 'review' ? 'active' : ''}`}
              onClick={handleProceedToReview}
              disabled={selectedItems.length === 0}
            >
              <span className="stepNum">2</span>
              <span className="stepLabel">Review & Confirm</span>
            </button>
          </div>

          <button
            type="button"
            className="adminModalCloseButton"
            onClick={onClose}
            aria-label="Close Create Order Window"
          >
            <X size={18} />
          </button>
        </header>

        {/* ERROR NOTIFICATION BANNER */}
        {error && (
          <div className="adminModalErrorBanner">
            <AlertCircle size={18} className="errorBannerIcon" />
            <div className="errorBannerText">{error}</div>
            <button type="button" className="errorDismissBtn" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. STEP 1: CONFIGURE ORDER BODY                              */}
        {/* ============================================================ */}
        {currentStep === 'configure' && (
          <div className="adminModalScrollBody">
            <div className="adminOrderTwoColGrid">
              
              {/* -------------------------------------------------------- */}
              {/* LEFT COLUMN: CUSTOMER, ADDRESS, GIFTING & CUSTOMIZATION  */}
              {/* -------------------------------------------------------- */}
              <div className="adminOrderGridCol">
                
                {/* 1. CUSTOMER PROFILE & CONTACT */}
                <section className="adminCardSection">
                  <div className="adminCardSectionHeader">
                    <div className="sectionIconCircle">
                      <User size={15} />
                    </div>
                    <div className="sectionHeaderTitles">
                      <h3>Customer & Contact Details</h3>
                      <p>Search existing buyer records or enter new customer information</p>
                    </div>
                  </div>

                  {/* Customer Auto-Search */}
                  <div className="customerSearchBlock" ref={customerSearchRef}>
                    <label className="adminFieldLabel">Search Existing Customer (DB)</label>
                    <div className="customerSearchInputWrap">
                      <Search size={15} className="searchIconPosition" />
                      <input
                        type="text"
                        placeholder="Search by Name, 10-Digit Mobile, or Email..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          if (selectedCustomer) setSelectedCustomer(null);
                        }}
                        className="adminInput customSearchField"
                        autoComplete="off"
                      />
                      {searchingCustomers && <Loader2 size={15} className="spinAnimation searchSpinPosition" />}
                      {selectedCustomer && (
                        <button
                          type="button"
                          className="clearSelectedCustomerBtn"
                          onClick={handleClearCustomer}
                          title="Clear customer selection"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Search Dropdown Results */}
                    {showCustomerDropdown && customerSearchResults.length > 0 && (
                      <div className="customerDropdownPopover">
                        <div className="dropdownHeaderTitle">Matching Customers ({customerSearchResults.length})</div>
                        {customerSearchResults.map((cust) => (
                          <div
                            key={cust.userId || cust.email || cust.phone}
                            className="customerSearchResultRow"
                            onClick={() => handleSelectCustomer(cust)}
                          >
                            <div className="customerAvatar">
                              {(cust.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="customerResultInfo">
                              <span className="customerNameText">{cust.name}</span>
                              <span className="customerContactText">{cust.phone || 'No Phone'} · {cust.email || 'No Email'}</span>
                            </div>
                            <span className={`customerTypeTag ${cust.source}`}>
                              {cust.source === 'registered' ? 'Registered' : 'Past Buyer'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Inputs Form */}
                  <div className="adminFormFieldsStack">
                    <div className="adminFieldGroup">
                      <label className="adminFieldLabel">
                        Customer / Buyer Full Name <span className="reqStar">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Priya Deshmukh"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="adminInput"
                      />
                    </div>

                    <div className="adminInputTwoColRow">
                      <div className="adminFieldGroup">
                        <label className="adminFieldLabel">
                          10-Digit Mobile <span className="reqStar">*</span>
                        </label>
                        <input
                          required
                          inputMode="tel"
                          maxLength="10"
                          placeholder="98XXXXXXXX"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className="adminInput"
                        />
                      </div>

                      <div className="adminFieldGroup">
                        <label className="adminFieldLabel">
                          Email Address <span className="reqStar">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="customer@email.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="adminInput"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Saved Addresses quick-select */}
                  {selectedCustomer && (
                    <div className="savedAddressesChipBox">
                      <span className="savedAddressesHeading">Quick-fill from Saved Addresses:</span>
                      <div className="savedAddressChipsRow">
                        {selectedCustomer.defaultAddress && (
                          <button
                            type="button"
                            className="savedAddressPillBtn"
                            onClick={() => handleUseSavedAddress(selectedCustomer.defaultAddress)}
                          >
                            🏠 <b>Default:</b> {selectedCustomer.defaultAddress.city || selectedCustomer.defaultAddress.addressLine1?.slice(0, 20)}
                          </button>
                        )}
                        {Array.isArray(selectedCustomer.giftAddresses) && selectedCustomer.giftAddresses.map((ga, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="savedAddressPillBtn"
                            onClick={() => handleUseSavedAddress(ga)}
                          >
                            🎁 <b>Gift #{idx + 1}:</b> {ga.recipient_name || ga.recipientName || ga.city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* 2. DELIVERY DESTINATION & SHIPPING CALCULATION */}
                <section className="adminCardSection">
                  <div className="adminCardSectionHeader">
                    <div className="sectionIconCircle">
                      <MapPin size={15} />
                    </div>
                    <div className="sectionHeaderTitles">
                      <h3>Delivery Address & Dynamic Shipping</h3>
                      <p>Accurate delivery destination with real-time PIN validation</p>
                    </div>
                  </div>

                  <div className="adminFieldGroup">
                    <label className="adminFieldLabel">
                      {isGift ? "Recipient's Complete Delivery Address" : "Delivery Address"} <span className="reqStar">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Flat / House No, Building, Street, Area, Landmark"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="adminTextarea"
                      rows={2}
                    />
                  </div>

                  <div className="adminInputTwoColRow">
                    <div className="adminFieldGroup">
                      <label className="adminFieldLabel">
                        6-Digit Delivery PIN <span className="reqStar">*</span>
                      </label>
                      <div className="pinFieldContainer">
                        <input
                          required
                          inputMode="numeric"
                          maxLength="6"
                          placeholder="e.g. 410203 or 411001"
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="adminInput pinInputField"
                        />
                        {pincodeLoading && <Loader2 size={16} className="spinAnimation pinSpinPosition" />}
                      </div>
                      {pincodeError && <span className="adminFieldInlineError">{pincodeError}</span>}
                    </div>

                    <div className="adminFieldGroup">
                      <label className="adminFieldLabel">City & State (Autofilled)</label>
                      <input
                        type="text"
                        placeholder="City, State"
                        value={`${form.city || ''}${form.city && form.state ? ', ' : ''}${form.state || ''}`}
                        readOnly
                        className="adminInput readonlyField"
                      />
                    </div>
                  </div>

                  {locationData && (
                    <div className="locationVerifiedPill">
                      <CheckCircle2 size={14} className="verifiedCheckIcon" />
                      <span>
                        Verified: <b>{locationData.city}</b>, {locationData.state}
                        {locationData.location_type === 'khopoli' && (
                          <span className="studioTag">✦ Khopoli Studio (Free Delivery)</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Shipping Method Selector */}
                  <div className="adminFieldGroup">
                    <label className="adminFieldLabel">Shipping Method <span className="reqStar">*</span></label>
                    {locationData && Array.isArray(locationData.options) ? (
                      <div className="shippingOptionsGrid">
                        {locationData.options.map((opt) => {
                          const isSelected = selectedShippingMethod === opt.name || selectedShippingMethod === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`shippingRadioCard ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectShippingOption(opt)}
                            >
                              <div className="shippingRadioCircle">
                                {isSelected && <div className="shippingRadioDot" />}
                              </div>
                              <div className="shippingRadioInfo">
                                <span className="shippingRadioTitle">{opt.name}</span>
                                <span className="shippingRadioPrice">
                                  {opt.charge === 0 ? 'FREE' : money(opt.charge)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="pinPromptBox">
                        <Truck size={16} />
                        <span>Enter a valid 6-digit delivery PIN code to calculate shipping methods & rates.</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. GIFT OPTIONS (COLLAPSIBLE ACCORDION) */}
                <section className={`adminCardSection collapsibleCard ${isGift ? 'activeGiftCard' : ''}`}>
                  <div className="cardAccordionHeader" onClick={() => setIsGift(!isGift)}>
                    <div className="accordionHeaderLeft">
                      <div className="sectionIconCircle giftIconCircle">
                        <Gift size={15} />
                      </div>
                      <div className="sectionHeaderTitles">
                        <h3>This is a Gift Order</h3>
                        <p>Ship directly to recipient with calligraphy gift note & luxury wrap</p>
                      </div>
                    </div>
                    <label className="adminCustomToggle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isGift}
                        onChange={(e) => setIsGift(e.target.checked)}
                      />
                      <span className="toggleSlider round" />
                    </label>
                  </div>

                  {isGift && (
                    <div className="accordionBodyContainer">
                      <div className="adminInputTwoColRow">
                        <div className="adminFieldGroup">
                          <label className="adminFieldLabel">Recipient Full Name <span className="reqStar">*</span></label>
                          <input
                            required={isGift}
                            type="text"
                            placeholder="e.g. Ananya Kulkarni"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="adminInput"
                          />
                        </div>
                        <div className="adminFieldGroup">
                          <label className="adminFieldLabel">Recipient 10-Digit Mobile <span className="reqStar">*</span></label>
                          <input
                            required={isGift}
                            inputMode="tel"
                            maxLength="10"
                            placeholder="98XXXXXXXX"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="adminInput"
                          />
                        </div>
                      </div>

                      {/* Handwritten Note */}
                      <div className="giftSubOptionCard">
                        <label className="checkboxLabelRow">
                          <input
                            type="checkbox"
                            checked={handwrittenNoteEnabled}
                            onChange={(e) => setHandwrittenNoteEnabled(e.target.checked)}
                          />
                          <span className="checkboxLabelTitle">✍️ Handwritten Personal Gift Note (Parchment Card)</span>
                        </label>
                        {handwrittenNoteEnabled && (
                          <textarea
                            placeholder="Enter the personal message our calligrapher will handwrite on the luxury gift card..."
                            value={handwrittenNote}
                            onChange={(e) => setHandwrittenNote(e.target.value)}
                            className="adminTextarea"
                            rows={2}
                            maxLength={1000}
                          />
                        )}
                      </div>

                      {/* Luxury Gift Wrap (+₹20) */}
                      <div className="giftSubOptionCard giftWrapHighlight">
                        <label className="checkboxLabelRow">
                          <input
                            type="checkbox"
                            checked={giftWrap}
                            onChange={(e) => setGiftWrap(e.target.checked)}
                          />
                          <div className="checkboxTitleWithBadge">
                            <span className="checkboxLabelTitle">🎀 Luxury Gift Wrap (+₹20)</span>
                            <span className="giftWrapBadgeText">Silk ribbon & gold foil branded keepsake box</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </section>

                {/* 4. JEWELLERY CUSTOMIZATION & ARTISAN INSTRUCTIONS */}
                <section className={`adminCardSection collapsibleCard ${hasCustomization ? 'activeCustomCard' : ''}`}>
                  <div className="cardAccordionHeader" onClick={() => setHasCustomization(!hasCustomization)}>
                    <div className="accordionHeaderLeft">
                      <div className="sectionIconCircle customIconCircle">
                        <Sparkles size={15} />
                      </div>
                      <div className="sectionHeaderTitles">
                        <h3>Jewellery Customization & Artisan Notes</h3>
                        <p>Special dimensions, custom engraving, or photo reference for the workshop</p>
                      </div>
                    </div>
                    <label className="adminCustomToggle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={hasCustomization}
                        onChange={(e) => setHasCustomization(e.target.checked)}
                      />
                      <span className="toggleSlider round" />
                    </label>
                  </div>

                  {hasCustomization && (
                    <div className="accordionBodyContainer">
                      <div className="adminFieldGroup">
                        <label className="adminFieldLabel">Artisan Customization Instructions</label>
                        <textarea
                          placeholder="e.g. Please craft with 24-inch chain length, antique matte finish, custom hook..."
                          value={customizationDetails}
                          onChange={(e) => setCustomizationDetails(e.target.value)}
                          className="adminTextarea"
                          rows={2}
                          maxLength={2000}
                        />
                      </div>

                      {/* Photo Attachment */}
                      <div className="customImageUploadRow">
                        <label className="adminFieldLabel">Reference Photo / Design Sketch (Optional)</label>
                        <div className="uploadControlFlex">
                          <input
                            type="file"
                            id="adminCreateOrderCustomImg"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleCustomizationImageUpload}
                            disabled={customizationUploading}
                          />
                          <label htmlFor="adminCreateOrderCustomImg" className="adminUploadActionBtn">
                            {customizationUploading ? <Loader2 size={14} className="spinAnimation" /> : <Upload size={14} />}
                            <span>{customizationUploading ? 'Uploading Image…' : 'Attach Reference Photo'}</span>
                          </label>

                          {customizationPreviewUrl && (
                            <div className="attachedPhotoBadge">
                              <img src={customizationPreviewUrl} alt="Customization Preview" className="attachedThumbImg" />
                              <span className="attachedThumbLabel">Reference Attached</span>
                              <button
                                type="button"
                                className="removeAttachedImgBtn"
                                onClick={handleRemoveCustomizationImage}
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        {customizationFileError && <span className="adminFieldInlineError">{customizationFileError}</span>}
                      </div>
                    </div>
                  )}
                </section>

              </div>

              {/* -------------------------------------------------------- */}
              {/* RIGHT COLUMN: PRODUCTS LIST, PICKER, COUPONS & SUMMARY    */}
              {/* -------------------------------------------------------- */}
              <div className="adminOrderGridCol">
                
                {/* 5. ORDER PRODUCTS LIST & DYNAMIC CONFIGURATOR */}
                <section className="adminCardSection orderItemsMainSection">
                  <div className="adminCardSectionHeader productSectionHeaderRow">
                    <div className="productHeaderLeftBox">
                      <div className="sectionIconCircle">
                        <ShoppingBag size={15} />
                      </div>
                      <div className="sectionHeaderTitles">
                        <h3>Order Products ({selectedItems.length})</h3>
                        <p>Select catalog items and configure dynamic options</p>
                      </div>
                    </div>

                    {!showProductPicker && (
                      <button
                        type="button"
                        className="adminAddProductPillBtn"
                        onClick={() => {
                          setShowProductPicker(true);
                          setPickerSelectedProduct(null);
                        }}
                      >
                        <Plus size={15} />
                        <span>+ Add Product</span>
                      </button>
                    )}
                  </div>

                  {/* PRODUCT PICKER & CONFIGURATOR CARD (When "+ Add Product" is active) */}
                  {showProductPicker && (
                    <div className="productPickerSubCard">
                      <div className="pickerSubCardHeader">
                        <div className="pickerHeaderTitleGroup">
                          <Layers size={15} className="goldTextIcon" />
                          <h4>Select & Configure Jewellery</h4>
                        </div>
                        <button
                          type="button"
                          className="pickerCloseIconBtn"
                          onClick={() => {
                            setShowProductPicker(false);
                            setPickerSelectedProduct(null);
                          }}
                          title="Close product picker"
                        >
                          ✕
                        </button>
                      </div>

                      {/* 1. If NO product is currently picked, show the Search & Catalog Browser List */}
                      {!pickerSelectedProduct ? (
                        <div className="pickerCatalogSearchStack">
                          {/* Search Bar */}
                          <div className="pickerSearchInputWrapper">
                            <Search size={14} className="pickerSearchIcon" />
                            <input
                              type="text"
                              placeholder="Search catalog by name, code, category..."
                              value={productSearchQuery}
                              onChange={(e) => setProductSearchQuery(e.target.value)}
                              className="adminInput pickerSearchField"
                              autoFocus
                            />
                            {productSearchQuery && (
                              <button
                                type="button"
                                className="pickerSearchClearBtn"
                                onClick={() => setProductSearchQuery('')}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Category Filter Chips */}
                          {catalogCategories.length > 0 && (
                            <div className="pickerCategoryChipsScroll">
                              <button
                                type="button"
                                className={`categoryFilterChip ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCategoryFilter('all')}
                              >
                                All ({catalogProducts.length})
                              </button>
                              {catalogCategories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  className={`categoryFilterChip ${selectedCategoryFilter === cat ? 'active' : ''}`}
                                  onClick={() => setSelectedCategoryFilter(cat)}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Visual Product Cards Selection List */}
                          <div className="pickerProductCardsScrollList">
                            {filteredCatalogProducts.length > 0 ? (
                              filteredCatalogProducts.map((p) => {
                                const isOOS = p.stock === 0;
                                return (
                                  <div
                                    key={p.id || p._id}
                                    className={`pickerCatalogItemCard ${isOOS ? 'isOutOfStockCard' : ''}`}
                                    onClick={() => !isOOS && handleSelectProductForPicker(p)}
                                  >
                                    <img
                                      src={p.img || (Array.isArray(p.images) ? p.images[0] : '/assets/thushi.jpg')}
                                      alt={p.name}
                                      className="catalogItemThumb"
                                    />
                                    <div className="catalogItemMeta">
                                      <span className="catalogItemTitle">{p.name}</span>
                                      <div className="catalogItemPriceRow">
                                        <span className="catalogItemPrice">{money(p.price)}</span>
                                        {p.category && <span className="catalogItemCategoryTag">{p.category}</span>}
                                      </div>
                                    </div>
                                    <div className="catalogItemStockCol">
                                      <span className={`stockIndicatorTag ${isOOS ? 'outOfStock' : (p.stock < 3 ? 'lowStock' : 'inStock')}`}>
                                        {isOOS ? 'Out of Stock' : (p.stock !== undefined ? `${p.stock} in stock` : 'In Stock')}
                                      </span>
                                      <button
                                        type="button"
                                        className="selectProductActionBtn"
                                        disabled={isOOS}
                                        tabIndex={-1}
                                      >
                                        Select →
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="pickerNoResultsNotice">
                                <Search size={20} />
                                <span>No jewellery items found matching "{productSearchQuery}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* 2. When a product is selected, show its configuration options and add button */
                        <div className="pickerActiveProductBox">
                          {/* Top Product Bar with "Change" button */}
                          <div className="pickerProductHeroRow">
                            <img
                              src={pickerSelectedProduct.img || (Array.isArray(pickerSelectedProduct.images) ? pickerSelectedProduct.images[0] : '/assets/thushi.jpg')}
                              alt={pickerSelectedProduct.name}
                              className="pickerHeroThumb"
                            />
                            <div className="pickerHeroMeta">
                              <h5 className="pickerHeroTitle">{pickerSelectedProduct.name}</h5>
                              <div className="pickerHeroPriceRow">
                                <span className="pickerHeroPrice">{money(pickerSelectedProduct.price)}</span>
                                <span className={`pickerStockBadge ${pickerSelectedProduct.stock > 0 ? 'inStock' : 'outOfStock'}`}>
                                  {pickerSelectedProduct.stock > 0 ? `Stock: ${pickerSelectedProduct.stock} units` : 'Out of Stock'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="changeProductBackBtn"
                              onClick={() => setPickerSelectedProduct(null)}
                              title="Choose a different product"
                            >
                              <RotateCcw size={12} />
                              <span>Change</span>
                            </button>
                          </div>

                          {/* Dynamic Parameters (Buttons, Dropdown, Swatches, Engraving Text) */}
                          {pickerProductParameters.length > 0 && (
                            <div className="pickerParamsContainer">
                              <span className="paramsContainerTitle">Product Options & Parameters:</span>
                              
                              {pickerProductParameters.map((param) => {
                                const paramValues = Array.isArray(param.selectedValues) && param.selectedValues.length > 0
                                  ? param.selectedValues
                                  : Array.isArray(param.values) ? param.values : [];
                                const isText = param.displayType === 'text' || param.displayType === 'textbox';
                                if (!isText && paramValues.length === 0) return null;

                                const isError = Boolean(pickerParamErrors[param.name]);
                                const currentVal = pickerSelectedParams[param.name];

                                return (
                                  <div key={param.name} className={`paramOptionCard ${isError ? 'paramHasError' : ''}`}>
                                    <div className="paramCardHeaderRow">
                                      <span className="paramNameText">
                                        {param.name}{param.required && <span className="reqStar">*</span>}:
                                      </span>
                                      {currentVal && <span className="paramActiveValText">{currentVal}</span>}
                                    </div>

                                    {/* Text / Engraving */}
                                    {isText ? (
                                      <div className="paramCustomTextWrap">
                                        <Type size={14} className="paramTypeIcon" />
                                        <input
                                          type="text"
                                          placeholder={paramValues[0]?.label && paramValues[0].label !== 'custom_text' ? paramValues[0].label : `Enter ${param.name} (e.g. Priya, Ananya)`}
                                          value={currentVal || ''}
                                          onChange={(e) => handleSelectPickerParam(param.name, e.target.value)}
                                          maxLength={45}
                                          className="adminInput paramCustomInput"
                                        />
                                        {currentVal && (
                                          <button
                                            type="button"
                                            className="clearCustomTextIconBtn"
                                            onClick={() => handleSelectPickerParam(param.name, '')}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ) : param.displayType === 'dropdown' ? (
                                      /* Dropdown Select */
                                      <select
                                        className="adminSelect paramSelectField"
                                        value={currentVal || ''}
                                        onChange={(e) => handleSelectPickerParam(param.name, e.target.value)}
                                      >
                                        <option value="" disabled>Select {param.name}</option>
                                        {paramValues.map((v) => (
                                          <option key={v.value || v.label} value={v.value || v.label} disabled={v.inStock === false}>
                                            {v.label}{v.inStock === false ? ' (Out of Stock)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    ) : param.displayType === 'color' ? (
                                      /* Color Swatches */
                                      <div className="paramColorSwatchesGrid">
                                        {paramValues.map((v) => {
                                          const valKey = v.value || v.label;
                                          const isSelected = currentVal === valKey;
                                          const isValOutOfStock = v.inStock === false;
                                          return (
                                            <button
                                              key={valKey}
                                              type="button"
                                              disabled={isValOutOfStock}
                                              className={`colorSwatchPillBtn ${isSelected ? 'selected' : ''} ${isValOutOfStock ? 'outOfStock' : ''}`}
                                              onClick={() => !isValOutOfStock && handleSelectPickerParam(param.name, valKey)}
                                              title={isValOutOfStock ? `${v.label} (Out of stock)` : v.label}
                                            >
                                              <span className="swatchColorCircle" style={{ backgroundColor: v.colorCode || '#b8860b' }} />
                                              <span>{v.label}</span>
                                              {isSelected && <Check size={12} />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      /* Default Pill Buttons */
                                      <div className="paramOptionPillsFlex">
                                        {paramValues.map((v) => {
                                          const valKey = v.value || v.label;
                                          const isSelected = currentVal === valKey;
                                          const isValOutOfStock = v.inStock === false;
                                          return (
                                            <button
                                              key={valKey}
                                              type="button"
                                              disabled={isValOutOfStock}
                                              className={`paramPillButton ${isSelected ? 'selected' : ''} ${isValOutOfStock ? 'outOfStock' : ''}`}
                                              onClick={() => !isValOutOfStock && handleSelectPickerParam(param.name, valKey)}
                                              title={isValOutOfStock ? `${v.label} (Out of stock)` : v.label}
                                            >
                                              <span>{v.label}</span>
                                              {isValOutOfStock && <small>(OOS)</small>}
                                              {isSelected && <Check size={12} />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {isError && <span className="adminFieldInlineError">{pickerParamErrors[param.name]}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quantity & Confirm Add Button */}
                          <div className="pickerConfirmFooterRow">
                            <div className="pickerQtyControlGroup">
                              <span className="qtyLabelText">Quantity:</span>
                              <div className="qtyStepperBox">
                                <button
                                  type="button"
                                  className="stepperActionBtn"
                                  onClick={() => setPickerQty((q) => Math.max(1, q - 1))}
                                  disabled={pickerQty <= 1}
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="stepperValueNum">{pickerQty}</span>
                                <button
                                  type="button"
                                  className="stepperActionBtn"
                                  onClick={() => setPickerQty((q) => Math.min(pickerSelectedProduct.stock || 10, q + 1))}
                                  disabled={pickerQty >= (pickerSelectedProduct.stock || 10)}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="adminGoldPrimaryBtn addProductConfirmBtn"
                              onClick={handleAddProductToOrder}
                              disabled={pickerSelectedProduct.stock <= 0}
                            >
                              <Plus size={15} />
                              <span>Add to Order · {money((pickerSelectedProduct.price || 0) * pickerQty)}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SELECTED ORDER ITEMS LIST */}
                  {selectedItems.length > 0 ? (
                    <div className="selectedItemsScrollContainer">
                      {selectedItems.map((item, idx) => {
                        const paramEntries = getParameterEntries(item.selectedParameters);
                        return (
                          <div key={idx} className="selectedItemCardRow">
                            <img src={item.img || '/assets/thushi.jpg'} alt={item.name} className="selectedItemThumb" />
                            
                            <div className="selectedItemMainInfo">
                              <span className="selectedItemTitle">{item.name}</span>
                              <span className="selectedItemPriceUnit">{money(item.price)} each</span>

                              {/* Formatted Parameter Badges */}
                              {paramEntries.length > 0 && (
                                <div className="selectedItemParamsList">
                                  {paramEntries.map((pe, pidx) => (
                                    <span key={pidx} className={`paramBadgePill ${pe.isCustom ? 'customTextBadge' : ''}`}>
                                      {pe.name}: <b>{pe.value}</b>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Qty Stepper Controls */}
                            <div className="selectedItemQtyStepper">
                              <button
                                type="button"
                                className="itemStepBtn"
                                onClick={() => handleUpdateItemQty(idx, item.qty - 1)}
                                disabled={item.qty <= 1}
                              >
                                -
                              </button>
                              <span className="itemQtyText">{item.qty}</span>
                              <button
                                type="button"
                                className="itemStepBtn"
                                onClick={() => handleUpdateItemQty(idx, item.qty + 1)}
                                disabled={item.qty >= (item.stock || 10)}
                              >
                                +
                              </button>
                            </div>

                            <span className="selectedItemTotal">{money((item.price || 0) * item.qty)}</span>

                            <button
                              type="button"
                              className="itemDeleteIconBtn"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove item from order"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* CLEAN EMPTY STATE WHEN NO PRODUCTS ADDED YET */
                    !showProductPicker && (
                      <div className="emptyOrderItemsCard">
                        <div className="emptyIconCircle">
                          <ShoppingBag size={24} />
                        </div>
                        <h4>No Products Added to Order</h4>
                        <p>This order currently has no items. Click below to choose and configure jewellery pieces.</p>
                        <button
                          type="button"
                          className="adminGoldPrimaryBtn emptyAddBtn"
                          onClick={() => {
                            setShowProductPicker(true);
                            setPickerSelectedProduct(null);
                          }}
                        >
                          <Plus size={15} />
                          <span>+ Add First Product</span>
                        </button>
                      </div>
                    )
                  )}
                </section>

                {/* 6. PROMO CODE / COUPONS */}
                <section className="adminCardSection">
                  <div className="adminCardSectionHeader">
                    <div className="sectionIconCircle">
                      <Tag size={15} />
                    </div>
                    <div className="sectionHeaderTitles">
                      <h3>Promo Code & Discounts</h3>
                      <p>Apply customer discount vouchers or studio promotional codes</p>
                    </div>
                  </div>

                  <div className="couponInputRow">
                    <input
                      type="text"
                      placeholder="e.g. FESTIVE10 or NATHSHIKHA500"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.replace(/\s+/g, '').toUpperCase())}
                      className="adminInput couponInputField"
                      disabled={Boolean(appliedCoupon)}
                    />
                    {appliedCoupon ? (
                      <button type="button" className="adminOutlineBtn dangerOutline" onClick={handleRemoveCoupon}>
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adminGoldPrimaryBtn couponApplyBtn"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCodeInput.trim() || selectedItems.length === 0}
                      >
                        {couponLoading ? <Loader2 size={14} className="spinAnimation" /> : 'Apply'}
                      </button>
                    )}
                  </div>
                  {couponError && <span className="adminFieldInlineError">{couponError}</span>}
                  {appliedCoupon && (
                    <div className="couponSuccessPill">
                      <CheckCircle2 size={13} />
                      <span>Coupon <b>{appliedCoupon.code}</b> applied: <b>-{money(appliedCoupon.discount)}</b></span>
                    </div>
                  )}
                </section>

                {/* 7. INITIAL PAYMENT & LIFECYCLE CONTROLS */}
                <section className="adminCardSection">
                  <div className="adminCardSectionHeader">
                    <div className="sectionIconCircle">
                      <CreditCard size={15} />
                    </div>
                    <div className="sectionHeaderTitles">
                      <h3>Payment & Order Lifecycle</h3>
                      <p>Set verification status, transaction reference, and starting stage</p>
                    </div>
                  </div>

                  <div className="adminInputTwoColRow">
                    <div className="adminFieldGroup">
                      <label className="adminFieldLabel">Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => {
                          const next = e.target.value;
                          setPaymentStatus(next);
                          if (next === 'verified' && orderStatus === 'placed') {
                            setOrderStatus('confirmed');
                          }
                        }}
                        className="adminSelect"
                      >
                        <option value="verification_pending">Pending Verification</option>
                        <option value="pending">Payment Pending</option>
                        <option value="verified">Verified (Already Paid)</option>
                      </select>
                    </div>

                    <div className="adminFieldGroup">
                      <label className="adminFieldLabel">Order Lifecycle Stage</label>
                      <select
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                        className="adminSelect"
                      >
                        <option value="placed">Order Received</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="making">Artisan Making</option>
                        <option value="packing">QC & Packaging</option>
                        <option value="shipped">Dispatched</option>
                      </select>
                    </div>
                  </div>

                  {/* If Verified / Paid, prompt for UTR & App */}
                  {(paymentStatus === 'verified' || paymentStatus === 'paid') && (
                    <div className="verifiedPaymentInputsCard">
                      <div className="adminInputTwoColRow">
                        <div className="adminFieldGroup">
                          <label className="adminFieldLabel">
                            Transaction UTR / Ref <span className="reqStar">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. 429876543210"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="adminInput"
                          />
                        </div>

                        <div className="adminFieldGroup">
                          <label className="adminFieldLabel">Payment App</label>
                          <select
                            value={paymentApp}
                            onChange={(e) => setPaymentApp(e.target.value)}
                            className="adminSelect"
                          >
                            {PAYMENT_APP_OPTIONS.map((app) => (
                              <option key={app} value={app}>{app}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="adminFieldGroup">
                    <label className="adminFieldLabel">Admin Internal Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Order placed via WhatsApp consultation"
                      value={form.adminNotes}
                      onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
                      className="adminInput"
                    />
                  </div>
                </section>

                {/* 8. LIVE FINANCIAL SUMMARY CARD */}
                <div className="adminLivePricingCard">
                  <div className="pricingLineRow">
                    <span>Subtotal ({selectedItems.reduce((acc, i) => acc + i.qty, 0)} items):</span>
                    <b>{money(subtotal)}</b>
                  </div>
                  {appliedCoupon && (
                    <div className="pricingLineRow discountHighlightRow">
                      <span>Coupon Discount ({appliedCoupon.code}):</span>
                      <b>-{money(appliedCoupon.discount)}</b>
                    </div>
                  )}
                  <div className="pricingLineRow">
                    <span>Shipping ({selectedShippingMethod}):</span>
                    <b>{shippingCharge === 0 ? 'FREE' : money(shippingCharge)}</b>
                  </div>
                  {isGift && giftWrap && (
                    <div className="pricingLineRow">
                      <span>Luxury Gift Wrap:</span>
                      <b>+{money(giftWrapCharge)}</b>
                    </div>
                  )}
                  <div className="pricingDividerLine" />
                  <div className="pricingLineRow grandTotalHighlightRow">
                    <span>Order Total:</span>
                    <b className="grandTotalMaroonVal">{money(grandTotal)}</b>
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="adminModalFooterActionBar">
                  <button type="button" className="adminCancelActionBtn" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="adminGoldPrimaryBtn proceedReviewActionBtn"
                    onClick={handleProceedToReview}
                    disabled={selectedItems.length === 0}
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. STEP 2: ORDER REVIEW & CONFIRMATION                       */}
        {/* ============================================================ */}
        {currentStep === 'review' && (
          <div className="adminReviewContainerScroll">
            <div className="reviewBannerPrompt">
              <ShieldCheck size={24} className="reviewShieldGoldIcon" />
              <div>
                <h4>Please Review Order Details Before Final Creation</h4>
                <p>Verify customer contact details, configured jewellery parameters, delivery address, and calculated totals.</p>
              </div>
            </div>

            <div className="reviewCardsTwoColGrid">
              {/* Card 1: Customer Profile & Recipient */}
              <div className="reviewSummaryCardBox">
                <div className="reviewSummaryCardHeader">
                  <User size={15} />
                  <h5>Customer & Contact</h5>
                </div>
                <div className="reviewSummaryCardBody">
                  <div className="reviewDataRow">
                    <span className="reviewDataLabel">Buyer Name:</span>
                    <strong className="reviewDataValue">{form.name}</strong>
                  </div>
                  <div className="reviewDataRow">
                    <span className="reviewDataLabel">Buyer Mobile:</span>
                    <span className="reviewDataValue">{form.phone}</span>
                  </div>
                  <div className="reviewDataRow">
                    <span className="reviewDataLabel">Buyer Email:</span>
                    <span className="reviewDataValue">{form.email}</span>
                  </div>

                  {isGift && (
                    <div className="reviewGiftCalloutBox">
                      <span className="giftBadgeTag">🎁 Gift Recipient:</span>
                      <p className="giftRecipientInfo"><b>{recipientName}</b> · {recipientPhone}</p>
                      {handwrittenNoteEnabled && handwrittenNote && (
                        <p className="giftNoteQuote">✍️ <i>"{handwrittenNote}"</i></p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Delivery Destination */}
              <div className="reviewSummaryCardBox">
                <div className="reviewSummaryCardHeader">
                  <Truck size={15} />
                  <h5>Delivery Destination</h5>
                </div>
                <div className="reviewSummaryCardBody">
                  <p className="reviewAddressParagraph">{form.address}</p>
                  <p className="reviewCityPincodeText">
                    <b>{form.city || locationData?.city}</b>, {form.state || locationData?.state} — <code>{form.pincode}</code>
                  </p>
                  <div className="reviewDataRow">
                    <span className="reviewDataLabel">Shipping Method:</span>
                    <span className="reviewDataValue">
                      <b>{selectedShippingMethod}</b> ({shippingCharge === 0 ? 'FREE' : money(shippingCharge)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="reviewTableContainerBox">
              <h5 className="reviewTableHeading">Itemized Breakdown ({selectedItems.length} Products)</h5>
              <div className="reviewTableScrollWrapper">
                <table className="reviewItemsTable">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Configured Parameters</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => {
                      const paramEntries = getParameterEntries(item.selectedParameters);
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="tableProductCellFlex">
                              <img src={item.img || '/assets/thushi.jpg'} alt={item.name} className="tableProdImg" />
                              <span className="tableProdName">{item.name}</span>
                            </div>
                          </td>
                          <td>
                            {paramEntries.length > 0 ? (
                              <div className="tableParamsBadgeFlex">
                                {paramEntries.map((pe, pidx) => (
                                  <span key={pidx} className="tableParamTag">
                                    {pe.name}: <b>{pe.value}</b>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="tableNoParamsText">— Standard</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}><b>{item.qty}</b></td>
                          <td style={{ textAlign: 'right' }}>{money(item.price)}</td>
                          <td style={{ textAlign: 'right' }}><b>{money((item.price || 0) * item.qty)}</b></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customization Details if any */}
            {hasCustomization && (
              <div className="reviewCustomizationCallout">
                <div className="customCalloutHeader">
                  <Sparkles size={15} color="#b8860b" />
                  <b>Artisan Customization Instructions:</b>
                </div>
                {customizationDetails && <p className="customCalloutDetails">{customizationDetails}</p>}
                {customizationPreviewUrl && (
                  <div className="customCalloutPhotoBadge">
                    <img src={customizationPreviewUrl} alt="Customization" />
                    <span>Reference Photo Attached</span>
                  </div>
                )}
              </div>
            )}

            {/* Financial Summary & Actions */}
            <div className="reviewFinalTotalsGrid">
              <div className="reviewStatusCard">
                <div className="reviewStatusItem">
                  <span>Payment Status:</span>
                  <b className={`paymentStatusBadgePill ${paymentStatus}`}>
                    {paymentStatus === 'verified' ? 'Verified (Already Paid)' : (paymentStatus === 'pending' ? 'Payment Pending' : 'Verification Pending')}
                  </b>
                </div>
                {paymentStatus === 'verified' && (
                  <div className="reviewStatusItem">
                    <span>Transaction UTR:</span>
                    <code>{transactionId || '—'}</code> ({paymentApp})
                  </div>
                )}
                <div className="reviewStatusItem">
                  <span>Order Lifecycle:</span>
                  <b>{formatOrderStatus(orderStatus)}</b>
                </div>
              </div>

              <div className="reviewFinancialSummaryCard">
                <div className="reviewSummaryLine">
                  <span>Items Subtotal:</span>
                  <b>{money(subtotal)}</b>
                </div>
                {appliedCoupon && (
                  <div className="reviewSummaryLine discountText">
                    <span>Coupon ({appliedCoupon.code}):</span>
                    <b>-{money(appliedCoupon.discount)}</b>
                  </div>
                )}
                <div className="reviewSummaryLine">
                  <span>Shipping ({selectedShippingMethod}):</span>
                  <b>{shippingCharge === 0 ? 'FREE' : money(shippingCharge)}</b>
                </div>
                {isGift && giftWrap && (
                  <div className="reviewSummaryLine">
                    <span>Luxury Gift Wrap:</span>
                    <b>+{money(giftWrapCharge)}</b>
                  </div>
                )}
                <div className="reviewSummaryDivider" />
                <div className="reviewSummaryLine grandTotalLine">
                  <span>Final Order Total:</span>
                  <b className="reviewGrandTotalVal">{money(grandTotal)}</b>
                </div>
              </div>
            </div>

            {/* Review Action Buttons */}
            <div className="reviewFooterActionBar">
              <button
                type="button"
                className="adminBackEditBtn"
                onClick={() => setCurrentStep('configure')}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                className="adminGoldPrimaryBtn finalSubmitCreateBtn"
                onClick={handleFinalOrderSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinAnimation" />
                    <span>CREATING ORDER & ALLOCATING INVENTORY…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>CONFIRM & CREATE ORDER · {money(grandTotal)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
