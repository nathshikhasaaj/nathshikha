import {
  formatOrderStatus,
  formatOrderDate,
  formatWhatsAppPhone
} from './formatters.js';
import { getParameterEntries } from './parameterHelpers.js';

/**
 * Transliterates Devanagari text to Latin and strips non-printable ASCII
 * for PDF Type1 standard font rendering.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeForPdf(text) {
  if (!text) return '';
  let str = String(text).trim();

  // Common Marathi / Hindi jewellery terms and phrase map
  const phraseMap = [
    [/अ‍ॅक्रेलिक ग्रूम ब्रोच \(नवरदेवाचा ब्रोच\)/gi, 'Acrylic Groom Brooch (Navardevacha Brooch)'],
    [/अ‍ॅक्रेलिक ग्रूम ब्रोच/gi, 'Acrylic Groom Brooch'],
    [/अ‍ॅक्रेलिक ब्राइड ब्रोच/gi, 'Acrylic Bride Brooch'],
    [/नवरदेवाचा ब्रोच/gi, 'Navardevacha Brooch'],
    [/नवरीचा ब्रोच/gi, 'Navricha Brooch'],
    [/पारंपारिक मोत्यांची नथ/gi, 'Paramparik Motyanchi Nath'],
    [/मोत्यांची नथ/gi, 'Motyanchi Nath'],
    [/मोत्याची नथ/gi, 'Motyachi Nath'],
    [/गोफ माळ/gi, 'Goph Maal'],
    [/कोल्हापुरी साज/gi, 'Kolhapuri Saaj'],
    [/ठनका नथ/gi, 'Thanka Nath'],
    [/ब्राह्मणी नथ/gi, 'Brahmani Nath'],
    [/बाण नथ/gi, 'Baan Nath'],
    [/नवरीचा भाऊ/gi, 'Navricha Bhau'],
    [/नवरदेवाचा भाऊ/gi, 'Navardevacha Bhau'],
    [/नवरीची बहीण/gi, 'Navrichi Bahin'],
    [/नवरदेवाची बहीण/gi, 'Navardevachi Bahin'],
    [/नवरीची आई/gi, 'Navrichi Aai'],
    [/नवरदेवाची आई/gi, 'Navardevachi Aai'],
    [/नवरीचे वडील/gi, 'Navriche Vadeel'],
    [/नवरदेवाचे वडील/gi, 'Navardevache Vadeel']
  ];

  for (const [regex, replacement] of phraseMap) {
    str = str.replace(regex, replacement);
  }

  // Devanagari character sets
  const vowels = {
    'अ': 'A', 'आ': 'Aa', 'इ': 'I', 'ई': 'Ee', 'उ': 'U', 'ऊ': 'Oo', 'ऋ': 'Ru',
    'ए': 'E', 'ऐ': 'Ai', 'ओ': 'O', 'औ': 'Au', 'अं': 'Am', 'अः': 'Ah', 'ॲ': 'A', 'ऑ': 'O'
  };
  const matras = {
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ru',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h',
    'ॅ': 'e', 'ॉ': 'o', '्': ''
  };
  const consonants = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'dny'
  };

  let transliterated = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (vowels[ch]) {
      transliterated += vowels[ch];
    } else if (consonants[ch]) {
      const next = str[i + 1];
      const cSound = consonants[ch];
      if (next && matras[next] !== undefined) {
        transliterated += cSound + (matras[next] || '');
        i++;
      } else if (next === '्') {
        transliterated += cSound;
        i++;
      } else {
        const nextChar = str[i + 1];
        if (!nextChar || ' (),.-:;!?/[]{}'.includes(nextChar)) {
          transliterated += cSound;
        } else {
          transliterated += cSound + 'a';
        }
      }
    } else if (matras[ch]) {
      transliterated += matras[ch];
    } else {
      transliterated += ch;
    }
  }

  return transliterated
    .replace(/\u20B9/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapes special characters for PostScript / PDF text string literals
 * @param {string} txt
 * @returns {string}
 */
