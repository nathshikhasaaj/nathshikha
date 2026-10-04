import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Coupon } from '../models/Coupon.js';
import { Review } from '../models/Review.js';
import { ReviewToken } from '../models/ReviewToken.js';
import { ShipmentGroup } from '../models/ShipmentGroup.js';
import { EmailEvent } from '../models/EmailEvent.js';
import { auth, admin } from '../middleware/auth.js';
import { calculateShippingCharge } from '../services/shippingService.js';
import { isCouponExpired, calculateCouponDiscount } from './couponRoutes.js';
import { applyWatermark } from '../services/watermarkService.js';
import {
  sendOrderConfirmedEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendCancellationApprovedEmail,
  sendRefundCompletedEmail,
  sendAdminTestEmail,
  sendAssistedOrderEmail,
  sendOrderPlacedEmail,
  resendOrderEmail
} from '../services/emailService.js';

import { uploadSingle, uploadMultiple, uploadsDir } from '../middleware/uploadMiddleware.js';
import { isValidEmail, isValidPhone, isValidPincode } from '../middleware/securityMiddleware.js';
import { generateOrderNo } from '../services/orderIdService.js';

const router = express.Router();

// Apply auth and admin check to all admin routes
router.use(auth, admin);

// Get all catalogue products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ active: -1, createdAt: -1, _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin products' });
  }
});

// Upload product image with automatic Nathshikha logo watermark
router.post('/upload', uploadSingle(['image', 'photo', 'file']), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'Please select a valid image file (JPG, PNG, WEBP, GIF, HEIC, AVIF).' });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const target = path.join(uploadsDir, filename);

  try {
    // Deep image validation and watermarking via Sharp
    let watermarkedBuffer;
    try {
      watermarkedBuffer = await applyWatermark(req.file.path, {
        position: 'center',
        scale: 0.54,
        opacity: 0.30,
        quality: 92
      });
    } catch (wmErr) {
      console.warn('Watermark fallback - saving original optimized image:', wmErr.message);
      // Fallback: optimize image without watermark if custom buffer failed
      const sharp = (await import('sharp')).default;
      watermarkedBuffer = await sharp(req.file.path)
        .rotate()
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
    }

    await fs.promises.writeFile(target, watermarkedBuffer);

    // Clean up temporary uploaded file
    if (fs.existsSync(req.file.path) && req.file.path !== target) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Failed to process uploaded image:', err.message);
    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ error: 'Invalid or unsupported image file. Please upload a valid JPG, PNG, WEBP, or HEIC image.' });
  }
});

// Upload multiple product images with automatic Nathshikha logo watermark
router.post('/upload-multiple', uploadMultiple(['images', 'photos', 'files'], 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Please select at least one valid image file.' });
  }

  const uploadedUrls = [];
  const errors = [];

  for (const file of req.files) {
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
    const target = path.join(uploadsDir, filename);

    try {
      let watermarkedBuffer;
      try {
        watermarkedBuffer = await applyWatermark(file.path, {
          position: 'center',
          scale: 0.54,
          opacity: 0.30,
          quality: 92
        });
      } catch (wmErr) {
        console.warn(`Watermark fallback for ${file.originalname}:`, wmErr.message);
        const sharp = (await import('sharp')).default;
        watermarkedBuffer = await sharp(file.path)
          .rotate()
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
      }

      await fs.promises.writeFile(target, watermarkedBuffer);
      uploadedUrls.push(`/uploads/${filename}`);

      if (fs.existsSync(file.path) && file.path !== target) {
        await fs.promises.unlink(file.path).catch(() => {});
      }
    } catch (err) {
      console.error(`Failed to process image ${file.originalname}:`, err.message);
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path).catch(() => {});
      }
      errors.push(`Failed to process ${file.originalname}`);
    }
  }

  if (uploadedUrls.length === 0) {
    return res.status(400).json({ error: errors.join(', ') || 'Failed to process images.' });
  }

  res.json({
    urls: uploadedUrls,
    url: uploadedUrls[0],
    count: uploadedUrls.length
  });
});

// Helper to sanitize product parameters
function sanitizeProductParameters(rawParams) {
  if (!Array.isArray(rawParams)) return [];
  return rawParams
    .filter((param) => param && (param.parameterId || (param.name && String(param.name).trim())))
    .map((param) => {
      const selectedValues = Array.isArray(param.selectedValues)
        ? param.selectedValues
            .filter((v) => v && (v.valueId || v.value || v.label))
            .map((v) => ({
              valueId: String(v.valueId || v._id || v.value || v.label).trim(),
              label: String(v.label || v.value || '').trim(),
              value: String(v.value || v.label || '').trim(),
              colorCode: v.colorCode ? String(v.colorCode).trim() : null,
              inStock: v.inStock !== undefined ? Boolean(v.inStock) : true
            }))
        : [];

      const selectedValueIds = Array.isArray(param.selectedValueIds) && param.selectedValueIds.length > 0
        ? param.selectedValueIds.map((id) => String(id).trim())
        : selectedValues.map((v) => v.valueId);

      const isTextType = param.displayType === 'text' || param.displayType === 'textbox';
      const effectiveSelectedValues = selectedValues.length > 0
        ? selectedValues
        : (isTextType
            ? [{ valueId: 'custom_text', label: 'Custom Name / Text', value: 'custom_text', inStock: true }]
            : []);

      const effectiveSelectedValueIds = selectedValueIds.length > 0
        ? selectedValueIds
        : (isTextType ? ['custom_text'] : effectiveSelectedValues.map((v) => v.valueId));

      return {
        parameterId: param.parameterId && mongoose.Types.ObjectId.isValid(param.parameterId)
          ? param.parameterId
          : new mongoose.Types.ObjectId(),
        name: String(param.name || '').trim(),
        displayType: ['buttons', 'dropdown', 'color', 'text', 'textbox'].includes(param.displayType)
          ? param.displayType
          : 'buttons',
        selectionMode: ['single', 'multiple'].includes(param.selectionMode)
          ? param.selectionMode
          : 'single',
        required: param.required !== undefined ? Boolean(param.required) : true,
        selectedValueIds: effectiveSelectedValueIds,
        selectedValues: effectiveSelectedValues
      };
    });
}

