import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Search, X, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './SearchPanel.css';

const POPULAR_SEARCHES = ['Nath', 'Thushi', 'Moti', 'Kolhapuri Saaj', 'Tanmani', 'Mangalsutra'];

export default function SearchPanel({ query, setQuery, results, onClose }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
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
        <div className="searchInputWrap">
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
          <button
            type="button"
            className="searchActionBtn"
            onClick={handleClearOrClose}
            aria-label={query ? 'Clear query' : 'Close search'}
            title={query ? 'Clear search' : 'Close'}
          >
            <X size={17} />
          </button>
        </div>

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
                  onClick={() => setQuery(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="searchResults">
          {query && results.length > 0 ? (
            results.slice(0, 8).map((p) => {
              const isAdded = Boolean(addedIds[p.id]);
              return (
                <Link
                  to={`/product/${p.id}`}
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
            })
          ) : query ? (
            <p className="searchEmptyText">
              {t('no_pieces_found', 'No pieces found matching')} "{query}".
            </p>
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
