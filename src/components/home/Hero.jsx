import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './Hero.css';

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const slides = [
    [
      t('hero_slide1_title', 'New Handcrafted\nMoti Tanmani'),
      t(
        'hero_slide1_desc',
        'Embrace the royal heritage of Maharashtra with our meticulously crafted antique and pearl collections. Flat 20% Off on signature pieces.'
      )
    ],
    [
      t('hero_slide2_title', 'Festive Peshwai Offer'),
      t(
        'hero_slide2_desc',
        'Timeless Maharashtrian silhouettes, handcrafted for your most precious occasions.'
      )
    ],
    [
      t('hero_slide3_title', 'Signature Heritage Edit'),
      t(
        'hero_slide3_desc',
        'A contemporary heirloom inspired by the Maratha era’s golden craft.'
      )
    ]
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="hero">
      <img
        className="heroLogo"
        src="/assets/nathshikha-logo.png"
        alt="Nathshikha emblem"
      />
      <div className="heroOverlay">
        <span>{t('festive_tag', 'FESTIVE PESHWAI OFFER')}</span>
        <h1>
          {slides[currentSlide][0].split('\n').map((line, idx) => (
            <React.Fragment key={line}>
              {idx > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </h1>
        <p>{slides[currentSlide][1]}</p>
        <Link className="goldBtn" to="/shop">
          {t('explore_collection', 'EXPLORE COLLECTION')}
        </Link>
      </div>
      <div className="dots">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={idx === currentSlide ? 'active' : ''}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