// Create product
router.post('/products', async (req, res) => {
  const {
    name,
    price,
    category,
    tag,
    img,
    images,
    description,
    productParameters,
    parameters,
    stock,
    isBestseller
  } = req.body;

  const normalizedImages = Array.isArray(images) && images.length > 0
    ? images.filter(Boolean)
    : (img ? [img.trim()] : []);

  const primaryImg = img?.trim() || normalizedImages[0];

  if (!name || !price || !primaryImg) {
    return res
      .status(400)
      .json({ error: 'Name, price, and at least one image are required' });
  }

  try {
    const cleanParams = sanitizeProductParameters(productParameters || parameters);

    const product = await Product.create({
      name: name.trim(),
      price: Number(price),
      category: category ? category.trim() : 'Traditional',
      tag: tag || (isBestseller ? 'BESTSELLER' : 'NEW'),
      img: primaryImg,
      images: normalizedImages.length > 0 ? normalizedImages : [primaryImg],
      description: description || '',
      productParameters: cleanParams,
      stock: Number(stock !== undefined ? stock : 10),
      active: 1,
      isBestseller: Boolean(isBestseller || tag === 'BESTSELLER')
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// Update product
router.patch('/products/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const updateData = { ...req.body };
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.active !== undefined) updateData.active = Number(updateData.active);
    if (updateData.isBestseller !== undefined) updateData.isBestseller = Boolean(updateData.isBestseller);
    if (updateData.category !== undefined) updateData.category = String(updateData.category || 'Traditional').trim();

    if (updateData.productParameters !== undefined || updateData.parameters !== undefined) {
      updateData.productParameters = sanitizeProductParameters(updateData.productParameters || updateData.parameters);
      delete updateData.parameters;
    }

    if (Array.isArray(updateData.images)) {
      updateData.images = updateData.images.filter(Boolean);
      if (updateData.images.length > 0 && !updateData.img) {
        updateData.img = updateData.images[0];
      }
    } else if (updateData.img && (!updateData.images || updateData.images.length === 0)) {
      updateData.images = [updateData.img];
    }

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// Quick Toggle Bestseller status
router.patch('/products/:id/toggle-bestseller', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.isBestseller = !product.isBestseller;
    if (product.isBestseller && (!product.tag || product.tag === 'NEW')) {
      product.tag = 'BESTSELLER';
    } else if (!product.isBestseller && product.tag === 'BESTSELLER') {
      product.tag = 'NEW';
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to toggle bestseller' });
  }
});

// Delete product permanently from database
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ ok: true, message: 'Product deleted permanently from database', product });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// Get all active orders with shipment group mapping (Excludes soft-deleted orders)
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1, _id: -1 }).lean();

    // Map co-shipped orders for each order with shipmentGroupCode
    const groupCodeMap = new Map();
    for (const o of orders) {
      if (o.shipmentGroupCode) {
        if (!groupCodeMap.has(o.shipmentGroupCode)) {
          groupCodeMap.set(o.shipmentGroupCode, []);
        }
        groupCodeMap.get(o.shipmentGroupCode).push(o.orderNo);
      }
    }

    res.json(
      orders.map((o) => {
        const coOrders = o.shipmentGroupCode ? (groupCodeMap.get(o.shipmentGroupCode) || []).filter((no) => no !== o.orderNo) : [];
        const isGiftItem = (i) => i && (i.itemType === 'free_gift' || i.item_type === 'free_gift' || i.name === 'Free Complimentary Gift');
        let orderItems = Array.isArray(o.items) ? o.items.map((i) => ({ ...i, item_type: i.itemType || 'product', itemType: i.itemType || 'product' })) : [];
        if (Boolean(o.freeGift?.included) && !orderItems.some(isGiftItem)) {
          orderItems = [...orderItems, {
            name: 'Free Complimentary Gift',
            price: 0,
            qty: 1,
            img: '',
            itemType: 'free_gift',
            item_type: 'free_gift',
            selectedParameters: {},
            selectedOptions: {}
          }];
        }

        return {
          ...o,
          id: o._id.toString(),
          order_no: o.orderNo,
          shipment_group_id: o.shipmentGroupId ? o.shipmentGroupId.toString() : null,
          shipment_group_code: o.shipmentGroupCode || null,
          co_shipped_orders: coOrders,
          items: orderItems,
          pincode: o.pincode,
          city: o.city,
          state: o.state,
          shipping_method: o.shippingMethod,
          coupon_code: o.couponCode,
          coupon_discount: o.couponDiscount || 0,
          shipping_charge: o.shipping,
          payment_method: o.paymentMethod,
          payment_status: o.paymentStatus,
          order_status: o.orderStatus,
          cancellation_status: o.cancellationStatus || 'no_cancellation',
          cancellation_reason: o.cancellationReason || null,
          cancellation_requested_at: o.cancellationRequestedAt || null,
          cancellation_approved_at: o.cancellationApprovedAt || null,
          cancellation_rejected_at: o.cancellationRejectedAt || null,
          cancellation_charge: o.cancellationCharge || 0,
          refund_amount: o.refundAmount || 0,
          refund_status: o.refundStatus || 'none',
          refund_processed_at: o.refundProcessedAt || null,
          refund_processed_by: o.refundProcessedBy || null,
          cancellation_admin_notes: o.cancellationAdminNotes || null,
          customization: o.customization || {
            requested: false,
            details: null,
            reference_image: null,
            referenceImage: null,
            requested_at: null,
            requestedAt: null
          },
          shipment_partner: o.shipmentPartner,
          tracking_id: o.trackingId,
          shipped_at: o.shippedAt,
          delivered_at: o.deliveredAt,
          payment_transaction_id: o.paymentTransactionId || o.upiUtr,
          payment_app: o.paymentApp,
          verified_at: o.verifiedAt,
          verified_by: o.verifiedBy,
          confirmed_at: o.confirmedAt || (o.orderStatus === 'confirmed' || o.paymentStatus === 'verified' ? o.verifiedAt : null),
          confirmedAt: o.confirmedAt || (o.orderStatus === 'confirmed' || o.paymentStatus === 'verified' ? o.verifiedAt : null),
          expected_delivery_date: o.expectedDeliveryDate || (o.confirmedAt || o.verifiedAt ? new Date(new Date(o.confirmedAt || o.verifiedAt).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString() : null),
          expectedDeliveryDate: o.expectedDeliveryDate || (o.confirmedAt || o.verifiedAt ? new Date(new Date(o.confirmedAt || o.verifiedAt).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString() : null),
          free_gift: { included: Boolean(o.freeGift?.included) },
          freeGift: { included: Boolean(o.freeGift?.included) },
          created_at: o.createdAt
        };
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin orders' });
  }
});

// Get all shipment groups with their member orders
router.get('/shipment-groups', async (req, res) => {
  try {
    const groups = await ShipmentGroup.find()
      .populate('orders')
      .sort({ createdAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch shipment groups' });
  }
});

// Search existing registered customers & past buyers by Name, Email, or Phone
router.get('/customers/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const cleanDigits = q.replace(/\D/g, '');

    let userQuery = {};
    if (q) {
      const escapeRegexStr = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegexStr(q), 'i');
      const conditions = [{ name: regex }, { email: regex }];
      if (cleanDigits.length >= 3) {
        conditions.push({ phone: new RegExp(escapeRegexStr(cleanDigits)) });
      }
      userQuery = { $or: conditions };
    }

    const users = await User.find(userQuery)
      .select('name email phone role defaultAddress giftAddresses')
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const seenEmails = new Set(users.map((u) => u.email?.toLowerCase()).filter(Boolean));
    const customerList = users.map((u) => ({
      userId: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      defaultAddress: u.defaultAddress || null,
      giftAddresses: u.giftAddresses || [],
      source: 'registered'
    }));

    // If search term provided and fewer than 20 results, also search recent distinct order customers
    if (q && customerList.length < 20) {
      const escapeRegexStr = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegexStr(q), 'i');
      const orderConds = [{ name: regex }, { email: regex }, { customerName: regex }, { customerEmail: regex }];
      if (cleanDigits.length >= 3) {
        orderConds.push({ phone: new RegExp(escapeRegexStr(cleanDigits)) }, { customerPhone: new RegExp(escapeRegexStr(cleanDigits)) });
      }

      const pastOrders = await Order.find({ $or: orderConds, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      for (const po of pastOrders) {
        const poEmail = (po.customerEmail || po.email || '').toLowerCase().trim();
        if (poEmail && !seenEmails.has(poEmail)) {
          seenEmails.add(poEmail);
          customerList.push({
            userId: po.userId ? po.userId.toString() : null,
            name: po.customerName || po.name,
            email: poEmail,
            phone: po.customerPhone || po.phone || '',
            defaultAddress: {
              recipientName: po.name,
              recipientPhone: po.phone,
              addressLine1: po.address,
              city: po.city || '',
              state: po.state || '',
              pincode: po.pincode || ''
            },
            giftAddresses: [],
            source: 'past_orders'
          });
        }
      }
    }

    res.json(customerList);
  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search customers' });
  }
});

// Admin: Create Assisted Order (Saves in PAYMENT_PENDING state, calculates totals server-side, reserves stock)
router.post('/orders/assisted', async (req, res) => {
  const {
    userId,
    name,
    phone,
    email,
    address,
    pincode,
    city,
    state,
    shippingMethod = 'Standard Delivery',
    items,
    couponCode,
    isGift,
    giftWrap,
    gift_wrap,
    handwrittenNote,
    handwritten_note,
    recipientName,
    recipientPhone,
    adminNotes,
    notes
  } = req.body;

  // 1. Validate Customer & Shipping Information
  const rawName = String(name || '').trim().slice(0, 100);
  if (!rawName) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const rawPhone = String(phone || '').trim();
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  const cleanPhone = cleanPhoneDigits.length === 10 ? cleanPhoneDigits : cleanPhoneDigits.slice(-10);

  const rawEmail = String(email || '').trim().toLowerCase().slice(0, 120);
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const rawAddress = String(address || '').trim().slice(0, 500);
  if (!rawAddress) {
    return res.status(400).json({ error: 'Complete delivery address is required.' });
  }

  const rawPincode = String(pincode || '').trim();
  if (!rawPincode || !isValidPincode(rawPincode)) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit delivery PIN code.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please add at least one product item to the order.' });
  }

  let incrementedCouponId = null;
  const appliedStockDeductions = [];

  try {
    // 2. Validate Items & Stock
    const validProductIds = items
      .map((i) => (i.productId || i.id || i._id)?.toString())
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (validProductIds.length !== items.length) {
      return res.status(400).json({ error: 'One or more items have invalid product IDs.' });
    }

    const catalogProducts = await Product.find({ _id: { $in: validProductIds } });
    const catalogMap = new Map(catalogProducts.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const normalizedItems = [];

    // Aggregate requested quantity per product ID
    const productTotalQtyMap = new Map();
    for (const item of items) {
      const pId = (item.productId || item.id || item._id)?.toString();
      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        return res.status(400).json({ error: 'Item quantity must be between 1 and 100.' });
      }
      productTotalQtyMap.set(pId, (productTotalQtyMap.get(pId) || 0) + qty);
    }

    // Check stock availability
    for (const [pId, totalRequestedQty] of productTotalQtyMap.entries()) {
      const p = catalogMap.get(pId);
      if (!p) {
        return res.status(400).json({ error: `Product ID "${pId}" not found in catalogue.` });
      }
      if (p.stock < totalRequestedQty) {
        return res.status(400).json({
          error: `Insufficient stock for "${p.name}". Available: ${p.stock}, Requested: ${totalRequestedQty}.`
        });
      }
    }

    for (const item of items) {
      const pId = (item.productId || item.id || item._id)?.toString();
      const p = catalogMap.get(pId);
      const qty = parseInt(item.qty, 10);
      const price = item.price !== undefined && !isNaN(Number(item.price)) && Number(item.price) >= 0
        ? Number(item.price)
        : p.price;

      const effectiveSelectedParams =
        (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
        (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});

      subtotal += price * qty;

      normalizedItems.push({
        productId: p._id,
        name: p.name,
        price,
        qty,
        img: p.img,
        selectedParameters: effectiveSelectedParams,
        selectedOptions: effectiveSelectedParams
      });
    }

    // 3. Atomically reserve stock
    for (const [pId, totalQty] of productTotalQtyMap.entries()) {
      const p = catalogMap.get(pId);
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: p._id, stock: { $gte: totalQty } },
        { $inc: { stock: -totalQty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback already deducted
        for (const deducted of appliedStockDeductions) {
          await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
        }
        return res.status(400).json({
          error: `Item "${p.name}" ran out of stock during assisted order creation. Please adjust items.`
        });
      }

      appliedStockDeductions.push({ productId: p._id, qty: totalQty });
    }

    // 4. Coupon Validation & Calculation
    let appliedCoupon = null;
    let couponDiscount = 0;

    if (couponCode && String(couponCode).trim()) {
      const normalizedCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: normalizedCode });

      if (!coupon) {
        throw new Error('Invalid coupon code.');
      }
      if (!coupon.isActive) {
        throw new Error('This coupon is currently inactive.');
      }
      if (isCouponExpired(coupon.expiryDate)) {
        throw new Error('This coupon has expired.');
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('This coupon has reached its usage limit.');
      }
      if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        throw new Error(`Minimum order value of ₹${coupon.minOrderValue} is required to use coupon "${coupon.code}".`);
      }

      couponDiscount = calculateCouponDiscount(coupon, subtotal);

      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          isActive: true,
          $expr: { $lt: ['$usageCount', '$usageLimit'] }
        },
        { $inc: { usageCount: 1 } },
        { new: true }
      );

      if (!updatedCoupon && coupon.usageLimit > 0) {
        throw new Error('This coupon has reached its usage limit.');
      }

      incrementedCouponId = coupon._id;
      appliedCoupon = updatedCoupon || coupon;
    }

    // 5. Server-Side Shipping & Location Calculation
    let shippingDetails;
    try {
      shippingDetails = await calculateShippingCharge(rawPincode, shippingMethod, subtotal);
    } catch (shippingErr) {
      throw new Error(shippingErr.message || 'Invalid delivery PIN code or shipping method.');
    }

    const shippingCharge = shippingDetails.shippingCharge;

    // 6. Gift Options Calculation
    const isGiftOrder = Boolean(isGift);
    const isGiftWrapRequested = isGiftOrder && Boolean(giftWrap || gift_wrap);
    const giftWrapCharge = isGiftWrapRequested ? 20 : 0;
    const rawNote = handwrittenNote !== undefined ? handwrittenNote : handwritten_note;
    const cleanNote = isGiftOrder && typeof rawNote === 'string' && rawNote.trim()
      ? rawNote.trim().slice(0, 1000)
      : null;

    const cleanRecipientName = isGiftOrder
      ? (recipientName ? String(recipientName).trim().slice(0, 100) : rawName)
      : null;
    const cleanRecipientPhone = isGiftOrder
      ? (recipientPhone ? String(recipientPhone).trim().replace(/\D/g, '').slice(-10) : cleanPhone)
      : null;

    // 7. Final Total Calculation (Server-Validated)
    const grandTotal = Math.max(0, subtotal - couponDiscount) + shippingCharge + giftWrapCharge;
    const orderNo = await generateOrderNo();
    const guestToken = crypto.randomBytes(24).toString('hex');

    // 8. Resolve or Link User Account
    let linkedUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    if (!linkedUserId) {
      const existingUser = await User.findOne({ email: rawEmail });
      if (existingUser) {
        linkedUserId = existingUser._id;
      }
    }

    const finalNotes = String(adminNotes || notes || '').trim();

    // 9. Create Order in PAYMENT_PENDING state
    const order = await Order.create({
      orderNo,
      userId: linkedUserId,
      name: isGiftOrder ? (cleanRecipientName || rawName) : rawName,
      phone: isGiftOrder ? (cleanRecipientPhone || cleanPhone) : cleanPhone,
      email: rawEmail,
      customerName: rawName,
      customerPhone: cleanPhone,
      customerEmail: rawEmail,
      recipientName: cleanRecipientName,
      recipientPhone: cleanRecipientPhone,
      address: rawAddress,
      pincode: shippingDetails.pincode,
      city: city ? String(city).trim() : shippingDetails.city,
      state: state ? String(state).trim() : shippingDetails.state,
      shippingMethod: shippingDetails.shippingMethodName,
      subtotal,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscount,
      shipping: shippingCharge,
      giftWrap: isGiftWrapRequested,
      giftWrapCharge,
      isGift: isGiftOrder,
      handwrittenNote: cleanNote,
      total: grandTotal,
      paymentMethod: 'upi',
      paymentStatus: 'pending',
      orderStatus: 'payment_pending',
      acceptedTerms: true,
      guestToken,
      assistedOrder: {
        isAssisted: true,
        createdBy: req.user?._id || req.user?.id || null,
        createdByName: req.user?.name || req.user?.email || 'Admin',
        sentToCustomer: true,
        sentAt: new Date(),
        lastEditedAt: new Date(),
        resendCount: 0
      },
      editHistory: [
        {
          editedAt: new Date(),
          editedBy: req.user?.name || req.user?.email || 'Admin',
          changedFields: ['Admin-Assisted Order Created & Sent to Customer'],
          notes: finalNotes || 'Order prepared by Nathshikha Team and sent to customer for review and payment.'
        }
      ],
      items: normalizedItems
    });

    // 10. Send Email Notification to Customer (Non-blocking)
    sendAssistedOrderEmail(order).catch((mailErr) => {
      console.error('[Admin] Failed to send assisted order email:', mailErr.message);
    });

    res.status(201).json({
      ok: true,
      success: true,
      message: `Assisted Order #${order.orderNo} created and sent to customer (${rawEmail}) successfully.`,
      order: order.toJSON()
    });
  } catch (err) {
    console.error('Failed to create assisted order:', err);

    // Rollback coupon count
    if (incrementedCouponId) {
      await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usageCount: -1 } }).catch(() => {});
    }

    // Rollback stock reservations
    for (const deducted of appliedStockDeductions) {
      await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
    }

    res.status(400).json({ error: err.message || 'Failed to create assisted order.' });
  }
});

