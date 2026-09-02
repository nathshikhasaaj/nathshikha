import express from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { ShipmentGroup } from '../models/ShipmentGroup.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { isCouponExpired, calculateCouponDiscount } from './couponRoutes.js';
import {
  calculateShippingCharge,
  resolvePincodeLocation,
  getShippingOptionsForLocation
} from '../services/shippingService.js';
import {
  escapeRegex,
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  isValidPincode,
  orderLimiter,
  lookupLimiter
} from '../middleware/securityMiddleware.js';
import { sendOrderPlacedEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Calculate dynamic order age in complete elapsed days from creation timestamp.
 * Invariant: Never statically stored; calculated in real-time.
 */
export function calculateOrderAgeInDays(createdAt) {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return 0;
  const diffMs = Math.max(0, Date.now() - createdTime);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Merge Eligibility Rule:
 * 0–15 days old → Eligible for Merge
 * > 15 days old → NOT eligible for Merge (Priority Order)
 * Active order statuses only. Not shipped, delivered, or cancelled.
 */
export function isOrderMergeEligible(order) {
  if (!order) return false;

  // 1. Dynamic Order Age rule: strictly <= 15 days
  const age = calculateOrderAgeInDays(order.createdAt || order.created_at);
  if (age > 15) return false;

  // 2. Order status compatibility: must be active / fulfillment not completed
  const activeStatuses = [
    'placed',
    'payment_pending',
    'verification_pending',
    'confirmed',
    'making',
    'packing',
    'processing'
  ];
  const currentStatus = order.orderStatus || order.order_status;
  if (!activeStatuses.includes(currentStatus)) return false;

  // 3. Not cancelled or approved for refund
  const cancelStatus = order.cancellationStatus || order.cancellation_status;
  if (['cancellation_approved', 'refund'].includes(cancelStatus) || currentStatus === 'cancelled') {
    return false;
  }

  // 4. Must not have already physically shipped
  if (order.shippedAt || order.shipped_at || order.trackingId || order.tracking_id) {
    return false;
  }

  return true;
}

// Lookup PIN code and return shipping options & location
router.get(['/shipping/lookup/:pincode', '/lookup/:pincode'], async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!isValidPincode(pincode)) {
      return res.status(400).json({
        valid: false,
        error: 'Please enter a valid 6-digit PIN code.'
      });
    }

    const location = await resolvePincodeLocation(pincode);
    if (!location.valid) {
      return res.status(400).json({
        valid: false,
        error: location.error || "We couldn't verify this PIN code. Please check and try again."
      });
    }

    const options = getShippingOptionsForLocation(location);
    return res.json({
      valid: true,
      pincode: location.pincode,
      city: location.city,
      state: location.state,
      location_type: location.locationType,
      options
    });
  } catch (err) {
    console.error('Error during PIN code lookup:', err);
    return res.status(500).json({ error: 'Failed to lookup PIN code.' });
  }
});

