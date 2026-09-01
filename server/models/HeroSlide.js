import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema(
  {
    slideNumber: { type: Number, default: 1 },
    img: { type: String, required: true },
    tag: { type: String, default: '✦ ROYAL FLORAL HEIRLOOM ✦' },
    tagMr: { type: String, default: '✦ अस्सल पारिजात कलाकुसर ✦' },
    title: { type: String, required: true },
    titleMr: { type: String, default: '' },
    desc: { type: String, default: '' },
    descMr: { type: String, default: '' },
    highlight: { type: String, default: '' },
    lookName: { type: String, default: '' },
    ctaText: { type: String, default: 'EXPLORE COLLECTION' },
    ctaLink: { type: String, default: '/shop' },
    displayOrder: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const defaultHeroSlides = [
  {
    slideNumber: 1,
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
    ctaLink: '/shop',
    displayOrder: 1,
    isActive: true
  },
  {
    slideNumber: 2,
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
    ctaLink: '/category/Nath',
    displayOrder: 2,
    isActive: true
  },
  {
    slideNumber: 3,
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
    ctaLink: '/category/Traditional',
    displayOrder: 3,
    isActive: true
  }
];

export const HeroSlide = mongoose.models.HeroSlide || mongoose.model('HeroSlide', heroSlideSchema);
