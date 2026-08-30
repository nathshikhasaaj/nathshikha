import React from 'react';
import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './ProductCard.css';

export default function ProductCard({ p }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const imagesList = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : (p.img ? [p.img] : ['/assets/thushi.jpg']);

  const primaryImg = p.img || imagesList[0];
  const secondaryImg = imagesList.length > 1 ? imagesList[1] : null;

  return (
    <article className="card">
      <div className={`pic ${secondaryImg ? 'hasHoverImage' : ''}`}>
        {p.tag && <span className="productCardTag">{p.tag}</span>}
        {imagesList.length > 1 && (
          <span className="cardMultiPhotoBadge" title={`${imagesList.length} photos available`}>
            <Images size={10} /> {imagesList.length}
          </span>
        )}
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
          className="bagBtn"
          type="button"
          onClick={() => addToCart(p)}
        >
          {t('add_to_bag', 'ADD TO BAG')}
        </button>
      </div>
    </article>
  );
}
