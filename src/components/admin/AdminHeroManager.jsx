import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Plus,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Tag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './AdminHeroManager.css';

const emptySlideForm = {
  id: null,
  img: '',
  lookName: '',
  tag: '✦ ROYAL FLORAL HEIRLOOM ✦',
  tagMr: '✦ अस्सल पारिजात कलाकुसर ✦',
  title: '',
  titleMr: '',
  desc: '',
  descMr: '',
  highlight: '',
  ctaText: 'EXPLORE COLLECTION',
  ctaLink: '/shop',
  displayOrder: 1,
  isActive: true
};

export default function AdminHeroManager({
  slides = [],
  onRefresh,
  loading = false
}) {
  const { setToast } = useToast();
  const fileInputRef = useRef(null);

  const [activeReplaceSlideId, setActiveReplaceSlideId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptySlideForm);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Trigger quick image replacement for a specific card
  const handleQuickImageSelect = (slideId) => {
    setActiveReplaceSlideId(slideId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Upload image handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type ? file.type.startsWith('image/') : /\.(jpe?g|png|webp|gif|heic|heif|avif|jfif)$/i.test(file.name);
    if (!isImg) {
      setToast('Please select a valid image file (JPG, PNG, WEBP, HEIC).', 'error');
      return;
    }

    setUploadingImage(true);
    const form = new FormData();
    form.append('image', file);

    try {
      const res = await api('/hero-slides/admin/upload', {
        method: 'POST',
        body: form
      });

      if (res && res.url) {
        if (activeReplaceSlideId) {
          // Direct quick update on existing slide
          const updatedSlide = await api(`/hero-slides/admin/${activeReplaceSlideId}`, {
            method: 'PUT',
            body: JSON.stringify({ img: res.url })
          });
          setToast('Hero slide image updated successfully!', 'success');
          setActiveReplaceSlideId(null);
          onRefresh();
        } else {
          // Inside modal edit/create
          setFormData((prev) => ({ ...prev, img: res.url }));
          setToast('Image uploaded and optimized successfully!', 'success');
        }
      }
    } catch (err) {
      console.error('Error uploading hero image:', err);
      setToast(err.message || 'Failed to upload hero image.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Open modal for editing
  const handleEdit = (slide) => {
    setFormData({
      id: slide.id || slide._id,
      img: slide.img || '',
      lookName: slide.lookName || '',
      tag: slide.tag || '',
      tagMr: slide.tagMr || '',
      title: slide.title || '',
      titleMr: slide.titleMr || '',
      desc: slide.desc || '',
      descMr: slide.descMr || '',
      highlight: slide.highlight || '',
      ctaText: slide.ctaText || 'EXPLORE COLLECTION',
      ctaLink: slide.ctaLink || '/shop',
      displayOrder: slide.displayOrder || 1,
      isActive: slide.isActive !== false
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // Open modal for creating new slide
  const handleAddNew = () => {
    setFormData({
      ...emptySlideForm,
      displayOrder: slides.length + 1
    });
    setIsEditing(false);
    setShowModal(true);
  };

  // Toggle active status
  const handleToggleActive = async (slide) => {
    try {
      const slideId = slide.id || slide._id;
      const res = await api(`/hero-slides/admin/${slideId}/toggle`, {
        method: 'PATCH'
      });
      if (res && res.ok) {
        setToast(`Slide is now ${res.isActive ? 'Visible' : 'Hidden'} on homepage.`, 'success');
        onRefresh();
      }
    } catch (err) {
      setToast(err.message || 'Failed to toggle slide status', 'error');
    }
  };

  // Save / Update slide
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.img) {
      setToast('Please upload or provide an image URL for the slide.', 'error');
      return;
    }
    if (!formData.title.trim()) {
      setToast('Please enter a headline/title for the slide.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && formData.id) {
        await api(`/hero-slides/admin/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        setToast('Hero slide updated successfully!', 'success');
      } else {
        await api('/hero-slides/admin', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        setToast('New hero slide created successfully!', 'success');
      }
      setShowModal(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving hero slide:', err);
      setToast(err.message || 'Failed to save hero slide', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete slide
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const slideId = deleteTarget.id || deleteTarget._id;
      await api(`/hero-slides/admin/${slideId}`, { method: 'DELETE' });
      setToast('Hero slide deleted successfully.', 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to delete slide', 'error');
    }
  };

  // Reset to default slides
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset hero section to factory default 3 curated looks? This will restore original images and descriptions.')) {
      return;
    }
    try {
      await api('/hero-slides/admin/reset-defaults', { method: 'POST' });
      setToast('Hero section reset to default looks successfully!', 'success');
      onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to reset default hero slides', 'error');
    }
  };

  return (
    <div className="adminHeroManager">
      {/* Hidden File Input for Image Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Header Section */}
      <div className="heroManagerHeader">
        <div>
          <h2>
            <Sparkles size={20} color="#e4c786" />
            Homepage Hero Showcase Manager
          </h2>
          <p>
            Update images, titles, jewellery highlights, and look collections displayed in the top homepage hero slider.
          </p>
        </div>

        <div className="heroHeaderActions">
          <button
            type="button"
            className="heroSecondaryBtn"
            onClick={handleResetDefaults}
            title="Reset to factory default 3 looks"
          >
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            className="heroPrimaryBtn"
            onClick={handleAddNew}
          >
            <Plus size={16} />
            <span>Add Hero Slide</span>
          </button>
        </div>
      </div>

      {/* Slides Cards Grid */}
      <div className="heroSlidesAdminGrid">
        {slides.map((slide, idx) => {
          const slideId = slide.id || slide._id;
          return (
            <div
              key={slideId || idx}
              className={`heroSlideAdminCard ${!slide.isActive ? 'inactive' : ''}`}
            >
              {/* Card Image Container */}
              <div className="heroCardImageWrap">
                <img
                  src={slide.img}
                  alt={slide.title}
                  className="heroCardThumbnail"
                />

                <div className="heroCardBadge">
                  <span>LOOK 0{idx + 1}</span>
                  <strong>{slide.lookName || `Look 0${idx + 1}`}</strong>
                </div>

                <div className="heroCardVisibilityBadge">
                  {slide.isActive ? (
                    <span className="badgeActive">
                      <Eye size={12} /> Active
                    </span>
                  ) : (
                    <span className="badgeHidden">
                      <EyeOff size={12} /> Hidden
                    </span>
                  )}
                </div>

                {/* Quick Replace Overlay Button */}
                <button
                  type="button"
                  className="heroQuickUploadBtn"
                  onClick={() => handleQuickImageSelect(slideId)}
                  disabled={uploadingImage}
                >
                  <Upload size={14} />
                  <span>{uploadingImage && activeReplaceSlideId === slideId ? 'Uploading...' : 'Replace Image'}</span>
                </button>
              </div>

              {/* Card Content Details */}
              <div className="heroCardBody">
                <div className="heroCardTag">{slide.tag}</div>
                <h4 className="heroCardTitle">{slide.title.replace('\n', ' ')}</h4>
                {slide.highlight && (
                  <div className="heroCardHighlight">
                    <span>✦</span> {slide.highlight}
                  </div>
                )}
                <p className="heroCardDesc">{slide.desc}</p>
                <div className="heroCardMeta">
                  <span>
                    <strong>CTA:</strong> {slide.ctaText} ➔ <code>{slide.ctaLink}</code>
                  </span>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="heroCardFooter">
                <button
                  type="button"
                  className="heroCardActionBtn"
                  onClick={() => handleToggleActive(slide)}
                  title={slide.isActive ? 'Hide from homepage' : 'Show on homepage'}
                >
                  {slide.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{slide.isActive ? 'Hide' : 'Show'}</span>
                </button>

                <button
                  type="button"
                  className="heroCardActionBtn editBtn"
                  onClick={() => handleEdit(slide)}
                >
                  <Edit2 size={14} />
                  <span>Edit Slide</span>
                </button>

                <button
                  type="button"
                  className="heroCardActionBtn deleteBtn"
                  onClick={() => setDeleteTarget(slide)}
                  title="Delete Slide"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Slide Modal */}
      {showModal && (
        <div className="heroModalOverlay" onClick={() => setShowModal(false)}>
          <div className="heroModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="heroModalHeader">
              <h3>
                <Sparkles size={18} color="#e4c786" />
                {isEditing ? 'Edit Hero Slide' : 'Create New Hero Slide'}
              </h3>
              <button
                type="button"
                className="heroModalCloseBtn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="heroModalForm">
              {/* Image Upload Row */}
              <div className="formGroup">
                <label>Hero Slide Photography *</label>
                <div className="heroModalImagePicker">
                  {formData.img ? (
                    <div className="heroModalImagePreview">
                      <img src={formData.img} alt="Preview" />
                      <button
                        type="button"
                        className="heroChangeImgBtn"
                        onClick={() => {
                          setActiveReplaceSlideId(null);
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload size={14} /> Change Photo
                      </button>
                    </div>
                  ) : (
                    <div
                      className="heroModalDropzone"
                      onClick={() => {
                        setActiveReplaceSlideId(null);
                        fileInputRef.current?.click();
                      }}
                    >
                      <ImageIcon size={32} color="#e4c786" />
                      <span>Click to upload high-resolution bridal photography</span>
                      <small>JPG, PNG, WEBP up to 25MB</small>
                    </div>
                  )}
                </div>
              </div>

              {/* Look Name & Tag */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Look Name (e.g. Parijat Set, Mundavali & Nath)</label>
                  <input
                    type="text"
                    value={formData.lookName}
                    onChange={(e) => setFormData({ ...formData, lookName: e.target.value })}
                    placeholder="e.g. Parijat Set"
                    required
                  />
                </div>

                <div className="formGroup">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              {/* Tag / Eyebrow English & Marathi */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Tag / Eyebrow (English)</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="e.g. ✦ ROYAL FLORAL HEIRLOOM ✦"
                  />
                </div>

                <div className="formGroup">
                  <label>Tag / Eyebrow (Marathi)</label>
                  <input
                    type="text"
                    value={formData.tagMr}
                    onChange={(e) => setFormData({ ...formData, tagMr: e.target.value })}
                    placeholder="e.g. ✦ अस्सल पारिजात कलाकुसर ✦"
                  />
                </div>
              </div>

              {/* Title / Headline English & Marathi */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Headline Title (English) * <small>(Use \n for line break)</small></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Handcrafted\nParijat Jewellery Set"
                    required
                  />
                </div>

                <div className="formGroup">
                  <label>Headline Title (Marathi)</label>
                  <input
                    type="text"
                    value={formData.titleMr}
                    onChange={(e) => setFormData({ ...formData, titleMr: e.target.value })}
                    placeholder="e.g. हस्तनिर्मित\nपारिजात ज्वेलरी सेट"
                  />
                </div>
              </div>

              {/* Jewellery Highlights */}
              <div className="formGroup">
                <label>Jewellery Highlights (Items Shown in Photo)</label>
                <input
                  type="text"
                  value={formData.highlight}
                  onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                  placeholder="e.g. Parijat Choker · Long Pearl Haar · Floral Brooch & Tassels"
                />
              </div>

              {/* Description English & Marathi */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Description (English)</label>
                  <textarea
                    rows="2"
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    placeholder="Brief description of the jewelry creation..."
                  />
                </div>

                <div className="formGroup">
                  <label>Description (Marathi)</label>
                  <textarea
                    rows="2"
                    value={formData.descMr}
                    onChange={(e) => setFormData({ ...formData, descMr: e.target.value })}
                    placeholder="दागिन्यांचे थोडक्यात वर्णन..."
                  />
                </div>
              </div>

              {/* CTA Button Text & Link */}
              <div className="formRow">
                <div className="formGroup">
                  <label>Button Text</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="e.g. EXPLORE COLLECTION"
                  />
                </div>

                <div className="formGroup">
                  <label>Button Destination Link</label>
                  <input
                    type="text"
                    value={formData.ctaLink}
                    onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                    placeholder="e.g. /shop or /category/Nath"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="formGroupCheckbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Show this slide on User Homepage</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="heroModalActions">
                <button
                  type="button"
                  className="heroModalCancelBtn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="heroModalSaveBtn"
                  disabled={saving || uploadingImage}
                >
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="heroModalOverlay" onClick={() => setDeleteTarget(null)}>
          <div className="heroConfirmModal" onClick={(e) => e.stopPropagation()}>
            <AlertCircle size={36} color="#d9534f" />
            <h3>Delete Hero Slide?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.title?.replace('\n', ' ')}</strong>? This will remove it from the homepage slider.
            </p>
            <div className="heroConfirmActions">
              <button
                type="button"
                className="heroModalCancelBtn"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="heroDeleteConfirmBtn"
                onClick={handleDeleteConfirm}
              >
                Yes, Delete Slide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
