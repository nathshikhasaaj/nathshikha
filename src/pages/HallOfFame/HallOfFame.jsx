import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  Tag,
  ArrowRight,
  ExternalLink,
  X,
  Camera,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Images,
  Instagram,
  Facebook
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './HallOfFame.css';

const OCCASION_FILTERS = [
  { id: 'all', labelKey: 'hof_filter_all', defaultLabel: 'All Moments' },
  { id: 'Wedding', labelKey: 'hof_filter_wedding', defaultLabel: 'Weddings' },
  { id: 'Engagement', labelKey: 'hof_filter_engagement', defaultLabel: 'Engagements' },
  { id: 'Haldi & Mehendi', labelKey: 'hof_filter_haldi', defaultLabel: 'Haldi & Mehendi' },
  { id: 'Reception', labelKey: 'hof_filter_reception', defaultLabel: 'Receptions' },
  { id: 'Traditional Ceremony', labelKey: 'hof_filter_traditional', defaultLabel: 'Traditional & Festivals' }
];

// Interactive Card Image with Multi-Photo Flipping & Touch Swiping
function HofZoomableCardImage({
  photos = [],
  alt,
  occasion,
  onClick,
  t
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const photoList = Array.isArray(photos) && photos.length > 0 ? photos : ['/assets/hero.jpg'];
  const currentPhoto = photoList[activeIdx] || photoList[0];

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
  };

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length === 1 && photoList.length > 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      // Detect horizontal swipe
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && duration < 500) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  return (
    <div
      className="hofCardImageWrapper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      title={t('hof_tap_to_view', 'Click to view bride story & zoom')}
    >
      <img
        src={currentPhoto}
        alt={alt}
        className="hofCardImage"
        loading="lazy"
      />

      {/* Occasion Badge */}
      <div className="hofOccasionTag">
        <span>{occasion || 'Wedding'}</span>
      </div>

      {/* Multiple Photos Count Badge */}
      {photoList.length > 1 && (
        <div className="hofMultiPhotoCountBadge" title={`${photoList.length} photos available`}>
          <Images size={12} />
          <span>{activeIdx + 1}/{photoList.length} Photos</span>
        </div>
      )}

      {/* Card Multi-Photo Navigation Controls */}
      {photoList.length > 1 && (
        <div className="hofCardSlideControls" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="hofCardArrowBtn leftArrow"
            onClick={handlePrev}
            aria-label="Previous photograph"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="hofCardArrowBtn rightArrow"
            onClick={handleNext}
            aria-label="Next photograph"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dots Indicator */}
          <div className="hofCardDotsStrip">
            {photoList.map((_, i) => (
              <span
                key={i}
                className={`hofCardDot ${i === activeIdx ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx(i);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Zoom / View Story Badge */}
      <div className="hofZoomBadge">
        <ZoomIn size={12} />
        <span>{t('hof_view_story_zoom', 'Click to View & Zoom')}</span>
      </div>

      {/* View Full Story Action Hint */}
      <div className="hofImageOverlay">
        <span className="viewStoryBadge">
          <Sparkles size={13} /> {t('hof_view_story', 'View Full Story')}
        </span>
      </div>
    </div>
  );
}

// Lightbox Image with Multi-Photo Gallery Strip, Touch Pinch-to-Zoom & Pan
function HofLightboxGallery({ photos = [], alt, activeIndex, onSelectIndex, t }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch tracking
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef(null);
  const initialPinchZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);
  const swipeStartRef = useRef({ x: 0, y: 0, time: 0 });

  const photoList = Array.isArray(photos) && photos.length > 0 ? photos : ['/assets/hero.jpg'];
  const currentPhoto = photoList[activeIndex] || photoList[0];

  // Reset zoom on photo change
  useEffect(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [activeIndex]);

  const handlePrev = (e) => {
    e?.stopPropagation();
    onSelectIndex(activeIndex > 0 ? activeIndex - 1 : photoList.length - 1);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    onSelectIndex(activeIndex < photoList.length - 1 ? activeIndex + 1 : 0);
  };

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomLevel((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 3.5));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomLevel((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(1)), 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    e?.stopPropagation();
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn(e);
    } else {
      handleZoomOut(e);
    }
  };

  // Double tap / double click toggle
  const handleToggleDoubleTap = (e) => {
    e?.stopPropagation();
    if (zoomLevel > 1) {
      handleResetZoom();
    } else {
      setZoomLevel(2.4);
    }
  };

  // Mouse pan handlers
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

  // Touch handlers (Pinch, Pan & Swipe)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Start Pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      // Double Tap detection
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      if (timeDiff < 320 && timeDiff > 40) {
        handleToggleDoubleTap(e);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (zoomLevel > 1) {
        setIsDragging(true);
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        swipeStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: now
        };
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
      const newZoom = Math.min(Math.max(initialPinchZoomRef.current * scaleFactor, 1), 3.5);
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

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    initialPinchDistRef.current = null;

    // If not zoomed, check for photo swipe
    if (zoomLevel === 1 && e.changedTouches.length === 1 && photoList.length > 1) {
      const deltaX = e.changedTouches[0].clientX - swipeStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - swipeStartRef.current.y;
      const duration = Date.now() - swipeStartRef.current.time;

      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) && duration < 450) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  return (
    <div className="hofLightboxGalleryCol">
      {/* Main High-Res Image Stage */}
      <div
        className={`hofLightboxImageStage ${zoomLevel > 1 ? 'isLightboxZooming canDrag' : ''} ${isDragging ? 'isDragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleToggleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentPhoto}
          alt={alt}
          className="hofLightboxImg"
          draggable={false}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoomLevel})`,
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
        />

        {/* Previous / Next buttons inside lightbox (visible when at 1x) */}
        {photoList.length > 1 && zoomLevel === 1 && (
          <>
            <button
              type="button"
              className="lightboxNavBtn left"
              onClick={handlePrev}
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="lightboxNavBtn right"
              onClick={handleNext}
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Floating Controls Bar inside Gallery */}
        <div className="lightboxFloatingZoomBar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="miniZoomBtn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="miniZoomBtn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              className="miniZoomBtn resetBtn"
              onClick={handleResetZoom}
              title="Reset"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <span className="zoomLevelReadout">{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>

      {/* Multiple Photos Thumbnails Strip */}
      {photoList.length > 1 && (
        <div className="hofLightboxThumbStrip">
          {photoList.map((url, idx) => (
            <button
              key={idx}
              type="button"
              className={`hofLightboxThumbBtn ${idx === activeIndex ? 'activeThumb' : ''}`}
              onClick={() => onSelectIndex(idx)}
            >
              <img src={url} alt={`Thumbnail ${idx + 1}`} className="hofLightboxThumbImg" />
              {idx === activeIndex && <span className="thumbActiveIndicator" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HallOfFame() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedStory, setSelectedStory] = useState(null);
  const [modalActivePhotoIndex, setModalActivePhotoIndex] = useState(0);
  const { t, lang } = useLanguage();

  // Fetch stories on load
  useEffect(() => {
    setLoading(true);
    api('/hall-of-fame')
      .then((data) => {
        if (Array.isArray(data)) {
          setStories(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load Hall of Fame:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Sync modal photo index when selected story opens
  useEffect(() => {
    setModalActivePhotoIndex(0);
  }, [selectedStory]);

  // Keyboard navigation for lightbox modal
  useEffect(() => {
    if (!selectedStory) return;

    const photos = Array.isArray(selectedStory.photo_urls) && selectedStory.photo_urls.length > 0
      ? selectedStory.photo_urls
      : [selectedStory.photo_url];

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedStory(null);
      } else if (e.key === 'ArrowLeft') {
        setModalActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setModalActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStory]);

  // Filter stories by selected occasion
  const filteredStories = useMemo(() => {
    if (activeFilter === 'all') return stories;
    return stories.filter((s) => s.occasion === activeFilter);
  }, [stories, activeFilter]);

  return (
    <div className="hallOfFamePage">
      {/* 1. Hero Banner */}
      <section className="hofHero">
        <div className="hofHeroBackdrop" />
        <div className="hofHeroContainer">
          <div className="hofHeroEyebrow">
            <Sparkles size={16} />
            <span>{t('hof_hero_eyebrow', '✦ Real Nathshikha Brides & Moments ✦')}</span>
          </div>

          <h1 className="hofHeroTitle">
            {t('hof_hero_title', 'Hall of Fame: Our Radiant Brides')}
          </h1>

          <p className="hofHeroSubtitle">
            {t(
              'hof_hero_sub',
              'Celebrate real moments of love and heritage. Witness how real brides style their handcrafted Peshwai thushis, saaj sets, and luminous moti malas.'
            )}
          </p>

          {/* Impact Stats */}
          <div className="hofStatsStrip">
            <div className="hofStatItem">
              <span className="statValue">500+</span>
              <span className="statLabel">{t('hof_stat_brides', 'Happy Brides')}</span>
            </div>
            <div className="hofStatDivider" />
            <div className="hofStatItem">
              <span className="statValue">100%</span>
              <span className="statLabel">{t('hof_stat_handmade', 'Handmade Craft')}</span>
            </div>
            <div className="hofStatDivider" />
            <div className="hofStatItem">
              <span className="statValue">5★</span>
              <span className="statLabel">{t('hof_stat_reviews', 'Artisanal Trust')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Occasion Filter Bar */}
      <section className="hofFilterSection">
        <div className="hofFilterContainer">
          {OCCASION_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`hofFilterPill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                <span>{t(f.labelKey, f.defaultLabel)}</span>
                {f.id === 'all' && <span className="filterCount">{stories.length}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Main Gallery Grid */}
      <section className="hofGallerySection">
        {loading ? (
          <div className="hofLoadingState">
            <div className="hofSpinner" />
            <p>{t('hof_loading', 'Loading our beautiful brides...')}</p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="hofEmptyState">
            <Sparkles size={40} color="var(--gold)" />
            <h3>{t('hof_empty_title', 'No stories found in this category')}</h3>
            <p>
              {t(
                'hof_empty_desc',
                'Explore other categories or check back soon for newly added customer looks.'
              )}
            </p>
            <button
              type="button"
              className="hofResetFilterBtn"
              onClick={() => setActiveFilter('all')}
            >
              {t('hof_view_all', 'View All Moments')}
            </button>
          </div>
        ) : (
          <div className="hofGrid">
            {filteredStories.map((story) => {
              const brideName = story.customer_name || t('hof_anonymous_bride', 'Nathshikha Bride');
              const linkedProducts = (story.products || []).filter(Boolean);
              const photos = Array.isArray(story.photo_urls) && story.photo_urls.length > 0
                ? story.photo_urls
                : (story.photo_url ? [story.photo_url] : []);

              return (
                <article key={story.id} className="hofCard">
                  {/* Photo Frame Container with Multi-Photo Flipping & Interactive Hover Zoom */}
                  <HofZoomableCardImage
                    photos={photos}
                    alt={`${brideName} wearing Nathshikha jewellery for ${story.occasion}`}
                    occasion={story.occasion}
                    onClick={() => setSelectedStory(story)}
                    t={t}
                  />

                  {/* Card Content & Details */}
                  <div className="hofCardContent">
                    <div className="hofCardHeader">
                      <h3 className="hofBrideName">{brideName}</h3>
                      <span className="hofLookTag">{t('hof_custom_look', 'Bridal Edit')}</span>
                    </div>

                    {story.description && (
                      <blockquote className="hofDescription">
                        "{story.description}"
                      </blockquote>
                    )}

                    {/* Featured Jewellery List */}
                    {linkedProducts.length > 0 && (
                      <div className="hofJewellerySection">
                        <h4 className="hofJewelleryHeading">
                          <Tag size={13} />
                          <span>{t('hof_jewellery_worn', 'Jewellery in this look:')}</span>
                        </h4>

                        <div className="hofProductsList">
                          {linkedProducts.map((prod) => {
                            const prodId = prod.id || prod._id;
                            const prodName = prod.name || t('hof_piece', 'Handcrafted Piece');

                            return (
                              <div key={prodId} className="hofProductItem">
                                <Link
                                  to={`/product/${prodId}`}
                                  className="hofProductLink"
                                  title={`View ${prodName}`}
                                >
                                  {prod.img && (
                                    <img
                                      src={prod.img}
                                      alt={prodName}
                                      className="hofProductThumb"
                                    />
                                  )}
                                  <div className="hofProductInfo">
                                    <span className="hofProductName">{prodName}</span>
                                    {prod.price > 0 && (
                                      <span className="hofProductPrice">{money(prod.price)}</span>
                                    )}
                                  </div>
                                  <span className="hofViewArrow">
                                    <ArrowRight size={13} />
                                  </span>
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3.5. Community Social Callout Banner */}
      <section className="hofInstagramBanner">
        <div className="hofInstaContainer">
          <div className="hofInstaContent">
            <span className="hofInstaEyebrow">
              <Instagram size={16} />
              <span>@NAKHAREWALI.HANDMADE · FACEBOOK: NAKHAREWALI.HANDMADE</span>
            </span>
            <h2>{t('hof_tag_heading', 'Were you a Nathshikha Bride?')}</h2>
            <p>
              {t(
                'hof_tag_desc',
                'We would love to celebrate your special day. Tag us on Instagram @nakharewali.handmade or share your photos on Facebook (Nakharewali.handmade) to get featured in our Hall of Fame.'
              )}
            </p>
          </div>
          <div className="hofSocialActionBtns">
            <a
              href="https://www.instagram.com/nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="goldBtn hofInstaBtn"
            >
              <Instagram size={16} />
              <span>INSTAGRAM</span>
            </a>
            <a
              href="https://www.facebook.com/Nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="goldBtn hofFbBtn"
            >
              <Facebook size={16} />
              <span>FACEBOOK</span>
            </a>
          </div>
        </div>
      </section>

      {/* 4. Interactive Lightbox Modal with Multi-Photo Gallery and Deep Zoom */}
      {selectedStory && (
        <div
          className="hofLightboxOverlay"
          onClick={() => setSelectedStory(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="hofLightboxModal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="hofLightboxClose"
              onClick={() => setSelectedStory(null)}
              aria-label="Close modal"
              type="button"
            >
              <X size={20} />
            </button>

            <div className="hofLightboxBody">
              {/* Multi-Photo Gallery & High-Res Zoom on Left */}
              <HofLightboxGallery
                photos={
                  Array.isArray(selectedStory.photo_urls) && selectedStory.photo_urls.length > 0
                    ? selectedStory.photo_urls
                    : [selectedStory.photo_url]
                }
                alt={selectedStory.customer_name || 'Bride photograph'}
                activeIndex={modalActivePhotoIndex}
                onSelectIndex={(newIdx) => setModalActivePhotoIndex(newIdx)}
                t={t}
              />

              {/* Story Details on Right */}
              <div className="hofLightboxInfoCol">
                <div className="lightboxHeader">
                  <span className="lightboxOccasionBadge">
                    {selectedStory.occasion || 'Wedding'}
                  </span>
                  <h2 className="lightboxBrideTitle">
                    {selectedStory.customer_name || t('hof_anonymous_bride', 'Nathshikha Bride')}
                  </h2>
                </div>

                <div className="lightboxDescriptionBox">
                  <p className="lightboxQuote">"{selectedStory.description}"</p>
                </div>

                {/* Linked Products Breakdown */}
                {selectedStory.products && selectedStory.products.length > 0 && (
                  <div className="lightboxProductsBox">
                    <h4 className="lightboxProductsTitle">
                      <Sparkles size={14} color="var(--gold)" />
                      <span>{t('hof_featured_in_look', 'Featured Jewellery in this look')}</span>
                    </h4>

                    <div className="lightboxProductsGrid">
                      {selectedStory.products.map((prod) => {
                        if (!prod) return null;
                        const pId = prod.id || prod._id;

                        return (
                          <Link
                            key={pId}
                            to={`/product/${pId}`}
                            className="lightboxProductCard"
                            onClick={() => setSelectedStory(null)}
                          >
                            <img
                              src={prod.img || '/assets/thushi.jpg'}
                              alt={prod.name}
                              className="lightboxProdImg"
                            />
                            <div className="lightboxProdDetails">
                              <strong>{prod.name}</strong>
                              <span>{prod.category} · {money(prod.price)}</span>
                              <span className="shopLookBtn">
                                {t('hof_shop_look', 'View Jewellery')} →
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="lightboxFooter">
                  <p className="artisanHeritageNote">
                    ✦ {t('hof_artisan_heirloom', 'Handcrafted with authentic Maratha craftsmanship and pure gold finish.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
