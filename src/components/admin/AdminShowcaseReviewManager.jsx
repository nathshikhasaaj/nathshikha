import React, { useState, useMemo } from 'react';
import {
  Star,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquareQuote,
  Image as ImageIcon
} from 'lucide-react';
import { api, uploadFile } from '../../services/api';
import './AdminShowcaseReviewManager.css';

function RenderStars({ rating = 5 }) {
  return (
    <span className="showcaseStars">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          fill={s <= rating ? '#d4af37' : 'none'}
          color={s <= rating ? '#d4af37' : '#cbd5e1'}
        />
      ))}
    </span>
  );
}

export default function AdminShowcaseReviewManager({
  reviews = [],
  onRefresh,
  setToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const initialForm = {
    customerName: '',
    rating: 5,
    reviewText: '',
    image: '',
    isVisible: true
  };

  const [formData, setFormData] = useState(initialForm);

  const filteredReviews = useMemo(() => {
    return (reviews || []).filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (r.customerName || '').toLowerCase().includes(q);
        const textMatch = (r.reviewText || '').toLowerCase().includes(q);
        if (!nameMatch && !textMatch) return false;
      }
      if (ratingFilter !== 'all') {
        if (Number(r.rating) !== Number(ratingFilter)) return false;
      }
      if (visibilityFilter === 'visible' && !r.isVisible) return false;
      if (visibilityFilter === 'hidden' && r.isVisible) return false;
      return true;
    });
  }, [reviews, searchQuery, ratingFilter, visibilityFilter]);

  const handleOpenCreate = () => {
    setFormData(initialForm);
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rev) => {
    setFormData({
      customerName: rev.customerName || '',
      rating: rev.rating || 5,
      reviewText: rev.reviewText || '',
      image: rev.image || '',
      isVisible: Boolean(rev.isVisible)
    });
    setIsEditing(true);
    setEditingId(rev.id || rev._id);
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadFile(file, '/showcase-reviews/admin/upload');
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, image: res.url }));
        if (setToast) setToast('Showcase photo uploaded successfully.');
      }
    } catch (err) {
      alert(err.message || 'Failed to upload photo. Please ensure valid image file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleVisibility = async (rev) => {
    try {
      const targetId = rev.id || rev._id;
      const nextVisible = !rev.isVisible;
      await api(`/showcase-reviews/admin/${targetId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ isVisible: nextVisible })
      });
      if (setToast) {
        setToast(`Review by ${rev.customerName} marked as ${nextVisible ? 'Visible' : 'Hidden'}.`);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update review visibility');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('Please enter customer name');
      return;
    }
    if (!formData.reviewText.trim()) {
      alert('Please enter review text');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await api(`/showcase-reviews/admin/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (setToast) setToast('Showcase review updated successfully.');
      } else {
        await api('/showcase-reviews/admin', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (setToast) setToast('New showcase review published successfully.');
      }
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to save showcase review');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const targetId = deleteTarget.id || deleteTarget._id;
      await api(`/showcase-reviews/admin/${targetId}`, {
        method: 'DELETE'
      });
      if (setToast) setToast('Showcase review deleted.');
      setDeleteTarget(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adminShowcaseReviewManager">
      {/* Header Bar */}
      <div className="showcaseManagerHeader">
        <div>
          <h2 className="showcaseSectionTitle">
            <MessageSquareQuote size={22} color="var(--maroon)" />
            <span>Homepage Showcase & Google Reviews</span>
          </h2>
          <p className="showcaseSectionDesc">
            Manage curated testimonials and Google reviews highlighted on the store homepage carousel.
          </p>
        </div>

        <button
          type="button"
          className="goldBtn addShowcaseBtn"
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          <span>Add Showcase Review</span>
        </button>
      </div>

      {/* Filter / Search Controls */}
      <div className="showcaseFilterBar">
        <div className="showcaseSearchBox">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by customer name or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="showcaseFilterControls">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="all">All Ratings (1★ - 5★)</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Table of Showcase Reviews */}
      <div className="showcaseTableWrapper">
        <table className="showcaseTable">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Photo</th>
              <th>Customer Name</th>
              <th>Rating</th>
              <th>Review Text</th>
              <th>Visible</th>
              <th>Created At</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length > 0 ? (
              filteredReviews.map((rev) => (
                <tr key={rev.id || rev._id} className={!rev.isVisible ? 'rowHidden' : ''}>
                  {/* Photo / Thumbnail */}
                  <td>
                    {rev.image ? (
                      <div
                        className="showcaseThumbBox"
                        onClick={() => setPreviewImage(rev.image)}
                        title="Click to view photo"
                      >
                        <img src={rev.image} alt={rev.customerName} />
                      </div>
                    ) : (
                      <div className="showcaseNoThumb">
                        <ImageIcon size={14} color="#94a3b8" />
                      </div>
                    )}
                  </td>

                  {/* Customer Name */}
                  <td>
                    <b className="showcaseCustName">{rev.customerName}</b>
                  </td>

                  {/* Rating */}
                  <td>
                    <div className="showcaseRatingCell">
                      <RenderStars rating={rev.rating} />
                      <span>{rev.rating}/5</span>
                    </div>
                  </td>

                  {/* Review Text */}
                  <td>
                    <p className="showcaseReviewTextSnippet">{rev.reviewText}</p>
                  </td>

                  {/* Visible Toggle */}
                  <td>
                    <button
                      type="button"
                      className={`statusToggleBtn ${rev.isVisible ? 'active' : ''}`}
                      onClick={() => handleToggleVisibility(rev)}
                      title={`Click to ${rev.isVisible ? 'hide' : 'show'} on homepage`}
                    >
                      {rev.isVisible ? (
                        <>
                          <Eye size={12} /> <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={12} /> <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Created At */}
                  <td>
                    <small className="dateText">
                      {new Date(rev.createdAt || rev.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </small>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="showcaseActionBtns">
                      <button
                        type="button"
                        className="editActionBtn"
                        onClick={() => handleOpenEdit(rev)}
                        title="Edit Review"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="deleteActionBtn"
                        onClick={() => setDeleteTarget(rev)}
                        title="Delete Review"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="noReviewsCell">
                  <MessageSquareQuote size={32} color="#cbd5e1" />
                  <p>No showcase reviews found matching your filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add / Edit Showcase Review */}
      {showModal && (
        <div className="showcaseModalOverlay" onClick={() => setShowModal(false)}>
          <div
            className="showcaseModalContent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="showcaseModalHeader">
              <h3>{isEditing ? 'Edit Showcase Review' : 'Add Showcase / Google Review'}</h3>
              <button
                type="button"
                className="closeModalBtn"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="showcaseModalForm">
              <div className="formGroup">
                <label>Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sneha Deshmukh"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                />
              </div>

              <div className="formGroup">
                <label>Rating (1 to 5 Stars) *</label>
                <div className="starPickerRow">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`starPickerBtn ${star <= formData.rating ? 'selected' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                    >
                      <Star
                        size={22}
                        fill={star <= formData.rating ? '#d4af37' : 'none'}
                        color={star <= formData.rating ? '#d4af37' : '#cbd5e1'}
                      />
                    </button>
                  ))}
                  <span className="ratingNumberBadge">{formData.rating} / 5 Stars</span>
                </div>
              </div>

              <div className="formGroup">
                <label>Review Text *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the customer's testimonial or paste their Google review text here..."
                  value={formData.reviewText}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reviewText: e.target.value }))
                  }
                />
              </div>

              <div className="formGroup">
                <label>Customer Photo / Product Image (Optional)</label>
                <div className="photoUploadRow">
                  {formData.image && (
                    <div className="uploadedPreviewBox">
                      <img src={formData.image} alt="Preview" />
                      <button
                        type="button"
                        className="removePhotoBtn"
                        onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <label className="uploadPhotoInputLabel">
                    <Upload size={16} />
                    <span>{uploadingImage ? 'Uploading...' : 'Choose Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div className="formGroup checkboxGroup">
                <label className="showcaseVisibilityCheckbox">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isVisible: e.target.checked }))
                    }
                  />
                  <span>
                    <b>Visible on Homepage Carousel</b> (Display among latest 5 visible reviews)
                  </span>
                </label>
              </div>

              <div className="modalFooterBtns">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn"
                  disabled={saving || uploadingImage}
                >
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="showcaseModalOverlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="showcaseConfirmModal"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertCircle size={36} color="#dc2626" />
            <h3>Delete Showcase Review?</h3>
            <p>
              Are you sure you want to delete the testimonial from <b>{deleteTarget.customerName}</b>? This action cannot be undone.
            </p>
            <div className="confirmActionBtns">
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="deleteConfirmBtn"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewImage && (
        <div className="showcaseModalOverlay" onClick={() => setPreviewImage(null)}>
          <div
            className="showcaseImageLightbox"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImage} alt="Showcase Customer" />
            <button
              type="button"
              className="lightboxCloseBtn"
              onClick={() => setPreviewImage(null)}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
