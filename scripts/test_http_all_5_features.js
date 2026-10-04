import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Order } from '../server/models/Order.js';
import { Coupon } from '../server/models/Coupon.js';
import { Product } from '../server/models/Product.js';
import { User } from '../server/models/User.js';
import { generateOrderNo } from '../server/services/orderIdService.js';
import { signToken } from '../server/middleware/auth.js';

import express from 'express';
import orderRoutes from '../server/routes/orderRoutes.js';
import adminRoutes from '../server/routes/adminRoutes.js';
import couponRoutes from '../server/routes/couponRoutes.js';
import productRoutes from '../server/routes/productRoutes.js';

dotenv.config();

const TEST_PORT = 4005;
const API_BASE = `http://localhost:${TEST_PORT}/api`;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runHttpIntegrationTests() {
  console.log('================================================================');
  console.log('HTTP INTEGRATION TESTS FOR 5 FEATURES');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);

  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin_test@nathshikha.in',
      role: 'admin',
      passwordHash: 'dummyhash'
    });
  }

  const adminToken = signToken(adminUser);

  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);
  app.use('/api/shipping', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/products', productRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let passed = 0;
  let total = 0;

  function assert(cond, msg) {
    total++;
    if (cond) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // Create dedicated test product with known price in DB
  const testProduct = await Product.create({
    name: 'Integration Test Necklace High Price',
    price: 1500,
    stock: 50,
    active: 1,
    category: 'necklaces',
    images: ['/assets/thushi.jpg']
  });

  // Setup test coupons in DB
  await Coupon.deleteMany({ code: { $in: ['TESTSAVE100', 'TESTWELCOME10', 'TESTEXPIRED', 'TESTLIMIT'] } });
  await Coupon.create([
    {
      code: 'TESTSAVE100',
      discountType: 'fixed',
      discountValue: 100,
      minOrderValue: 1000,
      usageLimit: 100,
      isActive: true,
      expiryDate: new Date('2028-12-31')
    },
    {
      code: 'TESTWELCOME10',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 2000,
      usageLimit: 100,
      isActive: true,
      expiryDate: new Date('2028-12-31')
    },
    {
      code: 'TESTEXPIRED',
      discountType: 'fixed',
      discountValue: 50,
      minOrderValue: 500,
      usageLimit: 100,
      isActive: true,
      expiryDate: new Date('2020-01-01')
    },
    {
      code: 'TESTLIMIT',
      discountType: 'fixed',
      discountValue: 50,
      minOrderValue: 500,
      usageLimit: 1,
      usageCount: 1,
      isActive: true,
      expiryDate: new Date('2028-12-31')
    }
  ]);

  try {
    // -----------------------------------------------------------------
    // 1. HTTP TEST: Shipping Lookup API with subtotal
    // -----------------------------------------------------------------
    console.log('1. Testing /shipping/lookup/:pincode with subtotal...');
    const res1499 = await fetch(`${API_BASE}/shipping/lookup/411001?subtotal=1499`);
    const data1499 = await res1499.json();
    assert(data1499.valid === true, 'Pincode 411001 is valid');
    const mhOpt1499 = data1499.options.find(o => o.id === 'maharashtra_delivery');
    assert(mhOpt1499.charge === 100, 'Pincode 411001 subtotal=1499 returns charge=100');

    const res1500 = await fetch(`${API_BASE}/shipping/lookup/411001?subtotal=1500`);
    const data1500 = await res1500.json();
    const mhOpt1500 = data1500.options.find(o => o.id === 'maharashtra_delivery');
    assert(mhOpt1500.charge === 0, 'Pincode 411001 subtotal=1500 returns charge=0 FREE');

    // -----------------------------------------------------------------
    // 2. HTTP TEST: /coupons/available endpoint
    // -----------------------------------------------------------------
    console.log('\n2. Testing /coupons/available eligibility against cart...');
    const couponRes = await fetch(`${API_BASE}/coupons/available`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: testProduct._id.toString(), qty: 1 }],
        subtotal: testProduct.price
      })
    });
    const couponData = await couponRes.json();
    assert(couponData.ok === true, '/coupons/available returns ok: true');
    assert(Array.isArray(couponData.available), 'available is an array');
    assert(Array.isArray(couponData.unavailable), 'unavailable is an array');

    const hasTestSave100 = couponData.available.some(c => c.code === 'TESTSAVE100');
    assert(hasTestSave100 === true, 'TESTSAVE100 (min 1000, subtotal 1500) is in Available Coupons');

    const unavailWelcome10 = couponData.unavailable.find(c => c.code === 'TESTWELCOME10');
    assert(Boolean(unavailWelcome10), 'TESTWELCOME10 (min 2000, subtotal 1500) is in Unavailable Coupons');
    assert(unavailWelcome10.reason.includes('more to unlock'), 'Unavailable coupon includes clear reason to unlock');

    const unavailExpired = couponData.unavailable.find(c => c.code === 'TESTEXPIRED');
    assert(Boolean(unavailExpired) && unavailExpired.reason.includes('expired'), 'TESTEXPIRED is in Unavailable Coupons with reason');

    const unavailLimit = couponData.unavailable.find(c => c.code === 'TESTLIMIT');
    assert(Boolean(unavailLimit) && unavailLimit.reason.includes('limit reached'), 'TESTLIMIT is in Unavailable Coupons with reason');

    // -----------------------------------------------------------------
    // 3. HTTP TEST: Customer Order Creation (Server-side Source of Truth)
    // -----------------------------------------------------------------
    console.log('\n3. Testing Customer Order Placement with server-authoritative fields...');
    const orderPayload = {
      name: 'Integration Test Buyer',
      phone: '9876543210',
      email: 'buyer@example.com',
      address: '202 Luxury Tower, MG Road',
      pincode: '411001',
      shippingMethod: 'maharashtra_delivery',
      couponCode: 'TESTSAVE100',
      agreeTerms: true,
      items: [{ id: testProduct._id.toString(), qty: 1 }],
      // Attempted client manipulation: try to force free gift and fake delivery date
      freeGift: { included: true },
      confirmedAt: new Date().toISOString(),
      expectedDeliveryDate: new Date('2099-01-01').toISOString()
    };

    const createRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const createData = await createRes.json();
    assert(createRes.status === 200 || createRes.status === 201, 'Order created successfully');
    const created = createData.order;

    // Security assertions:
    assert(created.free_gift.included === false, 'Security: Customer payload CANNOT set free_gift.included = true');
    assert(created.confirmed_at === null, 'Security: Customer payload CANNOT set confirmed_at');
    assert(created.expected_delivery_date === null, 'Security: Customer payload CANNOT set expected_delivery_date');
    assert(created.shipping === 0, 'Server calculated FREE shipping for subtotal >= 1500');
    assert(created.coupon_discount === 100, 'Server calculated TESTSAVE100 discount = 100');

    // -----------------------------------------------------------------
    // 4. HTTP TEST: Admin Payment Verification with Free Gift Checkbox
    // -----------------------------------------------------------------
    console.log('\n4. Testing Admin Payment Verification with Free Gift Checkbox...');
    const verifyRes = await fetch(`${API_BASE}/admin/orders/${created.id || created._id}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        paymentTransactionId: 'UTR-VERIF-99887766',
        paymentApp: 'Google Pay',
        freeGiftIncluded: true
      })
    });
    const verifyData = await verifyRes.json();
    if (verifyRes.status !== 200) {
      console.error('Verify failed with status:', verifyRes.status, verifyData);
    }
    assert(verifyRes.status === 200, 'Admin verify-payment returned HTTP 200');
    const verifiedOrder = verifyData.order;

    assert(verifiedOrder.payment_status === 'verified', 'Payment status is verified');
    assert(verifiedOrder.order_status === 'confirmed', 'Order status is confirmed');
    assert(verifiedOrder.free_gift.included === true, 'Free gift included is true');
    assert(verifiedOrder.confirmed_at !== null, 'confirmed_at is recorded');
    assert(verifiedOrder.expected_delivery_date !== null, 'expected_delivery_date is recorded');

    const confDate = new Date(verifiedOrder.confirmed_at);
    const expDate = new Date(verifiedOrder.expected_delivery_date);
    const diffDays = Math.round((expDate.getTime() - confDate.getTime()) / (1000 * 60 * 60 * 24));
    assert(diffDays === 20, 'expected_delivery_date is exactly confirmed_at + 20 days');

    // -----------------------------------------------------------------
    // 5. HTTP TEST: Customer Live Tracking Endpoint
    // -----------------------------------------------------------------
    console.log('\n5. Testing Customer Order Tracking Endpoint...');
    const trackRes = await fetch(`${API_BASE}/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNo: created.order_no })
    });
    const trackData = await trackRes.json();
    assert(trackData.ok === true, 'Tracking endpoint returns ok: true');
    const tracked = trackData.order;

    assert(tracked.free_gift.included === true, 'Customer tracking exposes free_gift.included = true');
    assert(tracked.confirmed_at !== null, 'Customer tracking exposes confirmed_at');
    assert(tracked.expected_delivery_date !== null, 'Customer tracking exposes expected_delivery_date');
    assert(tracked.order_status === 'confirmed', 'Customer tracking shows confirmed status');

    // Clean up created test data
    await Order.findByIdAndDelete(created.id || created._id);
    await Coupon.deleteMany({ code: { $in: ['TESTSAVE100', 'TESTWELCOME10', 'TESTEXPIRED', 'TESTLIMIT'] } });
    await Product.findByIdAndDelete(testProduct._id);

    console.log('\n================================================================');
    console.log(`ALL HTTP INTEGRATION TESTS COMPLETED: ${passed}/${total} PASSED (100% SUCCESS)`);
    console.log('================================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  }
}

runHttpIntegrationTests().catch((err) => {
  console.error('HTTP Integration Test Failed:', err);
  process.exit(1);
});
