import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { HallOfFame } from '../models/HallOfFame.js';
import { auth, admin } from '../middleware/auth.js';
import { isValidObjectId } from '../middleware/securityMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) =>
    cb(null, /^image\/(jpeg|png|webp|gif|heic|avif)$/i.test(file.mimetype))
});

const router = express.Router();

// Helper to normalize story output with photo_urls
function normalizeStory(doc) {
  const obj = doc.toJSON ? doc.toJSON() : doc;
  const urls = Array.isArray(obj.photo_urls) && obj.photo_urls.length > 0
    ? obj.photo_urls
    : (obj.photo_url ? [obj.photo_url] : []);
  return {
    ...obj,
    photo_url: urls[0] || obj.photo_url || '',
    photo_urls: urls
  };
}

// ----------------------------------------------------
// Public Route: Get all visible and consented Hall of Fame stories
// ----------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const stories = await HallOfFame.find({
      is_visible: true,
      photo_consent: { $ne: false }
    })
      .sort({ display_order: 1, createdAt: -1, _id: -1 })
      .populate({
        path: 'products',
        select: 'name price img category tag active'
      });

    res.json(stories.map(normalizeStory));
  } catch (err) {
    console.error('Failed to fetch Hall of Fame stories:', err);
    res.status(500).json({ error: 'Failed to fetch Hall of Fame stories.' });
  }
});

// ----------------------------------------------------
// Admin Routes (Protected)
// ----------------------------------------------------

// Admin: Upload single customer photo (Sharp validated)
router.post('/admin/upload', auth, admin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'Please select a valid image (JPG, PNG, WEBP or GIF, max 5MB).' });
  }

  const filename = `bride-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
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
    console.error('Failed to save bridal photo:', err.message);
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: 'Invalid or unsupported image file.' });
  }
});

// Admin: Upload multiple customer photos (Sharp validated)
router.post('/admin/upload-multiple', auth, admin, upload.array('images', 10), async (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'Please select at least one image file (max 10).' });
  }

  const uploadedUrls = [];

  for (const file of req.files) {
    const filename = `bride-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
    const target = path.join(uploadsDir, filename);

    try {
      const optimizedBuffer = await sharp(file.path)
        .rotate()
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();

      await fs.promises.writeFile(target, optimizedBuffer);
      uploadedUrls.push(`/uploads/${filename}`);
    } catch (err) {
      console.error('Failed to process image in multiple upload batch:', err.message);
    } finally {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path).catch(() => {});
      }
    }
  }

  if (!uploadedUrls.length) {
    return res.status(400).json({ error: 'Failed to process any of the uploaded images.' });
  }

  res.json({ urls: uploadedUrls });
});

// Admin: Get all stories (both active and hidden)
router.get('/admin', auth, admin, async (req, res) => {
  try {
    const stories = await HallOfFame.find()
      .sort({ display_order: 1, createdAt: -1, _id: -1 })
      .populate({
        path: 'products',
        select: 'name price img category tag active'
      });

    res.json(stories.map(normalizeStory));
  } catch (err) {
    console.error('Failed to fetch admin Hall of Fame stories:', err);
    res.status(500).json({ error: 'Failed to fetch admin Hall of Fame stories.' });
  }
});

