import React from 'react';
import { Sparkles, Star, ShieldCheck, Truck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './Features.css';

export default function Features() {
  const { t } = useLanguage();

  return (
    <section className="features">
      <div>
        <span>
          <Sparkles />
        </span>
        <b>{t('feat_handcrafted', '100% Handcrafted')}</b>
        <small>{t('feat_handcrafted_sub', 'By Expert Artisans')}</small>
      </div>

      <div>
        <span>
          <Star />
        </span>
        <b>{t('feat_antique', 'Premium Antique')}</b>
        <small>{t('feat_antique_sub', 'Luster & Antique Polish')}</small>
      </div>

      <div>
        <span>
          <ShieldCheck />
        </span>
        <b>{t('feat_skin', 'Skin Friendly')}</b>
        <small>{t('feat_skin_sub', 'Hypoallergenic Metals')}</small>
      </div>

      <div>
        <span>
          <Truck />
        </span>
        <b>{t('feat_delivery', 'Express Shipping')}</b>
        <small>{t('feat_delivery_sub', 'Pan-India Delivery')}</small>
      </div>
    </section>
  );
}
