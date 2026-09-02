import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { EmailEvent } from '../models/EmailEvent.js';

const SMTP_USER = process.env.SMTP_USER || 'nathshikha.saaj@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'nathshikha.saaj@gmail.com';

export function getAppBaseUrl(overrideOrigin) {
  if (overrideOrigin && typeof overrideOrigin === 'string' && (overrideOrigin.startsWith('http://') || overrideOrigin.startsWith('https://'))) {
    if (!overrideOrigin.includes('localhost') || process.env.NODE_ENV !== 'production') {
      return overrideOrigin.replace(/\/+$/, '');
    }
  }
  return (process.env.APP_BASE_URL || 'https://nathshikha.in').replace(/\/+$/, '');
}

/**
 * Singleton Nodemailer Transporter configured for live production servers
 */
let transporterInstance = null;

function getTransporter() {
  if (!transporterInstance) {
    const rawPass = process.env.SMTP_PASSWORD || '';
    const cleanPass = rawPass.replace(/\s+/g, '').trim();
    transporterInstance = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Direct SSL for reliable delivery on live cloud servers
      auth: {
        user: process.env.SMTP_USER || SMTP_USER,
        pass: cleanPass
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }
  return transporterInstance;
}

export async function verifySmtpConnection() {
  const transporter = getTransporter();
  return transporter.verify();
}

/**
 * Common Responsive HTML Email Wrapper with Nathshikha Royal Branding
 */
function renderEmailLayout({ title, previewText, contentHtml, ctaText, ctaUrl, baseUrl: customBaseUrl }) {
  const baseUrl = customBaseUrl || getAppBaseUrl();
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f1ea;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2b1f1d;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f6f1ea;
      padding: 30px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e7ddc8;
      box-shadow: 0 4px 18px rgba(79, 61, 56, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #6d1b29 0%, #4a0f1b 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .brand-title {
      font-family: Georgia, 'Playfair Display', serif;
      font-size: 26px;
      letter-spacing: 2px;
      color: #fbf5e6;
      margin: 0;
      text-transform: uppercase;
      font-weight: 700;
    }
    .brand-subtitle {
      font-size: 11px;
      letter-spacing: 3px;
      color: #e5c378;
      margin-top: 6px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 28px;
    }
    h1, h2, h3 {
      color: #6d1b29;
      font-family: Georgia, 'Playfair Display', serif;
    }
    p {
      line-height: 1.65;
      font-size: 14.5px;
      color: #3f332f;
      margin: 0 0 16px 0;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0 20px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #6d1b29;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 30px;
      border-radius: 6px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(109, 27, 41, 0.25);
    }
    .notice-card {
      background-color: #fdfbf7;
      border: 1px solid #ebdcc6;
      border-left: 4px solid #c69a59;
      border-radius: 6px;
      padding: 16px;
      margin: 22px 0;
    }
    .order-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .order-table th {
      background-color: #faf5ee;
      color: #6d1b29;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #ebdcc6;
    }
    .order-table td {
      padding: 12px;
      border-bottom: 1px solid #f1e7d8;
      font-size: 13.5px;
      color: #332724;
    }
    .total-row td {
      font-weight: 700;
      font-size: 15px;
      color: #6d1b29;
      border-top: 2px solid #ebdcc6;
      border-bottom: none;
    }
    .footer {
      background-color: #faf6f0;
      border-top: 1px solid #e7ddc8;
      padding: 24px;
      text-align: center;
      font-size: 11.5px;
      color: #7a6b63;
      line-height: 1.55;
    }
    .footer a {
      color: #6d1b29;
      text-decoration: none;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .content {
        padding: 22px 18px !important;
      }
      .header {
        padding: 24px 18px !important;
      }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText || title}
  </div>
  <div class="wrapper">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <div class="container">
            <div class="header">
              <h1 class="brand-title">NATHSHIKHA</h1>
              <div class="brand-subtitle">Handmade Maharashtrian Jewellery</div>
            </div>
            <div class="content">
              ${contentHtml}
              ${
                ctaText && ctaUrl
                  ? `
              <div class="cta-container">
                <a href="${ctaUrl}" target="_blank" class="cta-button">${ctaText}</a>
              </div>
              `
                  : ''
              }
            </div>
            <div class="footer">
              <p style="margin:0 0 8px 0;"><strong>Nathshikha Jewellery Studio</strong> · Khopoli, Maharashtra, India</p>
              <p style="margin:0 0 8px 0;">Need help? WhatsApp us at <a href="https://wa.me/919699668421">+91 96996 68421</a> or email <a href="mailto:${EMAIL_FROM}">${EMAIL_FROM}</a></p>
              <p style="margin:0; font-size: 10.5px; color: #a19289;">&copy; ${year} Nathshikha. All rights reserved.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}

/**
 * Base Dispatch Helper with Non-Blocking Error Catching and EmailEvent Logging
 */
async function sendEmailCore({
  to,
  subject,
  html,
  text,
  emailType,
  orderId = null,
  userId = null,
  metadata = {}
}) {
  if (!to || !to.includes('@')) {
    console.warn(`[EmailService] Skipped: invalid recipient "${to}" for ${emailType}`);
    return { success: false, skipped: true, error: 'Invalid recipient email' };
  }

  const recipient = to.toLowerCase().trim();

  // If password is not configured, record skipped/pending event without throwing
  if (!process.env.SMTP_PASSWORD) {
    console.warn(
      `[EmailService] SMTP_PASSWORD is not set in environment. Email [${emailType}] to ${recipient} was not dispatched to SMTP server.`
    );
    try {
      await EmailEvent.create({
        orderId,
        userId,
        emailType,
        recipient,
        subject,
        status: 'skipped',
        errorMessage: 'SMTP_PASSWORD is not configured in server environment',
        metadata
      });
    } catch (dbErr) {
      console.error('[EmailService] Failed to log email event:', dbErr.message);
    }
    return { success: false, skipped: true, error: 'SMTP_PASSWORD not configured' };
  }

  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `"Nathshikha Jewellery" <${EMAIL_FROM}>`,
      to: recipient,
      subject,
      text: text || subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ [EmailService] ${emailType} sent to ${recipient} (MessageId: ${info.messageId})`);

    await EmailEvent.create({
      orderId,
      userId,
      emailType,
      recipient,
      subject,
      status: 'sent',
      metadata: { ...metadata, messageId: info.messageId }
    }).catch((dbErr) => console.error('[EmailService] Failed to log sent event:', dbErr.message));

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`✗ [EmailService] Failed to send ${emailType} to ${recipient}:`, err.message);

    await EmailEvent.create({
      orderId,
      userId,
      emailType,
      recipient,
      subject,
      status: 'failed',
      errorMessage: err.message,
      metadata
    }).catch((dbErr) => console.error('[EmailService] Failed to log failure event:', dbErr.message));

    // Return failure result without throwing so business logic remains 100% resilient
    return { success: false, error: err.message };
  }
}

/* ============================================================ */
/* 1. CUSTOMER REGISTRATION — EMAIL VERIFICATION                */
/* ============================================================ */
export async function sendVerificationEmail(user, rawToken, originUrl = null) {
  const baseUrl = getAppBaseUrl(originUrl);
  const verifyUrl = `${baseUrl}/verify-email/${rawToken}`;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Welcome to Nathshikha ❤️</h2>
    <p>Dear <strong>${user.name || 'Valued Customer'}</strong>,</p>
    <p>Thank you for creating an account with Nathshikha. We are delighted to welcome you to our family of authentic handcrafted Maharashtrian jewellery admirers.</p>
    <p>Please verify your email address to activate your Nathshikha account and enjoy seamless order tracking, exclusive patron privileges, and a personalized experience.</p>
    <div class="notice-card">
      <p style="margin:0; font-size:12.5px; color:#6d1b29;">
        ⏳ <strong>Security Notice:</strong> This verification link is valid for <strong>24 hours</strong>. For security purposes, it can only be used once.
      </p>
    </div>
    <p style="font-size:12px; color:#8c7f78;">If the button above does not work, copy and paste this link in your browser:<br>
      <a href="${verifyUrl}" style="color:#6d1b29; word-break:break-all;">${verifyUrl}</a>
    </p>
  `;

  return sendEmailCore({
    to: user.email,
    subject: 'Verify Your Nathshikha Account',
    html: renderEmailLayout({
      title: 'Verify Your Nathshikha Account',
      previewText: 'Please verify your email to activate your Nathshikha account',
      contentHtml,
      ctaText: 'Verify Email Address',
      ctaUrl: verifyUrl,
      baseUrl
    }),
    text: `Welcome to Nathshikha! Please verify your email address: ${verifyUrl}`,
    emailType: 'EMAIL_VERIFICATION',
    userId: user._id || user.id
  });
}

/* ============================================================ */
/* 2. FORGOT PASSWORD — PASSWORD RESET EMAIL                   */
/* ============================================================ */
export async function sendPasswordResetEmail(user, rawToken, originUrl = null) {
  const baseUrl = getAppBaseUrl(originUrl);
  const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Password Reset Request</h2>
    <p>Dear <strong>${user.name || 'Valued Customer'}</strong>,</p>
    <p>We received a request to reset your Nathshikha account password. Click the button below to create a new secure password for your account.</p>
    <div class="notice-card">
      <p style="margin:0; font-size:12.5px; color:#6d1b29;">
        🔒 <strong>Security Notice:</strong> This reset link is single-use and will expire in <strong>30 minutes</strong>.
      </p>
    </div>
    <p style="margin-top:20px; font-size:13px; color:#64748b;">
      <em>If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.</em>
    </p>
    <p style="font-size:12px; color:#8c7f78;">Direct link: <a href="${resetUrl}" style="color:#6d1b29; word-break:break-all;">${resetUrl}</a></p>
  `;

  return sendEmailCore({
    to: user.email,
    subject: 'Reset Your Nathshikha Password',
    html: renderEmailLayout({
      title: 'Reset Your Nathshikha Password',
      previewText: 'Instructions to reset your Nathshikha account password',
      contentHtml,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
      baseUrl
    }),
    text: `Reset your Nathshikha password by visiting: ${resetUrl}`,
    emailType: 'PASSWORD_RESET',
    userId: user._id || user.id
  });
}

/**
 * Helper to build Item rows in Order Email HTML
 */
function renderOrderItemsTable(order) {
  const items = order.items || [];
  const itemsRows = items
    .map((item) => {
      const paramsMap =
        (item.selectedParameters && typeof item.selectedParameters === 'object' ? item.selectedParameters : null) ||
        (item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {});

      const optionsText = Object.entries(paramsMap)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');

      return `
    <tr>
      <td>
        <strong>${item.name}</strong>
        ${item.tag ? `<br><small style="color:#c69a59; font-weight:600;">${item.tag}</small>` : ''}
        ${optionsText ? `<br><span style="font-size:11.5px; color:#78350f; background:#fef3c7; padding:2px 6px; border-radius:3px; display:inline-block; margin-top:3px;">${optionsText}</span>` : ''}
      </td>
      <td style="text-align:center;">${item.qty || 1}</td>
      <td style="text-align:right;">₹${Number(item.price || 0).toLocaleString('en-IN')}</td>
    </tr>
  `;
    })
    .join('');

  const subtotal = order.subtotal || items.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 1), 0);
  const discount = order.coupon_discount || order.couponDiscount || 0;
  const shipping = order.shipping_charge !== undefined ? order.shipping_charge : (order.shipping !== undefined ? order.shipping : 0);
  const total = order.total || Math.max(0, subtotal - discount) + shipping;

  return `
    <table class="order-table">
      <thead>
        <tr>
          <th>Jewellery Piece</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr>
          <td colspan="2" style="text-align:right; color:#7a6b63;">Subtotal:</td>
          <td style="text-align:right;">₹${Number(subtotal).toLocaleString('en-IN')}</td>
        </tr>
        ${
          discount > 0
            ? `
        <tr>
          <td colspan="2" style="text-align:right; color:#15803d;">Coupon Discount (${order.coupon_code || order.couponCode}):</td>
          <td style="text-align:right; color:#15803d;">- ₹${Number(discount).toLocaleString('en-IN')}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td colspan="2" style="text-align:right; color:#7a6b63;">Shipping (${order.shipping_method || order.shippingMethod || 'Standard'}):</td>
          <td style="text-align:right;">${shipping === 0 ? '<span style="color:#15803d; font-weight:700;">FREE</span>' : `₹${Number(shipping).toLocaleString('en-IN')}`}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="text-align:right;">Total Amount:</td>
          <td style="text-align:right;">₹${Number(total).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  `;
}

/* ============================================================ */
/* 3. ORDER PLACED EMAIL (PENDING PAYMENT VERIFICATION)         */
/* ============================================================ */
export async function sendOrderPlacedEmail(order) {
  const baseUrl = getAppBaseUrl();
  const orderUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Your Order #${orderNo} Has Been Placed</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>Thank you for choosing Nathshikha! We have received your order and our artisan studio is preparing for its making.</p>
    
    <div class="notice-card" style="border-left-color: #d97706; background-color: #fffbeb;">
      <p style="margin:0; font-size:13.5px; color:#92400e;">
        ⏳ <strong>Payment Verification in Progress:</strong> Your order has been placed and is currently <strong>pending payment verification</strong> from our team. We verify UPI payments promptly during studio hours.
      </p>
    </div>

    ${renderOrderItemsTable(order)}

    <div style="background:#faf5ee; border:1px solid #ebdcc6; border-radius:6px; padding:16px; margin:20px 0;">
      <h4 style="margin:0 0 8px 0; color:#6d1b29; font-size:13px; text-transform:uppercase;">Delivery Destination</h4>
      <p style="margin:0; font-size:13px; color:#475569;">
        <strong>Recipient:</strong> ${order.recipient_name || order.recipientName || order.name}<br>
        <strong>Address:</strong> ${order.address}, ${order.city}, ${order.state} - ${order.pincode}<br>
        <strong>Contact:</strong> ${order.recipient_phone || order.recipientPhone || order.phone}
      </p>
    </div>
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Your Nathshikha Order #${orderNo} Has Been Placed`,
    html: renderEmailLayout({
      title: `Order #${orderNo} Placed`,
      previewText: `Order #${orderNo} has been placed and is pending payment verification`,
      contentHtml,
      ctaText: 'View My Order',
      ctaUrl: orderUrl
    }),
    text: `Your Nathshikha Order #${orderNo} has been placed and is pending payment verification. View at: ${orderUrl}`,
    emailType: 'ORDER_PLACED',
    orderId: order._id || order.id,
    userId: order.userId || order.user_id
  });
}

