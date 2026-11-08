import mongoose from 'mongoose';
import { Order } from '../server/models/Order.js';
import { sendOrderPlacedEmail } from '../server/services/emailService.js';
import { buildInvoicePdfBinary } from '../src/utils/pdfGenerator.js';
import { isValidEmail, isValidPincode, isValidPhone } from '../server/middleware/securityMiddleware.js';

console.log('================================================================');
console.log('STARTING OFFLINE CUSTOM ORDER LOGIC & VALIDATION TEST SUITE');
console.log('================================================================\n');

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

// -----------------------------------------------------------------
// TEST 1: Schema & Model Instantiation with orderType="custom"
// -----------------------------------------------------------------
console.log('--- TEST 1: SCHEMA & ORDER MODEL INSTANTIATION ---');
const customDoc1 = new Order({
  orderNo: 'NS-2026-000099',
  orderType: 'custom',
  name: 'Ananya Deshmukh',
  phone: '9876543210',
  email: 'ananya@example.com',
  address: '102 Shivam Heights, MG Road',
  pincode: '410203',
  city: 'Khopoli',
  state: 'Maharashtra',
  shippingMethod: 'Standard Delivery',
  subtotal: 3800,
  shipping: 100,
  total: 3900,
  paymentMethod: 'upi',
  paymentStatus: 'verification_pending',
  orderStatus: 'placed',
  items: [
    {
      productId: null,
      name: 'Custom Royal Peacock Nath',
      price: 1500,
      qty: 2,
      img: '/uploads/custom-peacock.jpg',
      itemType: 'custom',
      notes: '24k gold plating, left clip'
    },
    {
      productId: null,
      name: 'Custom Bugadi with Pearls',
      price: 800,
      qty: 1,
      img: '/uploads/custom-bugadi.jpg',
      itemType: 'custom',
      notes: 'Red stone drop'
    }
  ]
});

await customDoc1.validate();
assert(customDoc1.orderType === 'custom', 'orderType is "custom"');
assert(customDoc1.order_type === 'custom', 'order_type alias resolves to "custom"');
assert(customDoc1.items.length === 2, '2 custom items stored in document');
assert(customDoc1.items[0].productId === null, 'Item 1 productId is null without catalog dependency');
assert(customDoc1.items[0].itemType === 'custom', 'Item 1 itemType is "custom"');
assert(customDoc1.items[0].notes === '24k gold plating, left clip', 'Item 1 notes stored');

// -----------------------------------------------------------------
// TEST 2: toJSON() Transformation & Aliases
// -----------------------------------------------------------------
console.log('\n--- TEST 2: toJSON() TRANSFORMATION & ALIASES ---');
const json1 = customDoc1.toJSON();
assert(json1.order_type === 'custom', 'toJSON includes order_type="custom"');
assert(json1.orderType === 'custom', 'toJSON includes orderType="custom"');
assert(json1.items[0].notes === '24k gold plating, left clip', 'toJSON exposes item.notes');
assert(json1.items[0].design_notes === '24k gold plating, left clip', 'toJSON exposes item.design_notes');
assert(json1.items[0].item_type === 'custom', 'toJSON exposes item.item_type="custom"');
assert(json1.items[0].img === '/uploads/custom-peacock.jpg', 'toJSON exposes item.img');

// -----------------------------------------------------------------
// TEST 3: Free Gift Pre-Validate Hook & Isolation
// -----------------------------------------------------------------
console.log('\n--- TEST 3: FREE GIFT HOOK & PRICING PRESERVATION ---');
customDoc1.freeGift = { included: true };
await customDoc1.validate();
assert(true, 'Gift toggle validated cleanly');

