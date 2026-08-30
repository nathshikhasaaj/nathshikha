import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './CategoryGrid.css';

export default function CategoryGrid() {
  const { t } = useLanguage();

  const categories = [
    {
      name: t('cat_nath', 'Nath Collection'),
      slug: 'Nath',
      img: '/assets/nath-category.jpg'
    },
    {
      name: t('cat_pearl', 'Handmade Pearl'),
      slug: 'Pearl',
      img: '/assets/pearl-category.jpg'
    },
    {
      name: t('cat_traditional', 'Traditional'),
      slug: 'Traditional',
      img: '/assets/thushi-category.jpg'
    },
    {
      name: t('cat_signature', 'Signature Set'),
      slug: 'Signature',
      img: '/assets/saaj-category.jpg'
    }
  ];

  return (
    <div className="catGrid">
      {categories.map((cat) => (
        <Link className="cat" to={`/category/${cat.slug}`} key={cat.slug}>
          <img src={cat.img} alt={cat.name} loading="lazy" />
          <span>{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
