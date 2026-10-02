import { escapeHtml } from '../src/utils/formatters.js';

console.log('====================================================');
console.log('STARTING INVOICE XSS HARDENING REGRESSION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }
}

// 1. Test escapeHtml with specific attack payloads
console.log('--- TEST 1: DIRECT escapeHtml() ATTACK VECTOR TESTS ---');

const attack1 = '<script>alert(1)</script>';
const escaped1 = escapeHtml(attack1);
assert(escaped1 === '&lt;script&gt;alert(1)&lt;/script&gt;', 'Script tag correctly escaped to entity format');
assert(!escaped1.includes('<script>'), 'No raw opening script tag present');
assert(!escaped1.includes('</script>'), 'No raw closing script tag present');

const attack2 = '<img src=x onerror=alert(1)>';
const escaped2 = escapeHtml(attack2);
assert(escaped2 === '&lt;img src=x onerror=alert(1)&gt;', 'Image tag and onerror handler safely escaped');
assert(!escaped2.includes('<img'), 'No raw opening img tag present');

const attack3 = '"quotes" and \'single quotes\'';
const escaped3 = escapeHtml(attack3);
assert(escaped3 === '&quot;quotes&quot; and &#39;single quotes&#39;', 'Double and single quotes safely escaped');

const attack4 = "'& special characters: < > \" ' &";
const escaped4 = escapeHtml(attack4);
assert(
  escaped4 === '&#39;&amp; special characters: &lt; &gt; &quot; &#39; &amp;',
  'Ampersand and mixed special characters properly converted'
);

// 2. Test null, undefined, and non-string values
console.log('\n--- TEST 2: NULL / UNDEFINED / PRIMITIVE EDGE CASES ---');
assert(escapeHtml(null) === '', 'Null converts safely to empty string');
assert(escapeHtml(undefined) === '', 'Undefined converts safely to empty string');
assert(escapeHtml('') === '', 'Empty string returns empty string');
assert(escapeHtml(12345) === '12345', 'Number 12345 converts safely to string');
assert(escapeHtml(0) === '0', 'Number 0 converts safely to string');
assert(escapeHtml(false) === 'false', 'Boolean false converts safely to string');

// 3. Simulated Full Invoice Print Template Test with Malicious Order Payload
console.log('\n--- TEST 3: FULL INVOICE HTML TEMPLATE SIMULATION WITH MALICIOUS FIELDS ---');

const maliciousOrder = {
  order_no: '<script>alert("orderNo")</script>',
  customer_name: 'Pooja <script>alert(1)</script> Kulkarni',
  customer_phone: '9820098200" onfocus="alert(1)',
  customer_email: 'pooja" onclick="alert(1)"@example.com',
  recipient_name: '<img src=x onerror=alert("recipient")>',
  recipient_phone: '9811198111<svg onload=alert(1)>',
  address: '14 Shivaji Park <iframe src="javascript:alert(1)"> Dadar',
  city: 'Mumbai"><script>alert(2)</script>',
  state: "Maharashtra' OR '1'='1",
  pincode: '400028" onload="alert(3)',
  payment_method: 'UPI <script>alert("pay")</script>',
  payment_transaction_id: 'TXN-998877" onmouseover="alert(4)',
  shipment_partner: 'Speed Post <b onmouseover=alert(5)>',
  tracking_id: 'SP123456" onblur="alert(6)',
  handwritten_note: 'Happy Birthday! <script>alert("note")</script> & "love" \'always\'',
  customization: {
    details: 'Make in antique gold <img src=x onerror=alert("custom")> & polish "matte"',
    referenceImage: null
  },
  items: [
    {
      name: 'Kolhapuri Saaj <script>alert("item")</script>',
      price: 2499,
      qty: 1,
      selectedParameters: {
        Finish: 'Antique & "Glossy" <script>alert("param")</script>'
      }
    }
  ]
};

