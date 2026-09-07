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

      {/* Hall of Fame Showcase Section on Homepage */}
      <section className="section hofHomeSection">
        <SectionTitle
          eyebrow={t('hof_home_eyebrow', '✦ REAL PATRONS & BRIDES ✦')}
          title={t('hof_home_title', 'Hall of Fame')}
          sub={t(
            'hof_home_sub',
            'Celebrate cherished moments of heritage and royal elegance styled by real patrons.'
          )}
        />
        <div className="hofHomeBannerCard">
          <div className="hofHomeContent">
            <span className="hofHomeBadge">✦ REAL BRIDAL HERITAGE ✦</span>
            <h3>Royal Elegance Worn with Pride</h3>
            <p>
              Witness how our patrons style their handcrafted Peshwai thushis, royal saaj sets, and luminous pearl malas for auspicious wedding ceremonies and festive celebrations.
            </p>
            <Link className="goldBtn hofHomeActionBtn" to="/hall-of-fame">
              {t('explore_hall_of_fame', 'EXPLORE HALL OF FAME →')}
            </Link>
          </div>
          <div className="hofHomePhotosGrid">
            <div className="hofHomePhotoItem">
              <img src="/assets/nath-category.jpg" alt="Priya Sharma-Patil" loading="lazy" />
              <span>Priya · Wedding</span>
            </div>
            <div className="hofHomePhotoItem">
              <img src="/assets/hero.jpg" alt="Ananya Deshpande" loading="lazy" />
              <span>Ananya · Engagement</span>
            </div>
            <div className="hofHomePhotoItem">
              <img src="/assets/pearl-category.jpg" alt="Shweta Kulkarni" loading="lazy" />
              <span>Shweta · Reception</span>
            </div>
            <div className="hofHomePhotoItem">
              <img src="/assets/thushi-category.jpg" alt="Tanvi Bhosale" loading="lazy" />
              <span>Tanvi · Mehendi</span>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />
      <Features />
    </main>
  );
}
