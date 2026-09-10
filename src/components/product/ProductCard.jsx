import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Images, Heart, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './ProductCard.css';

export default function ProductCard({ p }) {
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

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;

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
        <div className="stars">
          ★★★★★ <em>(42)</em>
        </div>
        <Link to={`/product/${p.id}`}>
          <h3>{p.name}</h3>
        </Link>
        <strong>{money(p.price)}</strong>
        <button
          className={`bagBtn ${isOutOfStock ? 'bagBtn--outOfStock' : ''} ${justAdded ? 'bagBtn--added' : ''} ${isAdding ? 'bagBtn--loading' : ''}`}
          type="button"
          onClick={handleAdd}
          disabled={isAdding || isOutOfStock}
          aria-label={isOutOfStock ? `${p.name} is out of stock` : `Add ${p.name} to bag`}
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

