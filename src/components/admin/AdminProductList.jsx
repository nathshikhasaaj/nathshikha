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
  Check,
  Boxes
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';
import { MAIN_CATEGORIES } from '../../utils/parameterHelpers';
import AdminProductDetailsModal from './AdminProductDetailsModal';
import AdminDropdown from './AdminDropdown';
import AdminRowActionMenu from './AdminRowActionMenu';
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
  const { setToast } = useToast();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, LIVE, HIDDEN
  const [selectedStock, setSelectedStock] = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  const [selectedBestseller, setSelectedBestseller] = useState('ALL'); // ALL, BESTSELLER
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name_asc, name_desc, price_asc, price_desc, stock_asc, stock_desc

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk Main Category Assignment State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMainCategory, setBulkMainCategory] = useState('Traditional');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

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

  // Compute Master Categories list from props and products (Excludes Traditional and Signature)
  const availableCategories = useMemo(() => {
    const set = new Set();
    if (Array.isArray(categoriesList)) {
      categoriesList.forEach((c) => {
        const name = typeof c === 'string' ? c : c.name;
        if (name && name !== 'Traditional' && name !== 'Signature') set.add(name);
      });
    }
    allProducts.forEach((p) => {
      if (p.category && p.category !== 'Traditional' && p.category !== 'Signature') {
        set.add(p.category);
      }
    });
    if (!set.has('Nath')) {
      set.add('Nath');
    }
    return Array.from(set).sort();
  }, [categoriesList, allProducts]);

  // Main Category dropdown options
  const mainCategoryOptions = useMemo(() => {
    const unassignedCount = allProducts.filter((p) => !p.mainCategory).length;
    return [
      { value: 'ALL', label: `All Main Categories (${allProducts.length})` },
      ...MAIN_CATEGORIES.map((m) => {
        const count = allProducts.filter(
          (p) => (p.mainCategory || '').toLowerCase() === m.toLowerCase()
        ).length;
        return { value: m, label: m, count };
      }),
      {
        value: 'UNASSIGNED',
        label: `Needs Assignment (${unassignedCount})`,
        color: '#b45309'
      }
    ];
  }, [allProducts]);

  // Memoized options for AdminDropdown selectors
  const categoryOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: `All Categories (${allProducts.length})` }
    ];
    availableCategories.forEach((cat) => {
      const count = allProducts.filter((p) => p.category === cat).length;
      opts.push({ value: cat, label: cat, count });
    });
    return opts;
  }, [availableCategories, allProducts]);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'LIVE', label: 'Live in Store', color: '#15803d' },
    { value: 'HIDDEN', label: 'Hidden from Store', color: '#6b7280' }
  ], []);

  const stockOptions = useMemo(() => [
    { value: 'ALL', label: 'All Stock Levels' },
    { value: 'IN_STOCK', label: 'In Stock (> 5)', color: '#15803d' },
    { value: 'LOW_STOCK', label: 'Low Stock (1–5)', color: '#b45309' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock (0)', color: '#b91c1c' }
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'newest', label: 'Recently Added' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name_asc', label: 'Name: A to Z' },
    { value: 'name_desc', label: 'Name: Z to A' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'stock_asc', label: 'Stock: Low to High' },
    { value: 'stock_desc', label: 'Stock: High to Low' }
  ], []);

  const pageSizeOptions = useMemo(() => [
    { value: 10, label: '10 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' },
    { value: 100, label: '100 / page' }
  ], []);

  // Overall KPI Statistics
  const stats = useMemo(() => {
    let live = 0;
    let hidden = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let bestsellers = 0;
    let unassignedMainCategory = 0;

    allProducts.forEach((p) => {
      if (p.active) live++;
      else hidden++;

      if (!p.mainCategory) {
        unassignedMainCategory++;
      }

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
      bestsellers,
      unassignedMainCategory
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
        const mainCat = String(p.mainCategory || '').toLowerCase();
        const cat = String(p.category || '').toLowerCase();
        const tag = String(p.tag || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();

        const matches =
          name.includes(query) ||
          id.includes(query) ||
          mainCat.includes(query) ||
          cat.includes(query) ||
          tag.includes(query) ||
          desc.includes(query);

        if (!matches) return false;
      }

      // 2. Main Category Filter
      if (selectedMainCategory !== 'ALL') {
        if (selectedMainCategory === 'UNASSIGNED') {
          if (p.mainCategory) return false;
        } else {
          if ((p.mainCategory || '').toLowerCase() !== selectedMainCategory.toLowerCase()) {
            return false;
          }
        }
      }

      // 3. Category Filter
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
  }, [allProducts, searchQuery, selectedMainCategory, selectedCategory, selectedStatus, selectedStock, selectedBestseller]);

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
  }, [searchQuery, selectedMainCategory, selectedCategory, selectedStatus, selectedStock, selectedBestseller, sortBy, pageSize]);

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
    selectedMainCategory !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedStock !== 'ALL' ||
    selectedBestseller !== 'ALL' ||
    sortBy !== 'newest';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedMainCategory('ALL');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedStock('ALL');
    setSelectedBestseller('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Bulk Selection Handlers
  const toggleSelectProduct = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedProducts.map((p) => p.id || p._id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleExecuteBulkAssignment = async () => {
    if (selectedIds.length === 0 || !bulkMainCategory) return;
    setBulkLoading(true);
    try {
      const res = await api('/admin/products/bulk-main-category', {
        method: 'PATCH',
        body: JSON.stringify({
          productIds: selectedIds,
          mainCategory: bulkMainCategory
        })
      });
      setToast(`✓ Successfully assigned "${bulkMainCategory}" to ${res.modifiedCount || selectedIds.length} product(s).`);
      setSelectedIds([]);
      setShowBulkConfirmModal(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setToast(err.message || 'Failed to bulk assign Main Category');
    } finally {
      setBulkLoading(false);
    }
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

      {/* 2B. UNASSIGNED MAIN CATEGORY ALERT BANNER */}
      {stats.unassignedMainCategory > 0 && (
        <div className="unassignedAlertBanner">
          <div className="unassignedAlertText">
            <AlertCircle size={16} />
            <span>
              <b>{stats.unassignedMainCategory}</b> existing product{stats.unassignedMainCategory === 1 ? '' : 's'} have no Main Category assigned.
            </span>
          </div>
          <div className="unassignedAlertActions">
            <button
              type="button"
              className="filterUnassignedBtn"
              onClick={() => setSelectedMainCategory(selectedMainCategory === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
            >
              {selectedMainCategory === 'UNASSIGNED' ? 'Show All Products' : 'Filter Unassigned Products →'}
            </button>
          </div>
        </div>
      )}

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <section className="productControlsToolbar">
        {/* Search Bar */}
        <div className="productSearchContainer">
          <Search size={16} className="searchMagnifierIcon" />
          <input
            ref={searchInputRef}
            type="text"
            className="productSearchInput"
            placeholder="Search by name, ID / SKU, collection, category, tag, or description… (Press '/' to focus)"
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
          {/* Main Category (Collection) Dropdown */}
          <div className="filterControlWrap">
            <label className="filterInlineLabel">Main Category:</label>
            <AdminDropdown
              value={selectedMainCategory}
              onChange={setSelectedMainCategory}
              options={mainCategoryOptions}
              minWidth="180px"
              placeholder="All Main Categories"
            />
          </div>

          {/* Category Dropdown */}
          <div className="filterControlWrap">
            <label className="filterInlineLabel">Category:</label>
            <AdminDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              minWidth="175px"
              placeholder="All Categories"
            />
          </div>

          {/* Status Dropdown */}
          <div className="filterControlWrap">
            <label className="filterInlineLabel">Status:</label>
            <AdminDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              minWidth="155px"
              placeholder="All Statuses"
            />
          </div>

          {/* Stock Dropdown */}
          <div className="filterControlWrap">
            <label className="filterInlineLabel">Stock:</label>
            <AdminDropdown
              value={selectedStock}
              onChange={setSelectedStock}
              options={stockOptions}
              minWidth="160px"
              placeholder="All Stock Levels"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="filterControlWrap">
            <label className="filterInlineLabel">Sort:</label>
            <AdminDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              minWidth="165px"
              placeholder="Sort By"
            />
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
            {/* BULK ACTION BAR */}
            {selectedIds.length > 0 && (
              <div className="productBulkActionBar">
                <div className="bulkBarLeft">
                  <span className="bulkSelectedBadge">
                    <Boxes size={15} />
                    <b>{selectedIds.length}</b> {selectedIds.length === 1 ? 'product' : 'products'} selected
                  </span>
                  <button
                    type="button"
                    className="bulkClearSelectionBtn"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear Selection
                  </button>
                </div>

                <div className="bulkBarRight">
                  <span className="bulkActionLabel">Assign Main Category:</span>
                  <div className="bulkDropdownWrap">
                    <AdminDropdown
                      value={bulkMainCategory}
                      onChange={setBulkMainCategory}
                      options={MAIN_CATEGORIES.map((m) => ({ value: m, label: m }))}
                      minWidth="175px"
                      placeholder="Select Main Category"
                    />
                  </div>
                  <button
                    type="button"
                    className="goldBtn compact bulkApplyBtn"
                    onClick={() => setShowBulkConfirmModal(true)}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? 'Applying…' : 'Apply to Selected'}
                  </button>
                </div>
              </div>
            )}

            {/* DESKTOP TABLE VIEW */}
            <div className="productTableWrap">
              <table className="adminProductTable">
                <thead>
                  <tr>
                    <th className="thSelect" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="productHeaderCheckbox"
                        checked={
                          paginatedProducts.length > 0 &&
                          paginatedProducts.every((p) => selectedIds.includes(p.id || p._id))
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all visible products"
                        title="Select or deselect all visible products on this page"
                      />
                    </th>
                    <th className="thProduct">Product</th>
                    <th className="thMainCategory">Main Category</th>
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

                    const isSelected = selectedIds.includes(p.id || p._id);

                    return (
                      <tr
                        key={p.id || p._id}
                        className={`productTableRow ${!isLive ? 'isRowHidden' : ''} ${isSelected ? 'isRowSelected' : ''}`}
                        onClick={() => setViewingProduct(p)}
                      >
                        {/* 0. Row Selection Checkbox */}
                        <td className="tdSelect" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="productRowCheckbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(p.id || p._id)}
                            aria-label={`Select ${p.name}`}
                          />
                        </td>

                        {/* 1. Product Thumbnail & Name */}
                        <td className="tdProduct">
                          <div className="productThumbMetaWrap">
                            <div className="productTableThumb">
                              <img
                                src={p.img || p.images?.[0] || '/assets/nath-category.jpg'}
                                alt={p.name}
                                loading="lazy"
                                onError={(e) => {
                                  if (p.img && e.target.src !== p.img) {
                                    e.target.src = p.img;
                                  } else if (!e.target.src.includes('/assets/nath-category.jpg')) {
                                    e.target.src = '/assets/nath-category.jpg';
                                  }
                                }}
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

                        {/* 2. Main Category */}
                        <td className="tdMainCategory">
                          {p.mainCategory ? (
                            <span className="tableMainCategoryBadge">{p.mainCategory}</span>
                          ) : (
                            <span className="tableMainCategoryBadge unassigned">⚠️ Needs Assignment</span>
                          )}
                        </td>

                        {/* 3. Category */}
                        <td className="tdCategory">
                          <span className="tableCategoryPill">{p.category || 'Nath'}</span>
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

                            <AdminRowActionMenu
                              product={p}
                              onView={() => setViewingProduct(p)}
                              onEdit={() => editProduct(p)}
                              onToggleActive={toggleProductActive}
                              onToggleBestseller={toggleProductBestseller}
                              onDelete={() => setDeleteConfirmProduct(p)}
                            />
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
                const isSelected = selectedIds.includes(p.id || p._id);

                return (
                  <div
                    key={p.id || p._id}
                    className={`productMobileCard ${!isLive ? 'isCardHidden' : ''} ${isSelected ? 'isCardSelected' : ''}`}
                    onClick={() => setViewingProduct(p)}
                  >
                    <div className="mobileCardTop">
                      <div className="mobileSelectWrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="productRowCheckbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id || p._id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </div>

                      <div className="mobileCardThumb">
                        <img
                          src={p.img || p.images?.[0] || '/assets/nath-category.jpg'}
                          alt={p.name}
                          onError={(e) => {
                            if (p.img && e.target.src !== p.img) {
                              e.target.src = p.img;
                            } else if (!e.target.src.includes('/assets/nath-category.jpg')) {
                              e.target.src = '/assets/nath-category.jpg';
                            }
                          }}
                        />
                        {imgCount > 1 && (
                          <span className="mobilePhotoBadge">+{imgCount - 1}</span>
                        )}
                      </div>

                      <div className="mobileCardInfo">
                        <div className="mobileCardMetaTop">
                          {p.mainCategory ? (
                            <span className="mobileMainCategoryBadge">{p.mainCategory}</span>
                          ) : (
                            <span className="mobileMainCategoryBadge unassigned">⚠️ Needs Assignment</span>
                          )}
                          <span className="mobileCategoryPill">{p.category || 'Nath'}</span>
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

                      <AdminRowActionMenu
                        product={p}
                        onView={() => setViewingProduct(p)}
                        onEdit={() => editProduct(p)}
                        onToggleActive={toggleProductActive}
                        onToggleBestseller={toggleProductBestseller}
                        onDelete={() => setDeleteConfirmProduct(p)}
                      />
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
                  <label className="pageSizeLabel">Per page:</label>
                  <AdminDropdown
                    value={pageSize}
                    onChange={(val) => setPageSize(Number(val))}
                    options={pageSizeOptions}
                    direction="up"
                    minWidth="110px"
                    className="pageSizeAdminDropdown"
                  />
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
      {/* BULK MAIN CATEGORY CONFIRMATION MODAL */}
      {showBulkConfirmModal && (
        <div
          className="adminProductDetailOverlay"
          onClick={() => setShowBulkConfirmModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bulkSafetyDialog" onClick={(e) => e.stopPropagation()}>
            <div className="bulkSafetyIconWrap">
              <Boxes size={26} />
            </div>
            <h3>Assign Main Category</h3>
            <p>
              Are you sure you want to assign Main Category <b>"{bulkMainCategory}"</b> to <b>{selectedIds.length}</b> selected product{selectedIds.length === 1 ? '' : 's'}?
            </p>
            <div className="bulkSafetyNotice">
              <Check size={15} />
              <span>Only the <b>Main Category</b> field will be updated. Existing Category, Badge, price, images, stock, and parameters will remain unchanged.</span>
            </div>
            <div className="deleteSafetyBtnGroup">
              <button
                type="button"
                className="safetyCancelBtn"
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="goldBtn"
                style={{ padding: '8px 18px', fontSize: '13px' }}
                onClick={handleExecuteBulkAssignment}
                disabled={bulkLoading}
              >
                {bulkLoading ? 'Updating…' : `Yes, Update ${selectedIds.length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
