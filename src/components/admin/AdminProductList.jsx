import React from 'react';
import { Pencil, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminProductList.css';

export default function AdminProductList({
  allProducts,
  editProduct,
  removeProduct,
  toggleProductActive,
  toggleProductBestseller
}) {
  return (
    <div className="adminCard adminCatalogueCard">
      <div className="cardHeading">
        <div>
          <h3>Product Catalogue</h3>
          <p className="catalogueSub">Manage, edit, toggle bestsellers, hide, or permanently remove products</p>
        </div>
        <span className="productCountBadge">{allProducts.length} total</span>
      </div>

      <div className="adminProductList">
        {allProducts.map((p) => {
          const imgCount = Array.isArray(p.images) && p.images.length > 0 ? p.images.length : (p.img ? 1 : 0);
          const isBestseller = Boolean(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER');

          return (
            <div className={`adminProduct ${!p.active ? 'inactive' : ''}`} key={p.id}>
              <div className="adminProductThumb">
                <img src={p.img || p.images?.[0]} alt={p.name} />
                {imgCount > 1 && (
                  <span className="thumbCountBadge">{imgCount} photos</span>
                )}
              </div>
              <div className="adminProductInfo">
                <b>{p.name}</b>
                <small>
                  {money(p.price)} · {p.category} · Stock: {p.stock}
                </small>
                <div className="adminProductMetaTags">
                  <span className={`statusTag ${p.active ? 'liveTag' : 'hiddenTag'}`}>
                    {p.active ? '● Live' : '○ Hidden'}
                  </span>
                  {isBestseller && (
                    <span className="statusTag bestsellerTag" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                      ⭐ Bestseller
                    </span>
                  )}
                  {imgCount > 1 && (
                    <span className="multiPhotoTag">✦ {imgCount} photos</span>
                  )}
                </div>
              </div>

            <div className="adminProductActions">
              {toggleProductBestseller && (
                <button
                  onClick={() => toggleProductBestseller(p)}
                  title={isBestseller ? 'Remove from Homepage Bestsellers' : 'Show on Homepage Bestsellers'}
                  type="button"
                  className={`actionBtn starBtn ${isBestseller ? 'isBestsellerActive' : ''}`}
                  style={{ color: isBestseller ? '#d97706' : '#9ca3af' }}
                >
                  <Star size={13} fill={isBestseller ? '#d97706' : 'none'} />
                </button>
              )}

              <button
                onClick={() => editProduct(p)}
                title="Edit product details"
                type="button"
                className="actionBtn editBtn"
              >
                <Pencil size={13} />
              </button>

              {toggleProductActive && (
                <button
                  onClick={() => toggleProductActive(p)}
                  title={p.active ? 'Hide from storefront' : 'Make live in storefront'}
                  type="button"
                  className={`actionBtn toggleBtn ${!p.active ? 'isHidden' : ''}`}
                >
                  {p.active ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              )}

              <button
                onClick={() => removeProduct(p.id, p.name)}
                title="Delete product permanently from database"
                type="button"
                className="actionBtn deleteBtn"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
