import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { Product } from './models/Product.js';
import { User } from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import hallOfFameRoutes from './routes/hallOfFameRoutes.js';
import showcaseReviewRoutes from './routes/showcaseReviewRoutes.js';
import heroSlideRoutes from './routes/heroSlideRoutes.js';
import parameterRoutes, { ensureDefaultParameters } from './routes/parameterRoutes.js';
import { Coupon } from './models/Coupon.js';
import { Review } from './models/Review.js';
import { Order } from './models/Order.js';
import { HallOfFame } from './models/HallOfFame.js';
import { ShowcaseReview } from './models/ShowcaseReview.js';
import { HeroSlide, defaultHeroSlides } from './models/HeroSlide.js';
import { noSqlSanitizer } from './middleware/securityMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);
const UPI_ID = process.env.UPI_ID || 'shwetadarekar04-1@okhdfcbank';

// Enable trust proxy for production reverse proxies (Nginx, Cloudflare, cPanel, Vercel)
app.set('trust proxy', 1);

const uploadsDir = path.resolve(__dirname, '../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'http://127.0.0.1:*'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // In development / local environment, allow requests with no origin (mobile apps, curl) or any localhost origin
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Request body parsing with generous size limit for multi-image uploads and product payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle body-parser payload too large or invalid json errors gracefully
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Request payload is too large. Maximum allowed size is 50MB.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON formatted body in request.' });
  }
  next(err);
});

// 4. NoSQL Query Injection Sanitization
app.use(noSqlSanitizer);

