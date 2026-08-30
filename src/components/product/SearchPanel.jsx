import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './SearchPanel.css';

export default function SearchPanel({ query, setQuery, results }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [addedIds, setAddedIds] = useState({});

  const handleAdd = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(p, 1);

    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
    }, 1800);
  };

  return (
    <div className="searchPanel">
      <input
        autoFocus
        placeholder={t(
          'search_placeholder',
          'Search for Moti, Nath, Thushi, Kolhapuri Saaj, Tanmani...'
        )}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="searchResults">
        {query && results.length > 0 ? (
          results.slice(0, 6).map((p) => {
            const isAdded = Boolean(addedIds[p.id]);
            return (
              <Link to={`/product/${p.id}`} key={p.id}>
                <img src={p.img || '/assets/thushi.jpg'} alt={p.name} />
                <span>
                  {p.name}
                  <small>{money(p.price)}</small>
                </span>
                <button
                  type="button"
                  className={isAdded ? 'searchAddBtn--added' : ''}
                  onClick={(e) => handleAdd(e, p)}
                  aria-label={`Add ${p.name} to bag`}
                >
                  {isAdded ? (
                    <>
                      <Check size={11} style={{ marginRight: 3 }} />
                      {t('added', 'Added')}
                    </>
                  ) : (
                    <>
                      <Plus size={11} style={{ marginRight: 3 }} />
                      {t('add', 'Add')}
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
          <p className="searchEmptyText">
            {t(
              'search_popular',
              'Popular: Nath · Thushi · Moti · Kolhapuri Saaj · Tanmani'
            )}
          </p>
        )}
      </div>
    </div>
  );
}