// Escape all fields as done in generateInvoiceHtml
const safeOrderNo = escapeHtml(maliciousOrder.order_no);
const safeCustomerName = escapeHtml(maliciousOrder.customer_name);
const safeCustomerPhone = escapeHtml(maliciousOrder.customer_phone);
const safeCustomerEmail = escapeHtml(maliciousOrder.customer_email);
const safeRecipientName = escapeHtml(maliciousOrder.recipient_name);
const safeRecipientPhone = escapeHtml(maliciousOrder.recipient_phone);
const safeAddress = escapeHtml(maliciousOrder.address);
const safeCity = escapeHtml(maliciousOrder.city);
const safeState = escapeHtml(maliciousOrder.state);
const safePincode = escapeHtml(maliciousOrder.pincode);
const safePaymentMethod = escapeHtml(maliciousOrder.payment_method);
const safePaymentTx = escapeHtml(maliciousOrder.payment_transaction_id);
const safeShipmentPartner = escapeHtml(maliciousOrder.shipment_partner);
const safeTrackingId = escapeHtml(maliciousOrder.tracking_id);
const safeHandwrittenNote = escapeHtml(maliciousOrder.handwritten_note);
const safeCustomDetails = escapeHtml(maliciousOrder.customization.details);
const safeItemName = escapeHtml(maliciousOrder.items[0].name);
const safeParamVal = escapeHtml(maliciousOrder.items[0].selectedParameters.Finish);

const simulatedHtml = `
  <div>Invoice: INV-${safeOrderNo}</div>
  <div>Buyer: ${safeCustomerName}</div>
  <div>Phone: ${safeCustomerPhone}</div>
  <div>Email: ${safeCustomerEmail}</div>
  <div>Recipient: ${safeRecipientName}</div>
  <div>Recipient Phone: ${safeRecipientPhone}</div>
  <div>Address: ${safeAddress}, ${safeCity}, ${safeState} - ${safePincode}</div>
  <div>Payment: ${safePaymentMethod} | Tx: ${safePaymentTx}</div>
  <div>Shipping: ${safeShipmentPartner} | Tracking: ${safeTrackingId}</div>
  <div>Note: "${safeHandwrittenNote}"</div>
  <div>Customization: "${safeCustomDetails}"</div>
  <div>Item: ${safeItemName} [Finish: ${safeParamVal}]</div>
`;

// Verify that all injected tags are neutralized into HTML entities
assert(!simulatedHtml.includes('<script>'), 'Simulated HTML contains zero executable <script> tags');
assert(!simulatedHtml.includes('</script>'), 'Simulated HTML contains zero executable </script> tags');
assert(!simulatedHtml.includes('<img'), 'Simulated HTML contains zero executable <img> tags');
assert(!simulatedHtml.includes('<iframe'), 'Simulated HTML contains zero executable <iframe> tags');
assert(!simulatedHtml.includes('<svg'), 'Simulated HTML contains zero executable <svg> tags');
assert(!simulatedHtml.includes('<b onmouseover'), 'Simulated HTML contains zero executable <b> element injections');

// Verify that quotes in attribute breakout attempts are safely escaped
assert(!simulatedHtml.includes('" onfocus='), 'Double quote attribute breakouts converted to &quot;');
assert(!simulatedHtml.includes('" onclick='), 'Double quote onclick breakouts converted to &quot;');
assert(!simulatedHtml.includes('" onmouseover='), 'Double quote onmouseover breakouts converted to &quot;');
assert(!simulatedHtml.includes('" onblur='), 'Double quote onblur breakouts converted to &quot;');
assert(!simulatedHtml.includes('" onload='), 'Double quote onload breakouts converted to &quot;');

// Verify entities exist for each attack payload
assert(simulatedHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Customer name payload properly encoded as text entity');
assert(simulatedHtml.includes('&lt;img src=x onerror=alert(&quot;recipient&quot;)&gt;'), 'Recipient name img payload safely converted to text');
assert(simulatedHtml.includes('&quot;love&quot; &#39;always&#39;'), 'Handwritten note quotes safely escaped');

console.log('\n====================================================');
console.log(`ALL TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
console.log('====================================================');