// Fetch active merge-eligible orders for the logged-in customer / verified email
router.get('/eligible-merge-orders', optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const emailParam = (req.query.email || '').trim().toLowerCase();
    const phoneParam = (req.query.phone || '').replace(/\D/g, '');

    const queryConditions = [];

    // If authenticated, allow querying customer's own orders
    if (user?.id && isValidObjectId(user.id)) {
      queryConditions.push({ userId: user.id });
    }
    if (user?.email && isValidEmail(user.email)) {
      queryConditions.push({ email: new RegExp(`^${escapeRegex(user.email)}$`, 'i') });
    }

    // If unauthenticated guest, require both valid email and full 10-digit phone to prevent order enumeration
    if (!user && emailParam && isValidEmail(emailParam) && phoneParam && phoneParam.length === 10) {
      queryConditions.push({
        email: new RegExp(`^${escapeRegex(emailParam)}$`, 'i'),
        phone: new RegExp(`${escapeRegex(phoneParam)}$`)
      });
    }

    if (!queryConditions.length) {
      return res.json([]);
    }

    const orders = await Order.find({
      $or: queryConditions,
      orderStatus: {
        $in: ['placed', 'payment_pending', 'verification_pending', 'confirmed', 'making', 'packing', 'processing']
      },
      cancellationStatus: { $nin: ['cancellation_approved', 'refund'] }
    })
      .sort({ createdAt: -1 })
      .lean();

    // Strict backend enforcement of dynamic Order Age <= 15 days and active state
    const eligibleOrders = orders.filter((o) => isOrderMergeEligible(o));

    // Group multiple orders that already belong to the same shipment group to prevent confusing duplicate options
    const seenGroups = new Set();
    const result = [];

    for (const o of eligibleOrders) {
      const age = calculateOrderAgeInDays(o.createdAt);
      const groupCode = o.shipmentGroupCode || null;

      if (groupCode) {
        if (seenGroups.has(groupCode)) continue;
        seenGroups.add(groupCode);
      }

      result.push({
        id: o._id.toString(),
        order_no: o.orderNo,
        order_age: age,
        order_age_label: age === 1 ? '1 Day' : `${age} Days`,
        order_status: o.orderStatus,
        name: o.name,
        pincode: o.pincode,
        city: o.city,
        state: o.state,
        shipping_method: o.shippingMethod,
        shipping_charge: o.shipping,
        shipment_group_id: o.shipmentGroupId ? o.shipmentGroupId.toString() : null,
        shipment_group_code: groupCode,
        created_at: o.createdAt,
        items_count: (o.items || []).reduce((acc, it) => acc + (it.qty || 1), 0),
        items_preview: (o.items || []).map((it) => it.name).join(', ')
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching eligible merge orders:', err);
    res.status(500).json({ error: 'Failed to fetch eligible merge orders.' });
  }
});

// Create new customer or guest order (with optional combine shipment)
router.post('/', orderLimiter, optionalAuth, async (req, res) => {
  const {
    name,
    phone,
    email,
    address,
    pincode,
    shippingMethod,
    items,
    couponCode,
    paymentMethod = 'upi',
    combineWithOrderId,
    isGift,
    recipientName,
    recipientPhone,
    customerName,
    customerPhone,
    customerEmail
  } = req.body;

  // Strict Input Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!address || typeof address !== 'string' || !address.trim()) {
    return res.status(400).json({ error: 'Please enter your complete delivery address.' });
  }
  if (!pincode || !isValidPincode(pincode)) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit delivery PIN code.' });
  }
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    return res.status(400).json({ error: 'Invalid cart items provided.' });
  }

  let incrementedCouponId = null;
  const deductedStockItems = [];

  try {
    const validProductIds = items
      .map((i) => (i.id || i.productId)?.toString())
      .filter((id) => isValidObjectId(id));

    if (!validProductIds.length) {
      return res.status(400).json({ error: 'No valid products in cart.' });
    }

    const products = await Product.find({
      _id: { $in: validProductIds },
      active: 1
    });

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const normalizedItems = [];

    for (const item of items) {
      const pId = String(item.id || item.productId);
      const p = productMap.get(pId);
      if (!p) {
        return res.status(400).json({ error: `A product in your cart is currently unavailable.` });
      }

      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ error: `Invalid quantity for ${p.name}. Quantity must be between 1 and 10.` });
      }

      if (p.stock < qty) {
        return res.status(400).json({
          error: `Sorry, only ${p.stock} units of "${p.name}" are currently available in stock.`
        });
      }

      subtotal += p.price * qty;
      const effectiveSelectedParams =
        (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
        (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});

      normalizedItems.push({
        productId: p._id,
        name: p.name,
        price: p.price,
        qty,
        img: p.img,
        selectedParameters: effectiveSelectedParams,
        selectedOptions: effectiveSelectedParams
      });
    }

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'No valid products in order.' });
    }

    // Atomic stock deduction with rollback safety
    for (const item of normalizedItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback already deducted items
        for (const deducted of deductedStockItems) {
          await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
        }
        return res.status(400).json({
          error: `Item "${item.name}" ran out of stock during checkout. Please adjust your cart.`
        });
      }

      deductedStockItems.push(item);
    }

    // Coupon Validation & Atomic Usage Increment
    let appliedCoupon = null;
    let couponDiscount = 0;

    if (couponCode && String(couponCode).trim()) {
      const normalizedCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: normalizedCode });

      if (!coupon) {
        throw new Error('Invalid coupon code.');
      }

      if (!coupon.isActive) {
        throw new Error('This coupon is currently unavailable.');
      }

      if (isCouponExpired(coupon.expiryDate)) {
        throw new Error('This coupon has expired.');
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('This coupon has reached its usage limit.');
      }

      if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        throw new Error(
          `Minimum order value of ₹${coupon.minOrderValue.toLocaleString(
            'en-IN'
          )} is required to use this coupon.`
        );
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

    // Server-side dynamic shipping calculation based on PIN code & method
    const shippingDetails = await calculateShippingCharge(pincode, shippingMethod);
    const user = req.user;
    let shipping = shippingDetails.shippingCharge;
    let targetExistingOrder = null;
    let targetShipmentGroup = null;

    // Backend Merge Verification & Shipment Group Assignment
    if (combineWithOrderId) {
      const cleanCombineId = String(combineWithOrderId).trim();
      if (isValidObjectId(cleanCombineId)) {
        targetExistingOrder = await Order.findById(cleanCombineId);
      }
      if (!targetExistingOrder) {
        targetExistingOrder = await Order.findOne({
          orderNo: new RegExp(`^${escapeRegex(cleanCombineId.replace(/^#/, ''))}$`, 'i')
        });
      }

      if (!targetExistingOrder) {
        throw new Error('The existing order requested for merge was not found.');
      }

      // 1. Same Customer Check (Ownership validation)
      const isCustomerOwner =
        (user?.id && targetExistingOrder.userId && targetExistingOrder.userId.toString() === user.id) ||
        (user?.email && targetExistingOrder.email.toLowerCase() === user.email.toLowerCase()) ||
        (targetExistingOrder.email.toLowerCase() === email.trim().toLowerCase());

      if (!isCustomerOwner) {
        return res.status(403).json({ error: 'You can only combine shipments with orders from your own account.' });
      }

      // 2. Strict Dynamic Order Age <= 15 Days Rule
      const existingOrderAge = calculateOrderAgeInDays(targetExistingOrder.createdAt);
      if (existingOrderAge > 15) {
        throw new Error(
          `Order #${targetExistingOrder.orderNo} was placed ${existingOrderAge} days ago and is no longer eligible for combination (eligible up to 15 days). Please place as a separate shipment.`
        );
      }

      // 3. Status Compatibility Check
      if (!isOrderMergeEligible(targetExistingOrder)) {
        throw new Error(
          `Order #${targetExistingOrder.orderNo} is in status "${targetExistingOrder.orderStatus}" and cannot be combined into a new shipment.`
        );
      }

      // 4. Shipping Destination PIN Code Compatibility
      if (String(shippingDetails.pincode).trim() !== String(targetExistingOrder.pincode || '').trim()) {
        throw new Error(
          `Delivery PIN code (${shippingDetails.pincode}) does not match existing order's PIN code (${targetExistingOrder.pincode}). Only orders with the same shipping address can be combined.`
        );
      }

      // 5. Shipping Method Compatibility Check
      const isNewSelfPickup =
        shippingDetails.shippingMethodId === 'self_pickup' || shippingDetails.shippingMethodName === 'Self Pickup';
      const isExistingSelfPickup =
        targetExistingOrder.shippingMethod === 'Self Pickup' || targetExistingOrder.shippingMethod === 'self_pickup';

      if (isNewSelfPickup !== isExistingSelfPickup) {
        throw new Error(
          'Cannot combine a Home Delivery order with a Self Pickup order. Both orders must share compatible delivery methods.'
        );
      }

      // All validations passed: Combined physical shipment gets ₹0 shipping for new order
      shipping = 0;

      // Locate or create the shared ShipmentGroup
      if (targetExistingOrder.shipmentGroupId) {
        targetShipmentGroup = await ShipmentGroup.findById(targetExistingOrder.shipmentGroupId);
      }

      if (!targetShipmentGroup) {
        const generatedCode = await ShipmentGroup.generateGroupCode();
        targetShipmentGroup = await ShipmentGroup.create({
          groupCode: generatedCode,
          userId: user?.id && isValidObjectId(user.id) ? user.id : targetExistingOrder.userId || null,
          customerName: name.trim().slice(0, 100),
          customerEmail: email.trim().toLowerCase(),
          customerPhone: phone.trim(),
          pincode: shippingDetails.pincode,
          city: shippingDetails.city,
          state: shippingDetails.state,
          shippingMethod: shippingDetails.shippingMethodName,
          status: 'active',
          orders: [targetExistingOrder._id]
        });

        targetExistingOrder.shipmentGroupId = targetShipmentGroup._id;
        targetExistingOrder.shipmentGroupCode = targetShipmentGroup.groupCode;
        await targetExistingOrder.save();
      }
    }

    const total = Math.max(0, subtotal - couponDiscount) + shipping;
    const orderNo = 'NW' + Date.now().toString().slice(-8);
    const guestToken = crypto.randomBytes(24).toString('hex'); // 48-char high-entropy token

    const order = await Order.create({
      orderNo,
      userId: user?.id && isValidObjectId(user.id) ? user.id : null,
      shipmentGroupId: targetShipmentGroup ? targetShipmentGroup._id : null,
      shipmentGroupCode: targetShipmentGroup ? targetShipmentGroup.groupCode : null,
      isGift: Boolean(isGift),
      recipientName: isGift ? (recipientName ? String(recipientName).trim().slice(0, 100) : name.trim().slice(0, 100)) : null,
      recipientPhone: isGift ? (recipientPhone ? String(recipientPhone).trim() : phone.trim()) : null,
      customerName: isGift ? (customerName ? String(customerName).trim().slice(0, 100) : (user?.name || name.trim().slice(0, 100))) : null,
      customerPhone: isGift ? (customerPhone ? String(customerPhone).trim() : (user?.phone || phone.trim())) : null,
      customerEmail: isGift ? (customerEmail ? String(customerEmail).trim().toLowerCase() : (user?.email || email.trim().toLowerCase())) : null,
      name: name.trim().slice(0, 100),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim().slice(0, 500),
      pincode: shippingDetails.pincode,
      city: shippingDetails.city,
      state: shippingDetails.state,
      shippingMethod: shippingDetails.shippingMethodName,
      subtotal,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponDiscount,
      shipping,
      total,
      paymentMethod: 'upi',
      paymentStatus: 'verification_pending',
      orderStatus: 'placed',
      guestToken,
      items: normalizedItems
    });

    if (targetShipmentGroup) {
      await ShipmentGroup.findByIdAndUpdate(targetShipmentGroup._id, {
        $addToSet: { orders: order._id }
      });
    }

    // Send Order Placed notification email non-blockingly
    sendOrderPlacedEmail(order).catch((mailErr) => {
      console.error('[OrderRoutes] Failed to dispatch order placed email:', mailErr.message);
    });

    res.status(201).json({
      order: order.toJSON(),
      guest_token: guestToken,
      combined_with_order_no: targetExistingOrder ? targetExistingOrder.orderNo : null,
      shipment_group_code: targetShipmentGroup ? targetShipmentGroup.groupCode : null,
      items: normalizedItems.map((item) => ({
        id: item.productId.toString(),
        name: item.name,
        price: item.price,
        qty: item.qty,
        img: item.img,
        selectedParameters: item.selectedParameters || item.selectedOptions || {},
        selectedOptions: item.selectedOptions || item.selectedParameters || {}
      }))
    });
  } catch (err) {
    console.error('Error creating order:', err.message);

    // Rollback coupon count if incremented
    if (incrementedCouponId) {
      await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usageCount: -1 } }).catch(() => {});
    }

    // Rollback deducted product stocks
    for (const deducted of deductedStockItems) {
      await Product.findByIdAndUpdate(deducted.productId, { $inc: { stock: deducted.qty } }).catch(() => {});
    }

    res.status(400).json({ error: err.message || 'Failed to place order.' });
  }
});

