import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Home, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './NotFound.css';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <main className="page notFoundPage" role="main">
      <div className="notFoundCard">
        <div className="notFoundIconWrap" aria-hidden="true">
          <Sparkles size={36} />
        </div>
        <span className="notFoundBadge">404 · PAGE NOT FOUND</span>
        <h1 className="notFoundTitle">The Treasure You Seek Cannot Be Found</h1>
        <p className="notFoundText">
          The handcrafted heirloom or page you are looking for may have been moved, renamed, or is no longer available in our collection.
        </p>
        <div className="notFoundActions">
          <Link className="goldBtn notFoundBtnPrimary" to="/shop">
            <ShoppingBag size={15} />
            <span>{t('explore_collection', 'EXPLORE ALL JEWELLERY')}</span>
          </Link>
          <Link className="outlineBtn notFoundBtnSecondary" to="/">
            <Home size={15} />
            <span>{t('back_to_home', 'BACK TO HOME')}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
