import express from 'express';
import mongoose from 'mongoose';
import { Category, slugify } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { auth, admin } from '../middleware/auth.js';

const router = express.Router();

function escapeRegex(text) {
  return String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Migration & Initialization Helper:
 * Ensures all existing categories in products and core catalogue exist as Category documents.
 */
export async function ensureDefaultCategories() {
  try {
    const defaultCatalogNames = [
      'Nath',
      'Thushi',
      'Kolhapuri Saaj',
      'Tanmani',
      'Pearl',
      'Traditional',
      'Signature',
      'Mangalsutra',
      'Bugadi',
      'Chinchpeti',
      'Bormal',
      'Earrings',
      'Necklace',
      'Bangles',
      'Accessories',
      'Other'
    ];

    // Get all distinct category strings currently stored on products
    const productCategories = await Product.distinct('category');
    const allNamesToEnsure = Array.from(
      new Set(
        [...productCategories, ...defaultCatalogNames]
          .map((c) => String(c || '').trim())
          .filter(Boolean)
      )
    );

    const existingCategories = await Category.find();
    const existingNamesLower = new Set(existingCategories.map((c) => c.name.toLowerCase().trim()));
    const existingSlugs = new Set(existingCategories.map((c) => c.slug.toLowerCase().trim()));

    let nextOrder = existingCategories.length > 0
      ? Math.max(...existingCategories.map((c) => c.displayOrder || 0)) + 1
      : 1;

    const toInsert = [];
    for (const name of allNamesToEnsure) {
      if (!existingNamesLower.has(name.toLowerCase())) {
        let baseSlug = slugify(name) || 'category';
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (existingSlugs.has(uniqueSlug)) {
          uniqueSlug = `${baseSlug}-${counter++}`;
        }
        existingSlugs.add(uniqueSlug);
        existingNamesLower.add(name.toLowerCase());

        toInsert.push({
          name,
          slug: uniqueSlug,
          isActive: true,
          displayOrder: nextOrder++
        });
      }
    }

    if (toInsert.length > 0) {
      await Category.insertMany(toInsert);
      console.log(`✓ Synchronized ${toInsert.length} initial categories in database.`);
    }
  } catch (err) {
    console.error('Error in ensureDefaultCategories:', err.message);
  }
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/categories
 * Returns active categories for customer-facing navigation & filters
 * Sorted by displayOrder: 1, name: 1
 * Includes productCount of active products
 */
router.get('/', async (req, res, next) => {
  // If request contains admin query or header for admin all categories, forward to admin handler
  if (req.query.admin === 'true') {
    return next();
  }

  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });

    // Aggregate active product counts
    const activeProductCounts = await Product.aggregate([
      { $match: { active: 1 } },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
    ]);

    const countMap = {};
    activeProductCounts.forEach((item) => {
      if (item._id) countMap[item._id] = item.count;
    });

    const results = categories.map((cat) => {
      const json = cat.toJSON ? cat.toJSON() : cat;
      const key = (cat.name || '').toLowerCase().trim();
      return {
        ...json,
        productCount: countMap[key] || 0
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories' });
  }
});

// ============================================================================
// ADMIN ROUTES (Requires Authentication & Admin Role)
// ============================================================================

const handleAdminGetAll = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });

    // Aggregate total product counts across catalogue
    const totalProductCounts = await Product.aggregate([
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
    ]);

    const countMap = {};
    totalProductCounts.forEach((item) => {
      if (item._id) countMap[item._id] = item.count;
    });

    const results = categories.map((cat) => {
      const json = cat.toJSON ? cat.toJSON() : cat;
      const key = (cat.name || '').toLowerCase().trim();
      return {
        ...json,
        productCount: countMap[key] || 0
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin categories' });
  }
};

const handleAdminCreate = async (req, res) => {
  try {
    const { name, slug, isActive, displayOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const trimmedName = name.trim();
    // Sanitize against HTML/script tags
    if (/<[a-z][\s\S]*>/i.test(trimmedName)) {
      return res.status(400).json({ error: 'Category name contains invalid characters or markup.' });
    }

    // Check duplicate category name (case-insensitive)
    const existingByName = await Category.findOne({
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i')
    });
    if (existingByName) {
      return res.status(400).json({ error: `A category named "${trimmedName}" already exists.` });
    }

    // Compute and sanitize slug
    const candidateSlug = slugify(slug || trimmedName);
    if (!candidateSlug) {
      return res.status(400).json({ error: 'A valid URL-safe slug is required.' });
    }

    // Check duplicate slug
    const existingBySlug = await Category.findOne({ slug: candidateSlug });
    if (existingBySlug) {
      return res.status(400).json({ error: `The slug "${candidateSlug}" is already in use by another category.` });
    }

    let parsedOrder = 0;
    if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
      parsedOrder = Number(displayOrder);
      if (Number.isNaN(parsedOrder)) parsedOrder = 0;
    } else {
      // Auto-assign next display order
      const highest = await Category.findOne().sort({ displayOrder: -1 });
      parsedOrder = highest ? (highest.displayOrder || 0) + 1 : 1;
    }

    const newCategory = await Category.create({
      name: trimmedName,
      slug: candidateSlug,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: parsedOrder
    });

    res.status(201).json({
      ...newCategory.toJSON(),
      productCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create category' });
  }
};

const handleAdminUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, slug, isActive, displayOrder } = req.body;
    const oldName = category.name;

    // 1. Check Name Update
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Category name cannot be empty.' });
      }
      if (/<[a-z][\s\S]*>/i.test(trimmedName)) {
        return res.status(400).json({ error: 'Category name contains invalid characters or markup.' });
      }

      if (trimmedName.toLowerCase() !== category.name.toLowerCase()) {
        const duplicateName = await Category.findOne({
          _id: { $ne: id },
          name: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i')
        });
        if (duplicateName) {
          return res.status(400).json({ error: `A category named "${trimmedName}" already exists.` });
        }
      }
      category.name = trimmedName;
    }

    // 2. Check Slug Update
    if (slug !== undefined) {
      const candidateSlug = slugify(slug || category.name);
      if (!candidateSlug) {
        return res.status(400).json({ error: 'A valid URL-safe slug is required.' });
      }
      if (candidateSlug !== category.slug) {
        const duplicateSlug = await Category.findOne({
          _id: { $ne: id },
          slug: candidateSlug
        });
        if (duplicateSlug) {
          return res.status(400).json({ error: `The slug "${candidateSlug}" is already in use by another category.` });
        }
        category.slug = candidateSlug;
      }
    }

    // 3. Check isActive Update
    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    // 4. Check displayOrder Update
    if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
      const parsedOrder = Number(displayOrder);
      if (!Number.isNaN(parsedOrder)) {
        category.displayOrder = parsedOrder;
      }
    }

    await category.save();

    // 5. If category name changed, cascade update existing products!
    if (name !== undefined && oldName !== category.name) {
      const cascadeResult = await Product.updateMany(
        { category: new RegExp(`^${escapeRegex(oldName)}$`, 'i') },
        { category: category.name }
      );
      console.log(`✓ Cascade renamed category "${oldName}" -> "${category.name}" on ${cascadeResult.modifiedCount} product(s).`);
    }

    // Get current product count
    const productCount = await Product.countDocuments({
      category: new RegExp(`^${escapeRegex(category.name)}$`, 'i')
    });

    res.json({
      ...category.toJSON(),
      productCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update category' });
  }
};

