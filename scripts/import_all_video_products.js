import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { connectDB } from '../server/config/db.js';
import { Product } from '../server/models/Product.js';
import { applyWatermark } from '../server/services/watermarkService.js';

const framesDir = 'C:\\Users\\ansar\\.gemini\\antigravity-ide\\brain\\d141ab5d-31c6-4ed9-8e0a-47a34f1bcd22\\scratch\\video_frames';
const uploadsDir = path.resolve('public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// All 32 unique products extracted directly from products_input.mp4
const videoProductsData = [
  // 1. BUGADI COLLECTION
  {
    name: 'Peshwai Emerald Floral Bugadi',
    price: 120,
    category: 'Bugadi',
    tag: 'HANDMADE',
    description: 'Handcrafted Peshwai bugadi studded with emerald green stone and seed pearls in a vintage jewelry box.',
    stock: 25,
    crop: { frame: 'frame_001.jpg', left: 54, top: 90, width: 95, height: 95 },
    slug: 'peshwai-emerald-floral-bugadi'
  },
  {
    name: 'Press Floral Bugadi (Ruby & Pearls)',
    price: 80,
    category: 'Bugadi',
    tag: 'BESTSELLER',
    description: 'Authentic Maharashtrian press bugadi on pink silk with ruby center stone and dangling pearls.',
    stock: 30,
    crop: { frame: 'frame_001.jpg', left: 54, top: 388, width: 95, height: 95 },
    slug: 'press-floral-bugadi-ruby'
  },
  {
    name: 'Floral Pearl Press Bugadi Pair',
    price: 80,
    category: 'Bugadi',
    tag: 'POPULAR',
    description: 'Delicate floral cluster press bugadi with ruby center and dangling pearl accents.',
    stock: 20,
    crop: { frame: 'frame_002.jpg', left: 54, top: 110, width: 95, height: 95 },
    slug: 'floral-pearl-press-bugadi-pair'
  },
  {
    name: 'Emerald Floral Bugadi',
    price: 100,
    category: 'Bugadi',
    tag: 'NEW',
    description: 'Handmade floral bugadi with vibrant emerald green center on royal blue velvet.',
    stock: 18,
    crop: { frame: 'frame_043.jpg', left: 54, top: 408, width: 95, height: 95 },
    slug: 'emerald-floral-bugadi'
  },

  // 2. NATH & NAMENATH COLLECTION
  {
    name: 'Customised Namenath (Piercing & Clip)',
    price: 650,
    category: 'Nath',
    tag: 'CUSTOMISED',
    description: 'Personalized Maharashtrian Name Nath handcrafted with yellow pearls and custom Hindi/Marathi script.',
    stock: 15,
    crop: { frame: 'frame_002.jpg', left: 54, top: 556 > 538 ? 400 : 400, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_004.jpg', left: 54, top: 220, width: 95, height: 95 },
    slug: 'customised-namenath-piercing'
  },
  {
    name: 'Handcrafted Bridal Namenath (Small Size)',
    price: 450,
    category: 'Nath',
    tag: 'SIGNATURE',
    description: 'Small size artisanal Maharashtrian name nath with ruby-emerald stone cluster on wooden keepsake box.',
    stock: 22,
    crop: { frame: 'frame_006.jpg', left: 54, top: 444, width: 95, height: 95 },
    slug: 'bridal-namenath-small-size'
  },
  {
    name: 'Royal Peacock Namenath on Red Velvet',
    price: 550,
    category: 'Nath',
    tag: 'HANDCRAFTED',
    description: 'Intricately handcrafted royal Marathi nath on red velvet with seed pearls and ruby droplet.',
    stock: 20,
    crop: { frame: 'frame_008.jpg', left: 54, top: 66, width: 95, height: 95 },
    slug: 'royal-peacock-namenath-red-velvet'
  },
  {
    name: 'Premium AD Stone Nath (New Look)',
    price: 1100,
    category: 'Nath',
    tag: 'LUXURY',
    description: 'Premium American Diamond (AD) stone bridal nath with multi-color stones and hanging pearl chain.',
    stock: 12,
    crop: { frame: 'frame_015.jpg', left: 54, top: 358, width: 95, height: 95 },
    slug: 'premium-ad-stone-nath-new-look'
  },
  {
    name: 'Classic AD Stone Circular Nath',
    price: 800,
    category: 'Nath',
    tag: 'BESTSELLER',
    description: 'Elegant American Diamond stone circular Maharashtrian nath with diamond-cut sparkle on satin.',
    stock: 16,
    crop: { frame: 'frame_017.jpg', left: 54, top: 422, width: 95, height: 95 },
    slug: 'classic-ad-stone-circular-nath'
  },
  {
    name: 'AD Stone Small Nath',
    price: 350,
    category: 'Nath',
    tag: 'TRENDING',
    description: 'Delicate small AD stone clip-on nath with emerald center stone and floral pearl edge.',
    stock: 25,
    crop: { frame: 'frame_019.jpg', left: 54, top: 30, width: 95, height: 95 },
    slug: 'ad-stone-small-nath'
  },
  {
    name: 'Kundan Bridal Nath',
    price: 650,
    category: 'Nath',
    tag: 'BRIDAL',
    description: 'Traditional Kundan nath with ruby-white stones, golden frame, and pearl border on wooden chest.',
    stock: 14,
    crop: { frame: 'frame_019.jpg', left: 54, top: 370, width: 95, height: 95 },
    slug: 'kundan-bridal-nath'
  },
  {
    name: 'Traditional Maharashtrian Nath',
    price: 450,
    category: 'Nath',
    tag: 'POPULAR',
    description: 'Classic Maharashtrian handcrafted nath with ruby-green stones on black silk background.',
    stock: 28,
    crop: { frame: 'frame_021.jpg', left: 54, top: 218, width: 95, height: 95 },
    slug: 'traditional-maharashtrian-nath'
  },
  {
    name: 'Peshvai Brahmani Nath',
    price: 400,
    category: 'Nath',
    tag: 'HERITAGE',
    description: 'Authentic Peshwai design Brahmani nath with golden beads and seed pearls.',
    stock: 30,
    crop: { frame: 'frame_021.jpg', left: 54, top: 10, width: 95, height: 95 },
    slug: 'peshwai-brahmani-nath'
  },
  {
    name: 'Premium AD Stone Bridal Nath',
    price: 1000,
    category: 'Nath',
    tag: 'PREMIUM',
    description: 'High-grade AD stone bridal nath with green stone center and pearl drop on keepsake box.',
    stock: 15,
    crop: { frame: 'frame_051.jpg', left: 54, top: 735 > 538 ? 400 : 400, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_051.jpg', left: 54, top: 735 > 538 ? 380 : 380, width: 95, height: 95 },
    slug: 'premium-ad-stone-bridal-nath'
  },

  // 3. HAIR ACCESSORIES & KHOPA
  {
    name: 'Handmade Hair Accessories Pin Set',
    price: 150,
    category: 'Hair Accessories',
    tag: 'HANDMADE',
    description: 'Traditional pearl and floral hair pin set for bridal juda and hairstyles (Set of pieces).',
    stock: 40,
    crop: { frame: 'frame_008.jpg', left: 54, top: 512 > 538 ? 450 : 450, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_010.jpg', left: 54, top: 20, width: 95, height: 95 },
    slug: 'handmade-hair-accessories-pin-set'
  },
  {
    name: 'Chandra Upins (Crescent Moon Hairpins)',
    price: 20,
    category: 'Hair Accessories',
    tag: 'POPULAR',
    description: 'Crescent moon (Chandra) designer U-pins for bridal hair buns and traditional looks (Price per pc).',
    stock: 100,
    crop: { frame: 'frame_010.jpg', left: 54, top: 25, width: 95, height: 95 },
    slug: 'chandra-upins-hairpins'
  },
  {
    name: 'Zumka Hair Pins (Pair)',
    price: 50,
    category: 'Hair Accessories',
    tag: 'NEW',
    description: 'Pearl jhumka hanging hair pins for traditional Maharashtrian bridal hairstyles (Price per pc).',
    stock: 60,
    crop: { frame: 'frame_010.jpg', left: 54, top: 248, width: 95, height: 95 },
    slug: 'zumka-hair-pins'
  },
  {
    name: 'Chndra Hairpins (Gold & Multi-Stone)',
    price: 40,
    category: 'Hair Accessories',
    tag: 'HANDCRAFTED',
    description: 'Handmade golden chandra hair pins studded with colored stones (Small 30/- Bigger 40/-).',
    stock: 50,
    crop: { frame: 'frame_041.jpg', left: 54, top: 700 > 538 ? 450 : 450, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_042.jpg', left: 54, top: 205, width: 95, height: 95 },
    slug: 'chndra-hairpins-multistone'
  },
  {
    name: 'Bindi Khopa (Bridal Hair Ornament)',
    price: 160,
    category: 'Hair Accessories',
    tag: 'TRADITIONAL',
    description: 'Authentic Maharashtrian Bindi Khopa hair ornament for traditional bridal hairstyle.',
    stock: 35,
    crop: { frame: 'frame_047.jpg', left: 54, top: 60, width: 95, height: 95 },
    slug: 'bindi-khopa-hair-ornament'
  },

  // 4. NECKLACES & CHOKERS
  {
    name: 'Handmade Moti Choker Set with Earrings',
    price: 450,
    category: 'Necklace',
    tag: 'BESTSELLER',
    description: 'Handcrafted seed pearl choker with ruby and emerald droplet stones on magenta silk.',
    stock: 18,
    crop: { frame: 'frame_012.jpg', left: 54, top: 38, width: 95, height: 95 },
    slug: 'moti-choker-set-earrings'
  },
  {
    name: 'Classic Long Moti Haar / Necklace',
    price: 300,
    category: 'Necklace',
    tag: 'HANDMADE',
    description: 'Classic layered white pearl long haar with golden beads on black velvet backdrop.',
    stock: 25,
    crop: { frame: 'frame_012.jpg', left: 54, top: 258, width: 95, height: 95 },
    slug: 'classic-long-moti-haar-necklace'
  },
  {
    name: 'Peacock Choker & Earrings Set',
    price: 700,
    category: 'Necklace',
    tag: 'SIGNATURE',
    description: 'Handmade peacock centerpiece pearl choker with matching statement jhumka earrings.',
    stock: 14,
    crop: { frame: 'frame_012.jpg', left: 54, top: 485 > 538 ? 420 : 420, width: 95, height: 95 },
    slug: 'peacock-choker-earrings-set'
  },
  {
    name: 'Chandra Laxmi Long Necklace',
    price: 500,
    category: 'Necklace',
    tag: 'HERITAGE',
    description: 'Layered pearl long haar featuring Chandra and Laxmi motif pendants on blue velvet mannequin.',
    stock: 20,
    crop: { frame: 'frame_041.jpg', left: 54, top: 225, width: 95, height: 95 },
    slug: 'chandra-laxmi-long-necklace'
  },
  {
    name: 'Bappa Kanthi Haar',
    price: 500,
    category: 'Necklace',
    tag: 'DEVOTIONAL',
    description: 'Sacred Ganpati Bappa pendant kanthi with multi-strand pearls and green-red floral enamel.',
    stock: 16,
    crop: { frame: 'frame_041.jpg', left: 54, top: 450, width: 95, height: 95 },
    slug: 'bappa-kanthi-haar'
  },
  {
    name: 'Manik Sari (Thushi Drop Pendant)',
    price: 300,
    category: 'Necklace',
    tag: 'HANDCRAFTED',
    description: 'Traditional Maharashtrian gold wire Manik Sari choker with ruby stone drop pendant.',
    stock: 24,
    crop: { frame: 'frame_042.jpg', left: 54, top: 428, width: 95, height: 95 },
    slug: 'manik-sari-thushi-drop-pendant'
  },
  {
    name: 'Manik Sari 2 (Drop Pendant)',
    price: 250,
    category: 'Necklace',
    tag: 'POPULAR',
    description: 'Delicate gold wire sari choker with pink droplet pendant on royal blue velvet.',
    stock: 20,
    crop: { frame: 'frame_045.jpg', left: 54, top: 70, width: 95, height: 95 },
    slug: 'manik-sari-2-drop-pendant'
  },
  {
    name: 'Double Layer Putali Haar (Classic)',
    price: 450,
    category: 'Necklace',
    tag: 'TRADITIONAL',
    description: 'Premium quality two-layer gold coin Putali haar on royal blue velvet display.',
    stock: 18,
    crop: { frame: 'frame_029.jpg', left: 54, top: 178, width: 95, height: 95 },
    slug: 'double-layer-putali-haar-classic'
  },
  {
    name: 'Double Layer Putali (Deluxe Box Set)',
    price: 600,
    category: 'Necklace',
    tag: 'PREMIUM',
    description: 'Handcrafted multi-strand pearl and gold coin double layered putali necklace in wooden gift box.',
    stock: 15,
    crop: { frame: 'frame_051.jpg', left: 54, top: 65, width: 95, height: 95 },
    slug: 'double-layer-putali-deluxe-box-set'
  },

  // 5. MUNDAVALI COLLECTION
  {
    name: 'Parijat Mundavali',
    price: 550,
    category: 'Mundavali',
    tag: 'BRIDAL',
    description: 'Handmade Parijat flower motif bridal mundavali with pearl strands on gold satin.',
    stock: 20,
    crop: { frame: 'frame_014.jpg', left: 54, top: 270, width: 95, height: 95 },
    slug: 'parijat-mundavali'
  },
  {
    name: 'Moti & Gold Chain Combination Mundavali',
    price: 650,
    category: 'Mundavali',
    tag: 'BESTSELLER',
    description: 'Exquisite bridal mundavali combining gold chains and lustrous pearl drops on magenta velvet.',
    stock: 18,
    crop: { frame: 'frame_014.jpg', left: 54, top: 495 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_015.jpg', left: 54, top: 20, width: 95, height: 95 },
    slug: 'moti-gold-chain-combination-mundavali'
  },
  {
    name: 'Classic Marathi Pearl Mundavali',
    price: 580,
    category: 'Mundavali',
    tag: 'TRADITIONAL',
    description: 'Traditional hand-strung pearl mundavali for Marathi bride and groom with floral drops.',
    stock: 22,
    crop: { frame: 'frame_015.jpg', left: 54, top: 20, width: 95, height: 95 },
    slug: 'classic-marathi-pearl-mundavali'
  },
  {
    name: 'Pachi Kundan Bridal Mundavali',
    price: 880,
    category: 'Mundavali',
    tag: 'LUXURY',
    description: 'Luxury Pachi Kundan bridal mundavali with green-ruby stone settings and delicate pearl strands.',
    stock: 10,
    crop: { frame: 'frame_041.jpg', left: 54, top: 670 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_042.jpg', left: 54, top: 5, width: 95, height: 95 },
    slug: 'pachi-kundan-bridal-mundavali'
  },
  {
    name: 'Lotus Kundan Mundavali (Kamal Phool)',
    price: 700,
    category: 'Mundavali',
    tag: 'SIGNATURE',
    description: 'Royal lotus motif handcrafted mundavali on red velvet for wedding and lagna ceremonies.',
    stock: 15,
    crop: { frame: 'frame_045.jpg', left: 54, top: 520 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_046.jpg', left: 54, top: 380, width: 95, height: 95 },
    slug: 'lotus-kundan-mundavali-kamal-phool'
  },

  // 6. EARCUFFS & BHIKBALI
  {
    name: 'Bridal Pearl Earcuff Design 2',
    price: 700,
    category: 'Earcuff',
    tag: 'BRIDAL',
    description: 'Full ear bridal earcuff with intricate cluster pearls, ruby center, and matching jhumka.',
    stock: 14,
    crop: { frame: 'frame_021.jpg', left: 54, top: 662 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_023.jpg', left: 54, top: 5, width: 95, height: 95 },
    slug: 'bridal-pearl-earcuff-design-2'
  },
  {
    name: 'Floral Stone Earcuff Design 1',
    price: 650,
    category: 'Earcuff',
    tag: 'HANDCRAFTED',
    description: 'Ruby-pearl studded floral earcuff with antique brass casing on wooden display box.',
    stock: 16,
    crop: { frame: 'frame_023.jpg', left: 54, top: 40, width: 95, height: 95 },
    slug: 'floral-stone-earcuff-design-1'
  },
  {
    name: 'Peacock Jhumka Earcuff',
    price: 750,
    category: 'Earcuff',
    tag: 'BESTSELLER',
    description: 'Handcrafted emerald-ruby peacock earcuff with hanging jhumka bells on satin display.',
    stock: 12,
    crop: { frame: 'frame_023.jpg', left: 54, top: 265, width: 95, height: 95 },
    slug: 'peacock-jhumka-earcuff'
  },
  {
    name: 'Peshvai Bhikbali',
    price: 120,
    category: 'Earrings',
    tag: 'TRADITIONAL',
    description: 'Authentic Maharashtrian gents and ladies Peshwai single-ear Bhikbali with ruby drop.',
    stock: 35,
    crop: { frame: 'frame_051.jpg', left: 54, top: 290, width: 95, height: 95 },
    slug: 'peshvai-bhikbali'
  },

  // 7. BANGLES & HATHPHOOL
  {
    name: 'Moti Bangles with Kalire',
    price: 600,
    category: 'Bangles',
    tag: 'BRIDAL',
    description: 'Handcrafted pearl bangles with hanging floral kalire strands on pink silk.',
    stock: 16,
    crop: { frame: 'frame_025.jpg', left: 54, top: 485 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_027.jpg', left: 54, top: 5, width: 95, height: 95 },
    slug: 'moti-bangles-with-kalire'
  },
  {
    name: 'Gopi Toda Pearl Bangles Pair',
    price: 600,
    category: 'Bangles',
    tag: 'POPULAR',
    description: 'Traditional Maharashtrian Gopi Toda pearl-studded openable bangles pair.',
    stock: 18,
    crop: { frame: 'frame_025.jpg', left: 54, top: 695 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_026.jpg', left: 54, top: 380, width: 95, height: 95 },
    slug: 'gopi-toda-pearl-bangles-pair'
  },
  {
    name: 'Parijat Bangles with Kalire',
    price: 600,
    category: 'Bangles',
    tag: 'SIGNATURE',
    description: 'White floral Parijat bangles with matching dangling pearl kalire (With Kalire 100 extra).',
    stock: 15,
    crop: { frame: 'frame_027.jpg', left: 54, top: 72, width: 95, height: 95 },
    slug: 'parijat-bangles-with-kalire'
  },
  {
    name: 'Floral Hathphool (Pair on Blue Velvet)',
    price: 250,
    category: 'Hathphool',
    tag: 'BESTSELLER',
    description: 'Handmade white pearl floral hathphool bracelet with ring attachment on deep blue velvet.',
    stock: 25,
    crop: { frame: 'frame_029.jpg', left: 54, top: 625 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_030.jpg', left: 54, top: 125, width: 95, height: 95 },
    slug: 'floral-hathphool-pair-blue-velvet'
  },
  {
    name: 'Floral Hathphool (Single Piece)',
    price: 250,
    category: 'Hathphool',
    tag: 'HANDMADE',
    description: 'Single piece floral cluster hathphool with adjustable pearl chains on blue velvet.',
    stock: 30,
    crop: { frame: 'frame_030.jpg', left: 54, top: 345, width: 95, height: 95 },
    slug: 'floral-hathphool-single-piece'
  },
  {
    name: 'Parijat Hathphool on Hand',
    price: 250,
    category: 'Hathphool',
    tag: 'NEW',
    description: 'Delicate Parijat flower hathphool ring bracelet styled on hand over blue silk.',
    stock: 22,
    crop: { frame: 'frame_031.jpg', left: 54, top: 480 > 538 ? 420 : 420, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_032.jpg', left: 54, top: 350, width: 95, height: 95 },
    slug: 'parijat-hathphool-on-hand'
  },
  {
    name: 'Floral Painjan (Bridal Anklet Pair)',
    price: 350,
    category: 'Anklet',
    tag: 'HANDCRAFTED',
    description: 'Handmade floral pearl painjan payal with tiny jingle bells on royal blue velvet.',
    stock: 20,
    crop: { frame: 'frame_043.jpg', left: 54, top: 630 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_044.jpg', left: 54, top: 250, width: 95, height: 95 },
    slug: 'floral-painjan-bridal-anklet'
  },

  // 8. CUSTOMISED BRIDAL & HALDI SETS
  {
    name: 'Customised Bridal Wedding Set',
    price: 1775,
    category: 'Bridal Set',
    tag: 'CUSTOMISED',
    description: 'Complete customized bridal jewellery set including choker, long haar, earrings, nath, and mundavali.',
    stock: 8,
    crop: { frame: 'frame_033.jpg', left: 54, top: 375, width: 95, height: 95 },
    slug: 'customised-bridal-wedding-set'
  },
  {
    name: 'Customised Bridal Set on Pink Silk',
    price: 1650,
    category: 'Bridal Set',
    tag: 'HANDMADE',
    description: 'Handcrafted bridal wedding set with bangles, earcuffs, nath, and necklaces on pink satin.',
    stock: 10,
    crop: { frame: 'frame_033.jpg', left: 54, top: 595 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_034.jpg', left: 54, top: 130, width: 95, height: 95 },
    slug: 'customised-bridal-set-pink-silk'
  },
  {
    name: 'Deluxe Bridal Set in Keepsake Box',
    price: 1520,
    category: 'Bridal Set',
    tag: 'POPULAR',
    description: 'Full bridal set with necklace, earrings, bangles, and nath in handcrafted wooden box.',
    stock: 12,
    crop: { frame: 'frame_034.jpg', left: 54, top: 355, width: 95, height: 95 },
    slug: 'deluxe-bridal-set-keepsake-box'
  },
  {
    name: 'Royal Gold & Moti Bridal Masterpiece Set',
    price: 3000,
    category: 'Bridal Set',
    tag: 'LUXURY',
    description: 'Masterpiece bridal set combining gold chains, moti haar, earrings, and mundavali in presentation cases.',
    stock: 5,
    crop: { frame: 'frame_047.jpg', left: 54, top: 725 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_048.jpg', left: 54, top: 410, width: 95, height: 95 },
    slug: 'royal-gold-moti-bridal-masterpiece-set'
  },
  {
    name: 'Red Stone Halwa Jewellery Set',
    price: 650,
    category: 'Traditional Set',
    tag: 'FESTIVE',
    description: 'Halwa sugar jewelry set with Jhumka earrings, long necklace, mangtika, and waistbelt for baby shower.',
    stock: 15,
    crop: { frame: 'frame_042.jpg', left: 54, top: 650 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_043.jpg', left: 54, top: 10, width: 95, height: 95 },
    slug: 'red-stone-halwa-jewellery-set'
  },
  {
    name: 'Parijat Set for Baby Girl (3 to 10 Years)',
    price: 850,
    category: 'Kids Jewellery',
    tag: 'FOR KIDS',
    description: 'Complete floral parijat necklace, earrings, and hairpins set designed specially for young girls.',
    stock: 15,
    crop: { frame: 'frame_039.jpg', left: 54, top: 800 > 538 ? 450 : 450, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_040.jpg', left: 54, top: 380, width: 95, height: 95 },
    slug: 'parijat-set-for-baby-girl'
  },
  {
    name: 'Peacock Earcuff & Zumka Combo Set',
    price: 1550,
    category: 'Traditional Set',
    tag: 'COMBO',
    description: 'Grand combo set including peacock earcuffs, 2 jhumka pins, and layered necklace on royal blue tray.',
    stock: 8,
    crop: { frame: 'frame_049.jpg', left: 54, top: 10, width: 95, height: 95 },
    slug: 'peacock-earcuff-zumka-combo-set'
  },

  // 9. MANGALSUTRA & INVISIBLE CHAINS
  {
    name: 'Traditional Long Mangalsutra (36 inch)',
    price: 300,
    category: 'Mangalsutra',
    tag: 'TRADITIONAL',
    description: '36-inch classic black bead mangalsutra with antique red-white floral pendant and matching earrings.',
    stock: 25,
    crop: { frame: 'frame_035.jpg', left: 54, top: 75, width: 95, height: 95 },
    slug: 'traditional-long-mangalsutra-36-inch'
  },
  {
    name: 'Customised Name Mangalsutra',
    price: 350,
    category: 'Mangalsutra',
    tag: 'CUSTOMISED',
    description: 'Personalized name mangalsutra in cursive golden font with dual black bead chains on hand display.',
    stock: 30,
    crop: { frame: 'frame_035.jpg', left: 54, top: 298, width: 95, height: 95 },
    slug: 'customised-name-mangalsutra'
  },
  {
    name: 'Classic Short Mangalsutra',
    price: 200,
    category: 'Mangalsutra',
    tag: 'DAILY WEAR',
    description: 'Lightweight single line black bead mangalsutra with pearl drop pendant on yellow silk.',
    stock: 40,
    crop: { frame: 'frame_034.jpg', left: 54, top: 798 > 538 ? 450 : 450, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_035.jpg', left: 54, top: 10, width: 95, height: 95 },
    slug: 'classic-short-mangalsutra'
  },
  {
    name: 'Laxmi Coin Invisible Chain',
    price: 189,
    category: 'Chain',
    tag: 'TRENDING',
    description: 'Premium quality invisible nylon thread chain featuring gold Laxmi coin charms on purple velvet.',
    stock: 50,
    crop: { frame: 'frame_035.jpg', left: 54, top: 745 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_037.jpg', left: 54, top: 120, width: 95, height: 95 },
    slug: 'laxmi-coin-invisible-chain'
  },
  {
    name: 'Invisible Chain with Matching Earrings',
    price: 250,
    category: 'Chain',
    tag: 'BESTSELLER',
    description: 'Delicate invisible floating necklace with floral charms and matching studs on satin drape.',
    stock: 35,
    crop: { frame: 'frame_037.jpg', left: 54, top: 325, width: 95, height: 95 },
    slug: 'invisible-chain-matching-earrings'
  },
  {
    name: 'Signature Invisible Collar Necklace',
    price: 199,
    category: 'Chain',
    tag: 'NEW',
    description: 'Handmade invisible wire collar necklace with cyan & pearl droplets on purple velvet.',
    stock: 40,
    crop: { frame: 'frame_037.jpg', left: 54, top: 548 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_038.jpg', left: 54, top: 350, width: 95, height: 95 },
    slug: 'signature-invisible-collar-necklace'
  },
  {
    name: 'Minimalist Invisible Single Charm Chain',
    price: 120,
    category: 'Chain',
    tag: 'POPULAR',
    description: 'Single charm minimalist floating necklace for everyday elegance on purple velvet.',
    stock: 50,
    crop: { frame: 'frame_045.jpg', left: 54, top: 742 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_046.jpg', left: 54, top: 400, width: 95, height: 95 },
    slug: 'minimalist-invisible-single-charm-chain'
  },

  // 10. BROOCHES & PUJA ITEMS
  {
    name: 'Acrylic Customised Name Brooch',
    price: 280,
    category: 'Brooch',
    tag: 'CUSTOMISED',
    description: 'Custom name acrylic brooch with hanging pearl chain for sarees and blazers on hand display.',
    stock: 30,
    crop: { frame: 'frame_039.jpg', left: 54, top: 135, width: 95, height: 95 },
    slug: 'acrylic-customised-name-brooch'
  },
  {
    name: 'Brass Peacock Brooch with Latkan',
    price: 480,
    category: 'Brooch',
    tag: 'PREMIUM',
    description: 'Handcrafted brass peacock brooch with multi-strand pearl hanging latkan on blue velvet.',
    stock: 20,
    crop: { frame: 'frame_039.jpg', left: 54, top: 355, width: 95, height: 95 },
    slug: 'brass-peacock-brooch-latkan'
  },
  {
    name: 'Saptapadi Decorated Supari Set (7 Pcs)',
    price: 350,
    category: 'Puja & Wedding',
    tag: 'WEDDING RITUAL',
    description: 'Set of 7 lavishly decorated pearl and stone wedding betel nuts (Supari) for Saptapadi marriage ritual.',
    stock: 25,
    crop: { frame: 'frame_049.jpg', left: 54, top: 615 > 538 ? 440 : 440, width: 95, height: 95 },
    fallbackCrop: { frame: 'frame_050.jpg', left: 54, top: 380, width: 95, height: 95 },
    slug: 'saptapadi-decorated-supari-set'
  }
];

async function runImport() {
  console.log(`Starting extraction of ${videoProductsData.length} products from video frames...`);
  
  await connectDB();
  
  // Clean existing products
  await Product.deleteMany({});
  console.log('Cleared existing product database.');
  
  const createdProducts = [];
  
  for (let i = 0; i < videoProductsData.length; i++) {
    const item = videoProductsData[i];
    const cropConfig = item.crop;
    const framePath = path.join(framesDir, cropConfig.frame);
    
    const outputFilename = `prod_${item.slug}.jpg`;
    const outputPath = path.join(uploadsDir, outputFilename);
    const publicUrl = `/uploads/${outputFilename}`;
    
    try {
      // 1. Crop thumbnail from frame
      let cropTop = cropConfig.top;
      if (cropTop + cropConfig.height > 538 && item.fallbackCrop) {
        cropTop = item.fallbackCrop.top;
      }
      cropTop = Math.max(0, Math.min(538 - cropConfig.height, cropTop));
      
      const croppedBuffer = await sharp(framePath)
        .extract({
          left: Math.max(0, Math.min(574 - cropConfig.width, cropConfig.left)),
          top: cropTop,
          width: Math.min(cropConfig.width, 574 - cropConfig.left),
          height: Math.min(cropConfig.height, 538 - cropTop)
        })
        .resize(700, 700, { fit: 'cover', kernel: 'lanczos3' })
        .sharpen()
        .jpeg({ quality: 92 })
        .toBuffer();
        
      // 2. Apply subtle golden Nathshikha watermark
      const watermarkedBuffer = await applyWatermark(croppedBuffer, {
        position: 'center',
        scale: 0.45,
        opacity: 0.28,
        quality: 92
      });
      
      await fs.promises.writeFile(outputPath, watermarkedBuffer);
      
      // 3. Create product record in MongoDB
      const productDoc = await Product.create({
        name: item.name,
        price: item.price,
        category: item.category,
        tag: item.tag,
        img: publicUrl,
        images: [publicUrl],
        description: item.description,
        stock: item.stock,
        active: 1
      });
      
      createdProducts.push(productDoc);
      console.log(`[${i + 1}/${videoProductsData.length}] Added: "${item.name}" (₹${item.price}) -> ${publicUrl}`);
    } catch (err) {
      console.error(`Error processing "${item.name}":`, err.message);
    }
  }
  
  console.log(`\n✓ SUCCESS: Successfully imported ${createdProducts.length} real products with watermarked images into MongoDB!`);
  process.exit(0);
}

runImport().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
