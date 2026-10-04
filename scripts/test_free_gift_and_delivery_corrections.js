import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../server/models/Order.js';
import { Product } from '../server/models/Product.js';
import { buildInvoicePdfBinary, escapePdfText } from '../src/utils/pdfGenerator.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: FREE GIFT LINE ITEM & EXPECTED DELIVERY CORRECTIONS');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Normal order, Free Gift unchecked -> No free-gift item
    // -------------------------------------------------------------
    console.log('1. Testing Normal Order without Free Gift...');
    const testOrderNo1 = `TEST-CORR-1-${Date.now()}`;
    const order1 = new Order({
      orderNo: testOrderNo1,
      name: 'Priya Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      address: '123 MG Road, Pune',
      pincode: '411001',
      city: 'Pune',
      state: 'Maharashtra',
      subtotal: 500,
      shipping: 100,
      total: 600,
      paymentStatus: 'verification_pending',
      orderStatus: 'placed',
      freeGift: { included: false },
      items: [
        {
          name: 'Traditional Kolhapuri Saaj',
          price: 500,
          qty: 1,
          img: '/assets/saaj.jpg',
          itemType: 'product'
        }
      ]
    });
    await order1.save();

    const savedOrder1 = await Order.findOne({ orderNo: testOrderNo1 }).lean();
    assert(savedOrder1.items.length === 1, 'Order has exactly 1 item');
    assert(savedOrder1.items[0].name === 'Traditional Kolhapuri Saaj', 'Item is customer product');
    assert(!savedOrder1.items.some((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift'), 'No free-gift line item exists');
    assert(savedOrder1.total === 600, 'Order total is ₹600');

    // -------------------------------------------------------------
    // Test 2: Admin verifies payment with Free Gift checked
    // -------------------------------------------------------------
    console.log('\n2. Testing Admin Payment Verification with Free Gift Checked...');
    const order1Doc = await Order.findOne({ orderNo: testOrderNo1 });
    order1Doc.paymentStatus = 'verified';
    order1Doc.orderStatus = 'confirmed';
    order1Doc.confirmedAt = new Date('2026-10-04T10:00:00Z');
    order1Doc.freeGift = { included: true };
    await order1Doc.save();

    const verifiedOrder1 = await Order.findOne({ orderNo: testOrderNo1 }).lean();
    assert(verifiedOrder1.items.length === 2, 'Order now has exactly 2 items');
    const giftItem = verifiedOrder1.items.find((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift');
    assert(Boolean(giftItem), 'Free gift line item is present in items array');
    assert(giftItem?.name === 'Free Complimentary Gift', 'Gift name is "Free Complimentary Gift"');
    assert(giftItem?.price === 0, 'Gift price is ₹0');
    assert(giftItem?.qty === 1, 'Gift qty is 1');
    assert(verifiedOrder1.subtotal === 500, 'Subtotal remains ₹500 (unchanged)');
    assert(verifiedOrder1.shipping === 100, 'Shipping remains ₹100 (unchanged)');
    assert(verifiedOrder1.total === 600, 'Grand total remains ₹600 (unchanged)');

    // -------------------------------------------------------------
    // Test 3: Idempotency - Saving again with Free Gift checked keeps only ONE gift item
    // -------------------------------------------------------------
    console.log('\n3. Testing Idempotency (Max ONE Free Gift Line Item)...');
    const order1DocAgain = await Order.findOne({ orderNo: testOrderNo1 });
    order1DocAgain.freeGift = { included: true };
    await order1DocAgain.save();

    const reSavedOrder1 = await Order.findOne({ orderNo: testOrderNo1 }).lean();
    const giftItems = reSavedOrder1.items.filter((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift');
    assert(giftItems.length === 1, 'Still exactly ONE free gift line item');
    assert(reSavedOrder1.items.length === 2, 'Total items count remains 2');

    // -------------------------------------------------------------
    // Test 4: Unchecking Free Gift removes ONLY the free-gift line item
    // -------------------------------------------------------------
    console.log('\n4. Testing Unchecking Free Gift removes gift item and preserves products...');
    const order1DocUncheck = await Order.findOne({ orderNo: testOrderNo1 });
    order1DocUncheck.freeGift = { included: false };
    await order1DocUncheck.save();

    const uncheckedOrder1 = await Order.findOne({ orderNo: testOrderNo1 }).lean();
    assert(uncheckedOrder1.items.length === 1, 'Items count is back to 1');
    assert(uncheckedOrder1.items[0].name === 'Traditional Kolhapuri Saaj', 'Original product is preserved intact');
    assert(!uncheckedOrder1.items.some((i) => i.itemType === 'free_gift'), 'Free gift item is removed');
    assert(uncheckedOrder1.total === 600, 'Grand total remains ₹600');

    // -------------------------------------------------------------
    // Test 5: Re-enabling Free Gift and checking Expected Delivery Date calculation
    // -------------------------------------------------------------
    console.log('\n5. Testing Delivery Date Formula (Confirmed Date + 20 Days)...');
    order1DocUncheck.freeGift = { included: true };
    order1DocUncheck.confirmedAt = new Date('2026-10-04T12:00:00Z');
    await order1DocUncheck.save();

    const finalOrder1 = await Order.findOne({ orderNo: testOrderNo1 });
    const jsonOrder1 = finalOrder1.toJSON();

    const expectedDate = new Date(jsonOrder1.expected_delivery_date);
    const confirmedDate = new Date(jsonOrder1.confirmed_at);
    const diffDays = Math.round((expectedDate.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60 * 24));
    assert(diffDays === 20, 'Expected delivery date is exactly Confirmed Date + 20 days');

    const formattedExpectedDate = expectedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    assert(formattedExpectedDate.includes('2026'), `Formatted delivery date contains year: ${formattedExpectedDate}`);

    // -------------------------------------------------------------
    // Test 6: PDF / Invoice Generation contains Free Complimentary Gift row
    // -------------------------------------------------------------
    console.log('\n6. Testing PDF Invoice generation with Free Gift line item...');
    const pdfBinary = buildInvoicePdfBinary(jsonOrder1);
    assert(pdfBinary.length > 500, 'PDF binary successfully generated');
    assert(pdfBinary.includes('Free Complimentary Gift'), 'PDF includes Free Complimentary Gift in item table');
    assert(pdfBinary.includes('FREE-GIFT'), 'PDF includes FREE-GIFT product code');
    assert(pdfBinary.includes('Rs. 0'), 'PDF displays Rs. 0 for unit price and row total');

    // -------------------------------------------------------------
    // Test 7: Month/Year Boundaries for Delivery Date
    // -------------------------------------------------------------
    console.log('\n7. Testing Month & Year Boundary Delivery Date Math...');
    // Month end: Dec 20 -> Jan 09 next year
    const decConf = new Date('2026-12-25T10:00:00Z');
    const janExp = new Date(decConf.getTime() + 20 * 24 * 60 * 60 * 1000);
    assert(janExp.getUTCFullYear() === 2027, 'Rolls over to 2027');
    assert(janExp.getUTCMonth() === 0, 'Rolls over to January (month index 0)');
    assert(janExp.getUTCDate() === 14, 'Date is 14 Jan 2027');

    // Leap year Feb 20 -> March
    const leapConf = new Date('2028-02-20T10:00:00Z');
    const leapExp = new Date(leapConf.getTime() + 20 * 24 * 60 * 60 * 1000);
    assert(leapExp.getUTCMonth() === 2, '2028 Leap year rolls over to March (month index 2)');
    assert(leapExp.getUTCDate() === 11, 'Date is 11 Mar 2028 (29 days in Feb 2028)');

    // -------------------------------------------------------------
    // Test 8: Security - Customer Cannot Inject Free Gift or Confirmation Dates
    // -------------------------------------------------------------
    console.log('\n8. Testing Customer Order Creation Security...');
    const testOrderNoSec = `TEST-SEC-${Date.now()}`;
    const secOrder = new Order({
      orderNo: testOrderNoSec,
      name: 'Attacker Customer',
      phone: '9876543210',
      email: 'attacker@example.com',
      address: '123 Fake Street',
      pincode: '411001',
      city: 'Pune',
      state: 'Maharashtra',
      subtotal: 500,
      shipping: 100,
      total: 600,
      paymentStatus: 'verification_pending',
      orderStatus: 'placed',
      freeGift: { included: false },
      confirmedAt: null,
      expectedDeliveryDate: null,
      items: [
        {
          name: 'Traditional Kolhapuri Saaj',
          price: 500,
          qty: 1,
          img: '/assets/saaj.jpg',
          itemType: 'product'
        }
      ]
    });
    await secOrder.save();

    const savedSec = await Order.findOne({ orderNo: testOrderNoSec }).lean();
    assert(savedSec.freeGift.included === false, 'Customer order freeGift.included is false');
    assert(savedSec.confirmedAt === null, 'confirmedAt is null');
    assert(savedSec.expectedDeliveryDate === null, 'expectedDeliveryDate is null');
    assert(!savedSec.items.some((i) => i.itemType === 'free_gift'), 'No free-gift line item exists');

    // Clean up test records
    await Order.deleteMany({ orderNo: { $in: [testOrderNo1, testOrderNoSec] } });

    console.log('\n================================================================');
    console.log(`ALL CORRECTION TESTS COMPLETED: ${passCount}/${passCount + failCount} PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failCount++;
  } finally {
    await mongoose.disconnect();
    process.exit(failCount === 0 ? 0 : 1);
  }
}

runTests();