// Seed initial coupons and admin if empty
async function seedDatabase() {
  try {
    // Seed initial promotional coupons if none exist
    const couponCount = await Coupon.countDocuments();
    if (couponCount === 0) {
      console.log('Seeding initial promotional coupons...');
      const expiryDate = new Date('2026-12-31T23:59:59.999Z');
      await Coupon.insertMany([
        {
          code: 'WELCOME20',
          discountType: 'percent',
          discountValue: 20,
          minOrderValue: 500,
          usageLimit: 50,
          usageCount: 0,
          expiryDate,
          isActive: true,
          description: 'Welcome offer: 20% discount on orders above ₹500'
        },
        {
          code: 'SAVE150',
          discountType: 'fixed',
          discountValue: 150,
          minOrderValue: 1000,
          usageLimit: 100,
          usageCount: 0,
          expiryDate,
          isActive: true,
          description: 'Save ₹150 on orders above ₹1,000'
        }
      ]);
      console.log('✓ Initial promotional coupons seeded successfully.');
    }

    // Seed verified customer reviews if empty
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      const sampleProducts = await Product.find({ active: 1 }).limit(3);
      if (sampleProducts.length > 0) {
        console.log('Seeding initial verified customer reviews...');
        for (const p of sampleProducts) {
          // Create a mock delivered order for verified purchase link
          const mockOrder = await Order.create({
            orderNo: `NW${Math.floor(10000000 + Math.random() * 90000000)}`,
            name: 'Pooja Kulkarni',
            phone: '9820098200',
            email: 'pooja.kulkarni@example.com',
            address: '14 Shivaji Park, Dadar',
            pincode: '400028',
            city: 'Mumbai',
            state: 'Maharashtra',
            shippingMethod: 'Express Delivery',
            subtotal: p.price,
            shipping: 0,
            total: p.price,
            paymentMethod: 'upi',
            paymentStatus: 'verified',
            orderStatus: 'delivered',
            items: [{ productId: p._id, name: p.name, price: p.price, qty: 1, img: p.img }]
          });

          await Review.create({
            productId: p._id,
            orderId: mockOrder._id,
            customerName: 'Pooja Kulkarni',
            customerEmail: 'pooja.kulkarni@example.com',
            rating: 5,
            title: 'Exquisite Maharashtrian craftsmanship!',
            comment:
              'The finish is absolutely stunning and feels like an authentic heirloom piece. Received so many compliments at our family wedding. The packaging was top-notch too!',
            photoUrl: p.img,
            isVisible: true,
            isVerifiedPurchase: true,
            reviewSource: 'customer_account'
          });

          // Second review
          const mockOrder2 = await Order.create({
            orderNo: `NW${Math.floor(10000000 + Math.random() * 90000000)}`,
            name: 'Radhika Deshmukh',
            phone: '9811198111',
            email: 'radhika.d@example.com',
            address: '22 Prabhat Road, Deccan',
            pincode: '411004',
            city: 'Pune',
            state: 'Maharashtra',
            shippingMethod: 'Standard Delivery',
            subtotal: p.price,
            shipping: 0,
            total: p.price,
            paymentMethod: 'upi',
            paymentStatus: 'verified',
            orderStatus: 'delivered',
            items: [{ productId: p._id, name: p.name, price: p.price, qty: 1, img: p.img }]
          });

          await Review.create({
            productId: p._id,
            orderId: mockOrder2._id,
            customerName: 'Radhika Deshmukh',
            customerEmail: 'radhika.d@example.com',
            rating: 5,
            title: 'Loved the quality and design',
            comment:
              'Exactly as shown in the pictures. Very comfortable to wear for hours and pure traditional elegance.',
            photoUrl: null,
            isVisible: true,
            isVerifiedPurchase: true,
            reviewSource: 'admin_link'
          });
        }
        console.log('✓ Initial verified customer reviews seeded successfully.');
      }
    }

    // Seed Hall of Fame / Our Brides showcase if empty
    const hofCount = await HallOfFame.countDocuments();
    if (hofCount === 0) {
      console.log('Seeding initial Hall of Fame / Our Brides stories...');
      const allProds = await Product.find();
      const findProd = (nameMatch) => allProds.find((p) => p.name.toLowerCase().includes(nameMatch.toLowerCase()))?._id;

      const nathId = findProd('Nath');
      const thushiId = findProd('Thushi');
      const saajId = findProd('Saaj');
      const pearlId = findProd('Pearl');
      const tanmaniId = findProd('Tanmani');

      const sampleBrides = [
        {
          customer_name: 'Priya Sharma-Patil',
          photo_url: '/assets/nath-category.jpg',
          occasion: 'Wedding',
          description: 'Priya looked ethereal in our signature Maharashtrian Antique Nath paired with the Peshwai Antique Thushi for her traditional wedding ritual in Pune.',
          products: [nathId, thushiId].filter(Boolean),
          is_visible: true,
          display_order: 1,
          photo_consent: true,
          order_id: '#NS-88412'
        },
        {
          customer_name: 'Ananya Deshpande',
          photo_url: '/assets/hero.jpg',
          occasion: 'Engagement',
          description: 'Ananya chose the royal Kolhapuri Saaj Signature Set for her Peshwai-themed engagement ceremony. The handcrafted detailing complemented her Nauvari drape beautifully.',
          products: [saajId, nathId].filter(Boolean),
          is_visible: true,
          display_order: 2,
          photo_consent: true,
          order_id: '#NS-77309'
        },
        {
          customer_name: 'Shweta Kulkarni',
          photo_url: '/assets/pearl-category.jpg',
          occasion: 'Reception',
          description: 'Shweta paired our luminous Handmade Pearl Mala and Moti Tanmani for a modern yet deeply heritage reception look.',
          products: [pearlId, tanmaniId].filter(Boolean),
          is_visible: true,
          display_order: 3,
          photo_consent: true,
          order_id: '#NS-66210'
        },
        {
          customer_name: 'Tanvi Bhosale',
          photo_url: '/assets/thushi-category.jpg',
          occasion: 'Haldi & Mehendi',
          description: 'Tanvi chose our lightweight Peshwai Antique Thushi for her vibrant Haldi ceremony, bringing vintage Maratha grace to her festive celebrations.',
          products: [thushiId].filter(Boolean),
          is_visible: true,
          display_order: 4,
          photo_consent: true,
          order_id: '#NS-99144'
        }
      ];

      await HallOfFame.insertMany(sampleBrides);
      console.log('✓ Hall of Fame initial stories seeded successfully.');
    }

    // Seed initial Homepage Showcase / Google Reviews if empty
    const showcaseCount = await ShowcaseReview.countDocuments();
    if (showcaseCount === 0) {
      console.log('Seeding initial homepage showcase reviews...');
      await ShowcaseReview.insertMany([
        {
          customerName: 'Sneha Deshmukh',
          rating: 5,
          reviewText: 'The Kolhapuri Saaj I bought feels incredibly authentic. The antique finish and handcrafted details are breathtaking. Received countless compliments!',
          image: '/assets/pearl-category.jpg',
          isVisible: true
        },
        {
          customerName: 'Priya Sharma-Patil',
          rating: 5,
          reviewText: 'Ordered the traditional Maharashtrian Antique Nath for my wedding. The craftsmanship and filigree work is pure heritage art. Absolutely delighted!',
          image: '/assets/nath-category.jpg',
          isVisible: true
        },
        {
          customerName: 'Ananya Deshpande',
          rating: 5,
          reviewText: 'Exceptional quality Peshwai Thushi! The weight, luster of the pearls, and velvet packaging make it feel like an heirloom piece.',
          image: '/assets/thushi-category.jpg',
          isVisible: true
        },
        {
          customerName: 'Kavita Joshi',
          rating: 5,
          reviewText: 'The Moti Tanmani set exceeded all my expectations. Fast dispatch, secure packaging, and genuine artisan care.',
          image: null,
          isVisible: true
        },
        {
          customerName: 'Shweta Kulkarni',
          rating: 5,
          reviewText: 'Loved the prompt service and beautiful jewelry. A true tribute to authentic Maharashtrian traditions.',
          image: null,
          isVisible: true
        }
      ]);
      console.log('✓ Initial homepage showcase reviews seeded successfully.');
    }

    // Seed initial Hero Slides if empty
    const heroSlideCount = await HeroSlide.countDocuments();
    if (heroSlideCount === 0) {
      console.log('Seeding initial curated hero slides...');
      await HeroSlide.insertMany(defaultHeroSlides);
      console.log('✓ Initial hero slides seeded successfully.');
    }

    // Seed Master Parameter Library if empty
    await ensureDefaultParameters();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPass) {
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!existingAdmin) {
        await User.create({
          name: 'Nathshikha Admin',
          email: adminEmail.toLowerCase(),
          passwordHash: User.hashPassword(adminPass),
          role: 'admin'
        });
        console.log(`✓ Default admin initialized: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error('Error during database seeding:', err.message);
  }
}

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, upiId: UPI_ID }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/hall-of-fame', hallOfFameRoutes);
app.use('/api/showcase-reviews', showcaseReviewRoutes);
app.use('/api/hero-slides', heroSlideRoutes);

// Static assets
const dist = path.resolve(__dirname, '../dist');
app.use('/assets', express.static(path.resolve(__dirname, '../public/assets')));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(dist));

// SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(dist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Centralized Production-Safe Error Handler (Prevents Internal Stack/DB Leakage)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;
  const message = isProduction && statusCode === 500
    ? 'An unexpected error occurred on the server. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({ error: message });
});

// Start Server
async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Nathshikha server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Nathshikha server:', err);
    process.exit(1);
  }
}

startServer();
