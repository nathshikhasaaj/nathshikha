import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import ProductCard from '../../components/product/ProductCard';
import './Shop.css';

export default function Shop({ products = [] }) {
  const [sort, setSort] = useState('featured');
  const { t } = useLanguage();

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sort === 'low') return a.price - b.price;
      if (sort === 'high') return b.price - a.price;
      return b.id - a.id;
    });
  }, [products, sort]);

  return (
    <main className="page">
      <SectionTitle
        title={t('all_jewellery_title', 'All Jewellery')}
        sub={t(
          'all_jewellery_sub',
          'Handmade Maharashtrian heirlooms, made to be treasured.'
        )}
      />

      <div className="shopTools">
        <span>
          {products.length} {t('pieces_count', 'pieces')}
        </span>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="featured">{t('sort_featured', 'Featured')}</option>
          <option value="low">{t('sort_low', 'Price: Low to High')}</option>
          <option value="high">{t('sort_high', 'Price: High to Low')}</option>
        </select>
      </div>

      <div className="shopProductGrid">
        {sortedProducts.length === 0 ? (
          <div className="shopEmptyState">
            <p className="emptyHeading">✦ {t('no_products_title', 'Catalogue is Currently Empty')} ✦</p>
            <p className="emptySub">
              {t(
                'no_products_sub',
                'New authentic handcrafted jewellery collections will be added soon.'
              )}
            </p>
          </div>
        ) : (
          sortedProducts.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))
        )}
      </div>
    </main>
  );
}
