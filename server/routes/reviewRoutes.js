import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { Review } from '../models/Review.js';
import { ReviewToken } from '../models/ReviewToken.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { auth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) =>
    cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

const router = express.Router();

/**
 * Public: Get reviews and rating summary for a product
 * GET /api/reviews/product/:productId
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = 'newest', page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const prodId = new mongoose.Types.ObjectId(productId);
    const filter = { productId: prodId, isVisible: true };

    // Sorting logic
    let sortObj = { createdAt: -1 };
    if (sort === 'highest') sortObj = { rating: -1, createdAt: -1 };
    if (sort === 'lowest') sortObj = { rating: 1, createdAt: -1 };
    if (sort === 'with_photos') sortObj = { photoUrl: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Fetch visible reviews
    const [reviews, totalCount, allRatings] = await Promise.all([
      Review.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
      Review.find(filter, { rating: 1, photoUrl: 1 })
    ]);

    // Calculate rating distribution and average
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    let withPhotosCount = 0;

    allRatings.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      distribution[star] = (distribution[star] || 0) + 1;
      totalScore += r.rating;
      if (r.photoUrl) withPhotosCount++;
    });

    const averageRating = totalCount > 0 ? parseFloat((totalScore / totalCount).toFixed(1)) : 0;

    res.json({
      reviews,
      summary: {
        averageRating,
        totalReviews: totalCount,
        distribution,
        withPhotosCount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
});

/**
 * Authenticated: Get map of customer's submitted reviews
 * GET /api/reviews/my-reviews
 */
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const userEmail = req.user.email?.toLowerCase().trim();
    const userId = req.user._id;

    const myReviews = await Review.find({
      $or: [{ userId }, { customerEmail: userEmail }]
    }).sort({ createdAt: -1 });

    res.json(myReviews);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch customer reviews' });
  }
});

/**
 * Public: Validate a review link token
 * GET /api/reviews/token/:token
 */
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const reviewToken = await ReviewToken.findOne({ token })
      .populate('productId')
      .populate('orderId');

    if (!reviewToken) {
      return res.status(404).json({ error: 'Invalid or expired review link.' });
    }

    if (new Date(reviewToken.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This review link has expired.' });
    }

    // Check if review already exists for this order & product
    const existingReview = await Review.findOne({
      orderId: reviewToken.orderId?._id || reviewToken.orderId,
      productId: reviewToken.productId?._id || reviewToken.productId
    });

    if (existingReview || reviewToken.isUsed) {
      return res.json({
        valid: true,
        alreadySubmitted: true,
        customerName: reviewToken.customerName,
        product: reviewToken.productId,
        order: {
          id: reviewToken.orderId?.id || reviewToken.orderId?._id,
          orderNo: reviewToken.orderId?.orderNo
        },
        review: existingReview
      });
    }

    res.json({
      valid: true,
      alreadySubmitted: false,
      customerName: reviewToken.customerName,
      customerEmail: reviewToken.customerEmail,
      product: reviewToken.productId,
      order: {
        id: reviewToken.orderId?.id || reviewToken.orderId?._id,
        orderNo: reviewToken.orderId?.orderNo,
        orderStatus: reviewToken.orderId?.orderStatus
      },
      expiresAt: reviewToken.expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to validate review token' });
  }
});

