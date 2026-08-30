import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Heart,
  ShoppingBag
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import SectionTitle from '../../components/common/SectionTitle';
import './ReviewPage.css';

const RATING_LABELS = {
  1: 'Disappointed',
  2: 'Below Average',
  3: 'Average & Decent',
  4: 'Very Good',
  5: 'Outstanding / Loved It!'
};

export default function ReviewPage() {
  const { token } = useParams();
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState('');

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid review link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setTokenError('');

    api(`/reviews/token/${token}`)
      .then((data) => {
        if (data.valid) {
          setTokenData(data);
          if (data.alreadySubmitted) {
            setSubmittedSuccess(true);
          }
        } else {
          setTokenError(data.error || 'Invalid or expired review link.');
        }
      })
      .catch((err) => {
        setTokenError(err.message || 'Unable to load review form.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/i)) {
      return setFormError('Please select a valid image file (JPG, PNG, WEBP, GIF).');
    }
    if (file.size > 5 * 1024 * 1024) {
      return setFormError('Image file size must be under 5MB.');
    }

    setUploadingPhoto(true);
    setFormError('');

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('/api/reviews/upload-photo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');
      setPhotoUrl(data.url);
    } catch (err) {
      setFormError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      return setFormError('Please select a star rating between 1 and 5.');
    }
    if (!comment.trim()) {
      return setFormError('Please share your feedback.');
    }

    setSubmitting(true);
    setFormError('');

    try {
      await api('/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          token,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          photoUrl
        })
      });
      setSubmittedSuccess(true);
    } catch (err) {
      setFormError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="page reviewPageContainer">
        <div className="reviewLoadingCard">
          <Loader2 size={32} className="spinIcon goldSpinner" />
          <p>Loading your personalised review page…</p>
        </div>
      </main>
    );
  }

  if (tokenError) {
    return (
      <main className="page reviewPageContainer">
        <div className="reviewErrorCard">
          <AlertCircle size={42} color="#dc3545" />
          <h2>Review Link Unavailable</h2>
          <p>{tokenError}</p>
          <Link to="/shop" className="goldBtn">
            Explore Nathshikha Catalogue
          </Link>
        </div>
      </main>
    );
  }

  if (submittedSuccess) {
    const product = tokenData?.product;
    return (
      <main className="page reviewPageContainer">
        <div className="reviewSuccessCard">
          <div className="reviewSuccessHeart">
            <Heart size={44} fill="var(--maroon)" stroke="none" />
          </div>
          <span className="eyebrow">FEEDBACK RECORDED</span>
          <h1>Thank You for Your Feedback!</h1>
          <p>
            Your review for <b>{product?.name || 'your purchased jewellery'}</b> has been submitted
            successfully. Your feedback helps our artisans continue creating authentic Maharashtrian
            heirlooms.
          </p>

          <div className="successBadgeWrap">
            <ShieldCheck size={16} color="#198754" />
            <span>Verified Purchase Review</span>
          </div>

          <div className="successActions">
            <Link to="/shop" className="goldBtn">
              <ShoppingBag size={15} style={{ marginRight: 6 }} /> Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const product = tokenData?.product;
  const order = tokenData?.order;
  const activeRating = hoverRating || rating;

  return (
    <main className="page reviewPageContainer">
      <SectionTitle
        title="Share Your Feedback ❤️"
        sub={`Hello ${tokenData?.customerName || 'Customer'}, tell us about your experience.`}
      />

      <div className="reviewCardWrapper">
        {/* Product & Order Header */}
        <div className="reviewProductHero">
          <img
            src={product?.img || '/assets/thushi.jpg'}
            alt={product?.name}
            className="reviewProductHeroImg"
          />
          <div className="reviewProductHeroInfo">
            <span className="reviewOrderNo">ORDER #{order?.orderNo}</span>
            <h2>{product?.name}</h2>
            {product?.price && <span className="reviewHeroPrice">{money(product.price)}</span>}
            <div className="verifiedDeliveryPill">
              <ShieldCheck size={14} />
              <span>Verified Delivered Purchase</span>
            </div>
          </div>
        </div>

        {/* Review Submission Form */}
        <form onSubmit={handleSubmit} className="reviewMainForm">
          {formError && (
            <div className="reviewFormError">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Rating Section */}
          <div className="reviewFormGroup">
            <label className="reviewGroupLabel">
              How would you rate this piece? <span className="reqStar">*</span>
            </label>
            <div className="pageStarPicker">
              <div className="pageStarPickerRow">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`pageStarBtn ${isFilled ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} star rating`}
                    >
                      <Star
                        size={36}
                        fill={isFilled ? 'var(--gold, #b8860b)' : 'none'}
                        stroke={isFilled ? 'var(--gold, #b8860b)' : '#c0b4a4'}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="pageStarRatingText">
                {RATING_LABELS[activeRating] || `${activeRating} Stars`}
              </span>
            </div>
          </div>

          {/* Review Title */}
          <div className="reviewFormGroup">
            <label className="reviewGroupLabel">Review Title (Optional)</label>
            <input
              type="text"
              className="pageReviewInput"
              placeholder="e.g. Stunning finish, perfect for traditional functions!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Review Comment */}
          <div className="reviewFormGroup">
            <label className="reviewGroupLabel">
              Your Review / Experience <span className="reqStar">*</span>
            </label>
            <textarea
              className="pageReviewTextarea"
              rows={5}
              placeholder="Share your experience with this product (craftsmanship, quality, packaging, delivery)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          {/* Photo Upload */}
          <div className="reviewFormGroup">
            <label className="reviewGroupLabel">Add Product Photo (Optional)</label>
            {photoUrl ? (
              <div className="pagePhotoUploadedBox">
                <img src={photoUrl} alt="Review attachment" className="pagePhotoPreviewThumb" />
                <div className="pagePhotoMeta">
                  <span className="pagePhotoSuccess">
                    <CheckCircle2 size={14} /> Photo attached successfully
                  </span>
                  <button
                    type="button"
                    className="pagePhotoRemoveBtn"
                    onClick={() => setPhotoUrl(null)}
                  >
                    <Trash2 size={13} /> Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <label className={`pagePhotoUploadZone ${uploadingPhoto ? 'uploading' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                  style={{ display: 'none' }}
                />
                {uploadingPhoto ? (
                  <div className="pageUploadingStatus">
                    <Loader2 size={24} className="spinIcon" />
                    <span>Uploading photo…</span>
                  </div>
                ) : (
                  <div className="pageUploadPrompt">
                    <Camera size={26} color="var(--gold)" />
                    <span>Click or tap to upload photo</span>
                    <small>JPG, PNG, WEBP or GIF (Max 5MB)</small>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="goldBtn pageReviewSubmitBtn"
            disabled={submitting || uploadingPhoto}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinIcon" /> Submitting Your Review…
              </>
            ) : (
              <>
                <span>Submit Verified Review</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
