import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { money } from '../../utils/formatters';
import './SearchPanel.css';

export default function SearchPanel({ query, setQuery, results }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();

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
          results.slice(0, 6).map((p) => (
            <Link to={`/product/${p.id}`} key={p.id}>
              <img src={p.img} alt={p.name} />
              <span>
                {p.name}
                <small>{money(p.price)}</small>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  addToCart(p);
                }}
              >
                {t('add', 'Add')}
              </button>
            </Link>
          ))
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
