import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import './CategoryNavBar.css';

export default function CategoryNavBar({ activeCategory }) {
  const location = useLocation();
  const { lang, t } = useLanguage();
  const [categories, setCategories] = useState([]);

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

  const currentPath = location.pathname;

  return (
    <div className="categoryNavWrapper" aria-label="Explore Categories">
      <div className="categoryNavScroll">
        {/* 1. All Jewellery Pill */}
        <Link
          to="/shop"
          className={`categoryNavPill ${currentPath === '/shop' && !activeCategory ? 'active' : ''}`}
        >
          <span className="pillDot"></span>
          <span>{t('all_jewellery_nav', 'All Jewellery')}</span>
        </Link>

        {/* 2. Dynamic Active Categories from Database */}
        {categories.map((cat) => {
          const catSlug = cat.slug || cat.name;
          const catPath = `/category/${catSlug}`;
          const isSelected =
            Boolean(activeCategory) &&
            (activeCategory.toLowerCase() === (cat.slug || '').toLowerCase() ||
              activeCategory.toLowerCase() === (cat.name || '').toLowerCase() ||
              decodeURIComponent(activeCategory).toLowerCase() === (cat.name || '').toLowerCase() ||
              decodeURIComponent(activeCategory).toLowerCase() === (cat.slug || '').toLowerCase());

          const isActive = isSelected || currentPath === catPath;

          return (
            <Link
              key={cat.id || cat.slug || cat.name}
              to={catPath}
              className={`categoryNavPill ${isActive ? 'active' : ''}`}
            >
              <span className="pillDot"></span>
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
