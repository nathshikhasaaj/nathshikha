import React, { useState } from 'react';
import {
  X,
  Printer,
  MessageSquare,
  Copy,
  Check,
  FileText,
  AlertCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Download
} from 'lucide-react';
import {
  money,
  formatOrderStatus,
  formatOrderDate,
  formatWhatsAppPhone,
  copyToClipboard
} from '../../utils/formatters';
import { getParameterEntries } from '../../utils/parameterHelpers';
import { generateInvoicePdfFile, downloadInvoicePdf } from '../../utils/pdfGenerator';
import { useToast } from '../../context/ToastContext';
import './AdminOrderBillModal.css';

export default function AdminOrderBillModal({ order, isOpen, onClose }) {
  const { setToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const createdAt = order.created_at || order.createdAt;
  const { dateStr, timeStr, fullStr: formattedDate } = formatOrderDate(createdAt);

  const cleanPhone = formatWhatsAppPhone(
    order.phone || order.customer_phone || order.customerPhone || order.recipient_phone || order.recipientPhone
  );

  const isVerified =
    order.payment_status === 'verified' ||
    order.paymentStatus === 'verified' ||
    order.payment_status === 'paid';

  const isShipped =
    order.order_status === 'shipped' ||
    order.orderStatus === 'shipped' ||
    Boolean(order.shipment_partner || order.tracking_id);

  const items = order.items || [];

  const subtotal =
    Number(order.subtotal) ||
    items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);

  const discount = Number(order.coupon_discount || order.couponDiscount || order.discount || 0);
  const couponCode = order.coupon_code || order.couponCode || null;

  const shippingCharge = Number(
    order.shipping_charge !== undefined ? order.shipping_charge : (order.shipping !== undefined ? order.shipping : 0)
  );

  const grandTotal = Number(order.total || subtotal - discount + shippingCharge);

  const paymentTx =
    order.payment_transaction_id || order.paymentTransactionId || order.upi_utr || order.upiUtr || order.transaction_id || null;

  const paymentApp = order.payment_app || order.paymentApp || null;
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

  const customObj = order.customization || null;
  const hasCustomization = Boolean(
    customObj && (customObj.requested || customObj.details || customObj.referenceImage || customObj.reference_image)
  );

  const getProductCode = (item, index) => {
    if (item.productId) {
      return `PRD-${String(item.productId).slice(-6).toUpperCase()}`;
    }
    if (item.id) {
      return `PRD-${String(item.id).slice(-6).toUpperCase()}`;
    }
    return `PRD-${String(order.order_no).slice(-4)}-${index + 1}`;
  };

  const generateWhatsAppMessage = () => {
    const itemsList = items
      .map((item, i) => {
        const params = getParameterEntries(item.selectedParameters || item.selectedOptions);
        const paramStr = params.length > 0 ? ` [${params.map((p) => `${p.name}: ${p.value}`).join(', ')}]` : '';
        return `${i + 1}. *${item.name}*${paramStr}\n   Qty: ${item.qty || 1} × ${money(item.price)} = ${money(
          (Number(item.price) || 0) * (Number(item.qty) || 1)
        )}`;
      })
      .join('\n');

    let msg = `✨ *NATHSHIKHA LUXURY JEWELLERY — OFFICIAL ORDER BILL* ✨\n\n`;
    msg += `Dear *${customerName}*,\n`;
    msg += `Thank you for shopping with *Nathshikha Luxury Jewellery*! Here is your official order invoice and billing receipt:\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🧾 *Invoice / Order No:* #${order.order_no}\n`;
    msg += `📅 *Date:* ${formattedDate}\n`;
    msg += `🔖 *Order Status:* ${formatOrderStatus(order.order_status)}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `🛍️ *ITEMIZED BREAKDOWN:*\n${itemsList}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Subtotal:* ${money(subtotal)}\n`;
    if (discount > 0) {
      msg += `🏷️ *Coupon Discount:* -${money(discount)}${couponCode ? ` (${couponCode})` : ''}\n`;
    }
    msg += `🚚 *Shipping:* ${shippingCharge === 0 ? 'FREE' : money(shippingCharge)} (${order.shipping_method || order.shippingMethod || 'Standard Delivery'})\n`;
    msg += `✨ *GRAND TOTAL:* ${money(grandTotal)}\n`;
    msg += `💳 *Payment Method:* ${paymentMethod}\n`;
    msg += `✅ *Payment Status:* ${isVerified ? 'VERIFIED & PAID ✓' : 'VERIFICATION PENDING'}\n`;
    if (paymentTx) {
      msg += `🔖 *Transaction Ref / UTR:* ${paymentTx}\n`;
    }
    if (shipmentPartner && trackingId) {
      msg += `🚀 *Shipment:* ${shipmentPartner} | Tracking ID: ${trackingId}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (hasCustomization) {
      msg += `🎨 *CUSTOMIZATION REQUIREMENT:*\n"${customObj?.details || 'Reference design photo attached to order'}"\n\n`;
    }

    msg += `📍 *Delivery Address:*\n`;
    msg += `${recipientName ? `${recipientName}\n` : ''}`;
    msg += `${fullAddress}`;
    if (city || state || pincode) {
      msg += `\n${[city, state, pincode ? `PIN: ${pincode}` : ''].filter(Boolean).join(', ')}`;
    }
    msg += `\n📞 *Contact:* ${customerPhone}\n\n`;
    msg += `👑 *Nathshikha Luxury Jewellery Studio*\n`;
    msg += `📍 Khopoli, Dist Raigad, PIN 410203\n`;
    msg += `🌐 Website: https://nathshikha.in\n`;
    msg += `📞 Support Desk: +91 9699668421\n\n`;
    msg += `_Authenticity Guaranteed • Handcrafted Heritage Craftsmanship • Thank you for your support!_`;

    return msg;
  };

  const handleDownloadPdf = () => {
    try {
      downloadInvoicePdf(order);
      setToast(`Downloaded Invoice PDF for #${order.order_no}`);
    } catch (err) {
      console.error('PDF download error:', err);
      setToast('Failed to download PDF. Please use the Print / Save PDF option.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!cleanPhone) {
      setToast('Customer phone number is not available in this order.');
      return;
    }

    const message = generateWhatsAppMessage();
    let canShareFiles = false;
    let pdfFile = null;

    try {
      pdfFile = generateInvoicePdfFile(order);
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        pdfFile
      ) {
        canShareFiles = navigator.canShare({ files: [pdfFile] });
      }
    } catch (e) {
      console.warn('Native share capability check error:', e);
      canShareFiles = false;
    }

    // 1. Native Web Share API if supported (e.g., mobile Chrome / Safari / Android / iOS)
    if (canShareFiles && pdfFile) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Nathshikha Invoice #${order.order_no}`,
          text: message
        });
        setToast(`Share options opened with Invoice PDF for #${order.order_no}. Select WhatsApp to send.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          // User dismissed the share sheet without picking an app
          return;
        }
        console.warn('Native file share failed, proceeding with fallback:', err);
      }
    }

    // 2. Safe Fallback for desktop / unsupported browsers
    try {
      downloadInvoicePdf(order);
    } catch (e) {
      console.warn('Fallback PDF download failed:', e);
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setToast(
      `Opening WhatsApp chat for #${order.order_no}. PDF invoice downloaded — please attach it manually as this browser does not support direct file sharing.`
    );
  };

  const handleCopyBill = async () => {
    const text = generateWhatsAppMessage();
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setToast(`Order bill summary for #${order.order_no} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setToast(`Invoice #${order.order_no} ready`);
    }
  };

  // Pure self-contained HTML for 100% reliable printing/PDF export
  const generateInvoiceHtml = () => {
    const itemsRows = items
      .map((item, idx) => {
        const params = getParameterEntries(item.selectedParameters || item.selectedOptions);
        const unitPrice = Number(item.price) || 0;
        const qty = Number(item.qty || item.quantity) || 1;
        const rowTotal = unitPrice * qty;
        const prdCode = getProductCode(item, idx);
        const paramsHtml =
          params.length > 0
            ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">
                ${params
                  .map(
                    (p) =>
                      `<span style="font-size:10px;background:#fcf7ef;border:1px solid #ebdcc5;padding:1px 5px;border-radius:3px;color:#5c4e47;">${p.name}: <b>${p.value}</b></span>`
                  )
                  .join('')}
              </div>`
            : '';

        return `
          <tr>
            <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ebdcc5;font-size:11px;">${idx + 1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #ebdcc5;">
              <div style="font-weight:700;font-size:12px;color:#1f1410;">${item.name}</div>
              ${paramsHtml}
            </td>
            <td style="padding:8px 10px;border-bottom:1px solid #ebdcc5;font-family:monospace;font-size:11px;color:#5c4e47;">${prdCode}</td>
            <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ebdcc5;font-size:11.5px;">${money(unitPrice)}</td>
            <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ebdcc5;font-size:11.5px;">${qty}</td>
            <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ebdcc5;font-size:11.5px;font-weight:700;color:#1f1410;">${money(rowTotal)}</td>
          </tr>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Nathshikha_Invoice_${order.order_no}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 14mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #2b1d16;
        margin: 0;
        padding: 0;
        background: #fff;
        font-size: 11.5px;
        line-height: 1.4;
      }
      .invoice-box {
        max-width: 800px;
        margin: 0 auto;
        border: 1px solid #dcd1c4;
        padding: 24px 28px;
        border-radius: 6px;
        background: #ffffff;
      }
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      .brand-title {
        font-size: 22px;
        font-weight: 800;
        color: #5b1420;
        letter-spacing: 1.5px;
        margin: 0;
        font-family: Georgia, serif;
      }
      .brand-subtitle {
        font-size: 9.5px;
        font-weight: 700;
        color: #c29947;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .business-address {
        font-size: 10.5px;
        color: #66564e;
        margin-top: 6px;
        line-height: 1.45;
      }
      .invoice-badge {
        display: inline-block;
        background: #5b1420;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.8px;
        padding: 4px 10px;
        border-radius: 4px;
        margin-bottom: 6px;
      }
      .meta-table {
        border-collapse: collapse;
        font-size: 11px;
        margin-left: auto;
        text-align: right;
      }
      .meta-table td {
        padding: 2px 4px;
      }
      .divider {
        height: 1.5px;
        background: #5b1420;
        margin: 10px 0 14px;
      }
      .parties-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 12px 0;
        margin-left: -12px;
        margin-right: -12px;
        margin-bottom: 14px;
      }
      .party-card {
        width: 50%;
        background: #fdfbf7;
        border: 1px solid #ebdcc5;
        border-radius: 5px;
        padding: 10px 12px;
        vertical-align: top;
      }
      .party-head {
        font-size: 11.5px;
        font-weight: 700;
        color: #5b1420;
        margin: 0 0 6px;
        border-bottom: 1px dashed #ebdcc5;
        padding-bottom: 4px;
      }
      .meta-strip {
        background: #faf6ef;
        border: 1px solid #ebdcc5;
        border-radius: 5px;
        padding: 8px 12px;
        margin-bottom: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px 20px;
      }
      .meta-strip-item {
        display: inline-block;
        margin-right: 16px;
      }
      .meta-strip-label {
        font-size: 9px;
        text-transform: uppercase;
        color: #7d6e64;
        font-weight: 600;
        display: block;
      }
      .meta-strip-val {
        font-size: 11px;
        font-weight: 700;
        color: #2b1d16;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #ebdcc5;
        margin-bottom: 14px;
        border-radius: 4px;
        overflow: hidden;
      }
      .items-table th {
        background: #f7efe4;
        color: #5b1420;
        padding: 8px 10px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #ebdcc5;
      }
      .totals-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
      }
      .totals-side {
        width: 48%;
        vertical-align: top;
      }
      .calc-card {
        background: #fdfaf4;
        border: 1px solid #ebdcc5;
        border-radius: 5px;
        padding: 10px 14px;
      }
      .calc-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 11px;
      }
      .calc-total-row {
        border-top: 1px solid #ebdcc5;
        padding-top: 6px;
        margin-top: 5px;
        font-size: 13px;
        font-weight: 800;
        color: #5b1420;
      }
      .footer-box {
        border-top: 1px solid #ebdcc5;
        padding-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .footer-text {
        font-size: 9.5px;
        color: #7d6e64;
        max-width: 72%;
        line-height: 1.4;
      }
      .sign-box {
        text-align: right;
      }
      .sign-seal {
        font-family: Georgia, serif;
        font-size: 11px;
        font-weight: 800;
        color: #5b1420;
        border-bottom: 1px solid #5b1420;
        padding-bottom: 2px;
      }
    </style>
  </head>
  <body>
    <div class="invoice-box">
      <table class="header-table">
        <tr>
          <td style="vertical-align:top;">
            <div class="brand-title">NATHSHIKHA</div>
            <div class="brand-subtitle">LUXURY HANDCRAFTED JEWELLERY</div>
            <div class="business-address">
              <b>Business Address:</b> Khopoli, Dist Raigad, PIN 410203<br />
              WhatsApp: +91 9699668421 · Email: nathshikha.saaj@gmail.com<br />
              Official Studio Store: <b>https://nathshikha.in</b>
            </div>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <div class="invoice-badge">TAX INVOICE / BILL</div>
            <table class="meta-table">
              <tr>
                <td style="color:#7d6e64;">Invoice No:</td>
                <td><b>INV-${order.order_no}</b></td>
              </tr>
              <tr>
                <td style="color:#7d6e64;">Order ID:</td>
                <td><b>#${order.order_no}</b></td>
              </tr>
              <tr>
                <td style="color:#7d6e64;">Date:</td>
                <td>${formattedDate}</td>
              </tr>
              <tr>
                <td style="color:#7d6e64;">Status:</td>
                <td><b>${formatOrderStatus(order.order_status)}</b></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div class="divider"></div>

      <table class="parties-table">
        <tr>
          <td class="party-card">
            <div class="party-head">Billed To (Buyer)</div>
            <div style="font-weight:700;font-size:12px;color:#1f1410;">${customerName}</div>
            <div style="font-size:11px;color:#5c4e47;margin-top:2px;">Phone: ${customerPhone}</div>
            ${customerEmail ? `<div style="font-size:11px;color:#5c4e47;">Email: ${customerEmail}</div>` : ''}
            <div style="font-size:10.5px;color:#4a3b34;margin-top:4px;">${fullAddress}</div>
          </td>
          <td class="party-card">
            <div class="party-head">Delivery & Shipping Address ${isGift ? '<span style="font-size:9.5px;background:#fce7f3;color:#9d174d;padding:1px 5px;border-radius:3px;margin-left:6px;">🎁 Gift</span>' : ''}</div>
            <div style="font-weight:700;font-size:12px;color:#1f1410;">${recipientName}</div>
            <div style="font-size:11px;color:#5c4e47;margin-top:2px;">Phone: ${order.recipient_phone || order.recipientPhone || customerPhone}</div>
            <div style="font-size:10.5px;color:#4a3b34;margin-top:4px;">${fullAddress}</div>
            ${city || state || pincode ? `<div style="font-size:10.5px;font-weight:600;color:#2b1d16;margin-top:2px;">${[city, state, pincode ? `PIN: ${pincode}` : ''].filter(Boolean).join(', ')}</div>` : ''}
          </td>
        </tr>
      </table>

      <div class="meta-strip">
        <div class="meta-strip-item">
          <span class="meta-strip-label">Payment Mode</span>
          <span class="meta-strip-val">${paymentMethod}</span>
        </div>
        <div class="meta-strip-item">
          <span class="meta-strip-label">Payment Status</span>
          <span class="meta-strip-val" style="color:${isVerified ? '#15803d' : '#b45309'};">${isVerified ? 'VERIFIED & PAID ✓' : 'VERIFICATION PENDING'}</span>
        </div>
        ${paymentTx ? `
          <div class="meta-strip-item">
            <span class="meta-strip-label">Transaction / UTR</span>
            <span class="meta-strip-val" style="font-family:monospace;">${paymentTx}</span>
          </div>
        ` : ''}
        ${shipmentPartner ? `
          <div class="meta-strip-item">
            <span class="meta-strip-label">Shipment Partner</span>
            <span class="meta-strip-val">${shipmentPartner}</span>
          </div>
        ` : ''}
        ${trackingId ? `
          <div class="meta-strip-item">
            <span class="meta-strip-label">Tracking ID</span>
            <span class="meta-strip-val" style="font-family:monospace;">${trackingId}</span>
          </div>
        ` : ''}
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:35px;text-align:center;">#</th>
            <th style="text-align:left;">Product & Customization Details</th>
            <th style="width:110px;text-align:left;">Product Code</th>
            <th style="width:90px;text-align:right;">Price</th>
            <th style="width:50px;text-align:center;">Qty</th>
            <th style="width:90px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <table class="totals-table">
        <tr>
          <td class="totals-side" style="padding-right:10px;">
            ${hasCustomization ? `
              <div style="background:#fffdf8;border:1.5px solid #d4af37;border-radius:5px;padding:9px 12px;margin-bottom:8px;">
                <div style="font-size:11px;font-weight:700;color:#5b1420;margin-bottom:4px;">🎨 Customization Requirement</div>
                <div style="font-size:10.5px;color:#2b1d16;font-style:italic;line-height:1.45;">
                  "${customObj?.details || 'Reference design photo attached to order'}"
                </div>
                ${(customObj?.referenceImage || customObj?.reference_image) ? `
                  <div style="font-size:10px;font-weight:700;color:#92400e;margin-top:4px;">📷 Reference Design Attached</div>
                ` : ''}
              </div>
            ` : `
              <div style="background:#fdfaf3;border:1px dashed #ebdcc5;border-radius:5px;padding:10px 12px;">
                <div style="font-size:11px;font-weight:700;color:#5b1420;margin-bottom:4px;">✨ Authenticity & Craftsmanship Assurance</div>
                <div style="font-size:10px;color:#6b5c53;line-height:1.45;">
                  Every Nathshikha jewellery piece is crafted with utmost devotion and heritage Peshwai artistry. 
                  Handle with love. Keep away from moisture and perfumes for lasting lustre.
                </div>
              </div>
            `}
          </td>
          <td class="totals-side" style="padding-left:10px;">
            <div class="calc-card">
              <div class="calc-row">
                <span style="color:#5c4e47;">Subtotal:</span>
                <b>${money(subtotal)}</b>
              </div>
              ${discount > 0 ? `
                <div class="calc-row" style="color:#15803d;">
                  <span>Coupon Discount ${couponCode ? `(${couponCode})` : ''}:</span>
                  <b>-${money(discount)}</b>
                </div>
              ` : ''}
              <div class="calc-row">
                <span style="color:#5c4e47;">Shipping (${order.shipping_method || order.shippingMethod || 'Standard Delivery'}):</span>
                <b>${shippingCharge === 0 ? '<span style="color:#16a34a;">FREE</span>' : money(shippingCharge)}</b>
              </div>
              <div class="calc-row calc-total-row">
                <span>Grand Total:</span>
                <span>${money(grandTotal)}</span>
              </div>
              <div style="font-size:9.5px;color:#8c7d74;text-align:right;margin-top:2px;">All taxes included · No hidden fees</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="footer-box">
        <div class="footer-text">
          This is a computer-generated order bill issued by Nathshikha Luxury Jewellery (Khopoli, Dist Raigad, PIN 410203). For any inquiries, WhatsApp us at <b>+91 9699668421</b> or email <b>nathshikha.saaj@gmail.com</b>.
        </div>
        <div class="sign-box">
          <div class="sign-seal">NATHSHIKHA</div>
          <div style="font-size:9.5px;color:#7d6e64;font-style:italic;margin-top:2px;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
  };

  const handlePrint = () => {
    try {
      const html = generateInvoiceHtml();

      // Create isolated invisible iframe to avoid any React/modal CSS hiding conflicts
      let iframe = document.getElementById('nathshikha-invoice-print-frame');
      if (iframe) {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }

      iframe = document.createElement('iframe');
      iframe.id = 'nathshikha-invoice-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '1000px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow.document;
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to popup window:', e);
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            win.print();
          }
        }
      }, 250);
    } catch (err) {
      console.error('Print generation failed:', err);
      window.print();
    }
  };

  return (
    <div className="orderBillModalOverlay" onClick={onClose}>
      <div
        className="orderBillModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="billModalTitle"
      >
        {/* Top Modal Navigation Toolbar (Non-printable) */}
        <div className="billModalTopBar no-print">
          <div className="billModalTopLeft">
            <div className="billBadgeIcon">
              <FileText size={18} />
            </div>
            <div>
              <h3 id="billModalTitle" className="billModalTitle">
                Order Bill & Invoice
              </h3>
              <p className="billModalSubtitle">Order #{order.order_no} · Generated for Customer</p>
            </div>
          </div>

          <div className="billModalActions">
            {cleanPhone ? (
              <button
                type="button"
                className="goldBtn compact billActionBtn billWaBtn"
                onClick={handleSendWhatsApp}
                title="Share bill & PDF via WhatsApp"
              >
                <MessageSquare size={14} />
                <span>Share via WhatsApp</span>
              </button>
            ) : (
              <button
                type="button"
                className="outlineBtn compact billActionBtn disabledWaBtn"
                disabled
                title="Phone number unavailable"
              >
                <AlertCircle size={14} />
                <span>No WhatsApp Phone</span>
              </button>
            )}

            <button
              type="button"
              className="outlineBtn compact billActionBtn"
              onClick={handleCopyBill}
              title="Copy bill text summary"
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              className="outlineBtn compact billActionBtn"
              onClick={handleDownloadPdf}
              title="Download vector PDF invoice"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              className="outlineBtn compact billActionBtn"
              onClick={handlePrint}
              title="Print bill or save as PDF"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              className="billModalCloseBtn"
              onClick={onClose}
              aria-label="Close Bill"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Order Bill Sheet */}
        <div className="billSheetScrollArea">
          <div className="nathshikhaPrintableInvoice">
            {/* Header / Brand Header */}
            <div className="invoiceHeader">
              <div className="brandBlock">
                <div className="brandTitleWrap">
                  <h1 className="brandName">NATHSHIKHA</h1>
                  <span className="brandTagline">LUXURY HANDCRAFTED JEWELLERY</span>
                </div>
                <p className="studioLocation">
                  <b>Business Address:</b> Khopoli, Dist Raigad, PIN 410203
                  <br />
                  WhatsApp: +91 9699668421 · Email: nathshikha.saaj@gmail.com
                  <br />
                  Official Studio Store: <b>https://nathshikha.in</b>
                </p>
              </div>

              <div className="invoiceMetaBlock">
                <div className="invoiceBadge">TAX INVOICE / BILL</div>
                <table className="metaMiniTable">
                  <tbody>
                    <tr>
                      <td>Invoice No:</td>
                      <td>
                        <b>INV-{order.order_no}</b>
                      </td>
                    </tr>
                    <tr>
                      <td>Order ID:</td>
                      <td>
                        <b>#{order.order_no}</b>
                      </td>
                    </tr>
                    <tr>
                      <td>Date & Time:</td>
                      <td>{formattedDate}</td>
                    </tr>
                    <tr>
                      <td>Order Status:</td>
                      <td>
                        <span className="invoiceStatusPill">{formatOrderStatus(order.order_status)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="invoiceDivider"></div>

            {/* Billed To & Shipped To Grid */}
            <div className="invoicePartiesGrid">
              <div className="partyBox billedToBox">
                <h4 className="partyTitle">
                  <User size={13} /> Billed To (Buyer)
                </h4>
                <div className="partyDetails">
                  <p className="partyName">
                    <b>{customerName}</b>
                  </p>
                  <p className="partyContact">
                    <Phone size={12} /> {customerPhone}
                  </p>
                  {customerEmail && (
                    <p className="partyContact">
                      <Mail size={12} /> {customerEmail}
                    </p>
                  )}
                  <p className="partyAddress">{fullAddress}</p>
                </div>
              </div>

              <div className="partyBox shippedToBox">
                <h4 className="partyTitle">
                  <MapPin size={13} /> Delivery & Shipping Address
                  {isGift && <span className="giftBadge">🎁 Gift Delivery</span>}
                </h4>
                <div className="partyDetails">
                  <p className="partyName">
                    <b>{recipientName}</b>
                  </p>
                  <p className="partyContact">
                    <Phone size={12} /> {order.recipient_phone || order.recipientPhone || customerPhone}
                  </p>
                  <p className="partyAddress">{fullAddress}</p>
                  {(city || state || pincode) && (
                    <p className="partyLocation">
                      {[city, state, pincode ? `PIN: ${pincode}` : ''].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment & Shipment Metadata Strip */}
            <div className="invoiceMetadataStrip">
              <div className="metaStripItem">
                <span className="stripLabel">Payment Mode</span>
                <b className="stripVal">{paymentMethod}</b>
              </div>

              <div className="metaStripItem">
                <span className="stripLabel">Payment Status</span>
                <b className={`stripVal ${isVerified ? 'textSuccess' : 'textPending'}`}>
                  {isVerified ? 'VERIFIED / PAID ✓' : 'VERIFICATION PENDING'}
                </b>
              </div>

              {paymentTx && (
                <div className="metaStripItem">
                  <span className="stripLabel">Transaction ID / UTR</span>
                  <b className="stripVal textMonospace">{paymentTx}</b>
                </div>
              )}

              {paymentApp && (
                <div className="metaStripItem">
                  <span className="stripLabel">Payment App</span>
                  <b className="stripVal">{paymentApp}</b>
                </div>
              )}

              {shipmentPartner && (
                <div className="metaStripItem">
                  <span className="stripLabel">Shipment Courier</span>
                  <b className="stripVal">{shipmentPartner}</b>
                </div>
              )}

              {trackingId && (
                <div className="metaStripItem">
                  <span className="stripLabel">Tracking AWB ID</span>
                  <b className="stripVal textMonospace">{trackingId}</b>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="invoiceTableWrap">
              <table className="invoiceItemsTable">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th>Product & Customization Details</th>
                    <th style={{ width: '130px' }}>Product Code</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Price</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const params = getParameterEntries(item.selectedParameters || item.selectedOptions);
                      const unitPrice = Number(item.price) || 0;
                      const qty = Number(item.qty || item.quantity) || 1;
                      const rowTotal = unitPrice * qty;
                      const prdCode = getProductCode(item, idx);

                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td>
                            <div className="invoiceItemTitle">
                              <b>{item.name}</b>
                            </div>
                            {params.length > 0 && (
                              <div className="invoiceItemParams">
                                {params.map((p, pIdx) => (
                                  <span key={pIdx} className="paramTag">
                                    {p.name}: <b>${p.value}</b>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="prodCodeText">{prdCode}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>{money(unitPrice)}</td>
                          <td style={{ textAlign: 'center' }}>{qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{money(rowTotal)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                        No product items recorded for this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations & Summary Section */}
            <div className="invoiceTotalsWrap">
              <div className="invoiceNotesSide">
                {hasCustomization ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #fffdf8 0%, #fffbf2 100%)',
                      border: '1.5px solid #d4af37',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--maroon, #5b1420)', fontWeight: 700, fontSize: '12.5px' }}>
                      <Sparkles size={14} color="#d4af37" />
                      <span>🎨 Customization Requirement</span>
                    </div>
                    <blockquote
                      style={{
                        margin: 0,
                        padding: '6px 10px',
                        background: '#ffffff',
                        borderLeft: '3px solid #d4af37',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '11.5px',
                        color: '#2b1f1a',
                        fontStyle: 'italic',
                        lineHeight: 1.45
                      }}
                    >
                      "{customObj?.details || (customObj?.referenceImage || customObj?.reference_image ? 'Reference design photo attached to order.' : 'Customization requested')}"
                    </blockquote>
                    {(customObj?.referenceImage || customObj?.reference_image) && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span>📷 Reference Image Attached</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="heritageAssuranceBox">
                    <div className="heritageAssuranceHeader">
                      <Sparkles size={14} color="var(--gold, #c29947)" />
                      <b>Authenticity & Craftsmanship Assurance</b>
                    </div>
                    <p>
                      Every Nathshikha jewellery piece is crafted with utmost devotion and heritage Peshwai artistry. 
                      Handle with love. Keep away from water, moisture, and alcohol-based perfumes for lasting lustre.
                    </p>
                  </div>
                )}
              </div>

              <div className="invoiceCalcSide">
                <div className="calcRow">
                  <span>Subtotal:</span>
                  <b>{money(subtotal)}</b>
                </div>

                {discount > 0 && (
                  <div className="calcRow discountRow">
                    <span>
                      Coupon Discount {couponCode ? `(${couponCode})` : ''}:
                    </span>
                    <b className="discountNeg">-{money(discount)}</b>
                  </div>
                )}

                <div className="calcRow">
                  <span>
                    Shipping Charge ({order.shipping_method || order.shippingMethod || 'Standard Delivery'}):
                  </span>
                  <b>{shippingCharge === 0 ? <span className="freeText">FREE</span> : money(shippingCharge)}</b>
                </div>

                <div className="calcDivider"></div>

                <div className="calcRow grandTotalRow">
                  <span>Grand Total:</span>
                  <b className="grandTotalAmount">{money(grandTotal)}</b>
                </div>

                <div className="amountInWords">
                  <span>All taxes included · No additional fees</span>
                </div>
              </div>
            </div>

            {/* Invoice Footer Terms */}
            <div className="invoiceFooterBlock">
              <div className="footerNotice">
                <p>
                  This is a computer-generated order bill issued by Nathshikha Luxury Jewellery (Khopoli, Dist Raigad, PIN 410203). 
                  For any support, please contact us on WhatsApp at <b>+91 9699668421</b> or email <b>nathshikha.saaj@gmail.com</b>.
                </p>
              </div>
              <div className="footerSignatureArea">
                <div className="signatureStamp">
                  <div className="signatureSeal">NATHSHIKHA</div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
