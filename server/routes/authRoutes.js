import express from 'express';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { auth, signToken, safeUser } from '../middleware/auth.js';
import { authLimiter, isValidEmail } from '../middleware/securityMiddleware.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail
} from '../services/emailService.js';

const router = express.Router();

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

function getReqOrigin(req) {
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const url = new URL(origin);
      return `${url.protocol}//${url.host}`;
    } catch {
      // ignore
    }
  }
  return null;
}

// Register new customer (with email verification flow)
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Password must not exceed 128 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const passwordHash = User.hashPassword(password);
    const user = await User.create({
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt
    });

    const clientOrigin = getReqOrigin(req);

    // Send verification email non-blockingly
    sendVerificationEmail(user, rawVerificationToken, clientOrigin).catch((err) => {
      console.error('[Auth] Failed to send registration verification email:', err.message);
    });

    res.status(201).json({
      ok: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      email_verification_required: true,
      email: user.email,
      user: safeUser(user)
    });
  } catch (err) {
    console.error('Error during customer registration:', err);
    res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
});

// Verify Email POST endpoint
router.post('/verify-email', authLimiter, async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  const tokenHash = hashToken(token);

  try {
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'This verification link is invalid or has expired. Please request a new verification email.',
        expired: true
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    res.json({
      ok: true,
      message: 'Email verified successfully! You can now access your account.',
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during email verification:', err);
    res.status(500).json({ error: 'Failed to verify email. Please try again later.' });
  }
});

// Verify Email GET endpoint (direct browser link support)
router.get(['/verify-email/:token', '/verify/:token', '/verify-mail/:token'], async (req, res) => {
  const { token } = req.params;

  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.redirect('/verify-email?error=missing');
  }

  const tokenHash = hashToken(token);

  try {
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.redirect('/verify-email?expired=true');
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.redirect('/login?verified=true');
  } catch (err) {
    console.error('Error during GET email verification:', err);
    res.redirect('/verify-email?error=server');
  }
});

// Resend Email Verification link
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail, role: 'customer' });

    if (user && !user.emailVerified) {
      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationTokenHash = hashToken(rawVerificationToken);
      user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      const clientOrigin = getReqOrigin(req);

      sendVerificationEmail(user, rawVerificationToken, clientOrigin).catch((err) => {
        console.error('[Auth] Failed to resend verification email:', err.message);
      });
    }

    // Generic response to protect against email enumeration
    res.json({
      ok: true,
      message: 'If your account is registered and unverified, a new verification link has been sent to your email.'
    });
  } catch (err) {
    console.error('Error during resend verification:', err);
    res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
  }
});

// Forgot Password — Request Password Reset Link
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail, role: 'customer' });

    if (user) {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(rawResetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

      const clientOrigin = getReqOrigin(req);

      sendPasswordResetEmail(user, rawResetToken, clientOrigin).catch((err) => {
        console.error('[Auth] Failed to send password reset email:', err.message);
      });
    }

    // Strict Email Enumeration Protection: Always return generic message
    res.json({
      ok: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    });
  } catch (err) {
    console.error('Error during forgot password request:', err);
    res.status(500).json({ error: 'Failed to process password reset request. Please try again.' });
  }
});

// Reset Password with Secure Token
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Password reset token is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Password must not exceed 128 characters.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match. Please re-enter.' });
  }

  const tokenHash = hashToken(token);

  try {
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'This password reset link is invalid or has expired. Please request a new reset link.',
        expired: true
      });
    }

    user.passwordHash = User.hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    res.json({
      ok: true,
      message: 'Password Updated Successfully ✓. You can now login with your new password.'
    });
  } catch (err) {
    console.error('Error during password reset:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// Customer login (customer accounts only)
router.post('/customer-login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role === 'admin' || !user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Customer email verification gate
    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Your account has been created, but your email address needs to be verified before you can login.',
        email_verification_required: true,
        email: user.email
      });
    }

    res.json({
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during customer login:', err);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Admin login (admin accounts only - separate and never requires customer email verification)
router.post('/admin-login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await User.findOne({
      email: normalizedEmail,
      role: 'admin'
    });

    if (!user || !user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    res.json({
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Backward-compatible login endpoint (customer only)
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role === 'admin' || !user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Your account has been created, but your email address needs to be verified before you can login.',
        email_verification_required: true,
        email: user.email
      });
    }

    res.json({
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Get currently authenticated user profile
router.get('/me', auth, async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: safeUser(userDoc) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update customer profile (Name, Phone)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      userDoc.name = trimmedName.slice(0, 100);
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone && cleanPhone.length !== 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
      }
      userDoc.phone = cleanPhone;
    }

    await userDoc.save();

    res.json({
      ok: true,
      message: 'Profile updated successfully.',
      user: safeUser(userDoc)
    });
  } catch (err) {
    console.error('Error updating customer profile:', err);
    res.status(500).json({ error: 'Failed to update profile. Please try again.' });
  }
});

