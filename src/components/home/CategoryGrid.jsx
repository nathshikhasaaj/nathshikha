import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import './CategoryGrid.css';

const DEFAULT_CATEGORY_IMAGES = {
  nath: '/assets/nath-category.jpg',
  pearl: '/assets/pearl-category.jpg',
  traditional: '/assets/thushi-category.jpg',
  signature: '/assets/saaj-category.jpg',
  accessories: '/assets/bugadi-product.jpg',
  thushi: '/assets/thushi-category.jpg',
  saaj: '/assets/saaj-category.jpg',
  kolhapuri: '/assets/saaj-category.jpg',
  bangles: '/assets/nath-category.jpg',
  earrings: '/assets/bugadi-product.jpg',
  necklace: '/assets/saaj-category.jpg',
  mangalsutra: '/assets/pearl-category.jpg'
};

export default function CategoryGrid() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api('/categories')
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const getCategoryImage = (catName = '', slug = '') => {
    const key = (slug || catName).toLowerCase();
    for (const [pattern, imgPath] of Object.entries(DEFAULT_CATEGORY_IMAGES)) {
      if (key.includes(pattern)) return imgPath;
    }
    return '/assets/thushi-category.jpg';
  };

  const displayList = categories.length > 0
    ? categories.slice(0, 6).map((c) => ({
        name: c.name,
        slug: c.slug || c.name,
        img: getCategoryImage(c.name, c.slug)
      }))
    : [
        {
          name: t('cat_nath', 'Nath Collection'),
          slug: 'nath',
          img: '/assets/nath-category.jpg'
        },
        {
          name: t('cat_pearl', 'Handmade Pearl'),
          slug: 'pearl',
          img: '/assets/pearl-category.jpg'
        },
        {
          name: t('cat_traditional', 'Traditional'),
          slug: 'traditional',
          img: '/assets/thushi-category.jpg'
        },
        {
          name: t('cat_signature', 'Signature Set'),
          slug: 'signature',
          img: '/assets/saaj-category.jpg'
        },
        {
          name: t('cat_accessories', 'Accessories'),
          slug: 'accessories',
          img: '/assets/bugadi-product.jpg'
        }
      ];

  return (
    <div className="catGrid">
      {displayList.map((cat) => (
        <Link className="cat" to={`/category/${cat.slug}`} key={cat.slug}>
          <img src={cat.img} alt={cat.name} loading="lazy" />
          <span>{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
