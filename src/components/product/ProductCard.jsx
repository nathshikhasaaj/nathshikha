import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Images, Heart, ShoppingBag, Check, Loader2, SlidersHorizontal } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './ProductCard.css';

export default function ProductCard({ p }) {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = isInWishlist(p.id || p._id);

  const imagesList = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : (p.img ? [p.img] : ['/assets/thushi.jpg']);

  const primaryImg = p.img || imagesList[0];
  const secondaryImg = imagesList.length > 1 ? imagesList[1] : null;

  const isOutOfStock = p.stock !== undefined && p.stock <= 0;

  const hasOptions =
    (Array.isArray(p.productParameters) && p.productParameters.length > 0) ||
    (Array.isArray(p.parameters) && p.parameters.length > 0) ||
    (Array.isArray(p.options) && p.options.length > 0);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;

    if (hasOptions) {
      navigate(`/product/${p.id || p._id}`);
      return;
    }

    setIsAdding(true);
    addToCart(p, 1);

    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
    }, 220);

    setTimeout(() => {
      setJustAdded(false);
    }, 1800);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(p);
  };

  const reviewCount =
    typeof p.reviewCount === 'number'
      ? p.reviewCount
      : typeof p.totalReviews === 'number'
      ? p.totalReviews
      : Array.isArray(p.reviews)
      ? p.reviews.length
      : 0;

  const averageRating =
    typeof p.averageRating === 'number'
      ? p.averageRating
      : typeof p.rating === 'number'
      ? p.rating
      : 0;

  const roundedRating = Math.round(Number(averageRating) || 0);

  return (
    <article className={`card ${isOutOfStock ? 'card--outOfStock' : ''}`}>
      <div className={`pic ${secondaryImg ? 'hasHoverImage' : ''}`}>
        {isOutOfStock ? (
          <span className="productCardTag productCardTag--soldOut">{t('out_of_stock', 'OUT OF STOCK')}</span>
        ) : p.tag ? (
          <span className="productCardTag">{p.tag}</span>
        ) : null}
        {imagesList.length > 1 && (
          <span className="cardMultiPhotoBadge" title={`${imagesList.length} photos available`}>
            <Images size={10} /> {imagesList.length}
          </span>
        )}

        <button
          type="button"
          className={`heart ${isFavorite ? 'liked' : ''}`}
          onClick={handleWishlist}
          aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        <Link to={`/product/${p.id}`}>
          <img src={primaryImg} alt={p.name} loading="lazy" className="primaryCardImg" />
          {secondaryImg && (
            <img src={secondaryImg} alt={`${p.name} angle 2`} loading="lazy" className="secondaryCardImg" />
          )}
        </Link>
      </div>

      <div className="cardBody">
        {reviewCount > 0 ? (
          <div
            className="stars"
            aria-label={`${averageRating} out of 5 stars based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= roundedRating ? 'starFilled' : 'starEmpty'}
              >
                ★
              </span>
            ))}
            <em>({reviewCount})</em>
          </div>
        ) : (
          <div className="stars stars--empty">
            <span className="noReviewsTag">{t('no_reviews_yet', 'No reviews yet')}</span>
          </div>
        )}
        <Link to={`/product/${p.id}`}>
          <h3>{p.name}</h3>
        </Link>
        <strong>{money(p.price)}</strong>
        <button
          className={`bagBtn ${isOutOfStock ? 'bagBtn--outOfStock' : ''} ${justAdded ? 'bagBtn--added' : ''} ${isAdding ? 'bagBtn--loading' : ''} ${hasOptions ? 'bagBtn--options' : ''}`}
          type="button"
          onClick={handleAdd}
          disabled={isAdding || isOutOfStock}
          aria-label={isOutOfStock ? `${p.name} is out of stock` : hasOptions ? `Customize options for ${p.name}` : `Add ${p.name} to bag`}
        >
          {isOutOfStock ? (
            <span>{t('out_of_stock', 'OUT OF STOCK')}</span>
          ) : isAdding ? (
            <>
              <Loader2 className="btnSpinner" size={13} />
              <span>{t('adding', 'ADDING...')}</span>
            </>
          ) : justAdded ? (
            <>
              <Check size={14} className="btnCheckIcon" />
              <span>{t('added_exclamation', 'ADDED ✓')}</span>
            </>
          ) : hasOptions ? (
            <>
              <SlidersHorizontal size={13} className="btnBagIcon" />
              <span>{t('select_options', 'CUSTOMIZE')}</span>
            </>
          ) : (
            <>
              <ShoppingBag size={13} className="btnBagIcon" />
              <span>{t('add_to_bag', 'ADD TO BAG')}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

