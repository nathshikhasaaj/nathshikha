import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { ShowcaseReview } from '../models/ShowcaseReview.js';
import { auth, admin } from '../middleware/auth.js';
import { isValidObjectId } from '../middleware/securityMiddleware.js';

import { uploadSingle, uploadsDir } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * Public: Get latest visible showcase/Google reviews for homepage carousel
 * Returns at most the latest 5 visible reviews, sorted newest first
 */
router.get('/', async (req, res) => {
  try {
    const reviews = await ShowcaseReview.find({ isVisible: true })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(reviews);
  } catch (err) {
    console.error('Failed to fetch showcase reviews:', err);
    res.status(500).json({ error: 'Failed to fetch showcase reviews.' });
  }
});

/**
 * Admin: Get all showcase reviews
 */
router.get('/admin', auth, admin, async (req, res) => {
  try {
    const reviews = await ShowcaseReview.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('Failed to fetch admin showcase reviews:', err);
    res.status(500).json({ error: 'Failed to fetch showcase reviews.' });
  }
});

/**
 * Admin: Upload showcase review image
 */
router.post('/admin/upload', auth, admin, uploadSingle(['image', 'photo', 'file']), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select a valid image file (JPG, PNG, WEBP, GIF, HEIC, AVIF).' });
  }

  const filename = `showcase-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
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
    console.error('Failed to process showcase review image:', err.message);
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: 'Invalid or unsupported image file.' });
  }
});

/**
 * Admin: Create a new showcase review
 */
router.post('/admin', auth, admin, async (req, res) => {
  try {
    const { customerName, customer_name, rating, reviewText, review_text, image, isVisible, is_visible } = req.body;

    const finalName = String(customerName || customer_name || '').trim();
    const finalRating = parseInt(rating, 10);
    const finalText = String(reviewText || review_text || '').trim();
    const finalImage = image ? String(image).trim() : null;
    const finalVisible = isVisible !== undefined ? Boolean(isVisible) : (is_visible !== undefined ? Boolean(is_visible) : true);

    if (!finalName) {
      return res.status(400).json({ error: 'Please provide the customer name.' });
    }

    if (isNaN(finalRating) || finalRating < 1 || finalRating > 5) {
      return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    if (!finalText) {
      return res.status(400).json({ error: 'Please enter the review text.' });
    }

    const review = await ShowcaseReview.create({
      customerName: finalName,
      rating: finalRating,
      reviewText: finalText,
      image: finalImage,
      isVisible: finalVisible
    });

    res.status(201).json({
      ok: true,
      message: 'Showcase review added successfully.',
      review
    });
  } catch (err) {
    console.error('Failed to create showcase review:', err);
    res.status(500).json({ error: err.message || 'Failed to create showcase review.' });
  }
});

/**
 * Admin: Update an existing showcase review
 */
router.put('/admin/:id', auth, admin, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Showcase review not found.' });
  }

  try {
    const review = await ShowcaseReview.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Showcase review not found.' });
    }

    const { customerName, customer_name, rating, reviewText, review_text, image, isVisible, is_visible } = req.body;

    if (customerName !== undefined || customer_name !== undefined) {
      const n = String(customerName || customer_name || '').trim();
      if (!n) return res.status(400).json({ error: 'Customer name cannot be empty.' });
      review.customerName = n;
    }

    if (rating !== undefined) {
      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
      }
      review.rating = r;
    }

    if (reviewText !== undefined || review_text !== undefined) {
      const t = String(reviewText || review_text || '').trim();
      if (!t) return res.status(400).json({ error: 'Review text cannot be empty.' });
      review.reviewText = t;
    }

    if (image !== undefined) {
      review.image = image ? String(image).trim() : null;
    }

    if (isVisible !== undefined) {
      review.isVisible = Boolean(isVisible);
    } else if (is_visible !== undefined) {
      review.isVisible = Boolean(is_visible);
    }

    await review.save();

    res.json({
      ok: true,
      message: 'Showcase review updated successfully.',
      review
    });
  } catch (err) {
    console.error('Failed to update showcase review:', err);
    res.status(500).json({ error: err.message || 'Failed to update showcase review.' });
  }
});

/**
 * Admin: Toggle visibility
 */
router.patch('/admin/:id/visibility', auth, admin, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Showcase review not found.' });
  }

  try {
    const review = await ShowcaseReview.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Showcase review not found.' });
    }

    if (req.body.isVisible !== undefined) {
      review.isVisible = Boolean(req.body.isVisible);
    } else if (req.body.is_visible !== undefined) {
      review.isVisible = Boolean(req.body.is_visible);
    } else {
      review.isVisible = !review.isVisible;
    }

    await review.save();

    res.json({
      ok: true,
      message: `Showcase review marked as ${review.isVisible ? 'Visible' : 'Hidden'}.`,
      review
    });
  } catch (err) {
    console.error('Failed to toggle showcase review visibility:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle visibility.' });
  }
});

/**
 * Admin: Delete showcase review
 */
router.delete('/admin/:id', auth, admin, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Showcase review not found.' });
  }

  try {
    const review = await ShowcaseReview.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ error: 'Showcase review not found.' });
    }

    res.json({
      ok: true,
      message: 'Showcase review permanently deleted.'
    });
  } catch (err) {
    console.error('Failed to delete showcase review:', err);
    res.status(500).json({ error: err.message || 'Failed to delete showcase review.' });
  }
});

export default router;
