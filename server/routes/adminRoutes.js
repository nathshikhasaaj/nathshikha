import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
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
  resendOrderEmail
} from '../services/emailService.js';

import { uploadSingle, uploadMultiple, uploadsDir } from '../middleware/uploadMiddleware.js';

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

// Create product
router.post('/products', async (req, res) => {
  const { name, price, category, tag, img, images, description, stock, isBestseller } = req.body;

  const normalizedImages = Array.isArray(images) && images.length > 0
    ? images.filter(Boolean)
    : (img ? [img.trim()] : []);

  const primaryImg = img?.trim() || normalizedImages[0];

  if (!name || !price || !category || !primaryImg) {
    return res
      .status(400)
      .json({ error: 'Name, price, category and at least one image are required' });
  }

  try {
    const product = await Product.create({
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      tag: tag || (isBestseller ? 'BESTSELLER' : 'NEW'),
      img: primaryImg,
      images: normalizedImages.length > 0 ? normalizedImages : [primaryImg],
      description: description || '',
      stock: Number(stock || 0),
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

// Get all orders with shipment group mapping
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1, _id: -1 }).lean();

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
        return {
          ...o,
          id: o._id.toString(),
          order_no: o.orderNo,
          shipment_group_id: o.shipmentGroupId ? o.shipmentGroupId.toString() : null,
          shipment_group_code: o.shipmentGroupCode || null,
          co_shipped_orders: coOrders,
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
          shipment_partner: o.shipmentPartner,
          tracking_id: o.trackingId,
          shipped_at: o.shippedAt,
          delivered_at: o.deliveredAt,
          payment_transaction_id: o.paymentTransactionId || o.upiUtr,
          payment_app: o.paymentApp,
          verified_at: o.verifiedAt,
          verified_by: o.verifiedBy,
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

// Create manual order on behalf of customer
router.post('/orders', async (req, res) => {
  const {
    name,
    phone,
    email,
    address,
    pincode,
    shippingMethod = 'self_pickup',
    items,
    couponCode,
    paymentMethod = 'upi',
    paymentStatus = 'verification_pending',
    orderStatus,
    transactionId,
    paymentApp
  } = req.body;

  if (
    !name ||
    !phone ||
    !address ||
    !pincode ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res
      .status(400)
      .json({ error: 'Customer name, phone, address, PIN code, and at least one product item are required.' });
  }

  let incrementedCouponId = null;

  try {
    const validProductIds = items
      .map((i) => i.id || i.productId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!validProductIds.length) {
      return res.status(400).json({ error: 'No valid products selected for order.' });
    }

    const products = await Product.find({
      _id: { $in: validProductIds }
    });

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const normalizedItems = [];

    for (const item of items) {
      const pId = String(item.id || item.productId);
      const p = productMap.get(pId);
      if (!p) continue;
      const qty = Math.max(1, Number(item.qty) || 1);
      subtotal += p.price * qty;
      normalizedItems.push({
        productId: p._id,
        name: p.name,
        price: p.price,
        qty,
        img: p.img
      });
    }

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'No valid products found in catalog.' });
    }

    // Optional Coupon Validation & Atomic Increment
    let appliedCoupon = null;
    let couponDiscount = 0;

    if (couponCode && String(couponCode).trim()) {
      const normalizedCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: normalizedCode });

      if (!coupon) {
        return res.status(400).json({ error: 'Invalid coupon code.' });
      }

      if (!coupon.isActive) {
        return res.status(400).json({ error: 'This coupon is currently unavailable.' });
      }

      if (isCouponExpired(coupon.expiryDate)) {
        return res.status(400).json({ error: 'This coupon has expired.' });
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
      }

      if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        return res.status(400).json({
          error: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString(
            'en-IN'
          )} is required to use this coupon.`
        });
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

      if (!updatedCoupon) {
        return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
      }

      incrementedCouponId = coupon._id;
      appliedCoupon = updatedCoupon;
    }

    // Decrement product stock
    for (const item of normalizedItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.qty }
      });
    }

    // Server-side shipping calculation
    let shippingDetails;
    try {
      shippingDetails = await calculateShippingCharge(pincode, shippingMethod);
    } catch (shippingErr) {
      if (incrementedCouponId) {
        await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usageCount: -1 } }).catch(() => {});
      }
      return res.status(400).json({
        error: shippingErr.message || 'Invalid PIN code or shipping method.'
      });
    }

    const shipping = shippingDetails.shippingCharge;
    const total = Math.max(0, subtotal - couponDiscount) + shipping;
    const orderNo = 'NW' + Date.now().toString().slice(-8);
    const guestToken = crypto.randomBytes(18).toString('hex');

    const isPaymentVerified = paymentStatus === 'verified' || paymentStatus === 'paid';
    const finalOrderStatus = orderStatus || (isPaymentVerified ? 'confirmed' : 'placed');

    const order = await Order.create({
      orderNo,
      userId: null,
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim().toLowerCase() : 'customer@nathshikha.com',
      address: String(address).trim(),
      pincode: shippingDetails.pincode,
      city: shippingDetails.city,
      state: shippingDetails.state,
      shippingMethod: shippingDetails.shippingMethodName,
      subtotal,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscount,
      shipping,
      total,
      paymentMethod,
      paymentStatus: isPaymentVerified ? 'verified' : 'verification_pending',
      orderStatus: finalOrderStatus,
      guestToken,
      items: normalizedItems,
      paymentTransactionId: isPaymentVerified ? String(transactionId || '').trim() : null,
      upiUtr: isPaymentVerified ? String(transactionId || '').trim() : null,
      paymentApp: isPaymentVerified ? String(paymentApp || 'Other').trim() : null,
      verifiedAt: isPaymentVerified ? new Date() : null,
      verifiedBy: isPaymentVerified ? (req.user?.name || req.user?.email || 'Admin') : null
    });

    res.status(201).json({
      ok: true,
      order
    });
  } catch (err) {
    if (incrementedCouponId) {
      await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usageCount: -1 } }).catch(() => {});
    }
    res.status(500).json({ error: err.message || 'Failed to create manual order.' });
  }
});

// Get single order by id
router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    const order = await Order.findById(id);
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    const order = await Order.findById(id);
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
    if (orderStatus) order.orderStatus = orderStatus;
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

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
    const order = await Order.findById(id);
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
      const groupOrders = await Order.find({ shipmentGroupId: order.shipmentGroupId });
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

    const updatedOrder = await Order.findById(id);
    res.json({ ok: true, order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save shipment details' });
  }
});

// Verify payment and automatically confirm order
router.post('/orders/:id/verify-payment', async (req, res) => {
  const { id } = req.params;
  const { transactionId, paymentApp } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!transactionId || !String(transactionId).trim()) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  if (!paymentApp || !String(paymentApp).trim()) {
    return res.status(400).json({ error: 'Payment App / Mode is required' });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.paymentStatus = 'verified';
    order.orderStatus = 'confirmed';
    order.paymentTransactionId = String(transactionId).trim();
    order.upiUtr = String(transactionId).trim();
    order.paymentApp = String(paymentApp).trim();
    order.verifiedAt = new Date();
    order.verifiedBy = req.user?.name || req.user?.email || 'Admin';

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

// Review Customer Cancellation Request (Approve or Reject)
router.post('/orders/:id/cancellation/review', async (req, res) => {
  const { id } = req.params;
  const { action, refundType = 'full', cancellationCharge = 0, notes = '' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be either "approve" or "reject".' });
  }

  try {
    const order = await Order.findById(id);
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    const order = await Order.findById(id);
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    const events = await EmailEvent.find({ orderId: id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch email logs' });
  }
});

// Resend order email notification
router.post('/orders/:id/resend-email', async (req, res) => {
  const { id } = req.params;
  const { emailType } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!emailType) {
    return res.status(400).json({ error: 'Email type is required' });
  }

  try {
    const order = await Order.findById(id);
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
    const order = await Order.findById(orderId);
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

