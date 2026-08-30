import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './TopBar.css';

export default function TopBar() {
  const { t } = useLanguage();
  return (
    <div className="topbar" role="region" aria-label="Announcement">
      <span className="topbarText">
        {t(
          'topbar_text',
          '✦ Art is Precious ✦ Authentic Peshwai Craft ✦ 100% Artisanal Luster ✦ Lightweight & Hypoallergenic ✦'
        )}
      </span>
    </div>
  );
}

