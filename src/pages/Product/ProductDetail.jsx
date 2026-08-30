import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  ShoppingBag,
  Star,
  Camera,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  X,
  SlidersHorizontal,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Images,
  Minus,
  Plus,
  Heart,
  Check,
  Loader2,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './ProductDetail.css';

// Helper to render star rating
function RenderStars({ rating, size = 15 }) {
  const rounded = Math.round(rating || 5);
  return (
    <span className="starIconsRow" aria-label={`${rating} stars`}>
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

// Amazon / Flipkart style Interactive Product Multi-Image Gallery & Dedicated Zoom
function ProductGalleryViewer({ images, alt, onOpenFullscreen, activeIndex, setActiveIndex, t }) {
  const containerRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const currentSrc = images[activeIndex] || images[0] || '/assets/thushi.jpg';

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current !== null && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    }
  };

  return (
    <div className="productGalleryLayout">
      {/* 1. Amazon / Flipkart Vertical Thumbnail Strip */}
      {images.length > 1 && (
        <div className="productThumbnailsStrip" role="tablist" aria-label="Product image thumbnails">
          {images.map((imgUrl, idx) => (
            <button
              key={`${imgUrl}-${idx}`}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              className={`productThumbBtn ${idx === activeIndex ? 'isActive' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => setActiveIndex(idx)}
              title={`View image ${idx + 1}`}
            >
              <img src={imgUrl} alt={`${alt} thumbnail ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}

      {/* 2. Main Slide & Click-to-Zoom Viewport */}
      <div className="productMainViewerContainer">
        <div
          ref={containerRef}
          className="productDetailMainContainer"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={onOpenFullscreen}
          title={t('click_to_zoom_hint', 'Click to open High-Definition Zoom')}
        >
          <img
            key={currentSrc}
            src={currentSrc}
            alt={alt}
            className="productMainImage animateFadeIn"
          />

          {/* Floating Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="gallerySlideNavBtn gallerySlidePrevBtn"
                onClick={handlePrev}
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="gallerySlideNavBtn gallerySlideNextBtn"
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>

              {/* Photo Counter Badge */}
              <div className="galleryCounterBadge">
                <Images size={12} />
                <span>
                  {activeIndex + 1} / {images.length}
                </span>
              </div>
            </>
          )}

          {/* Click to Zoom Action Button */}
          <div className="productZoomClickBadge">
            <ZoomIn size={14} />
            <span>{t('click_to_zoom', 'Click to Zoom & Inspect')}</span>
          </div>

          <button
            type="button"
            className="fullscreenTriggerBtn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullscreen();
            }}
            aria-label="Open fullscreen high-definition zoom"
            title="Open high-definition zoom"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Mobile Carousel Indicator Dots */}
        {images.length > 1 && (
          <div className="galleryMobileDots">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`galleryDot ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Fullscreen Deep Zoom Lightbox Modal with Multi-Image Navigation & Thumbnails
function ProductZoomLightbox({ images, activeIndex, setActiveIndex, alt, onClose, t }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentSrc = images[activeIndex] || images[0] || '/assets/thushi.jpg';

  // Touch tracking references
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef(null);
  const initialPinchZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 4));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(1)), 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleSetPreset = (lvl) => {
    setZoomLevel(lvl);
    if (lvl === 1) setPosition({ x: 0, y: 0 });
  };
  const handleReset = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    handleReset();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    handleReset();
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Double Click / Double Tap Toggle
  const handleToggleDoubleTap = (e) => {
    if (zoomLevel > 1) {
      handleReset();
    } else {
      setZoomLevel(2.5);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      if (timeDiff < 320 && timeDiff > 40) {
        handleToggleDoubleTap();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (zoomLevel > 1) {
        setIsDragging(true);
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const newZoom = Math.min(Math.max(initialPinchZoomRef.current * scaleFactor, 1), 4);
      setZoomLevel(Number(newZoom.toFixed(2)));
      if (newZoom <= 1.05) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
      if (e.key === 'ArrowLeft' && zoomLevel === 1 && images.length > 1) handlePrev();
      if (e.key === 'ArrowRight' && zoomLevel === 1 && images.length > 1) handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, zoomLevel, images.length]);

  return (
    <div
      className="productZoomModalOverlay"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      role="dialog"
      aria-modal="true"
    >
      <div className="productZoomModalWindow" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls Top Bar */}
        <div className="productZoomControlsBar">
          <div className="zoomTitleInfo">
            <Sparkles size={16} color="var(--gold)" />
            <span>
              {alt} {images.length > 1 ? `(${activeIndex + 1}/${images.length})` : ''} · {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <div className="zoomButtonsGroup">
            {/* Quick Zoom Presets */}
            <div className="zoomPresetsGroup">
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`zoomPresetBtn ${Math.round(zoomLevel) === lvl ? 'activePreset' : ''}`}
                  onClick={() => handleSetPreset(lvl)}
                >
                  {lvl}x
                </button>
              ))}
            </div>

            <button
              type="button"
              className="zoomControlBtn"
              onClick={handleZoomIn}
              title="Zoom in (+)"
            >
              <ZoomIn size={17} />
            </button>
            <button
              type="button"
              className="zoomControlBtn"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Zoom out (-)"
            >
              <ZoomOut size={17} />
            </button>
            <button
              type="button"
              className="zoomControlBtn"
              onClick={handleReset}
              title="Reset Zoom (0)"
            >
              <RotateCcw size={15} />
            </button>
            <div className="zoomDivider" />
            <button
              type="button"
              className="zoomCloseBtn"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Zoom Stage with Prev / Next Buttons & Scroll-to-Zoom */}
        <div
          className={`productZoomViewport ${zoomLevel > 1 ? 'canDrag' : ''} ${isDragging ? 'isDragging' : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleToggleDoubleTap}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 1 && zoomLevel === 1 && (
            <>
              <button
                type="button"
                className="lightboxNavBtn lightboxPrevBtn"
                onClick={handlePrev}
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="lightboxNavBtn lightboxNextBtn"
                onClick={handleNext}
                aria-label="Next photo"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            key={currentSrc}
            src={currentSrc}
            alt={alt}
            className="productModalZoomImg"
            draggable={false}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoomLevel})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          />
        </div>

        {/* Bottom Thumbnail Strip inside Lightbox */}
        {images.length > 1 && (
          <div className="lightboxThumbnailStrip">
            {images.map((imgUrl, idx) => (
              <button
                key={`${imgUrl}-${idx}`}
                type="button"
                className={`lightboxThumbBtn ${idx === activeIndex ? 'isActive' : ''}`}
                onClick={() => {
                  handleReset();
                  setActiveIndex(idx);
                }}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenZoom, setFullscreenZoom] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Reviews state
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    summary: { averageRating: 0, totalReviews: 0, distribution: {} }
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const isFavorite = isInWishlist(product?.id || product?._id);

  useEffect(() => {
    setLoading(true);
    api(`/products/${id}`)
      .then((data) => {
        setProduct(data);
        setActiveIndex(0);
        setQty(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setReviewsLoading(true);
    api(`/reviews/product/${id}?sort=${sort}`)
      .then((data) => setReviewsData(data))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id, sort]);

  const handleAddToCart = () => {
    if (isAdding || !product) return;
    setIsAdding(true);
    addToCart(product, qty);
    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
    }, 200);
    setTimeout(() => {
      setJustAdded(false);
    }, 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, qty, { showToast: false });
    navigate('/checkout');
  };

  const handleWishlist = () => {
    if (!product) return;
    toggleWishlist(product);
  };

  if (loading) {
    return (
      <main className="page">
        <div className="empty">
          <p>{t('processing', 'Loading piece details…')}</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="page">
        <div className="empty">
          <p>Product not found.</p>
          <Link className="goldBtn" to="/shop">
            {t('back_to_shop', 'BACK TO SHOP')}
          </Link>
        </div>
      </main>
    );
  }

  const { reviews, summary } = reviewsData;
  const { averageRating = 0, totalReviews = 0, distribution = {} } = summary;

  // Normalized product images array
  const productImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.img ? [product.img] : ['/assets/thushi.jpg']);

  return (
    <main className="productPage">
      <Link to="/shop" className="back">
        <ArrowLeft /> {t('back_to_collection', 'Back to collection')}
      </Link>

      <div className="productDetail">
        <div className="detailImage">
          {/* Interactive Amazon / Flipkart Multi-Image Gallery & Zoom Component */}
          <ProductGalleryViewer
            images={productImages}
            alt={product.name}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            onOpenFullscreen={() => setFullscreenZoom(true)}
            t={t}
          />
        </div>

        <div className="detailInfo">
          {product.tag && <span className="eyebrow">{product.tag}</span>}
          <h1>{product.name}</h1>

          {/* Dynamic Ratings Badge */}
          <div className="stars">
            {totalReviews > 0 ? (
              <div className="dynamicRatingSummary">
                <RenderStars rating={averageRating} size={16} />
                <em>
                  <b>{averageRating}</b> ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </em>
              </div>
            ) : (
              <div className="dynamicRatingSummary emptyRating">
                <RenderStars rating={5} size={15} />
                <em>Be the first to review</em>
              </div>
            )}
          </div>

          <div className="price">{money(product.price)}</div>

          {/* Live stock and craft readiness badge */}
          <div className="productStockStatus">
            <span className="stockDot"></span>
            <span>{t('in_stock_ready', 'In Stock • Handcrafted & Ready to Dispatch')}</span>
          </div>

          <p>{product.description}</p>

          <div className="trust">
            <span>
              <ShieldCheck /> {t('authentic_badge', 'Authentic craft')}
            </span>
            <span>
              <Truck /> {t('pan_india_badge', 'Pan-India delivery')}
            </span>
          </div>

          {/* Quantity Selector */}
          <div className="productQtySelectorRow">
            <span className="qtyLabel">{t('quantity', 'Quantity')}:</span>
            <div className="qtyControls">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="qtyValue">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((prev) => Math.min(10, prev + 1))}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="detailActions">
            <button
              className={`goldBtn detailAddBagBtn ${justAdded ? 'detailAddBagBtn--added' : ''}`}
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 size={16} className="btnSpinner" style={{ marginRight: 6 }} />
                  {t('adding', 'ADDING...')}
                </>
              ) : justAdded ? (
                <>
                  <Check size={16} style={{ marginRight: 6 }} />
                  {t('added_to_bag_done', 'ADDED TO BAG ✓')}
                </>
              ) : (
                <>
                  <ShoppingBag size={16} style={{ marginRight: 6 }} />
                  {t('add_to_bag', 'ADD TO BAG')}
                </>
              )}
            </button>

            <button
              className="buyNowBtn"
              type="button"
              onClick={handleBuyNow}
            >
              <Zap size={16} style={{ marginRight: 6 }} />
              {t('buy_now', 'BUY NOW')}
            </button>

            <button
              className={`detailWishlistBtn ${isFavorite ? 'detailWishlistBtn--active' : ''}`}
              type="button"
              onClick={handleWishlist}
              aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
              <span>{isFavorite ? t('wishlisted', 'Wishlisted ♥') : t('add_to_wishlist', 'Wishlist')}</span>
            </button>

            <a
              className="outlineBtn productWhatsAppBtn"
              href={`https://wa.me/918999335607?text=${encodeURIComponent(
                `Hello! I want to inquire about ${product.name} (₹${product.price}) on Nathshikha.`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageSquare size={15} style={{ marginRight: 6 }} />
              {t('ask_on_whatsapp', 'Ask on WhatsApp')}
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen Product Image Zoom Lightbox Modal */}
      {fullscreenZoom && (
        <ProductZoomLightbox
          images={productImages}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          alt={product.name}
          onClose={() => setFullscreenZoom(false)}
          t={t}
        />
      )}

      {/* REVIEWS & RATINGS SECTION */}
      <section className="productReviewsSection" id="customer-reviews">
        <div className="reviewsHeaderRow">
          <div>
            <h2 className="reviewsSectionTitle">
              <Sparkles size={18} color="var(--gold, #b8860b)" /> Customer Feedback & Experiences
            </h2>
            <p className="reviewsSubtitle">
              Authentic reviews from verified Nathshikha customers across India.
            </p>
          </div>

          {/* Sorting controls */}
          <div className="reviewsControls">
            <label className="sortLabel" htmlFor="review-sort-select">
              <SlidersHorizontal size={14} /> Sort By:
            </label>
            <select
              id="review-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="reviewSortDropdown"
            >
              <option value="newest">Most Recent</option>
              <option value="highest">Highest Rating (5★ first)</option>
              <option value="lowest">Lowest Rating</option>
              <option value="with_photos">With Customer Photos</option>
            </select>
          </div>
        </div>

        {/* Rating Breakdown & Stats Summary Card */}
        <div className="ratingOverviewCard">
          <div className="overallRatingCol">
            <span className="bigRatingNumber">{averageRating > 0 ? averageRating : '5.0'}</span>
            <RenderStars rating={averageRating > 0 ? averageRating : 5} size={20} />
            <span className="totalCountLabel">
              {totalReviews > 0
                ? `Based on ${totalReviews} verified ${totalReviews === 1 ? 'review' : 'reviews'}`
                : '100% Recommended by Customers'}
            </span>
          </div>

          <div className="distributionCol">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : star === 5 ? 100 : 0;
              return (
                <div key={star} className="distRow">
                  <span className="distStarLabel">{star} ★</span>
                  <div className="distBarTrack">
                    <div className="distBarFill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="distCountLabel">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="trustPerksCol">
            <div className="perkItem">
              <CheckCircle2 size={18} className="perkIcon" />
              <div>
                <strong>100% Handcrafted Assurance</strong>
                <p>Pure Maharashtrian heritage motifs</p>
              </div>
            </div>
            <div className="perkItem">
              <ShieldCheck size={18} className="perkIcon" />
              <div>
                <strong>Verified Buyer Reviews</strong>
                <p>Authentic feedback from real orders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="reviewsListContainer">
          {reviewsLoading ? (
            <div className="reviewsLoading">
              <p>Loading customer reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="emptyReviews">
              <MessageSquare size={36} color="var(--gold, #b8860b)" />
              <h3>No reviews yet for this piece</h3>
              <p>Purchased this design? You will receive a secure review link upon delivery!</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <article key={rev.id || rev._id} className="reviewCard">
                <div className="reviewCardHeader">
                  <div className="reviewerAvatar">
                    {(rev.customerName || 'Customer').charAt(0).toUpperCase()}
                  </div>
                  <div className="reviewerMeta">
                    <div className="reviewerNameRow">
                      <span className="reviewerName">{rev.customerName || 'Verified Customer'}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="verifiedBuyerBadge">
                          <CheckCircle2 size={12} /> Verified Buyer
                        </span>
                      )}
                      {rev.isFeatured && <span className="featuredBadge">⭐ Featured</span>}
                    </div>
                    <span className="reviewDate">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="reviewRatingRow">
                  <RenderStars rating={rev.rating} size={15} />
                  {rev.title && <h4 className="reviewTitle">{rev.title}</h4>}
                </div>

                <p className="reviewComment">{rev.comment}</p>

                {/* Uploaded Customer Photo Thumbnail */}
                {rev.photoUrl && (
                  <div className="reviewPhotoWrapper">
                    <button
                      type="button"
                      className="reviewPhotoThumbBtn"
                      onClick={() => setLightboxPhoto(rev.photoUrl)}
                    >
                      <img src={rev.photoUrl} alt="Customer photo" className="reviewPhotoThumb" />
                      <span className="photoExpandBadge">
                        <Camera size={12} /> View Photo
                      </span>
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {/* Review Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div className="photoLightboxOverlay" onClick={() => setLightboxPhoto(null)}>
          <div className="photoLightboxModal" onClick={(e) => e.stopPropagation()}>
            <button
              className="photoLightboxClose"
              onClick={() => setLightboxPhoto(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <img src={lightboxPhoto} alt="Customer jewellery preview" className="fullReviewPhoto" />
          </div>
        </div>
      )}
    </main>
  );
}
