import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Plus, Search, X, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './SearchPanel.css';

const POPULAR_SEARCHES = ['Nath', 'Thushi', 'Moti', 'Kolhapuri Saaj', 'Tanmani', 'Mangalsutra', 'Parijat', 'Mundavali'];

export default function SearchPanel({ query, setQuery, results, onClose }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { lang, t } = useLanguage();
  const [addedIds, setAddedIds] = useState({});
  const inputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleAdd = (e, p) => {
    e.preventDefault();
    e.stopPropagation();

    const hasOptions =
      (Array.isArray(p.productParameters) && p.productParameters.length > 0) ||
      (Array.isArray(p.parameters) && p.parameters.length > 0) ||
      (Array.isArray(p.options) && p.options.length > 0);

    const searchUrl = query ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';

    if (hasOptions) {
      if (onClose) onClose();
      navigate(`/product/${p.id || p._id}`, {
        state: { from: 'search', searchUrl, searchQuery: query.trim() }
      });
      return;
    }

    addToCart(p, 1);

    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
    }, 1800);
  };

  const handleClearOrClose = () => {
    if (query) {
      setQuery('');
      if (inputRef.current) inputRef.current.focus();
    } else {
      if (onClose) onClose();
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = (query || '').trim();
    if (trimmed) {
      if (onClose) onClose();
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleTagClick = (tag) => {
    if (onClose) onClose();
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  };

  const currentSearchUrl = query ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';

  return (
    <div className="searchPanelWrapper">
      {/* Dimmed backdrop to close on outside click */}
      <div
        className="searchPanelBackdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Search Panel Box */}
      <div className="searchPanel" role="dialog" aria-modal="true" aria-label="Search Catalogue">
        <form className="searchInputWrap" onSubmit={handleSubmit}>
          <Search size={18} className="searchLeadIcon" />
          <input
            ref={inputRef}
            placeholder={t(
              'search_placeholder',
              'Search for Moti, Nath, Thushi, Kolhapuri Saaj, Tanmani...'
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="searchActionBtn"
              onClick={handleClearOrClose}
              aria-label="Clear query"
              title="Clear search"
            >
              <X size={17} />
            </button>
          )}
          <button
            type="submit"
            className="searchSubmitMiniBtn"
            title="Search catalogue"
            aria-label="Submit search"
            disabled={!query.trim()}
          >
            <Search size={14} />
            <span className="searchSubmitMiniLabel">{lang === 'mr' ? 'शोधा' : 'Search'}</span>
          </button>
          <button
            type="button"
            className="searchCloseModalBtn"
            onClick={onClose}
            aria-label="Close search"
            title="Close"
          >
            <X size={17} />
          </button>
        </form>

        {/* Popular search tags when query is empty */}
        {!query && (
          <div className="popularSearchTags">
            <span className="popularLabel">
              <Sparkles size={12} /> {t('popular_searches', 'Popular:')}
            </span>
            <div className="tagsList">
              {POPULAR_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="searchTagBtn"
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="searchResults">
          {query && results.length > 0 ? (
            <>
              {results.slice(0, 8).map((p) => {
                const isAdded = Boolean(addedIds[p.id]);
                return (
                  <Link
                    to={`/product/${p.id}`}
                    state={{
                      from: 'search',
                      searchUrl: currentSearchUrl,
                      searchQuery: query.trim()
                    }}
                    key={p.id}
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className="searchResultItem"
                  >
                    <img src={p.img || '/assets/thushi.jpg'} alt={p.name} />
                    <div className="resultItemDetails">
                      <span className="resultItemName">{p.name}</span>
                      <small className="resultItemPrice">{money(p.price)}</small>
                    </div>
                    <button
                      type="button"
                      className={`searchAddBtn ${isAdded ? 'searchAddBtn--added' : ''}`}
                      onClick={(e) => handleAdd(e, p)}
                      aria-label={`Add ${p.name} to bag`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={12} />
                          <span>{t('added', 'Added')}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>{t('add', 'Add')}</span>
                        </>
                      )}
                    </button>
                  </Link>
                );
              })}

              <div className="searchViewAllFooter">
                <button
                  type="button"
                  className="searchViewAllResultsBtn"
                  onClick={handleSubmit}
                >
                  <span>
                    {lang === 'mr'
                      ? `सर्व निकाल पहा (${results.length} दागिने)`
                      : `View all matching results (${results.length})`}
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : query ? (
            <div className="searchEmptyWrap">
              <p className="searchEmptyText">
                {t('no_pieces_found', 'No pieces found matching')} "{query}".
              </p>
              <button
                type="button"
                className="searchFullPageBtn"
                onClick={handleSubmit}
              >
                {lang === 'mr' ? 'पूर्ण कॅटलॉगमध्ये शोधा' : 'Search full catalogue'} →
              </button>
            </div>
          ) : (
            <p className="searchEmptyPrompt">
              {t(
                'search_prompt',
                'Type a jewellery name or select a popular category above to explore.'
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
