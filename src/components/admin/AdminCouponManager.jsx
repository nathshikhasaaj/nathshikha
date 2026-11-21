import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle,
  Percent,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles,
  Package,
  Users,
  UserCheck,
  Lock,
  Globe,
  Info,
  Filter,
  Copy,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './AdminCouponManager.css';

const defaultCouponForm = {
  code: '',
  couponType: 'general', // 'general', 'product_specific', 'bulk_quantity'
  applicableProductId: '',
  applicableProductName: '',
  minQuantity: 2,
  bulkPricingType: 'special_price', // 'special_price', 'discount'
  specialPerPiecePrice: '',
  bulkApplyTo: 'all_units', // 'all_units', 'excess_units'
  discountType: 'percent', // 'percent', 'fixed'
  discountValue: '',
  minOrderValue: 0,
  usageLimit: 50,
  expiryDate: '',
  isActive: true,
  customerEligibility: 'all', // 'all', 'existing_customers_only'
  isPublic: true,
  description: ''
};

// ============================================================================
// SEARCHABLE PRODUCT SELECTOR COMPONENT
// ============================================================================
function SearchableProductSelector({
  products = [],
  selectedProductId,
  selectedProductName,
  onSelect,
  onClear
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const searchInputRef = useRef(null);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p._id || p.id) === String(selectedProductId)) || null;
  }, [products, selectedProductId]);

  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || p.code || p.product_code || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      return nameMatch || skuMatch || catMatch;
    });
  }, [products, search, categoryFilter]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // If a product is selected and picker is closed, display the selected card
  if (selectedProductId && !isOpen) {
    const thumb = selectedProduct?.img || selectedProduct?.images?.[0];
    const name = selectedProduct?.name || selectedProductName || 'Selected Product';
    const price = selectedProduct?.price !== undefined ? selectedProduct.price : null;
    const sku = selectedProduct?.sku || selectedProduct?.code;
    const category = selectedProduct?.category;

    return (
      <div className="productSelectorWrapper">
        <div className="selectedProductCard">
          <div className="selectedProductThumb">
            {thumb ? (
              <img src={thumb} alt={name} loading="lazy" />
            ) : (
              <Sparkles size={18} className="thumbFallbackIcon" />
            )}
          </div>
          <div className="selectedProductDetails">
            <span className="selectedProductTitle">{name}</span>
            <div className="selectedProductMetaRow">
              {category && <span className="productMetaTag">{category}</span>}
              {sku && <span className="productMetaTag skuTag">SKU: {sku}</span>}
              {price !== null && (
                <span className="productMetaPrice">Regular: <b>₹{price}</b></span>
              )}
            </div>
          </div>
          <div className="selectedProductBtnGroup">
            <button
              type="button"
              className="btnChangeProduct"
              onClick={() => {
                setSearch('');
                setIsOpen(true);
              }}
            >
              Change
            </button>
            <button
              type="button"
              className="btnRemoveProduct"
              onClick={onClear}
              title="Remove target product"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Search and select mode
  return (
    <div className="productSelectorWrapper">
      <div className="productPickerPanel">
        {/* Search Header */}
        <div className="productPickerSearchRow">
          <div className="pickerSearchInputWrap">
            <Search size={15} className="pickerSearchIcon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product name, SKU or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pickerSearchField"
            />
            {search && (
              <button
                type="button"
                className="pickerClearSearchBtn"
                onClick={() => setSearch('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {selectedProductId && (
            <button
              type="button"
              className="pickerCancelBtn"
              onClick={() => setIsOpen(false)}
            >
              Keep Current
            </button>
          )}
        </div>

        {/* Category Pills (if available) */}
        {categories.length > 0 && (
          <div className="pickerCategoryPillList">
            <button
              type="button"
              className={`pickerCatPill ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Categories ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`pickerCatPill ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Products List */}
        <div className="pickerProductList">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const pId = String(p._id || p.id);
              const isCurrent = String(selectedProductId) === pId;
              const thumb = p.img || p.images?.[0];
              const sku = p.sku || p.code;

              return (
                <div
                  key={pId}
                  className={`pickerProductItem ${isCurrent ? 'selectedItem' : ''}`}
                  onClick={() => {
                    onSelect(p);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pickerItemThumb">
                    {thumb ? (
                      <img src={thumb} alt={p.name} loading="lazy" />
                    ) : (
                      <Sparkles size={14} className="thumbFallbackIcon" />
                    )}
                  </div>

                  <div className="pickerItemInfo">
                    <span className="pickerItemName">{p.name}</span>
                    <div className="pickerItemSubInfo">
                      {p.category && <span className="pickerItemCat">{p.category}</span>}
                      {sku && <span className="pickerItemSku">SKU: {sku}</span>}
                    </div>
                  </div>

                  <div className="pickerItemRight">
                    <b className="pickerItemPrice">₹{p.price}</b>
                    <span className={`pickerSelectBtn ${isCurrent ? 'isChosen' : ''}`}>
                      {isCurrent ? <Check size={14} /> : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pickerEmptyNotice">
              <Package size={22} />
              <span>No jewellery items found matching "{search}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ADMIN COUPON MANAGER COMPONENT
// ============================================================================
export default function AdminCouponManager({
  coupons = [],
  onRefresh,
  onCouponUpdated,
  setToast,
  products = []
}) {
  const notifyRefresh = () => {
    if (typeof onRefresh === 'function') onRefresh();
    if (typeof onCouponUpdated === 'function') onCouponUpdated();
  };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive, expired, limit_reached
  const [typeFilter, setTypeFilter] = useState('all'); // all, general, product_specific, bulk_quantity

  // Product catalogue state with fallback fetch
  const [availableProducts, setAvailableProducts] = useState(Array.isArray(products) ? products : []);

  useEffect(() => {
    if (products && products.length > 0) {
      setAvailableProducts(products);
    } else {
      api('/products')
        .then((res) => {
          if (Array.isArray(res)) setAvailableProducts(res);
          else if (res?.products && Array.isArray(res.products)) setAvailableProducts(res.products);
        })
        .catch(() => {});
    }
  }, [products]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const [form, setForm] = useState(defaultCouponForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Format Expiry Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get input-ready date string (YYYY-MM-DD)
  const getInputDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // Quick Copy Code Handler
  const handleCopyCode = (code, e) => {
    e?.stopPropagation?.();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (setToast) setToast(`Copied ${code} to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.status === 'active').length;
    const inactive = coupons.filter((c) => c.status === 'inactive').length;
    const expired = coupons.filter((c) => c.status === 'expired').length;
    const limitReached = coupons.filter((c) => c.status === 'limit_reached').length;
    const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || c.usageCount || 0), 0);

    const generalCount = coupons.filter((c) => (!c.coupon_type && !c.couponType) || (c.coupon_type || c.couponType) === 'general').length;
    const productCount = coupons.filter((c) => (c.coupon_type || c.couponType) === 'product_specific').length;
    const bulkCount = coupons.filter((c) => (c.coupon_type || c.couponType) === 'bulk_quantity').length;
    const existingCustCount = coupons.filter((c) => (c.customer_eligibility || c.customerEligibility) === 'existing_customers_only').length;

    return { total, active, inactive, expired, limitReached, totalUsage, generalCount, productCount, bulkCount, existingCustCount };
  }, [coupons]);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // 1. Status Filter
      if (filter !== 'all' && c.status !== filter) {
        return false;
      }

      // 2. Type Filter
      const cType = c.coupon_type || c.couponType || 'general';
      if (typeFilter !== 'all' && cType !== typeFilter) {
        return false;
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const codeMatch = (c.code || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        const prodMatch = (c.applicable_product_name || c.applicableProductName || '').toLowerCase().includes(q);
        return codeMatch || descMatch || prodMatch;
      }

      return true;
    });
  }, [coupons, filter, typeFilter, search]);

  // Open Create Modal
  const openCreateModal = () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    const defExpiry = future.toISOString().split('T')[0];

    setForm({
      ...defaultCouponForm,
      expiryDate: defExpiry
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (c) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      couponType: c.coupon_type || c.couponType || 'general',
      applicableProductId: (c.applicable_product_id?._id || c.applicable_product_id || c.applicableProductId?._id || c.applicableProductId || ''),
      applicableProductName: c.applicable_product_name || c.applicableProductName || '',
      minQuantity: c.min_quantity || c.minQuantity || 2,
      bulkPricingType: c.bulk_pricing_type || c.bulkPricingType || 'special_price',
      specialPerPiecePrice: c.special_per_piece_price !== undefined ? c.special_per_piece_price : (c.specialPerPiecePrice || ''),
      bulkApplyTo: c.bulk_apply_to || c.bulkApplyTo || 'all_units',
      discountType: c.discount_type || c.discountType || 'percent',
      discountValue: c.discount_value !== undefined ? c.discount_value : (c.discountValue || ''),
      minOrderValue: c.min_order_value !== undefined ? c.min_order_value : (c.minOrderValue || 0),
      usageLimit: c.usage_limit || c.usageLimit || 50,
      expiryDate: getInputDate(c.expiry_date || c.expiryDate),
      isActive: c.is_active !== undefined ? c.is_active : c.isActive,
      customerEligibility: c.customer_eligibility || c.customerEligibility || 'all',
      isPublic: c.is_public !== undefined ? c.is_public : (c.isPublic !== undefined ? c.isPublic : true),
      description: c.description || ''
    });
    setFormError('');
  };

  // Handle Product Select & Clear
  const handleSelectProduct = (product) => {
    setForm((prev) => ({
      ...prev,
      applicableProductId: String(product._id || product.id),
      applicableProductName: product.name
    }));
  };

  const handleClearProduct = () => {
    setForm((prev) => ({
      ...prev,
      applicableProductId: '',
      applicableProductName: ''
    }));
  };

  // Form Submit Handler
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      return setFormError('Coupon code is required.');
    }

    // Validation for Product-Specific & Bulk coupons
    if (['product_specific', 'bulk_quantity'].includes(form.couponType)) {
      if (!form.applicableProductId) {
        return setFormError('Please select a target product from the catalogue.');
      }
    }

    // Validation for Bulk Quantity
    let cleanSpecialPrice = 0;
    if (form.couponType === 'bulk_quantity') {
      const minQty = parseInt(form.minQuantity, 10);
      if (isNaN(minQty) || minQty < 1) {
        return setFormError('Minimum quantity must be at least 1 unit.');
      }

      if (form.bulkPricingType === 'special_price') {
        cleanSpecialPrice = Number(form.specialPerPiecePrice);
        if (isNaN(cleanSpecialPrice) || cleanSpecialPrice <= 0) {
          return setFormError('Special price per piece must be greater than 0.');
        }
      }
    }

    // Discount value validation
    let val = Number(form.discountValue);
    if (form.couponType !== 'bulk_quantity' || form.bulkPricingType !== 'special_price') {
      if (isNaN(val) || val <= 0) {
        return setFormError('Discount value must be greater than 0.');
      }
      if (form.discountType === 'percent' && val > 100) {
        return setFormError('Percentage discount cannot exceed 100%.');
      }
    } else {
      val = 0;
    }

    const mov = Number(form.minOrderValue);
    if (isNaN(mov) || mov < 0) {
      return setFormError('Minimum order value cannot be negative.');
    }

    const limit = Number(form.usageLimit);
    if (isNaN(limit) || limit < 1) {
      return setFormError('Usage limit must be at least 1.');
    }

    if (!form.expiryDate) {
      return setFormError('Please select a valid expiry date.');
    }

    const selectedProd = availableProducts.find((p) => String(p._id || p.id) === String(form.applicableProductId));
    const resolvedProdName = selectedProd ? selectedProd.name : form.applicableProductName;

    const payload = {
      code: cleanCode,
      couponType: form.couponType,
      applicableProductId: ['product_specific', 'bulk_quantity'].includes(form.couponType) ? form.applicableProductId : null,
      applicableProductName: ['product_specific', 'bulk_quantity'].includes(form.couponType) ? resolvedProdName : '',
      minQuantity: form.couponType === 'bulk_quantity' ? Math.max(1, parseInt(form.minQuantity, 10) || 1) : 1,
      bulkPricingType: form.bulkPricingType || 'discount',
      specialPerPiecePrice: form.bulkPricingType === 'special_price' ? cleanSpecialPrice : 0,
      bulkApplyTo: form.bulkApplyTo || 'all_units',
      discountType: form.discountType,
      discountValue: val,
      minOrderValue: mov,
      usageLimit: Math.floor(limit),
      expiryDate: form.expiryDate,
      isActive: form.isActive,
      customerEligibility: form.customerEligibility || 'all',
      isPublic: Boolean(form.isPublic),
      description: form.description
    };

    setFormLoading(true);
    try {
      if (editingCoupon) {
        const res = await api(`/admin/coupons/${editingCoupon.id || editingCoupon._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          if (setToast) setToast(`Coupon ${cleanCode} updated successfully!`);
          setEditingCoupon(null);
          notifyRefresh();
        }
      } else {
        const res = await api('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          if (setToast) setToast(`Coupon ${cleanCode} created successfully!`);
          setShowCreateModal(false);
          notifyRefresh();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save coupon.');
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (coupon, e) => {
    e?.stopPropagation?.();
    const id = coupon.id || coupon._id;
    try {
      const res = await api(`/admin/coupons/${id}/toggle`, {
        method: 'PATCH'
      });
      if (res.ok) {
        if (setToast) setToast(`Coupon ${coupon.code} is now ${res.coupon.is_active ? 'Active' : 'Inactive'}.`);
        notifyRefresh();
      }
    } catch (err) {
      if (setToast) setToast(err.message || 'Failed to toggle coupon status.');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async () => {
    if (!deleteConfirmCoupon) return;
    const id = deleteConfirmCoupon.id || deleteConfirmCoupon._id;
    const code = deleteConfirmCoupon.code;

    try {
      const res = await api(`/admin/coupons/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (setToast) setToast(`Coupon ${code} permanently deleted.`);
        setDeleteConfirmCoupon(null);
        notifyRefresh();
      }
    } catch (err) {
      if (setToast) setToast(err.message || 'Failed to delete coupon.');
    }
  };

  // Selected product helper for bulk pricing preview
  const currentFormProduct = useMemo(() => {
    if (!form.applicableProductId) return null;
    return availableProducts.find((p) => String(p._id || p.id) === String(form.applicableProductId)) || null;
  }, [availableProducts, form.applicableProductId]);

  return (
    <div className="adminCouponManager">
      {/* 1. Header & Controls */}
      <div className="couponSectionHeader">
        <div className="headerText">
          <div className="headerEyebrowRow">
            <span className="eyebrowBadge">MARKETING & PROMOTIONS</span>
            <span className="adminGuaranteeTag">🔒 Zero Automatic Discounts</span>
          </div>
          <h2>Coupon & Offer Management</h2>
          <p>
            Create and manage promotional discount codes. All discounts are triggered exclusively when a customer manually validates a valid coupon code at checkout.
          </p>
        </div>

        <button
          type="button"
          className="goldBtn createCouponBtn"
          onClick={openCreateModal}
        >
          <Plus size={16} />
          <span>CREATE COUPON</span>
        </button>
      </div>

      {/* 2. Stats Cards */}
      <div className="couponStatsGrid">
        <div className="couponStatCard">
          <div className="couponStatIcon iconGold">
            <Tag size={18} />
          </div>
          <div className="couponStatText">
            <span className="couponStatLabel">Total Coupons</span>
            <b className="couponStatVal">{stats.total}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconGreen">
            <Sparkles size={18} />
          </div>
          <div className="couponStatText">
            <span className="couponStatLabel">Active Offers</span>
            <b className="couponStatVal">{stats.active}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconPurple">
            <Package size={18} />
          </div>
          <div className="couponStatText">
            <span className="couponStatLabel">Product & Bulk</span>
            <b className="couponStatVal">{stats.productCount + stats.bulkCount}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconAmber">
            <UserCheck size={18} />
          </div>
          <div className="couponStatText">
            <span className="couponStatLabel">Existing Only</span>
            <b className="couponStatVal">{stats.existingCustCount}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconGold">
            <Layers size={18} />
          </div>
          <div className="couponStatText">
            <span className="couponStatLabel">Redemptions</span>
            <b className="couponStatVal">{stats.totalUsage}</b>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <div className="couponControlBar">
        <div className="searchBox">
          <Search size={15} className="searchIcon" />
          <input
            type="text"
            placeholder="Search code, product, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="searchInput"
          />
          {search && (
            <button className="clearSearchBtn" onClick={() => setSearch('')} type="button">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="filterPillsScrollWrap">
          <div className="filterPills">
            <button
              type="button"
              className={`filterPill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({coupons.length})
            </button>
            <button
              type="button"
              className={`filterPill ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              className={`filterPill ${filter === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilter('inactive')}
            >
              Inactive ({stats.inactive})
            </button>
            <button
              type="button"
              className={`filterPill ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              Expired ({stats.expired})
            </button>
            <button
              type="button"
              className={`filterPill ${filter === 'limit_reached' ? 'active' : ''}`}
              onClick={() => setFilter('limit_reached')}
            >
              Limit Reached ({stats.limitReached})
            </button>
          </div>

          <div className="typeFilterGroup">
            <span className="typeFilterLabel">Type:</span>
            <button
              type="button"
              className={`typePill ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`typePill ${typeFilter === 'general' ? 'active' : ''}`}
              onClick={() => setTypeFilter('general')}
            >
              General
            </button>
            <button
              type="button"
              className={`typePill ${typeFilter === 'product_specific' ? 'active' : ''}`}
              onClick={() => setTypeFilter('product_specific')}
            >
              Product
            </button>
            <button
              type="button"
              className={`typePill ${typeFilter === 'bulk_quantity' ? 'active' : ''}`}
              onClick={() => setTypeFilter('bulk_quantity')}
            >
              Bulk
            </button>
          </div>
        </div>
      </div>

      {/* 4. Desktop Table View (>= 861px) */}
      <div className="adminCard couponDataCard">
        <div className="tableHeaderStats">
          <h3>Coupons Inventory</h3>
          <span className="tableCountHint">
            Showing <b>{filteredCoupons.length}</b> of {coupons.length} coupons
          </span>
        </div>

        {filteredCoupons.length > 0 ? (
          <>
            <div className="desktopTableContainer">
              <table className="couponsOperationalTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Coupon Code</th>
                    <th>Type & Scope</th>
                    <th>Discount / Pricing Rule</th>
                    <th>Audience & Visibility</th>
                    <th>Min Order</th>
                    <th>Usage / Limit</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Is Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map((c, index) => {
                    const cType = c.coupon_type || c.couponType || 'general';
                    const discountType = c.discount_type || c.discountType;
                    const discountVal = c.discount_value !== undefined ? c.discount_value : c.discountValue;
                    const minOrder = c.min_order_value !== undefined ? c.min_order_value : c.minOrderValue || 0;
                    const usageLimit = c.usage_limit || c.usageLimit || 0;
                    const usageCount = c.usage_count || c.usageCount || 0;
                    const remaining = Math.max(0, usageLimit - usageCount);
                    const isActive = c.is_active !== undefined ? c.is_active : c.isActive;
                    const targetProdName = c.applicable_product_name || c.applicableProductName;
                    const minQty = c.min_quantity || c.minQuantity || 1;
                    const bulkPricingType = c.bulk_pricing_type || c.bulkPricingType;
                    const specialPrice = c.special_per_piece_price !== undefined ? c.special_per_piece_price : c.specialPerPiecePrice;
                    const bulkApplyTo = c.bulk_apply_to || c.bulkApplyTo || 'all_units';
                    const customerEligibility = c.customer_eligibility || c.customerEligibility || 'all';
                    const isPublic = c.is_public !== undefined ? c.is_public : (c.isPublic !== undefined ? c.isPublic : true);
                    const usagePercent = usageLimit > 0 ? Math.min(100, Math.round((usageCount / usageLimit) * 100)) : 0;

                    return (
                      <tr key={c.id || c._id} className={`couponRow statusRow_${c.status}`}>
                        {/* 1. Index */}
                        <td className="couponIdCell">
                          <code>#{index + 1}</code>
                        </td>

                        {/* 2. Coupon Code */}
                        <td className="couponCodeCell">
                          <div className="couponCodeBadgeWrap">
                            <span className="couponCodeText">{c.code}</span>
                            <button
                              type="button"
                              className="copyCodeBtn"
                              onClick={(e) => handleCopyCode(c.code, e)}
                              title="Copy code"
                            >
                              {copiedCode === c.code ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                            </button>
                          </div>
                          {c.description && (
                            <small className="couponDescHint">{c.description}</small>
                          )}
                        </td>

                        {/* 3. Type & Scope */}
                        <td className="couponScopeCell">
                          {cType === 'general' && (
                            <span className="scopeBadge scopeGeneral">
                              <Globe size={11} /> General Cart
                            </span>
                          )}
                          {cType === 'product_specific' && (
                            <div className="scopeWrap">
                              <span className="scopeBadge scopeProduct">
                                <Sparkles size={11} /> Product-Specific
                              </span>
                              <span className="scopeTargetProduct" title={targetProdName}>
                                {targetProdName || 'Selected Item'}
                              </span>
                            </div>
                          )}
                          {cType === 'bulk_quantity' && (
                            <div className="scopeWrap">
                              <span className="scopeBadge scopeBulk">
                                <Package size={11} /> Bulk Offer (Min: {minQty} pcs)
                              </span>
                              <span className="scopeTargetProduct" title={targetProdName}>
                                {targetProdName || 'Selected Item'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 4. Discount / Pricing Rule */}
                        <td className="discountValCell">
                          {cType === 'bulk_quantity' && bulkPricingType === 'special_price' ? (
                            <div className="ruleDisplay">
                              <b className="specialPriceHighlight">₹{specialPrice} / piece</b>
                              <small className="ruleSubDetail">
                                {bulkApplyTo === 'all_units' ? 'All purchased units' : 'Excess units only'}
                              </small>
                            </div>
                          ) : (
                            <div className="ruleDisplay">
                              <b className="discountHighlight">
                                {discountType === 'percent' ? `${discountVal}% OFF` : `₹${discountVal} OFF`}
                              </b>
                              {cType === 'product_specific' && (
                                <small className="ruleSubDetail">on target item only</small>
                              )}
                              {cType === 'bulk_quantity' && (
                                <small className="ruleSubDetail">
                                  on min {minQty} pcs ({bulkApplyTo === 'all_units' ? 'all' : 'excess'})
                                </small>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Audience & Visibility */}
                        <td className="audienceCell">
                          <div className="audienceWrap">
                            {customerEligibility === 'existing_customers_only' ? (
                              <span className="audienceBadge audienceExisting" title="Requires verified past orders">
                                <Lock size={10} /> Existing Only
                              </span>
                            ) : (
                              <span className="audienceBadge audienceAll">
                                <Users size={10} /> All Customers
                              </span>
                            )}

                            {isPublic ? (
                              <span className="visibilityPill pillPublic" title="Displayed in checkout sheet">
                                Public
                              </span>
                            ) : (
                              <span className="visibilityPill pillPrivate" title="Private manual share">
                                Private
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Min Order Value */}
                        <td className="minOrderCell">
                          {minOrder > 0 ? (
                            <b>{money(minOrder)}</b>
                          ) : (
                            <span className="noMinText">None</span>
                          )}
                        </td>

                        {/* 7. Usage / Limit */}
                        <td className="usageCountCell">
                          <div className="usageCountWrap">
                            <div className="usageNumbers">
                              <b>{usageCount}</b> <span className="usageLimitSlash">/ {usageLimit}</span>
                            </div>
                            <div className="usageProgressBar">
                              <div
                                className="usageProgressFill"
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <small className="remainingUsageHint">{remaining} remaining</small>
                          </div>
                        </td>

                        {/* 8. Expiry Date */}
                        <td className="expiryDateCell">
                          <span className="expiryDateText">
                            <Calendar size={12} />
                            {formatDate(c.expiry_date || c.expiryDate)}
                          </span>
                        </td>

                        {/* 9. Status */}
                        <td className="statusBadgeCell">
                          <span className={`couponStatusBadge status_${c.status}`}>
                            {c.status === 'active' && 'Active'}
                            {c.status === 'inactive' && 'Inactive'}
                            {c.status === 'expired' && 'Expired'}
                            {c.status === 'limit_reached' && 'Limit Reached'}
                          </span>
                        </td>

                        {/* 10. Is Active Switch */}
                        <td className="activeToggleCell">
                          <button
                            type="button"
                            className={`switchBtn ${isActive ? 'switchOn' : 'switchOff'}`}
                            onClick={(e) => handleToggleActive(c, e)}
                            title={`Click to ${isActive ? 'Deactivate' : 'Activate'}`}
                          >
                            <span className="switchSlider"></span>
                            <span className="switchLabel">{isActive ? 'ON' : 'OFF'}</span>
                          </button>
                        </td>

                        {/* 11. Actions */}
                        <td className="actionCell">
                          <div className="actionButtonsWrap">
                            <button
                              type="button"
                              className="iconActionBtn editActionBtn"
                              onClick={() => openEditModal(c)}
                              title="Edit Coupon"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="iconActionBtn deleteActionBtn"
                              onClick={() => setDeleteConfirmCoupon(c)}
                              title="Delete Coupon"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List (< 861px) */}
            <div className="couponMobileCardsList">
              {filteredCoupons.map((c) => {
                const cType = c.coupon_type || c.couponType || 'general';
                const discountType = c.discount_type || c.discountType;
                const discountVal = c.discount_value !== undefined ? c.discount_value : c.discountValue;
                const minOrder = c.min_order_value !== undefined ? c.min_order_value : c.minOrderValue || 0;
                const usageLimit = c.usage_limit || c.usageLimit || 0;
                const usageCount = c.usage_count || c.usageCount || 0;
                const remaining = Math.max(0, usageLimit - usageCount);
                const isActive = c.is_active !== undefined ? c.is_active : c.isActive;
                const targetProdName = c.applicable_product_name || c.applicableProductName;
                const minQty = c.min_quantity || c.minQuantity || 1;
                const bulkPricingType = c.bulk_pricing_type || c.bulkPricingType;
                const specialPrice = c.special_per_piece_price !== undefined ? c.special_per_piece_price : c.specialPerPiecePrice;
                const bulkApplyTo = c.bulk_apply_to || c.bulkApplyTo || 'all_units';
                const customerEligibility = c.customer_eligibility || c.customerEligibility || 'all';
                const isPublic = c.is_public !== undefined ? c.is_public : (c.isPublic !== undefined ? c.isPublic : true);

                return (
                  <div key={c.id || c._id} className={`couponMobileCard statusCard_${c.status}`}>
                    {/* Top Row: Code + Status Badge */}
                    <div className="mobileCardTopRow">
                      <div className="mobileCodeBadge">
                        <Tag size={13} />
                        <b>{c.code}</b>
                        <button
                          type="button"
                          className="mobileCopyBtn"
                          onClick={(e) => handleCopyCode(c.code, e)}
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? <Check size={11} color="#15803d" /> : <Copy size={11} />}
                        </button>
                      </div>

                      <span className={`couponStatusBadge status_${c.status}`}>
                        {c.status === 'active' && 'Active'}
                        {c.status === 'inactive' && 'Inactive'}
                        {c.status === 'expired' && 'Expired'}
                        {c.status === 'limit_reached' && 'Limit Reached'}
                      </span>
                    </div>

                    {/* Scope Pill & Product Name */}
                    <div className="mobileCardScopeRow">
                      {cType === 'general' && (
                        <span className="scopeBadge scopeGeneral">
                          <Globe size={11} /> General Cart Coupon
                        </span>
                      )}
                      {cType === 'product_specific' && (
                        <div className="mobileScopeGroup">
                          <span className="scopeBadge scopeProduct">
                            <Sparkles size={11} /> Product-Specific
                          </span>
                          <span className="mobileTargetName">{targetProdName || 'Selected Item'}</span>
                        </div>
                      )}
                      {cType === 'bulk_quantity' && (
                        <div className="mobileScopeGroup">
                          <span className="scopeBadge scopeBulk">
                            <Package size={11} /> Bulk Offer (Min: {minQty} pcs)
                          </span>
                          <span className="mobileTargetName">{targetProdName || 'Selected Item'}</span>
                        </div>
                      )}
                    </div>

                    {/* Deal Value Highlight */}
                    <div className="mobileCardDealBanner">
                      {cType === 'bulk_quantity' && bulkPricingType === 'special_price' ? (
                        <div>
                          <span className="mobileDealMain specialPriceHighlight">Special ₹{specialPrice} / pc</span>
                          <span className="mobileDealSub">
                            Applies to {bulkApplyTo === 'all_units' ? 'all purchased units' : 'excess units only'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="mobileDealMain discountHighlight">
                            {discountType === 'percent' ? `${discountVal}% OFF` : `₹${discountVal} OFF`}
                          </span>
                          <span className="mobileDealSub">
                            {cType === 'product_specific'
                              ? 'Deducted from target product only'
                              : cType === 'bulk_quantity'
                              ? `On min ${minQty} pcs (${bulkApplyTo === 'all_units' ? 'all units' : 'excess'})`
                              : 'Deducted from cart subtotal'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description if present */}
                    {c.description && (
                      <p className="mobileCardDescription">{c.description}</p>
                    )}

                    {/* Details Grid (2 columns) */}
                    <div className="mobileCardDetailsGrid">
                      <div className="mobileDetailItem">
                        <span className="mobileDetailLabel">Audience</span>
                        <div className="mobileDetailValWrap">
                          {customerEligibility === 'existing_customers_only' ? (
                            <span className="audienceBadge audienceExisting">
                              <Lock size={9} /> Existing Only
                            </span>
                          ) : (
                            <span className="audienceBadge audienceAll">
                              <Users size={9} /> All
                            </span>
                          )}
                          <span className={`visibilityPill ${isPublic ? 'pillPublic' : 'pillPrivate'}`}>
                            {isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>

                      <div className="mobileDetailItem">
                        <span className="mobileDetailLabel">Min Order</span>
                        <b className="mobileDetailVal">{minOrder > 0 ? money(minOrder) : 'No min'}</b>
                      </div>

                      <div className="mobileDetailItem">
                        <span className="mobileDetailLabel">Usage / Limit</span>
                        <b className="mobileDetailVal">{usageCount} / {usageLimit} ({remaining} left)</b>
                      </div>

                      <div className="mobileDetailItem">
                        <span className="mobileDetailLabel">Expires</span>
                        <b className="mobileDetailVal">{formatDate(c.expiry_date || c.expiryDate)}</b>
                      </div>
                    </div>

                    {/* Card Action Row */}
                    <div className="mobileCardActionRow">
                      <button
                        type="button"
                        className={`switchBtn mobileSwitch ${isActive ? 'switchOn' : 'switchOff'}`}
                        onClick={(e) => handleToggleActive(c, e)}
                      >
                        <span className="switchSlider"></span>
                        <span className="switchLabel">{isActive ? 'ACTIVE' : 'PAUSED'}</span>
                      </button>

                      <div className="mobileCardActionBtns">
                        <button
                          type="button"
                          className="mobileActionBtn editBtn"
                          onClick={() => openEditModal(c)}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="mobileActionBtn deleteBtn"
                          onClick={() => setDeleteConfirmCoupon(c)}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="emptyCouponsBox">
            <Tag size={40} className="emptyIcon" />
            <h4>No coupons found</h4>
            <p>
              {search || filter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search query or active filter settings.'
                : 'Create your first promotional discount coupon to reward your customers.'}
            </p>
            <button
              type="button"
              className="goldBtn createCouponBtn"
              onClick={openCreateModal}
            >
              <Plus size={15} />
              <span>CREATE COUPON</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. CREATE / EDIT COUPON MODAL                                        */}
      {/* ==================================================================== */}
      {(showCreateModal || editingCoupon) && (
        <div
          className="modalOverlay couponModalOverlay"
          onClick={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
          }}
        >
          <div
            className="modalContainer couponFormModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="couponModalHeader">
              <div className="modalHeaderTitleWrap">
                <div className="modalIconBadge">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="modalMainHeading">
                    {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
                  </h3>
                  <p className="modalSubHeading">
                    {editingCoupon
                      ? 'Update discount terms and limits. Changes take effect immediately at checkout.'
                      : 'Configure promotional coupon code. Discounts are applied exclusively when entered.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCoupon(null);
                }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitForm} className="couponForm">
              <div className="couponFormScrollBody">
                {formError && (
                  <div className="formErrorBanner">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {editingCoupon && (
                  <div className="couponUsageNotice">
                    <span className="usageNoticeLabel">Historical Redemptions:</span>
                    <b className="usageNoticeCount">
                      {editingCoupon.usage_count || editingCoupon.usageCount || 0} /{' '}
                      {editingCoupon.usage_limit || editingCoupon.usageLimit} orders redeemed
                    </b>
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SECTION 1: COUPON TYPE SELECTOR TABS                        */}
                {/* ----------------------------------------------------------- */}
                <div className="formSection">
                  <div className="sectionHeaderRow">
                    <span className="sectionNumberPill">1</span>
                    <span className="sectionTitle">Coupon Type</span>
                  </div>

                  <div className="couponTypeSegmentTabs">
                    <button
                      type="button"
                      className={`typeTabBtn ${form.couponType === 'general' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, couponType: 'general' })}
                    >
                      <Globe size={15} />
                      <div className="typeTabText">
                        <b>General Cart</b>
                        <small>Cart-wide % or ₹ discount</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`typeTabBtn ${form.couponType === 'product_specific' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, couponType: 'product_specific' })}
                    >
                      <Sparkles size={15} />
                      <div className="typeTabText">
                        <b>Product-Specific</b>
                        <small>Applies to chosen jewellery item</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`typeTabBtn ${form.couponType === 'bulk_quantity' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, couponType: 'bulk_quantity' })}
                    >
                      <Package size={15} />
                      <div className="typeTabText">
                        <b>Bulk Quantity</b>
                        <small>Special per-piece rate or deal</small>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* SECTION 2: BASIC INFORMATION                                */}
                {/* ----------------------------------------------------------- */}
                <div className="formSection">
                  <div className="sectionHeaderRow">
                    <span className="sectionNumberPill">2</span>
                    <span className="sectionTitle">Coupon Information</span>
                  </div>

                  <div className="formResponsiveGrid twoCol">
                    <div className="formGroup">
                      <label htmlFor="couponCodeInput">
                        Coupon Code <span className="reqStar">*</span>
                      </label>
                      <input
                        id="couponCodeInput"
                        type="text"
                        required
                        placeholder="e.g. FESTIVE20, BULK350, VIP15"
                        value={form.code}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            code: e.target.value.replace(/\s+/g, '').toUpperCase()
                          })
                        }
                        className="couponCodeInput"
                      />
                      <small className="fieldHint">Stored in uppercase. Customers can enter with any case.</small>
                    </div>

                    <div className="formGroup">
                      <label htmlFor="descriptionInput">Campaign Notes / Label (Optional)</label>
                      <input
                        id="descriptionInput"
                        type="text"
                        placeholder="e.g. Diwali Offer, Exclusive Returning Customer"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="adminInput"
                      />
                      <small className="fieldHint">Shown as promo description tag in available coupons.</small>
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* SECTION 3: PRODUCT RESTRICTIONS (for Product & Bulk only)   */}
                {/* ----------------------------------------------------------- */}
                {['product_specific', 'bulk_quantity'].includes(form.couponType) && (
                  <div className="formSection productTargetSection">
                    <div className="sectionHeaderRow">
                      <span className="sectionNumberPill">3</span>
                      <div className="sectionTitleWithBadge">
                        <span className="sectionTitle">Target Product / SKU</span>
                        <span className="requiredBadge">Required for {form.couponType === 'bulk_quantity' ? 'Bulk' : 'Product'}</span>
                      </div>
                    </div>

                    <p className="sectionSubText">
                      Search and select the exact product from your jewellery catalogue. The discount will calculate exclusively against this item.
                    </p>

                    <SearchableProductSelector
                      products={availableProducts}
                      selectedProductId={form.applicableProductId}
                      selectedProductName={form.applicableProductName}
                      onSelect={handleSelectProduct}
                      onClear={handleClearProduct}
                    />
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SECTION 4: BULK RULES (for Bulk Quantity only)              */}
                {/* ----------------------------------------------------------- */}
                {form.couponType === 'bulk_quantity' && (
                  <div className="formSection bulkRulesSection">
                    <div className="sectionHeaderRow">
                      <span className="sectionNumberPill">4</span>
                      <span className="sectionTitle">Bulk Quantity Rules</span>
                    </div>

                    <div className="bulkRulesContainer">
                      <div className="formResponsiveGrid twoCol">
                        {/* Minimum Quantity */}
                        <div className="formGroup">
                          <label htmlFor="minQuantityInput">
                            Minimum Quantity (Units) <span className="reqStar">*</span>
                          </label>
                          <input
                            id="minQuantityInput"
                            type="number"
                            required
                            min="1"
                            placeholder="e.g. 3"
                            value={form.minQuantity}
                            onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                            className="adminInput"
                          />
                          <small className="fieldHint">Customer must have at least this many units in cart.</small>
                        </div>

                        {/* Bulk Pricing Mode */}
                        <div className="formGroup">
                          <label>Pricing Mode <span className="reqStar">*</span></label>
                          <div className="segmentedChoiceGroup">
                            <button
                              type="button"
                              className={`choiceBtn ${form.bulkPricingType === 'special_price' ? 'active' : ''}`}
                              onClick={() => setForm({ ...form, bulkPricingType: 'special_price' })}
                            >
                              Special Per-Piece Price (₹)
                            </button>
                            <button
                              type="button"
                              className={`choiceBtn ${form.bulkPricingType === 'discount' ? 'active' : ''}`}
                              onClick={() => setForm({ ...form, bulkPricingType: 'discount' })}
                            >
                              Discount (% or ₹)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Special Per-Piece Price Input */}
                      {form.bulkPricingType === 'special_price' ? (
                        <div className="formResponsiveGrid twoCol">
                          <div className="formGroup">
                            <label htmlFor="specialPriceInput">
                              Special Price Per Piece (₹) <span className="reqStar">*</span>
                            </label>
                            <div className="inputWithPrefix">
                              <span className="inputPrefix">₹</span>
                              <input
                                id="specialPriceInput"
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 350"
                                value={form.specialPerPiecePrice}
                                onChange={(e) => setForm({ ...form, specialPerPiecePrice: e.target.value })}
                                className="adminInput inputPrefixed"
                              />
                            </div>
                            {currentFormProduct && currentFormProduct.price && form.specialPerPiecePrice > 0 && (
                              <div className="savingsPreviewPill">
                                <span>Regular: ₹{currentFormProduct.price}</span>
                                <ArrowRight size={12} />
                                <b>Special: ₹{form.specialPerPiecePrice}</b>
                                <span className="savingsHighlight">
                                  (Save ₹{Math.max(0, currentFormProduct.price - form.specialPerPiecePrice)} / pc)
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="formGroup">
                            <label>Apply Offer To <span className="reqStar">*</span></label>
                            <div className="segmentedChoiceGroup">
                              <button
                                type="button"
                                className={`choiceBtn ${form.bulkApplyTo === 'all_units' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, bulkApplyTo: 'all_units' })}
                              >
                                All Purchased Units
                              </button>
                              <button
                                type="button"
                                className={`choiceBtn ${form.bulkApplyTo === 'excess_units' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, bulkApplyTo: 'excess_units' })}
                              >
                                Excess Units Only
                              </button>
                            </div>
                            <small className="fieldHint">
                              {form.bulkApplyTo === 'all_units'
                                ? 'Special price is charged across all units once the threshold is met.'
                                : 'Base units are charged regular retail price; special rate applies to units beyond threshold.'}
                            </small>
                          </div>
                        </div>
                      ) : (
                        <div className="formResponsiveGrid twoCol">
                          <div className="formGroup">
                            <label>Discount Type</label>
                            <div className="segmentedChoiceGroup">
                              <button
                                type="button"
                                className={`choiceBtn ${form.discountType === 'percent' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, discountType: 'percent' })}
                              >
                                Percent (%)
                              </button>
                              <button
                                type="button"
                                className={`choiceBtn ${form.discountType === 'fixed' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, discountType: 'fixed' })}
                              >
                                Fixed (₹)
                              </button>
                            </div>
                          </div>

                          <div className="formGroup">
                            <label htmlFor="bulkDiscountVal">
                              Discount Value {form.discountType === 'percent' ? '(%)' : '(₹)'}
                            </label>
                            <div className="inputWithPrefix">
                              <span className="inputPrefix">
                                {form.discountType === 'percent' ? '%' : '₹'}
                              </span>
                              <input
                                id="bulkDiscountVal"
                                type="number"
                                min="1"
                                placeholder={form.discountType === 'percent' ? '20' : '200'}
                                value={form.discountValue}
                                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                                className="adminInput inputPrefixed"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SECTION 5: DISCOUNT CONFIGURATION (General & Product-Spec)  */}
                {/* ----------------------------------------------------------- */}
                {form.couponType !== 'bulk_quantity' && (
                  <div className="formSection">
                    <div className="sectionHeaderRow">
                      <span className="sectionNumberPill">
                        {form.couponType === 'product_specific' ? '4' : '3'}
                      </span>
                      <span className="sectionTitle">Discount Configuration</span>
                    </div>

                    <div className="formResponsiveGrid twoCol">
                      <div className="formGroup">
                        <label>Discount Type <span className="reqStar">*</span></label>
                        <div className="segmentedChoiceGroup">
                          <button
                            type="button"
                            className={`choiceBtn ${form.discountType === 'percent' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, discountType: 'percent' })}
                          >
                            <Percent size={13} /> Percent (%)
                          </button>
                          <button
                            type="button"
                            className={`choiceBtn ${form.discountType === 'fixed' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, discountType: 'fixed' })}
                          >
                            <IndianRupee size={13} /> Fixed Amount (₹)
                          </button>
                        </div>
                        <small className="fieldHint">
                          {form.couponType === 'product_specific'
                            ? 'Deducted exclusively from target product subtotal.'
                            : 'Deducted from the overall cart subtotal.'}
                        </small>
                      </div>

                      <div className="formGroup">
                        <label htmlFor="discountValueInput">
                          Discount Value {form.discountType === 'percent' ? '(%)' : '(₹)'}{' '}
                          <span className="reqStar">*</span>
                        </label>
                        <div className="inputWithPrefix">
                          <span className="inputPrefix">
                            {form.discountType === 'percent' ? '%' : '₹'}
                          </span>
                          <input
                            id="discountValueInput"
                            type="number"
                            required
                            min="1"
                            max={form.discountType === 'percent' ? '100' : '100000'}
                            placeholder={form.discountType === 'percent' ? '20' : '150'}
                            value={form.discountValue}
                            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                            className="adminInput inputPrefixed"
                          />
                        </div>
                        <small className="fieldHint">
                          {form.discountType === 'percent'
                            ? 'e.g. 20 means 20% off (max 100%).'
                            : 'e.g. 150 means ₹150 flat discount.'}
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* SECTION 6: AUDIENCE & SHARING                               */}
                {/* ----------------------------------------------------------- */}
                <div className="formSection">
                  <div className="sectionHeaderRow">
                    <span className="sectionNumberPill">
                      {form.couponType === 'general' ? '4' : '5'}
                    </span>
                    <span className="sectionTitle">Customer Eligibility & Sharing</span>
                  </div>

                  <div className="formResponsiveGrid twoCol">
                    <div className="formGroup">
                      <label>Customer Eligibility <span className="reqStar">*</span></label>
                      <div className="segmentedChoiceGroup">
                        <button
                          type="button"
                          className={`choiceBtn ${form.customerEligibility === 'all' ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, customerEligibility: 'all' })}
                        >
                          <Users size={13} /> All Customers
                        </button>
                        <button
                          type="button"
                          className={`choiceBtn ${form.customerEligibility === 'existing_customers_only' ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, customerEligibility: 'existing_customers_only' })}
                        >
                          <Lock size={13} /> Existing Customers Only
                        </button>
                      </div>
                      <small className="fieldHint">
                        {form.customerEligibility === 'existing_customers_only'
                          ? 'Customer email / phone is checked against previous orders in database.'
                          : 'Valid for both first-time buyers and returning customers.'}
                      </small>
                    </div>

                    <div className="formGroup">
                      <label>Checkout Visibility <span className="reqStar">*</span></label>
                      <div className="segmentedChoiceGroup">
                        <button
                          type="button"
                          className={`choiceBtn ${form.isPublic ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, isPublic: true })}
                        >
                          <Globe size={13} /> Public
                        </button>
                        <button
                          type="button"
                          className={`choiceBtn ${!form.isPublic ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, isPublic: false })}
                        >
                          <Lock size={13} /> Private / Exclusive
                        </button>
                      </div>
                      <small className="fieldHint">
                        {form.isPublic
                          ? 'Visible in the available coupons sheet during checkout.'
                          : 'Hidden from checkout sheet. Only customers given the direct code can redeem.'}
                      </small>
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* SECTION 7: RESTRICTIONS, LIMITS & STATUS                    */}
                {/* ----------------------------------------------------------- */}
                <div className="formSection">
                  <div className="sectionHeaderRow">
                    <span className="sectionNumberPill">
                      {form.couponType === 'general' ? '5' : '6'}
                    </span>
                    <span className="sectionTitle">Restrictions, Limits & Status</span>
                  </div>

                  <div className="formResponsiveGrid threeCol">
                    <div className="formGroup">
                      <label htmlFor="minOrderValueInput">Min Cart Subtotal (₹)</label>
                      <div className="inputWithPrefix">
                        <span className="inputPrefix">₹</span>
                        <input
                          id="minOrderValueInput"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.minOrderValue}
                          onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                          className="adminInput inputPrefixed"
                        />
                      </div>
                      <small className="fieldHint">Minimum cart subtotal needed (0 for none).</small>
                    </div>

                    <div className="formGroup">
                      <label htmlFor="usageLimitInput">
                        Usage Limit <span className="reqStar">*</span>
                      </label>
                      <input
                        id="usageLimitInput"
                        type="number"
                        required
                        min="1"
                        placeholder="50"
                        value={form.usageLimit}
                        onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                        className="adminInput"
                      />
                      <small className="fieldHint">Max total redemptions across all buyers.</small>
                    </div>

                    <div className="formGroup">
                      <label htmlFor="expiryDateInput">
                        Expiry Date <span className="reqStar">*</span>
                      </label>
                      <input
                        id="expiryDateInput"
                        type="date"
                        required
                        value={form.expiryDate}
                        onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                        className="adminInput"
                      />
                      <small className="fieldHint">Expires automatically at end of day.</small>
                    </div>
                  </div>

                  {/* Active Toggle Card */}
                  <div className="activeStatusRowCard">
                    <div className="activeStatusText">
                      <b>Coupon Status</b>
                      <span>{form.isActive ? 'Active — Customers can redeem at checkout' : 'Inactive — Coupon is paused and cannot be applied'}</span>
                    </div>

                    <button
                      type="button"
                      className={`switchBtn largeSwitch ${form.isActive ? 'switchOn' : 'switchOff'}`}
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    >
                      <span className="switchSlider"></span>
                      <span className="switchLabel">{form.isActive ? 'ACTIVE' : 'PAUSED'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Action Footer */}
              <div className="couponModalFooter">
                <button
                  type="button"
                  className="modalCancelBtn"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn modalSubmitBtn"
                  disabled={formLoading}
                >
                  {formLoading
                    ? 'Saving…'
                    : editingCoupon
                    ? 'UPDATE COUPON'
                    : 'CREATE COUPON'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. DELETE CONFIRMATION DIALOG                                        */}
      {/* ==================================================================== */}
      {deleteConfirmCoupon && (
        <div
          className="modalOverlay deleteModalOverlay"
          onClick={() => setDeleteConfirmCoupon(null)}
        >
          <div
            className="modalContainer deleteConfirmModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="deleteModalIcon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Coupon?</h3>
            <p>
              Are you sure you want to permanently delete coupon <b>{deleteConfirmCoupon.code}</b>?
            </p>
            <div className="deleteWarningNote">
              ✦ Historical orders that used this coupon will safely retain their coupon code and discount records.
            </div>

            <div className="modalFooterActions">
              <button
                type="button"
                className="modalCancelBtn"
                onClick={() => setDeleteConfirmCoupon(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dangerBtn"
                onClick={handleDeleteCoupon}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
