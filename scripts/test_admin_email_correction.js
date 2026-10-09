import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Order } from '../server/models/Order.js';
import { User } from '../server/models/User.js';
import { Product } from '../server/models/Product.js';
import { EmailEvent } from '../server/models/EmailEvent.js';
import { isValidEmail } from '../server/middleware/securityMiddleware.js';
import { resendOrderEmail, sendOrderConfirmedEmail, sendOrderShippedEmail } from '../server/services/emailService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nathshikha';
const JWT_SECRET = process.env.JWT_SECRET || 'nathshikha_secret_jwt_key_development_2025';

async function runTests() {
  console.log('=================================================================');
  console.log('STARTING NATHSHIKHA ADMIN EMAIL CORRECTION & DELIVERY TEST SUITE');
  console.log('=================================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB database successfully.');

  let testsPassed = 0;
  let testsFailed = 0;
  const createdTestOrderIds = [];
  const createdTestUserIds = [];

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
    // SETUP: Create Test Customer User & Admin User
    // -------------------------------------------------------------
    console.log('\n--- SETUP: CREATE TEST ACCOUNTS ---');
    const testCustEmail = `cust_${Date.now()}@testnathshikha.com`;
    const customerUser = await User.create({
      name: 'Pooja Verma',
      email: testCustEmail,
      passwordHash: User.hashPassword('Pooja@12345'),
      role: 'customer',
      emailVerified: true
    });
    createdTestUserIds.push(customerUser._id);

    const testAdminEmail = `admin_${Date.now()}@testnathshikha.com`;
    const adminUser = await User.create({
      name: 'Studio Master Admin',
      email: testAdminEmail,
      passwordHash: User.hashPassword('Admin@12345'),
      role: 'admin',
      emailVerified: true
    });
    createdTestUserIds.push(adminUser._id);

    console.log(`✓ Test Customer User created: ${customerUser.email} (ID: ${customerUser._id})`);
    console.log(`✓ Test Admin User created: ${adminUser.email} (ID: ${adminUser._id})`);

    // -------------------------------------------------------------
    // TEST 1: Create Order with Typos in Customer Email (e.g. wrongemail@gmial.com)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: CREATE ORDER WITH INVALID/TYPO EMAIL ---');
    const order1No = `NS-TEST-${Date.now().toString().slice(-6)}`;
    const typoEmail = 'wrongemail@gmial.com';

    const testOrder1 = await Order.create({
      orderNo: order1No,
      userId: customerUser._id,
      name: 'Pooja Verma',
      phone: '9876543210',
      email: typoEmail,
      customerEmail: typoEmail,
      customerName: 'Pooja Verma',
      customerPhone: '9876543210',
      address: 'Plot 42, Heritage Enclave',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      shippingMethod: 'Standard Delivery',
      subtotal: 3500,
      shipping: 0,
      total: 3500,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      upiUtr: 'UTR998877665544',
      items: [
        {
          name: 'Traditional Kolhapuri Saaj',
          price: 3500,
          qty: 1
        }
      ]
    });
    createdTestOrderIds.push(testOrder1._id);

    assert(testOrder1.email === typoEmail, 'Initial order email is typo email');
    assert(testOrder1.customerEmail === typoEmail, 'Initial customerEmail matches typo email');
    assert(testOrder1.total === 3500, 'Order total is ₹3500');

    // -------------------------------------------------------------
    // TEST 2: Email Format Validation
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: EMAIL FORMAT VALIDATION HELPER ---');
    assert(isValidEmail('pooja.verma@gmail.com') === true, 'Valid email passes isValidEmail');
    assert(isValidEmail('admin+saaj@nathshikha.in') === true, 'Valid email with sub-address passes isValidEmail');
    assert(isValidEmail('invalid-email-without-at') === false, 'Missing @ is rejected');
    assert(isValidEmail('spaces in@domain.com') === false, 'Email with spaces is rejected');
    assert(isValidEmail('@nodomain.com') === false, 'Missing local part is rejected');
    assert(isValidEmail('name@') === false, 'Missing domain is rejected');
    assert(isValidEmail('') === false, 'Empty string is rejected');
    assert(isValidEmail(null) === false, 'Null email is rejected');

    // -------------------------------------------------------------
    // TEST 3: Admin Corrects Customer Email (with Audit History)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: ADMIN CORRECTS ORDER CUSTOMER EMAIL ---');
    const correctedEmail = 'pooja.verma@gmail.com';
    const adminNote = 'Customer reached out on WhatsApp to fix gmial typo';

    // Simulate Admin Edit Email operation
    const orderToEdit = await Order.findById(testOrder1._id);
    const previousEmail = orderToEdit.customerEmail || orderToEdit.email;

    orderToEdit._allowEmailCorrection = true;
    orderToEdit.email = correctedEmail;
    orderToEdit.customerEmail = correctedEmail;
    orderToEdit.emailAdminCorrected = true;
    orderToEdit.emailAdminCorrectedAt = new Date();
    orderToEdit.emailAdminCorrectedBy = adminUser.email;

    orderToEdit.editHistory.push({
      editedAt: new Date(),
      editedBy: `${adminUser.name} (${adminUser.email})`,
      changedFields: [`Email corrected: "${previousEmail}" → "${correctedEmail}"`],
      notes: `[Email Correction] ${adminNote}`
    });

    await orderToEdit.save();

    // Verify persisted document in MongoDB
    const persistedOrder = await Order.findById(testOrder1._id);
    assert(persistedOrder.email === correctedEmail, 'MongoDB persisted updated email');
    assert(persistedOrder.customerEmail === correctedEmail, 'MongoDB persisted updated customerEmail');
    assert(persistedOrder.emailAdminCorrected === true, 'Order marked as emailAdminCorrected');
    assert(persistedOrder.emailAdminCorrectedBy === adminUser.email, 'Admin email saved in emailAdminCorrectedBy');

    // Verify virtual / JSON mapping
    const jsonOrder = persistedOrder.toJSON();
    assert(jsonOrder.customer_email === correctedEmail, 'toJSON ret.customer_email reflects corrected email');
    assert(jsonOrder.email === correctedEmail, 'toJSON ret.email reflects corrected email');
    assert(jsonOrder.email_admin_corrected === true, 'toJSON email_admin_corrected is true');

    // Verify audit trail entry
    assert(persistedOrder.editHistory.length === 1, 'Audit trail has exactly 1 entry');
    assert(persistedOrder.editHistory[0].changedFields[0].includes(correctedEmail), 'Audit entry contains new email');
    assert(persistedOrder.editHistory[0].notes.includes(adminNote), 'Audit entry contains admin note');

    // -------------------------------------------------------------
    // TEST 4: Integrity Protection - Core Order Data Unaltered
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: ORDER INTEGRITY PROTECTION ---');
    assert(persistedOrder.orderNo === order1No, 'Order number (orderNo) remained strictly unchanged');
    assert(persistedOrder.total === 3500, 'Order total remained strictly unchanged (₹3500)');
    assert(persistedOrder.paymentStatus === 'verified', 'Payment status remained verified');
    assert(persistedOrder.orderStatus === 'confirmed', 'Order status remained confirmed');
    assert(persistedOrder.upiUtr === 'UTR998877665544', 'Payment UTR remained untouched');
    assert(persistedOrder.items.length === 1, 'Order items list remained intact');
    assert(persistedOrder.items[0].name === 'Traditional Kolhapuri Saaj', 'Product item name unaltered');

    // -------------------------------------------------------------
    // TEST 5: Registered Customer Account Login Email Is NOT Altered
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: CUSTOMER USER ACCOUNT LOGIN ISOLATION ---');
    const freshCustomerUser = await User.findById(customerUser._id);
    assert(freshCustomerUser.email === testCustEmail, 'Customer account login email remains separate and unchanged');
    assert(freshCustomerUser.emailVerified === true, 'Customer account verification state preserved');

    // -------------------------------------------------------------
    // TEST 6: Gift Order Email Correction (Preserves Recipient Info)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: GIFT ORDER EMAIL CORRECTION ---');
    const giftOrderNo = `NS-GIFT-${Date.now().toString().slice(-6)}`;
    const giftOrder = await Order.create({
      orderNo: giftOrderNo,
      isGift: true,
      recipientName: 'Snehal Patil (Bride)',
      recipientPhone: '9123456780',
      name: 'Snehal Patil (Bride)',
      phone: '9123456780',
      address: 'Villa 10, Royal Palms',
      city: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416001',
      customerName: 'Amit Verma (Buyer)',
      customerPhone: '9822001122',
      customerEmail: 'amit.typo@gmaill.com',
      email: 'amit.typo@gmaill.com',
      subtotal: 5400,
      shipping: 0,
      total: 5400,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      items: [
        {
          name: 'Bridal Thushi with Pearls',
          price: 5400,
          qty: 1
        }
      ]
    });
    createdTestOrderIds.push(giftOrder._id);

    // Correct Buyer Email on Gift Order
    const correctedBuyerEmail = 'amit.verma@gmail.com';
    giftOrder._allowEmailCorrection = true;
    giftOrder.email = correctedBuyerEmail;
    giftOrder.customerEmail = correctedBuyerEmail;
    giftOrder.emailAdminCorrected = true;
    await giftOrder.save();

    const freshGiftDoc = await Order.findById(giftOrder._id);
    assert(freshGiftDoc.customerEmail === correctedBuyerEmail, 'Buyer customerEmail corrected');
    assert(freshGiftDoc.email === correctedBuyerEmail, 'Buyer email corrected');
    assert(freshGiftDoc.recipientName === 'Snehal Patil (Bride)', 'Recipient name NOT overwritten');
    assert(freshGiftDoc.recipientPhone === '9123456780', 'Recipient phone NOT overwritten');
    assert(freshGiftDoc.address === 'Villa 10, Royal Palms', 'Recipient delivery address intact');

    // -------------------------------------------------------------
    // TEST 7: Future Notifications Use Corrected Email
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: FUTURE NOTIFICATIONS USE CORRECTED EMAIL ---');
    // Test Resend Order Email helper
    const resendResult = await resendOrderEmail(freshGiftDoc, 'ORDER_CONFIRMED');
    assert(resendResult !== undefined, 'resendOrderEmail returned result');

    // Verify EmailEvent logged with corrected email
    const loggedEvents = await EmailEvent.find({ orderId: freshGiftDoc._id }).sort({ createdAt: -1 });
    assert(loggedEvents.length > 0, 'EmailEvent recorded in database');
    assert(loggedEvents[0].recipient === correctedBuyerEmail, `EmailEvent dispatched to corrected email (${correctedBuyerEmail})`);
    assert(loggedEvents[0].emailType === 'ORDER_CONFIRMED', 'EmailEvent type is ORDER_CONFIRMED');

    // -------------------------------------------------------------
    // TEST 8: Delivery Failure Management & Warning State
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: EMAIL DELIVERY FAILURE MANAGEMENT ---');
    const failureOrderNo = `NS-FAIL-${Date.now().toString().slice(-6)}`;
    const failureOrder = await Order.create({
      orderNo: failureOrderNo,
      name: 'Vikram Joshi',
      phone: '9811223344',
      email: 'nonexistent-bad-domain@thisdomaindoesnotexist998877.org',
      customerEmail: 'nonexistent-bad-domain@thisdomaindoesnotexist998877.org',
      address: 'Flat 12, Sky Tower',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      subtotal: 2200,
      shipping: 0,
      total: 2200,
      orderStatus: 'placed',
      items: [
        {
          name: 'Maharashtrian Nath',
          price: 2200,
          qty: 1
        }
      ]
    });
    createdTestOrderIds.push(failureOrder._id);

    // Simulate failure recording on order
    await Order.updateOne(
      { _id: failureOrder._id },
      {
        $set: {
          emailDeliveryStatus: 'failed',
          emailDeliveryError: '550 5.1.1 Recipient address rejected: User unknown',
          emailDeliveryFailedAt: new Date(),
          emailDeliveryFailedRecipient: failureOrder.email
        }
      }
    );

    const failedDoc = await Order.findById(failureOrder._id);
    assert(failedDoc.emailDeliveryStatus === 'failed', 'emailDeliveryStatus is failed');
    assert(failedDoc.emailDeliveryError.includes('Recipient address rejected'), 'emailDeliveryError recorded');

    // Admin corrects the email after delivery failure
    const fixedVikramEmail = 'vikram.joshi@gmail.com';
    failedDoc._allowEmailCorrection = true;
    failedDoc.email = fixedVikramEmail;
    failedDoc.customerEmail = fixedVikramEmail;
    failedDoc.emailDeliveryStatus = 'pending';
    failedDoc.emailDeliveryError = null;
    failedDoc.emailAdminCorrected = true;
    await failedDoc.save();

    const recoveredDoc = await Order.findById(failureOrder._id);
    assert(recoveredDoc.email === fixedVikramEmail, 'Email updated to fixedVikramEmail');
    assert(recoveredDoc.emailDeliveryStatus === 'pending', 'emailDeliveryStatus reset from failed to pending');
    assert(recoveredDoc.emailDeliveryError === null, 'emailDeliveryError cleared on correction');

    // -------------------------------------------------------------
    // TEST 9: Immutability Security - Generic Edits Without Flag Blocked
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: IMMUTABILITY SECURITY WITHOUT FLAG ---');
    let blockedErrorCaught = false;
    try {
      const orderTestImmut = await Order.findById(testOrder1._id);
      // Attempt to modify customerEmail without _allowEmailCorrection flag
      orderTestImmut.customerEmail = 'hacker@unauthorized.com';
      await orderTestImmut.save();
    } catch (err) {
      blockedErrorCaught = true;
      assert(err.message.includes('cannot be modified'), `Pre-save hook threw expected immutability error: ${err.message}`);
    }
    assert(blockedErrorCaught, 'Arbitrary customerEmail modification blocked by pre-save validation');

    // Clean up test documents
    console.log('\n--- CLEANUP TEST DATA ---');
    await Order.deleteMany({ _id: { $in: createdTestOrderIds } });
    await User.deleteMany({ _id: { $in: createdTestUserIds } });
    await EmailEvent.deleteMany({ orderId: { $in: createdTestOrderIds } });
    console.log('✓ Cleaned up test orders, users, and email events.');

    console.log('\n=================================================================');
    console.log(`ALL TESTS COMPLETED SUCCESSFULLY! (${testsPassed} passed, ${testsFailed} failed)`);
    console.log('=================================================================');
  } catch (err) {
    console.error('FATAL TEST ERROR:', err);
    // Cleanup on failure
    await Order.deleteMany({ _id: { $in: createdTestOrderIds } }).catch(() => {});
    await User.deleteMany({ _id: { $in: createdTestUserIds } }).catch(() => {});
    await EmailEvent.deleteMany({ orderId: { $in: createdTestOrderIds } }).catch(() => {});
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
