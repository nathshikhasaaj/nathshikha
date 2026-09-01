import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { HeroSlide, defaultHeroSlides } from '../models/HeroSlide.js';
import { auth, admin } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /^image\/(jpeg|png|webp|gif|heic|avif|jpg)$/i.test(file.mimetype))
});

const router = express.Router();

/**
 * 1. PUBLIC: GET /api/hero-slides
 * Returns all active hero slides sorted by displayOrder
 */
router.get('/', async (req, res) => {
  try {
    let slides = await HeroSlide.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    
    // If empty, auto-seed defaults
    if (!slides || slides.length === 0) {
      await HeroSlide.insertMany(defaultHeroSlides);
      slides = await HeroSlide.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    }

    res.json(slides);
  } catch (err) {
    console.error('Error fetching hero slides:', err);
    res.json(defaultHeroSlides);
  }
});

/**
 * 2. ADMIN: GET /api/hero-slides/admin/all
 * Returns all slides (both active and inactive)
 */
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    let slides = await HeroSlide.find().sort({ displayOrder: 1, createdAt: 1 });
    if (!slides || slides.length === 0) {
      await HeroSlide.insertMany(defaultHeroSlides);
      slides = await HeroSlide.find().sort({ displayOrder: 1, createdAt: 1 });
    }
    res.json(slides);
  } catch (err) {
    console.error('Error fetching admin hero slides:', err);
    res.status(500).json({ error: 'Failed to fetch hero slides' });
  }
});

/**
 * 3. ADMIN: POST /api/hero-slides/admin/upload
 * Uploads and optimizes a hero slide image
 */
router.post('/admin/upload', auth, admin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select an image file to upload.' });
  }

  try {
    const filename = `hero-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const targetPath = path.join(uploadsDir, filename);

    // Optimize image with high visual fidelity for fine jewelry
    await sharp(req.file.path)
      .resize({
        width: 1400,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(targetPath);

    // Clean up temporary multer upload file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const publicUrl = `/uploads/${filename}`;
    res.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error('Error uploading hero image:', err);
    res.status(500).json({ error: 'Image processing failed. Please try another image.' });
  }
});

/**
 * 4. ADMIN: POST /api/hero-slides/admin
 * Creates a new hero slide
 */
router.post('/admin', auth, admin, async (req, res) => {
  try {
    const {
      img,
      tag,
      tagMr,
      title,
      titleMr,
      desc,
      descMr,
      highlight,
      lookName,
      ctaText,
      ctaLink,
      displayOrder,
      isActive
    } = req.body;

    if (!img || !title) {
      return res.status(400).json({ error: 'Image and Title are required.' });
    }

    const count = await HeroSlide.countDocuments();
    const newSlide = await HeroSlide.create({
      slideNumber: count + 1,
      img,
      tag: tag || '✦ ROYAL FLORAL HEIRLOOM ✦',
      tagMr: tagMr || '✦ अस्सल पारिजात कलाकुसर ✦',
      title,
      titleMr: titleMr || '',
      desc: desc || '',
      descMr: descMr || '',
      highlight: highlight || '',
      lookName: lookName || `Look 0${count + 1}`,
      ctaText: ctaText || 'EXPLORE COLLECTION',
      ctaLink: ctaLink || '/shop',
      displayOrder: displayOrder ? Number(displayOrder) : count + 1,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json(newSlide);
  } catch (err) {
    console.error('Error creating hero slide:', err);
    res.status(500).json({ error: err.message || 'Failed to create hero slide' });
  }
});

/**
 * 5. ADMIN: PUT /api/hero-slides/admin/:id
 * Updates an existing hero slide
 */
router.put('/admin/:id', auth, admin, async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Hero slide not found.' });
    }

    const fields = [
      'img',
      'tag',
      'tagMr',
      'title',
      'titleMr',
      'desc',
      'descMr',
      'highlight',
      'lookName',
      'ctaText',
      'ctaLink',
      'displayOrder',
      'isActive'
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        slide[field] = req.body[field];
      }
    });

    await slide.save();
    res.json(slide);
  } catch (err) {
    console.error('Error updating hero slide:', err);
    res.status(500).json({ error: err.message || 'Failed to update hero slide' });
  }
});

/**
 * 6. ADMIN: PATCH /api/hero-slides/admin/:id/toggle
 * Toggles active status
 */
router.patch('/admin/:id/toggle', auth, admin, async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Hero slide not found.' });
    }

    slide.isActive = !slide.isActive;
    await slide.save();
    res.json({ ok: true, isActive: slide.isActive, slide });
  } catch (err) {
    console.error('Error toggling hero slide:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle slide status' });
  }
});

/**
 * 7. ADMIN: DELETE /api/hero-slides/admin/:id
 * Deletes a hero slide
 */
router.delete('/admin/:id', auth, admin, async (req, res) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Hero slide not found.' });
    }
    res.json({ ok: true, message: 'Hero slide deleted successfully' });
  } catch (err) {
    console.error('Error deleting hero slide:', err);
    res.status(500).json({ error: err.message || 'Failed to delete slide' });
  }
});

/**
 * 8. ADMIN: POST /api/hero-slides/admin/reset-defaults
 * Resets hero slides to the default 3 curated sets
 */
router.post('/admin/reset-defaults', auth, admin, async (req, res) => {
  try {
    await HeroSlide.deleteMany({});
    await HeroSlide.insertMany(defaultHeroSlides);
    const slides = await HeroSlide.find().sort({ displayOrder: 1 });
    res.json({ ok: true, message: 'Reset to default hero slides successfully', slides });
  } catch (err) {
    console.error('Error resetting hero slides:', err);
    res.status(500).json({ error: 'Failed to reset hero slides' });
  }
});

export default router;