// Admin: Resend Assisted Order to Customer
router.post('/orders/:id/resend-assisted', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const currentResendCount = order.assistedOrder?.resendCount || 0;
    order.assistedOrder = {
      ...(order.assistedOrder || {}),
      isAssisted: true,
      sentToCustomer: true,
      sentAt: new Date(),
      resendCount: currentResendCount + 1
    };

    if (!Array.isArray(order.editHistory)) {
      order.editHistory = [];
    }
    order.editHistory.push({
      editedAt: new Date(),
      editedBy: req.user?.name || req.user?.email || 'Admin',
      changedFields: [`Assisted Order Resent to Customer (Attempt #${currentResendCount + 1})`],
      notes: 'Admin resent payment-pending order notification to customer.'
    });

    await order.save();

    // Send email notification to customer
    sendAssistedOrderEmail(order).catch((mailErr) => {
      console.error('[Admin] Failed to resend assisted order email:', mailErr.message);
    });

    res.json({
      ok: true,
      success: true,
      message: `Assisted Order #${order.orderNo} resent to customer (${order.email}) successfully.`,
      order: order.toJSON()
    });
  } catch (err) {
    console.error('Failed to resend assisted order:', err);
    res.status(500).json({ error: err.message || 'Failed to resend order to customer.' });
  }
});

// Create manual order on behalf of customer (with 100% customer-order compatibility)
router.post('/orders', async (req, res) => {
  const {
    userId,
    name,
    phone,
    email,
    customerName,
    customerPhone,
    customerEmail,
    recipientName,
    recipientPhone,
    address,
    pincode,
    city,
    state,
    shippingMethod = 'Standard Delivery',
    items,
    couponCode,
    isGift,
    giftWrap,
    gift_wrap,
    giftWrapCharge,
    gift_wrap_charge,
    handwrittenNote,
    handwritten_note,
    customizationDetails,
    customization_details,
    customizationImage,
    customization_image,
    customization,
    paymentMethod = 'upi',
    paymentStatus = 'verification_pending',
    orderStatus,
    transactionId,
    paymentApp,
    adminNotes,
    notes
  } = req.body;

  const isGiftOrder = Boolean(isGift || req.body.gift?.isGift || req.body.is_gift);
  const rawName = String(name || '').trim().slice(0, 100);
  const rawCustomerName = String(customerName || req.body.customer_name || rawName).trim().slice(0, 100);
  const rawRecipientName = isGiftOrder
    ? String(recipientName || req.body.recipient_name || rawName).trim().slice(0, 100)
    : rawName;

  if (!rawName && !rawCustomerName && !rawRecipientName) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const effectiveDeliveryName = isGiftOrder ? (rawRecipientName || rawCustomerName || rawName) : (rawCustomerName || rawName);
  const effectiveCustomerName = rawCustomerName || rawName;

  const rawPhone = String(phone || customerPhone || req.body.customer_phone || '').trim();
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  const cleanCustomerPhone = cleanPhoneDigits.length === 10 ? cleanPhoneDigits : cleanPhoneDigits.slice(-10);

  const rawRecipientPhone = isGiftOrder && (recipientPhone || req.body.recipient_phone)
    ? String(recipientPhone || req.body.recipient_phone).replace(/\D/g, '').slice(-10)
    : cleanCustomerPhone;

  const effectiveDeliveryPhone = isGiftOrder ? rawRecipientPhone : cleanCustomerPhone;

  const rawEmail = String(email || customerEmail || req.body.customer_email || 'customer@nathshikha.com').trim().toLowerCase().slice(0, 120);
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const rawAddress = String(address || '').trim().slice(0, 500);
  if (!rawAddress) {
    return res.status(400).json({ error: 'Complete delivery address is required.' });
  }

  const rawPincode = String(pincode || '').trim();
  if (!rawPincode || !isValidPincode(rawPincode)) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit delivery PIN code.' });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Please add at least one product item to the order.' });
  }

  let incrementedCouponId = null;
  const appliedStockDeductions = [];

  try {
    // 1. Validate Product IDs & Items
    const validProductIds = items
      .map((i) => (i.productId || i.id || i._id)?.toString())
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (!validProductIds.length || validProductIds.length !== items.length) {
      return res.status(400).json({ error: 'One or more items have invalid product IDs.' });
    }

    const catalogProducts = await Product.find({ _id: { $in: validProductIds } });
    const catalogMap = new Map(catalogProducts.map((p) => [p._id.toString(), p]));

    // Aggregate requested quantity per product ID
    const productTotalQtyMap = new Map();
    for (const item of items) {
      const pId = (item.productId || item.id || item._id)?.toString();
      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        return res.status(400).json({ error: 'Item quantity must be between 1 and 100.' });
      }
      productTotalQtyMap.set(pId, (productTotalQtyMap.get(pId) || 0) + qty);
    }

    // Check stock availability
    for (const [pId, totalRequestedQty] of productTotalQtyMap.entries()) {
      const p = catalogMap.get(pId);
      if (!p) {
        return res.status(400).json({ error: `Product ID "${pId}" not found in catalogue.` });
      }
      if (p.stock === 0) {
        return res.status(400).json({ error: `Sorry, "${p.name}" is currently out of stock.` });
      }
      if (p.stock < totalRequestedQty) {
        const unitText = p.stock === 1 ? '1 unit is' : `${p.stock} units are`;
        return res.status(400).json({
          error: `Sorry, only ${unitText} currently available in stock for "${p.name}". (Requested: ${totalRequestedQty})`
        });
      }
    }

    let subtotal = 0;
    const normalizedItems = [];

    for (const item of items) {
      const pId = (item.productId || item.id || item._id)?.toString();
      const p = catalogMap.get(pId);
      const qty = parseInt(item.qty, 10);
      const price = item.price !== undefined && !isNaN(Number(item.price)) && Number(item.price) >= 0
        ? Number(item.price)
        : p.price;

      const effectiveSelectedParams =
        (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
        (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});

      // Validate required parameters and in-stock option values
      if (Array.isArray(p.productParameters) && p.productParameters.length > 0) {
        for (const param of p.productParameters) {
          const selectedVal = effectiveSelectedParams[param.name];
          const isTextParam = param.displayType === 'text' || param.displayType === 'textbox';

          if (param.required && (!selectedVal || String(selectedVal).trim() === '')) {
            return res.status(400).json({
              error: isTextParam
                ? `Please enter customized "${param.name}" for "${p.name}".`
                : `Please select an option for "${param.name}" on "${p.name}".`
            });
          }

          if (selectedVal && !isTextParam) {
            const paramVals = Array.isArray(param.selectedValues) && param.selectedValues.length > 0
              ? param.selectedValues
              : (Array.isArray(param.values) ? param.values : []);

            if (paramVals.length > 0) {
              const matchingVal = paramVals.find(
                (v) => String(v.value || v.label).trim().toLowerCase() === String(selectedVal).trim().toLowerCase()
              );

              if (matchingVal && matchingVal.inStock === false) {
                return res.status(400).json({
                  error: `Sorry, option "${selectedVal}" for "${p.name}" is currently out of stock.`
                });
              }
            }
          }
        }
      }

      subtotal += price * qty;

      normalizedItems.push({
        productId: p._id,
        name: p.name,
        price,
        qty,
        img: p.img,
        selectedParameters: effectiveSelectedParams,
        selectedOptions: effectiveSelectedParams
      });
    }

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'No valid products in order.' });
    }

    // 2. Atomically reserve stock
    for (const [pId, totalQty] of productTotalQtyMap.entries()) {
      const p = catalogMap.get(pId);
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: p._id, stock: { $gte: totalQty } },
        { $inc: { stock: -totalQty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback already deducted
        for (const deducted of appliedStockDeductions) {
          await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
        }
        return res.status(400).json({
          error: `Item "${p.name}" ran out of stock during order creation. Please adjust items.`
        });
      }

      appliedStockDeductions.push({ productId: p._id, qty: totalQty });
    }

    // 3. Coupon Validation & Calculation
    let appliedCoupon = null;
    let couponDiscount = 0;

    if (couponCode && String(couponCode).trim()) {
      const normalizedCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: normalizedCode });

      if (!coupon) {
        throw new Error('Invalid coupon code.');
      }
      if (!coupon.isActive) {
        throw new Error('This coupon is currently inactive.');
      }
      if (isCouponExpired(coupon.expiryDate)) {
        throw new Error('This coupon has expired.');
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('This coupon has reached its usage limit.');
      }
      if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        throw new Error(`Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} is required to use coupon "${coupon.code}".`);
      }

      couponDiscount = calculateCouponDiscount(coupon, subtotal);

      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          isActive: true,
          $expr: { $lt: ['$usageCount', '$usageLimit'] }
        },
        { $inc: { usageCount: 1 } },
        { new: true }
      );

      if (!updatedCoupon && coupon.usageLimit > 0) {
        throw new Error('This coupon has reached its usage limit.');
      }

      incrementedCouponId = coupon._id;
      appliedCoupon = updatedCoupon || coupon;
    }

    // 4. Shipping Calculation
    let shippingDetails;
    try {
      shippingDetails = await calculateShippingCharge(rawPincode, shippingMethod, subtotal);
    } catch (shippingErr) {
      throw new Error(shippingErr.message || 'Invalid delivery PIN code or shipping method.');
    }

    const shipping = shippingDetails.shippingCharge;

    // 5. Gift Options Calculation
    const isGiftWrapRequested = isGiftOrder && Boolean(
      giftWrap === true || gift_wrap === true || req.body.gift?.giftWrap === true || req.body.gift?.gift_wrap === true
    );
    const computedGiftWrapCharge = isGiftWrapRequested ? 20 : 0;
    const rawNote = handwrittenNote !== undefined
      ? handwrittenNote
      : req.body.handwritten_note !== undefined
      ? req.body.handwritten_note
      : (req.body.gift?.handwrittenNote || req.body.gift?.handwritten_note);
    const cleanHandwrittenNote = isGiftOrder && typeof rawNote === 'string' && rawNote.trim()
      ? rawNote.trim().slice(0, 1000)
      : null;

    // 6. Customization Processing
    const rawCustomDetails =
      customizationDetails !== undefined
        ? customizationDetails
        : customization_details !== undefined
        ? customization_details
        : (typeof customization === 'object' && customization !== null ? customization.details : null);

    const rawCustomImage =
      customizationImage !== undefined
        ? customizationImage
        : customization_image !== undefined
        ? customization_image
        : (typeof customization === 'object' && customization !== null
          ? (customization.referenceImage || customization.reference_image)
          : null);

    const cleanCustomDetails =
      typeof rawCustomDetails === 'string' && rawCustomDetails.trim()
        ? rawCustomDetails.trim().slice(0, 2000)
        : null;

    let cleanCustomImage = null;
    if (typeof rawCustomImage === 'string' && rawCustomImage.trim()) {
      const trimmed = rawCustomImage.trim();
      const match = trimmed.match(/(\/?uploads\/[a-zA-Z0-9_\-\.]+)/);
      if (match && !trimmed.includes('..')) {
        cleanCustomImage = match[1].startsWith('/') ? match[1] : `/${match[1]}`;
      } else if (trimmed.startsWith('data:image/') || trimmed.startsWith('http')) {
        cleanCustomImage = trimmed;
      }
    }

    const hasCustomization = Boolean(
      cleanCustomDetails ||
      cleanCustomImage ||
      (typeof customization === 'object' && customization !== null && Boolean(customization.requested))
    );

    const customizationObj = hasCustomization
      ? {
          requested: true,
          details: cleanCustomDetails || null,
          referenceImage: cleanCustomImage || null,
          requestedAt: new Date()
        }
      : {
          requested: false,
          details: null,
          referenceImage: null,
          requestedAt: null
        };

    // 7. Grand Total
    const grandTotal = Math.max(0, subtotal - couponDiscount) + shipping + computedGiftWrapCharge;
    const orderNo = await generateOrderNo();
    const guestToken = crypto.randomBytes(24).toString('hex');

    // 8. Resolve Linked Customer User Account
    let linkedUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    if (!linkedUserId && rawEmail) {
      const existingUser = await User.findOne({ email: rawEmail });
      if (existingUser) {
        linkedUserId = existingUser._id;
      }
    }

    // 9. Payment Status & Order Status
    const isPaymentVerified = paymentStatus === 'verified' || paymentStatus === 'paid';
    const finalOrderStatus = orderStatus || (isPaymentVerified ? 'confirmed' : 'placed');
    const finalNotes = String(adminNotes || notes || '').trim();

    const order = await Order.create({
      orderNo,
      userId: linkedUserId,
      name: effectiveDeliveryName,
      phone: effectiveDeliveryPhone,
      email: rawEmail,
      customerName: effectiveCustomerName,
      customerPhone: cleanCustomerPhone,
      customerEmail: rawEmail,
      recipientName: isGiftOrder ? (rawRecipientName || effectiveDeliveryName) : null,
      recipientPhone: isGiftOrder ? (rawRecipientPhone || effectiveDeliveryPhone) : null,
      address: rawAddress,
      pincode: shippingDetails.pincode,
      city: city ? String(city).trim() : shippingDetails.city,
      state: state ? String(state).trim() : shippingDetails.state,
      shippingMethod: shippingDetails.shippingMethodName,
      subtotal,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscount,
      shipping,
      giftWrap: isGiftWrapRequested,
      giftWrapCharge: computedGiftWrapCharge,
      isGift: isGiftOrder,
      handwrittenNote: cleanHandwrittenNote,
      total: grandTotal,
      paymentMethod,
      paymentStatus: isPaymentVerified ? 'verified' : (paymentStatus || 'verification_pending'),
      orderStatus: finalOrderStatus,
      freeGift: { included: Boolean(req.body.freeGiftIncluded || req.body.freeGift?.included || req.body.free_gift?.included) },
      confirmedAt: (isPaymentVerified || finalOrderStatus === 'confirmed') ? new Date() : null,
      expectedDeliveryDate: (isPaymentVerified || finalOrderStatus === 'confirmed') ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) : null,
      acceptedTerms: true,
      guestToken,
      customization: customizationObj,
      items: normalizedItems,
      paymentTransactionId: isPaymentVerified ? String(transactionId || '').trim() || null : null,
      upiUtr: isPaymentVerified ? String(transactionId || '').trim() || null : null,
      paymentApp: isPaymentVerified ? String(paymentApp || 'Other').trim() : null,
      verifiedAt: isPaymentVerified ? new Date() : null,
      verifiedBy: isPaymentVerified ? (req.user?.name || req.user?.email || 'Admin') : null,
      editHistory: [
        {
          editedAt: new Date(),
          editedBy: req.user?.name || req.user?.email || 'Admin',
          changedFields: ['Order Created by Admin'],
          notes: finalNotes || 'Manual order placed by Admin on behalf of customer.'
        }
      ]
    });

    // Send Order Notification Email (non-blocking)
    if (isPaymentVerified) {
      sendOrderConfirmedEmail(order).catch((mailErr) => {
        console.error('[Admin] Failed to send order confirmed email:', mailErr.message);
      });
    } else {
      sendOrderPlacedEmail(order).catch((mailErr) => {
        console.error('[Admin] Failed to send order placed email:', mailErr.message);
      });
    }

    res.status(201).json({
      ok: true,
      success: true,
      message: `Order #${order.orderNo} created successfully.`,
      order: order.toJSON()
    });
  } catch (err) {
    console.error('Failed to create admin order:', err);

    // Rollback coupon count
    if (incrementedCouponId) {
      await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usageCount: -1 } }).catch(() => {});
    }

    // Rollback stock reservations
    for (const deducted of appliedStockDeductions) {
      await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
    }

    res.status(400).json({ error: err.message || 'Failed to create order.' });
  }
});

