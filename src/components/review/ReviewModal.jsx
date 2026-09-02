import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './ReviewModal.css';

const RATING_LABELS = {
  1: 'Disappointed',
  2: 'Below Average',
  3: 'Average & Decent',
  4: 'Very Good',
  5: 'Outstanding / Loved It!'
};

export default function ReviewModal({
  isOpen,
  onClose,
  product,
  order,
  existingReview = null,
  onSuccess,
  setToast
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        setRating(existingReview.rating || 5);
        setTitle(existingReview.title || '');
        setComment(existingReview.comment || '');
        setPhotoUrl(existingReview.photo_url || existingReview.photoUrl || null);
      } else {
        setRating(5);
        setTitle('');
        setComment('');
        setPhotoUrl(null);
      }
      setHoverRating(0);
      setError('');
    }
  }, [isOpen, existingReview]);

  if (!isOpen || !product || !order) return null;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type ? file.type.startsWith('image/') : /\.(jpe?g|png|webp|gif|heic|heif|avif|jfif)$/i.test(file.name);
    if (!isImage) {
      return setError('Please select a valid image file (JPG, PNG, WEBP, GIF, HEIC).');
    }
    if (file.size > 25 * 1024 * 1024) {
      return setError('Image file size must be under 25MB.');
    }

    setUploadingPhoto(true);
    setError('');

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await api('/reviews/upload-photo', {
        method: 'POST',
        body: formData
      });
      if (res && res.url) {
        setPhotoUrl(res.url);
      } else {
        throw new Error('No image URL returned');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      return setError('Please select a rating between 1 and 5 stars.');
    }
    if (!comment.trim()) {
      return setError('Please write a few words about your experience.');
    }

    setSubmitting(true);
    setError('');

    try {
      const isEditing = Boolean(existingReview && existingReview.id);
      let res;

      if (isEditing) {
        res = await api(`/reviews/${existingReview.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            rating,
            title: title.trim(),
            comment: comment.trim(),
            photoUrl
          })
        });
      } else {
        res = await api('/reviews/submit', {
          method: 'POST',
          body: JSON.stringify({
            orderId: order.id || order._id,
            productId: product.id || product._id || product.productId,
            rating,
            title: title.trim(),
            comment: comment.trim(),
            photoUrl
          })
        });
      }

      if (setToast) {
        setToast(
          isEditing
            ? 'Review updated successfully!'
            : 'Thank you! Your verified review has been submitted.'
        );
      }
      if (onSuccess) onSuccess(res.review);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="reviewModalOverlay" onClick={onClose}>
      <div
        className="reviewModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="reviewModalHeader">
          <div>
            <span className="reviewEyebrow">VERIFIED PURCHASE FEEDBACK</span>
            <h2>{existingReview ? 'Edit Your Review' : 'Write a Review'}</h2>
          </div>
          <button
            type="button"
            className="reviewModalCloseBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Product & Order Context */}
        <div className="reviewProductInfoCard">
          <img
            src={product.img || '/assets/thushi.jpg'}
            alt={product.name}
            className="reviewProductThumb"
          />
          <div className="reviewProductMeta">
            <span className="reviewOrderTag">ORDER #{order.order_no || order.orderNo}</span>
            <h4 className="reviewProductName">{product.name}</h4>
            {product.price && (
              <span className="reviewProductPrice">{money(product.price)}</span>
            )}
            <div className="verifiedBadgeInline">
              <ShieldCheck size={13} />
              <span>Verified Delivery</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="reviewFormBody">
          {error && (
            <div className="reviewFormError">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Rating Section */}
          <div className="reviewFormSection">
            <label className="reviewSectionLabel">
              Overall Rating <span className="reqStar">*</span>
            </label>
            <div className="starPickerWrap">
              <div className="starPickerRow">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`starBtn ${isFilled ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} star`}
                    >
                      <Star
                        size={28}
                        fill={isFilled ? 'var(--gold, #b8860b)' : 'none'}
                        stroke={isFilled ? 'var(--gold, #b8860b)' : '#c0b4a4'}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="starRatingLabel">
                {RATING_LABELS[activeRating] || `${activeRating} Stars`}
              </span>
            </div>
          </div>

          {/* Headline / Title (Optional) */}
          <div className="reviewFormSection">
            <label className="reviewSectionLabel">Review Title (Optional)</label>
            <input
              type="text"
              className="reviewInput"
              placeholder="e.g. Gorgeous craftsmanship & quick delivery!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Comment Text Area */}
          <div className="reviewFormSection">
            <label className="reviewSectionLabel">
              Your Feedback / Experience <span className="reqStar">*</span>
            </label>
            <textarea
              className="reviewTextarea"
              rows={4}
              placeholder="Share details about the quality, finish, look, or packaging of this piece…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          {/* Customer Photo Upload */}
          <div className="reviewFormSection">
            <label className="reviewSectionLabel">Add a Photo of the Product (Optional)</label>
            {photoUrl ? (
              <div className="uploadedPhotoPreviewBox">
                <img src={photoUrl} alt="Review attachment" className="uploadedPhotoThumb" />
                <div className="photoMeta">
                  <span className="photoSuccessText">
                    <CheckCircle2 size={13} /> Photo uploaded
                  </span>
                  <button
                    type="button"
                    className="removePhotoBtn"
                    onClick={() => setPhotoUrl(null)}
                  >
                    <Trash2 size={13} /> Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <label className={`photoUploadDropzone ${uploadingPhoto ? 'uploading' : ''}`}>
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.avif,.jfif"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                  style={{ display: 'none' }}
                />
                {uploadingPhoto ? (
                  <div className="uploadingState">
                    <Loader2 size={20} className="spinIcon" />
                    <span>Uploading & optimizing photo…</span>
                  </div>
                ) : (
                  <div className="uploadPrompt">
                    <Camera size={22} />
                    <span>Upload customer photo</span>
                    <small>JPG, PNG, WEBP, HEIC or GIF (Max 25MB)</small>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="reviewModalActions">
            <button
              type="button"
              className="outlineBtn reviewCancelBtn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn reviewSubmitBtn"
              disabled={submitting || uploadingPhoto}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="spinIcon" /> Submitting…
                </>
              ) : existingReview ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
