import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Tag,
  Calendar,
  Image as ImageIcon,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';
import './AdminHallOfFameManager.css';

const OCCASIONS = [
  'Wedding',
  'Engagement',
  'Reception',
  'Haldi',
  'Mehendi',
  'Haldi & Mehendi',
  'Sangeet',
  'Festival',
  'Traditional Ceremony',
  'Other'
];

const emptyStoryForm = {
  id: null,
  customer_name: '',
  photo_url: '',
  photo_urls: [],
  occasion: 'Wedding',
  customOccasion: '',
  description: '',
  products: [],
  is_visible: true,
  display_order: 1,
  photo_consent: true,
  order_id: ''
};

export default function AdminHallOfFameManager({
  stories = [],
  products = [],
  onRefresh,
  loading = false
}) {
  const { setToast } = useToast();
  const fileInputRef = useRef(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [occasionFilter, setOccasionFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyStoryForm);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Product search within modal
  const [productSearch, setProductSearch] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Image Lightbox in Admin
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Filtered Stories
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // Occasion filter
      if (occasionFilter !== 'all' && story.occasion !== occasionFilter) {
        return false;
      }
      // Visibility filter
      if (visibilityFilter === 'active' && !story.is_visible) return false;
      if (visibilityFilter === 'hidden' && story.is_visible) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (story.customer_name || '').toLowerCase().includes(q);
        const descMatch = (story.description || '').toLowerCase().includes(q);
        const occasionMatch = (story.occasion || '').toLowerCase().includes(q);
        const orderMatch = (story.order_id || '').toLowerCase().includes(q);
        const prodMatch = (story.products || []).some((p) =>
          (p?.name || '').toLowerCase().includes(q)
        );
        return nameMatch || descMatch || occasionMatch || orderMatch || prodMatch;
      }

      return true;
    });
  }, [stories, occasionFilter, visibilityFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = stories.length;
    const active = stories.filter((s) => s.is_visible).length;
    const hidden = total - active;
    return { total, active, hidden };
  }, [stories]);

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    const nextOrder = stories.length > 0 ? Math.max(...stories.map((s) => s.display_order || 0)) + 1 : 1;
    setFormData({
      ...emptyStoryForm,
      display_order: nextOrder
    });
    setProductSearch('');
    setShowModal(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (story) => {
    setIsEditing(true);
    const isCustomOcc = !OCCASIONS.slice(0, -1).includes(story.occasion);
    const urls = Array.isArray(story.photo_urls) && story.photo_urls.length > 0
      ? story.photo_urls
      : (story.photo_url ? [story.photo_url] : []);

    setFormData({
      id: story.id,
      customer_name: story.customer_name || '',
      photo_url: urls[0] || story.photo_url || '',
      photo_urls: urls,
      occasion: isCustomOcc ? 'Other' : (story.occasion || 'Wedding'),
      customOccasion: isCustomOcc ? story.occasion : '',
      description: story.description || '',
      products: (story.products || []).map((p) => (typeof p === 'object' ? p.id || p._id : p)),
      is_visible: story.is_visible !== false,
      display_order: story.display_order ?? 1,
      photo_consent: story.photo_consent !== false,
      order_id: story.order_id || ''
    });
    setProductSearch('');
    setShowModal(true);
  };

  // Handle Image Upload (supports single or multiple files)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const isImg = file.type ? file.type.startsWith('image/') : /\.(jpe?g|png|webp|gif|heic|heif|avif|jfif)$/i.test(file.name);
      if (!isImg) {
        setToast('Please select valid JPG, PNG, WEBP, HEIC or GIF images.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setToast('Each image file size must be under 25MB.');
        return;
      }
    }

    setUploadingImage(true);
    const data = new FormData();
    files.forEach((f) => data.append('images', f));

    try {
      const res = await api('/hall-of-fame/admin/upload-multiple', {
        method: 'POST',
        body: data
      });

      const newUrls = res.urls || (res.url ? [res.url] : []);
      setFormData((prev) => {
        const combined = [...(prev.photo_urls || []), ...newUrls].slice(0, 10);
        return {
          ...prev,
          photo_urls: combined,
          photo_url: combined[0] || ''
        };
      });
      setToast(`✓ ${newUrls.length} photo(s) uploaded successfully!`);
    } catch (err) {
      setToast(err.message || 'Failed to upload photo(s)');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove a specific photo
  const handleRemovePhoto = (indexToRemove) => {
    setFormData((prev) => {
      const updated = (prev.photo_urls || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        photo_urls: updated,
        photo_url: updated[0] || ''
      };
    });
  };

  // Set a specific photo as primary cover
  const handleSetPrimaryPhoto = (indexToPrimary) => {
    setFormData((prev) => {
      const list = [...(prev.photo_urls || [])];
      const [item] = list.splice(indexToPrimary, 1);
      list.unshift(item);
      return {
        ...prev,
        photo_urls: list,
        photo_url: list[0] || ''
      };
    });
    setToast('Cover photo updated');
  };

  // Product Selection Toggle
  const handleToggleProduct = (prodId) => {
    setFormData((prev) => {
      const exists = prev.products.includes(prodId);
      return {
        ...prev,
        products: exists
          ? prev.products.filter((id) => id !== prodId)
          : [...prev.products, prodId]
      };
    });
  };

  // Submit Story (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPhotoUrls = (formData.photo_urls || []).filter(Boolean);

    if (!finalPhotoUrls.length && !formData.photo_url) {
      setToast('Please upload at least one customer photo.');
      return;
    }

    if (!formData.photo_consent) {
      setToast('Customer permission is required before publishing photographs.');
      return;
    }

    setSaving(true);
    const finalOccasion =
      formData.occasion === 'Other' && formData.customOccasion.trim()
        ? formData.customOccasion.trim()
        : formData.occasion;

    const payload = {
      customer_name: formData.customer_name.trim(),
      photo_url: finalPhotoUrls[0] || formData.photo_url.trim(),
      photo_urls: finalPhotoUrls.length ? finalPhotoUrls : [formData.photo_url.trim()],
      occasion: finalOccasion,
      description: formData.description.trim(),
      products: formData.products,
      is_visible: formData.is_visible,
      display_order: Number(formData.display_order) || 0,
      photo_consent: formData.photo_consent,
      order_id: formData.order_id.trim()
    };

    try {
      if (isEditing && formData.id) {
        await api(`/hall-of-fame/admin/${formData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setToast('✓ Hall of Fame story updated successfully!');
      } else {
        await api('/hall-of-fame/admin', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToast('✓ New bride story published to Hall of Fame!');
      }

      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to save Hall of Fame story');
    } finally {
      setSaving(false);
    }
  };

  // Quick Toggle Visibility
  const handleToggleVisibility = async (story) => {
    const newVisibility = !story.is_visible;
    try {
      await api(`/hall-of-fame/admin/${story.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ is_visible: newVisibility })
      });
      setToast(
        `Story for ${story.customer_name || 'Bride'} set to ${
          newVisibility ? 'Active (Visible)' : 'Hidden'
        }`
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to update visibility');
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/hall-of-fame/admin/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      setToast('✓ Hall of Fame story deleted.');
      setDeleteTarget(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to delete story');
    } finally {
      setDeleting(false);
    }
  };

  // Filter products for the modal selector
  const selectableProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  return (
    <div className="hofManagerContainer">
      {/* 1. Header & Summary Stats */}
      <div className="hofHeaderRow">
        <div className="hofTitleCol">
          <div className="hofTitleBadge">
            <Sparkles size={14} /> <span>OUR BRIDES & CUSTOMERS</span>
          </div>
          <h2>Hall of Fame Management</h2>
          <p className="hofSubtitle">
            Showcase real brides wearing Nathshikha jewellery. Upload customer photos, tag jewellery pieces, and control gallery display order.
          </p>
        </div>

        <div className="hofTopActions">
          <button
            className="hofAddBtn"
            type="button"
            onClick={handleOpenCreate}
          >
            <Plus size={16} /> <span>+ ADD BRIDE STORY</span>
          </button>
          <button
            className="hofRefreshBtn"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Stories"
          >
            <RefreshCw size={15} className={loading ? 'spinIcon' : ''} />
            <span>{loading ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Counters & Filter Bar */}
      <div className="hofStatsGrid">
        <div className="hofStatCard" onClick={() => setVisibilityFilter('all')}>
          <div className="statNumber">{stats.total}</div>
          <div className="statLabel">Total Stories</div>
        </div>
        <div
          className={`hofStatCard activeStat ${visibilityFilter === 'active' ? 'selected' : ''}`}
          onClick={() => setVisibilityFilter('active')}
        >
          <div className="statNumber">{stats.active}</div>
          <div className="statLabel">Active on Website</div>
        </div>
        <div
          className={`hofStatCard hiddenStat ${visibilityFilter === 'hidden' ? 'selected' : ''}`}
          onClick={() => setVisibilityFilter('hidden')}
        >
          <div className="statNumber">{stats.hidden}</div>
          <div className="statLabel">Hidden Stories</div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="hofFilterBar">
        <div className="hofSearchWrapper">
          <Search size={15} className="searchIcon" />
          <input
            type="text"
            placeholder="Search by bride name, occasion, description, or jewellery..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="hofFilterGroup">
          <div className="selectWrapper">
            <Filter size={13} className="selectIcon" />
            <select
              value={occasionFilter}
              onChange={(e) => setOccasionFilter(e.target.value)}
            >
              <option value="all">All Occasions</option>
              {OCCASIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          <div className="selectWrapper">
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
            >
              <option value="all">All Visibility</option>
              <option value="active">Active Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Stories Table / Cards */}
      {filteredStories.length === 0 ? (
        <div className="hofEmptyState">
          <ImageIcon size={44} strokeWidth={1.2} />
          <h3>No Hall of Fame stories found</h3>
          <p>
            {searchQuery || occasionFilter !== 'all' || visibilityFilter !== 'all'
              ? 'Try clearing your search filters to see all bride stories.'
              : 'Add your first customer story to celebrate real brides wearing Nathshikha jewellery.'}
          </p>
          <button className="hofAddBtn" onClick={handleOpenCreate} type="button">
            <Plus size={15} /> <span>+ Add First Bride Story</span>
          </button>
        </div>
      ) : (
        <div className="hofTableWrapper">
          <table className="hofTable">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Photo</th>
                <th>Bride / Customer</th>
                <th>Occasion</th>
                <th>Jewellery Featured</th>
                <th>Display Order</th>
                <th>Photo Consent</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStories.map((story) => {
                const linkedProducts = story.products || [];
                const hasConsent = story.photo_consent !== false;
                return (
                  <tr key={story.id} className={!story.is_visible ? 'rowHidden' : ''}>
                    {/* Thumbnail */}
                    <td>
                      <div
                        className="hofThumbnailBox"
                        onClick={() => setPreviewPhoto(story.photo_url)}
                        title="Click to expand photo"
                      >
                        <img
                          src={story.photo_url}
                          alt={story.customer_name || 'Bride photo'}
                          loading="lazy"
                        />
                        <span className="expandHint">
                          <Eye size={12} />
                        </span>
                      </div>
                    </td>

                    {/* Customer Name */}
                    <td>
                      <div className="hofBrideNameCell">
                        <strong>
                          {story.customer_name || (
                            <span className="dimText">Anonymous Bride</span>
                          )}
                        </strong>
                        {story.order_id && (
                          <span className="orderBadge">Order: {story.order_id}</span>
                        )}
                        {story.description && (
                          <p className="tableDescPreview">{story.description}</p>
                        )}
                      </div>
                    </td>

                    {/* Occasion */}
                    <td>
                      <span className="occasionBadge">{story.occasion || 'Wedding'}</span>
                    </td>

                    {/* Jewellery Featured */}
                    <td>
                      <div className="jewelleryChipsList">
                        {linkedProducts.length === 0 ? (
                          <span className="dimText" style={{ fontSize: '11px' }}>
                            None selected
                          </span>
                        ) : (
                          linkedProducts.map((p, idx) => {
                            if (!p) return null;
                            return (
                              <span key={p.id || p._id || idx} className="jewelleryChip">
                                <Tag size={10} />
                                <span>{p.name}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* Display Order */}
                    <td>
                      <span className="orderNumberBadge">
                        #{story.display_order ?? 0}
                      </span>
                    </td>

                    {/* Photo Consent */}
                    <td>
                      {hasConsent ? (
                        <span className="statusToggleBtn active" style={{ cursor: 'default' }}>
                          <ShieldCheck size={12} /> <span>Consent Granted</span>
                        </span>
                      ) : (
                        <span className="statusToggleBtn" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fcd34d', cursor: 'default' }}>
                          <AlertCircle size={12} /> <span>No Consent</span>
                        </span>
                      )}
                    </td>

                    {/* Visibility Switch */}
                    <td>
                      <button
                        className={`visToggleBtn ${story.is_visible ? 'visActive' : 'visHidden'}`}
                        type="button"
                        onClick={() => handleToggleVisibility(story)}
                        title={story.is_visible ? 'Click to hide from website' : 'Click to show on website'}
                      >
                        {story.is_visible ? (
                          <>
                            <Eye size={12} /> <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} /> <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td>
                      <span className="dateText">
                        {new Date(story.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="hofActionBtns">
                        <button
                          className="editActionBtn"
                          type="button"
                          onClick={() => handleOpenEdit(story)}
                          title="Edit Story"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="deleteActionBtn"
                          type="button"
                          onClick={() => setDeleteTarget(story)}
                          title="Delete Story"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT STORY FORM                             */}
      {/* ============================================================ */}
      {showModal && (
        <div className="hofModalOverlay" onClick={() => setShowModal(false)}>
          <div
            className="hofModalContent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hofModalHeader">
              <div className="modalTitleBox">
                <Sparkles size={18} color="var(--gold)" />
                <h3>{isEditing ? 'Edit Hall of Fame Story' : 'Add New Bride Story'}</h3>
              </div>
              <button
                className="closeModalBtn"
                onClick={() => setShowModal(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="hofModalForm">
              <div className="hofModalScrollBody">
                {/* 1. Multiple Bride Photographs Upload Field */}
                <div className="formSection">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="formLabel requiredLabel">
                      Customer / Bride Photographs ({formData.photo_urls?.length || (formData.photo_url ? 1 : 0)} uploaded)
                    </label>
                    <span style={{ fontSize: '11.5px', color: 'var(--gold)', fontWeight: 600 }}>
                      Multiple photos supported (Max 10)
                    </span>
                  </div>
                  <p className="formHelperText">
                    Upload high-quality ceremony & jewellery photos shared by the bride. The 1st photo serves as the primary cover.
                  </p>

                  <div className="multiPhotoGalleryContainer">
                    {/* Existing Uploaded Photos Grid */}
                    {Array.isArray(formData.photo_urls) && formData.photo_urls.length > 0 && (
                      <div className="adminMultiPhotoGrid">
                        {formData.photo_urls.map((url, idx) => (
                          <div key={idx} className={`adminPhotoThumbCard ${idx === 0 ? 'isPrimaryCover' : ''}`}>
                            <img src={url} alt={`Bride photo ${idx + 1}`} className="adminThumbImg" />
                            {idx === 0 && <span className="primaryCoverBadge">⭐ Cover Photo</span>}
                            <div className="adminThumbOverlay">
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  className="setCoverBtn"
                                  title="Make this the primary cover photo"
                                  onClick={() => handleSetPrimaryPhoto(idx)}
                                >
                                  Make Cover
                                </button>
                              )}
                              <button
                                type="button"
                                className="removeThumbBtn"
                                title="Remove photo"
                                onClick={() => handleRemovePhoto(idx)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Drop Button */}
                    <div
                      className={`uploadDropArea ${(formData.photo_urls?.length || 0) > 0 ? 'uploadDropAreaCompact' : ''} ${uploadingImage ? 'isUploading' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={(formData.photo_urls?.length || 0) > 0 ? 20 : 30} className="uploadIcon" />
                      <strong>
                        {uploadingImage
                          ? 'Uploading photographs...'
                          : (formData.photo_urls?.length || 0) > 0
                          ? '+ Add More Photos (Select Multiple)'
                          : 'Click or drop bride photo(s) here (Select single or multiple)'}
                      </strong>
                      <span>Supports JPG, PNG, WEBP, HEIC (Max 25MB each, up to 10 photos)</span>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.avif,.jfif"
                      multiple
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {/* 2. Customer Name & Occasion */}
                <div className="formGridRow">
                  <div className="formField">
                    <label className="formLabel">Customer / Bride Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma-Patil (Optional)"
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
                      }
                    />
                    <small className="fieldHint">
                      Leave blank if bride prefers to remain anonymous.
                    </small>
                  </div>

                  <div className="formField">
                    <label className="formLabel requiredLabel">Occasion / Event</label>
                    <select
                      value={formData.occasion}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, occasion: e.target.value }))
                      }
                    >
                      {OCCASIONS.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>

                    {formData.occasion === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter custom occasion name..."
                        style={{ marginTop: '8px' }}
                        value={formData.customOccasion}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, customOccasion: e.target.value }))
                        }
                      />
                    )}
                  </div>
                </div>

                {/* 3. Description / Story */}
                <div className="formField">
                  <label className="formLabel">Description & Story</label>
                  <textarea
                    rows={3}
                    placeholder="Describe how the customer styled her Nathshikha jewellery, the look, and ceremony details..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                  <small className="fieldHint">
                    Example: "Priya wore our signature Ashtapailu Kakan paired with our traditional Nath for her Pune wedding ceremony."
                  </small>
                </div>

                {/* 4. Jewellery Featured (Multi-select from Catalogue) */}
                <div className="formSection">
                  <label className="formLabel">
                    Jewellery Featured in this Photograph
                  </label>
                  <p className="formHelperText">
                    Select the Nathshikha jewellery pieces visible in the photo. Customer gallery cards will link directly to these products.
                  </p>

                  {/* Selected badges */}
                  {formData.products.length > 0 && (
                    <div className="selectedProductsTags">
                      <span className="selectedLabel">Selected ({formData.products.length}):</span>
                      {formData.products.map((pId) => {
                        const prod = products.find((p) => p.id === pId || p._id === pId);
                        return (
                          <span key={pId} className="selectedProductPill">
                            {prod ? prod.name : 'Selected Item'}
                            <button
                              type="button"
                              onClick={() => handleToggleProduct(pId)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Product Search & Picker List */}
                  <div className="productPickerBox">
                    <div className="pickerSearchRow">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search catalogue products to link..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>

                    <div className="pickerItemsList">
                      {selectableProducts.map((p) => {
                        const pId = p.id || p._id;
                        const isSelected = formData.products.includes(pId);
                        return (
                          <div
                            key={pId}
                            className={`pickerItemRow ${isSelected ? 'selectedItem' : ''}`}
                            onClick={() => handleToggleProduct(pId)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              tabIndex={-1}
                            />
                            <img
                              src={p.img || '/assets/thushi.jpg'}
                              alt={p.name}
                              className="pickerItemThumb"
                            />
                            <div className="pickerItemInfo">
                              <span className="pickerItemName">{p.name}</span>
                              <span className="pickerItemMeta">
                                {p.category} · {money(p.price)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {selectableProducts.length === 0 && (
                        <div className="noPickerItems">No matching products found in catalogue.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Display Order & Internal Order ID */}
                <div className="formGridRow">
                  <div className="formField">
                    <label className="formLabel">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          display_order: parseInt(e.target.value, 10) || 0
                        }))
                      }
                    />
                    <small className="fieldHint">
                      Lower numbers appear first on the Hall of Fame page (e.g. 1, 2, 3).
                    </small>
                  </div>

                  <div className="formField">
                    <label className="formLabel">Internal Order Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. #NS-1024"
                      value={formData.order_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, order_id: e.target.value }))
                      }
                    />
                    <small className="fieldHint">
                      For internal tracking only. Never shown publicly.
                    </small>
                  </div>
                </div>

                {/* 6. Visibility & Consent Checkbox */}
                <div className="consentAndVisSection">
                  <label className="consentCheckboxLabel">
                    <input
                      type="checkbox"
                      checked={formData.photo_consent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          photo_consent: checked,
                          is_visible: checked ? prev.is_visible : false
                        }));
                      }}
                    />
                    <span>
                      <ShieldCheck size={16} color="#15803d" />
                      <b>Customer Permission Confirmed:</b> Customer has given permission to use this photo for marketing purposes.
                    </span>
                  </label>

                  <label className={`visCheckboxLabel ${!formData.photo_consent ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.is_visible && formData.photo_consent}
                      disabled={!formData.photo_consent}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_visible: e.target.checked }))
                      }
                    />
                    <span>
                      <b>Publish Live (Is Visible):</b> Make this story visible on the customer-facing Hall of Fame page. {!formData.photo_consent && <small style={{ color: '#dc2626' }}>(Requires customer consent)</small>}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="hofModalFooter">
                <button
                  type="button"
                  className="cancelModalBtn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saveModalBtn"
                  disabled={saving || uploadingImage}
                >
                  {saving ? (
                    'Saving Story...'
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    <>
                      <Sparkles size={15} /> Publish Story
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL                                    */}
      {/* ============================================================ */}
      {deleteTarget && (
        <div className="hofModalOverlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="hofDeleteConfirmCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="deleteModalIcon">
              <Trash2 size={28} color="#b91c1c" />
            </div>
            <h3>Delete Hall of Fame Story?</h3>
            <p>
              Are you sure you want to permanently delete the bride story for{' '}
              <strong>{deleteTarget.customer_name || 'this customer'}</strong>?
              This action cannot be undone and will remove the photo from the website.
            </p>

            <div className="deleteConfirmBtns">
              <button
                className="cancelModalBtn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                type="button"
              >
                Cancel
              </button>
              <button
                className="confirmDeleteBtn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADMIN PHOTO LIGHTBOX                                         */}
      {/* ============================================================ */}
      {previewPhoto && (
        <div className="hofModalOverlay" onClick={() => setPreviewPhoto(null)}>
          <div
            className="hofPhotoLightboxContent"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightboxCloseBtn"
              onClick={() => setPreviewPhoto(null)}
              type="button"
            >
              <X size={20} />
            </button>
            <img src={previewPhoto} alt="Full preview" />
          </div>
        </div>
      )}
    </div>
  );
}