/* ============================================================ */
/* 4. ORDER CONFIRMED EMAIL (PAYMENT VERIFIED)                  */
/* ============================================================ */
export async function sendOrderConfirmedEmail(order) {
  const orderId = order._id || order.id;

  // STRICT IDEMPOTENCY GUARD: Do NOT send duplicate order confirmed emails
  const existingSent = await EmailEvent.findOne({
    orderId,
    emailType: 'ORDER_CONFIRMED',
    status: 'sent'
  });

  if (existingSent) {
    console.log(`[EmailService] Skipped duplicate ORDER_CONFIRMED email for Order #${order.order_no || order.orderNo}`);
    return { success: true, skipped: true, reason: 'Already sent' };
  }

  const baseUrl = getAppBaseUrl();
  const orderUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Order Confirmed ✓</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>Great news! Your payment has been verified and your order <strong>#${orderNo}</strong> is now officially <strong>Confirmed</strong>.</p>
    
    <div class="notice-card" style="border-left-color: #15803d; background-color: #f0fdf4;">
      <p style="margin:0; font-size:13.5px; color:#166534;">
        ✨ <strong>Handcrafted With Love:</strong> Since each piece is handmade by our skilled artisans, our crafting process takes approximately <strong>10–15 days</strong>. We appreciate your patience while we craft your beautiful jewellery with devotion and care. ❤️
      </p>
    </div>

    ${renderOrderItemsTable(order)}

    <div style="background:#faf5ee; border:1px solid #ebdcc6; border-radius:6px; padding:16px; margin:20px 0;">
      <h4 style="margin:0 0 8px 0; color:#6d1b29; font-size:13px; text-transform:uppercase;">Delivery Address</h4>
      <p style="margin:0; font-size:13px; color:#475569;">
        ${order.recipient_name || order.recipientName || order.name}<br>
        ${order.address}, ${order.city}, ${order.state} - ${order.pincode}
      </p>
    </div>
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Your Nathshikha Order #${orderNo} is Confirmed`,
    html: renderEmailLayout({
      title: `Order #${orderNo} Confirmed`,
      previewText: `Payment verified! Order #${orderNo} has been confirmed.`,
      contentHtml,
      ctaText: 'View My Order',
      ctaUrl: orderUrl
    }),
    text: `Your payment has been verified and your Nathshikha Order #${orderNo} is confirmed! View at: ${orderUrl}`,
    emailType: 'ORDER_CONFIRMED',
    orderId,
    userId: order.userId || order.user_id
  });
}