// Get orders for the logged-in customer (Authenticated only)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = (req.user?.email || '').trim().toLowerCase();

    if (!userId && !userEmail) {
      return res.json([]);
    }

    const conditions = [];
    if (userId && isValidObjectId(userId)) {
      conditions.push({ userId });
    }
    if (userEmail && isValidEmail(userEmail)) {
      const emailRegex = new RegExp(`^${escapeRegex(userEmail)}$`, 'i');
      conditions.push({ email: emailRegex });

      // Retroactively link past guest orders placed with this email
      if (userId && isValidObjectId(userId)) {
        await Order.updateMany(
          { email: emailRegex, userId: null },
          { $set: { userId } }
        ).catch(() => {});
      }
    }

    const orders = await Order.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .lean();

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
        const coOrders = o.shipmentGroupCode
          ? (groupCodeMap.get(o.shipmentGroupCode) || []).filter((no) => no !== o.orderNo)
          : [];
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
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
});

// Customer Cancellation Request Endpoint (Protected with Ownership Validation)
router.post('/:id/cancel-request', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { reason, cancellationReason, cancellation_reason, guestToken, phone, email } = req.body;
  const finalReason = reason || cancellationReason || cancellation_reason;

  if (!finalReason || !String(finalReason).trim()) {
    return res.status(400).json({ error: 'Please provide a reason for cancelling this order.' });
  }

  try {
    let order = null;
    if (isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({
        orderNo: new RegExp(`^${escapeRegex(String(id).trim().replace(/^#/, ''))}$`, 'i')
      });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Ownership Verification (IDOR Protection)
    const user = req.user;
    const isOwner =
      (user?.id && order.userId && order.userId.toString() === user.id) ||
      (user?.email && order.email.toLowerCase() === user.email.toLowerCase()) ||
      (guestToken && order.guestToken && order.guestToken === guestToken) ||
      (email && phone && order.email.toLowerCase() === email.trim().toLowerCase() && order.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));

    if (!isOwner) {
      return res.status(403).json({ error: 'You are not authorized to request cancellation for this order.' });
    }

    // Cancellation rule: Prohibited once Making starts
    const lockedStatuses = ['making', 'packing', 'processing', 'shipped', 'delivered'];
    if (lockedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        error:
          'Cancellation cannot be requested online because your jewellery has already entered production or dispatch. Please tap "Discuss Cancellation on WhatsApp" to speak directly with our artisans.'
      });
    }

    if (order.cancellationStatus === 'cancellation_requested') {
      return res.status(400).json({
        error: 'A cancellation request for this order is already submitted and under review.'
      });
    }

    if (
      order.cancellationStatus === 'cancellation_approved' ||
      order.cancellationStatus === 'refund' ||
      order.orderStatus === 'cancelled'
    ) {
      return res.status(400).json({
        error: 'This order has already been cancelled.'
      });
    }

    order.cancellationStatus = 'cancellation_requested';
    order.cancellationReason = String(finalReason).trim().slice(0, 500);
    order.cancellationRequestedAt = new Date();
    await order.save();

    res.json({
      ok: true,
      message: 'Your cancellation request has been submitted for review.',
      order: order.toJSON()
    });
  } catch (err) {
    console.error('Error submitting cancellation request:', err);
    res.status(500).json({ error: 'Failed to submit cancellation request.' });
  }
});

