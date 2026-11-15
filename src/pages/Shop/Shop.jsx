import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import ProductCard from '../../components/product/ProductCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import CategoryNavBar from '../../components/common/CategoryNavBar';
import './Shop.css';

export default function Shop({ products = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mainCategoryParam =
    searchParams.get('mainCategory') ||
    searchParams.get('collection') ||
    searchParams.get('category') ||
    '';
  const [sort, setSort] = useState('featured');
  const { t } = useLanguage();

  const filteredProducts = useMemo(() => {
    if (!mainCategoryParam || mainCategoryParam.toLowerCase() === 'all') {
      return products;
    }
    const target = mainCategoryParam.trim().toLowerCase();

    // 1. Prioritize explicit mainCategory if assigned by admin
    const explicitMatches = products.filter((p) => {
      const pMain = String(p.mainCategory || p.main_category || '').trim().toLowerCase();
      return pMain === target;
    });
    if (explicitMatches.length > 0) {
      return explicitMatches;
    }

    // 2. Direct category match if category name matches target
    const directCatMatches = products.filter((p) => {
      const pCat = String(p.category || '').trim().toLowerCase();
      return pCat === target;
    });
    if (directCatMatches.length > 0) {
      return directCatMatches;
    }

    // 3. Intelligent fallback matching by category, tags, and craftsmanship keywords
    // Ensures storefront customers always see curated pieces and never encounter an empty collection
    return products.filter((p) => {
      const pMain = String(p.mainCategory || p.main_category || '').trim().toLowerCase();
      if (pMain === target) return true;
      const pCat = String(p.category || '').trim().toLowerCase();
      const pTag = String(p.tag || '').trim().toLowerCase();
      const pName = String(p.name || '').toLowerCase();
      const pDesc = String(p.description || '').toLowerCase();

      if (target === 'signature') {
        return (
          pTag === 'signature' ||
          pTag === 'bestseller' ||
          pTag === 'handmade' ||
          Boolean(p.isBestseller) ||
          /saaj|mukta|signature|heirloom|royal|पद्मिनी|नीरजा/i.test(pName + ' ' + pDesc)
        );
      }
      if (target === 'traditional') {
        return (
          pCat === 'traditional' ||
          /traditional|पारंपरिक|ठुशी|thushi|kolhapuri|saaj|ghungroo|chinchpeti/i.test(pName + ' ' + pDesc)
        );
      }
      if (target === 'wedding special' || target === 'wedding' || target === 'bridal') {
        return (
          pCat === 'mundavali' ||
          pTag === 'bridal' ||
          /wedding|bridal|mundavali|sapta|lagna|bride|लग्न|मुंडावळी|विवाह|सुपारी/i.test(pName + ' ' + pDesc)
        );
      }
      if (target === 'nath' || target === 'nath collection') {
        return pCat === 'nath' || pName.includes('nath') || pName.includes('नथ');
      }
      if (target === 'other') {
        return (
          pCat === 'other' ||
          pCat === 'accessories' ||
          !['ear accessories', 'nath', 'necklace', 'mundavali', 'traditional'].includes(pCat)
        );
      }
      return pCat === target;
    });
  }, [products, mainCategoryParam]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sort === 'low') return a.price - b.price;
      if (sort === 'high') return b.price - a.price;
      return b.id - a.id;
    });
  }, [filteredProducts, sort]);

  const clearMainCategoryFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('mainCategory');
    next.delete('collection');
    next.delete('category');
    setSearchParams(next);
  };

  const pageTitle = mainCategoryParam
    ? `${mainCategoryParam} Collection`
    : t('all_jewellery_title', 'All Jewellery');

  const pageSubtitle = mainCategoryParam
    ? `Exclusive handcrafted heirloom designs in our ${mainCategoryParam} collection.`
    : t('all_jewellery_sub', 'Handmade Maharashtrian heirlooms, made to be treasured.');

  return (
    <main className="page">
      {mainCategoryParam ? (
        <Breadcrumbs
          items={[
            { label: t('all_jewellery_title', 'All Jewellery'), path: '/shop' },
            { label: `${mainCategoryParam} Collection` }
          ]}
          backPath="/shop"
          backLabel={t('all_jewellery_title', 'All Jewellery')}
        />
      ) : (
        <Breadcrumbs items={[{ label: t('all_jewellery_title', 'All Jewellery') }]} showBack={false} />
      )}

      <SectionTitle
        title={pageTitle}
        sub={pageSubtitle}
      />

      <CategoryNavBar />

      {mainCategoryParam && (
        <div className="mainCategoryActiveBanner">
          <div className="activeFilterPill">
            <Sparkles size={14} />
            <span>Collection: <b>{mainCategoryParam}</b></span>
            <button
              type="button"
              className="clearFilterBtn"
              onClick={clearMainCategoryFilter}
              title="Show all jewellery"
            >
              <X size={13} />
              <span>Clear Filter</span>
            </button>
          </div>
        </div>
      )}

      <div className="shopTools">
        <span>
          {filteredProducts.length} {t('pieces_count', 'pieces')}
          {mainCategoryParam ? ` in ${mainCategoryParam}` : ''}
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
            <p className="emptyHeading">
              ✦ {mainCategoryParam ? `No Pieces in ${mainCategoryParam} Yet` : t('no_products_title', 'Catalogue is Currently Empty')} ✦
            </p>
            <p className="emptySub">
              {mainCategoryParam
                ? `More authentic handcrafted pieces for the ${mainCategoryParam} collection are being crafted.`
                : t('no_products_sub', 'New authentic handcrafted jewellery collections will be added soon.')}
            </p>
            {mainCategoryParam && (
              <div style={{ marginTop: '16px' }}>
                <Link className="goldBtn center" to="/shop" onClick={clearMainCategoryFilter}>
                  {t('explore_collection', 'VIEW ALL JEWELLERY')}
                </Link>
              </div>
            )}
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
