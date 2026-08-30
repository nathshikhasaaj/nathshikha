import React, { useState, useRef } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Star,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './AdminProductForm.css';

export default function AdminProductForm({
  form,
  setForm,
  editing,
  setEditing,
  saveProduct,
  uploadImage,
  uploadMultipleImages,
  busy,
  emptyForm
}) {
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef(null);

  const imagesList = Array.isArray(form.images) && form.images.length > 0
    ? form.images
    : (form.img ? [form.img] : []);

  const handleAddManualUrl = (e) => {
    e.preventDefault();
    const url = manualUrl.trim();
    if (!url) return;

    const currentList = [...imagesList];
    // If only default placeholder was there, replace it
    const base = (currentList.length === 1 && currentList[0] === '/assets/thushi.jpg')
      ? []
      : currentList;

    const updated = [...base, url].slice(0, 10);
    setForm({
      ...form,
      images: updated,
      img: updated[0] || url
    });
    setManualUrl('');
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = imagesList.filter((_, idx) => idx !== indexToRemove);
    setForm({
      ...form,
      images: updated,
      img: updated[0] || ''
    });
  };

  const handleSetPrimaryCover = (indexToPrimary) => {
    if (indexToPrimary === 0) return;
    const list = [...imagesList];
    const [selected] = list.splice(indexToPrimary, 1);
    list.unshift(selected);
    setForm({
      ...form,
      images: list,
      img: list[0]
    });
  };

  const handleMoveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= imagesList.length) return;
    const list = [...imagesList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setForm({
      ...form,
      images: list,
      img: list[0]
    });
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (uploadMultipleImages) {
      uploadMultipleImages(files);
    } else if (uploadImage) {
      uploadImage(e);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="adminCard">
      <div className="cardHeading">
        <div>
          <h3>{editing ? 'Edit Product' : 'Add New Product'}</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {imagesList.length} image{imagesList.length !== 1 ? 's' : ''} added
          </span>
        </div>
        {editing && (
          <button
            className="textBtn"
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            Cancel edit
          </button>
        )}
      </div>

      <form className="adminForm" onSubmit={saveProduct}>
        <input
          required
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <div className="formRow">
          <input
            required
            type="number"
            min="1"
            placeholder="Price ₹"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </div>

        <div className="formRow">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>Nath</option>
            <option>Pearl</option>
            <option>Traditional</option>
            <option>Signature</option>
          </select>
          <input
            placeholder="Tag e.g. BESTSELLER"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
          />
        </div>

        {/* ================================================================
            MULTI-IMAGE PRODUCT MANAGEMENT SECTION
            ================================================================ */}
        <div className="adminMultiImageSection">
          <div className="multiImageHeader">
            <label className="sectionLabel">
              <ImageIcon size={15} />
              <span>Product Images ({imagesList.length}/10)</span>
            </label>
            <span className="multiImageHint">
              First image is the Primary Cover photo. Drag / reorder or click "Make Cover".
            </span>
          </div>

          {/* Upload Button Box supporting Multiple files */}
          <label className={`uploadBox multiUploadBox ${busy ? 'uploading' : ''}`}>
            <Upload size={20} />
            <div className="uploadText">
              <b>{busy ? 'Processing & Watermarking…' : 'Choose Multiple Photos to Upload'}</b>
              <span>Auto-watermarks Nathshikha logo (JPG, PNG, WEBP, up to 20MB each)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileInputChange}
              disabled={busy}
            />
          </label>

          {/* Manual URL Input Bar */}
          <div className="manualUrlBar">
            <input
              type="text"
              placeholder="Or paste image URL (/uploads/... or https://...)"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManualUrl(e);
                }
              }}
            />
            <button
              type="button"
              className="outlineBtn addUrlBtn"
              onClick={handleAddManualUrl}
              disabled={!manualUrl.trim() || busy}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Multi-Image Thumbnails Grid */}
          {imagesList.length > 0 ? (
            <div className="productImagesGrid">
              {imagesList.map((imgUrl, idx) => {
                const isPrimary = idx === 0;
                return (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className={`productImageCard ${isPrimary ? 'isPrimaryCover' : ''}`}
                  >
                    <div className="productImageThumbWrapper">
                      <img src={imgUrl} alt={`Product photo ${idx + 1}`} />
                      <span className="photoIndexBadge">#{idx + 1}</span>
                      {isPrimary && (
                        <span className="primaryCoverBadge">
                          <Star size={11} fill="#fff" /> Cover
                        </span>
                      )}
                    </div>

                    <div className="productImageActions">
                      {!isPrimary && (
                        <button
                          type="button"
                          className="makeCoverBtn"
                          title="Set as primary cover"
                          onClick={() => handleSetPrimaryCover(idx)}
                        >
                          <Star size={12} /> Set Cover
                        </button>
                      )}

                      <div className="reorderBtnsGroup">
                        <button
                          type="button"
                          className="reorderBtn"
                          title="Move earlier"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, -1)}
                        >
                          <ArrowLeft size={12} />
                        </button>
                        <button
                          type="button"
                          className="reorderBtn"
                          title="Move later"
                          disabled={idx === imagesList.length - 1}
                          onClick={() => handleMoveImage(idx, 1)}
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="deleteImgBtn"
                        title="Remove image"
                        onClick={() => handleRemoveImage(idx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="noImagesWarning">
              <AlertCircle size={15} />
              <span>At least 1 product image is required. Please upload or paste an image URL.</span>
            </div>
          )}
        </div>

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label className="switchRow">
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
          />
          Visible on store
        </label>

        <button
          className="goldBtn"
          disabled={busy || imagesList.length === 0}
          type="submit"
        >
          {busy ? 'SAVING…' : editing ? 'SAVE PRODUCT' : 'ADD PRODUCT'}
        </button>
      </form>
    </div>
  );
}
