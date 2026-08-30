import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

const router = express.Router();

// Get active products with category & search filtering
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { active: 1 };

    if (category) {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { category: searchRegex }];
    }

    const products = await Product.find(filter).sort({ createdAt: -1, _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// Get single product detail by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await Product.findOne({ _id: id, active: 1 });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch product' });
  }
});

export default router;
