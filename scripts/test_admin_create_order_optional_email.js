import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../server/models/Order.js';
import { ReviewToken } from '../server/models/ReviewToken.js';
import { Review } from '../server/models/Review.js';
import { Product } from '../server/models/Product.js';
import { isValidEmail } from '../server/middleware/securityMiddleware.js';
import {
  sendOrderPlacedEmail,
  sendOrderConfirmedEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendCancellationApprovedEmail,
  sendRefundCompletedEmail,
  sendAssistedOrderEmail,
  resendOrderEmail
} from '../server/services/emailService.js';
import { generateOrderNo } from '../server/services/orderIdService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nathshikha';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('ADMIN PANEL CREATE ORDER: OPTIONAL EMAIL VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB database successfully.\n');

  const createdOrderIds = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Validation Helper Behavior for Optional vs Valid vs Invalid
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Validation Helper Unit Tests ---');
    assert(isValidEmail('valid.user@example.com') === true, 'Standard email is valid');
    assert(isValidEmail('customer@nathshikha.in') === true, 'Domain email is valid');
    assert(isValidEmail('') === false, 'Empty string is not a valid email format');
    assert(isValidEmail(null) === false, 'null is not a valid email format');
    assert(isValidEmail('notanemail') === false, 'String without @ is invalid');
    assert(isValidEmail('user@') === false, 'Incomplete domain is invalid');
    assert(isValidEmail('@domain.com') === false, 'Missing username is invalid');

    // Test the logic used in Create Order form / backend endpoint
    function validateCreateOrderEmail(input) {
      const trimmed = typeof input === 'string' ? input.trim() : '';
      if (!trimmed) {
        return { ok: true, email: null };
      }
      if (!isValidEmail(trimmed)) {
        return { ok: false, error: 'Please enter a valid email address or leave it blank.' };
      }
      return { ok: true, email: trimmed.toLowerCase() };
    }

    assert(validateCreateOrderEmail('').ok === true && validateCreateOrderEmail('').email === null, 'Blank string accepted as null');
    assert(validateCreateOrderEmail('   ').ok === true && validateCreateOrderEmail('   ').email === null, 'Whitespace-only string accepted as null');
    assert(validateCreateOrderEmail(null).ok === true && validateCreateOrderEmail(null).email === null, 'null accepted as null');
    assert(validateCreateOrderEmail(undefined).ok === true && validateCreateOrderEmail(undefined).email === null, 'undefined accepted as null');
    assert(validateCreateOrderEmail('customer@example.com').ok === true && validateCreateOrderEmail('customer@example.com').email === 'customer@example.com', 'Valid email accepted and lowercased');
    assert(validateCreateOrderEmail('bad-email').ok === false, 'Invalid email rejected with clear error');

    // -----------------------------------------------------------------
    // TEST 2: Create Order Model Instance with Blank/Null Email
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Order Creation in DB without Email ---');
    const dummyProduct = await Product.findOne();
    const orderNoNoEmail = await generateOrderNo(2097);

    const orderWithoutEmail = await Order.create({
      orderNo: orderNoNoEmail,
      name: 'Pooja Sharma',
      phone: '9876543210',
      email: null,
      customerName: 'Pooja Sharma',
      customerPhone: '9876543210',
      customerEmail: null,
      address: 'Flat 402, Lotus Residency, MG Road',
      pincode: '400001',
      city: 'Mumbai',
      state: 'Maharashtra',
      shippingMethod: 'Standard Delivery',
      subtotal: 1500,
      shipping: 0,
      total: 1500,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      items: [
        {
          productId: dummyProduct ? dummyProduct._id : new mongoose.Types.ObjectId(),
          name: dummyProduct ? dummyProduct.name : 'Test Maharashtrian Nath',
          price: 1500,
          qty: 1
        }
      ]
    });
    createdOrderIds.push(orderWithoutEmail._id);

    assert(orderWithoutEmail._id != null, 'Order successfully saved in MongoDB with null email');
    assert(orderWithoutEmail.email === null, 'Order.email is null');
    assert(orderWithoutEmail.customerEmail === null, 'Order.customerEmail is null');

    const jsonNoEmail = orderWithoutEmail.toJSON();
    assert(jsonNoEmail.email === null, 'toJSON email is null');
    assert(jsonNoEmail.customer_email === null, 'toJSON customer_email is null');
    assert(jsonNoEmail.customerEmail === null, 'toJSON customerEmail is null');

    // -----------------------------------------------------------------
    // TEST 3: Create Order Model Instance with Valid Email
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Order Creation in DB with Valid Email ---');
    const orderNoWithEmail = await generateOrderNo(2097);
    const orderWithEmail = await Order.create({
      orderNo: orderNoWithEmail,
      name: 'Anita Deshmukh',
      phone: '9822012345',
      email: 'anita.deshmukh@example.com',
      customerName: 'Anita Deshmukh',
      customerPhone: '9822012345',
      customerEmail: 'anita.deshmukh@example.com',
      address: '12 Shivaji Nagar',
      pincode: '411005',
      city: 'Pune',
      state: 'Maharashtra',
      shippingMethod: 'Standard Delivery',
      subtotal: 2200,
      shipping: 0,
      total: 2200,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      items: [
        {
          productId: dummyProduct ? dummyProduct._id : new mongoose.Types.ObjectId(),
          name: dummyProduct ? dummyProduct.name : 'Test Maharashtrian Nath',
          price: 2200,
          qty: 1
        }
      ]
    });
    createdOrderIds.push(orderWithEmail._id);

    assert(orderWithEmail.email === 'anita.deshmukh@example.com', 'Order saved with valid email');
    assert(orderWithEmail.customerEmail === 'anita.deshmukh@example.com', 'Order.customerEmail is set');
    const jsonWithEmail = orderWithEmail.toJSON();
    assert(jsonWithEmail.customer_email === 'anita.deshmukh@example.com', 'toJSON customer_email is valid');

    // -----------------------------------------------------------------
    // TEST 4: Email Notification Safety on Orders Without Email
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Email Notification Pathways on Order Without Email ---');
    
    // 4A: Order Placed
    const resPlaced = await sendOrderPlacedEmail(orderWithoutEmail);
    assert(resPlaced.skipped === true && resPlaced.success === true, 'sendOrderPlacedEmail gracefully skipped without throwing');

    // 4B: Order Confirmed
    const resConfirmed = await sendOrderConfirmedEmail(orderWithoutEmail);
    assert(resConfirmed.skipped === true && resConfirmed.success === true, 'sendOrderConfirmedEmail gracefully skipped without throwing');

    // 4C: Order Shipped
    const resShipped = await sendOrderShippedEmail(orderWithoutEmail);
    assert(resShipped.skipped === true && resShipped.success === true, 'sendOrderShippedEmail gracefully skipped without throwing');

    // 4D: Order Delivered
    const resDelivered = await sendOrderDeliveredEmail(orderWithoutEmail);
    assert(resDelivered.skipped === true && resDelivered.success === true, 'sendOrderDeliveredEmail gracefully skipped without throwing');

    // 4E: Cancellation Approved
    const resCancel = await sendCancellationApprovedEmail(orderWithoutEmail);
    assert(resCancel.skipped === true && resCancel.success === true, 'sendCancellationApprovedEmail gracefully skipped without throwing');

    // 4F: Refund Completed
    const resRefund = await sendRefundCompletedEmail(orderWithoutEmail);
    assert(resRefund.skipped === true && resRefund.success === true, 'sendRefundCompletedEmail gracefully skipped without throwing');

    // 4G: Assisted Order Email
    const resAssisted = await sendAssistedOrderEmail(orderWithoutEmail);
    assert(resAssisted.skipped === true && resAssisted.success === true, 'sendAssistedOrderEmail gracefully skipped without throwing');

    // 4H: Resend Order Email
    const resResend = await resendOrderEmail(orderWithoutEmail, 'ORDER_CONFIRMED');
    assert(resResend.skipped === true && resResend.success === false && resResend.error.includes('No customer email'), 'resendOrderEmail returned clean error explaining no email');

    // Check that order did NOT get flagged as email delivery failed!
    const reloadedOrderNoEmail = await Order.findById(orderWithoutEmail._id);
    assert(reloadedOrderNoEmail.emailDeliveryStatus === 'none', 'emailDeliveryStatus remains "none", not "failed"');

    // -----------------------------------------------------------------
    // TEST 5: Review Token & Review Creation on Order Without Email
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Review Tokens & Reviews on Order Without Email ---');
    const token = await ReviewToken.create({
      token: 'test-token-' + Date.now(),
      orderId: orderWithoutEmail._id,
      productId: dummyProduct ? dummyProduct._id : new mongoose.Types.ObjectId(),
      customerName: orderWithoutEmail.name,
      customerEmail: orderWithoutEmail.email || null,
      expiresAt: new Date(Date.now() + 86400000)
    });
    assert(token._id != null, 'ReviewToken created for order without email');
    assert(token.customerEmail === null, 'ReviewToken customerEmail is null');

    const review = await Review.create({
      productId: dummyProduct ? dummyProduct._id : new mongoose.Types.ObjectId(),
      orderId: orderWithoutEmail._id,
      customerName: orderWithoutEmail.name,
      customerEmail: orderWithoutEmail.email || null,
      rating: 5,
      comment: 'Beautiful nath, fast shipping!'
    });
    assert(review._id != null, 'Review created for order without email');
    assert(review.customerEmail === null, 'Review customerEmail is null');

    // Clean up review and token
    await ReviewToken.deleteOne({ _id: token._id });
    await Review.deleteOne({ _id: review._id });

    // -----------------------------------------------------------------
    // TEST 6: Order Operations & Immutability Verification
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Order Operations & Immutability Checks ---');
    
    // Modify address on order without email
    orderWithoutEmail.address = 'Updated Delivery Address, Building 2';
    await orderWithoutEmail.save();
    assert(orderWithoutEmail.address === 'Updated Delivery Address, Building 2', 'Order address updated successfully');

    // Ensure customerEmail / email immutability guard
    let threwOnEmailChange = false;
    try {
      const orderToTamper = await Order.findById(orderWithEmail._id);
      orderToTamper.customerEmail = 'tampered@fake.com';
      await orderToTamper.save();
    } catch (e) {
      threwOnEmailChange = true;
    }
    assert(threwOnEmailChange === true, 'Immutability guard prevents unauthorized tampering of buyer email');

    // Ensure admin email correction works when explicitly allowed
    const orderToCorrect = await Order.findById(orderWithoutEmail._id);
    orderToCorrect._allowEmailCorrection = true;
    orderToCorrect.email = 'pooja.corrected@example.com';
    orderToCorrect.customerEmail = 'pooja.corrected@example.com';
    await orderToCorrect.save();
    assert(orderToCorrect.email === 'pooja.corrected@example.com', 'Admin email correction works on previously-blank email');

    console.log('\n===============================================================');
    console.log(`ALL TESTS PASSED! (${passed} tests passed, 0 failed)`);
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ Test suite encountered an error:', err);
    process.exitCode = 1;
  } finally {
    // Clean up created test orders
    if (createdOrderIds.length > 0) {
      console.log(`Cleaning up ${createdOrderIds.length} test order(s)...`);
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTestSuite();
