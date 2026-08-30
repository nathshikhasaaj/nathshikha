import React, { useState, useMemo } from 'react';
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
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './AdminCouponManager.css';

const defaultCouponForm = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  minOrderValue: 0,
  usageLimit: 50,
  expiryDate: '',
  isActive: true,
  description: ''
};

export default function AdminCouponManager({
  coupons = [],
  onRefresh,
  setToast
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive, expired, limit_reached

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState(null);

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

  // Metrics
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.status === 'active').length;
    const inactive = coupons.filter((c) => c.status === 'inactive').length;
    const expired = coupons.filter((c) => c.status === 'expired').length;
    const limitReached = coupons.filter((c) => c.status === 'limit_reached').length;
    const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || c.usageCount || 0), 0);

    return { total, active, inactive, expired, limitReached, totalUsage };
  }, [coupons]);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // 1. Status Filter
      if (filter !== 'all' && c.status !== filter) {
        return false;
      }

      // 2. Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const codeMatch = (c.code || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        return codeMatch || descMatch;
      }

      return true;
    });
  }, [coupons, filter, search]);

  // Open Create Modal
  const openCreateModal = () => {
    // Default expiry 3 months in future
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
      discountType: c.discount_type || c.discountType || 'percent',
      discountValue: c.discount_value || c.discountValue,
      minOrderValue: c.min_order_value !== undefined ? c.min_order_value : c.minOrderValue || 0,
      usageLimit: c.usage_limit || c.usageLimit || 50,
      expiryDate: getInputDate(c.expiry_date || c.expiryDate),
      isActive: c.is_active !== undefined ? c.is_active : c.isActive,
      description: c.description || ''
    });
    setFormError('');
  };

  // Handle Submit Form (Create or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      return setFormError('Coupon code is required.');
    }

    const val = Number(form.discountValue);
    if (isNaN(val) || val <= 0) {
      return setFormError('Discount value must be greater than 0.');
    }

    if (form.discountType === 'percent' && val > 100) {
      return setFormError('Percentage discount cannot exceed 100%.');
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

    setFormLoading(true);
    try {
      if (editingCoupon) {
        // Edit coupon
        const res = await api(`/admin/coupons/${editingCoupon.id || editingCoupon._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            code: cleanCode,
            discountType: form.discountType,
            discountValue: val,
            minOrderValue: mov,
            usageLimit: Math.floor(limit),
            expiryDate: form.expiryDate,
            isActive: form.isActive,
            description: form.description
          })
        });

        if (res.ok) {
          setToast(`Coupon ${cleanCode} updated successfully!`);
          setEditingCoupon(null);
          if (onRefresh) onRefresh();
        }
      } else {
        // Create coupon
        const res = await api('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify({
            code: cleanCode,
            discountType: form.discountType,
            discountValue: val,
            minOrderValue: mov,
            usageLimit: Math.floor(limit),
            expiryDate: form.expiryDate,
            isActive: form.isActive,
            description: form.description
          })
        });

        if (res.ok) {
          setToast(`Coupon ${cleanCode} created successfully!`);
          setShowCreateModal(false);
          if (onRefresh) onRefresh();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save coupon.');
    } finally {
      setFormLoading(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (coupon) => {
    const id = coupon.id || coupon._id;
    try {
      const res = await api(`/admin/coupons/${id}/toggle`, {
        method: 'PATCH'
      });
      if (res.ok) {
        setToast(`Coupon ${coupon.code} is now ${res.coupon.is_active ? 'Active' : 'Inactive'}.`);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setToast(err.message || 'Failed to toggle coupon status.');
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
        setToast(`Coupon ${code} permanently deleted.`);
        setDeleteConfirmCoupon(null);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setToast(err.message || 'Failed to delete coupon.');
    }
  };

  return (
    <div className="adminCouponManager">
      {/* Header & Controls */}
      <div className="couponSectionHeader">
        <div className="headerText">
          <span className="eyebrow">MARKETING & PROMOTIONS</span>
          <h2>Coupons / Promo Codes</h2>
          <p>
            Create and manage promotional discount codes. Discount rules and usage limits are securely enforced by the server.
          </p>
        </div>

        <button
          type="button"
          className="goldBtn createCouponBtn"
          onClick={openCreateModal}
        >
          <Plus size={16} />
          <span>+ CREATE COUPON</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="couponStatsGrid">
        <div className="couponStatCard">
          <div className="couponStatIcon iconGold">
            <Tag size={18} />
          </div>
          <div>
            <span className="couponStatLabel">Total Coupons</span>
            <b className="couponStatVal">{stats.total}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconGreen">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="couponStatLabel">Active Offers</span>
            <b className="couponStatVal">{stats.active}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconAmber">
            <Clock size={18} />
          </div>
          <div>
            <span className="couponStatLabel">Expired / Inactive</span>
            <b className="couponStatVal">{stats.expired + stats.inactive}</b>
          </div>
        </div>

        <div className="couponStatCard">
          <div className="couponStatIcon iconPurple">
            <Layers size={18} />
          </div>
          <div>
            <span className="couponStatLabel">Total Redemptions</span>
            <b className="couponStatVal">{stats.totalUsage}</b>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="couponControlBar">
        <div className="searchBox">
          <Search size={16} className="searchIcon" />
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="searchInput"
          />
          {search && (
            <button className="clearSearchBtn" onClick={() => setSearch('')} type="button">
              <X size={14} />
            </button>
          )}
        </div>

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
      </div>

      {/* Coupons Table Card */}
      <div className="adminCard tableCard">
        <div className="tableHeaderStats">
          <h3>Coupons List</h3>
          <span>
            Showing <b>{filteredCoupons.length}</b> of {coupons.length} coupons
          </span>
        </div>

        {filteredCoupons.length > 0 ? (
          <div className="couponsTableContainer">
            <table className="couponsOperationalTable">
              <thead>
                <tr>
                  <th>Coupon ID</th>
                  <th>Coupon Code</th>
                  <th>Discount Type</th>
                  <th>Discount Value</th>
                  <th>Min Order Value</th>
                  <th>Usage Limit</th>
                  <th>Usage Count</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Is Active</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((c, index) => {
                  const discountType = c.discount_type || c.discountType;
                  const discountVal = c.discount_value || c.discountValue;
                  const minOrder = c.min_order_value !== undefined ? c.min_order_value : c.minOrderValue || 0;
                  const usageLimit = c.usage_limit || c.usageLimit || 0;
                  const usageCount = c.usage_count || c.usageCount || 0;
                  const remaining = Math.max(0, usageLimit - usageCount);
                  const isActive = c.is_active !== undefined ? c.is_active : c.isActive;
                  const couponId = String(c.id || c._id).slice(-4).toUpperCase();

                  return (
                    <tr key={c.id || c._id} className={`couponRow statusRow_${c.status}`}>
                      {/* 1. Coupon ID */}
                      <td className="couponIdCell">
                        <code>#{index + 1}</code>
                      </td>

                      {/* 2. Coupon Code */}
                      <td className="couponCodeCell">
                        <div className="couponCodeBadge">
                          <Tag size={13} />
                          <b>{c.code}</b>
                        </div>
                        {c.description && (
                          <small className="couponDescHint">{c.description}</small>
                        )}
                      </td>

                      {/* 3. Discount Type */}
                      <td className="discountTypeCell">
                        <span className={`typeTag typeTag_${discountType}`}>
                          {discountType === 'percent' ? (
                            <>
                              <Percent size={12} /> Percent
                            </>
                          ) : (
                            <>
                              <IndianRupee size={12} /> Fixed
                            </>
                          )}
                        </span>
                      </td>

                      {/* 4. Discount Value */}
                      <td className="discountValCell">
                        <b className="discountHighlight">
                          {discountType === 'percent' ? `${discountVal}%` : money(discountVal)}
                        </b>
                      </td>

                      {/* 5. Min Order Value */}
                      <td className="minOrderCell">
                        {minOrder > 0 ? (
                          <b>{money(minOrder)}</b>
                        ) : (
                          <span className="noMinText">No minimum</span>
                        )}
                      </td>

                      {/* 6. Usage Limit */}
                      <td className="usageLimitCell">
                        <b>{usageLimit}</b>
                      </td>

                      {/* 7. Usage Count */}
                      <td className="usageCountCell">
                        <div className="usageCountWrap">
                          <b>{usageCount}</b>
                          <small className="remainingUsageHint">({remaining} left)</small>
                        </div>
                      </td>

                      {/* 8. Expiry Date */}
                      <td className="expiryDateCell">
                        <span className="expiryDateText">
                          <Calendar size={12} />
                          {formatDate(c.expiry_date || c.expiryDate)}
                        </span>
                      </td>

                      {/* 9. Status (Derived) */}
                      <td className="statusBadgeCell">
                        <span className={`couponStatusBadge status_${c.status}`}>
                          {c.status === 'active' && 'Active'}
                          {c.status === 'inactive' && 'Inactive'}
                          {c.status === 'expired' && 'Expired'}
                          {c.status === 'limit_reached' && 'Limit Reached'}
                        </span>
                      </td>

                      {/* 10. Is Active Toggle Switch */}
                      <td className="activeToggleCell">
                        <button
                          type="button"
                          className={`switchBtn ${isActive ? 'switchOn' : 'switchOff'}`}
                          onClick={() => handleToggleActive(c)}
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
                            title="Edit Coupon Settings"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="iconActionBtn deleteActionBtn"
                            onClick={() => setDeleteConfirmCoupon(c)}
                            title="Delete Coupon"
                          >
                            <Trash2 size={14} />
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
        ) : (
          <div className="emptyCouponsBox">
            <Tag size={40} className="emptyIcon" />
            <h4>No coupons found</h4>
            <p>
              {search || filter !== 'all'
                ? 'Try adjusting your search query or filter.'
                : 'Create your first promotional discount coupon to reward your customers.'}
            </p>
            <button
              type="button"
              className="goldBtn createCouponBtn"
              onClick={openCreateModal}
            >
              <Plus size={15} />
              <span>+ Create Coupon</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT COUPON MODAL */}
      {(showCreateModal || editingCoupon) && (
        <div className="modalOverlay" onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}>
          <div
            className="modalContainer couponFormModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modalHeader">
              <div className="modalHeaderTitle">
                <div className="modalBadge">
                  <Tag size={18} />
                </div>
                <div>
                  <h3>{editingCoupon ? `Edit Coupon ${editingCoupon.code}` : 'Create Coupon'}</h3>
                  <p>
                    {editingCoupon
                      ? 'Update discount terms and limits. Historical usage count will remain accurate.'
                      : 'Configure promotional discount codes for checkout.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="couponForm">
              {formError && (
                <div className="formErrorBanner">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {editingCoupon && (
                <div className="couponUsageNotice">
                  <span>Usage History:</span>
                  <b>
                    {editingCoupon.usage_count || editingCoupon.usageCount || 0} /{' '}
                    {editingCoupon.usage_limit || editingCoupon.usageLimit} orders redeemed
                  </b>
                </div>
              )}

              <div className="formGrid">
                {/* Coupon Code */}
                <div className="formGroup">
                  <label htmlFor="couponCodeInput">
                    Coupon Code <span className="reqStar">*</span>
                  </label>
                  <input
                    id="couponCodeInput"
                    type="text"
                    required
                    placeholder="e.g. WELCOME20"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.replace(/\s+/g, '').toUpperCase()
                      })
                    }
                    className="couponCodeInput"
                  />
                  <small className="fieldHint">Stored in uppercase. Case-insensitive at checkout.</small>
                </div>

                {/* Discount Type */}
                <div className="formGroup">
                  <label htmlFor="discountTypeSelect">
                    Discount Type <span className="reqStar">*</span>
                  </label>
                  <select
                    id="discountTypeSelect"
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed Rupee (₹)</option>
                  </select>
                  <small className="fieldHint">
                    {form.discountType === 'percent'
                      ? 'Percentage discount off cart product subtotal.'
                      : 'Fixed rupee amount deducted from product subtotal.'}
                  </small>
                </div>

                {/* Discount Value */}
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
                    />
                  </div>
                  <small className="fieldHint">
                    {form.discountType === 'percent'
                      ? 'Example: 20 means 20% discount (max 100).'
                      : 'Example: 150 means ₹150 off product subtotal.'}
                  </small>
                </div>

                {/* Minimum Order Value */}
                <div className="formGroup">
                  <label htmlFor="minOrderValueInput">
                    Min Order Value (₹)
                  </label>
                  <div className="inputWithPrefix">
                    <span className="inputPrefix">₹</span>
                    <input
                      id="minOrderValueInput"
                      type="number"
                      min="0"
                      placeholder="500"
                      value={form.minOrderValue}
                      onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                    />
                  </div>
                  <small className="fieldHint">Subtotal required before coupon applies (0 for no minimum).</small>
                </div>

                {/* Usage Limit */}
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
                  />
                  <small className="fieldHint">Maximum total successful orders that can use this coupon.</small>
                </div>

                {/* Expiry Date */}
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
                  />
                  <small className="fieldHint">Coupon expires automatically at end of selected date.</small>
                </div>
              </div>

              {/* Description */}
              <div className="formGroup fullWidth">
                <label htmlFor="descriptionInput">Description / Campaign Notes (Optional)</label>
                <input
                  id="descriptionInput"
                  type="text"
                  placeholder="e.g. Festive Special Offer for new visitors"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Is Active Toggle */}
              <div className="formToggleGroup">
                <label className="toggleLabel" htmlFor="modalActiveToggle">
                  <span>Is Active:</span>
                  <input
                    type="checkbox"
                    id="modalActiveToggle"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span className={`toggleStatusText ${form.isActive ? 'activeText' : 'inactiveText'}`}>
                    {form.isActive ? 'Active (Customer can apply)' : 'Inactive (Paused / Unavailable)'}
                  </span>
                </label>
              </div>

              <div className="modalFooterActions">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn"
                  disabled={formLoading}
                >
                  {formLoading
                    ? 'Saving…'
                    : editingCoupon
                    ? 'Update Coupon'
                    : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmCoupon && (
        <div className="modalOverlay" onClick={() => setDeleteConfirmCoupon(null)}>
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
                className="outlineBtn"
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