// Retention configuration (default: 30 days)
const RETENTION_DAYS = parseInt(process.env.ORDER_TRASH_RETENTION_DAYS, 10) || 30;

// Helper function to find order by MongoDB ObjectId or orderNo (e.g. NS-2026-000001, #NS-2026-000001, NW89463805 or #NW89463805)
async function findOrderByIdOrNo(id, includeDeleted = false) {
  if (!id) return null;
  const rawId = String(id).trim();
  const cleanId = rawId.replace(/^#/, '').trim();
  const deleteFilter = includeDeleted ? {} : { isDeleted: { $ne: true } };

  if (mongoose.Types.ObjectId.isValid(rawId)) {
    const found = await Order.findOne({ _id: rawId, ...deleteFilter });
    if (found) return found;
  }
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const found = await Order.findOne({ _id: cleanId, ...deleteFilter });
    if (found) return found;
  }

  const escapedClean = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return await Order.findOne({
    $and: [
      deleteFilter,
      {
        $or: [
          { orderNo: new RegExp(`^#?${escapedClean}$`, 'i') },
          { order_no: new RegExp(`^#?${escapedClean}$`, 'i') },
          { orderId: new RegExp(`^#?${escapedClean}$`, 'i') }
        ]
      }
    ]
  });
}

// Get all soft-deleted orders in Trash with search, filters, sorting, and pagination
router.get(['/orders/trash', '/trash'], async (req, res) => {
  try {
    const {
      q,
      orderStatus,
      status,
      paymentStatus,
      payment_status,
      expiringSoon,
      expiring_soon,
      isExpired,
      is_expired,
      sort = 'recently_deleted',
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: true };
    const now = new Date();

    // Text search by orderNo, buyer name, phone, email, recipient
    if (q && String(q).trim()) {
      const cleanQ = String(q).trim();
      const escapedQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQ, 'i');
      const cleanDigits = cleanQ.replace(/\D/g, '');

      const searchConditions = [
        { orderNo: regex },
        { customerName: regex },
        { name: regex },
        { customerEmail: regex },
        { email: regex },
        { recipientName: regex },
        { deleteReason: regex }
      ];

      if (cleanDigits.length >= 3) {
        searchConditions.push(
          { customerPhone: new RegExp(cleanDigits) },
          { phone: new RegExp(cleanDigits) },
          { recipientPhone: new RegExp(cleanDigits) }
        );
      }

      query.$or = searchConditions;
    }

    // Status filter
    const activeOrderStatus = orderStatus || status;
    if (activeOrderStatus && String(activeOrderStatus).trim()) {
      query.orderStatus = String(activeOrderStatus).trim();
    }

    // Payment status filter
    const activePaymentStatus = paymentStatus || payment_status;
    if (activePaymentStatus && String(activePaymentStatus).trim()) {
      query.paymentStatus = String(activePaymentStatus).trim();
    }

    // Expiring soon filter (<= 7 days remaining and not expired)
    const activeExpiringSoon = expiringSoon === 'true' || expiringSoon === true || expiring_soon === 'true' || expiring_soon === true;
    if (activeExpiringSoon) {
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      query.restoreUntil = { $lte: sevenDaysFromNow, $gt: now };
    }

    // Expired filter
    const activeIsExpired = isExpired === 'true' || isExpired === true || is_expired === 'true' || is_expired === true;
    if (activeIsExpired) {
      query.restoreUntil = { $lte: now };
    }

    // Sorting
    let sortObj = { deletedAt: -1, _id: -1 };
    if (sort === 'oldest_deleted') {
      sortObj = { deletedAt: 1, _id: 1 };
    } else if (sort === 'expiring_soon') {
      sortObj = { restoreUntil: 1, _id: 1 };
    } else if (sort === 'order_date') {
      sortObj = { createdAt: -1, _id: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [deletedDocs, totalCount, expiringSoonCount] = await Promise.all([
      Order.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Order.countDocuments(query),
      Order.countDocuments({
        isDeleted: true,
        restoreUntil: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), $gt: now }
      })
    ]);

    const formattedOrders = deletedDocs.map((doc) => doc.toJSON());

    res.json({
      ok: true,
      orders: formattedOrders,
      totalCount,
      expiringSoonCount,
      retentionDays: RETENTION_DAYS,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    });
  } catch (err) {
    console.error('Error fetching trash orders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch deleted orders' });
  }
});