// Admin: Create a new Hall of Fame story
router.post('/admin', auth, admin, async (req, res) => {
  try {
    const {
      customer_name,
      photo_url,
      photo_urls,
      occasion,
      description,
      products,
      is_visible,
      display_order,
      photo_consent,
      order_id
    } = req.body;

    // Normalize multiple photos
    let finalPhotoUrls = [];
    if (Array.isArray(photo_urls) && photo_urls.length > 0) {
      finalPhotoUrls = photo_urls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 10);
    } else if (photo_url && typeof photo_url === 'string' && photo_url.trim()) {
      finalPhotoUrls = [photo_url.trim()];
    }

    if (!finalPhotoUrls.length) {
      return res.status(400).json({ error: 'At least one customer photograph is required.' });
    }

    // Filter valid product ObjectIds if provided
    let validProductIds = [];
    if (Array.isArray(products)) {
      validProductIds = products
        .map((p) => (typeof p === 'object' && p !== null ? (p.id || p._id) : p))
        .filter((id) => isValidObjectId(String(id)));
    }

    const newStory = await HallOfFame.create({
      customer_name: customer_name ? String(customer_name).trim().slice(0, 100) : '',
      photo_url: finalPhotoUrls[0],
      photo_urls: finalPhotoUrls,
      occasion: occasion ? String(occasion).trim().slice(0, 100) : 'Wedding',
      description: description ? String(description).trim().slice(0, 2000) : '',
      products: validProductIds,
      is_visible: is_visible !== undefined ? Boolean(is_visible) : true,
      display_order: Number.isFinite(Number(display_order)) ? Number(display_order) : 0,
      photo_consent: photo_consent !== undefined ? Boolean(photo_consent) : true,
      order_id: order_id ? String(order_id).trim().slice(0, 100) : ''
    });

    const populatedStory = await HallOfFame.findById(newStory._id).populate({
      path: 'products',
      select: 'name price img category tag active'
    });

    res.status(201).json({
      ok: true,
      message: 'Hall of Fame story published successfully',
      story: normalizeStory(populatedStory)
    });
  } catch (err) {
    console.error('Failed to create Hall of Fame story:', err);
    res.status(500).json({ error: 'Failed to create Hall of Fame story.' });
  }
});

// Admin: Quick visibility toggle
router.patch('/admin/:id/visibility', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { is_visible } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Story not found' });
  }

  try {
    const story = await HallOfFame.findByIdAndUpdate(
      id,
      { is_visible: Boolean(is_visible) },
      { new: true }
    ).populate({
      path: 'products',
      select: 'name price img category tag active'
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      ok: true,
      message: `Story visibility updated to ${story.is_visible ? 'Active' : 'Hidden'}`,
      story: normalizeStory(story)
    });
  } catch (err) {
    console.error('Failed to update visibility:', err);
    res.status(500).json({ error: 'Failed to update visibility.' });
  }
});

// Admin: Update complete story
router.patch('/admin/:id', auth, admin, async (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    photo_url,
    photo_urls,
    occasion,
    description,
    products,
    is_visible,
    display_order,
    photo_consent,
    order_id
  } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Story not found' });
  }

  try {
    const updates = {};
    if (customer_name !== undefined) updates.customer_name = String(customer_name).trim().slice(0, 100);
    if (occasion !== undefined) updates.occasion = String(occasion).trim().slice(0, 100);
    if (description !== undefined) updates.description = String(description).trim().slice(0, 2000);
    if (is_visible !== undefined) updates.is_visible = Boolean(is_visible);
    if (display_order !== undefined) updates.display_order = Number(display_order) || 0;
    if (photo_consent !== undefined) updates.photo_consent = Boolean(photo_consent);
    if (order_id !== undefined) updates.order_id = String(order_id).trim().slice(0, 100);

    if (Array.isArray(photo_urls) && photo_urls.length > 0) {
      const cleanUrls = photo_urls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 10);
      updates.photo_urls = cleanUrls;
      updates.photo_url = cleanUrls[0];
    } else if (photo_url !== undefined) {
      const cleanUrl = String(photo_url).trim();
      updates.photo_url = cleanUrl;
      updates.photo_urls = [cleanUrl];
    }

    if (Array.isArray(products)) {
      updates.products = products
        .map((p) => (typeof p === 'object' && p !== null ? (p.id || p._id) : p))
        .filter((pid) => isValidObjectId(String(pid)));
    }

    const updated = await HallOfFame.findByIdAndUpdate(id, updates, { new: true }).populate({
      path: 'products',
      select: 'name price img category tag active'
    });

    if (!updated) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      ok: true,
      message: 'Hall of Fame story updated successfully',
      story: normalizeStory(updated)
    });
  } catch (err) {
    console.error('Failed to update story:', err);
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

// Admin: Delete a story
router.delete('/admin/:id', auth, admin, async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Story not found' });
  }

  try {
    const deleted = await HallOfFame.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      ok: true,
      message: 'Hall of Fame story deleted successfully',
      id
    });
  } catch (err) {
    console.error('Failed to delete story:', err);
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

export default router;
