import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Order } from '../server/models/Order.js';
import { generateOrderNo } from '../server/services/orderIdService.js';

dotenv.config();

const API_BASE = 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || '650e4df09b9acb71046ff5d8488066b407a06d784db12df19d3f51d3b5aeba20';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const adminToken = jwt.sign(
  { id: new mongoose.Types.ObjectId().toString(), role: 'admin', email: 'admin@nathshikha.in', name: 'Super Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function runHttpTests() {
  console.log('====================================================');
  console.log('HTTP ENDPOINT INTEGRATION TESTS FOR ADMIN ORDER EDIT');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);

  // 1. Create a baseline order for Tanvi
  const orderNo = await generateOrderNo();
  const testOrder = await Order.create({
    orderNo,
    name: 'Tanvi Deshpande',
    phone: '9999999999',
    email: 'tanvi@example.com',
    customerName: 'Tanvi Deshpande',
    customerPhone: '9999999999',
    customerEmail: 'tanvi@example.com',
    address: '101 Prabhat Road, Erandwane',
    pincode: '411004',
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

  console.log(`Created baseline test order #${orderNo} (ID: ${testOrder._id})`);

  try {
    // ---------------------------------------------------------------------------------
    // TEST 1: Attempt to replace customerName with Rahul Kulkarni
    // ---------------------------------------------------------------------------------
    console.log('\n--- HTTP TEST 1: Reject customerName replacement ---');
    const res1 = await fetch(`${API_BASE}/admin/orders/${testOrder._id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customerName: 'Rahul Kulkarni'
      })
    });
    const body1 = await res1.json();
    console.log(`Status: ${res1.status}, Response:`, body1);
    if (res1.status === 400 && body1.error.includes('Buyer identity fields')) {
      console.log('✅ HTTP TEST 1 PASSED: customerName change rejected with HTTP 400');
    } else {
      throw new Error('HTTP TEST 1 FAILED');
    }

    // ---------------------------------------------------------------------------------
    // TEST 2: Attempt to replace customerEmail with rahul@example.com
    // ---------------------------------------------------------------------------------
    console.log('\n--- HTTP TEST 2: Reject customerEmail replacement ---');
    const res2 = await fetch(`${API_BASE}/admin/orders/${testOrder._id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customerEmail: 'rahul@example.com'
      })
    });
    const body2 = await res2.json();
    console.log(`Status: ${res2.status}, Response:`, body2);
    if (res2.status === 400 && body2.error.includes('Buyer identity fields')) {
      console.log('✅ HTTP TEST 2 PASSED: customerEmail change rejected with HTTP 400');
    } else {
      throw new Error('HTTP TEST 2 FAILED');
    }

    // ---------------------------------------------------------------------------------
    // TEST 3: Attempt to replace customerPhone with 8888888888
    // ---------------------------------------------------------------------------------
    console.log('\n--- HTTP TEST 3: Reject customerPhone replacement ---');
    const res3 = await fetch(`${API_BASE}/admin/orders/${testOrder._id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customerPhone: '8888888888'
      })
    });
    const body3 = await res3.json();
    console.log(`Status: ${res3.status}, Response:`, body3);
    if (res3.status === 400 && body3.error.includes('Buyer identity fields')) {
      console.log('✅ HTTP TEST 3 PASSED: customerPhone change rejected with HTTP 400');
    } else {
      throw new Error('HTTP TEST 3 FAILED');
    }

    // ---------------------------------------------------------------------------------
    // TEST 4: Attempt to replace orderNo
    // ---------------------------------------------------------------------------------
    console.log('\n--- HTTP TEST 4: Reject orderNo replacement ---');
    const res4 = await fetch(`${API_BASE}/admin/orders/${testOrder._id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        orderNo: 'NS-9999-000001'
      })
    });
    const body4 = await res4.json();
    console.log(`Status: ${res4.status}, Response:`, body4);
    if (res4.status === 400 && body4.error.includes('orderNo')) {
      console.log('✅ HTTP TEST 4 PASSED: orderNo modification rejected with HTTP 400');
    } else {
      throw new Error('HTTP TEST 4 FAILED');
    }

    // ---------------------------------------------------------------------------------
    // TEST 5: Legitimate delivery address update
    // ---------------------------------------------------------------------------------
    console.log('\n--- HTTP TEST 5: Allowed Delivery Address & Recipient Update ---');
    const res5 = await fetch(`${API_BASE}/admin/orders/${testOrder._id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        address: '505 FC Road, Shivaji Nagar, Pune',
        pincode: '411005',
        city: 'Pune',
        state: 'Maharashtra',
        isGift: true,
        recipientName: 'Aarti Kulkarni',
        recipientPhone: '9876543210',
        giftWrap: true,
        handwrittenNote: 'Happy Birthday Aarti!',
        adminEditNotes: 'Delivery updated by customer request'
      })
    });
    const body5 = await res5.json();
    console.log(`Status: ${res5.status}, Response:`, body5);
    if (res5.status === 200 && body5.ok && body5.order.customer_name === 'Tanvi Deshpande') {
      console.log('✅ HTTP TEST 5 PASSED: Delivery address & gift updated, Buyer preserved as Tanvi Deshpande');
    } else {
      throw new Error('HTTP TEST 5 FAILED');
    }

    // Verify in MongoDB
    const verifiedDbDoc = await Order.findById(testOrder._id);
    console.log('\nFinal MongoDB Document State:');
    console.log('OrderNo:', verifiedDbDoc.orderNo);
    console.log('CustomerName (Buyer):', verifiedDbDoc.customerName);
    console.log('CustomerPhone (Buyer):', verifiedDbDoc.customerPhone);
    console.log('CustomerEmail (Buyer):', verifiedDbDoc.customerEmail);
    console.log('RecipientName:', verifiedDbDoc.recipientName);
    console.log('RecipientPhone:', verifiedDbDoc.recipientPhone);
    console.log('Delivery Address:', verifiedDbDoc.address);
    console.log('Gift Wrap:', verifiedDbDoc.giftWrap);

    if (
      verifiedDbDoc.customerName === 'Tanvi Deshpande' &&
      verifiedDbDoc.customerEmail === 'tanvi@example.com' &&
      verifiedDbDoc.recipientName === 'Aarti Kulkarni' &&
      verifiedDbDoc.orderNo === orderNo
    ) {
      console.log('\n====================================================');
      console.log('ALL HTTP INTEGRATION TESTS PASSED PERFECTLY!');
      console.log('====================================================');
    } else {
      throw new Error('Database verification failed!');
    }
  } finally {
    console.log('\nCleaning up test order...');
    await Order.findByIdAndDelete(testOrder._id);
    await mongoose.disconnect();
    console.log('Cleanup completed.');
  }
}

runHttpTests().catch((err) => {
  console.error('HTTP Test Error:', err);
  process.exit(1);
});
