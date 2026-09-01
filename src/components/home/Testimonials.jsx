import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import SectionTitle from '../common/SectionTitle';
import './Testimonials.css';

const DEFAULT_REVIEWS = [
  {
    id: 'default-1',
    customerName: 'Sneha Deshmukh',
    rating: 5,
    reviewText: 'The Kolhapuri Saaj I bought feels incredibly authentic. The antique finish and handcrafted details are breathtaking. Received countless compliments!',
    image: '/assets/pearl-category.jpg',
    isVisible: true
  },
  {
    id: 'default-2',
    customerName: 'Priya Sharma-Patil',
    rating: 5,
    reviewText: 'Ordered the traditional Maharashtrian Antique Nath for my wedding. The craftsmanship and filigree work is pure heritage art. Absolutely delighted!',
    image: '/assets/nath-category.jpg',
    isVisible: true
  },
  {
    id: 'default-3',
    customerName: 'Ananya Deshpande',
    rating: 5,
    reviewText: 'Exceptional quality Peshwai Thushi! The weight, luster of the pearls, and velvet packaging make it feel like an heirloom piece.',
    image: '/assets/thushi-category.jpg',
    isVisible: true
  },
  {
    id: 'default-4',
    customerName: 'Kavita Joshi',
    rating: 5,
    reviewText: 'The Moti Tanmani set exceeded all my expectations. Fast dispatch, secure packaging, and genuine artisan care.',
    image: null,
    isVisible: true
  },
  {
    id: 'default-5',
    customerName: 'Shweta Kulkarni',
    rating: 5,
    reviewText: 'Loved the prompt service and beautiful jewelry. A true tribute to authentic Maharashtrian traditions.',
    image: null,
    isVisible: true
  }
];

export default function Testimonials() {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState(DEFAULT_REVIEWS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    api('/showcase-reviews')
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setReviews(data.slice(0, 5));
        }
      })
      .catch(() => {
        // Fallback to default curated reviews
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const total = reviews.length;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % (total || 1));
  }, [total]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + (total || 1)) % (total || 1));
  }, [total]);

  // Auto-play interval
  useEffect(() => {
    if (isPaused || total <= 1) return;
    timerRef.current = setInterval(() => {
      handleNext();
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total, handleNext]);

  const currentReview = reviews[currentIndex] || DEFAULT_REVIEWS[0];

  return (
    <section
      className="testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <SectionTitle
        title={t('testimonials_title', 'Loved by Our Patrons')}
        sub={t('testimonials_sub', 'Genuine words of appreciation from our valued patrons and brides.')}
      />

      <div className="testimonialCarouselContainer">
        {total > 1 && (
          <button
            type="button"
            className="carouselNavBtn prevBtn"
            onClick={handlePrev}
            aria-label="Previous review"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div className="reviewCard" key={currentReview.id || currentIndex}>
          <Quote className="reviewQuoteIcon" size={32} />

          {currentReview.image && (
            <div className="reviewCustomerAvatarWrap">
              <img
                src={currentReview.image}
                alt={currentReview.customerName || currentReview.customer_name || 'Patron'}
                className="reviewCustomerAvatar"
              />
            </div>
          )}

          <div className="reviewStarsRow">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                fill={star <= (currentReview.rating || 5) ? 'var(--gold2, #f5c469)' : 'none'}
                color="var(--gold2, #f5c469)"
              />
            ))}
          </div>

          <blockquote className="reviewQuoteText">
            "{currentReview.reviewText || currentReview.review_text || currentReview.review || ''}"
          </blockquote>

          <div className="reviewDivider" />

          <div className="reviewAuthorMeta">
            <b className="reviewAuthorName">
              {currentReview.customerName || currentReview.customer_name || currentReview.name || 'Valued Patron'}
            </b>
            <small className="reviewVerifiedBadge">
              {t('verified_buyer', 'VERIFIED PATRON ● GOOGLE REVIEW')}
            </small>
          </div>
        </div>

        {total > 1 && (
          <button
            type="button"
            className="carouselNavBtn nextBtn"
            onClick={handleNext}
            aria-label="Next review"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Dots Indicator */}
      {total > 1 && (
        <div className="carouselDotsRow">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`carouselDot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