// Get single deleted order for read-only inspection
router.get(['/orders/trash/:id', '/trash/:id'], async (req, res) => {
  const { id } = req.params;
  try {
    const order = await findOrderByIdOrNo(id, true);
    if (!order || !order.isDeleted) {
      return res.status(404).json({ error: 'Deleted order not found in Trash.' });
    }
    res.json(order.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch deleted order' });
  }
});

// Restore soft-deleted order from Trash
router.post('/orders/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await findOrderByIdOrNo(id, true);
    if (!order) {
      return res.status(404).json({ error: 'Order not found in database.' });
    }

    if (!order.isDeleted) {
      return res.status(400).json({
        error: `Order #${order.orderNo} is already active and is not in Trash.`,
        order: order.toJSON()
      });
    }

    const now = new Date();
    if (order.restoreUntil && new Date(order.restoreUntil).getTime() < now.getTime()) {
      return res.status(410).json({
        error: `Restore retention period for Order #${order.orderNo} expired on ${new Date(order.restoreUntil).toLocaleDateString('en-IN')}. Expired orders cannot be restored.`
      });
    }

    // Atomic restore condition (protects against concurrent restores / race conditions)
    const restoreQuery = {
      _id: order._id,
      isDeleted: true
    };
    if (order.restoreUntil) {
      restoreQuery.restoreUntil = { $gt: now };
    }

    const restoredOrder = await Order.findOneAndUpdate(
      restoreQuery,
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
          deleteReason: null,
          restoreUntil: null
        },
        $push: {
          editHistory: {
            editedAt: now,
            editedBy: req.user?.name || req.user?.email || 'Admin',
            changedFields: ['Order Restored from Trash'],
            notes: 'Order restored from Trash to active status'
          }
        }
      },
      { new: true }
    );

    if (!restoredOrder) {
      return res.status(400).json({
        error: `Could not restore Order #${order.orderNo}. The order may have already been restored or its retention period has expired.`
      });
    }

    res.json({
      ok: true,
      success: true,
      message: `Order #${restoredOrder.orderNo} restored successfully to active orders.`,
      order: restoredOrder.toJSON()
    });
  } catch (err) {
    console.error('Error restoring order:', err);
    res.status(500).json({ error: err.message || 'Failed to restore order from Trash' });
  }
});

// Get single active order by id (Excludes soft-deleted orders)
router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await findOrderByIdOrNo(id, false);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch order' });
  }
});

const VALID_SHIPMENT_PARTNERS = [
  'Speed Post',
  'Shree Anjani',
  'Shree Mahaveer',
  'Shree Maruti',
  'Other'
];

