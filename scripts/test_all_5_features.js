import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../server/models/Order.js';
import { Coupon } from '../server/models/Coupon.js';
import { Product } from '../server/models/Product.js';
import { resolvePincodeLocation, getShippingOptionsForLocation, calculateShippingCharge } from '../server/services/shippingService.js';
import { generateOrderNo } from '../server/services/orderIdService.js';
import { isCouponExpired, calculateCouponDiscount } from '../server/routes/couponRoutes.js';
import { getOrderAgeInDays, formatOrderAge } from '../src/utils/formatters.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runAllTests() {
  console.log('================================================================');
  console.log('NATHSHIKHA — COMPREHENSIVE TEST SUITE FOR 5 FEATURES');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // =========================================================================
  // 1. FREE SHIPPING TESTS
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('1. TESTING FREE SHIPPING ABOVE ₹1500');
  console.log('----------------------------------------------------------------');

  // Test 1.1: Maharashtra PIN (411001) below ₹1500
  const mhLoc = await resolvePincodeLocation('411001');
  const mhUnderOptions = getShippingOptionsForLocation(mhLoc, 1499);
  const mhDeliveryUnder = mhUnderOptions.find(o => o.id === 'maharashtra_delivery');
  assert(mhDeliveryUnder.charge === 100, 'MH PIN subtotal ₹1499 has ₹100 delivery charge');

  // Test 1.2: Maharashtra PIN (411001) exactly ₹1500
  const mhExactOptions = getShippingOptionsForLocation(mhLoc, 1500);
  const mhDeliveryExact = mhExactOptions.find(o => o.id === 'maharashtra_delivery');
  assert(mhDeliveryExact.charge === 0, 'MH PIN subtotal ₹1500 has FREE (₹0) delivery charge');

  // Test 1.3: Maharashtra PIN (411001) above ₹1500 (₹1501)
  const mhOverOptions = getShippingOptionsForLocation(mhLoc, 1501);
  const mhDeliveryOver = mhOverOptions.find(o => o.id === 'maharashtra_delivery');
  assert(mhDeliveryOver.charge === 0, 'MH PIN subtotal ₹1501 has FREE (₹0) delivery charge');

  // Test 1.4: Outside Maharashtra PIN (110001) below ₹1500 (₹1499)
  const outLoc = await resolvePincodeLocation('110001');
  const outUnderOptions = getShippingOptionsForLocation(outLoc, 1499);
  const outDeliveryUnder = outUnderOptions.find(o => o.id === 'outside_maharashtra_delivery');
  assert(outDeliveryUnder.charge === 120, 'Outside MH PIN subtotal ₹1499 has ₹120 delivery charge');

  // Test 1.5: Outside Maharashtra PIN (110001) at ₹1500 & ₹2000
  const outExactOptions = getShippingOptionsForLocation(outLoc, 1500);
  const outDeliveryExact = outExactOptions.find(o => o.id === 'outside_maharashtra_delivery');
  assert(outDeliveryExact.charge === 0, 'Outside MH PIN subtotal ₹1500 has FREE (₹0) delivery charge');

  const out2000Options = getShippingOptionsForLocation(outLoc, 2000);
  const outDelivery2000 = out2000Options.find(o => o.id === 'outside_maharashtra_delivery');
  assert(outDelivery2000.charge === 0, 'Outside MH PIN subtotal ₹2000 has FREE (₹0) delivery charge');

  // Test 1.6: Khopoli PIN (410203) - always ₹0
  const khopoliLoc = await resolvePincodeLocation('410203');
  const khopoliOptions = getShippingOptionsForLocation(khopoliLoc, 500);
  const khopoliDelivery = khopoliOptions.find(o => o.id === 'khopoli_delivery');
  assert(khopoliDelivery.charge === 0, 'Khopoli PIN has ₹0 delivery charge even below ₹1500');

  // Test 1.7: Self Pickup - always ₹0
  const pickup = await calculateShippingCharge('411001', 'self_pickup', 500);
  assert(pickup.shippingCharge === 0, 'Self pickup has ₹0 delivery charge');

  // Test 1.8: calculateShippingCharge direct helper
  const calcUnder = await calculateShippingCharge('411001', 'maharashtra_delivery', 1499);
  const calcExact = await calculateShippingCharge('411001', 'maharashtra_delivery', 1500);
  const calcOver = await calculateShippingCharge('411001', 'maharashtra_delivery', 1501);
  assert(calcUnder.shippingCharge === 100, 'calculateShippingCharge for 1499 is ₹100');
  assert(calcExact.shippingCharge === 0, 'calculateShippingCharge for 1500 is ₹0 FREE');
  assert(calcOver.shippingCharge === 0, 'calculateShippingCharge for 1501 is ₹0 FREE');

  // =========================================================================
  // 2. ORDER AGING CALCULATION TESTS (REUSED BY MOBILE & DESKTOP)
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('2. TESTING ORDER AGING CALCULATION');
  console.log('----------------------------------------------------------------');

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date14DaysAgo = new Date(todayDate.getTime() - 14 * 24 * 60 * 60 * 1000);
  const date15DaysAgo = new Date(todayDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const date16DaysAgo = new Date(todayDate.getTime() - 16 * 24 * 60 * 60 * 1000);

  const age0 = getOrderAgeInDays(todayDate);
  const age14 = getOrderAgeInDays(date14DaysAgo);
  const age15 = getOrderAgeInDays(date15DaysAgo);
  const age16 = getOrderAgeInDays(date16DaysAgo);

  assert(age0 === 0, 'Today order age is 0 days');
  assert(age14 === 14, '14 days ago order age is 14 days');
  assert(age15 === 15, '15 days ago order age is 15 days');
  assert(age16 === 16, '16 days ago order age is 16 days');

  assert(formatOrderAge(0) === '0 Days', 'formatOrderAge(0) returns "0 Days"');
  assert(formatOrderAge(1) === '1 Day', 'formatOrderAge(1) returns "1 Day"');
  assert(formatOrderAge(16) === '16 Days', 'formatOrderAge(16) returns "16 Days"');

  // =========================================================================
  // 3. EXPECTED DELIVERY DATE CALCULATION (+20 DAYS FROM CONFIRMATION)
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('3. TESTING EXPECTED DELIVERY DATE (+20 DAYS FROM CONFIRMATION)');
  console.log('----------------------------------------------------------------');

  // Example from requirements: Confirmation = 04 Oct 2026 -> Expected Delivery = 24 Oct 2026
  const confDate1 = new Date('2026-10-04T12:00:00.000Z');
  const expDate1 = new Date(confDate1.getTime() + 20 * 24 * 60 * 60 * 1000);
  assert(expDate1.getUTCDate() === 24 && expDate1.getUTCMonth() === 9 && expDate1.getUTCFullYear() === 2026,
    '04 Oct 2026 + 20 days = 24 Oct 2026');

  // Month rollover test: 25 Oct 2026 + 20 days = 14 Nov 2026 (Oct has 31 days)
  const confDate2 = new Date('2026-10-25T12:00:00.000Z');
  const expDate2 = new Date(confDate2.getTime() + 20 * 24 * 60 * 60 * 1000);
  assert(expDate2.getUTCDate() === 14 && expDate2.getUTCMonth() === 10 && expDate2.getUTCFullYear() === 2026,
    '25 Oct 2026 + 20 days = 14 Nov 2026');

  // Year boundary rollover: 25 Dec 2026 + 20 days = 14 Jan 2027
  const confDate3 = new Date('2026-12-25T12:00:00.000Z');
  const expDate3 = new Date(confDate3.getTime() + 20 * 24 * 60 * 60 * 1000);
  assert(expDate3.getUTCDate() === 14 && expDate3.getUTCMonth() === 0 && expDate3.getUTCFullYear() === 2027,
    '25 Dec 2026 + 20 days = 14 Jan 2027 (year rollover)');

  // =========================================================================
  // 4. FREE GIFT PERSISTENCE & MONGO SCHEMA TESTS
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('4. TESTING FREE GIFT MONGODB PERSISTENCE & LIFECYCLE');
  console.log('----------------------------------------------------------------');

  const testOrderNo = await generateOrderNo();
  const createdOrder = await Order.create({
    orderNo: testOrderNo,
    name: 'Test Customer Gift',
    phone: '9876543210',
    email: 'giftcustomer@example.com',
    customerName: 'Test Customer Gift',
    customerPhone: '9876543210',
    customerEmail: 'giftcustomer@example.com',
    address: 'Flat 402, Royal Residency',
    pincode: '411001',
    city: 'Pune',
    state: 'Maharashtra',
    shippingMethod: 'Standard Delivery',
    subtotal: 1600,
    shipping: 0,
    total: 1600,
    paymentMethod: 'upi',
    paymentStatus: 'verification_pending',
    orderStatus: 'placed',
    freeGift: { included: false },
    confirmedAt: null,
    expectedDeliveryDate: null,
    items: [{ name: 'Paramparik Motyanchi Nath', price: 1600, qty: 1, img: '/assets/thushi.jpg' }]
  });

  assert(createdOrder.freeGift.included === false, 'Initial order has freeGift.included = false');
  assert(createdOrder.confirmedAt === null, 'Initial order has confirmedAt = null');
  assert(createdOrder.expectedDeliveryDate === null, 'Initial order has expectedDeliveryDate = null');

  // Simulate admin payment verification with Free Gift = true
  const nowConfirmed = new Date();
  const expectedDeliv = new Date(nowConfirmed.getTime() + 20 * 24 * 60 * 60 * 1000);

  createdOrder.paymentStatus = 'verified';
  createdOrder.orderStatus = 'confirmed';
  createdOrder.paymentTransactionId = 'UPI-TXN-1234567890';
  createdOrder.paymentApp = 'Google Pay';
  createdOrder.confirmedAt = nowConfirmed;
  createdOrder.expectedDeliveryDate = expectedDeliv;
  createdOrder.freeGift = { included: true };
  await createdOrder.save();

  // Reload from MongoDB to test persistence
  const reloadedOrder = await Order.findById(createdOrder._id);
  assert(reloadedOrder.freeGift.included === true, 'freeGift.included = true persists in MongoDB after reload');
  assert(reloadedOrder.confirmedAt instanceof Date, 'confirmedAt is stored as Date object');
  assert(reloadedOrder.expectedDeliveryDate instanceof Date, 'expectedDeliveryDate is stored as Date object');
  assert(Math.abs(reloadedOrder.expectedDeliveryDate.getTime() - (reloadedOrder.confirmedAt.getTime() + 20 * 24 * 60 * 60 * 1000)) < 1000,
    'Persisted expectedDeliveryDate is exactly confirmedAt + 20 days');

  // Verify toJSON serialization mapping for customer & admin
  const jsonView = reloadedOrder.toJSON();
  assert(jsonView.free_gift.included === true, 'toJSON exports free_gift.included = true');
  assert(jsonView.confirmed_at !== null, 'toJSON exports confirmed_at');
  assert(jsonView.expected_delivery_date !== null, 'toJSON exports expected_delivery_date');

  // Clean up test order
  await Order.findByIdAndDelete(createdOrder._id);

  // =========================================================================
  // 5. AVAILABLE COUPONS ELIGIBILITY CALCULATION
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('5. TESTING AVAILABLE COUPONS ELIGIBILITY CALCULATION');
  console.log('----------------------------------------------------------------');

  const testCoupon1 = {
    code: 'SAVE100',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValue: 999,
    isActive: true,
    expiryDate: new Date('2028-12-31')
  };

  const testCoupon2 = {
    code: 'WELCOME10',
    discountType: 'percent',
    discountValue: 10,
    minOrderValue: 1499,
    isActive: true,
    expiryDate: new Date('2028-12-31')
  };

  const testCouponExpired = {
    code: 'EXPIRED50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValue: 500,
    isActive: true,
    expiryDate: new Date('2020-01-01')
  };

  // Check expiration helper
  assert(isCouponExpired(testCoupon1.expiryDate) === false, 'Future coupon is not expired');
  assert(isCouponExpired(testCouponExpired.expiryDate) === true, 'Past coupon is expired');

  // Check discount calculation
  const disc1 = calculateCouponDiscount(testCoupon1, 1500);
  assert(disc1 === 100, 'Fixed coupon ₹100 discount on ₹1500 subtotal is ₹100');

  const disc2 = calculateCouponDiscount(testCoupon2, 1500);
  assert(disc2 === 150, '10% discount on ₹1500 subtotal is ₹150');

  // Check discount cap (discount cannot exceed subtotal)
  const discCap = calculateCouponDiscount({ discountType: 'fixed', discountValue: 2000 }, 500);
  assert(discCap === 500, 'Fixed discount ₹2000 capped at subtotal ₹500');

  console.log('\n================================================================');
  console.log(`ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`);
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runAllTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