// Public Order Tracking by Order Number
router.post('/track', lookupLimiter, async (req, res) => {
  try {
    const { orderNo, phone, email, identifier } = req.body;

    if (!orderNo || !String(orderNo).trim()) {
      return res.status(400).json({ error: 'Please enter your Order Number (e.g. NW12345678).' });
    }

    const cleanOrderNo = String(orderNo).trim().replace(/^#/, '').toUpperCase();
    const cleanId = String(identifier || phone || email || '').trim();

    const order = await Order.findOne({
      orderNo: new RegExp(`^${escapeRegex(cleanOrderNo)}$`, 'i')
    }).lean();

    if (!order) {
      return res.status(404).json({
        error: `No order found with Order ID #${cleanOrderNo}. Please check and try again.`
      });
    }

    // Verification if identifier is supplied
    if (cleanId) {
      const cleanDigits = cleanId.replace(/\D/g, '');
      const orderPhoneDigits = (order.phone || '').replace(/\D/g, '');
      const isPhoneMatch = cleanDigits.length >= 4 && orderPhoneDigits.endsWith(cleanDigits);
      const isEmailMatch = (order.email || '').toLowerCase() === cleanId.toLowerCase();

      if (!isPhoneMatch && !isEmailMatch) {
        return res.status(403).json({
          error: 'The mobile number or email provided does not match the records for this Order ID.'
        });
      }
    }

    let coShippedOrders = [];
    if (order.shipmentGroupCode) {
      const groupOrders = await Order.find({
        shipmentGroupCode: order.shipmentGroupCode,
        _id: { $ne: order._id }
      })
        .select('orderNo')
        .lean();
      coShippedOrders = groupOrders.map((g) => g.orderNo);
    }

    let courierPortalUrl = null;
    if (order.shipmentPartner === 'Speed Post') {
      courierPortalUrl = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
    } else if (order.shipmentPartner === 'Shree Anjani') {
      courierPortalUrl = 'https://www.shreeanjanicourier.com/';
    } else if (order.shipmentPartner === 'Shree Mahaveer') {
      courierPortalUrl = 'http://www.shreemahaveercourier.com/';
    } else if (order.shipmentPartner === 'Shree Maruti') {
      courierPortalUrl = 'https://www.shreemaruti.com/';
    }

    // Mask phone number in public response to prevent PII harvesting
    const maskedPhone = order.phone ? order.phone.replace(/^(\d{2})\d+(\d{2})$/, '$1••••••$2') : '';

    res.json({
      ok: true,
      order: {
        id: order._id.toString(),
        order_no: order.orderNo,
        shipment_group_id: order.shipmentGroupId ? order.shipmentGroupId.toString() : null,
        shipment_group_code: order.shipmentGroupCode || null,
        co_shipped_orders: coShippedOrders,
        name: order.name,
        email: order.email,
        phone: maskedPhone,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        shipping_method: order.shippingMethod,
        subtotal: order.subtotal,
        coupon_code: order.couponCode,
        coupon_discount: order.couponDiscount || 0,
        shipping_charge: order.shipping,
        total: order.total,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        order_status: order.orderStatus,
        cancellation_status: order.cancellationStatus || 'no_cancellation',
        cancellation_reason: order.cancellationReason || null,
        cancellation_requested_at: order.cancellationRequestedAt || null,
        cancellation_approved_at: order.cancellationApprovedAt || null,
        cancellation_rejected_at: order.cancellationRejectedAt || null,
        cancellation_charge: order.cancellationCharge || 0,
        refund_amount: order.refundAmount || 0,
        refund_status: order.refundStatus || 'none',
        refund_processed_at: order.refundProcessedAt || null,
        refund_processed_by: order.refundProcessedBy || null,
        cancellation_admin_notes: order.cancellationAdminNotes || null,
        shipment_partner: order.shipmentPartner,
        tracking_id: order.trackingId,
        courier_portal_url: courierPortalUrl,
        shipped_at: order.shippedAt,
        delivered_at: order.deliveredAt,
        created_at: order.createdAt,
        items: (order.items || []).map((item) => ({
          id: item.productId?.toString() || item._id?.toString(),
          name: item.name,
          price: item.price,
          qty: item.qty,
          img: item.img,
          selectedParameters: item.selectedParameters || item.selectedOptions || {},
          selectedOptions: item.selectedOptions || item.selectedParameters || {}
        }))
      }
    });
  } catch (err) {
    console.error('Error tracking order:', err);
    res.status(500).json({ error: 'Failed to track order.' });
  }
});

// Public Order History Lookup (Requires full 10-digit phone or valid full email to prevent enumeration)
router.post('/lookup-orders', lookupLimiter, async (req, res) => {
  try {
    const { contact } = req.body;
    if (!contact || !String(contact).trim()) {
      return res.status(400).json({ error: 'Please enter your email address or mobile number.' });
    }

    const cleanContact = String(contact).trim();
    const cleanDigits = cleanContact.replace(/\D/g, '');
    const isEmail = cleanContact.includes('@');

    const queryConditions = [];
    if (isEmail && isValidEmail(cleanContact)) {
      queryConditions.push({
        email: new RegExp(`^${escapeRegex(cleanContact)}$`, 'i')
      });
    } else if (cleanDigits.length === 10) {
      // Must match full 10-digit phone number to protect customer privacy
      queryConditions.push({
        phone: new RegExp(`${escapeRegex(cleanDigits)}$`)
      });
    } else {
      return res.status(400).json({
        error: 'Please enter a complete 10-digit mobile number or a valid email address.'
      });
    }

    const orders = await Order.find({ $or: queryConditions })
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) {
      return res.status(404).json({
        error: `No orders found matching "${cleanContact}". Please verify and try again.`
      });
    }

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
        const coOrders = o.shipmentGroupCode
          ? (groupCodeMap.get(o.shipmentGroupCode) || []).filter((no) => no !== o.orderNo)
          : [];
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
    console.error('Error during order lookup:', err);
    res.status(500).json({ error: 'Failed to lookup orders.' });
  }
});

// Get single order for guest with guestToken (Guarded with token check)
router.get('/guest/:orderNo', lookupLimiter, async (req, res) => {
  try {
    const { token } = req.query;
    const { orderNo } = req.params;

    if (!token || typeof token !== 'string' || token.length < 16) {
      return res.status(401).json({ error: 'Valid guest access token is required.' });
    }

    const cleanOrderNo = String(orderNo).trim().replace(/^#/, '');
    const order = await Order.findOne({
      orderNo: new RegExp(`^${escapeRegex(cleanOrderNo)}$`, 'i'),
      guestToken: token
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or invalid token.' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error retrieving guest order:', err);
    res.status(500).json({ error: 'Failed to retrieve order.' });
  }
});

export default router;
