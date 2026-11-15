import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './CategoryGrid.css';

/**
 * 5 Curated Homepage Categories in strict left-to-right order:
 * 1. Signature — uploaded Image 1 (woman in maroon saree with pearl & green-stone jewellery)
 * 2. Traditional — uploaded Image 2 (woman in green saree with traditional gold jewellery)
 * 3. Wedding Special — uploaded Image 3 (bride in yellow/orange saree with bridal jewellery)
 * 4. Nath — uploaded Image 4 (woman in brown saree with prominent Nath)
 * 5. Other — uploaded Image 5 (back view showing pearl hair accessory)
 */
const HOMEPAGE_CATEGORIES = [
  {
    id: 'signature',
    name: 'Signature',
    mrName: 'सिग्नेचर कलेक्शन',
    sub: 'Royal Heirloom Pieces',
    img: '/assets/categories/signature.jpg',
    objectPosition: 'center 20%',
    mainCategory: 'Signature'
  },
  {
    id: 'traditional',
    name: 'Traditional',
    mrName: 'पारंपरिक साज',
    sub: 'Maharashtrian Heritage',
    img: '/assets/categories/traditional.jpg',
    objectPosition: 'center 15%',
    mainCategory: 'Traditional'
  },
  {
    id: 'wedding-special',
    name: 'Wedding Special',
    mrName: 'लग्न स्पेशल',
    sub: 'Bridal & Vivah Collection',
    img: '/assets/categories/wedding-special.jpg',
    objectPosition: 'center 18%',
    mainCategory: 'Wedding Special'
  },
  {
    id: 'nath',
    name: 'Nath',
    mrName: 'नथ संग्रह',
    sub: 'Iconic Handcrafted Naths',
    img: '/assets/categories/nath.jpg',
    objectPosition: 'center 24%',
    mainCategory: 'Nath'
  },
  {
    id: 'other',
    name: 'Other',
    mrName: 'इतर दागिने',
    sub: 'Hair & Heritage Ornaments',
    img: '/assets/categories/other.jpg',
    objectPosition: 'center 32%',
    mainCategory: 'Other'
  }
];

export default function CategoryGrid() {
  const { lang, t } = useLanguage();

  return (
    <div className="catSectionContainer" aria-label="Shop Handcrafted Jewellery by Category">
      <div className="catGrid">
        {HOMEPAGE_CATEGORIES.map((cat, idx) => {
          const displayName = lang === 'mr' && cat.mrName ? cat.mrName : cat.name;

          return (
            <Link
              key={cat.id}
              className={`catCard catCard-${cat.id}`}
              to={`/shop?mainCategory=${encodeURIComponent(cat.mainCategory)}`}
              title={`Explore ${cat.name} Collection`}
            >
              <div className="catCardVisual">
                <div className="catCardMedia">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="catCardImg"
                    style={{ objectPosition: cat.objectPosition }}
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/saaj-category.jpg';
                    }}
                  />
                  <div className="catCardGoldBorder" aria-hidden="true" />
                  <div className="catCardShimmer" aria-hidden="true" />
                </div>
              </div>

              <div className="catCardMeta">
                <h3 className="catCardName">{displayName}</h3>
                {cat.sub && <p className="catCardSub">{cat.sub}</p>}
                <span className="catCardExplore" aria-hidden="true">
                  <span>{t('explore_collection', 'Explore')}</span>
                  <svg
                    className="catCardArrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