export function escapePdfText(txt) {
  if (!txt) return '';
  const sanitized = sanitizeForPdf(txt);
  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Formats monetary amounts cleanly for PDF streams without unicode symbols
 * @param {number|string} amount
 * @returns {string}
 */
export function pdfMoney(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
}

/**
 * Generates a valid, self-contained Vector PDF 1.4 byte string for an order invoice
 * @param {Object} order
 * @returns {string} PDF binary string
 */
export function buildInvoicePdfBinary(order) {
  if (!order) return '';

  const width = 595.28; // Standard A4 Width (points)
  const height = 841.89; // Standard A4 Height (points)
  let stream = '';

  const setColor = (r, g, b) => {
    stream += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg\n`;
  };
  const setStrokeColor = (r, g, b) => {
    stream += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG\n`;
  };
  const drawRect = (x, y, w, h, fill = true, stroke = false) => {
    stream += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re\n`;
    if (fill && stroke) stream += 'B\n';
    else if (fill) stream += 'f\n';
    else if (stroke) stream += 'S\n';
  };
  const drawLine = (x1, y1, x2, y2, lineWidth = 1) => {
    stream += `${lineWidth} w\n`;
    stream += `${x1.toFixed(2)} ${y1.toFixed(2)} m\n`;
    stream += `${x2.toFixed(2)} ${y2.toFixed(2)} l\n`;
    stream += 'S\n';
  };
  const drawText = (txt, x, y, font = 'F1', size = 10, r = 43, g = 29, b = 22) => {
    if (txt === undefined || txt === null) return;
    setColor(r, g, b);
    stream += 'BT\n';
    stream += `/${font} ${size} Tf\n`;
    stream += `${x.toFixed(2)} ${y.toFixed(2)} Td\n`;
    stream += `(${escapePdfText(txt)}) Tj\n`;
    stream += 'ET\n';
  };

  // Order Details Extraction with thorough fallbacks
  const orderNo = order.order_no || order.orderNo || order.id || order._id || 'ORDER';
  const createdAt = order.created_at || order.createdAt || new Date();
  const { fullStr: formattedDate } = formatOrderDate(createdAt);

  const isVerified =
    order.payment_status === 'verified' ||
    order.paymentStatus === 'verified' ||
    order.payment_status === 'paid' ||
    order.paymentStatus === 'paid';

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal =
    Number(order.subtotal) ||
    items.reduce((acc, item) => acc + (Number(item.price || item.unitPrice || 0) * (Number(item.qty || item.quantity) || 1)), 0);

  const discount = Number(order.coupon_discount ?? order.couponDiscount ?? order.discount ?? 0);
  const couponCode = order.coupon_code || order.couponCode || null;

  const shippingCharge = Number(
    order.shipping_charge !== undefined
      ? order.shipping_charge
      : order.shipping !== undefined
      ? order.shipping
      : 0
  );

  const grandTotal = Number(order.total || order.grandTotal || (subtotal - discount + shippingCharge));

  const paymentTx =
    order.payment_transaction_id ||
    order.paymentTransactionId ||
    order.upi_utr ||
    order.upiUtr ||
    order.transaction_id ||
    null;

  const paymentMethod = (order.payment_method || order.paymentMethod || 'UPI').toUpperCase();
  const shipmentPartner = order.shipment_partner || order.shipmentPartner || null;
  const trackingId = order.tracking_id || order.trackingId || null;

  const customerName = order.customer_name || order.customerName || order.name || 'Customer';
  const recipientName = order.recipient_name || order.recipientName || order.name || customerName;
  const isGift = Boolean(order.is_gift || order.isGift);

  const customerPhone = order.phone || order.customer_phone || order.customerPhone || '—';
  const customerEmail = order.email || order.customer_email || order.customerEmail || null;

  const fullAddress = order.address || '—';
  const pincode = order.pin || order.pincode || null;
  const city = order.city || null;
  const state = order.state || null;

  const hasGiftWrap = Boolean(order.gift_wrap || order.giftWrap || (Number(order.gift_wrap_charge || order.giftWrapCharge) > 0));
  const giftWrapCharge = hasGiftWrap ? Number(order.gift_wrap_charge || order.giftWrapCharge || 20) : 0;
  const handwrittenNote = String(order.handwritten_note || order.handwrittenNote || '').trim();

  const getProductCode = (item, index) => {
    if (item.productCode) return String(item.productCode);
    if (item.sku) return String(item.sku);
    if (item.product_code) return String(item.product_code);
    if (item.productId) return `PRD-${String(item.productId).slice(-6).toUpperCase()}`;
    if (item.id) return `PRD-${String(item.id).slice(-6).toUpperCase()}`;
    return `PRD-${String(orderNo).slice(-4)}-${index + 1}`;
  };

  // 1. Top Decorative Bar
  setColor(91, 20, 32); // Maroon
  drawRect(0, height - 8, width, 8, true, false);

  // 2. Header Branding
  drawText('NATHSHIKHA', 40, height - 48, 'F2', 20, 91, 20, 32);
  drawText('LUXURY HANDCRAFTED JEWELLERY', 40, height - 62, 'F2', 8.5, 194, 153, 71);
  drawText('Business Address: Khopoli, Dist Raigad, PIN 410203', 40, height - 76, 'F1', 9, 102, 86, 78);
  drawText('WhatsApp: +91 9699668421 | Email: nathshikha.saaj@gmail.com', 40, height - 88, 'F1', 8.5, 102, 86, 78);
  drawText('Official Studio Store: https://nathshikha.in', 40, height - 100, 'F1', 8.5, 102, 86, 78);

  // Tax Invoice Badge & Meta
  setColor(91, 20, 32);
  drawRect(width - 180, height - 52, 140, 20, true, false);
  drawText('TAX INVOICE / BILL', width - 168, height - 44, 'F2', 9.5, 255, 255, 255);

  drawText(`Invoice No: INV-${orderNo}`, width - 180, height - 68, 'F2', 9.5, 43, 29, 22);
  drawText(`Order ID: #${orderNo}`, width - 180, height - 80, 'F1', 9, 43, 29, 22);
  drawText(`Date: ${formattedDate}`, width - 180, height - 92, 'F1', 8.5, 102, 86, 78);
  drawText(`Status: ${formatOrderStatus(order.order_status || order.orderStatus)}`, width - 180, height - 104, 'F2', 8.5, 146, 64, 14);

  // Divider
  setStrokeColor(219, 190, 150);
  drawLine(40, height - 114, width - 40, height - 114, 1.5);

  // Billed To & Shipped To Cards
  const cardY = height - 200;
  const cardW = 248;
  const cardH = 76;

  // Buyer Card
  setColor(253, 251, 247);
  setStrokeColor(235, 220, 197);
  drawRect(40, cardY, cardW, cardH, true, true);
  drawText('BILLED TO (BUYER)', 50, cardY + cardH - 14, 'F2', 9, 91, 20, 32);
  drawText(customerName, 50, cardY + cardH - 28, 'F2', 10, 31, 20, 16);
  drawText(`Phone: ${customerPhone}`, 50, cardY + cardH - 40, 'F1', 8.5, 92, 78, 71);
  if (customerEmail) {
    drawText(`Email: ${customerEmail}`, 50, cardY + cardH - 52, 'F1', 8.5, 92, 78, 71);
  }
  drawText(fullAddress.substring(0, 48), 50, cardY + cardH - 64, 'F1', 8, 92, 78, 71);

  // Delivery Card
  setColor(253, 251, 247);
  setStrokeColor(235, 220, 197);
  drawRect(width - 40 - cardW, cardY, cardW, cardH, true, true);
  drawText(
    isGift ? 'DELIVERY & SHIPPING (GIFT)' : 'DELIVERY & SHIPPING ADDRESS',
    width - 40 - cardW + 10,
    cardY + cardH - 14,
    'F2',
    9,
    91,
    20,
    32
  );
  drawText(recipientName, width - 40 - cardW + 10, cardY + cardH - 28, 'F2', 10, 31, 20, 16);
  drawText(
    `Phone: ${order.recipient_phone || order.recipientPhone || customerPhone}`,
    width - 40 - cardW + 10,
    cardY + cardH - 40,
    'F1',
    8.5,
    92,
    78,
    71
  );
  drawText(fullAddress.substring(0, 48), width - 40 - cardW + 10, cardY + cardH - 52, 'F1', 8, 92, 78, 71);
  if (city || state || pincode) {
    drawText(
      [city, state, pincode ? `PIN: ${pincode}` : ''].filter(Boolean).join(', '),
      width - 40 - cardW + 10,
      cardY + cardH - 64,
      'F2',
      8,
      43,
      29,
      22
    );
  }

  // Payment Strip
  const stripY = cardY - 26;
  setColor(250, 246, 239);
  setStrokeColor(235, 220, 197);
  drawRect(40, stripY, width - 80, 20, true, true);
  drawText(
    `PAYMENT: ${paymentMethod} (${isVerified ? 'VERIFIED & PAID' : 'VERIFICATION PENDING'})`,
    48,
    stripY + 6,
    'F2',
    8.5,
    isVerified ? 21 : 180,
    isVerified ? 128 : 83,
    isVerified ? 61 : 9
  );
  if (paymentTx) {
    drawText(`TX/UTR: ${paymentTx}`, 240, stripY + 6, 'F1', 8.5, 43, 29, 22);
  }
  if (shipmentPartner) {
    drawText(
      `COURIER: ${shipmentPartner}${trackingId ? ` (AWB: ${trackingId})` : ''}`,
      370,
      stripY + 6,
      'F1',
      8.5,
      43,
      29,
      22
    );
  }

  // Items Table Header
  const tableHeaderY = stripY - 24;
  setColor(247, 239, 228);
  setStrokeColor(235, 220, 197);
  drawRect(40, tableHeaderY, width - 80, 18, true, true);
  drawText('#', 48, tableHeaderY + 5, 'F2', 8, 91, 20, 32);
  drawText('PRODUCT & CUSTOMIZATION DETAILS', 75, tableHeaderY + 5, 'F2', 8, 91, 20, 32);
  drawText('CODE', 300, tableHeaderY + 5, 'F2', 8, 91, 20, 32);
  drawText('UNIT PRICE', 370, tableHeaderY + 5, 'F2', 8, 91, 20, 32);
  drawText('QTY', 450, tableHeaderY + 5, 'F2', 8, 91, 20, 32);
  drawText('TOTAL', 500, tableHeaderY + 5, 'F2', 8, 91, 20, 32);

  // Items Rows
  let currentY = tableHeaderY - 26;
  if (items.length === 0) {
    setColor(255, 255, 255);
    setStrokeColor(240, 230, 216);
    drawRect(40, currentY, width - 80, 24, true, true);
    drawText('No items recorded for this order', 75, currentY + 8, 'F1', 8.5, 92, 78, 71);
    currentY -= 26;
  } else {
    items.forEach((item, idx) => {
      const params = getParameterEntries(item.selectedParameters || item.selectedOptions);
      const paramStr = params.length > 0 ? params.map((p) => `${p.name}: ${p.value}`).join(', ') : '';
      const unitPrice = Number(item.price || item.unitPrice || 0);
      const qty = Number(item.qty || item.quantity) || 1;
      const rowTotal = unitPrice * qty;
      const prdCode = getProductCode(item, idx);
      const itemName = item.name || item.product_name || item.title || item.productName || 'Jewellery Item';

      const rowHeight = paramStr ? 28 : 22;
      setColor(idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 246);
      setStrokeColor(240, 230, 216);
      drawRect(40, currentY, width - 80, rowHeight, true, true);

      drawText(String(idx + 1), 48, currentY + (paramStr ? 12 : 7), 'F1', 9, 92, 78, 71);
      drawText(itemName.substring(0, 42), 75, currentY + (paramStr ? 15 : 7), 'F2', 9, 31, 20, 16);
      if (paramStr) {
        drawText(paramStr.substring(0, 50), 75, currentY + 4, 'F1', 7.5, 120, 90, 60);
      }
      drawText(prdCode, 300, currentY + (paramStr ? 12 : 7), 'F1', 8.5, 92, 78, 71);
      drawText(pdfMoney(unitPrice), 370, currentY + (paramStr ? 12 : 7), 'F1', 8.5, 43, 29, 22);
      drawText(String(qty), 455, currentY + (paramStr ? 12 : 7), 'F1', 9, 43, 29, 22);
      drawText(pdfMoney(rowTotal), 500, currentY + (paramStr ? 12 : 7), 'F2', 9, 31, 20, 16);

      currentY -= (rowHeight + 2);
    });
  }

  // Totals Area
  const totalsY = Math.max(currentY - 84, 76);
  setColor(253, 250, 243);
  setStrokeColor(235, 220, 197);
  drawRect(40, totalsY, 240, 80, true, true);

  const customObj = order.customization;
  const hasPdfCustom = Boolean(customObj?.requested || customObj?.details || customObj?.referenceImage || customObj?.reference_image);

  if (handwrittenNote) {
    drawText('* HANDWRITTEN NOTE FOR RECIPIENT', 48, totalsY + 66, 'F2', 8, 157, 23, 77);
    const noteTxt = handwrittenNote.substring(0, 48);
    drawText(`"${noteTxt}"`, 48, totalsY + 52, 'F1', 7.5, 131, 24, 67);
    if (handwrittenNote.length > 48) {
      drawText(`"${handwrittenNote.substring(48, 96)}"`, 48, totalsY + 40, 'F1', 7.5, 131, 24, 67);
    }
  } else if (hasPdfCustom) {
    drawText('* CUSTOMIZATION REQUIREMENT', 48, totalsY + 66, 'F2', 8, 91, 20, 32);
    const customTxt = customObj?.details || (customObj?.referenceImage || customObj?.reference_image ? 'Reference design photo attached' : 'Customization requested');
    drawText(`"${customTxt.substring(0, 48)}"`, 48, totalsY + 52, 'F1', 7.5, 31, 20, 16);
    if (customTxt.length > 48) {
      drawText(`"${customTxt.substring(48, 96)}"`, 48, totalsY + 40, 'F1', 7.5, 31, 20, 16);
    }
    if (customObj?.referenceImage || customObj?.reference_image) {
      drawText('Reference Design: Design Image Attached', 48, totalsY + 26, 'F2', 7.5, 146, 64, 14);
    }
  } else {
    drawText('* AUTHENTICITY & CRAFTSMANSHIP ASSURANCE', 48, totalsY + 66, 'F2', 8, 91, 20, 32);
    drawText('Every Nathshikha jewellery piece is handcrafted with', 48, totalsY + 52, 'F1', 7.5, 107, 92, 83);
    drawText('utmost devotion and Peshwai artistry. Keep away from', 48, totalsY + 40, 'F1', 7.5, 107, 92, 83);
    drawText('moisture and perfumes for lasting shine and lustre.', 48, totalsY + 28, 'F1', 7.5, 107, 92, 83);
  }

  setColor(253, 250, 244);
  setStrokeColor(235, 220, 197);
  drawRect(300, totalsY, 255, 80, true, true);
  drawText('Subtotal:', 312, totalsY + 64, 'F1', 9, 74, 59, 52);
  drawText(pdfMoney(subtotal), 485, totalsY + 64, 'F2', 9, 26, 16, 12);
  if (discount > 0) {
    drawText(`Coupon Discount ${couponCode ? `(${couponCode})` : ''}:`, 312, totalsY + 50, 'F1', 8.5, 21, 128, 61);
    drawText(`-${pdfMoney(discount)}`, 485, totalsY + 50, 'F2', 8.5, 21, 128, 61);
  }
  drawText(
    `Shipping (${order.shipping_method || order.shippingMethod || 'Standard Delivery'}):`,
    312,
    totalsY + (hasGiftWrap ? 38 : 32),
    'F1',
    8.5,
    74,
    59,
    52
  );
  drawText(shippingCharge === 0 ? 'FREE' : pdfMoney(shippingCharge), 485, totalsY + (hasGiftWrap ? 38 : 32), 'F2', 8.5, 26, 16, 12);

  if (hasGiftWrap) {
    drawText('Luxury Gift Wrap:', 312, totalsY + 24, 'F1', 8.5, 157, 23, 77);
    drawText(`+${pdfMoney(giftWrapCharge)}`, 485, totalsY + 24, 'F2', 8.5, 157, 23, 77);
  }

  setStrokeColor(235, 220, 197);
  drawLine(312, totalsY + 16, 542, totalsY + 16, 1);

  drawText('GRAND TOTAL:', 312, totalsY + 4, 'F2', 10, 91, 20, 32);
  drawText(pdfMoney(grandTotal), 480, totalsY + 4, 'F2', 11, 91, 20, 32);

  // Footer Block
  const footerY = 36;
  setStrokeColor(235, 220, 197);
  drawLine(40, footerY + 26, width - 40, footerY + 26, 1);
  drawText(
    'Computer-generated tax invoice issued by Nathshikha Luxury Jewellery (Khopoli, Dist Raigad, PIN 410203).',
    40,
    footerY + 15,
    'F1',
    7.5,
    120,
    110,
    100
  );
  drawText(
    'Support Desk: WhatsApp +91 9699668421 | Email nathshikha.saaj@gmail.com | Store: nathshikha.in',
    40,
    footerY + 5,
    'F1',
    7.5,
    120,
    110,
    100
  );

  drawText('NATHSHIKHA', width - 110, footerY + 15, 'F2', 9.5, 91, 20, 32);
  drawText('Authorized Signatory', width - 120, footerY + 5, 'F1', 7.5, 125, 110, 100);

  // Build Standard PDF Object Stream
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
  );
  addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let pdfOutput = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfOutput.length);
    pdfOutput += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdfOutput.length;
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdfOutput += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdfOutput;
}

/**
 * Returns a valid PDF Blob
 * @param {Object} order
 * @returns {Blob}
 */
export function generateInvoicePdfBlob(order) {
  const binary = buildInvoicePdfBinary(order);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * Returns a standard File object for Web Share API
 * @param {Object} order
 * @returns {File}
 */
export function generateInvoicePdfFile(order) {
  const blob = generateInvoicePdfBlob(order);
  const orderNo = order.order_no || order.orderNo || 'order';
  const filename = `Nathshikha_Invoice_${orderNo}.pdf`;
  try {
    return new File([blob], filename, { type: 'application/pdf' });
  } catch (e) {
    blob.name = filename;
    blob.lastModifiedDate = new Date();
    return blob;
  }
}

/**
 * Direct file download trigger for invoice PDF
 * @param {Object} order
 */
export function downloadInvoicePdf(order) {
  const blob = generateInvoicePdfBlob(order);
  const orderNo = order.order_no || order.orderNo || 'order';
  const filename = `Nathshikha_Invoice_${orderNo}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