// Update order statuses
router.patch('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { orderStatus, paymentStatus } = req.body;

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderStatus === 'shipped') {
      if (!order.shipmentPartner || !order.trackingId) {
        return res.status(400).json({
          error: 'Shipment Partner and Tracking ID are required to mark an order as Shipped.'
        });
      }
    }

    const previousStatus = order.orderStatus;
    if (orderStatus) {
      order.orderStatus = orderStatus;
      if (orderStatus === 'confirmed' && !order.confirmedAt) {
        order.confirmedAt = new Date();
        order.expectedDeliveryDate = new Date(order.confirmedAt.getTime() + 20 * 24 * 60 * 60 * 1000);
      }
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // If order was just marked as delivered, send Delivered email
    if (orderStatus === 'delivered' && previousStatus !== 'delivered') {
      sendOrderDeliveredEmail(order).catch((err) => {
        console.error('[Admin] Failed to send order delivered email:', err.message);
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update order' });
  }
});

// Record or Edit shipment details and mark as Shipped (syncing all orders in same Shipment Group)
router.post('/orders/:id/ship', async (req, res) => {
  const { id } = req.params;
  const { shipmentPartner, trackingId } = req.body;

  if (!shipmentPartner || !String(shipmentPartner).trim()) {
    return res.status(400).json({ error: 'Please select a shipment partner.' });
  }

  if (!VALID_SHIPMENT_PARTNERS.includes(String(shipmentPartner).trim())) {
    return res.status(400).json({
      error: `Invalid shipment partner. Must be one of: ${VALID_SHIPMENT_PARTNERS.join(', ')}`
    });
  }

  if (!trackingId || !String(trackingId).trim()) {
    return res.status(400).json({ error: 'Please enter the tracking ID.' });
  }

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const cleanPartner = String(shipmentPartner).trim();
    const cleanTracking = String(trackingId).trim();
    const shippedTimestamp = order.shippedAt || new Date();
    const adminUser = req.user?.name || req.user?.email || 'Admin';

    if (order.shipmentGroupId) {
      await ShipmentGroup.findByIdAndUpdate(order.shipmentGroupId, {
        shipmentPartner: cleanPartner,
        trackingId: cleanTracking,
        shippedAt: shippedTimestamp,
        shippedBy: adminUser,
        status: 'shipped'
      });

      // Update all orders belonging to this shipment group
      await Order.updateMany(
        { shipmentGroupId: order.shipmentGroupId },
        {
          $set: {
            orderStatus: 'shipped',
            shipmentPartner: cleanPartner,
            trackingId: cleanTracking,
            shippedAt: shippedTimestamp,
            shippedBy: adminUser
          }
        }
      );

      // Send Shipped email for all orders in group
      const groupOrders = await Order.find({ shipmentGroupId: order.shipmentGroupId, isDeleted: { $ne: true } });
      for (const grpOrder of groupOrders) {
        sendOrderShippedEmail(grpOrder).catch((err) => {
          console.error(`[Admin] Failed to send shipped email for order #${grpOrder.orderNo}:`, err.message);
        });
      }
    } else {
      order.orderStatus = 'shipped';
      order.shipmentPartner = cleanPartner;
      order.trackingId = cleanTracking;
      order.shippedAt = shippedTimestamp;
      order.shippedBy = adminUser;
      await order.save();

      // Send Shipped notification email
      sendOrderShippedEmail(order).catch((err) => {
        console.error('[Admin] Failed to send order shipped email:', err.message);
      });
    }

    const updatedOrder = await Order.findById(order._id);
    res.json({ ok: true, order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save shipment details' });
  }
});

// Verify payment and automatically confirm order
router.post('/orders/:id/verify-payment', async (req, res) => {
  const { id } = req.params;
  const { transactionId, paymentTransactionId, upiUtr, paymentApp, freeGiftIncluded } = req.body;
  const effectiveTxId = transactionId || paymentTransactionId || upiUtr;

  if (!effectiveTxId || !String(effectiveTxId).trim()) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  if (!paymentApp || !String(paymentApp).trim()) {
    return res.status(400).json({ error: 'Payment App / Mode is required' });
  }

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.paymentStatus = 'verified';
    order.orderStatus = 'confirmed';
    order.paymentTransactionId = String(effectiveTxId).trim();
    order.upiUtr = String(effectiveTxId).trim();
    order.paymentApp = String(paymentApp).trim();
    order.verifiedAt = new Date();
    order.verifiedBy = req.user?.name || req.user?.email || 'Admin';

    order.confirmedAt = order.confirmedAt || new Date();
    const confTime = new Date(order.confirmedAt).getTime();
    order.expectedDeliveryDate = new Date(confTime + 20 * 24 * 60 * 60 * 1000);

    if (freeGiftIncluded !== undefined) {
      order.freeGift = {
        included: Boolean(freeGiftIncluded)
      };
    }

    await order.save();

    // Send Order Confirmed email with automatic deduplication check
    sendOrderConfirmedEmail(order).catch((err) => {
      console.error('[Admin] Failed to dispatch order confirmed email:', err.message);
    });

    res.json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to verify payment' });
  }
});

// Edit existing payment details (Transaction ID, Payment App/Mode, Free Gift)
router.patch(['/orders/:id/payment', '/orders/:id/edit-payment'], async (req, res) => {
  const { id } = req.params;
  const { transactionId, paymentApp, freeGiftIncluded } = req.body;

  if (!transactionId || typeof transactionId !== 'string' || !transactionId.trim()) {
    return res.status(400).json({ error: 'Transaction ID is required and cannot be empty.' });
  }

  const cleanTxId = transactionId.trim().slice(0, 100);
  const cleanApp = typeof paymentApp === 'string' ? paymentApp.trim().slice(0, 100) : null;

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Explicit allowlist update - modify payment transaction details
    order.paymentTransactionId = cleanTxId;
    order.upiUtr = cleanTxId;
    if (cleanApp) {
      order.paymentApp = cleanApp;
    }

    if (freeGiftIncluded !== undefined) {
      order.freeGift = {
        included: Boolean(freeGiftIncluded)
      };
    }

    // Ensure verified status & timestamps are preserved
    if (order.paymentStatus !== 'verified' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'verified';
    }
    if (!order.verifiedAt) {
      order.verifiedAt = new Date();
    }
    if (!order.confirmedAt && (order.orderStatus === 'confirmed' || order.paymentStatus === 'verified')) {
      order.confirmedAt = order.verifiedAt;
      order.expectedDeliveryDate = new Date(new Date(order.confirmedAt).getTime() + 20 * 24 * 60 * 60 * 1000);
    }
    order.verifiedBy = req.user?.name || req.user?.email || order.verifiedBy || 'Admin';

    await order.save();

    res.json({
      ok: true,
      message: 'Payment details updated successfully.',
      order: order.toJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update payment details' });
  }
});

// Edit existing order details (Delivery Address, Recipient Contact, Gift Options, Items, Customization)
router.patch(['/orders/:id/edit', '/orders/:id/update-details', '/orders/:id'], async (req, res) => {
  const { id } = req.params;
  const appliedInventoryDeltas = [];

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found in database.' });
    }

    // Capture original immutable buyer values
    const origBuyerName = String(order.customerName || order.name || '').trim();
    const origBuyerPhone = String(order.customerPhone || order.phone || '').trim().replace(/\D/g, '');
    const origBuyerEmail = String(order.customerEmail || order.email || '').trim().toLowerCase();
    const origUserId = order.userId ? String(order.userId) : null;
    const origOrderNo = String(order.orderNo || '').trim().replace(/^#/, '');

    // 1. STRICT IMMUTABILITY VALIDATION: Reject any attempt to modify buyer identity, userId, orderNo or payment/order statuses
    if (req.body.orderNo !== undefined || req.body.order_no !== undefined) {
      const incomingOrderNo = String(req.body.orderNo !== undefined ? req.body.orderNo : req.body.order_no).trim().replace(/^#/, '');
      if (incomingOrderNo !== origOrderNo) {
        return res.status(400).json({ error: 'Order ID (orderNo) cannot be modified after order creation.' });
      }
    }

    if (req.body.userId !== undefined || req.body.user_id !== undefined) {
      const incomingUserId = req.body.userId !== undefined ? req.body.userId : req.body.user_id;
      const incomingUserIdStr = incomingUserId ? String(incomingUserId) : null;
      if (incomingUserIdStr !== origUserId) {
        return res.status(400).json({ error: 'Buyer account (userId) cannot be modified after order creation.' });
      }
    }

    if (req.body.customerName !== undefined || req.body.customer_name !== undefined) {
      const incomingCustomerName = String(req.body.customerName !== undefined ? req.body.customerName : req.body.customer_name).trim();
      if (incomingCustomerName && incomingCustomerName !== origBuyerName) {
        return res.status(400).json({ error: 'Buyer identity fields (customerName, customerPhone, customerEmail) cannot be modified after order creation.' });
      }
    }

    if (req.body.customerPhone !== undefined || req.body.customer_phone !== undefined) {
      const incomingCustomerPhone = String(req.body.customerPhone !== undefined ? req.body.customerPhone : req.body.customer_phone).replace(/\D/g, '');
      if (incomingCustomerPhone && incomingCustomerPhone !== origBuyerPhone) {
        return res.status(400).json({ error: 'Buyer identity fields (customerName, customerPhone, customerEmail) cannot be modified after order creation.' });
      }
    }

    if (req.body.customerEmail !== undefined || req.body.customer_email !== undefined) {
      const incomingCustomerEmail = String(req.body.customerEmail !== undefined ? req.body.customerEmail : req.body.customer_email).trim().toLowerCase();
      if (incomingCustomerEmail && incomingCustomerEmail !== origBuyerEmail) {
        return res.status(400).json({ error: 'Buyer identity fields (customerName, customerPhone, customerEmail) cannot be modified after order creation.' });
      }
    }

    if (req.body.email !== undefined) {
      const incomingEmail = String(req.body.email).trim().toLowerCase();
      if (incomingEmail && incomingEmail !== origBuyerEmail) {
        return res.status(400).json({ error: 'Buyer email cannot be modified after order creation.' });
      }
    }

    if (req.body.paymentStatus !== undefined && req.body.paymentStatus !== order.paymentStatus) {
      return res.status(400).json({ error: 'Payment status cannot be modified via order edit. Please use payment verification workflow.' });
    }

    if (req.body.orderStatus !== undefined && req.body.orderStatus !== order.orderStatus) {
      return res.status(400).json({ error: 'Order status cannot be modified via order edit. Please use the status update workflow.' });
    }

    // Determine Gift Order state
    const isGiftBool = req.body.isGift !== undefined
      ? Boolean(req.body.isGift)
      : (req.body.is_gift !== undefined ? Boolean(req.body.is_gift) : Boolean(order.isGift));

    if (req.body.name !== undefined && !isGiftBool && !req.body.recipientName && !req.body.recipient_name) {
      const incomingName = String(req.body.name).trim();
      if (incomingName && incomingName !== origBuyerName) {
        return res.status(400).json({
          error: 'Buyer name cannot be modified after order creation. To specify a different delivery recipient, please use the Gift/Recipient options.'
        });
      }
    }

    // 2. STRICT ALLOWLIST EXTRACTION
    const {
      address,
      pincode,
      city,
      state,
      shippingMethod,
      giftWrap,
      gift_wrap,
      handwrittenNote,
      handwritten_note,
      recipientName,
      recipient_name,
      recipientPhone,
      recipient_phone,
      customizationDetails,
      customization_details,
      items,
      allowProductionOverride,
      allowProductionEdit,
      adminEditNotes,
      adminNotes,
      notes
    } = req.body;

    const changedFieldLabels = [];

    // 3. Validate Delivery Address
    const rawAddress = String(address !== undefined ? address : (order.address || '')).trim().slice(0, 500);
    if (!rawAddress) {
      return res.status(400).json({ error: 'Delivery address is required.' });
    }

    const rawPincode = pincode !== undefined && pincode !== null ? String(pincode).trim() : (order.pincode || '');
    if (rawPincode && !isValidPincode(rawPincode)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit delivery PIN code.' });
    }

    const cleanCity = city !== undefined && city !== null ? String(city).trim().slice(0, 100) : (order.city || '');
    const cleanState = state !== undefined && state !== null ? String(state).trim().slice(0, 100) : (order.state || '');
    const cleanShippingMethod = shippingMethod !== undefined && shippingMethod !== null
      ? String(shippingMethod).trim().slice(0, 100)
      : order.shippingMethod;

    // 4. Validate Delivery Recipient Contact Details
    const rawRecName = recipientName !== undefined ? recipientName : (recipient_name !== undefined ? recipient_name : (isGiftBool ? req.body.name : null));
    const cleanRecipientName = rawRecName ? String(rawRecName).trim().slice(0, 100) : null;

    const rawRecPhone = recipientPhone !== undefined ? recipientPhone : (recipient_phone !== undefined ? recipient_phone : (isGiftBool ? req.body.phone : null));
    let cleanRecipientPhone = null;
    if (rawRecPhone !== undefined && rawRecPhone !== null) {
      const recDigits = String(rawRecPhone).replace(/\D/g, '');
      if (recDigits.length >= 10) {
        cleanRecipientPhone = recDigits.slice(-10);
      } else if (recDigits.length > 0) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number for the recipient.' });
      }
    }

    if (isGiftBool && !cleanRecipientName && !order.recipientName) {
      return res.status(400).json({ error: 'Recipient name is required for gift orders.' });
    }

    // 5. Validate Gift Options
    const isGiftWrapBool = isGiftBool && (
      giftWrap !== undefined
        ? Boolean(giftWrap)
        : gift_wrap !== undefined
        ? Boolean(gift_wrap)
        : Boolean(order.giftWrap)
    );
    const computedGiftWrapCharge = isGiftWrapBool ? 20 : 0;
    const rawHandwrittenNote = handwrittenNote !== undefined ? handwrittenNote : (handwritten_note !== undefined ? handwritten_note : order.handwrittenNote);
    const cleanHandwrittenNote = (isGiftBool && typeof rawHandwrittenNote === 'string' && rawHandwrittenNote.trim())
      ? rawHandwrittenNote.trim().slice(0, 1000)
      : null;

    // Detect delivery & gift changes
    if (order.address !== rawAddress) changedFieldLabels.push('Delivery Address');
    if (rawPincode && order.pincode !== rawPincode) changedFieldLabels.push('PIN Code');
    if (cleanCity && order.city !== cleanCity) changedFieldLabels.push('City');
    if (cleanState && order.state !== cleanState) changedFieldLabels.push('State');
    if (Boolean(order.isGift) !== isGiftBool) changedFieldLabels.push(`Gift Order Status (${isGiftBool ? 'Converted to Gift' : 'Standard Delivery'})`);
    if (Boolean(order.giftWrap) !== isGiftWrapBool) changedFieldLabels.push(`Gift Wrap (${isGiftWrapBool ? 'Added ₹20' : 'Removed'})`);
    if ((order.handwrittenNote || null) !== cleanHandwrittenNote) changedFieldLabels.push('Handwritten Note');
    if (cleanRecipientName && order.recipientName !== cleanRecipientName) changedFieldLabels.push('Recipient Name');
    if (cleanRecipientPhone && order.recipientPhone !== cleanRecipientPhone) changedFieldLabels.push('Recipient Phone');

    // 6. Customization Details
    const rawCustomDetails = customizationDetails !== undefined ? customizationDetails : customization_details;
    if (rawCustomDetails !== undefined) {
      const cleanCustomDetails = typeof rawCustomDetails === 'string' && rawCustomDetails.trim()
        ? rawCustomDetails.trim().slice(0, 2000)
        : null;

      const currentDetails = order.customization?.details || null;
      if (cleanCustomDetails !== currentDetails) {
        changedFieldLabels.push('Customization Details');
        const hasRef = Boolean(order.customization?.referenceImage || order.customization?.reference_image);
        order.customization = {
          requested: Boolean(cleanCustomDetails || hasRef),
          details: cleanCustomDetails,
          referenceImage: order.customization?.referenceImage || order.customization?.reference_image || null,
          requestedAt: order.customization?.requestedAt || (cleanCustomDetails ? new Date() : null)
        };
      }
    }

    // 7. PRODUCT / ITEMS EDITING & INVENTORY ATOMIC DELTA
    let normalizedItems = order.items;
    let subtotal = order.subtotal;
    let couponDiscount = order.couponDiscount || 0;
    const shipping = order.shipping !== undefined ? order.shipping : (order.shipping_charge || 0);

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'An order must contain at least one product item.' });
      }

      // Order status restriction check
      const productionLockedStatuses = ['making', 'packing', 'processing', 'shipped', 'delivered'];
      const isProductionStage = productionLockedStatuses.includes(order.orderStatus);
      const isOverrideAllowed = Boolean(allowProductionOverride || allowProductionEdit);

      if (isProductionStage && !isOverrideAllowed) {
        return res.status(400).json({
          error: `Product modification is restricted because Order #${order.orderNo} is currently in "${order.orderStatus.toUpperCase()}" stage. Please confirm production override if authorized.`
        });
      }

      // Validate products against catalog
      const validProductIds = items
        .map((i) => (i.productId || i.id || i._id)?.toString())
        .filter((pid) => pid && mongoose.Types.ObjectId.isValid(pid));

      if (validProductIds.length !== items.length) {
        return res.status(400).json({ error: 'One or more items have invalid product IDs.' });
      }

      const catalogProducts = await Product.find({ _id: { $in: validProductIds } });
      const catalogMap = new Map(catalogProducts.map((p) => [p._id.toString(), p]));

      // Aggregate OLD product quantities
      const oldProductQtyMap = new Map();
      for (const oldIt of (order.items || [])) {
        const pId = (oldIt.productId || oldIt.id || oldIt._id)?.toString();
        if (pId) {
          oldProductQtyMap.set(pId, (oldProductQtyMap.get(pId) || 0) + (Number(oldIt.qty) || 1));
        }
      }

      // Aggregate NEW product quantities & validate parameters/quantities
      const newProductQtyMap = new Map();
      const tempNormalizedItems = [];

      for (const newItem of items) {
        const pId = (newItem.productId || newItem.id || newItem._id)?.toString();
        const catalogProd = catalogMap.get(pId);
        if (!catalogProd) {
          return res.status(400).json({ error: `Product ID "${pId}" not found in catalog.` });
        }

        const qty = parseInt(newItem.qty, 10);
        if (isNaN(qty) || qty < 1 || qty > 100) {
          return res.status(400).json({ error: `Invalid quantity for "${catalogProd.name}". Must be an integer between 1 and 100.` });
        }

        newProductQtyMap.set(pId, (newProductQtyMap.get(pId) || 0) + qty);

        const effectiveSelectedParams =
          (newItem.selectedParameters && typeof newItem.selectedParameters === 'object' ? newItem.selectedParameters : null) ||
          (newItem.selectedOptions && typeof newItem.selectedOptions === 'object' ? newItem.selectedOptions : {});

        const existingItemMatch = (order.items || []).find((oldIt) => (oldIt.productId || oldIt.id)?.toString() === pId);
        const itemPrice = newItem.price !== undefined
          ? Number(newItem.price)
          : (existingItemMatch ? existingItemMatch.price : catalogProd.price);

        tempNormalizedItems.push({
          productId: catalogProd._id,
          name: catalogProd.name,
          price: itemPrice,
          qty,
          img: catalogProd.img,
          selectedParameters: effectiveSelectedParams,
          selectedOptions: effectiveSelectedParams
        });
      }

      // Inventory Delta Pre-check
      const allProductIds = new Set([...oldProductQtyMap.keys(), ...newProductQtyMap.keys()]);
      const deltaPlan = [];

      for (const pId of allProductIds) {
        const oldQty = oldProductQtyMap.get(pId) || 0;
        const newQty = newProductQtyMap.get(pId) || 0;
        const delta = newQty - oldQty;

        if (delta !== 0) {
          let prod = catalogMap.get(pId);
          if (!prod) {
            prod = await Product.findById(pId);
          }
          if (!prod) {
            return res.status(400).json({ error: `Product not found for inventory adjustment (${pId}).` });
          }

          if (delta > 0 && prod.stock < delta) {
            return res.status(400).json({
              error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, additional required: ${delta}.`
            });
          }

          deltaPlan.push({ pId, prod, delta });
        }
      }

      // Execute Atomic Inventory Adjustments
      for (const { pId, prod, delta } of deltaPlan) {
        if (delta > 0) {
          const updated = await Product.findOneAndUpdate(
            { _id: pId, stock: { $gte: delta } },
            { $inc: { stock: -delta } },
            { new: true }
          );
          if (!updated) {
            for (const applied of appliedInventoryDeltas) {
              if (applied.delta > 0) {
                await Product.findByIdAndUpdate(applied.pId, { $inc: { stock: applied.delta } }).catch(() => {});
              } else if (applied.delta < 0) {
                await Product.findByIdAndUpdate(applied.pId, { $inc: { stock: -Math.abs(applied.delta) } }).catch(() => {});
              }
            }
            return res.status(400).json({
              error: `Stock for "${prod.name}" changed during editing. Please try again.`
            });
          }
          appliedInventoryDeltas.push({ pId, delta });
        } else if (delta < 0) {
          const releaseQty = Math.abs(delta);
          await Product.findByIdAndUpdate(pId, { $inc: { stock: releaseQty } });
          appliedInventoryDeltas.push({ pId, delta });
        }
      }

      normalizedItems = tempNormalizedItems;
      subtotal = normalizedItems.reduce((acc, it) => acc + (it.price * it.qty), 0);

      if (order.couponCode) {
        const coupon = await Coupon.findOne({ code: order.couponCode.toUpperCase() });
        if (coupon && coupon.isActive && !isCouponExpired(coupon.expiryDate) && subtotal >= (coupon.minOrderValue || 0)) {
          couponDiscount = calculateCouponDiscount(coupon, subtotal);
        } else {
          couponDiscount = 0;
        }
      }

      changedFieldLabels.push(`Order Products (${normalizedItems.length} items, Subtotal: ₹${subtotal})`);
    }

    // 8. Compute Final Total Server-Side
    const calculatedTotal = Math.max(0, subtotal - couponDiscount) + shipping + computedGiftWrapCharge;
    const prevTotal = order.total;
    const totalDiff = calculatedTotal - prevTotal;

    if (totalDiff !== 0) {
      changedFieldLabels.push(`Order Total (₹${prevTotal} → ₹${calculatedTotal})`);
    }

    // 9. Apply Updates to Order Document: BUYER IDENTITY IS STRICTLY IMMUTABLE
    order.customerName = origBuyerName;
    order.customerPhone = origBuyerPhone;
    order.customerEmail = origBuyerEmail;
    order.email = origBuyerEmail;

    if (isGiftBool) {
      order.recipientName = cleanRecipientName || order.recipientName || origBuyerName;
      order.recipientPhone = cleanRecipientPhone || order.recipientPhone || origBuyerPhone;
      order.name = order.recipientName;
      order.phone = order.recipientPhone;
    } else {
      if (cleanRecipientName) {
        order.recipientName = cleanRecipientName;
        order.name = cleanRecipientName;
      } else {
        order.recipientName = null;
        order.name = origBuyerName;
      }
      if (cleanRecipientPhone) {
        order.recipientPhone = cleanRecipientPhone;
        order.phone = cleanRecipientPhone;
      } else {
        order.recipientPhone = null;
        order.phone = origBuyerPhone;
      }
    }

    order.address = rawAddress;
    if (rawPincode) order.pincode = rawPincode;
    if (cleanCity) order.city = cleanCity;
    if (cleanState) order.state = cleanState;
    if (cleanShippingMethod) order.shippingMethod = cleanShippingMethod;
    order.isGift = isGiftBool;
    order.giftWrap = isGiftWrapBool;
    order.giftWrapCharge = computedGiftWrapCharge;
    order.handwrittenNote = cleanHandwrittenNote;

    if (items !== undefined) {
      order.items = normalizedItems;
      order.subtotal = subtotal;
      order.couponDiscount = couponDiscount;
    }
    order.total = calculatedTotal;

    if (order.assistedOrder?.isAssisted || order.orderStatus === 'payment_pending') {
      order.assistedOrder = {
        ...(order.assistedOrder || {}),
        isAssisted: true,
        lastEditedAt: new Date()
      };
      if (order.assistedOrder?.paymentClaimedAt && totalDiff !== 0) {
        changedFieldLabels.push('Order Total Changed After Customer Payment Claim');
      }
    }

    // Record audit history entry
    const finalEditNotes = String(adminEditNotes || adminNotes || notes || '').trim();
    if (changedFieldLabels.length > 0 || finalEditNotes) {
      if (!Array.isArray(order.editHistory)) {
        order.editHistory = [];
      }
      order.editHistory.push({
        editedAt: new Date(),
        editedBy: req.user?.name || req.user?.email || 'Admin',
        changedFields: changedFieldLabels,
        notes: finalEditNotes ? finalEditNotes.slice(0, 500) : null
      });
    }

    await order.save();

    res.json({
      ok: true,
      success: true,
      message: changedFieldLabels.length > 0
        ? `Order #${order.orderNo} updated successfully (${changedFieldLabels.join(', ')}).`
        : `Order #${order.orderNo} updated successfully.`,
      changedFields: changedFieldLabels,
      previousTotal: prevTotal,
      newTotal: calculatedTotal,
      totalDifference: totalDiff,
      order: order.toJSON()
    });
  } catch (err) {
    console.error('Failed to edit order:', err);

    for (const applied of appliedInventoryDeltas) {
      if (applied.delta > 0) {
        await Product.findByIdAndUpdate(applied.pId, { $inc: { stock: applied.delta } }).catch(() => {});
      } else if (applied.delta < 0) {
        await Product.findByIdAndUpdate(applied.pId, { $inc: { stock: -Math.abs(applied.delta) } }).catch(() => {});
      }
    }

    res.status(500).json({ error: err.message || 'Failed to update order details.' });
  }
});
router.put(['/orders/:id/edit', '/orders/:id/update-details', '/orders/:id'], async (req, res, next) => {
  // If request contains order editing fields, route to patch handler above
  if (req.body?.name || req.body?.phone || req.body?.address || req.body?.pincode || req.body?.email) {
    req.method = 'PATCH';
    return router.handle(req, res, next);
  }
  next();
});

// Reusable Admin Soft-Delete Order Handler (Moves Order to Trash)
async function handleAdminDeleteOrder(req, res) {
  const id = req.params.id || req.query.id || req.body?.id || req.body?.orderId;
  if (!id) {
    return res.status(400).json({ error: 'Order ID is required for deletion.' });
  }

  const rawReason = req.body?.reason || req.body?.deleteReason || req.body?.delete_reason || req.query?.reason;
  const cleanReason = String(rawReason || '').trim().slice(0, 500);

  if (!cleanReason) {
    return res.status(400).json({
      error: 'Please provide a valid reason for moving this order to Deleted Orders / Trash.'
    });
  }

  try {
    const order = await findOrderByIdOrNo(id, true);
    if (!order) {
      return res.status(404).json({ error: 'Order not found in database.' });
    }

    if (order.isDeleted) {
      return res.status(400).json({
        error: `Order #${order.orderNo} is already in Deleted Orders / Trash.`
      });
    }

    const orderId = order._id;
    const orderNo = order.orderNo || order.order_no || id;
    const now = new Date();
    const restoreUntil = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Atomic Soft-Delete Update (Preserves Document & All Data)
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: req.user?.id && isValidObjectId(req.user.id) ? req.user.id : null,
          deletedByName: req.user?.name || req.user?.email || 'Admin',
          deleteReason: cleanReason,
          restoreUntil
        },
        $push: {
          editHistory: {
            editedAt: now,
            editedBy: req.user?.name || req.user?.email || 'Admin',
            changedFields: ['Order Moved to Trash / Soft Deleted'],
            notes: `Reason: ${cleanReason} (Recoverable for ${RETENTION_DAYS} days until ${restoreUntil.toLocaleDateString('en-IN')})`
          }
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({
        error: `Order #${orderNo} has already been deleted or modified by another session.`
      });
    }

    res.json({
      ok: true,
      success: true,
      message: `Order #${orderNo} moved to Deleted Orders / Trash. It remains recoverable for ${RETENTION_DAYS} days.`,
      deletedOrderNo: orderNo,
      deletedOrderId: orderId.toString(),
      retentionDays: RETENTION_DAYS,
      restoreUntil,
      order: updatedOrder.toJSON()
    });
  } catch (err) {
    console.error('Failed to soft-delete order:', err);
    res.status(500).json({ error: err.message || 'Failed to move order to Trash.' });
  }
}

