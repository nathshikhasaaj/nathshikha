import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Category } from '../models/Category.js';

function escapeRegex(text) {
  return String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const router = express.Router();

// Get active products with category & search filtering + genuine review stats
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { active: 1 };

    if (category) {
      const trimmedCategory = category.trim();
      // First check if the passed category matches a Category slug
      const matchedCategoryDoc = await Category.findOne({
        slug: trimmedCategory.toLowerCase()
      });

      const effectiveCategoryName = matchedCategoryDoc ? matchedCategoryDoc.name : trimmedCategory;
      filter.category = new RegExp(`^${escapeRegex(effectiveCategoryName)}$`, 'i');
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: searchRegex }, { category: searchRegex }];
    }

    const products = await Product.find(filter).sort({ createdAt: -1, _id: -1 });

    if (!products || products.length === 0) {
      return res.json([]);
    }

    const productIds = products.map((p) => p._id);

    // Aggregate genuine approved/visible reviews only
    const reviewStats = await Review.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          isVisible: true
        }
      },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {};
    reviewStats.forEach((stat) => {
      statsMap[stat._id.toString()] = {
        averageRating: parseFloat((stat.averageRating || 0).toFixed(1)),
        reviewCount: stat.reviewCount || 0
      };
    });

    const productsWithStats = products.map((p) => {
      const json = p.toJSON ? p.toJSON() : p.toObject();
      const idKey = p._id ? p._id.toString() : json.id;
      const stats = statsMap[idKey] || { averageRating: 0, reviewCount: 0 };
      return {
        ...json,
        averageRating: stats.averageRating,
        reviewCount: stats.reviewCount,
        totalReviews: stats.reviewCount
      };
    });

    res.json(productsWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// Get single product detail by ID with genuine review stats
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

    // Aggregate genuine approved/visible reviews only for this product
    const reviewStats = await Review.aggregate([
      {
        $match: {
          productId: product._id,
          isVisible: true
        }
      },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const json = product.toJSON ? product.toJSON() : product.toObject();
    const stats = reviewStats[0]
      ? {
          averageRating: parseFloat((reviewStats[0].averageRating || 0).toFixed(1)),
          reviewCount: reviewStats[0].reviewCount || 0
        }
      : { averageRating: 0, reviewCount: 0 };

    res.json({
      ...json,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
      totalReviews: stats.reviewCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch product' });
  }
});

export default router;
