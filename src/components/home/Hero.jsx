import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import './Hero.css';

const defaultSlides = [
  {
    img: '/assets/hero-slide1.jpg',
    tag: '✦ ROYAL FLORAL HEIRLOOM ✦',
    tagMr: '✦ अस्सल पारिजात कलाकुसर ✦',
    title: 'Handcrafted\nParijat Jewellery Set',
    titleMr: 'हस्तनिर्मित\nपारिजात ज्वेलरी सेट',
    desc: 'Delicately handcrafted with pure pearls, floral Parijat motifs, choker and haar set for precious family celebrations.',
    descMr: 'खास समारंभांसाठी नाजूक मोत्यांची वेल आणि पारिजात फुलांच्या कलाकुसरीने घडवलेला अप्रतिम सेट.',
    highlight: 'Parijat Choker · Long Pearl Haar · Floral Brooch & Tassels',
    lookName: 'Parijat Set',
    ctaText: 'EXPLORE COLLECTION',
    ctaLink: '/shop'
  },
  {
    img: '/assets/hero-slide2.jpg',
    tag: '✦ AUSPICIOUS BRIDAL SUITE ✦',
    tagMr: '✦ शुभ लग्नसोहळा दागिने ✦',
    title: 'Peshwai Mundavali,\nName Nath & Hathphool',
    titleMr: 'पेशवाई मुंडावळी,\nनाव नथ व हातफूल',
    desc: 'Traditional bridal elegance featuring handcrafted pearl Mundavali, customized Name Nath, and regal Hathphool.',
    descMr: 'लग्नसोहळ्यासाठी खास घडवलेली मोत्यांची मुंडावळी, कस्टमाइज्ड नाव नथ आणि पारंपरिक हातफूल.',
    highlight: 'Pearl Mundavali · Custom Name Nath · Traditional Hathphool',
    lookName: 'Mundavali & Nath',
    ctaText: 'VIEW BRIDAL SAAJ',
    ctaLink: '/category/Nath'
  },
  {
    img: '/assets/hero-slide3.jpg',
    tag: '✦ TIMELESS ARTISANAL CHUDA ✦',
    tagMr: '✦ अस्सल मोत्यांच्या बांगड्या ✦',
    title: 'Handcrafted\nMoti Bangles & Chuda',
    titleMr: 'हस्तनिर्मित\nमोती बांगड्या व चुडा',
    desc: 'Adorn your hands with authentic Maharashtrian Moti Bangles, antique gold kadas, and traditional green glass wedding chuda.',
    descMr: 'महाराष्ट्राच्या परंपरेनुसार घडवलेल्या अस्सल मोती बांगड्या, सोन्याचे तोडे आणि हिरवा लग्न चुडा.',
    highlight: 'Artisanal Moti Bangles · Antique Gold Kadas · Wedding Chuda',
    lookName: 'Moti Bangles',
    ctaText: 'DISCOVER TRADITIONAL',
    ctaLink: '/category/Traditional'
  }
];

