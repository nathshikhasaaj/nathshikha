import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Search,
  X,
  ArrowRight,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Layers,
  Tag,
  Package
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './AdminCategoryManager.css';

export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoryManager({ onCategoriesUpdated }) {
  const { setToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState('');

  // Form States (for Add & Edit)
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSlugManual, setFormSlugManual] = useState(false);
  const [formStatus, setFormStatus] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(1);
  const [formErrors, setFormErrors] = useState({});

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api('/categories/admin/all');
      if (Array.isArray(data)) {
        setCategories(data);
        if (onCategoriesUpdated) onCategoriesUpdated(data);
      }
    } catch (err) {
      setToast(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Stats calculation
  const totalCategories = categories.length;
  const activeCategoriesCount = categories.filter((c) => c.isActive !== false).length;
  const inactiveCategoriesCount = categories.filter((c) => c.isActive === false).length;
  const totalProductsAssigned = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.slug || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? c.isActive !== false
          : c.isActive === false;

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const nextOrder = categories.length > 0
      ? Math.max(...categories.map((c) => c.displayOrder || 0)) + 1
      : 1;

    setFormName('');
    setFormSlug('');
    setFormSlugManual(false);
    setFormStatus(true);
    setFormDisplayOrder(nextOrder);
    setFormErrors({});
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormName(category.name || '');
    setFormSlug(category.slug || '');
    setFormSlugManual(true);
    setFormStatus(category.isActive !== false);
    setFormDisplayOrder(category.displayOrder || 1);
    setFormErrors({});
  };

  // Handle Category Name Change with Automatic Slug Suggestion
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormName(newName);
    if (!formSlugManual) {
      setFormSlug(slugify(newName));
    }
  };

  // Handle Manual Slug Change
  const handleSlugChange = (e) => {
    setFormSlugManual(true);
    setFormSlug(slugify(e.target.value));
  };

  // Validate form
  const validateCategoryForm = (isEditingId = null) => {
    const errors = {};
    const trimmedName = formName.trim();
    const cleanSlug = slugify(formSlug || trimmedName);

    if (!trimmedName) {
      errors.name = 'Category name is required.';
    } else if (/<[a-z][\s\S]*>/i.test(trimmedName)) {
      errors.name = 'Category name contains invalid characters or markup.';
    } else {
      const dupName = categories.find(
        (c) =>
          c.name.toLowerCase().trim() === trimmedName.toLowerCase() &&
          (!isEditingId || c.id !== isEditingId)
      );
      if (dupName) {
        errors.name = `A category named "${trimmedName}" already exists.`;
      }
    }

    if (!cleanSlug) {
      errors.slug = 'A valid URL-safe slug is required.';
    } else {
      const dupSlug = categories.find(
        (c) =>
          c.slug.toLowerCase().trim() === cleanSlug.toLowerCase() &&
          (!isEditingId || c.id !== isEditingId)
      );
      if (dupSlug) {
        errors.slug = `The slug "${cleanSlug}" is already in use by another category.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Category (Create or Edit)
  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    const isEditing = Boolean(editingCategory);
    const isValid = validateCategoryForm(isEditing ? editingCategory.id : null);
    if (!isValid) return;

    setBusy(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: slugify(formSlug || formName.trim()),
        isActive: Boolean(formStatus),
        displayOrder: Number(formDisplayOrder || 0)
      };

      if (isEditing) {
        const updated = await api(`/categories/admin/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setToast(`✓ Category "${updated.name}" updated successfully.`);
        setEditingCategory(null);
      } else {
        const created = await api('/categories/admin', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToast(`✓ Category "${created.name}" created successfully.`);
        setShowAddModal(false);
      }

      await loadCategories();
    } catch (err) {
      setToast(err.message || 'Failed to save category');
    } finally {
      setBusy(false);
    }
  };

  // Toggle Category Active / Inactive Status
  const handleToggleStatus = async (cat) => {
    setBusy(true);
    try {
      const nextStatus = !cat.isActive;
      await api(`/categories/admin/${cat.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus })
      });
      setToast(
        nextStatus
          ? `✓ Category "${cat.name}" is now Active on storefront.`
          : `ℹ Category "${cat.name}" is now Inactive (hidden from storefront navigation & filters).`
      );
      await loadCategories();
    } catch (err) {
      setToast(err.message || 'Failed to update category status');
    } finally {
      setBusy(false);
    }
  };

  // Quick Display Order Adjustment
  const handleAdjustOrder = async (cat, delta) => {
    const newOrder = Math.max(1, (cat.displayOrder || 1) + delta);
    if (newOrder === cat.displayOrder) return;

    try {
      await api(`/categories/admin/${cat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayOrder: newOrder })
      });
      await loadCategories();
    } catch (err) {
      setToast(err.message || 'Failed to adjust order');
    }
  };

  // Open Delete / Reassign Modal
  const handleOpenDelete = (cat) => {
    setDeleteModalCategory(cat);
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setReassignTargetId(otherCats.length > 0 ? otherCats[0].id : '');
  };

  // Reassign Products
  const handleReassignProducts = async () => {
    if (!deleteModalCategory || !reassignTargetId) return;

    const targetCat = categories.find((c) => c.id === reassignTargetId);
    if (!targetCat) return;

    setBusy(true);
    try {
      const res = await api(`/categories/admin/${deleteModalCategory.id}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ targetCategoryId: reassignTargetId })
      });

      setToast(`✓ Reassigned ${res.reassignedCount || deleteModalCategory.productCount} product(s) to "${targetCat.name}".`);
      await loadCategories();

      setDeleteModalCategory((prev) => (prev ? { ...prev, productCount: 0 } : null));
    } catch (err) {
      setToast(err.message || 'Failed to reassign products');
    } finally {
      setBusy(false);
    }
  };

  // Confirm Safe Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalCategory) return;

    setBusy(true);
    try {
      await api(`/categories/admin/${deleteModalCategory.id}`, {
        method: 'DELETE'
      });
      setToast(`✓ Category "${deleteModalCategory.name}" permanently deleted.`);
      setDeleteModalCategory(null);
      await loadCategories();
    } catch (err) {
      setToast(err.message || 'Failed to delete category');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adminCategoryManager">
      {/* 1. Brand Page Header */}
      <div className="catHeaderCard">
        <div className="catHeaderTop">
          <div className="catHeaderTitles">
            <div className="catSectionPill">
              <Sparkles size={13} color="var(--admin-gold, #b8860b)" />
              <span>Catalog Management</span>
            </div>
            <h2 className="catMainTitle">Category Management</h2>
            <p className="catMainSub">
              Manage product collections, storefront visibility, and navigation display order.
            </p>
          </div>

          <div className="catHeaderActions">
            <button
              type="button"
              className="goldBtn catAddPrimaryBtn"
              onClick={handleOpenAdd}
              disabled={busy}
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
            <button
              type="button"
              className="catRefreshBtn"
              onClick={loadCategories}
              disabled={loading || busy}
              title="Refresh categories"
            >
              <RefreshCw size={15} className={loading ? 'spinAnimation' : ''} />
            </button>
          </div>
        </div>

        {/* 2. KPI Metrics Grid */}
        <div className="catKpiGrid">
          <div className="catKpiCard">
            <div className="kpiTop">
              <span className="kpiLabel">Total Categories</span>
              <div className="kpiIconBadge kpiIconMaroon">
                <FolderTree size={16} />
              </div>
            </div>
            <div className="kpiValue">{totalCategories}</div>
            <span className="kpiSub">In store catalog</span>
          </div>

          <div className="catKpiCard kpiLiveCard">
            <div className="kpiTop">
              <span className="kpiLabel">Active (Live)</span>
              <div className="kpiIconBadge kpiIconGreen">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="kpiValue textGreen">{activeCategoriesCount}</div>
            <span className="kpiSub">Visible in menus & filters</span>
          </div>

          <div className="catKpiCard">
            <div className="kpiTop">
              <span className="kpiLabel">Inactive (Hidden)</span>
              <div className="kpiIconBadge kpiIconNeutral">
                <Layers size={16} />
              </div>
            </div>
            <div className="kpiValue textMuted">{inactiveCategoriesCount}</div>
            <span className="kpiSub">Hidden safely from storefront</span>
          </div>

          <div className="catKpiCard kpiGoldCard">
            <div className="kpiTop">
              <span className="kpiLabel">Products Assigned</span>
              <div className="kpiIconBadge kpiIconGold">
                <Package size={16} />
              </div>
            </div>
            <div className="kpiValue textGold">{totalProductsAssigned}</div>
            <span className="kpiSub">Total linked products</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="catControlsBar">
        <div className="catSearchBox">
          <Search size={16} className="catSearchIcon" />
          <input
            type="text"
            className="catSearchInput"
            placeholder="Search categories by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="catClearSearchBtn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="catFilterPills">
          <button
            type="button"
            className={`catFilterPill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="catPillBadge">{totalCategories}</span>
          </button>
          <button
            type="button"
            className={`catFilterPill ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active <span className="catPillBadge">{activeCategoriesCount}</span>
          </button>
          <button
            type="button"
            className={`catFilterPill ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive <span className="catPillBadge">{inactiveCategoriesCount}</span>
          </button>
        </div>
      </div>

      {/* 4. Table / Cards View */}
      <div className="catTableCard">
        {loading ? (
          <div className="catLoadingWrap">
            <div className="spinAnimation">
              <RefreshCw size={28} color="var(--admin-gold, #b8860b)" />
            </div>
            <p>Loading categories…</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="catEmptyWrap">
            <div className="catEmptyIcon">
              <FolderTree size={36} />
            </div>
            <h4>{searchQuery ? 'No matching categories found' : 'No categories yet'}</h4>
            <p>
              {searchQuery
                ? `No categories match "${searchQuery}". Try a different keyword.`
                : 'Get started by creating your first product category for the storefront.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="goldBtn catEmptyAddBtn"
                onClick={handleOpenAdd}
              >
                <Plus size={16} /> Add Category
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="catDesktopTableWrap">
              <table className="catTable">
                <thead>
                  <tr>
                    <th style={{ width: '75px', textAlign: 'center' }}>Order</th>
                    <th>Category Name</th>
                    <th>Slug / URL</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((cat) => {
                    const isActive = cat.isActive !== false;
                    const createdDate = cat.createdAt
                      ? new Date(cat.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <tr key={cat.id} className={!isActive ? 'catRowInactive' : ''}>
                        {/* Order Column */}
                        <td style={{ textAlign: 'center' }}>
                          <div className="catOrderBox">
                            <span className="catOrderNum">{cat.displayOrder || 0}</span>
                            <div className="catOrderArrows">
                              <button
                                type="button"
                                className="catArrowBtn"
                                title="Move Earlier (Higher Display Priority)"
                                onClick={() => handleAdjustOrder(cat, -1)}
                              >
                                <ChevronUp size={11} />
                              </button>
                              <button
                                type="button"
                                className="catArrowBtn"
                                title="Move Later (Lower Display Priority)"
                                onClick={() => handleAdjustOrder(cat, 1)}
                              >
                                <ChevronDown size={11} />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name Column */}
                        <td>
                          <div className="catNameWrapper">
                            <span className={`catDot ${isActive ? 'catDotActive' : 'catDotInactive'}`} />
                            <span className="catNameHeading">{cat.name}</span>
                          </div>
                        </td>

                        {/* Slug Column */}
                        <td>
                          <code className="catSlugPill">/category/{cat.slug}</code>
                        </td>

                        {/* Product Count Column */}
                        <td>
                          <span className={`catCountBadge ${cat.productCount > 0 ? 'hasCount' : 'zeroCount'}`}>
                            {cat.productCount || 0} {cat.productCount === 1 ? 'piece' : 'pieces'}
                          </span>
                        </td>

                        {/* Status Column */}
                        <td>
                          <button
                            type="button"
                            className={`catStatusBadge ${isActive ? 'statusActive' : 'statusInactive'}`}
                            onClick={() => handleToggleStatus(cat)}
                            title={`Click to switch to ${isActive ? 'Inactive' : 'Active'}`}
                          >
                            <span className="catStatusDot" />
                            <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                          </button>
                        </td>

                        {/* Created Date */}
                        <td>
                          <span className="catDateText">{createdDate}</span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="catRowActions">
                            <button
                              type="button"
                              className="catEditBtn"
                              onClick={() => handleOpenEdit(cat)}
                              title="Edit Category Details"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className={`catDeleteBtn ${cat.productCount > 0 ? 'reassignBtnStyle' : ''}`}
                              onClick={() => handleOpenDelete(cat)}
                              title={cat.productCount > 0 ? 'Reassign products before deleting' : 'Delete Category'}
                            >
                              <Trash2 size={13} />
                              <span>{cat.productCount > 0 ? 'Safe Delete' : 'Delete'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (<= 768px) */}
            <div className="catMobileCardsGrid">
              {filteredCategories.map((cat) => {
                const isActive = cat.isActive !== false;
                return (
                  <div key={cat.id} className={`catMobileCard ${!isActive ? 'cardInactive' : ''}`}>
                    <div className="catCardHeaderRow">
                      <div className="catCardTitleWrap">
                        <span className={`catDot ${isActive ? 'catDotActive' : 'catDotInactive'}`} />
                        <h4 className="catCardTitle">{cat.name}</h4>
                      </div>

                      <button
                        type="button"
                        className={`catStatusBadge ${isActive ? 'statusActive' : 'statusInactive'}`}
                        onClick={() => handleToggleStatus(cat)}
                      >
                        <span className="catStatusDot" />
                        <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </div>

                    <div className="catCardSlugRow">
                      <code className="catSlugPill">/category/{cat.slug}</code>
                    </div>

                    <div className="catCardMetaRow">
                      <div className="catMetaItem">
                        <span className="catMetaLabel">Products:</span>
                        <span className={`catCountBadge ${cat.productCount > 0 ? 'hasCount' : 'zeroCount'}`}>
                          {cat.productCount || 0} pieces
                        </span>
                      </div>

                      <div className="catMetaItem">
                        <span className="catMetaLabel">Order:</span>
                        <div className="catOrderBox">
                          <span className="catOrderNum">{cat.displayOrder || 0}</span>
                          <div className="catOrderArrows">
                            <button
                              type="button"
                              className="catArrowBtn"
                              onClick={() => handleAdjustOrder(cat, -1)}
                            >
                              <ChevronUp size={11} />
                            </button>
                            <button
                              type="button"
                              className="catArrowBtn"
                              onClick={() => handleAdjustOrder(cat, 1)}
                            >
                              <ChevronDown size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="catCardActionsRow">
                      <button
                        type="button"
                        className="catEditBtn"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className={`catDeleteBtn ${cat.productCount > 0 ? 'reassignBtnStyle' : ''}`}
                        onClick={() => handleOpenDelete(cat)}
                      >
                        <Trash2 size={13} />
                        <span>{cat.productCount > 0 ? 'Safe Delete' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT CATEGORY MODAL                                                 */}
      {/* ========================================================================= */}
      {(showAddModal || Boolean(editingCategory)) && (
        <div
          className="modalOverlay catModalOverlay"
          onClick={() => {
            if (!busy) {
              setShowAddModal(false);
              setEditingCategory(null);
            }
          }}
        >
          <div className="catModalContainer" onClick={(e) => e.stopPropagation()}>
            <div className="catModalHeader">
              <div className="catModalTitleWrap">
                <FolderTree size={20} color="var(--admin-gold, #b8860b)" />
                <div>
                  <h3 className="catModalTitle">
                    {editingCategory ? `Edit Category` : 'Add New Category'}
                  </h3>
                  <p className="catModalSubtitle">
                    {editingCategory
                      ? `Updating details for "${editingCategory.name}"`
                      : 'Create a product category for storefront navigation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="catModalCloseBtn"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCategory(null);
                }}
                disabled={busy}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="catModalForm">
              {/* Category Name */}
              <div className="catFormField">
                <label className="catFieldLabel">
                  <span>Category Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Nath"
                  value={formName}
                  onChange={handleNameChange}
                  className={`catInput ${formErrors.name ? 'catInputError' : ''}`}
                  autoFocus
                />
                {formErrors.name && <span className="catFieldError">{formErrors.name}</span>}
              </div>

              {/* Slug with Auto Suggestion */}
              <div className="catFormField">
                <div className="catFieldLabelRow">
                  <label className="catFieldLabel">
                    <span>URL Slug *</span>
                  </label>
                  <span className="catFieldNote">Auto-generated & URL-safe</span>
                </div>
                <div className="catSlugInputGroup">
                  <span className="catSlugPrefix">/category/</span>
                  <input
                    type="text"
                    required
                    placeholder="traditional-nath"
                    value={formSlug}
                    onChange={handleSlugChange}
                    className={`catInput catSlugInput ${formErrors.slug ? 'catInputError' : ''}`}
                  />
                </div>
                {formErrors.slug && <span className="catFieldError">{formErrors.slug}</span>}
                <small className="catFieldHint">
                  Storefront link: <code>https://nathshikha.in/category/{formSlug || 'slug'}</code>
                </small>
              </div>

              {/* Display Order & Status Row */}
              <div className="catFormRow">
                <div className="catFormField">
                  <label className="catFieldLabel">
                    <span>Display Order</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(e.target.value)}
                    className="catInput"
                  />
                  <small className="catFieldHint">Lower numbers appear earlier in menus.</small>
                </div>

                <div className="catFormField">
                  <label className="catFieldLabel">
                    <span>Storefront Visibility</span>
                  </label>
                  <div className="catStatusRadios">
                    <label className={`catRadioCard ${formStatus ? 'isSelected' : ''}`}>
                      <input
                        type="radio"
                        name="categoryStatusRadio"
                        checked={formStatus}
                        onChange={() => setFormStatus(true)}
                      />
                      <div className="catRadioText">
                        <b>Active</b>
                        <small>Visible in store</small>
                      </div>
                    </label>

                    <label className={`catRadioCard ${!formStatus ? 'isSelected' : ''}`}>
                      <input
                        type="radio"
                        name="categoryStatusRadio"
                        checked={!formStatus}
                        onChange={() => setFormStatus(false)}
                      />
                      <div className="catRadioText">
                        <b>Inactive</b>
                        <small>Hidden from store</small>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Editing Cascade Info Box */}
              {editingCategory && (
                <div className="catCascadeNotice">
                  <Sparkles size={16} color="var(--admin-gold, #b8860b)" />
                  <div>
                    <b>Automatic Product Synchronization:</b>
                    <p>
                      Renaming this category will immediately update all{' '}
                      <b>{editingCategory.productCount || 0} linked product(s)</b> in the database, customer menus, and category filters.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="catModalFooter">
                <button
                  type="button"
                  className="outlineBtn btnSmall"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn btnSmall"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAFE DELETE / REASSIGN PRODUCTS MODAL                                    */}
      {/* ========================================================================= */}
      {deleteModalCategory && (
        <div
          className="modalOverlay catModalOverlay"
          onClick={() => {
            if (!busy) setDeleteModalCategory(null);
          }}
        >
          <div className="catModalContainer catDeleteModal" onClick={(e) => e.stopPropagation()}>
            <div className="catModalHeader catDeleteHeader">
              <div className="catModalTitleWrap">
                <ShieldAlert
                  size={22}
                  color={deleteModalCategory.productCount > 0 ? '#d97706' : '#b91c1c'}
                />
                <div>
                  <h3 className="catModalTitle">
                    {deleteModalCategory.productCount > 0
                      ? 'Safe Deletion Protected'
                      : 'Confirm Delete Category'}
                  </h3>
                  <p className="catModalSubtitle">
                    Category: <b>"{deleteModalCategory.name}"</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="catModalCloseBtn"
                onClick={() => setDeleteModalCategory(null)}
                disabled={busy}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="catDeleteModalBody">
              {deleteModalCategory.productCount > 0 ? (
                /* CASE A: Category contains products -> Reassignment Workflow */
                <div className="catReassignWorkflow">
                  <div className="catWarningBanner">
                    <AlertTriangle size={20} className="catWarningIcon" />
                    <div>
                      <h5>Cannot delete category with active products</h5>
                      <p>
                        <b>"{deleteModalCategory.name}"</b> currently contains{' '}
                        <b>{deleteModalCategory.productCount} product(s)</b>. To protect storefront URLs and avoid orphaned products, please reassign these pieces to another category first.
                      </p>
                    </div>
                  </div>

                  <div className="catFormField">
                    <label className="catFieldLabel">
                      <span>Select Target Category to Reassign Products:</span>
                    </label>
                    <select
                      value={reassignTargetId}
                      onChange={(e) => setReassignTargetId(e.target.value)}
                      className="catInput catSelect"
                    >
                      <option value="">-- Choose destination category --</option>
                      {categories
                        .filter((c) => c.id !== deleteModalCategory.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.productCount || 0} existing products)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="catReassignBtnRow">
                    <button
                      type="button"
                      className="goldBtn btnSmall"
                      onClick={handleReassignProducts}
                      disabled={!reassignTargetId || busy}
                    >
                      <ArrowRight size={14} />
                      <span>Reassign {deleteModalCategory.productCount} Products</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE B: Category has 0 products -> Safe Deletion Confirmation */
                <div className="catSafeDeleteConfirmation">
                  <div className="catDeleteIconWrap">
                    <Trash2 size={28} />
                  </div>
                  <h4>Permanently delete "{deleteModalCategory.name}"?</h4>
                  <p>
                    This category has <b>0 products</b> assigned. Deleting it will remove it permanently from the database and storefront.
                  </p>
                  <span className="catDangerNotice">This action cannot be undone.</span>
                </div>
              )}
            </div>

            <div className="catModalFooter">
              <button
                type="button"
                className="outlineBtn btnSmall"
                onClick={() => setDeleteModalCategory(null)}
                disabled={busy}
              >
                Cancel
              </button>

              {deleteModalCategory.productCount === 0 && (
                <button
                  type="button"
                  className="catConfirmDeleteBtn"
                  onClick={handleConfirmDelete}
                  disabled={busy}
                >
                  <Trash2 size={13} />
                  <span>{busy ? 'Deleting…' : 'Delete Permanently'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
