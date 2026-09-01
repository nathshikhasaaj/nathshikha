import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './TopBar.css';

export default function TopBar() {
  const { t } = useLanguage();

  const announcement = t(
    'topbar_text',
    '✦ Art is Precious ✦ Authentic Peshwai Craft ✦ 100% Artisanal Luster ✦ Free Delivery on Prepaid Orders ✦ Custom Bridal Orders on WhatsApp: +91 9699668421 ✦ Handcrafted in Maharashtra ✦ Lightweight & Hypoallergenic ✦'
  );

  return (
    <div className="topbar" role="region" aria-label="Announcement Bar">
      <div className="topbarFadeLeft" />
      <div className="topbarMarqueeTrack">
        <span className="topbarContent">{announcement}</span>
        <span className="topbarContent" aria-hidden="true">{announcement}</span>
      </div>
      <div className="topbarFadeRight" />
    </div>
  );
}
