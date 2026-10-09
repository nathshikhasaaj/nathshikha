import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'node:http';
import { Order } from '../server/models/Order.js';
import { User } from '../server/models/User.js';
import adminRoutes from '../server/routes/adminRoutes.js';
import { signToken } from '../server/middleware/auth.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nathshikha';
const TEST_PORT = 5099;

function makeHttpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runHttpTests() {
  console.log('=================================================================');
  console.log('STARTING NATHSHIKHA ADMIN EMAIL HTTP SECURITY & API TEST SUITE');
  console.log('=================================================================');

  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB database successfully.');

  // Create isolated express app for testing
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => {
      console.log(`✓ Test HTTP server listening on port ${TEST_PORT}`);
      resolve(s);
    });
  });

  let testsPassed = 0;
  let testsFailed = 0;
  const createdOrderIds = [];
  const createdUserIds = [];

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
    // 1. Create Customer and Admin Users
    const customerUser = await User.create({
      name: 'Rohan Joshi',
      email: `rohan_${Date.now()}@example.com`,
      passwordHash: User.hashPassword('Cust@12345'),
      role: 'customer'
    });
    createdUserIds.push(customerUser._id);

    const adminUser = await User.create({
      name: 'Manager Admin',
      email: `admin_${Date.now()}@example.com`,
      passwordHash: User.hashPassword('Admin@12345'),
      role: 'admin'
    });
    createdUserIds.push(adminUser._id);

    // Create Tokens
    const customerToken = signToken(customerUser);
    const adminToken = signToken(adminUser);

    // Create a Test Order
    const testOrder = await Order.create({
      orderNo: `NS-HTTP-${Date.now().toString().slice(-6)}`,
      userId: customerUser._id,
      name: 'Rohan Joshi',
      phone: '9820011223',
      email: 'rohan.initial@gmial.com',
      customerEmail: 'rohan.initial@gmial.com',
      address: 'Lane 5, Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      subtotal: 4200,
      shipping: 0,
      total: 4200,
      paymentMethod: 'upi',
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      items: [{ name: 'Kolhapuri Saaj', price: 4200, qty: 1 }]
    });
    createdOrderIds.push(testOrder._id);

    console.log(`✓ Test Order created: #${testOrder.orderNo} (ID: ${testOrder._id})`);

    // -------------------------------------------------------------
    // HTTP TEST 1: Unauthenticated request is rejected (401)
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 1: REJECT UNAUTHENTICATED REQUEST ---');
    const unauthRes = await makeHttpRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/api/admin/orders/${testOrder._id}/email`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'newemail@example.com' });

    assert(unauthRes.status === 401, `Unauthenticated request returned HTTP 401 (got ${unauthRes.status})`);

    // -------------------------------------------------------------
    // HTTP TEST 2: Customer role user request is rejected (403)
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 2: REJECT CUSTOMER ROLE ATTEMPT ---');
    const custRes = await makeHttpRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/api/admin/orders/${testOrder._id}/email`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      }
    }, { email: 'hacker@example.com' });

    assert(custRes.status === 403, `Customer attempt returned HTTP 403 (got ${custRes.status})`);

    // -------------------------------------------------------------
    // HTTP TEST 3: Invalid email format is rejected (400)
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 3: REJECT INVALID EMAIL FORMAT ---');
    const invalidEmailRes = await makeHttpRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/api/admin/orders/${testOrder._id}/email`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    }, { email: 'invalid-email-no-at' });

    assert(invalidEmailRes.status === 400, `Invalid email returned HTTP 400 (got ${invalidEmailRes.status})`);
    assert(invalidEmailRes.body.error !== undefined, 'Returned error message in response body');

    // -------------------------------------------------------------
    // HTTP TEST 4: Admin successfully corrects customer email (PATCH)
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 4: ADMIN SUCCESSFULLY UPDATES EMAIL (PATCH) ---');
    const correctEmail = 'rohan.joshi@gmail.com';
    const adminNote = 'Customer verified phone and requested email fix';

    const successRes = await makeHttpRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/api/admin/orders/${testOrder._id}/email`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    }, {
      email: correctEmail,
      note: adminNote
    });

    assert(successRes.status === 200, `Admin update returned HTTP 200 (got ${successRes.status})`);
    assert(successRes.body.ok === true, 'Response body ok: true');
    assert(successRes.body.newEmail === correctEmail, `Response body newEmail matches (${correctEmail})`);
    assert(successRes.body.order.email === correctEmail, 'Returned order email is corrected');
    assert(successRes.body.order.customer_email === correctEmail, 'Returned customer_email alias is corrected');

    // -------------------------------------------------------------
    // HTTP TEST 5: Verify MongoDB persistence & audit trail
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 5: VERIFY DATABASE PERSISTENCE & AUDIT ---');
    const dbOrder = await Order.findById(testOrder._id);
    assert(dbOrder.email === correctEmail, 'MongoDB order.email is updated');
    assert(dbOrder.customerEmail === correctEmail, 'MongoDB order.customerEmail is updated');
    assert(dbOrder.emailAdminCorrected === true, 'MongoDB emailAdminCorrected is true');
    assert(dbOrder.editHistory.length > 0, 'Audit history entry recorded');
    assert(dbOrder.editHistory[dbOrder.editHistory.length - 1].notes.includes(adminNote), 'Audit history contains admin note');
    assert(dbOrder.total === 4200, 'Order total remained untouched (₹4200)');
    assert(dbOrder.orderNo === testOrder.orderNo, 'Order number remained untouched');

    // -------------------------------------------------------------
    // HTTP TEST 6: POST method support (/orders/:id/edit-email)
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 6: ADMIN SUCCESSFULLY UPDATES EMAIL (POST) ---');
    const correctEmail2 = 'rohan.work@gmail.com';
    const postRes = await makeHttpRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/api/admin/orders/${testOrder._id}/edit-email`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    }, {
      email: correctEmail2,
      note: 'Updated to primary work email'
    });

    assert(postRes.status === 200, `POST /edit-email returned HTTP 200 (got ${postRes.status})`);
    assert(postRes.body.newEmail === correctEmail2, `POST updated newEmail matches (${correctEmail2})`);

    // -------------------------------------------------------------
    // HTTP TEST 7: Verify Customer Login Account is Unchanged
    // -------------------------------------------------------------
    console.log('\n--- HTTP TEST 7: VERIFY CUSTOMER USER LOGIN IS UNCHANGED ---');
    const dbCust = await User.findById(customerUser._id);
    assert(dbCust.email !== correctEmail, 'Customer User account email was NOT overwritten');
    assert(dbCust.email === customerUser.email, 'Customer User account email is strictly preserved');

    // Cleanup
    console.log('\n--- CLEANUP HTTP TEST DATA ---');
    await Order.deleteMany({ _id: { $in: createdOrderIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log('✓ Cleaned up test orders and users.');

    console.log('\n=================================================================');
    console.log(`ALL HTTP SECURITY TESTS COMPLETED! (${testsPassed} passed, ${testsFailed} failed)`);
    console.log('=================================================================');
  } catch (err) {
    console.error('FATAL HTTP TEST ERROR:', err);
    await Order.deleteMany({ _id: { $in: createdOrderIds } }).catch(() => {});
    await User.deleteMany({ _id: { $in: createdUserIds } }).catch(() => {});
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runHttpTests();
