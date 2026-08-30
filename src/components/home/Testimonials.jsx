import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../common/SectionTitle';
import './Testimonials.css';

export default function Testimonials() {
  const { t } = useLanguage();

  return (
    <section className="testimonials">
      <SectionTitle title={t('testimonials_title', 'Loved by Our Patrons')} />
      <div className="review">
        <div className="reviewStars">★★★★★</div>
        <blockquote>
          {t(
            'testimonial_quote',
            '“The Kolhapuri Saaj I bought feels incredibly authentic. The antique finish and handcrafted details are breathtaking.”'
          )}
        </blockquote>
        <hr />
        <b>Sneha Deshmukh</b>
        <small>{t('verified_buyer', 'VERIFIED BUYER ●')}</small>
      </div>
    </section>
  );
}