/* ============================================================ */
/* 5. ORDER SHIPPED EMAIL (WITH TRACKING & UNBOXING NOTICE)     */
/* ============================================================ */
export async function sendOrderShippedEmail(order) {
  const baseUrl = getAppBaseUrl();
  const orderUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;
  const partner = order.shipment_partner || order.shipmentPartner || 'Speed Post';
  const trackingId = order.tracking_id || order.trackingId || 'N/A';
  const groupCode = order.shipment_group_code || order.shipmentGroupCode || null;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Your Order Is On Its Way 📦</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>We are delighted to inform you that your handcrafted jewellery piece for Order <strong>#${orderNo}</strong> has been packaged with utmost care and dispatched.</p>
    
    <div style="background:#fdfaf4; border:1.5px solid #ebdcc6; border-radius:8px; padding:18px 20px; margin:22px 0;">
      <h3 style="margin:0 0 10px 0; font-size:15px; color:#6d1b29;">Shipment & Tracking Details</h3>
      <table style="width:100%; font-size:13.5px; border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0; color:#7a6b63; width:40%;">Shipment Partner:</td>
          <td style="padding:4px 0; font-weight:700; color:#2b1f1d;">${partner}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#7a6b63;">Tracking Number:</td>
          <td style="padding:4px 0; font-weight:700; color:#6d1b29; font-family:monospace; font-size:14px;">${trackingId}</td>
        </tr>
        ${
          groupCode
            ? `
        <tr>
          <td style="padding:4px 0; color:#7a6b63;">Shipment Group:</td>
          <td style="padding:4px 0; font-weight:600; color:#7c3aed;">#${groupCode}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <div class="notice-card" style="border-left-color: #b91c1c; background-color: #fef2f2;">
      <h4 style="margin:0 0 6px 0; color:#991b1b; font-size:13px; text-transform:uppercase;">📹 Compulsory 360° Opening Video Notice</h4>
      <p style="margin:0; font-size:12.5px; color:#7f1d1d; line-height:1.55;">
        Once your package arrives, please record a complete, unedited <strong>360° opening/unboxing video</strong> before opening the jewellery box. This video is compulsory for raising any damage, missing-item, or return claims.
      </p>
    </div>

    ${renderOrderItemsTable(order)}
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Your Nathshikha Order #${orderNo} Has Been Shipped`,
    html: renderEmailLayout({
      title: `Order #${orderNo} Shipped`,
      previewText: `Your Nathshikha order #${orderNo} is dispatched via ${partner} (${trackingId})`,
      contentHtml,
      ctaText: 'Track / View Order',
      ctaUrl: orderUrl
    }),
    text: `Your Nathshikha Order #${orderNo} has shipped via ${partner} with tracking ID ${trackingId}. View order: ${orderUrl}`,
    emailType: 'ORDER_SHIPPED',
    orderId: order._id || order.id,
    userId: order.userId || order.user_id,
    metadata: { partner, trackingId, groupCode }
  });
}

