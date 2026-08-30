import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import ProductCard from '../../components/product/ProductCard';
import './Category.css';

export default function Category() {
  const { cat } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    api(`/products?category=${encodeURIComponent(cat)}`)
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cat]);

  return (
    <main className="page">
      <SectionTitle
        title={`${cat} Collection`}
        sub={t(
          'all_jewellery_sub',
          'Crafted with tradition, finished with a modern heirloom feel.'
        )}
      />

      {loading ? (
        <div className="empty">
          <p>{t('processing', 'Loading pieces…')}</p>
        </div>
      ) : items.length > 0 ? (
        <div className="categoryProductGrid">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>More pieces are being handcrafted for this collection.</p>
          <Link className="goldBtn" to="/shop">
            {t('explore_collection', 'VIEW ALL JEWELLERY')}
          </Link>
        </div>
      )}
    </main>
  );
}
