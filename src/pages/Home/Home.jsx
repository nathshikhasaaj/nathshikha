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

  return (
    <main className="homePage">
      <Hero />

      <section className="section patterned">
        <SectionTitle title={t('shop_by_category', 'Shop by Category')} />
        <CategoryGrid />
      </section>

      <section className="section cream">
        <SectionTitle
          title={t('signature_title', 'Signature Pieces')}
          sub={t(
            'signature_sub',
            'Exquisite craftsmanship inspired by the Maratha empire’s golden era.'
          )}
        />
        <div className="productGrid">
          {products.slice(0, 4).map((p) => (
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