const handleAdminStatusToggle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !category.isActive;
    await category.save();

    const productCount = await Product.countDocuments({
      category: new RegExp(`^${escapeRegex(category.name)}$`, 'i')
    });

    res.json({
      ...category.toJSON(),
      productCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to toggle category status' });
  }
};

const handleAdminReassign = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetCategoryId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(targetCategoryId)) {
      return res.status(400).json({ error: 'Invalid source or target category ID.' });
    }

    if (String(id) === String(targetCategoryId)) {
      return res.status(400).json({ error: 'Cannot reassign products to the same category.' });
    }

    const sourceCategory = await Category.findById(id);
    if (!sourceCategory) {
      return res.status(404).json({ error: 'Source category not found.' });
    }

    const targetCategory = await Category.findById(targetCategoryId);
    if (!targetCategory) {
      return res.status(404).json({ error: 'Target category not found.' });
    }

    const updateRes = await Product.updateMany(
      { category: new RegExp(`^${escapeRegex(sourceCategory.name)}$`, 'i') },
      { category: targetCategory.name }
    );

    res.json({
      ok: true,
      message: `Successfully reassigned ${updateRes.modifiedCount} products from "${sourceCategory.name}" to "${targetCategory.name}".`,
      reassignedCount: updateRes.modifiedCount,
      sourceCategoryId: sourceCategory.id,
      targetCategoryId: targetCategory.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to reassign products' });
  }
};

const handleAdminDelete = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check how many products belong to this category
    const productCount = await Product.countDocuments({
      category: new RegExp(`^${escapeRegex(category.name)}$`, 'i')
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: `This category contains ${productCount} product(s). Please reassign these products before deleting the category.`,
        productCount,
        categoryName: category.name
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({
      ok: true,
      message: `Category "${category.name}" has been permanently deleted.`,
      deletedId: id
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete category' });
  }
};

// Admin route bindings (Support both /api/categories/admin/... and /api/admin/categories/...)
router.get(['/admin/all', '/all'], auth, admin, handleAdminGetAll);
router.post(['/admin', '/'], auth, admin, handleAdminCreate);
router.patch(['/admin/:id/status', '/:id/status'], auth, admin, handleAdminStatusToggle);
router.post(['/admin/:id/reassign', '/:id/reassign'], auth, admin, handleAdminReassign);
router.patch(['/admin/:id', '/:id'], auth, admin, handleAdminUpdate);
router.delete(['/admin/:id', '/:id'], auth, admin, handleAdminDelete);

export default router;