export default function Hero() {
  const [slides, setSlides] = useState(defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { lang, t } = useLanguage();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';

  // Touch swipe support for mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Fetch dynamic hero slides from Admin DB
  useEffect(() => {
    let isMounted = true;
    api('/hero-slides')
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      })
      .catch((err) => {
        console.warn('Using default hero slides:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Safe slide index calculation
  const safeSlideIndex = currentSlide >= slides.length ? 0 : currentSlide;
  const activeSlide = slides[safeSlideIndex] || defaultSlides[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 45) {
      handleNext();
    } else if (distance < -45) {
      handlePrev();
    }
  };

  // Localized texts
  const currentTag =
    lang === 'mr' && activeSlide.tagMr ? activeSlide.tagMr : activeSlide.tag || '✦ ROYAL FLORAL HEIRLOOM ✦';
  const currentTitle =
    lang === 'mr' && activeSlide.titleMr ? activeSlide.titleMr : activeSlide.title || '';
  const currentDesc =
    lang === 'mr' && activeSlide.descMr ? activeSlide.descMr : activeSlide.desc || '';
  const currentHighlight = activeSlide.highlight || '';
  const currentCtaText = activeSlide.ctaText || t('explore_collection', 'EXPLORE COLLECTION');
  const currentCtaLink = activeSlide.ctaLink || '/shop';

  return (
    <section
      className="hero"
      aria-label="Hero Showcase"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ambient Backdrop & Texture */}
      <div className="heroAmbientBackdrop">
        {slides.map((slide, idx) => (
          <div
            key={slide.img || idx}
            className={`heroAmbientLayer ${idx === safeSlideIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.img})` }}
          />
        ))}
      </div>
      <div className="heroAmbientVignette" />
      <div className="heroPatternOverlay" />

      {/* Main Container */}
      <div className="heroContainer">
        {/* EDITORIAL & STORY COLUMN */}
        <div className="heroContentCol">
          <span className="heroSlideTag">
            <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />
            {currentTag}
          </span>

          <h1 key={`title-${safeSlideIndex}`} className="heroSlideTitle">
            {currentTitle.split('\n').map((line, idx) => (
              <React.Fragment key={line}>
                {idx > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h1>

          <p key={`desc-${safeSlideIndex}`} className="heroSlideDesc">
            {currentDesc}
          </p>

          {currentHighlight && (
            <div className="heroJewelleryHighlight">
              <span className="highlightDot">✦</span>
              <span>{currentHighlight}</span>
            </div>
          )}

          <div className="heroActionGroup">
            <Link className="goldBtn heroMainBtn" to={currentCtaLink}>
              {currentCtaText}
            </Link>

            <a
              className="heroWhatsAppBtn"
              href={`https://wa.me/${whatsappNumber}?text=Hi%20Nathshikha%2C%20I%20am%20interested%20in%20customizing%20bridal%20jewellery`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={14} />
              <span>CUSTOMIZE</span>
            </a>
          </div>

          {/* Look Switcher Thumbnails */}
          <div className="heroSlideThumbTabs">
            {slides.map((slide, idx) => (
              <button
                key={slide.img || idx}
                type="button"
                className={`heroThumbTab ${idx === safeSlideIndex ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`View look ${idx + 1}`}
              >
                <img src={slide.img} alt={`Look ${idx + 1}`} />
                <div className="thumbTabText">
                  <small>LOOK 0{idx + 1}</small>
                  <span>{slide.lookName || `Look 0${idx + 1}`}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* JEWELLERY VISUALIZER COLUMN */}
        <div className="heroVisualCol">
          <div className="heroVisualCard">
            <div className="heroVisualFrame">
              {slides.map((slide, idx) => (
                <div
                  key={slide.img || idx}
                  className={`heroImageLayer ${idx === safeSlideIndex ? 'active' : ''}`}
                >
                  <img
                    src={slide.img}
                    alt={slide.title ? slide.title.replace('\n', ' ') : 'Hero look'}
                    className="heroModelImg"
                  />
                </div>
              ))}

              {/* Floating Luxury Gold Seal Badge */}
              <div className="heroLuxuryBadge">
                <ShieldCheck size={12} color="#e4c786" />
                <span>AUTHENTIC HEIRLOOM</span>
              </div>

              {/* In-Frame Navigation Controls */}
              {slides.length > 1 && (
                <>
                  <button
                    className="heroNavArrow heroArrowLeft"
                    onClick={handlePrev}
                    aria-label="Previous Slide"
                    type="button"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    className="heroNavArrow heroArrowRight"
                    onClick={handleNext}
                    aria-label="Next Slide"
                    type="button"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Slide Counter */}
              <div className="heroVisualCounter">
                <span>0{safeSlideIndex + 1}</span>
                <small>/ 0{slides.length}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