/**
 * Public/Customer: Upload review photo (Sharp verified)
 */
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'Please select a valid image file (JPG, PNG, WEBP, GIF; max 5MB).' });
  }

  const filename = `review-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const target = path.join(uploadsDir, filename);

  try {
    const optimizedBuffer = await sharp(req.file.path)
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    await fs.promises.writeFile(target, optimizedBuffer);

    if (fs.existsSync(req.file.path) && req.file.path !== target) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Failed to save review photo:', err.message);
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: 'Invalid or unsupported image file.' });
  }
});

/**
 * Public & Authenticated: Submit customer review
 * POST /api/reviews/submit
 */
router.post('/submit', async (req, res) => {
  try {
    const {
      token,
      orderId,
      productId,
      rating,
      title = '',
      comment,
      photoUrl = null
    } = req.body;

    // Validate rating & comment
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Please provide a valid rating from 1 to 5 stars.' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Please enter your review feedback.' });
    }

    let finalOrderId = orderId;
    let finalProductId = productId;
    let customerName = '';
    let customerEmail = '';
    let userId = null;
    let reviewSource = 'customer_account';

    // ----------------------------------------------------
    // Scenario A: Review submitted via Admin-generated Token
    // ----------------------------------------------------
    if (token) {
      const reviewToken = await ReviewToken.findOne({ token }).populate('orderId');
      if (!reviewToken) {
        return res.status(404).json({ error: 'Invalid or expired review link.' });
      }
      if (new Date(reviewToken.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'This review link has expired.' });
      }

      finalOrderId = reviewToken.orderId._id;
      finalProductId = reviewToken.productId;
      customerName = reviewToken.customerName;
      customerEmail = reviewToken.customerEmail;
      userId = reviewToken.orderId.userId || null;
      reviewSource = 'admin_link';

      const order = reviewToken.orderId;
      if (!order) {
        return res.status(404).json({ error: 'Associated order not found.' });
      }

      // Verify order is Delivered
      if (order.orderStatus !== 'delivered') {
        return res.status(400).json({
          error: 'Reviews can only be submitted once the order has been Delivered.'
        });
      }

      // Check if product is in order
      const hasProduct = order.items?.some(
        (item) => String(item.productId || item.id) === String(finalProductId)
      );
      if (!hasProduct) {
        return res.status(400).json({ error: 'This product was not purchased in this order.' });
      }

      // Check for duplicate review
      const duplicate = await Review.findOne({
        orderId: finalOrderId,
        productId: finalProductId
      });
      if (duplicate) {
        return res.status(409).json({
          error: 'A review has already been submitted for this product and order.'
        });
      }

      // Create review
      const review = await Review.create({
        productId: finalProductId,
        orderId: finalOrderId,
        userId,
        customerName,
        customerEmail,
        rating: numRating,
        title: title.trim(),
        comment: comment.trim(),
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        isVisible: true,
        isVerifiedPurchase: true,
        reviewSource
      });

      // Mark token as used
      reviewToken.isUsed = true;
      reviewToken.usedAt = new Date();
      await reviewToken.save();

      return res.status(201).json({
        message: 'Thank you for your feedback! Your review has been submitted successfully.',
        review
      });
    }

    // ----------------------------------------------------
    // Scenario B: Review submitted via Logged-in Customer Account
    // ----------------------------------------------------
    // Optional auth token check from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'You must be logged in or have a valid review link to submit feedback.'
      });
    }

    const jwt = (await import('jsonwebtoken')).default;
    const JWT_SECRET = process.env.JWT_SECRET || 'nathshikha-super-secret-key-2026';
    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    if (!finalOrderId || !finalProductId) {
      return res.status(400).json({ error: 'Order ID and Product ID are required.' });
    }

    const order = await Order.findById(finalOrderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Verify ownership
    const isOwner =
      (order.userId && String(order.userId) === String(decoded.id)) ||
      order.email.toLowerCase() === decoded.email.toLowerCase();

    if (!isOwner && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to review this order.' });
    }

    // Verify order is Delivered
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        error: 'Reviews can only be submitted once the order has been Delivered.'
      });
    }

    // Verify product was purchased in this order
    const hasProduct = order.items?.some(
      (item) => String(item.productId || item.id) === String(finalProductId)
    );
    if (!hasProduct) {
      return res.status(400).json({ error: 'This product was not purchased in this order.' });
    }

    // Check for duplicate review
    const duplicate = await Review.findOne({
      orderId: finalOrderId,
      productId: finalProductId
    });
    if (duplicate) {
      return res.status(409).json({
        error: 'You have already submitted a review for this product in this order.'
      });
    }

    customerName = order.name || decoded.name || 'Verified Customer';
    customerEmail = order.email || decoded.email;
    userId = decoded.id || order.userId || null;

    const review = await Review.create({
      productId: finalProductId,
      orderId: finalOrderId,
      userId,
      customerName,
      customerEmail,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      photoUrl: photoUrl ? String(photoUrl).trim() : null,
      isVisible: true,
      isVerifiedPurchase: true,
      reviewSource: 'customer_account'
    });

    res.status(201).json({
      message: 'Thank you for your feedback! Your review has been submitted successfully.',
      review
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit review' });
  }
});

/**
 * Authenticated: Edit an existing review
 * PUT /api/reviews/:id
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title = '', comment, photoUrl } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check ownership
    const isOwner =
      (review.userId && String(review.userId) === String(req.user._id)) ||
      review.customerEmail.toLowerCase() === req.user.email.toLowerCase();

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to edit this review.' });
    }

    if (rating !== undefined) {
      const numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
      }
      review.rating = numRating;
    }

    if (title !== undefined) review.title = title.trim();
    if (comment !== undefined) {
      if (!comment.trim()) return res.status(400).json({ error: 'Review comment cannot be empty.' });
      review.comment = comment.trim();
    }
    if (photoUrl !== undefined) review.photoUrl = photoUrl ? String(photoUrl).trim() : null;

    await review.save();

    res.json({
      message: 'Review updated successfully.',
      review
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update review' });
  }
});

export default router;