/* ============================================================ */
/* 6. ORDER DELIVERED EMAIL (WITH REVIEW CTA)                   */
/* ============================================================ */
export async function sendOrderDeliveredEmail(order) {
  const baseUrl = getAppBaseUrl();
  const reviewUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Your Order Has Been Delivered ✓</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>Your Nathshikha jewellery order <strong>#${orderNo}</strong> has been successfully delivered. We truly hope you love wearing your handcrafted piece as much as we loved creating it for you!</p>
    
    <div class="notice-card" style="border-left-color: #c69a59; background-color: #fdfaf4; text-align:center;">
      <h3 style="margin:0 0 6px 0; color:#6d1b29; font-size:16px;">We’d Love to Hear From You! ⭐</h3>
      <p style="margin:0; font-size:13px; color:#475569;">
        Share your experience and photos with us. Your review supports our traditional artisans and helps future brides find their dream jewellery.
      </p>
    </div>

    ${renderOrderItemsTable(order)}
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Your Nathshikha Order #${orderNo} Has Been Delivered`,
    html: renderEmailLayout({
      title: `Order #${orderNo} Delivered`,
      previewText: `Order #${orderNo} has been delivered. Write a review for your piece!`,
      contentHtml,
      ctaText: 'Write a Review',
      ctaUrl: reviewUrl
    }),
    text: `Your Nathshikha Order #${orderNo} has been delivered! Write a review: ${reviewUrl}`,
    emailType: 'ORDER_DELIVERED',
    orderId: order._id || order.id,
    userId: order.userId || order.user_id
  });
}

