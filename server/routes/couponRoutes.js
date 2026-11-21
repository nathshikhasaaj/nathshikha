import express from 'express';
import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

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

// Helper to verify if customer has previous valid order history
export async function isExistingCustomer({ customerEmail, customerPhone, userId, OrderModel = Order }) {
  if (!OrderModel) return false;

  const conditions = [];

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    conditions.push({ user_id: userId });
  }

  if (customerEmail && String(customerEmail).trim()) {
    const cleanEmail = String(customerEmail).trim().toLowerCase();
    conditions.push({ customer_email: cleanEmail });
    conditions.push({ email: cleanEmail });
    conditions.push({ 'customer.email': cleanEmail });
  }

  if (customerPhone && String(customerPhone).trim()) {
    const rawDigits = String(customerPhone).replace(/\D/g, '');
    const last10 = rawDigits.slice(-10);
    if (last10.length >= 10) {
      conditions.push({ phone: { $regex: last10 + '$' } });
      conditions.push({ customer_phone: { $regex: last10 + '$' } });
      conditions.push({ 'customer.phone': { $regex: last10 + '$' } });
    }
  }

  if (conditions.length === 0) {
    return false;
  }

  try {
    const existingOrder = await OrderModel.findOne({
      $or: conditions,
      is_deleted: { $ne: true },
      isDeleted: { $ne: true },
      order_status: { $ne: 'cancelled' },
      orderStatus: { $ne: 'cancelled' }
    });
    return Boolean(existingOrder);
  } catch (err) {
    console.warn('Error checking existing customer orders:', err.message);
    return false;
  }
}

// Calculate discount amount from eligible product subtotal & context
export function calculateCouponDiscount(coupon, subtotal, context = {}) {
  if (!coupon || subtotal <= 0) return 0;
  const { items = [] } = context;

  const couponType = coupon.couponType || 'general';

  // 1. Product-Specific Coupon
  if (couponType === 'product_specific' && coupon.applicableProductId) {
    const targetId = String(coupon.applicableProductId);
    const matchingItems = items.filter((it) => String(it.id || it.productId || it._id) === targetId);
    if (matchingItems.length === 0) return 0;

    const eligibleSubtotal = matchingItems.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    if (eligibleSubtotal <= 0) return 0;

    let discount = 0;
    if (coupon.discountType === 'percent') {
      discount = Math.round((eligibleSubtotal * Number(coupon.discountValue)) / 100);
    } else if (coupon.discountType === 'fixed') {
      discount = Math.min(Number(coupon.discountValue), eligibleSubtotal);
    }
    return Math.max(0, Math.min(discount, eligibleSubtotal));
  }

  // 2. Bulk Quantity Coupon
  if (couponType === 'bulk_quantity' && coupon.applicableProductId) {
    const targetId = String(coupon.applicableProductId);
    const matchingItems = items.filter((it) => String(it.id || it.productId || it._id) === targetId);
    if (matchingItems.length === 0) return 0;

    const totalQty = matchingItems.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    const minQty = Math.max(1, Number(coupon.minQuantity) || 1);
    if (totalQty < minQty) return 0;

    const unitPrice = Number(matchingItems[0].price) || 0;
    const unitsToDiscount = coupon.bulkApplyTo === 'excess_units'
      ? Math.max(0, totalQty - minQty)
      : totalQty;

    if (unitsToDiscount <= 0 || unitPrice <= 0) return 0;

    if (coupon.bulkPricingType === 'special_price') {
      const specialPrice = Number(coupon.specialPerPiecePrice) || 0;
      const discountPerPiece = Math.max(0, unitPrice - specialPrice);
      return discountPerPiece * unitsToDiscount;
    } else {
      // Standard percentage or fixed discount on bulk units
      const discountedSubtotal = unitPrice * unitsToDiscount;
      let discount = 0;
      if (coupon.discountType === 'percent') {
        discount = Math.round((discountedSubtotal * Number(coupon.discountValue)) / 100);
      } else if (coupon.discountType === 'fixed') {
        discount = Math.min(Number(coupon.discountValue), discountedSubtotal);
      }
      return Math.max(0, Math.min(discount, discountedSubtotal));
    }
  }

  // 3. Cart-Wide General Coupon (Default)
  let discount = 0;
  if (coupon.discountType === 'percent') {
    discount = Math.round((subtotal * Number(coupon.discountValue)) / 100);
  } else if (coupon.discountType === 'fixed') {
    discount = Math.min(Number(coupon.discountValue), subtotal);
  }

  // Ensure discount does not exceed product subtotal
  return Math.max(0, Math.min(discount, subtotal));
}

