import express from 'express';
import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';

const router = express.Router();

// Helper to check if a coupon is expired
export function isCouponExpired(expiryDate) {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  // Set to end of the expiry day (23:59:59.999) in current context if time is midnight
  if (exp.getHours() === 0 && exp.getMinutes() === 0 && exp.getSeconds() === 0) {
    exp.setHours(23, 59, 59, 999);
  }
  return exp.getTime() < Date.now();
}

// Calculate discount amount from eligible product subtotal
export function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon || subtotal <= 0) return 0;
  let discount = 0;

  if (coupon.discountType === 'percent') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
  } else if (coupon.discountType === 'fixed') {
    discount = Math.min(Number(coupon.discountValue), subtotal);
  }

  // Ensure discount does not exceed product subtotal
  return Math.max(0, Math.min(discount, subtotal));
}

// Validate coupon against cart items & calculate discount
router.all('/validate', async (req, res) => {
  const code = req.body?.code || req.query?.code;
  const items = req.body?.items;
  const directOrderTotal = req.body?.subtotal !== undefined ? req.body.subtotal : req.query?.orderTotal;

  if (!code || !String(code).trim()) {
    return res.status(400).json({
      valid: false,
      error: 'Please enter a coupon code.'
    });
  }

  const normalizedCode = String(code).trim().toUpperCase();

  try {
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid coupon code.'
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon is currently unavailable.'
      });
    }

    if (isCouponExpired(coupon.expiryDate)) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon has expired.'
      });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        error: 'This coupon has reached its usage limit.'
      });
    }

    // Calculate cart subtotal from database product prices
    let subtotal = 0;
    if (Array.isArray(items) && items.length > 0) {
      const validProductIds = items
        .map((i) => i.id || i.productId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (validProductIds.length > 0) {
        const products = await Product.find({
          _id: { $in: validProductIds },
          active: 1
        });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        for (const item of items) {
          const pId = String(item.id || item.productId);
          const p = productMap.get(pId);
          if (!p) continue;
          const qty = Math.max(1, Number(item.qty) || 1);
          subtotal += p.price * qty;
        }
      }
    } else if (directOrderTotal !== undefined) {
      subtotal = Math.max(0, Number(directOrderTotal) || 0);
    }

    // Validate Minimum Order Value
    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString(
          'en-IN'
        )} is required to use this coupon.`
      });
    }

    // Calculate discount amount
    const discount = calculateCouponDiscount(coupon, subtotal);
    const finalSubtotal = Math.max(0, subtotal - discount);

    return res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      minOrderValue: coupon.minOrderValue,
      subtotal,
      finalSubtotal,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        minOrderValue: coupon.minOrderValue
      },
      message: `${coupon.code} applied ✓`
    });
  } catch (err) {
    return res.status(500).json({
      valid: false,
      error: err.message || 'Failed to validate coupon.'
    });
  }
});

// Fetch Available & Eligible Coupons for cart/order
router.all(['/available', '/eligible'], async (req, res) => {
  try {
    const items = req.body?.items || req.query?.items;
    const directSubtotal = req.body?.subtotal !== undefined ? req.body.subtotal : req.query?.subtotal;

    let subtotal = 0;
    if (Array.isArray(items) && items.length > 0) {
      const validProductIds = items
        .map((i) => i.id || i.productId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (validProductIds.length > 0) {
        const products = await Product.find({
          _id: { $in: validProductIds },
          active: 1
        });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        for (const item of items) {
          const pId = String(item.id || item.productId);
          const p = productMap.get(pId);
          if (!p) continue;
          const qty = Math.max(1, Number(item.qty) || 1);
          subtotal += p.price * qty;
        }
      }
    } else if (directSubtotal !== undefined) {
      subtotal = Math.max(0, Number(directSubtotal) || 0);
    }

    // Fetch all active coupons from DB
    const coupons = await Coupon.find({ isActive: true }).sort({ minOrderValue: 1, createdAt: -1 });

    const available = [];
    const unavailable = [];

    for (const c of coupons) {
      const isExpired = isCouponExpired(c.expiryDate);
      const isLimitReached = Boolean(c.usageLimit && c.usageCount >= c.usageLimit);
      const isMinMet = subtotal >= (c.minOrderValue || 0);

      const discountAmount = calculateCouponDiscount(c, subtotal);
      const label = c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue.toLocaleString('en-IN')} OFF`;
      const minOrderLabel = c.minOrderValue > 0
        ? `Minimum order ₹${c.minOrderValue.toLocaleString('en-IN')}`
        : 'No minimum order';

      if (!isExpired && !isLimitReached && isMinMet) {
        available.push({
          id: c._id.toString(),
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          discount: discountAmount,
          potentialDiscount: discountAmount,
          minOrderValue: c.minOrderValue || 0,
          description: c.description || '',
          expiryDate: c.expiryDate,
          label,
          minOrderLabel
        });
      } else {
        let reason = 'Coupon not applicable';
        if (isExpired) {
          reason = 'Coupon expired';
        } else if (isLimitReached) {
          reason = 'Usage limit reached';
        } else if (!isMinMet) {
          const needed = (c.minOrderValue || 0) - subtotal;
          reason = `Add ₹${needed.toLocaleString('en-IN')} more to unlock (Min. ₹${c.minOrderValue.toLocaleString('en-IN')})`;
        }

        unavailable.push({
          id: c._id.toString(),
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderValue: c.minOrderValue || 0,
          description: c.description || '',
          expiryDate: c.expiryDate,
          label,
          minOrderLabel,
          reason
        });
      }
    }

    return res.json({
      ok: true,
      subtotal,
      available,
      unavailable,
      count: available.length
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to fetch available coupons.'
    });
  }
});

export default router;