/* ============================================================ */
/* 7. CANCELLATION APPROVED EMAIL                              */
/* ============================================================ */
export async function sendCancellationApprovedEmail(order) {
  const baseUrl = getAppBaseUrl();
  const orderUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;
  const refundAmount = order.refund_amount || order.refundAmount || order.total || 0;
  const cancelCharge = order.cancellation_charge || order.cancellationCharge || 0;
  const reason = order.cancellation_reason || order.cancellationReason || 'Requested by customer';

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Cancellation Approved — Order #${orderNo}</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>Your cancellation request for Order <strong>#${orderNo}</strong> has been reviewed and approved by our studio team.</p>
    
    <div style="background:#fdfaf4; border:1px solid #ebdcc6; border-radius:8px; padding:18px; margin:20px 0;">
      <h3 style="margin:0 0 12px 0; color:#6d1b29; font-size:14px; text-transform:uppercase;">Cancellation & Refund Breakdown</h3>
      <table style="width:100%; font-size:13.5px; border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0; color:#7a6b63;">Reason:</td>
          <td style="padding:4px 0; font-weight:600;">"${reason}"</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#7a6b63;">Paid Amount:</td>
          <td style="padding:4px 0; font-weight:600;">₹${Number(order.total || 0).toLocaleString('en-IN')}</td>
        </tr>
        ${
          cancelCharge > 0
            ? `
        <tr>
          <td style="padding:4px 0; color:#dc2626;">Cancellation Charge:</td>
          <td style="padding:4px 0; font-weight:600; color:#dc2626;">- ₹${Number(cancelCharge).toLocaleString('en-IN')}</td>
        </tr>
        `
            : ''
        }
        <tr style="border-top:1px solid #ebdcc6;">
          <td style="padding:8px 0 4px 0; font-weight:700; color:#6d1b29; font-size:15px;">Approved Refund Amount:</td>
          <td style="padding:8px 0 4px 0; font-weight:700; color:#15803d; font-size:15px;">₹${Number(refundAmount).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#7a6b63;">Refund Status:</td>
          <td style="padding:4px 0; font-weight:700; color:#d97706;">Pending Processing by Admin</td>
        </tr>
      </table>
    </div>
    <p style="font-size:13px; color:#64748b;">Our accounts team will process your refund to the original payment method. You will receive another notification once the transfer is completed.</p>
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Cancellation Approved — Nathshikha Order #${orderNo}`,
    html: renderEmailLayout({
      title: `Cancellation Approved #${orderNo}`,
      previewText: `Cancellation approved for Order #${orderNo}. Approved refund: ₹${refundAmount}`,
      contentHtml,
      ctaText: 'View Order Status',
      ctaUrl: orderUrl
    }),
    text: `Cancellation approved for Nathshikha Order #${orderNo}. Approved refund: ₹${refundAmount}. View: ${orderUrl}`,
    emailType: 'CANCELLATION_APPROVED',
    orderId: order._id || order.id,
    userId: order.userId || order.user_id,
    metadata: { refundAmount, cancelCharge }
  });
}

