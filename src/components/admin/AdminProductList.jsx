import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Package,
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { money } from '../../utils/formatters';
import AdminProductDetailsModal from './AdminProductDetailsModal';
import './AdminProductList.css';

export default function AdminProductList({
  allProducts = [],
  categoriesList = [],
  onAddNew,
  editProduct,
  removeProduct,
  toggleProductActive,
  toggleProductBestseller,
  onRefresh,
  refreshing = false
}) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, LIVE, HIDDEN
  const [selectedStock, setSelectedStock] = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  const [selectedBestseller, setSelectedBestseller] = useState('ALL'); // ALL, BESTSELLER
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name_asc, name_desc, price_asc, price_desc, stock_asc, stock_desc

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  const searchInputRef = useRef(null);

  // Keyboard shortcut: pressing '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Master Categories list from props and products
  const availableCategories = useMemo(() => {
    const set = new Set();
    if (Array.isArray(categoriesList)) {
      categoriesList.forEach((c) => {
        const name = typeof c === 'string' ? c : c.name;
        if (name) set.add(name);
      });
    }
    allProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [categoriesList, allProducts]);

  // Overall KPI Statistics
  const stats = useMemo(() => {
    let live = 0;
    let hidden = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let bestsellers = 0;

    allProducts.forEach((p) => {
      if (p.active) live++;
      else hidden++;

      const stock = Number(p.stock !== undefined ? p.stock : 10);
      if (stock === 0) outOfStock++;
      else if (stock <= 5) lowStock++;

      if (p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER') {
        bestsellers++;
      }
    });

    return {
      total: allProducts.length,
      live,
      hidden,
      outOfStock,
      lowStock,
      bestsellers
    };
  }, [allProducts]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allProducts.filter((p) => {
      // 1. Search Query
      if (query) {
        const name = String(p.name || '').toLowerCase();
        const id = String(p.id || p._id || '').toLowerCase();
        const cat = String(p.category || '').toLowerCase();
        const tag = String(p.tag || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();

        const matches =
          name.includes(query) ||
          id.includes(query) ||
          cat.includes(query) ||
          tag.includes(query) ||
          desc.includes(query);

        if (!matches) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus === 'LIVE' && !p.active) return false;
      if (selectedStatus === 'HIDDEN' && p.active) return false;

      // 4. Stock Filter
      const stock = Number(p.stock !== undefined ? p.stock : 10);
      if (selectedStock === 'OUT_OF_STOCK' && stock !== 0) return false;
      if (selectedStock === 'LOW_STOCK' && (stock <= 0 || stock > 5)) return false;
      if (selectedStock === 'IN_STOCK' && stock <= 5) return false;

      // 5. Bestseller Filter
      if (selectedBestseller === 'BESTSELLER') {
        const isBest = Boolean(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER');
        if (!isBest) return false;
      }

      return true;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedStatus, selectedStock, selectedBestseller]);

  // Sorting Logic
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest': {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        case 'oldest': {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        }
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
          return Number(a.price || 0) - Number(b.price || 0);
        case 'price_desc':
          return Number(b.price || 0) - Number(a.price || 0);
        case 'stock_asc':
          return Number(a.stock !== undefined ? a.stock : 10) - Number(b.stock !== undefined ? b.stock : 10);
        case 'stock_desc':
          return Number(b.stock !== undefined ? b.stock : 10) - Number(a.stock !== undefined ? a.stock : 10);
        default:
          return 0;
      }
    });

    return list;
  }, [filteredProducts, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus, selectedStock, selectedBestseller, sortBy, pageSize]);

  // Pagination calculation
  const totalItems = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, safeCurrentPage, pageSize]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedStock !== 'ALL' ||
    selectedBestseller !== 'ALL' ||
    sortBy !== 'newest';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedStock('ALL');
    setSelectedBestseller('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Quick stat card click filter
  const handleStatCardClick = (filterType) => {
    if (filterType === 'all') {
      clearAllFilters();
    } else if (filterType === 'live') {
      setSelectedStatus((prev) => (prev === 'LIVE' ? 'ALL' : 'LIVE'));
    } else if (filterType === 'hidden') {
      setSelectedStatus((prev) => (prev === 'HIDDEN' ? 'ALL' : 'HIDDEN'));
    } else if (filterType === 'outOfStock') {
      setSelectedStock((prev) => (prev === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK'));
    } else if (filterType === 'lowStock') {
      setSelectedStock((prev) => (prev === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK'));
    } else if (filterType === 'bestsellers') {
      setSelectedBestseller((prev) => (prev === 'BESTSELLER' ? 'ALL' : 'BESTSELLER'));
    }
  };

  return (
    <div className="adminProductDashboard">
      {/* 1. DASHBOARD HEADER */}
      <header className="productDashboardHeader">
        <div className="productDashboardHeadingWrap">
          <div className="dashboardTitleRow">
            <div className="titleBadgeIcon">
              <Package size={22} />
            </div>
            <div>
              <div className="titleWithCount">
                <h1>Products</h1>
                <span className="productsTotalPill">{allProducts.length} items</span>
              </div>
              <p className="productDashboardSub">
                Manage your handcrafted jewellery catalogue, pricing, inventory stock, and storefront visibility
              </p>
            </div>
          </div>
        </div>

        <div className="productDashboardHeaderActions">
          <button
            type="button"
            className="refreshCatalogueBtn"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh product catalogue from database"
          >
            <RefreshCw size={15} className={refreshing ? 'spinAnimation' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {onAddNew && (
            <button
              type="button"
              className="goldBtn primaryAddProductBtn"
              onClick={onAddNew}
            >
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. KPI METRIC STAT CARDS */}
      <section className="productKpiGrid" aria-label="Product Statistics Overview">
        <div
          className={`productKpiCard ${selectedStatus === 'ALL' && selectedStock === 'ALL' && selectedBestseller === 'ALL' ? 'kpiActive' : ''}`}
          onClick={() => handleStatCardClick('all')}
          tabIndex={0}
          role="button"
        >
          <div className="kpiIconBox totalIcon">
            <Package size={18} />
          </div>
          <div className="kpiContent">
            <span className="kpiLabel">Total Products</span>
            <span className="kpiVal">{stats.total}</span>
          </div>
        </div>

        <div
          className={`productKpiCard ${selectedStatus === 'LIVE' ? 'kpiActive' : ''}`}
          onClick={() => handleStatCardClick('live')}
          tabIndex={0}
          role="button"
        >
          <div className="kpiIconBox liveIcon">
            <CheckCircle2 size={18} />
          </div>
          <div className="kpiContent">
            <span className="kpiLabel">Live in Store</span>
            <span className="kpiVal liveVal">{stats.live}</span>
          </div>
        </div>

        <div
          className={`productKpiCard ${selectedStock === 'LOW_STOCK' ? 'kpiActive' : ''}`}
          onClick={() => handleStatCardClick('lowStock')}
          tabIndex={0}
          role="button"
        >
          <div className="kpiIconBox lowStockIcon">
            <AlertTriangle size={18} />
          </div>
          <div className="kpiContent">
            <span className="kpiLabel">Low Stock (≤5)</span>
            <span className="kpiVal lowStockVal">{stats.lowStock}</span>
          </div>
        </div>

        <div
          className={`productKpiCard ${selectedStock === 'OUT_OF_STOCK' ? 'kpiActive' : ''}`}
          onClick={() => handleStatCardClick('outOfStock')}
          tabIndex={0}
          role="button"
        >
          <div className="kpiIconBox outIcon">
            <AlertCircle size={18} />
          </div>
          <div className="kpiContent">
            <span className="kpiLabel">Out of Stock</span>
            <span className="kpiVal outVal">{stats.outOfStock}</span>
          </div>
        </div>

        <div
          className={`productKpiCard ${selectedStatus === 'HIDDEN' ? 'kpiActive' : ''}`}
          onClick={() => handleStatCardClick('hidden')}
          tabIndex={0}
          role="button"
        >
          <div className="kpiIconBox hiddenIcon">
            <EyeOff size={18} />
          </div>
          <div className="kpiContent">
            <span className="kpiLabel">Hidden / Inactive</span>
            <span className="kpiVal hiddenVal">{stats.hidden}</span>
          </div>
        </div>
      </section>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <section className="productControlsToolbar">
        {/* Search Bar */}
        <div className="productSearchContainer">
          <Search size={16} className="searchMagnifierIcon" />
          <input
            ref={searchInputRef}
            type="text"
            className="productSearchInput"
            placeholder="Search by name, ID / SKU, category, tag, or description… (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clearSearchBtn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="productFiltersRow">
          {/* Category Dropdown */}
          <div className="filterControlWrap">
            <label htmlFor="catFilterSelect">Category:</label>
            <select
              id="catFilterSelect"
              className="productSelect"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories ({allProducts.length})</option>
              {availableCategories.map((cat) => {
                const count = allProducts.filter((p) => p.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="filterControlWrap">
            <label htmlFor="statusFilterSelect">Status:</label>
            <select
              id="statusFilterSelect"
              className="productSelect"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="LIVE">Live in Store</option>
              <option value="HIDDEN">Hidden from Store</option>
            </select>
          </div>

          {/* Stock Dropdown */}
          <div className="filterControlWrap">
            <label htmlFor="stockFilterSelect">Stock:</label>
            <select
              id="stockFilterSelect"
              className="productSelect"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock (&gt; 5)</option>
              <option value="LOW_STOCK">Low Stock (1–5)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="filterControlWrap">
            <label htmlFor="sortFilterSelect">Sort:</label>
            <select
              id="sortFilterSelect"
              className="productSelect"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="clearAllFiltersBtn"
              onClick={clearAllFilters}
              title="Reset all filters and search query"
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Quick Verification Status Notice */}
        {searchQuery.trim() && (
          <div className="searchVerificationNotice">
            {filteredProducts.length > 0 ? (
              <div className="verificationFound">
                <Check size={14} />
                <span>
                  Found <b>{filteredProducts.length}</b> product{filteredProducts.length === 1 ? '' : 's'} matching "<b>{searchQuery.trim()}</b>".
                </span>
              </div>
            ) : (
              <div className="verificationNotFound">
                <AlertCircle size={14} />
                <span>
                  No product matching "<b>{searchQuery.trim()}</b>" found in the catalogue.
                </span>
                {onAddNew && (
                  <button
                    type="button"
                    className="addSearchedProductLinkBtn"
                    onClick={onAddNew}
                  >
                    + Add "{searchQuery.trim()}" to catalogue
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. PRODUCTS LIST / TABLE CONTAINER */}
      <div className="productTableCard">
        {paginatedProducts.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="productTableWrap">
              <table className="adminProductTable">
                <thead>
                  <tr>
                    <th className="thProduct">Product</th>
                    <th className="thCategory">Category</th>
                    <th className="thPrice">Price</th>
                    <th className="thStock">Stock Status</th>
                    <th className="thStatus">Visibility</th>
                    <th className="thBestseller">Bestseller</th>
                    <th className="thDate">Added</th>
                    <th className="thActions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p) => {
                    const imgCount = Array.isArray(p.images) && p.images.length > 0 ? p.images.length : (p.img ? 1 : 0);
                    const isBestseller = Boolean(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER');
                    const stock = Number(p.stock !== undefined ? p.stock : 10);
                    const isLive = Boolean(p.active);
                    const paramCount = Array.isArray(p.productParameters)
                      ? p.productParameters.length
                      : (Array.isArray(p.parameters) ? p.parameters.length : 0);

                    const addedDate = p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <tr
                        key={p.id || p._id}
                        className={`productTableRow ${!isLive ? 'isRowHidden' : ''}`}
                        onClick={() => setViewingProduct(p)}
                      >
                        {/* 1. Product Thumbnail & Name */}
                        <td className="tdProduct">
                          <div className="productThumbMetaWrap">
                            <div className="productTableThumb">
                              <img
                                src={p.img || p.images?.[0] || '/assets/nath-category.jpg'}
                                alt={p.name}
                                loading="lazy"
                              />
                              {imgCount > 1 && (
                                <span className="tablePhotoBadge">+{imgCount - 1}</span>
                              )}
                            </div>
                            <div className="productNameGroup">
                              <span className="productTableName" title={p.name}>
                                {p.name}
                              </span>
                              <div className="productTableSubMeta">
                                <span className="productTableId" title={p.id || p._id}>
                                  ID: {String(p.id || p._id).slice(-6).toUpperCase()}
                                </span>
                                {paramCount > 0 && (
                                  <span className="paramCountBadge" title={`${paramCount} customer options available`}>
                                    ⚙ {paramCount} {paramCount === 1 ? 'option' : 'options'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td className="tdCategory">
                          <span className="tableCategoryPill">{p.category || 'Traditional'}</span>
                        </td>

                        {/* 3. Price */}
                        <td className="tdPrice">
                          <span className="tablePriceVal">{money(p.price)}</span>
                        </td>

                        {/* 4. Stock */}
                        <td className="tdStock">
                          {stock === 0 ? (
                            <span className="stockPill outOfStock" title="Out of Stock">
                              <AlertCircle size={12} />
                              <span>Out of Stock (0)</span>
                            </span>
                          ) : stock <= 5 ? (
                            <span className="stockPill lowStock" title="Low stock warning">
                              <AlertTriangle size={12} />
                              <span>Low Stock ({stock})</span>
                            </span>
                          ) : (
                            <span className="stockPill inStock" title="In stock">
                              <CheckCircle2 size={12} />
                              <span>In Stock ({stock})</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Visibility Toggle */}
                        <td className="tdStatus" onClick={(e) => e.stopPropagation()}>
                          {toggleProductActive ? (
                            <button
                              type="button"
                              className={`statusToggleBtn ${isLive ? 'isLive' : 'isHidden'}`}
                              onClick={() => toggleProductActive(p)}
                              title={isLive ? 'Click to hide from storefront' : 'Click to make live in storefront'}
                            >
                              <span className="statusDot" />
                              <span>{isLive ? 'Live' : 'Hidden'}</span>
                            </button>
                          ) : (
                            <span className={`statusPill ${isLive ? 'isLive' : 'isHidden'}`}>
                              {isLive ? 'Live' : 'Hidden'}
                            </span>
                          )}
                        </td>

                        {/* 6. Bestseller Toggle */}
                        <td className="tdBestseller" onClick={(e) => e.stopPropagation()}>
                          {toggleProductBestseller ? (
                            <button
                              type="button"
                              className={`bestsellerToggleBtn ${isBestseller ? 'isBestsellerActive' : ''}`}
                              onClick={() => toggleProductBestseller(p)}
                              title={isBestseller ? 'Remove from Homepage Bestsellers' : 'Show on Homepage Bestsellers'}
                            >
                              <Star size={14} fill={isBestseller ? '#d97706' : 'none'} />
                              <span>{isBestseller ? 'Bestseller' : 'Standard'}</span>
                            </button>
                          ) : (
                            <span>{isBestseller ? '⭐ Yes' : '—'}</span>
                          )}
                        </td>

                        {/* 7. Added Date */}
                        <td className="tdDate">
                          <span className="tableDateText">{addedDate}</span>
                        </td>

                        {/* 8. Action Buttons */}
                        <td className="tdActions" onClick={(e) => e.stopPropagation()}>
                          <div className="tableActionBtns">
                            <button
                              type="button"
                              className="tableActionBtn inspectBtn"
                              onClick={() => setViewingProduct(p)}
                              title="View full product specifications"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className="tableActionBtn editBtn"
                              onClick={() => editProduct(p)}
                              title="Edit product details"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              className="tableActionBtn deleteBtn"
                              onClick={() => setDeleteConfirmProduct(p)}
                              title="Delete product permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE RESPONSIVE CARDS VIEW (<= 640px) */}
            <div className="productCardsMobileList">
              {paginatedProducts.map((p) => {
                const imgCount = Array.isArray(p.images) && p.images.length > 0 ? p.images.length : (p.img ? 1 : 0);
                const isBestseller = Boolean(p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER');
                const stock = Number(p.stock !== undefined ? p.stock : 10);
                const isLive = Boolean(p.active);

                return (
                  <div
                    key={p.id || p._id}
                    className={`productMobileCard ${!isLive ? 'isCardHidden' : ''}`}
                    onClick={() => setViewingProduct(p)}
                  >
                    <div className="mobileCardTop">
                      <div className="mobileCardThumb">
                        <img
                          src={p.img || p.images?.[0] || '/assets/nath-category.jpg'}
                          alt={p.name}
                        />
                        {imgCount > 1 && (
                          <span className="mobilePhotoBadge">+{imgCount - 1}</span>
                        )}
                      </div>

                      <div className="mobileCardInfo">
                        <div className="mobileCardMetaTop">
                          <span className="mobileCategoryPill">{p.category || 'Traditional'}</span>
                          <span className={`mobileStatusPill ${isLive ? 'isLive' : 'isHidden'}`}>
                            {isLive ? '● Live' : '○ Hidden'}
                          </span>
                          {isBestseller && (
                            <span className="mobileBestsellerPill">⭐ Bestseller</span>
                          )}
                        </div>

                        <h3 className="mobileProductName">{p.name}</h3>

                        <div className="mobilePriceStockRow">
                          <span className="mobilePriceVal">{money(p.price)}</span>
                          <span className={`mobileStockPill ${stock === 0 ? 'out' : stock <= 5 ? 'low' : 'in'}`}>
                            {stock === 0 ? 'Out of Stock' : stock <= 5 ? `Low (${stock})` : `Stock: ${stock}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobileCardBottomActions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="mobileActionBtn view"
                        onClick={() => setViewingProduct(p)}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        className="mobileActionBtn edit"
                        onClick={() => editProduct(p)}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>

                      {toggleProductActive && (
                        <button
                          type="button"
                          className="mobileActionBtn toggle"
                          onClick={() => toggleProductActive(p)}
                        >
                          {isLive ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{isLive ? 'Hide' : 'Publish'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="mobileActionBtn delete"
                        onClick={() => setDeleteConfirmProduct(p)}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. PAGINATION BAR */}
            <footer className="productPaginationBar">
              <div className="paginationInfo">
                <span>
                  Showing <b>{(safeCurrentPage - 1) * pageSize + 1}</b>–
                  <b>{Math.min(safeCurrentPage * pageSize, totalItems)}</b> of <b>{totalItems}</b> products
                  {totalItems !== allProducts.length && (
                    <span className="filteredTotalHint"> (filtered from {allProducts.length})</span>
                  )}
                </span>
              </div>

              <div className="paginationControls">
                {/* Rows per page selector */}
                <div className="pageSizeWrap">
                  <label htmlFor="pageSizeSelect">Per page:</label>
                  <select
                    id="pageSizeSelect"
                    className="pageSizeSelect"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page Nav Buttons */}
                <div className="pageNavButtons">
                  <button
                    type="button"
                    className="pageNavBtn"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="currentPageBadge">
                    Page <b>{safeCurrentPage}</b> of <b>{totalPages}</b>
                  </span>

                  <button
                    type="button"
                    className="pageNavBtn"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="productEmptyState">
            <div className="emptyStateIconWrap">
              <Package size={36} />
            </div>
            <h3>No products found</h3>
            <p>
              {hasActiveFilters
                ? `No products match your current search "${searchQuery}" or selected filters.`
                : 'Your catalogue is currently empty. Add your first handcrafted jewellery piece to begin selling.'}
            </p>

            <div className="emptyStateBtnGroup">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="emptyResetBtn"
                  onClick={clearAllFilters}
                >
                  <X size={14} />
                  <span>Reset All Filters</span>
                </button>
              )}

              {onAddNew && (
                <button
                  type="button"
                  className="goldBtn emptyAddBtn"
                  onClick={onAddNew}
                >
                  <Plus size={16} />
                  <span>+ Add New Product</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK PRODUCT DETAILS MODAL */}
      {viewingProduct && (
        <AdminProductDetailsModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onEdit={(p) => {
            setViewingProduct(null);
            editProduct(p);
          }}
          onDelete={(id, name) => {
            setViewingProduct(null);
            removeProduct(id, name);
          }}
          onToggleActive={toggleProductActive}
          onToggleBestseller={toggleProductBestseller}
        />
      )}

      {/* DELETE CONFIRMATION SAFETY MODAL */}
      {deleteConfirmProduct && (
        <div
          className="adminProductDetailOverlay"
          onClick={() => setDeleteConfirmProduct(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="deleteSafetyDialog" onClick={(e) => e.stopPropagation()}>
            <div className="deleteSafetyIconWrap">
              <AlertTriangle size={26} />
            </div>
            <h3>Delete Product Permanently?</h3>
            <p>
              Are you sure you want to permanently delete <b>"{deleteConfirmProduct.name}"</b> from the database?
            </p>
            <div className="deleteSafetyNotice">
              This action cannot be undone. Any customer order history referencing this product ID will maintain its historical record, but the product will be removed from the active catalogue.
            </div>
            <div className="deleteSafetyBtnGroup">
              <button
                type="button"
                className="safetyCancelBtn"
                onClick={() => setDeleteConfirmProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="safetyDeleteConfirmBtn"
                onClick={() => {
                  const target = deleteConfirmProduct;
                  setDeleteConfirmProduct(null);
                  removeProduct(target.id || target._id, target.name);
                }}
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
