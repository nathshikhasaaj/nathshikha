import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './CategoryNavBar.css';

const CATEGORIES = [
  { name: 'All Jewellery', slug: 'all', path: '/shop' },
  { name: 'Nath', slug: 'Nath', path: '/category/Nath' },
  { name: 'Thushi', slug: 'Thushi', path: '/category/Thushi' },
  { name: 'Kolhapuri Saaj', slug: 'Kolhapuri Saaj', path: '/category/Kolhapuri Saaj' },
  { name: 'Tanmani', slug: 'Tanmani', path: '/category/Tanmani' },
  { name: 'Moti Sets', slug: 'Moti', path: '/category/Moti' },
  { name: 'Mangalsutra', slug: 'Mangalsutra', path: '/category/Mangalsutra' },
  { name: 'Bugadi', slug: 'Bugadi', path: '/category/Bugadi' },
  { name: 'Chinchpeti', slug: 'Chinchpeti', path: '/category/Chinchpeti' },
  { name: 'Bormal', slug: 'Bormal', path: '/category/Bormal' },
  { name: 'Haar & Chokers', slug: 'Haar', path: '/category/Haar' },
  { name: 'Earrings', slug: 'Earrings', path: '/category/Earrings' },
  { name: 'Bangles & Chuda', slug: 'Bangles', path: '/category/Bangles' },
  { name: 'Accessories', slug: 'Accessories', path: '/category/Accessories' }
];

export default function CategoryNavBar({ activeCategory }) {
  const location = useLocation();
  const { lang } = useLanguage();

  const currentPath = location.pathname;

  return (
    <div className="categoryNavWrapper" aria-label="Explore Categories">
      <div className="categoryNavScroll">
        {CATEGORIES.map((cat) => {
          let isActive = false;
          if (cat.slug === 'all') {
            isActive = currentPath === '/shop' && !activeCategory;
          } else if (activeCategory) {
            isActive = activeCategory.toLowerCase() === cat.slug.toLowerCase();
          } else {
            isActive = currentPath === cat.path;
          }

          return (
            <Link
              key={cat.slug}
              to={cat.path}
              className={`categoryNavPill ${isActive ? 'active' : ''}`}
            >
              <span className="pillDot"></span>
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