// Admin: Delete order permanently (supporting both DELETE and POST for maximum proxy/browser compatibility)
router.delete(['/orders/:id', '/orders', '/orders/:id/delete', '/orders/delete'], handleAdminDeleteOrder);
router.post(['/orders/:id/delete', '/orders/delete'], handleAdminDeleteOrder);

// Review Customer Cancellation Request (Approve or Reject)
router.post('/orders/:id/cancellation/review', async (req, res) => {
  const { id } = req.params;
  const { action, refundType = 'full', cancellationCharge = 0, notes = '' } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be either "approve" or "reject".' });
  }

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (action === 'reject') {
      order.cancellationStatus = 'no_cancellation';
      order.cancellationRejectedAt = new Date();
      if (notes) order.cancellationAdminNotes = String(notes).trim();
      await order.save();
      return res.json({
        ok: true,
        message: 'Cancellation request has been declined. Order processing continues.',
        order: order.toJSON()
      });
    }

    // Approve cancellation
    const paidAmount = Number(order.total || 0);
    let charge = 0;

    if (refundType === 'with_charge' || refundType === 'partial') {
      charge = Number(cancellationCharge);
      if (isNaN(charge) || charge < 0) {
        return res.status(400).json({ error: 'Cancellation charge cannot be negative.' });
      }
      if (charge > paidAmount) {
        return res.status(400).json({
          error: `Cancellation charge (₹${charge}) cannot exceed the total order amount paid (₹${paidAmount}).`
        });
      }
    }

    const calculatedRefund = Math.max(0, paidAmount - charge);

    order.cancellationStatus = 'cancellation_approved';
    order.cancellationCharge = charge;
    order.refundAmount = calculatedRefund;
    order.refundStatus = 'pending';
    order.cancellationApprovedAt = new Date();
    if (notes) order.cancellationAdminNotes = String(notes).trim();

    await order.save();

    // Send Cancellation Approved email
    sendCancellationApprovedEmail(order).catch((err) => {
      console.error('[Admin] Failed to send cancellation approved email:', err.message);
    });

    return res.json({
      ok: true,
      message: `Cancellation approved! Refund amount of ₹${calculatedRefund} marked as Pending.`,
      order: order.toJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to review cancellation request' });
  }
});

// Process / Complete Refund for an Approved Cancellation
router.post('/orders/:id/cancellation/process-refund', async (req, res) => {
  const { id } = req.params;
  const { notes = '', transactionRef = '' } = req.body;

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.cancellationStatus !== 'cancellation_approved') {
      return res.status(400).json({
        error: 'Only approved cancellations can be marked as Refund Completed.'
      });
    }

    order.cancellationStatus = 'refund';
    order.refundStatus = 'refund';
    order.refundProcessedAt = new Date();
    order.refundProcessedBy = req.user?.name || req.user?.email || 'Admin';
    if (notes || transactionRef) {
      const additional = [
        transactionRef ? `Refund Ref/Tx: ${transactionRef}` : '',
        notes ? `Note: ${notes}` : ''
      ]
        .filter(Boolean)
        .join(' | ');
      order.cancellationAdminNotes = order.cancellationAdminNotes
        ? `${order.cancellationAdminNotes}\n${additional}`
        : additional;
    }

    await order.save();

    // Send Refund Completed email
    sendRefundCompletedEmail(order).catch((err) => {
      console.error('[Admin] Failed to send refund completed email:', err.message);
    });

    return res.json({
      ok: true,
      message: `Refund of ₹${order.refundAmount} completed successfully!`,
      order: order.toJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to complete refund' });
  }
});

// Get email notification history for an order
router.get('/orders/:id/emails', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const events = await EmailEvent.find({ orderId: order._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch email logs' });
  }
});