/* ============================================================ */
/* 8. REFUND COMPLETED EMAIL                                   */
/* ============================================================ */
export async function sendRefundCompletedEmail(order) {
  const baseUrl = getAppBaseUrl();
  const orderUrl = `${baseUrl}/orders`;
  const recipientEmail = order.customer_email || order.customerEmail || order.email;
  const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
  const orderNo = order.order_no || order.orderNo;
  const refundAmount = order.refund_amount || order.refundAmount || order.total || 0;

  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Refund Completed ✓ — Order #${orderNo}</h2>
    <p>Dear <strong>${recipientName}</strong>,</p>
    <p>We would like to confirm that your refund for Order <strong>#${orderNo}</strong> has been successfully processed.</p>
    
    <div class="notice-card" style="border-left-color: #15803d; background-color: #f0fdf4;">
      <h3 style="margin:0 0 6px 0; color:#166534; font-size:15px;">Refund Processed Successfully</h3>
      <p style="margin:0; font-size:13.5px; color:#166534;">
        Refund Amount: <strong>₹${Number(refundAmount).toLocaleString('en-IN')}</strong><br>
        Processed On: <strong>${new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
      </p>
    </div>
    <p style="font-size:13px; color:#64748b;">The funds should reflect in your bank account / UPI account within standard banking settlement timeframes.</p>
  `;

  return sendEmailCore({
    to: recipientEmail,
    subject: `Refund Completed — Nathshikha Order #${orderNo}`,
    html: renderEmailLayout({
      title: `Refund Completed #${orderNo}`,
      previewText: `Your refund of ₹${refundAmount} for Order #${orderNo} has been processed`,
      contentHtml,
      ctaText: 'View Order',
      ctaUrl: orderUrl
    }),
    text: `Your refund of ₹${refundAmount} for Nathshikha Order #${orderNo} has been processed. View: ${orderUrl}`,
    emailType: 'REFUND_COMPLETED',
    orderId: order._id || order.id,
    userId: order.userId || order.user_id,
    metadata: { refundAmount }
  });
}

