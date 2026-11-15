import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Package,
  Layers,
  Tag,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminProductDetailsModal.css';

export default function AdminProductDetailsModal({
  product,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleBestseller
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  useEffect(() => {
    if (product) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setSelectedImgIndex(0);
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [product]);

  if (!product) return null;

  const images = useMemo(() => {
    if (!product) return [];
    let list = [];
    if (Array.isArray(product.images)) {
      list = product.images.filter(Boolean);
    } else if (typeof product.images === 'string' && product.images.trim()) {
      list = product.images.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (list.length === 0 && product.img && typeof product.img === 'string') {
      list = product.img.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return list;
  }, [product]);

  const activeImage = images[selectedImgIndex] || product.img || '/assets/nath-category.jpg';
  const isBestseller = Boolean(product.isBestseller || product.is_bestseller || product.tag === 'BESTSELLER');
  const isLive = Boolean(product.active);
  const stock = Number(product.stock !== undefined ? product.stock : 10);

  const parameters = Array.isArray(product.productParameters) ? product.productParameters : [];

  const createdDate = product.createdAt
    ? new Date(product.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Recently';

  const updatedDate = product.updatedAt
    ? new Date(product.updatedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : createdDate;

  return (
    <div
      className="adminProductDetailOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="productDetailTitle"
    >
      <div className="adminProductDetailDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="productDetailHeader">
          <div className="productDetailHeaderLeft">
            <div className="productDetailBadgeIcon">
              <Package size={20} />
            </div>
            <div className="productDetailTitleGroup">
              <div className="productDetailMetaTop">
                <span className="productDetailSku">ID: {product.id || product._id}</span>
                <span className={`productDetailStatusTag ${isLive ? 'isLive' : 'isHidden'}`}>
                  {isLive ? '● Live on Store' : '○ Hidden from Store'}
                </span>
                {isBestseller && (
                  <span className="productDetailBestsellerTag">
                    ⭐ Bestseller
                  </span>
                )}
              </div>
              <h2 id="productDetailTitle">{product.name}</h2>
            </div>
          </div>
          <button
            type="button"
            className="productDetailCloseBtn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Modal Body */}
        <div className="productDetailBody">
          <div className="productDetailGrid">
            {/* LEFT COLUMN: IMAGES */}
            <div className="productDetailGalleryCol">
              <div className="productDetailMainImgWrap">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="productDetailMainImg"
                  loading="eager"
                  onError={(e) => {
                    e.target.onerror = null;
                    if (product.img && !e.target.src.endsWith(product.img) && activeImage !== product.img) {
                      e.target.src = product.img;
                    } else {
                      e.target.src = '/assets/nath-category.jpg';
                    }
                  }}
                />
                {images.length > 1 && (
                  <span className="adminProductGalleryCounterBadge">
                    {selectedImgIndex + 1} / {images.length}
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="productDetailThumbStrip">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`galleryThumbBtn ${idx === selectedImgIndex ? 'isActiveThumb' : ''}`}
                      onClick={() => setSelectedImgIndex(idx)}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.name} thumb ${idx + 1}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/nath-category.jpg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: SPECS & PRICING */}
            <div className="productDetailInfoCol">
              {/* Price & Stock Card */}
              <div className="productDetailStatsCard">
                <div className="detailStatItem">
                  <span className="detailStatLabel">Store Price</span>
                  <span className="detailStatPrice">{money(product.price)}</span>
                </div>

                <div className="detailStatItem">
                  <span className="detailStatLabel">Inventory Stock</span>
                  <div className="stockStatusWrap">
                    {stock === 0 ? (
                      <span className="stockPill outOfStock">
                        <AlertTriangle size={12} />
                        <span>Out of Stock (0)</span>
                      </span>
                    ) : stock <= 5 ? (
                      <span className="stockPill lowStock">
                        <AlertTriangle size={12} />
                        <span>Low Stock ({stock})</span>
                      </span>
                    ) : (
                      <span className="stockPill inStock">
                        <Check size={12} />
                        <span>In Stock ({stock})</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="detailStatItem">
                  <span className="detailStatLabel">Main Category</span>
                  {product.mainCategory ? (
                    <span className="detailCategoryPill mainCategoryPill">{product.mainCategory}</span>
                  ) : (
                    <span className="detailCategoryPill unassignedMainCategoryPill">⚠️ Needs Assignment</span>
                  )}
                </div>

                <div className="detailStatItem">
                  <span className="detailStatLabel">Category</span>
                  <span className="detailCategoryPill">{product.category || 'Nath'}</span>
                </div>

                <div className="detailStatItem">
                  <span className="detailStatLabel">Badge</span>
                  <span className="detailTagPill">{product.tag || 'New'}</span>
                </div>
              </div>

              {/* Description */}
              <div className="productDetailSectionCard">
                <h4 className="sectionCardTitle">Description & Craftsmanship</h4>
                {product.description ? (
                  <p className="productDetailDescText">{product.description}</p>
                ) : (
                  <p className="productDetailDescText emptyDesc">
                    No description specified for this product.
                  </p>
                )}
              </div>

              {/* Parameters & Options */}
              {parameters.length > 0 && (
                <div className="productDetailSectionCard">
                  <div className="sectionCardHeaderRow">
                    <h4 className="sectionCardTitle">Customer Choice Options ({parameters.length})</h4>
                    <span className="paramCardSubtitle">Configured variant options</span>
                  </div>

                  <div className="productDetailParamsList">
                    {parameters.map((param, pIdx) => {
                      const selectedVals = Array.isArray(param.selectedValues) ? param.selectedValues : [];
                      return (
                        <div key={pIdx} className="detailParamRow">
                          <div className="detailParamHeader">
                            <span className="detailParamName">{param.name}</span>
                            <span className="detailParamBadge">
                              {param.displayType} • {param.selectionMode || 'single'}
                              {param.required ? ' • required' : ''}
                            </span>
                          </div>
                          <div className="detailParamChips">
                            {selectedVals.length > 0 ? (
                              selectedVals.map((val, vIdx) => (
                                <span key={vIdx} className="detailParamChip">
                                  {val.colorCode && (
                                    <span
                                      className="chipColorBullet"
                                      style={{ backgroundColor: val.colorCode }}
                                    />
                                  )}
                                  <span>{val.label || val.value}</span>
                                </span>
                              ))
                            ) : (
                              <span className="noParamsText">No choices assigned</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="productDetailTimestamps">
                <div className="timestampItem">
                  <Clock size={12} />
                  <span>Added: <b>{createdDate}</b></span>
                </div>
                <div className="timestampItem">
                  <Sparkles size={12} />
                  <span>Updated: <b>{updatedDate}</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer Actions */}
        <footer className="productDetailFooter">
          <div className="footerSecondaryGroup">
            {onToggleActive && (
              <button
                type="button"
                className={`detailFooterBtn toggleActiveBtn ${!isLive ? 'isCurrentlyHidden' : ''}`}
                onClick={() => onToggleActive(product)}
                title={isLive ? 'Hide from storefront' : 'Make live in storefront'}
              >
                {isLive ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isLive ? 'Hide from Store' : 'Make Live'}</span>
              </button>
            )}

            {onToggleBestseller && (
              <button
                type="button"
                className={`detailFooterBtn toggleBestsellerBtn ${isBestseller ? 'isBestsellerActive' : ''}`}
                onClick={() => onToggleBestseller(product)}
                title={isBestseller ? 'Remove from Bestsellers' : 'Add to Bestsellers'}
              >
                <Star size={14} fill={isBestseller ? '#d97706' : 'none'} />
                <span>{isBestseller ? 'Remove Bestseller' : 'Bestseller'}</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="detailFooterBtn deleteBtn"
                onClick={() => {
                  onClose();
                  onDelete(product.id || product._id, product.name);
                }}
                title="Delete product permanently"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="footerPrimaryGroup">
            <button type="button" className="detailFooterCancelBtn" onClick={onClose}>
              Close
            </button>

            <button
              type="button"
              className="detailFooterEditBtn"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
            >
              <Pencil size={14} />
              <span>Edit Product</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