// Resend order email notification
router.post('/orders/:id/resend-email', async (req, res) => {
  const { id } = req.params;
  const { emailType } = req.body;

  if (!emailType) {
    return res.status(400).json({ error: 'Email type is required' });
  }

  try {
    const order = await findOrderByIdOrNo(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = await resendOrderEmail(order, emailType);
    if (result.success) {
      res.json({ ok: true, message: `${emailType} email resent successfully!` });
    } else {
      res.status(500).json({ error: result.error || 'Failed to resend email' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to resend email' });
  }
});

// Admin SMTP Test Email Endpoint
router.post('/email/test', async (req, res) => {
  const { targetEmail } = req.body;
  const recipient = targetEmail ? String(targetEmail).trim() : (req.user?.email || 'nathshikha.saaj@gmail.com');

  try {
    const result = await sendAdminTestEmail(recipient);
    if (result.success) {
      res.json({
        ok: true,
        message: `SMTP Test email sent successfully to ${recipient}!`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        ok: false,
        error: result.error || 'SMTP test failed. Please verify SMTP_PASSWORD in your server environment.'
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'SMTP test failed' });
  }
});

// ==========================================
// COUPON / PROMO CODE MANAGEMENT ENDPOINTS
// ==========================================

// 1. Get all coupons with usage details and derived status
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1, _id: -1 });
    const now = new Date();

    const formattedCoupons = coupons.map((c) => {
      const isExpired = c.expiryDate && new Date(c.expiryDate).getTime() < now.getTime();
      const isLimitReached = c.usageLimit && c.usageCount >= c.usageLimit;
      let status = 'active';
      if (!c.isActive) {
        status = 'inactive';
      } else if (isExpired) {
        status = 'expired';
      } else if (isLimitReached) {
        status = 'limit_reached';
      }

      return {
        ...c.toJSON(),
        status,
        remaining_usage: Math.max(0, (c.usageLimit || 0) - (c.usageCount || 0))
      };
    });

    res.json(formattedCoupons);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
  }
});

// 2. Create new coupon
router.post('/coupons', async (req, res) => {
  const {
    code,
    discountType = 'percent',
    discountValue,
    minOrderValue = 0,
    usageLimit,
    expiryDate,
    isActive = true,
    description = ''
  } = req.body;

  if (!code || !String(code).trim()) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  const normalizedCode = String(code).trim().toUpperCase();

  if (!['percent', 'fixed'].includes(discountType)) {
    return res.status(400).json({ error: 'Discount type must be either Percent or Fixed.' });
  }

  const numDiscountValue = Number(discountValue);
  if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
    return res.status(400).json({ error: 'Discount value must be a positive number greater than 0.' });
  }

  if (discountType === 'percent' && numDiscountValue > 100) {
    return res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
  }

  const numMinOrderValue = Number(minOrderValue || 0);
  if (isNaN(numMinOrderValue) || numMinOrderValue < 0) {
    return res.status(400).json({ error: 'Minimum order value cannot be negative.' });
  }

  const numUsageLimit = Number(usageLimit);
  if (isNaN(numUsageLimit) || numUsageLimit < 1) {
    return res.status(400).json({ error: 'Usage limit must be at least 1.' });
  }

  if (!expiryDate) {
    return res.status(400).json({ error: 'Expiry date is required.' });
  }

  const parsedExpiry = new Date(expiryDate);
  if (isNaN(parsedExpiry.getTime())) {
    return res.status(400).json({ error: 'Please provide a valid expiry date.' });
  }

  // End-of-day for the expiry date
  parsedExpiry.setHours(23, 59, 59, 999);
  if (parsedExpiry.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Expiry date must be in the future.' });
  }

  try {
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists. Please choose another code.' });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      discountType,
      discountValue: numDiscountValue,
      minOrderValue: numMinOrderValue,
      usageLimit: Math.floor(numUsageLimit),
      usageCount: 0,
      expiryDate: parsedExpiry,
      isActive: Boolean(isActive),
      description: String(description || '').trim()
    });

    res.status(201).json({
      ok: true,
      coupon: {
        ...coupon.toJSON(),
        status: coupon.isActive ? 'active' : 'inactive',
        remaining_usage: coupon.usageLimit
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Coupon code already exists. Please choose another code.' });
    }
    res.status(500).json({ error: err.message || 'Failed to create coupon' });
  }
});

// 3. Edit coupon (updates settings while strictly preserving historical usage count)
router.patch('/coupons/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  const {
    code,
    discountType,
    discountValue,
    minOrderValue,
    usageLimit,
    expiryDate,
    isActive,
    description
  } = req.body;

  try {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (!normalizedCode) {
        return res.status(400).json({ error: 'Coupon code cannot be empty.' });
      }
      if (normalizedCode !== coupon.code) {
        const duplicate = await Coupon.findOne({ code: normalizedCode, _id: { $ne: id } });
        if (duplicate) {
          return res.status(400).json({ error: 'Coupon code already exists. Please choose another code.' });
        }
        coupon.code = normalizedCode;
      }
    }

    if (discountType !== undefined) {
      if (!['percent', 'fixed'].includes(discountType)) {
        return res.status(400).json({ error: 'Discount type must be either Percent or Fixed.' });
      }
      coupon.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const val = Number(discountValue);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ error: 'Discount value must be greater than 0.' });
      }
      if (coupon.discountType === 'percent' && val > 100) {
        return res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
      }
      coupon.discountValue = val;
    }

    if (minOrderValue !== undefined) {
      const mov = Number(minOrderValue);
      if (isNaN(mov) || mov < 0) {
        return res.status(400).json({ error: 'Minimum order value cannot be negative.' });
      }
      coupon.minOrderValue = mov;
    }

    if (usageLimit !== undefined) {
      const limit = Number(usageLimit);
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'Usage limit must be at least 1.' });
      }
      coupon.usageLimit = Math.floor(limit);
    }

    if (expiryDate !== undefined) {
      const exp = new Date(expiryDate);
      if (isNaN(exp.getTime())) {
        return res.status(400).json({ error: 'Please provide a valid expiry date.' });
      }
      exp.setHours(23, 59, 59, 999);
      coupon.expiryDate = exp;
    }

    if (isActive !== undefined) {
      coupon.isActive = Boolean(isActive);
    }

    if (description !== undefined) {
      coupon.description = String(description).trim();
    }

    await coupon.save();

    const now = new Date();
    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now.getTime();
    const isLimitReached = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
    let status = 'active';
    if (!coupon.isActive) {
      status = 'inactive';
    } else if (isExpired) {
      status = 'expired';
    } else if (isLimitReached) {
      status = 'limit_reached';
    }

    res.json({
      ok: true,
      coupon: {
        ...coupon.toJSON(),
        status,
        remaining_usage: Math.max(0, coupon.usageLimit - coupon.usageCount)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update coupon' });
  }
});

// 4. Quick toggle active status
router.patch('/coupons/:id/toggle', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  try {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    const now = new Date();
    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now.getTime();
    const isLimitReached = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
    let status = 'active';
    if (!coupon.isActive) {
      status = 'inactive';
    } else if (isExpired) {
      status = 'expired';
    } else if (isLimitReached) {
      status = 'limit_reached';
    }

    res.json({
      ok: true,
      coupon: {
        ...coupon.toJSON(),
        status,
        remaining_usage: Math.max(0, coupon.usageLimit - coupon.usageCount)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to toggle coupon status' });
  }
});

// 5. Delete coupon permanently (historical orders retain their saved coupon code and discount)
router.delete('/coupons/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  try {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({
      ok: true,
      message: `Coupon ${coupon.code} deleted successfully. Historical orders remain intact.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete coupon' });
  }
});

// ==========================================
// ADMIN: CUSTOMER REVIEWS & FEEDBACK MODULE
// ==========================================

// 1. Get all customer reviews with metrics & filtering
router.get('/reviews', async (req, res) => {
  try {
    const { search = '', rating = '', visibility = '' } = req.query;

    const query = {};

    if (rating && !isNaN(parseInt(rating, 10))) {
      query.rating = parseInt(rating, 10);
    }

    if (visibility === 'visible') {
      query.isVisible = true;
    } else if (visibility === 'hidden') {
      query.isVisible = false;
    }

    let reviews = await Review.find(query)
      .populate('productId', 'name img price category')
      .populate('orderId', 'orderNo orderStatus total createdAt')
      .sort({ createdAt: -1 });

    // Client/search filtering if requested
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      reviews = reviews.filter((r) => {
        const prodName = r.productId?.name?.toLowerCase() || '';
        const orderNo = r.orderId?.orderNo?.toLowerCase() || '';
        const custName = r.customerName?.toLowerCase() || '';
        const custEmail = r.customerEmail?.toLowerCase() || '';
        const comment = r.comment?.toLowerCase() || '';
        return (
          prodName.includes(q) ||
          orderNo.includes(q) ||
          custName.includes(q) ||
          custEmail.includes(q) ||
          comment.includes(q)
        );
      });
    }

    // Analytics summary
    const allDbReviews = await Review.find({}, { rating: 1, isVisible: 1 });
    const totalReviews = allDbReviews.length;
    const visibleCount = allDbReviews.filter((r) => r.isVisible).length;
    const hiddenCount = totalReviews - visibleCount;
    const totalScore = allDbReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating = totalReviews > 0 ? parseFloat((totalScore / totalReviews).toFixed(1)) : 0;

    res.json({
      reviews,
      summary: {
        totalReviews,
        visibleCount,
        hiddenCount,
        averageRating
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
});

// 2. Toggle or set review visibility
router.patch('/reviews/:id/visibility', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Review not found' });
  }

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (req.body.isVisible !== undefined) {
      review.isVisible = Boolean(req.body.isVisible);
    } else {
      review.isVisible = !review.isVisible;
    }

    await review.save();
    res.json({
      ok: true,
      message: `Review marked as ${review.isVisible ? 'Publicly Visible' : 'Hidden from store'}.`,
      review
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to toggle review visibility' });
  }
});

// 3. Delete review permanently
router.delete('/reviews/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Review not found' });
  }

  try {
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      ok: true,
      message: 'Review permanently deleted.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete review' });
  }
});

// 4. Generate secure review link for a delivered order product
router.post('/orders/:orderId/products/:productId/review-link', async (req, res) => {
  const { orderId, productId } = req.params;

  try {
    const order = await Order.findOne({ _id: orderId, isDeleted: { $ne: true } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        error: 'Review links can only be generated for orders that have been marked as Delivered.'
      });
    }

    const item = order.items?.find(
      (i) => String(i.productId || i.id) === String(productId)
    );
    if (!item) {
      return res.status(400).json({
        error: 'The specified product is not part of this order.'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ orderId, productId });
    if (existingReview) {
      return res.status(400).json({
        error: 'Customer has already submitted a review for this product and order.'
      });
    }

    // Check if an existing unused token already exists, or create a fresh one
    let reviewToken = await ReviewToken.findOne({
      orderId,
      productId,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!reviewToken) {
      const tokenString = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days valid

      reviewToken = await ReviewToken.create({
        token: tokenString,
        orderId: order._id,
        productId: item.productId || productId,
        customerName: order.name,
        customerEmail: order.email,
        expiresAt
      });
    }

    res.json({
      ok: true,
      token: reviewToken.token,
      reviewUrl: `/review/${reviewToken.token}`,
      expiresAt: reviewToken.expiresAt,
      productName: item.name,
      orderNo: order.orderNo,
      customerName: order.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate review link' });
  }
});

export default router;