// Get customer saved addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    res.json({
      defaultAddress: userDoc.defaultAddress || null,
      default_address: userDoc.defaultAddress || null,
      giftAddresses: (userDoc.giftAddresses || []).map((ga) => ({
        id: ga._id ? ga._id.toString() : ga.id,
        recipient_name: ga.recipientName,
        recipient_phone: ga.recipientPhone,
        address_line1: ga.addressLine1,
        address_line2: ga.addressLine2 || '',
        city: ga.city,
        state: ga.state,
        pincode: ga.pincode,
        is_default: Boolean(ga.isDefault)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Update personal/default delivery address
router.put('/address', auth, async (req, res) => {
  try {
    const { recipientName, recipientPhone, addressLine1, addressLine2, city, state, pincode } = req.body;
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    userDoc.defaultAddress = {
      recipientName: String(recipientName || userDoc.name || '').trim().slice(0, 100),
      recipientPhone: String(recipientPhone || userDoc.phone || '').trim().slice(0, 15),
      addressLine1: String(addressLine1 || '').trim().slice(0, 300),
      addressLine2: String(addressLine2 || '').trim().slice(0, 300),
      city: String(city || '').trim().slice(0, 100),
      state: String(state || '').trim().slice(0, 100),
      pincode: String(pincode || '').trim().slice(0, 10)
    };

    await userDoc.save();

    res.json({
      ok: true,
      message: 'Default delivery address saved.',
      user: safeUser(userDoc)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// Add new gift delivery address
router.post('/gift-addresses', auth, async (req, res) => {
  try {
    const {
      recipientName,
      recipient_name,
      recipientPhone,
      recipient_phone,
      addressLine1,
      address_line1,
      addressLine2,
      address_line2,
      city,
      state,
      pincode
    } = req.body;

    const rName = String(recipientName || recipient_name || '').trim();
    const rPhone = String(recipientPhone || recipient_phone || '').trim();
    const a1 = String(addressLine1 || address_line1 || '').trim();
    const a2 = String(addressLine2 || address_line2 || '').trim();
    const c = String(city || '').trim();
    const s = String(state || '').trim();
    const pin = String(pincode || '').trim();

    if (!rName) return res.status(400).json({ error: 'Recipient name is required' });
    if (!rPhone) return res.status(400).json({ error: 'Recipient phone number is required' });
    if (!a1) return res.status(400).json({ error: 'Address line 1 is required' });
    if (!c) return res.status(400).json({ error: 'City is required' });
    if (!s) return res.status(400).json({ error: 'State is required' });
    if (!pin || pin.length !== 6) return res.status(400).json({ error: 'Valid 6-digit PIN code is required' });

    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    userDoc.giftAddresses.push({
      recipientName: rName,
      recipientPhone: rPhone,
      addressLine1: a1,
      addressLine2: a2,
      city: c,
      state: s,
      pincode: pin,
      isDefault: false
    });

    await userDoc.save();

    res.status(201).json({
      ok: true,
      message: 'Gift address saved successfully.',
      user: safeUser(userDoc)
    });
  } catch (err) {
    console.error('Error adding gift address:', err);
    res.status(500).json({ error: 'Failed to add gift address' });
  }
});

// Update an existing gift address
router.put('/gift-addresses/:addressId', auth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const {
      recipientName,
      recipient_name,
      recipientPhone,
      recipient_phone,
      addressLine1,
      address_line1,
      addressLine2,
      address_line2,
      city,
      state,
      pincode
    } = req.body;

    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    const addr = userDoc.giftAddresses.id(addressId);
    if (!addr) {
      return res.status(404).json({ error: 'Gift address not found' });
    }

    if (recipientName !== undefined || recipient_name !== undefined) {
      addr.recipientName = String(recipientName || recipient_name || '').trim();
    }
    if (recipientPhone !== undefined || recipient_phone !== undefined) {
      addr.recipientPhone = String(recipientPhone || recipient_phone || '').trim();
    }
    if (addressLine1 !== undefined || address_line1 !== undefined) {
      addr.addressLine1 = String(addressLine1 || address_line1 || '').trim();
    }
    if (addressLine2 !== undefined || address_line2 !== undefined) {
      addr.addressLine2 = String(addressLine2 || address_line2 || '').trim();
    }
    if (city !== undefined) addr.city = String(city).trim();
    if (state !== undefined) addr.state = String(state).trim();
    if (pincode !== undefined) addr.pincode = String(pincode).trim();

    await userDoc.save();

    res.json({
      ok: true,
      message: 'Gift address updated successfully.',
      user: safeUser(userDoc)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gift address' });
  }
});

// Delete a gift address
router.delete('/gift-addresses/:addressId', auth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    userDoc.giftAddresses.pull({ _id: addressId });
    await userDoc.save();

    res.json({
      ok: true,
      message: 'Gift address removed.',
      user: safeUser(userDoc)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete gift address' });
  }
});

export default router;
