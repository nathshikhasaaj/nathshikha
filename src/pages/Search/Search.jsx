import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import ProductCard from '../../components/product/ProductCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import './Search.css';

const POPULAR_SEARCH_TAGS = [
  'Nath',
  'Parijat',
  'Mundavali',
  'Thushi',
  'Kolhapuri Saaj',
  'Moti',
  'Tanmani',
  'Mangalsutra'
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  // URL state
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('cat') || 'all';
  const sortParam = searchParams.get('sort') || 'featured';

  // Local form & filter state
  const [inputValue, setInputValue] = useState(queryParam);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Temporary filter state for mobile modal
  const [modalCategory, setModalCategory] = useState(categoryParam);
  const [modalSort, setModalSort] = useState(sortParam);

  const inputRef = useRef(null);
  const isFirstRender = useRef(true);

  // Keep input value in sync when queryParam in URL changes (e.g. Back/Forward)
  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  // Sync modal state when URL params change
  useEffect(() => {
    setModalCategory(categoryParam);
    setModalSort(sortParam);
  }, [categoryParam, sortParam]);

  // Fetch available categories once for filters
  useEffect(() => {
    let isMounted = true;
    api('/categories')
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch matching products
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (queryParam.trim()) {
        params.set('search', queryParam.trim());
      }
      if (categoryParam && categoryParam !== 'all') {
        params.set('category', categoryParam);
      }
      if (sortParam && sortParam !== 'featured') {
        params.set('sort', sortParam);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/products?${queryString}` : '/products';
      const data = await api(endpoint);

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Search request error:', err);
      setError(err.message || 'Unable to load search results.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [queryParam, categoryParam, sortParam]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Scroll restoration if returning from product detail page
  useEffect(() => {
    if (!loading && location.state?.restoreScroll !== undefined) {
      const targetScroll = Number(location.state.restoreScroll) || 0;
      setTimeout(() => {
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      }, 50);
    }
  }, [loading, location.state]);

  // Handle Search Input Submission
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    const nextParams = new URLSearchParams(searchParams);
    if (trimmed) {
      nextParams.set('q', trimmed);
    } else {
      nextParams.delete('q');
    }
    // Reset page category to all when a new search is initiated unless already refined
    setSearchParams(nextParams);
    if (inputRef.current) inputRef.current.blur();
  };

  // Handle Quick Tag Click
  const handleTagClick = (tag) => {
    setInputValue(tag);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('q', tag);
    setSearchParams(nextParams);
  };

  // Clear query
  const handleClearQuery = () => {
    setInputValue('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);
    if (inputRef.current) inputRef.current.focus();
  };

  // Handle Category Filter change
  const handleCategoryChange = (newCat) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newCat && newCat !== 'all') {
      nextParams.set('cat', newCat);
    } else {
      nextParams.delete('cat');
    }
    setSearchParams(nextParams);
  };

  // Handle Sort change
  const handleSortChange = (newSort) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newSort && newSort !== 'featured') {
      nextParams.set('sort', newSort);
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams);
  };

  // Reset all filters
  const handleResetFilters = () => {
    const nextParams = new URLSearchParams();
    if (queryParam) {
      nextParams.set('q', queryParam);
    }
    setSearchParams(nextParams);
    setIsFilterModalOpen(false);
  };

  // Apply modal filters on mobile
  const handleApplyModalFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    if (modalCategory && modalCategory !== 'all') {
      nextParams.set('cat', modalCategory);
    } else {
      nextParams.delete('cat');
    }
    if (modalSort && modalSort !== 'featured') {
      nextParams.set('sort', modalSort);
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams);
    setIsFilterModalOpen(false);
  };

  const activeFiltersCount = (categoryParam !== 'all' ? 1 : 0) + (sortParam !== 'featured' ? 1 : 0);

  // Card navigation state preserved when opening any product
  const cardLinkState = {
    from: 'search',
    searchUrl: `${location.pathname}${location.search}`,
    searchQuery: queryParam,
    category: categoryParam,
    sort: sortParam,
    scrollPos: typeof window !== 'undefined' ? window.scrollY : 0
  };

  const hasActiveFilters = categoryParam !== 'all' || sortParam !== 'featured';

  return (
    <main className="page searchResultsPage">
      {/* 1. Breadcrumbs */}
      <Breadcrumbs
        items={
          queryParam
            ? [
                { label: t('nav_all_jewellery', 'All Jewellery'), path: '/shop' },
                { label: `${t('search_title', 'Search')}: "${queryParam}"` }
              ]
            : [
                { label: t('nav_all_jewellery', 'All Jewellery'), path: '/shop' },
                { label: t('search_title', 'Search') }
              ]
        }
        showBack={false}
      />

      {/* 2. Search Box Hero */}
      <section className="searchHeroBox" aria-label="Search form">
        <form className="searchBarContainer" onSubmit={handleSearchSubmit}>
          <div className="searchBarIcon">
            <SearchIcon size={20} />
          </div>
          <input
            id="searchPageInput"
            ref={inputRef}
            type="search"
            className="searchPageInput"
            placeholder={t(
              'search_placeholder',
              'Search for Moti, Nath, Thushi, Kolhapuri Saaj, Tanmani...'
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete="off"
            aria-label="Search jewellery catalogue"
          />
          {inputValue && (
            <button
              type="button"
              className="searchClearBtn"
              onClick={handleClearQuery}
              title={t('clear', 'Clear search')}
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="searchSubmitBtn"
            aria-label="Submit search"
          >
            <SearchIcon size={16} />
            <span className="searchSubmitLabel">{lang === 'mr' ? 'शोधा' : 'Search'}</span>
          </button>
        </form>

        {/* Popular searches suggestions */}
        <div className="searchPopularTags">
          <span className="searchPopularLabel">
            <Sparkles size={13} />
            <span>{t('popular_searches', 'Popular:')}</span>
          </span>
          <div className="searchTagRow">
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`searchTagChip ${queryParam.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Results Header & Controls */}
      <section className="searchResultsHeader" aria-label="Search controls">
        <div className="resultsSummary">
          <h1 className="resultsHeading">
            {queryParam ? (
              <>
                {lang === 'mr' ? 'शोध निकाल:' : 'Search Results for'}{' '}
                <span className="queryHighlight">"{queryParam}"</span>
              </>
            ) : (
              lang === 'mr' ? 'सर्व अस्सल दागिने' : 'Explore All Jewellery'
            )}
          </h1>
          {!loading && (
            <p className="resultsCount">
              {products.length}{' '}
              {products.length === 1
                ? (lang === 'mr' ? 'दागिना उपलब्ध' : 'piece found')
                : (lang === 'mr' ? 'दागिने उपलब्ध' : 'pieces found')}
            </p>
          )}
        </div>

        {/* Desktop Filter & Sort Controls */}
        <div className="searchDesktopControls">
          <div className="filterControlGroup">
            <label htmlFor="categoryFilter" className="controlLabel">
              {lang === 'mr' ? 'प्रकार:' : 'Category:'}
            </label>
            <select
              id="categoryFilter"
              className="searchSelect"
              value={categoryParam}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="all">{lang === 'mr' ? 'सर्व प्रकार (All)' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id || c.slug || c.name} value={c.slug || c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filterControlGroup">
            <label htmlFor="sortFilter" className="controlLabel">
              {lang === 'mr' ? 'क्रमवारी:' : 'Sort by:'}
            </label>
            <select
              id="sortFilter"
              className="searchSelect"
              value={sortParam}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="featured">
                {queryParam
                  ? (lang === 'mr' ? 'सर्वात समर्पक (Best Match)' : 'Most Relevant')
                  : (lang === 'mr' ? 'वैशिष्ट्यपूर्ण (Featured)' : 'Featured')}
              </option>
              <option value="low">{lang === 'mr' ? 'किंमत: कमी ते जास्त' : 'Price: Low to High'}</option>
              <option value="high">{lang === 'mr' ? 'किंमत: जास्त ते कमी' : 'Price: High to Low'}</option>
              <option value="name_asc">{lang === 'mr' ? 'नाव: अ ते ज्ञ (A to Z)' : 'Name: A to Z'}</option>
              <option value="name_desc">{lang === 'mr' ? 'नाव: ज्ञ ते अ (Z to A)' : 'Name: Z to A'}</option>
              <option value="newest">{lang === 'mr' ? 'नवीनतम (Newest)' : 'Newest First'}</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="searchResetBtn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>{lang === 'mr' ? 'फिल्टर्स साफ करा' : 'Reset Filters'}</span>
            </button>
          )}
        </div>

        {/* Mobile Toolbar (Filter & Sort Buttons) */}
        <div className="searchMobileToolbar">
          <button
            type="button"
            className={`mobileFilterBtn ${hasActiveFilters ? 'hasActive' : ''}`}
            onClick={() => setIsFilterModalOpen(true)}
            aria-label="Open filter options"
          >
            <SlidersHorizontal size={14} />
            <span>{lang === 'mr' ? 'फिल्टर्स' : 'Filter'}</span>
            {activeFiltersCount > 0 && (
              <span className="filterBadgeCount">{activeFiltersCount}</span>
            )}
          </button>

          <div className="mobileSortWrap">
            <ArrowUpDown size={14} className="sortIcon" />
            <select
              className="mobileSortSelect"
              value={sortParam}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Sort products"
            >
              <option value="featured">
                {queryParam ? 'Best Match' : 'Featured'}
              </option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </section>

      {/* Active Filter Chips (if any) */}
      {hasActiveFilters && (
        <div className="activeFilterChipsRow">
          {categoryParam !== 'all' && (
            <span className="filterChip">
              <span>Category: {categoryParam}</span>
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                aria-label="Remove category filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {sortParam !== 'featured' && (
            <span className="filterChip">
              <span>
                Sort: {sortParam === 'low' ? 'Price Low-High' : sortParam === 'high' ? 'Price High-Low' : sortParam === 'name_asc' ? 'A-Z' : 'Newest'}
              </span>
              <button
                type="button"
                onClick={() => handleSortChange('featured')}
                aria-label="Reset sort"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            className="clearAllChipsBtn"
            onClick={handleResetFilters}
          >
            {lang === 'mr' ? 'सर्व काढा' : 'Clear all'}
          </button>
        </div>
      )}

      {/* 4. Main Products Grid / States */}
      <section className="searchProductsSection" aria-live="polite">
        {loading ? (
          <div className="searchLoadingState">
            <Loader2 className="searchLoadingSpinner" size={32} />
            <p className="loadingText">
              {lang === 'mr'
                ? 'नथशिखा साज कॅटलॉग शोधत आहे...'
                : 'Searching authentic handcrafted Maharashtrian heirlooms...'}
            </p>
          </div>
        ) : error ? (
          <div className="searchErrorState">
            <AlertCircle size={36} className="errorIcon" />
            <h2 className="errorHeading">
              {lang === 'mr' ? 'शोध निकाल लोड होऊ शकले नाहीत' : 'Unable to Load Search Results'}
            </h2>
            <p className="errorSub">
              {error || 'An unexpected error occurred. Please check your connection and retry.'}
            </p>
            <button
              type="button"
              className="goldBtn retryBtn"
              onClick={fetchSearchResults}
            >
              {lang === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry Search'}
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className="searchProductGrid">
            {products.map((p) => (
              <ProductCard
                key={p.id || p._id}
                p={p}
                linkState={cardLinkState}
              />
            ))}
          </div>
        ) : (
          <div className="searchEmptyState">
            <div className="emptyIconWrapper">
              <SearchIcon size={36} />
            </div>
            <h2 className="emptyHeading">
              ✦ {lang === 'mr' ? `"${queryParam}" साठी कोणतेही दागिने सापडले नाहीत` : `No pieces found for "${queryParam}"`} ✦
            </h2>
            <p className="emptySub">
              {lang === 'mr'
                ? 'कृपया स्पेलिंग तपासा किंवा खालील लोकप्रिय दागिन्यांमधून निवडून शोध घ्या.'
                : "We couldn't find any pieces matching your search query. Try checking your spelling, using simpler words, or browse popular heirlooms below."}
            </p>

            <div className="emptySuggestedTags">
              <span className="suggestedLabel">
                {lang === 'mr' ? 'सुचवलेले शोध:' : 'Try searching for:'}
              </span>
              <div className="suggestedTagsList">
                {POPULAR_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="suggestedTagBtn"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="emptyActionBtns">
              {queryParam && (
                <button
                  type="button"
                  className="searchResetActionBtn"
                  onClick={handleClearQuery}
                >
                  {lang === 'mr' ? 'शोध साफ करा' : 'Clear Search'}
                </button>
              )}
              <Link to="/shop" className="goldBtn exploreAllBtn">
                {lang === 'mr' ? 'सर्व दागिने पहा' : 'EXPLORE ALL JEWELLERY'}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 5. Mobile Filter & Sort Drawer / Bottom Sheet */}
      {isFilterModalOpen && (
        <div className="searchFilterDrawerWrapper" role="dialog" aria-modal="true">
          <div
            className="searchFilterDrawerBackdrop"
            onClick={() => setIsFilterModalOpen(false)}
            aria-hidden="true"
          />
          <div className="searchFilterDrawer">
            <div className="drawerHeader">
              <div className="drawerTitleRow">
                <SlidersHorizontal size={18} />
                <h3>{lang === 'mr' ? 'फिल्टर्स आणि क्रमवारी' : 'Filter & Sort'}</h3>
              </div>
              <button
                type="button"
                className="drawerCloseBtn"
                onClick={() => setIsFilterModalOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawerContent">
              {/* Category Filter Section */}
              <div className="drawerSection">
                <h4 className="drawerSectionTitle">
                  {lang === 'mr' ? 'दागिन्यांचा प्रकार (Category)' : 'Jewellery Category'}
                </h4>
                <div className="drawerOptionList">
                  <label
                    className={`drawerOptionItem ${modalCategory === 'all' ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="modalCategory"
                      value="all"
                      checked={modalCategory === 'all'}
                      onChange={() => setModalCategory('all')}
                    />
                    <span>{lang === 'mr' ? 'सर्व प्रकार (All Pieces)' : 'All Categories'}</span>
                  </label>
                  {categories.map((c) => {
                    const slug = c.slug || c.name;
                    return (
                      <label
                        key={c.id || slug}
                        className={`drawerOptionItem ${modalCategory === slug ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="modalCategory"
                          value={slug}
                          checked={modalCategory === slug}
                          onChange={() => setModalCategory(slug)}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sort Section */}
              <div className="drawerSection">
                <h4 className="drawerSectionTitle">
                  {lang === 'mr' ? 'क्रमवारी लावा (Sort)' : 'Sort By'}
                </h4>
                <div className="drawerOptionList">
                  {[
                    { value: 'featured', label: queryParam ? 'Best Match' : 'Featured' },
                    { value: 'low', label: 'Price: Low to High' },
                    { value: 'high', label: 'Price: High to Low' },
                    { value: 'name_asc', label: 'Product Name: A to Z' },
                    { value: 'newest', label: 'Newest First' }
                  ].map((s) => (
                    <label
                      key={s.value}
                      className={`drawerOptionItem ${modalSort === s.value ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="modalSort"
                        value={s.value}
                        checked={modalSort === s.value}
                        onChange={() => setModalSort(s.value)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="drawerFooter">
              <button
                type="button"
                className="drawerResetBtn"
                onClick={() => {
                  setModalCategory('all');
                  setModalSort('featured');
                }}
              >
                {lang === 'mr' ? 'रीसेट' : 'Reset'}
              </button>
              <button
                type="button"
                className="drawerApplyBtn"
                onClick={handleApplyModalFilters}
              >
                {lang === 'mr' ? 'फिल्टर्स लागू करा' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
