import React, { useState, useMemo } from 'react';
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Camera,
  X,
  Clock,
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './AdminReviewManager.css';

function RenderStars({ rating, size = 13 }) {
  const rounded = Math.round(rating || 5);
  return (
    <span className="adminStarsRow" title={`${rating} Stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rounded ? 'var(--gold, #b8860b)' : 'none'}
          stroke={star <= rounded ? 'var(--gold, #b8860b)' : '#c0b4a4'}
        />
      ))}
    </span>
  );
}

export default function AdminReviewManager({
  reviewsData,
  reviews: propReviews,
  summary: propSummary,
  onRefresh,
  onReviewUpdated,
  setToast
}) {
  const reviews = useMemo(() => {
    if (Array.isArray(reviewsData?.reviews)) return reviewsData.reviews;
    if (Array.isArray(propReviews)) return propReviews;
    return [];
  }, [reviewsData, propReviews]);

  const summary = useMemo(() => {
    return reviewsData?.summary || propSummary || {};
  }, [reviewsData, propSummary]);

  const refreshHandler = onRefresh || onReviewUpdated;

  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [viewModalReview, setViewModalReview] = useState(null);
  const [deleteModalReview, setDeleteModalReview] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prodName = r.productId?.name?.toLowerCase() || '';
        const orderNo = r.orderId?.orderNo?.toLowerCase() || '';
        const custName = r.customerName?.toLowerCase() || '';
        const custEmail = r.customerEmail?.toLowerCase() || '';
        const comment = r.comment?.toLowerCase() || '';
        const match =
          prodName.includes(q) ||
          orderNo.includes(q) ||
          custName.includes(q) ||
          custEmail.includes(q) ||
          comment.includes(q);
        if (!match) return false;
      }

      // Rating Filter
      if (ratingFilter !== 'all') {
        if (r.rating !== parseInt(ratingFilter, 10)) return false;
      }

      // Visibility Filter
      if (visibilityFilter === 'visible' && !r.isVisible) return false;
      if (visibilityFilter === 'hidden' && r.isVisible) return false;

      return true;
    });
  }, [reviews, searchQuery, ratingFilter, visibilityFilter]);

  // Handle Toggle Visibility
  const handleToggleVisibility = async (review) => {
    setActionBusy(true);
    try {
      const res = await api(`/admin/reviews/${review.id || review._id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ isVisible: !review.isVisible })
      });
      if (setToast) {
        setToast(
          res.review?.isVisible
            ? `Review by ${review.customerName} is now Visible publicly.`
            : `Review by ${review.customerName} is now Hidden from store.`
        );
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (setToast) setToast(err.message || 'Failed to update visibility');
    } finally {
      setActionBusy(false);
    }
  };

  // Handle Delete Review
  const handleDeleteConfirm = async () => {
    if (!deleteModalReview) return;
    setActionBusy(true);
    try {
      await api(`/admin/reviews/${deleteModalReview.id || deleteModalReview._id}`, {
        method: 'DELETE'
      });
      if (setToast) setToast('Review deleted permanently.');
      setDeleteModalReview(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (setToast) setToast(err.message || 'Failed to delete review');
    } finally {
      setActionBusy(false);
    }
  };

  const totalCount = summary.totalReviews || reviews.length;
  const visibleCount = summary.visibleCount !== undefined
    ? summary.visibleCount
    : reviews.filter((r) => r.isVisible).length;
  const hiddenCount = summary.hiddenCount !== undefined
    ? summary.hiddenCount
    : reviews.filter((r) => !r.isVisible).length;
  const avgRating = summary.averageRating || (totalCount > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / totalCount).toFixed(1)
    : '0.0');

  return (
    <div className="adminReviewManager">
      {/* Header & Metrics */}
      <div className="adminReviewsSummaryHeader">
        <div className="reviewsHeaderTitles">
          <span className="adminSectionEyebrow">FEEDBACK & MODERATION</span>
          <h2>Customer Reviews & Feedback</h2>
          <p>
            Review genuine verified customer feedback, manage public store visibility, and moderate customer photos.
          </p>
        </div>

        <div className="reviewsStatsPills">
          <div className="statPill">
            <span className="pillLabel">Total Reviews</span>
            <b className="pillValue">{totalCount}</b>
          </div>
          <div className="statPill">
            <span className="pillLabel">Average Rating</span>
            <b className="pillValue goldText">{avgRating} ★</b>
          </div>
          <div className="statPill">
            <span className="pillLabel">Publicly Visible</span>
            <b className="pillValue greenText">{visibleCount}</b>
          </div>
          <div className="statPill">
            <span className="pillLabel">Hidden</span>
            <b className="pillValue textMuted">{hiddenCount}</b>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="adminReviewControlsBar">
        <div className="adminReviewSearchBox">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by customer, product, order #, or keywords…"
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

        {/* Rating Pills */}
        <div className="reviewFilterPillsGroup">
          <div className="filterPills">
            <button
              type="button"
              className={`filterPill ${ratingFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRatingFilter('all')}
            >
              All Ratings
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                className={`filterPill ${ratingFilter === String(s) ? 'active' : ''}`}
                onClick={() => setRatingFilter(String(s))}
              >
                {s}★
              </button>
            ))}
          </div>

          {/* Visibility Pills */}
          <div className="filterPills">
            <button
              type="button"
              className={`filterPill ${visibilityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVisibilityFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`filterPill ${visibilityFilter === 'visible' ? 'active' : ''}`}
              onClick={() => setVisibilityFilter('visible')}
            >
              Visible ({visibleCount})
            </button>
            <button
              type="button"
              className={`filterPill ${visibilityFilter === 'hidden' ? 'active' : ''}`}
              onClick={() => setVisibilityFilter('hidden')}
            >
              Hidden ({hiddenCount})
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="adminReviewsTableWrap">
        <table className="adminReviewsTable">
          <thead>
            <tr>
              <th>Review ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Order ID</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Photo</th>
              <th>Visible</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length > 0 ? (
              filteredReviews.map((r) => {
                const prod = r.productId;
                const ord = r.orderId;
                const isShort = (r.comment || '').length <= 60;

                return (
                  <tr key={r.id || r._id} className={!r.isVisible ? 'rowHidden' : ''}>
                    <td className="codeCell">
                      <code>{(r.id || r._id).toString().slice(-6).toUpperCase()}</code>
                    </td>

                    <td className="customerCell">
                      <div className="custMeta">
                        <b>{r.customerName}</b>
                        <small>{r.customerEmail}</small>
                        {r.isVerifiedPurchase && (
                          <span className="verifiedPill" style={{ display: 'inline-flex', marginTop: '3px' }} title="Verified Delivered Purchase">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="productCell">
                      <div className="adminReviewProdMeta">
                        <img
                          src={prod?.img || '/assets/thushi.jpg'}
                          alt={prod?.name}
                          className="adminReviewProdThumb"
                        />
                        <div className="prodNameMeta">
                          <b>{prod?.name || 'Product'}</b>
                          <small>{prod?.category || 'Catalogue Piece'}</small>
                        </div>
                      </div>
                    </td>

                    <td className="orderCell">
                      <span className="orderBadge">
                        #{ord?.orderNo || r.order_id?.toString().slice(-6)}
                      </span>
                    </td>

                    <td className="ratingCell">
                      <div className="ratingStarsWrapper">
                        <RenderStars rating={r.rating} />
                        <b>{r.rating}/5</b>
                      </div>
                    </td>

                    <td className="commentCell">
                      <div className="commentSnippet">
                        {r.title && <strong className="commentTitle">{r.title}</strong>}
                        <p>
                          {isShort ? r.comment : `${r.comment.slice(0, 60)}…`}
                        </p>
                        {!isShort && (
                          <button
                            type="button"
                            className="readMoreLink"
                            onClick={() => setViewModalReview(r)}
                          >
                            Read Full
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="photoCell">
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt="Customer uploaded"
                          className="adminReviewPhotoThumb"
                          onClick={() => setViewModalReview(r)}
                          title="Click to view photo"
                        />
                      ) : (
                        <span className="noPhotoPill">None</span>
                      )}
                    </td>

                    <td className="visibleToggleCell">
                      <label className="toggleSwitch" title="Toggle public visibility">
                        <input
                          type="checkbox"
                          checked={Boolean(r.isVisible)}
                          onChange={() => handleToggleVisibility(r)}
                          disabled={actionBusy}
                        />
                        <span className="toggleSlider" />
                      </label>
                      <span className={`visibilityLabel ${r.isVisible ? 'green' : 'gray'}`}>
                        {r.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>

                    <td className="dateCell">
                      <small>
                        {new Date(r.createdAt || r.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </small>
                    </td>

                    <td className="actionsCell">
                      <div className="tableActionBtns">
                        <button
                          type="button"
                          className="viewBtn"
                          title="View Full Review & Photo"
                          onClick={() => setViewModalReview(r)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="deleteBtn"
                          title="Delete Review"
                          onClick={() => setDeleteModalReview(r)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="emptyTableNotice">
                  <div className="emptyNoticeWrap">
                    <MessageSquare size={32} color="var(--gold)" />
                    <h4>No reviews found</h4>
                    <p>
                      {searchQuery || ratingFilter !== 'all' || visibilityFilter !== 'all'
                        ? 'Try clearing or changing your search filters.'
                        : 'Customer reviews will appear here as delivered orders are reviewed.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* -------------------------------------------------- */}
      {/* 1. VIEW FULL REVIEW DETAILS MODAL */}
      {/* -------------------------------------------------- */}
      {viewModalReview && (
        <div className="adminReviewModalOverlay" onClick={() => setViewModalReview(null)}>
          <div
            className="adminReviewDetailModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="adminModalHeader">
              <div>
                <span className="modalEyebrow">CUSTOMER FEEDBACK DETAILS</span>
                <h3>Review from {viewModalReview.customerName}</h3>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setViewModalReview(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="adminModalBody">
              {/* Product & Order Meta */}
              <div className="modalProductMetaRow">
                <img
                  src={viewModalReview.productId?.img || '/assets/thushi.jpg'}
                  alt={viewModalReview.productId?.name}
                  className="modalProdThumb"
                />
                <div className="modalProdInfo">
                  <h4>{viewModalReview.productId?.name || 'Catalogue Piece'}</h4>
                  <small>
                    Order #{viewModalReview.orderId?.orderNo} · Total:{' '}
                    {money(viewModalReview.orderId?.total || viewModalReview.productId?.price)}
                  </small>
                  <div className="modalRatingScore">
                    <RenderStars rating={viewModalReview.rating} size={16} />
                    <b>{viewModalReview.rating} of 5 Stars</b>
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <div className="modalReviewContentBox">
                {viewModalReview.title && (
                  <h4 className="modalReviewTitle">"{viewModalReview.title}"</h4>
                )}
                <p className="modalReviewComment">{viewModalReview.comment}</p>
                <small className="modalReviewDate">
                  Submitted on{' '}
                  {new Date(
                    viewModalReview.createdAt || viewModalReview.created_at
                  ).toLocaleString('en-IN')}
                </small>
              </div>

              {/* Uploaded Customer Photo */}
              {viewModalReview.photoUrl && (
                <div className="modalPhotoSection">
                  <label className="modalSectionLabel">
                    <Camera size={14} /> Attached Customer Photo
                  </label>
                  <a
                    href={viewModalReview.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="modalPhotoLink"
                  >
                    <img
                      src={viewModalReview.photoUrl}
                      alt="Customer attached"
                      className="modalFullPhoto"
                    />
                    <small className="photoOpenHint">
                      <ExternalLink size={12} /> Open full resolution in new tab
                    </small>
                  </a>
                </div>
              )}

              {/* Visibility & Verified Status */}
              <div className="modalStatusGrid">
                <div className="statusItem">
                  <span>Verified Purchase:</span>
                  <b>{viewModalReview.isVerifiedPurchase ? '✓ Verified Delivery' : 'No'}</b>
                </div>
                <div className="statusItem">
                  <span>Store Visibility:</span>
                  <b>{viewModalReview.isVisible ? '✓ Publicly Visible' : 'Hidden from store'}</b>
                </div>
                <div className="statusItem">
                  <span>Review Source:</span>
                  <b>
                    {viewModalReview.reviewSource === 'admin_link'
                      ? 'Admin Direct Link'
                      : 'Customer Account'}
                  </b>
                </div>
              </div>
            </div>

            <div className="adminModalFooter">
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setViewModalReview(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`goldBtn ${!viewModalReview.isVisible ? 'unhideBtn' : ''}`}
                onClick={() => {
                  handleToggleVisibility(viewModalReview);
                  setViewModalReview((prev) => (prev ? { ...prev, isVisible: !prev.isVisible } : null));
                }}
              >
                {viewModalReview.isVisible ? 'Hide from Store' : 'Make Publicly Visible'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 2. DELETE CONFIRMATION MODAL */}
      {/* -------------------------------------------------- */}
      {deleteModalReview && (
        <div className="adminReviewModalOverlay" onClick={() => setDeleteModalReview(null)}>
          <div
            className="adminDeleteModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="deleteModalIcon">
              <AlertTriangle size={32} color="#dc3545" />
            </div>
            <h3>Delete Review Permanently?</h3>
            <p>
              Are you sure you want to permanently delete the review by{' '}
              <b>{deleteModalReview.customerName}</b> for piece{' '}
              <b>{deleteModalReview.productId?.name || 'Jewellery'}</b>?
            </p>
            <small className="deleteNotice">
              Tip: You can use the <b>Is Visible</b> toggle to hide the review from the public store instead of permanently deleting it.
            </small>

            <div className="deleteModalActions">
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setDeleteModalReview(null)}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dangerBtn"
                onClick={handleDeleteConfirm}
                disabled={actionBusy}
              >
                {actionBusy ? 'Deleting…' : 'Yes, Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