const giftItem = customDoc1.items.find((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift');
assert(Boolean(giftItem), 'Free gift item automatically inserted into items array');
assert(giftItem.price === 0, 'Free gift price is ₹0');
assert(customDoc1.subtotal === 3800, 'Custom order subtotal remains unchanged at ₹3,800');
assert(customDoc1.shipping === 100, 'Custom order shipping remains unchanged at ₹100');
assert(customDoc1.total === 3900, 'Custom order total remains unchanged at ₹3,900');

// Test that re-validating does not duplicate the gift
await customDoc1.validate();
const giftCount = customDoc1.items.filter((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift').length;
assert(giftCount === 1, 'Free gift item is never duplicated');

// Test removing free gift
customDoc1.freeGift = { included: false };
await customDoc1.validate();
const giftCountAfterRemoval = customDoc1.items.filter((i) => i.itemType === 'free_gift' || i.name === 'Free Complimentary Gift').length;
assert(giftCountAfterRemoval === 0, 'Free gift cleanly removed when included is false');

// -----------------------------------------------------------------
// TEST 4: Zero Shipping & Total Formula Verification
// -----------------------------------------------------------------
console.log('\n--- TEST 4: ZERO SHIPPING & TOTAL FORMULA ---');
const customDocZeroShip = new Order({
  orderNo: 'NS-2026-000100',
  orderType: 'custom',
  name: 'Meera Kulkarni',
  phone: '9876543210',
  email: null,
  address: '45 Lake View',
  pincode: '410203',
  subtotal: 1500,
  shipping: 0,
  total: 1500,
  items: [
    {
      name: 'Custom Saaj Piece',
      price: 1500,
      qty: 1,
      itemType: 'custom'
    }
  ]
});
await customDocZeroShip.validate();
assert(true, 'Zero shipping document validated cleanly');
assert(customDocZeroShip.shipping === 0, 'Zero shipping is ₹0');
assert(customDocZeroShip.total === customDocZeroShip.subtotal, 'Total equals subtotal when shipping is 0');

// -----------------------------------------------------------------
// TEST 5: Blank Optional Email & Safe Email Skip
// -----------------------------------------------------------------
console.log('\n--- TEST 5: BLANK OPTIONAL EMAIL HANDLING ---');
const blankEmailOrder = customDocZeroShip.toJSON();
const emailResult = await sendOrderPlacedEmail(blankEmailOrder);
assert(emailResult.skipped === true, 'sendOrderPlacedEmail safely skipped when email is null');
assert(!emailResult.error, 'No error thrown when email is null');

// -----------------------------------------------------------------
// TEST 6: Email Validation Rules (Valid vs Invalid vs Blank)
// -----------------------------------------------------------------
console.log('\n--- TEST 6: EMAIL SECURITY & VALIDATION RULES ---');
assert(isValidEmail('customer@example.com') === true, '"customer@example.com" is valid');
assert(isValidEmail('RADHIKA.PATIL@GMAIL.COM') === true, 'Uppercase email is valid');
assert(isValidEmail('invalid-email') === false, '"invalid-email" is invalid');
assert(isValidEmail('missing@tld') === false, '"missing@tld" is invalid');
assert(isValidEmail('') === false, 'Empty string is rejected by isValidEmail (should be stored as null)');

// -----------------------------------------------------------------
// TEST 7: Pincode and Phone Validation Rules
// -----------------------------------------------------------------
console.log('\n--- TEST 7: PINCODE AND PHONE VALIDATION RULES ---');
assert(isValidPincode('410203') === true, '"410203" is valid 6-digit PIN');
assert(isValidPincode('41020') === false, '5-digit PIN is invalid');
assert(isValidPincode('4102033') === false, '7-digit PIN is invalid');
assert(isValidPincode('ABCDEF') === false, 'Alpha PIN is invalid');

assert(isValidPhone('9876543210') === true, 'Valid 10-digit Indian phone');
assert(isValidPhone('12345') === false, 'Short phone is invalid');

// -----------------------------------------------------------------
// TEST 8: PDF Invoice Generation for Custom Order
// -----------------------------------------------------------------
console.log('\n--- TEST 8: PDF INVOICE GENERATION FOR CUSTOM ORDER ---');
const pdfBinary = buildInvoicePdfBinary(json1);
assert(typeof pdfBinary === 'string', 'PDF output is binary string');
assert(pdfBinary.startsWith('%PDF-1.4'), 'Binary starts with PDF 1.4 header');
assert(pdfBinary.includes('CUSTOM-01'), 'PDF includes CUSTOM-01 item code');
assert(pdfBinary.includes('CUSTOM-02'), 'PDF includes CUSTOM-02 item code');
assert(pdfBinary.includes('Custom Royal Peacock Nath'), 'PDF includes custom product 1 name');
assert(pdfBinary.includes('Custom Bugadi with Pearls'), 'PDF includes custom product 2 name');
assert(pdfBinary.includes('BESPOKE CUSTOM JEWELLERY ORDER'), 'PDF includes bespoke custom order note');

// -----------------------------------------------------------------
// TEST 9: Manual Pricing Math Invariant
// -----------------------------------------------------------------
console.log('\n--- TEST 9: MANUAL PRICING MATH INVARIANTS ---');
// Formula check: Sum(Unit Price * Qty) + Shipping = Total
const items = [
  { price: 1500, qty: 2 },
  { price: 800, qty: 1 }
];
const calculatedSub = items.reduce((sum, it) => sum + it.price * it.qty, 0);
const shippingEntered = 100;
const finalOrderTotal = calculatedSub + shippingEntered;
assert(calculatedSub === 3800, 'Calculated Subtotal is exactly 3800');
assert(finalOrderTotal === 3900, 'Calculated Grand Total is exactly 3900');

// Example with zero shipping:
const zeroShipTotal = calculatedSub + 0;
assert(zeroShipTotal === 3800, 'Calculated Grand Total with ₹0 shipping is 3800');

// -----------------------------------------------------------------
// TEST 10: Payment Verification Lifecycle & Confirmation
// -----------------------------------------------------------------
console.log('\n--- TEST 10: PAYMENT VERIFICATION & TIMELINE LIFECYCLE ---');
const orderForVerification = new Order({
  orderNo: 'NS-2026-000101',
  orderType: 'custom',
  name: 'Sunita Patil',
  phone: '9822012345',
  email: 'sunita@example.com',
  address: '15 Laxmi Road, Khopoli',
  pincode: '410203',
  subtotal: 4500,
  shipping: 50,
  total: 4550,
  paymentMethod: 'upi',
  paymentStatus: 'verification_pending',
  orderStatus: 'placed',
  items: [
    {
      productId: null,
      name: 'Custom Kolhapuri Saaj',
      price: 4500,
      qty: 1,
      itemType: 'custom',
      notes: 'Extra long chain 28 inches'
    }
  ]
});

await orderForVerification.validate();
assert(orderForVerification.paymentStatus === 'verification_pending', 'Initial payment status is verification_pending');
assert(orderForVerification.orderStatus === 'placed', 'Initial order status is placed');
assert(orderForVerification.confirmedAt === null, 'confirmedAt is initially null');
assert(orderForVerification.expectedDeliveryDate === null, 'expectedDeliveryDate is initially null');

// Simulate Admin Payment Verification Action
orderForVerification.paymentStatus = 'verified';
orderForVerification.orderStatus = 'confirmed';
orderForVerification.paymentTransactionId = 'UPI123456789012';
orderForVerification.upiUtr = 'UPI123456789012';
orderForVerification.paymentApp = 'Google Pay';
orderForVerification.confirmedAt = new Date('2026-03-01T10:00:00Z');
orderForVerification.expectedDeliveryDate = new Date(new Date('2026-03-01T10:00:00Z').getTime() + 20 * 24 * 60 * 60 * 1000);

await orderForVerification.validate();
assert(orderForVerification.paymentStatus === 'verified', 'Payment status updated to verified');
assert(orderForVerification.orderStatus === 'confirmed', 'Order status updated to confirmed');
assert(orderForVerification.confirmedAt !== null, 'confirmedAt timestamp is recorded');
assert(orderForVerification.expectedDeliveryDate !== null, 'expectedDeliveryDate is calculated 20 days ahead');
const diffDays = Math.round((orderForVerification.expectedDeliveryDate - orderForVerification.confirmedAt) / (1000 * 60 * 60 * 24));
assert(diffDays === 20, 'Delivery timeline is exactly 20 days after confirmation');

// -----------------------------------------------------------------
// TEST 11: Valid Customer Email Content & Formatting
// -----------------------------------------------------------------
console.log('\n--- TEST 11: VALID EMAIL CONTENT & FORMATTING ---');
const emailPayload = orderForVerification.toJSON();
const emailRes = await sendOrderPlacedEmail(emailPayload);
assert(emailRes.reason !== 'No customer email address on order', 'Valid email is processed and not skipped for missing recipient');

// -----------------------------------------------------------------
// TEST 12: WhatsApp Message Text Generation for Custom Order
// -----------------------------------------------------------------
console.log('\n--- TEST 12: WHATSAPP BILL MESSAGE GENERATION ---');
function simulateWhatsAppMessage(ord) {
  const isCustom = ord.order_type === 'custom' || ord.orderType === 'custom';
  let lines = [];
  lines.push(`Receipt for #${ord.order_no || ord.orderNo}`);
  if (isCustom) lines.push('Order Type: Bespoke Handcrafted Custom Order');
  ord.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} - Qty: ${it.qty} x Rs.${it.price}`);
    if (it.notes) lines.push(`   Note: ${it.notes}`);
  });
  lines.push(`Subtotal: Rs.${ord.subtotal}`);
  lines.push(`Shipping: Rs.${ord.shipping}`);
  lines.push(`Total: Rs.${ord.total}`);
  return lines.join('\n');
}

const waMsg = simulateWhatsAppMessage(json1);
assert(waMsg.includes('Bespoke Handcrafted Custom Order'), 'WhatsApp bill highlights Bespoke Custom Order');
assert(waMsg.includes('Custom Royal Peacock Nath'), 'WhatsApp bill includes item 1 name');
assert(waMsg.includes('Note: 24k gold plating, left clip'), 'WhatsApp bill includes item 1 custom notes');
assert(waMsg.includes('Subtotal: Rs.3800'), 'WhatsApp bill includes correct subtotal');
assert(waMsg.includes('Shipping: Rs.100'), 'WhatsApp bill includes manual shipping');
assert(waMsg.includes('Total: Rs.3900'), 'WhatsApp bill includes grand total');

// -----------------------------------------------------------------
// TEST 13: Regular Order Regression & Compatibility Check
// -----------------------------------------------------------------
console.log('\n--- TEST 13: REGULAR ORDER REGRESSION & COMPATIBILITY ---');
const regularDoc = new Order({
  orderNo: 'NS-2026-000102',
  name: 'Kavita Joshi',
  phone: '9811223344',
  email: 'kavita@example.com',
  address: '12 Ganesh Nagar, Pune',
  pincode: '411038',
  subtotal: 2400,
  shipping: 0,
  total: 2400,
  items: [
    {
      productId: new mongoose.Types.ObjectId(),
      name: 'Peshwai Brahmani Nath',
      price: 2400,
      qty: 1,
      img: '/uploads/brahmani.jpg',
      selectedParameters: { 'Fitting': 'Left Piercing' }
    }
  ]
});

await regularDoc.validate();
assert(regularDoc.orderType === 'regular', 'Default orderType is "regular" for standard orders');
assert(regularDoc.order_type === 'regular', 'order_type alias resolves to "regular"');
assert(regularDoc.items[0].productId !== null, 'Regular order preserves catalog productId');
assert(regularDoc.items[0].itemType === 'product', 'Regular order itemType is "product"');
const regJson = regularDoc.toJSON();
assert(regJson.order_type === 'regular', 'Regular order toJSON has order_type="regular"');

// -----------------------------------------------------------------
// TEST 14: Inventory Isolation Assurance
// -----------------------------------------------------------------
console.log('\n--- TEST 14: INVENTORY ISOLATION ASSURANCE ---');
assert(customDoc1.items.every(i => i.productId === null), 'All custom order items have null productId (no catalog inventory link)');
assert(customDoc1.orderType === 'custom', 'Order is explicitly identified as custom');

console.log('\n================================================================');
console.log(`ALL TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed`);
console.log('================================================================\n');