// Master Coupon Validator for Validate endpoint & Order Placement
export async function validateCoupon(coupon, {
  items = [],
  subtotal = 0,
  customerEmail = '',
  customerPhone = '',
  userId = null,
  OrderModel = Order
}) {
  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code.' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'This coupon is currently unavailable.' };
  }

  if (isCouponExpired(coupon.expiryDate)) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // 1. Existing Customer Eligibility Check
  if (coupon.customerEligibility === 'existing_customers_only') {
    if (!customerEmail && !customerPhone && !userId) {
      return {
        valid: false,
        error: 'Please enter your email or phone number in shipping details to verify eligibility for this existing customer coupon.'
      };
    }
    const isExisting = await isExistingCustomer({ customerEmail, customerPhone, userId, OrderModel });
    if (!isExisting) {
      return {
        valid: false,
        error: 'This exclusive coupon is valid only for existing Nathshikha customers with previous order history.'
      };
    }
  }

  // Resolve item prices and details from DB for security
  let resolvedItems = [];
  let calculatedSubtotal = 0;

  if (Array.isArray(items) && items.length > 0) {
    const validProductIds = items
      .map((i) => i.id || i.productId || i._id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    let productMap = new Map();
    if (validProductIds.length > 0) {
      const products = await Product.find({ _id: { $in: validProductIds } });
      productMap = new Map(products.map((p) => [p._id.toString(), p]));
    }

    for (const item of items) {
      const pId = String(item.id || item.productId || item._id);
      const p = productMap.get(pId);
      const unitPrice = p ? p.price : Number(item.price) || 0;
      const qty = Math.max(1, Number(item.qty) || 1);
      const name = p ? p.name : item.name || 'Product';

      resolvedItems.push({
        id: pId,
        productId: pId,
        name,
        price: unitPrice,
        qty
      });
      calculatedSubtotal += unitPrice * qty;
    }
  }

  const finalSubtotalForCalc = calculatedSubtotal > 0 ? calculatedSubtotal : subtotal;

  // 2. Product-Specific Coupon Checks
  const couponType = coupon.couponType || 'general';
  if (couponType === 'product_specific' && coupon.applicableProductId) {
    const targetId = String(coupon.applicableProductId);
    const matchingItems = resolvedItems.filter((it) => String(it.id || it.productId) === targetId);

    if (matchingItems.length === 0) {
      return {
        valid: false,
        error: `This coupon is valid only for "${coupon.applicableProductName || 'the selected product'}". Please add this product to your cart to use this coupon.`
      };
    }
  }

  // 3. Bulk Quantity Coupon Checks
  if (couponType === 'bulk_quantity' && coupon.applicableProductId) {
    const targetId = String(coupon.applicableProductId);
    const matchingItems = resolvedItems.filter((it) => String(it.id || it.productId) === targetId);
    const totalQty = matchingItems.reduce((sum, it) => sum + it.qty, 0);

    if (matchingItems.length === 0) {
      return {
        valid: false,
        error: `This bulk coupon is valid only for "${coupon.applicableProductName || 'the selected product'}". Please add this product to your cart.`
      };
    }

    const minQty = Math.max(1, Number(coupon.minQuantity) || 1);
    if (totalQty < minQty) {
      return {
        valid: false,
        error: `This coupon requires at least ${minQty} units of "${coupon.applicableProductName || 'this product'}" in your cart (currently ${totalQty}).`
      };
    }
  }

  // 4. Minimum Order Value Check
  if (coupon.minOrderValue > 0 && finalSubtotalForCalc < coupon.minOrderValue) {
    return {
      valid: false,
      error: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} is required to use this coupon.`
    };
  }

  // Calculate discount
  const discount = calculateCouponDiscount(coupon, finalSubtotalForCalc, { items: resolvedItems });

  if (discount <= 0) {
    return {
      valid: false,
      error: 'This coupon did not provide a discount for the eligible items in your cart.'
    };
  }

  return {
    valid: true,
    code: coupon.code,
    couponType: coupon.couponType || 'general',
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discount,
    minOrderValue: coupon.minOrderValue || 0,
    subtotal: finalSubtotalForCalc,
    finalSubtotal: Math.max(0, finalSubtotalForCalc - discount),
    applicableProductId: coupon.applicableProductId ? coupon.applicableProductId.toString() : null,
    applicableProductName: coupon.applicableProductName || '',
    coupon: {
      code: coupon.code,
      couponType: coupon.couponType || 'general',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      minOrderValue: coupon.minOrderValue || 0,
      applicableProductId: coupon.applicableProductId ? coupon.applicableProductId.toString() : null,
      applicableProductName: coupon.applicableProductName || ''
    },
    message: `${coupon.code} applied ✓`
  };
}

// Validate coupon against cart items & calculate discount
router.all('/validate', async (req, res) => {
  const code = req.body?.code || req.query?.code;
  const items = req.body?.items;
  const directOrderTotal = req.body?.subtotal !== undefined ? req.body.subtotal : req.query?.orderTotal;
  const customerEmail = req.body?.email || req.query?.email || '';
  const customerPhone = req.body?.phone || req.query?.phone || '';
  const userId = req.body?.userId || req.user?.id || null;

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

    const validation = await validateCoupon(coupon, {
      items,
      subtotal: Number(directOrderTotal) || 0,
      customerEmail,
      customerPhone,
      userId,
      OrderModel: Order
    });

    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    return res.json(validation);
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
    const items = req.body?.items || req.query?.items || [];
    const directSubtotal = req.body?.subtotal !== undefined ? req.body.subtotal : req.query?.subtotal;
    const customerEmail = req.body?.email || req.query?.email || '';
    const customerPhone = req.body?.phone || req.query?.phone || '';
    const userId = req.body?.userId || req.user?.id || null;

    let subtotal = 0;
    const resolvedItems = [];

    if (Array.isArray(items) && items.length > 0) {
      const validProductIds = items
        .map((i) => i.id || i.productId || i._id)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (validProductIds.length > 0) {
        const products = await Product.find({ _id: { $in: validProductIds } });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        for (const item of items) {
          const pId = String(item.id || item.productId || item._id);
          const p = productMap.get(pId);
          const price = p ? p.price : Number(item.price) || 0;
          const qty = Math.max(1, Number(item.qty) || 1);
          const name = p ? p.name : item.name || 'Product';

          resolvedItems.push({ id: pId, productId: pId, name, price, qty });
          subtotal += price * qty;
        }
      }
    } else if (directSubtotal !== undefined) {
      subtotal = Math.max(0, Number(directSubtotal) || 0);
    }

    // Only fetch active coupons that the admin marked as public for checkout list
    const coupons = await Coupon.find({ isActive: true, isPublic: { $ne: false } }).sort({ minOrderValue: 1, createdAt: -1 });

    const available = [];
    const unavailable = [];

    // Pre-evaluate existing customer status once if contact info provided
    let isExistingCust = null;
    if (customerEmail || customerPhone || userId) {
      isExistingCust = await isExistingCustomer({ customerEmail, customerPhone, userId, OrderModel: Order });
    }

    for (const c of coupons) {
      const isExpired = isCouponExpired(c.expiryDate);
      const isLimitReached = Boolean(c.usageLimit && c.usageCount >= c.usageLimit);
      const isMinMet = subtotal >= (c.minOrderValue || 0);

      const couponType = c.couponType || 'general';
      const targetId = c.applicableProductId ? c.applicableProductId.toString() : null;
      const matchingItems = targetId ? resolvedItems.filter((it) => String(it.id || it.productId) === targetId) : [];
      const totalMatchingQty = matchingItems.reduce((acc, it) => acc + it.qty, 0);

      // Label generation
      let label = c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue.toLocaleString('en-IN')} OFF`;
      if (couponType === 'bulk_quantity') {
        if (c.bulkPricingType === 'special_price') {
          label = `Special ₹${c.specialPerPiecePrice}/pc (Min. ${c.minQuantity} pcs)`;
        } else {
          label = `Bulk ${c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`} (Min. ${c.minQuantity} pcs)`;
        }
      } else if (couponType === 'product_specific') {
        label = `${c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`} on ${c.applicableProductName || 'Selected Product'}`;
      }

      const minOrderLabel = c.minOrderValue > 0
        ? `Minimum order ₹${c.minOrderValue.toLocaleString('en-IN')}`
        : 'No minimum order';

      // Check product eligibility
      let productEligibilityMet = true;
      let productUnmetReason = '';

      if (couponType === 'product_specific') {
        if (matchingItems.length === 0) {
          productEligibilityMet = false;
          productUnmetReason = `Add "${c.applicableProductName || 'designated product'}" to cart to unlock`;
        }
      } else if (couponType === 'bulk_quantity') {
        const minQty = Math.max(1, Number(c.minQuantity) || 1);
        if (matchingItems.length === 0) {
          productEligibilityMet = false;
          productUnmetReason = `Add at least ${minQty} of "${c.applicableProductName || 'designated product'}" to unlock`;
        } else if (totalMatchingQty < minQty) {
          productEligibilityMet = false;
          productUnmetReason = `Add ${minQty - totalMatchingQty} more of "${c.applicableProductName || 'this product'}" to unlock bulk price`;
        }
      }

      // Check customer eligibility
      let customerEligibilityMet = true;
      let customerUnmetReason = '';
      if (c.customerEligibility === 'existing_customers_only') {
        if (isExistingCust === false) {
          customerEligibilityMet = false;
          customerUnmetReason = 'Exclusive for existing customers with order history';
        } else if (isExistingCust === null) {
          // Contact info not entered yet
          customerEligibilityMet = false;
          customerUnmetReason = 'Enter your shipping details to verify existing customer offer';
        }
      }

      const discountAmount = calculateCouponDiscount(c, subtotal, { items: resolvedItems });
      const isEligible = !isExpired && !isLimitReached && isMinMet && productEligibilityMet && customerEligibilityMet && discountAmount > 0;

      if (isEligible) {
        available.push({
          id: c._id.toString(),
          code: c.code,
          couponType: c.couponType || 'general',
          discountType: c.discountType,
          discountValue: c.discountValue,
          discount: discountAmount,
          potentialDiscount: discountAmount,
          minOrderValue: c.minOrderValue || 0,
          description: c.description || '',
          expiryDate: c.expiryDate,
          label,
          minOrderLabel,
          applicableProductName: c.applicableProductName || ''
        });
      } else {
        let reason = 'Coupon not applicable';
        if (isExpired) {
          reason = 'Coupon expired';
        } else if (isLimitReached) {
          reason = 'Usage limit reached';
        } else if (!productEligibilityMet) {
          reason = productUnmetReason;
        } else if (!customerEligibilityMet) {
          reason = customerUnmetReason;
        } else if (!isMinMet) {
          const needed = (c.minOrderValue || 0) - subtotal;
          reason = `Add ₹${needed.toLocaleString('en-IN')} more to unlock (Min. ₹${c.minOrderValue.toLocaleString('en-IN')})`;
        }

        unavailable.push({
          id: c._id.toString(),
          code: c.code,
          couponType: c.couponType || 'general',
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderValue: c.minOrderValue || 0,
          description: c.description || '',
          expiryDate: c.expiryDate,
          label,
          minOrderLabel,
          reason,
          applicableProductName: c.applicableProductName || ''
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
