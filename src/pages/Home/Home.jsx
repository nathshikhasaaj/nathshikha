import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Hero from '../../components/home/Hero';
import CategoryGrid from '../../components/home/CategoryGrid';
import ProductCard from '../../components/product/ProductCard';
import SectionTitle from '../../components/common/SectionTitle';
import Testimonials from '../../components/home/Testimonials';
import Features from '../../components/home/Features';
import './Home.css';

export default function Home({ products = [] }) {
  const { t } = useLanguage();

  // Admin-selected Bestsellers
  const bestsellers = React.useMemo(() => {
    const adminSelected = products.filter(
      (p) =>
        (p.isBestseller || p.is_bestseller || p.tag === 'BESTSELLER') &&
        p.active !== 0
    );
    // If admin has flagged specific bestsellers, display them.
    // Fallback: If no products have been flagged yet, show top 4 active items.
    return adminSelected.length > 0
      ? adminSelected
      : products.filter((p) => p.active !== 0).slice(0, 4);
  }, [products]);

  // Signature Pieces
  const signaturePieces = React.useMemo(() => {
    return products.filter((p) => p.active !== 0).slice(0, 4);
  }, [products]);

  return (
    <main className="homePage">
      <Hero />

      {/* Category Section */}
      <section className="section patterned">
        <SectionTitle title={t('shop_by_category', 'Shop by Category')} />
        <CategoryGrid />
      </section>

      {/* OUR BESTSELLERS SECTION (Admin Curated) */}
      {bestsellers.length > 0 && (
        <section className="section bestsellersSection">
          <SectionTitle
            eyebrow={t('bestsellers_eyebrow', 'HANDCRAFTED ROYAL FAVOURITES')}
            title={t('bestsellers_title', 'Our Bestsellers')}
            sub={t(
              'bestsellers_sub',
              'The most loved and cherished heirloom designs chosen by patrons across India.'
            )}
          />
          <div className="productGrid bestsellersProductGrid">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          <Link className="goldBtn center bestsellersActionBtn" to="/shop">
            {t('explore_all_bestsellers', 'EXPLORE ALL BESTSELLERS')}
          </Link>
        </section>
      )}

      {/* Signature Collection Section */}
      <section className="section cream">
        <SectionTitle
          title={t('signature_title', 'Signature Pieces')}
          sub={t(
            'signature_sub',
            'Exquisite craftsmanship inspired by the Maratha empire’s golden era.'
          )}
        />
        <div className="productGrid">
          {signaturePieces.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <Link className="outlineBtn center" to="/shop">
          {t('view_all_pieces', 'VIEW ALL PIECES')}
        </Link>
      </section>

      <Testimonials />
      <Features />
    </main>
  );
}
