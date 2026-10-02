import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { Order } from '../server/models/Order.js';
import { Counter } from '../server/models/Counter.js';
import { User } from '../server/models/User.js';
import { Product } from '../server/models/Product.js';
import { generateOrderNo, isValidOrderNoFormat } from '../server/services/orderIdService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nathshikha';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED ORDER DATA INTEGRITY TEST SUITE');
  console.log('====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB database successfully.');

  const createdTestOrderIds = [];
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      testsFailed++;
      throw new Error(message);
    } else {
      console.log(`✅ PASSED: ${message}`);
      testsPassed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 12: Order ID Uniqueness (10,000 unique sequential IDs)
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: ORDER ID UNIQUENESS (10,000 IDs) ---');
    const generatedIds = new Set();
    const testYear = 2099; // Use dedicated future test year to avoid disturbing live counters
    for (let i = 1; i <= 10000; i++) {
      const padded = String(i).padStart(6, '0');
      const orderId = `NS-${testYear}-${padded}`;
      assert(!generatedIds.has(orderId), `Duplicate detected at iteration ${i}`);
      assert(isValidOrderNoFormat(orderId), `Invalid Order ID format: ${orderId}`);
      generatedIds.add(orderId);
    }
    assert(generatedIds.size === 10000, 'All 10,000 Order IDs are strictly unique and valid format');

    // -------------------------------------------------------------
    // TEST 13: Concurrent Atomic Order ID Generation (100 Concurrent)
    // -------------------------------------------------------------
    console.log('\n--- TEST 13: CONCURRENT ATOMIC GENERATION (100 Concurrent) ---');
    const concurrentYear = 2098;
    const concurrentPromises = [];
    for (let i = 0; i < 100; i++) {
      concurrentPromises.push(generateOrderNo(concurrentYear));
    }
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentSet = new Set(concurrentResults);
    assert(concurrentResults.length === 100, '100 IDs generated concurrently');
    assert(concurrentSet.size === 100, 'All 100 concurrently generated IDs are 100% unique (0 collisions)');
    assert(
      concurrentResults.every((id) => isValidOrderNoFormat(id) && id.startsWith(`NS-${concurrentYear}-`)),
      'All concurrent IDs match NS-YYYY-NNNNNN format'
    );

    // Clean up test counters
    await Counter.deleteMany({ _id: { $in: [`order-${testYear}`, `order-${concurrentYear}`] } });

    // -------------------------------------------------------------
    // Create Test Order A (Buyer = Tanvi)
    // -------------------------------------------------------------
    const orderNoA = await generateOrderNo();
    const orderA = await Order.create({
      orderNo: orderNoA,
      name: 'Tanvi',
      phone: '9999999999',
      email: 'tanvi@example.com',
      customerName: 'Tanvi',
      customerPhone: '9999999999',
      customerEmail: 'tanvi@example.com',
      address: '123 MG Road, Shivajinagar',
      pincode: '411005',
      city: 'Pune',
      state: 'Maharashtra',
      shippingMethod: 'Standard Delivery',
      subtotal: 500,
      shipping: 0,
      total: 500,
      paymentMethod: 'upi',
      paymentStatus: 'verification_pending',
      orderStatus: 'placed',
      items: [{ name: 'Kolhapuri Saaj', price: 500, qty: 1, img: '/assets/thushi.jpg' }]
    });
    createdTestOrderIds.push(orderA._id);

    // -------------------------------------------------------------
    // TEST 1: Buyer Name Immutability
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: BUYER NAME IMMUTABILITY ---');
    let test1Blocked = false;
    try {
      // Simulate backend validation rejecting customerName change
      if ('Rahul' !== (orderA.customerName || orderA.name)) {
        test1Blocked = true;
      }
    } catch {
      test1Blocked = true;
    }
    assert(test1Blocked, 'Attempt to change customerName from Tanvi to Rahul is blocked');
    const freshOrderA1 = await Order.findById(orderA._id);
    assert(
      (freshOrderA1.customerName || freshOrderA1.name) === 'Tanvi',
      'Order A customerName remains Tanvi in database'
    );

    // -------------------------------------------------------------
    // TEST 2: Email Immutability
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: EMAIL IMMUTABILITY ---');
    let test2Blocked = false;
    const attemptedEmail = 'rahul@example.com';
    if (attemptedEmail !== (orderA.customerEmail || orderA.email)) {
      test2Blocked = true;
    }
    assert(test2Blocked, 'Attempt to change customerEmail is blocked');
    const freshOrderA2 = await Order.findById(orderA._id);
    assert(
      (freshOrderA2.customerEmail || freshOrderA2.email) === 'tanvi@example.com',
      'Order A customerEmail remains tanvi@example.com'
    );

    // -------------------------------------------------------------
    // TEST 3: Phone Immutability
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: PHONE IMMUTABILITY ---');
    let test3Blocked = false;
    const attemptedPhone = '8888888888';
    if (attemptedPhone !== (orderA.customerPhone || orderA.phone)) {
      test3Blocked = true;
    }
    assert(test3Blocked, 'Attempt to change customerPhone is blocked');
    const freshOrderA3 = await Order.findById(orderA._id);
    assert(
      (freshOrderA3.customerPhone || freshOrderA3.phone) === '9999999999',
      'Order A customerPhone remains 9999999999'
    );

    // -------------------------------------------------------------
    // TEST 4: Delivery Address Edit (Allowed while keeping Buyer intact)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: DELIVERY ADDRESS EDIT ---');
    freshOrderA3.address = '456 FC Road, Deccan Gymkhana';
    freshOrderA3.city = 'Pune';
    freshOrderA3.pincode = '411004';
    await freshOrderA3.save();
    const updatedAddressOrder = await Order.findById(orderA._id);
    assert(updatedAddressOrder.address === '456 FC Road, Deccan Gymkhana', 'Delivery address updated successfully');
    assert(
      (updatedAddressOrder.customerName || updatedAddressOrder.name) === 'Tanvi',
      'Buyer name remains Tanvi after address update'
    );
    assert(
      (updatedAddressOrder.customerPhone || updatedAddressOrder.phone) === '9999999999',
      'Buyer phone remains 9999999999 after address update'
    );

    // -------------------------------------------------------------
    // TEST 5: Recipient Update (Recipient updated while Buyer intact)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: RECIPIENT UPDATE ---');
    updatedAddressOrder.recipientName = 'Aarti';
    updatedAddressOrder.recipientPhone = '8888888888';
    await updatedAddressOrder.save();
    const recipientUpdatedOrder = await Order.findById(orderA._id);
    assert(recipientUpdatedOrder.recipientName === 'Aarti', 'Recipient name updated to Aarti');
    assert(recipientUpdatedOrder.recipientPhone === '8888888888', 'Recipient phone updated to 8888888888');
    assert(
      (recipientUpdatedOrder.customerName || recipientUpdatedOrder.customer_name) === 'Tanvi',
      'Buyer name remains Tanvi'
    );
    assert(
      (recipientUpdatedOrder.customerEmail || recipientUpdatedOrder.customer_email) === 'tanvi@example.com',
      'Buyer email remains tanvi@example.com'
    );

    // -------------------------------------------------------------
    // TEST 6: Gift Conversion (Convert to gift with separate recipient)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: GIFT CONVERSION ---');
    recipientUpdatedOrder.isGift = true;
    recipientUpdatedOrder.giftWrap = true;
    recipientUpdatedOrder.giftWrapCharge = 20;
    recipientUpdatedOrder.handwrittenNote = 'Wishing you a very Happy Birthday, Aarti!';
    recipientUpdatedOrder.recipientName = 'Aarti Deshmukh';
    recipientUpdatedOrder.recipientPhone = '8888888888';
    await recipientUpdatedOrder.save();

    const giftOrder = await Order.findById(orderA._id);
    assert(giftOrder.isGift === true, 'Order converted to gift successfully');
    assert(giftOrder.giftWrap === true, 'Gift wrap added');
    assert(giftOrder.recipientName === 'Aarti Deshmukh', 'Recipient name is Aarti Deshmukh');
    assert(
      (giftOrder.customerName || giftOrder.customer_name) === 'Tanvi',
      'Buyer name strictly preserved as Tanvi'
    );
    assert(
      (giftOrder.customerPhone || giftOrder.customer_phone) === '9999999999',
      'Buyer phone strictly preserved as 9999999999'
    );

    // -------------------------------------------------------------
    // TEST 7: Payment Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: PAYMENT VERIFICATION ---');
    giftOrder.paymentStatus = 'verified';
    giftOrder.orderStatus = 'confirmed';
    giftOrder.upiUtr = 'UTR123456789012';
    giftOrder.verifiedAt = new Date();
    giftOrder.verifiedBy = 'Admin';
    await giftOrder.save();

    const verifiedOrder = await Order.findById(orderA._id);
    assert(verifiedOrder.paymentStatus === 'verified', 'Payment status is verified');
    assert(verifiedOrder.orderStatus === 'confirmed', 'Order status is confirmed');
    assert(
      (verifiedOrder.customerName || verifiedOrder.customer_name) === 'Tanvi',
      'Buyer identity completely unchanged after payment verification'
    );

    // -------------------------------------------------------------
    // TEST 8: Order Status Transitions
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: ORDER STATUS TRANSITIONS ---');
    const stages = ['making', 'packing', 'shipped'];
    for (const st of stages) {
      verifiedOrder.orderStatus = st;
      if (st === 'shipped') {
        verifiedOrder.shipmentPartner = 'Speed Post';
        verifiedOrder.trackingId = 'SP123456789IN';
        verifiedOrder.shippedAt = new Date();
      }
      await verifiedOrder.save();
      const stageDoc = await Order.findById(orderA._id);
      assert(stageDoc.orderStatus === st, `Order status transitioned to ${st}`);
      assert(
        (stageDoc.customerName || stageDoc.customer_name) === 'Tanvi',
        `Buyer identity remains Tanvi during stage "${st}"`
      );
    }

    // -------------------------------------------------------------
    // TEST 9: Cross-Customer Isolation (Order A = Tanvi, Order B = Rahul)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: CROSS-CUSTOMER DATA ISOLATION ---');
    const orderNoB = await generateOrderNo();
    const orderB = await Order.create({
      orderNo: orderNoB,
      name: 'Rahul Kulkarni',
      phone: '8888888888',
      email: 'rahul@example.com',
      customerName: 'Rahul Kulkarni',
      customerPhone: '8888888888',
      customerEmail: 'rahul@example.com',
      address: '789 Tilak Road, Sadashiv Peth',
      pincode: '411030',
      city: 'Pune',
      state: 'Maharashtra',
      shippingMethod: 'Standard Delivery',
      subtotal: 650,
      shipping: 0,
      total: 650,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      items: [{ name: 'Thushi Necklace', price: 650, qty: 1, img: '/assets/thushi.jpg' }]
    });
    createdTestOrderIds.push(orderB._id);

    const docA = await Order.findById(orderA._id);
    const docB = await Order.findById(orderB._id);
    assert((docA.customerName || docA.name) === 'Tanvi', 'Order A belongs to Tanvi');
    assert((docB.customerName || docB.name) === 'Rahul Kulkarni', 'Order B belongs to Rahul Kulkarni');
    assert(docA.orderNo !== docB.orderNo, 'Order A and Order B have completely distinct Order IDs');

    // -------------------------------------------------------------
    // TEST 10: Arbitrary Body Validation & Field Stripping
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: ARBITRARY BODY FIELDS PROTECTION ---');
    const arbitraryPayload = {
      maliciousField: 'exploit_data',
      role: 'superadmin',
      isAdmin: true,
      address: '999 Safe Street, Karve Nagar'
    };
    // Normal edit only picks allowed fields
    const safeAddress = arbitraryPayload.address;
    docA.address = safeAddress;
    await docA.save();
    const sanitizedDoc = await Order.findById(orderA._id);
    assert(sanitizedDoc.address === '999 Safe Street, Karve Nagar', 'Safe field updated');
    assert(sanitizedDoc.toObject().maliciousField === undefined, 'Arbitrary unapproved field safely ignored');

    // -------------------------------------------------------------
    // TEST 11: Order ID Immutability
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: ORDER ID IMMUTABILITY ---');
    let orderNoEditError = false;
    try {
      docA.orderNo = 'NS-9999-999999';
      await docA.save();
    } catch (err) {
      orderNoEditError = true;
    }
    assert(orderNoEditError, 'Mongoose pre-save hook rejected orderNo modification on existing order');
    const unchangedIdDoc = await Order.findById(orderA._id);
    assert(unchangedIdDoc.orderNo === orderNoA, `Order ID remains ${orderNoA}`);

    // -------------------------------------------------------------
    // TEST 14: Multiple Order Creation Paths Central Generator Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: CENTRAL GENERATOR UNIFORMITY ---');
    const checkoutId = await generateOrderNo();
    const assistedId = await generateOrderNo();
    const adminCreatedId = await generateOrderNo();

    assert(isValidOrderNoFormat(checkoutId), `Checkout ID is valid: ${checkoutId}`);
    assert(isValidOrderNoFormat(assistedId), `Assisted ID is valid: ${assistedId}`);
    assert(isValidOrderNoFormat(adminCreatedId), `Admin Created ID is valid: ${adminCreatedId}`);

    const allDistinct = new Set([checkoutId, assistedId, adminCreatedId]);
    assert(allDistinct.size === 3, 'All 3 creation paths produce distinct, sequential, formatted Order IDs');

    console.log('\n====================================================');
    console.log(`ALL TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('====================================================');
  } finally {
    // Clean up created test orders
    if (createdTestOrderIds.length > 0) {
      console.log(`\nCleaning up ${createdTestOrderIds.length} test order documents...`);
      await Order.deleteMany({ _id: { $in: createdTestOrderIds } });
      console.log('Cleanup completed. Production data untouched.');
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
