import express from 'express';
import { User } from '../models/User.js';
import { auth, signToken, safeUser } from '../middleware/auth.js';
import { authLimiter, isValidEmail } from '../middleware/securityMiddleware.js';

const router = express.Router();

// Register new customer (always assigned 'customer' role; role input in body is strictly ignored)
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

  // Prevent bcrypt DoS via excessively large password strings
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password must not exceed 128 characters.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = User.hashPassword(password);
    const user = await User.create({
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      passwordHash,
      role: 'customer' // Immutable server-side role assignment
    });

    res.status(201).json({
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during customer registration:', err);
    res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
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

    res.json({
      user: safeUser(user),
      token: signToken(user)
    });
  } catch (err) {
    console.error('Error during customer login:', err);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Admin login (admin accounts only)
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
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
