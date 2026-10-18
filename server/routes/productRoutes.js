import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Category } from '../models/Category.js';

function escapeRegex(text) {
  return String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const router = express.Router();

function computeRelevanceScore(product, cleanSearch, searchTokens) {
  const name = String(product.name || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  const tag = String(product.tag || '').toLowerCase();
  const description = String(product.description || '').toLowerCase();
  const q = cleanSearch.toLowerCase();

  let score = 0;

  // Exact full name match
  if (name === q) {
    score += 150;
  } else if (name.startsWith(q)) {
    score += 90;
  } else if (name.includes(q)) {
    score += 60;
  }

  // Token matching in name, category, tag, description
  let tokensInNameCount = 0;
  for (const token of searchTokens) {
    const t = token.toLowerCase();
    if (name.includes(t)) {
      score += 25;
      tokensInNameCount++;
    }
    if (category.includes(t)) {
      score += 20;
    }
    if (tag.includes(t)) {
      score += 15;
    }
    if (description.includes(t)) {
      score += 8;
    }
    if (Array.isArray(product.productParameters)) {
      for (const param of product.productParameters) {
        if (param?.name && String(param.name).toLowerCase().includes(t)) {
          score += 6;
        }
        if (Array.isArray(param?.selectedValues)) {
          for (const val of param.selectedValues) {
            if (val?.label && String(val.label).toLowerCase().includes(t)) {
              score += 6;
            }
          }
        }
      }
    }
  }

  if (tokensInNameCount === searchTokens.length && searchTokens.length > 1) {
    score += 40;
  }

  if (product.isBestseller) {
    score += 5;
  }

  return score;
}

// Get active products with category & search filtering + genuine review stats
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const filter = { active: 1 };

    if (category && category !== 'all') {
      const trimmedCategory = String(category).trim().slice(0, 100);
      const matchedCategoryDoc = await Category.findOne({
        slug: trimmedCategory.toLowerCase()
      });

      const effectiveCategoryName = matchedCategoryDoc ? matchedCategoryDoc.name : trimmedCategory;
      filter.category = new RegExp(`^${escapeRegex(effectiveCategoryName)}$`, 'i');
    }

    let cleanSearch = '';
    let searchTokens = [];
    if (search && typeof search === 'string') {
      cleanSearch = search.trim().slice(0, 100);
      if (cleanSearch) {
        searchTokens = cleanSearch
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => t.slice(0, 30));
      }
    }

    if (cleanSearch) {
      const fullRegex = new RegExp(escapeRegex(cleanSearch), 'i');

      const orClauses = [
        { name: fullRegex },
        { category: fullRegex },
        { tag: fullRegex },
        { description: fullRegex },
        { 'productParameters.name': fullRegex },
        { 'productParameters.selectedValues.label': fullRegex },
        { 'productParameters.selectedValues.value': fullRegex }
      ];

      searchTokens.forEach((token) => {
        const tokenRegex = new RegExp(escapeRegex(token), 'i');
        orClauses.push(
          { name: tokenRegex },
          { category: tokenRegex },
          { tag: tokenRegex },
          { description: tokenRegex },
          { 'productParameters.name': tokenRegex },
          { 'productParameters.selectedValues.label': tokenRegex },
          { 'productParameters.selectedValues.value': tokenRegex }
        );
      });

      filter.$or = orClauses;
    }

    const products = await Product.find(filter);

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

    // Sorting & Relevance ordering
    if (sort === 'low') {
      productsWithStats.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sort === 'high') {
      productsWithStats.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sort === 'name_asc') {
      productsWithStats.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sort === 'name_desc') {
      productsWithStats.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
    } else if (sort === 'newest') {
      productsWithStats.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (cleanSearch) {
      productsWithStats.sort((a, b) => {
        const scoreA = computeRelevanceScore(a, cleanSearch, searchTokens);
        const scoreB = computeRelevanceScore(b, cleanSearch, searchTokens);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    } else {
      productsWithStats.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

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
