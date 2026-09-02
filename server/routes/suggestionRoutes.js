import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { Suggestion } from '../models/Suggestion.js';
import { auth, admin } from '../middleware/auth.js';
import {
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  apiLimiter
} from '../middleware/securityMiddleware.js';

import { uploadSingle, uploadsDir } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public: Upload reference design image or sketch (Validated through Sharp)
router.post('/upload', apiLimiter, uploadSingle(['image', 'photo', 'file']), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'Please select a valid image file (JPG, PNG, WEBP, GIF, HEIC, AVIF).' });
  }

  const filename = `design-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const target = path.join(uploadsDir, filename);

  try {
    // Validate image format and strip any EXIF/executable metadata
    const optimizedBuffer = await sharp(req.file.path)
      .rotate() // Auto-orient based on EXIF
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    await fs.promises.writeFile(target, optimizedBuffer);

    if (fs.existsSync(req.file.path) && req.file.path !== target) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Failed to validate suggestion image:', err.message);
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: 'Invalid or corrupted image file.' });
  }
});

// Public: Submit customer suggestion or custom design request
router.post('/', apiLimiter, async (req, res) => {
  const { name, email, phone, category, title, description, budget, imageUrl } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Please enter a design title.' });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Please enter a description.' });
  }

  try {
    const suggestion = await Suggestion.create({
      name: name.trim().slice(0, 100),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      category: String(category || 'Custom Jewellery Design').slice(0, 100),
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 2000),
      budget: String(budget || 'Flexible').slice(0, 100),
      imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/') ? imageUrl : null
    });

    res.status(201).json({
      ok: true,
      message: 'Suggestion received successfully',
      suggestion
    });
  } catch (err) {
    console.error('Error submitting suggestion:', err);
    res.status(500).json({ error: 'Failed to submit suggestion.' });
  }
});

// Admin: Get all suggestions and design requests (Protected)
router.get('/admin', auth, admin, async (req, res) => {
  try {
    const list = await Suggestion.find().sort({ createdAt: -1, _id: -1 });
    res.json(list);
  } catch (err) {
    console.error('Error fetching suggestions for admin:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions.' });
  }
});

// Admin: Update suggestion status and notes (Protected)
router.patch('/admin/:id', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Suggestion not found.' });
  }

  try {
    const updates = {};
    if (status && typeof status === 'string') updates.status = status.slice(0, 50);
    if (notes !== undefined && typeof notes === 'string') updates.notes = notes.slice(0, 1000);

    const updated = await Suggestion.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Suggestion not found.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating suggestion:', err);
    res.status(500).json({ error: 'Failed to update suggestion.' });
  }
});

export default router;
