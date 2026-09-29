import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import ProductCard from '../../components/product/ProductCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import CategoryNavBar from '../../components/common/CategoryNavBar';
import './Category.css';

export default function Category() {
  const { cat } = useParams();
  const [items, setItems] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api(`/products?category=${encodeURIComponent(cat)}`).catch(() => []),
      api('/categories').catch(() => [])
    ])
      .then(([prods, allCats]) => {
        if (!isMounted) return;
        setItems(Array.isArray(prods) ? prods : []);

        if (Array.isArray(allCats)) {
          const matched = allCats.find(
            (c) =>
              (c.slug && c.slug.toLowerCase() === cat.toLowerCase()) ||
              (c.name && c.name.toLowerCase() === cat.toLowerCase()) ||
              (c.slug && c.slug.toLowerCase() === decodeURIComponent(cat).toLowerCase()) ||
              (c.name && c.name.toLowerCase() === decodeURIComponent(cat).toLowerCase())
          );
          setCategoryInfo(matched || null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cat]);

  const displayCategoryName = categoryInfo ? categoryInfo.name : decodeURIComponent(cat);

  return (
    <main className="page">
      <Breadcrumbs
        items={[
          { label: t('nav_all_jewellery', 'All Jewellery'), path: '/shop' },
          { label: `${displayCategoryName} Collection` }
        ]}
        backPath="/shop"
        backLabel={t('nav_all_jewellery', 'All Jewellery')}
      />

      <SectionTitle
        title={`${displayCategoryName} Collection`}
        sub={t(
          'all_jewellery_sub',
          'Crafted with tradition, finished with a modern heirloom feel.'
        )}
      />

      <CategoryNavBar activeCategory={cat} />

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