/* ============================================================ */
/* 9. ADMIN TEST EMAIL                                         */
/* ============================================================ */
export async function sendAdminTestEmail(targetRecipient) {
  const contentHtml = `
    <h2 style="margin:0 0 14px 0; font-size: 20px;">Nathshikha Email System Test ✓</h2>
    <p>This is a test notification confirming that the <strong>Nathshikha Email Service</strong> is functioning correctly using Gmail SMTP authentication.</p>
    <div class="notice-card" style="border-left-color: #15803d; background-color: #f0fdf4;">
      <p style="margin:0; font-size:13px; color:#166534;">
        ✓ SMTP User: <strong>${SMTP_USER}</strong><br>
        ✓ Timestamp: <strong>${new Date().toLocaleString('en-IN')}</strong><br>
        ✓ Base URL: <strong>${getAppBaseUrl()}</strong>
      </p>
    </div>
  `;

  return sendEmailCore({
    to: targetRecipient,
    subject: 'Nathshikha SMTP Test Email',
    html: renderEmailLayout({
      title: 'SMTP Test Email',
      previewText: 'Nathshikha Email System Test Notification',
      contentHtml,
      ctaText: 'Open Storefront',
      ctaUrl: getAppBaseUrl()
    }),
    text: `Nathshikha SMTP test email dispatched successfully at ${new Date().toISOString()}`,
    emailType: 'ADMIN_TEST'
  });
}

/* ============================================================ */
/* 10. RESEND ORDER EMAIL HANDLER                               */
/* ============================================================ */
export async function resendOrderEmail(order, emailType) {
  switch (emailType) {
    case 'ORDER_PLACED':
      return sendOrderPlacedEmail(order);
    case 'ORDER_CONFIRMED': {
      // For manual resend, bypass duplicate check by sending directly
      const baseUrl = getAppBaseUrl();
      const orderUrl = `${baseUrl}/orders`;
      const recipientEmail = order.customer_email || order.customerEmail || order.email;
      const recipientName = order.customer_name || order.customerName || order.name || 'Valued Customer';
      const orderNo = order.order_no || order.orderNo;
      const contentHtml = `
        <h2 style="margin:0 0 14px 0; font-size: 20px;">Order Confirmed ✓</h2>
        <p>Dear <strong>${recipientName}</strong>,</p>
        <p>Your payment has been verified and your order <strong>#${orderNo}</strong> is confirmed.</p>
        ${renderOrderItemsTable(order)}
      `;
      return sendEmailCore({
        to: recipientEmail,
        subject: `Your Nathshikha Order #${orderNo} is Confirmed (Resent)`,
        html: renderEmailLayout({
          title: `Order #${orderNo} Confirmed`,
          previewText: `Payment verified! Order #${orderNo} has been confirmed.`,
          contentHtml,
          ctaText: 'View My Order',
          ctaUrl: orderUrl
        }),
        text: `Your Nathshikha Order #${orderNo} is confirmed. View at: ${orderUrl}`,
        emailType: 'ORDER_CONFIRMED',
        orderId: order._id || order.id,
        userId: order.userId || order.user_id,
        metadata: { isResend: true }
      });
    }
    case 'ORDER_SHIPPED':
      return sendOrderShippedEmail(order);
    case 'ORDER_DELIVERED':
      return sendOrderDeliveredEmail(order);
    case 'CANCELLATION_APPROVED':
      return sendCancellationApprovedEmail(order);
    case 'REFUND_COMPLETED':
      return sendRefundCompletedEmail(order);
    default:
      throw new Error(`Unsupported email type: ${emailType}`);
  }
}
