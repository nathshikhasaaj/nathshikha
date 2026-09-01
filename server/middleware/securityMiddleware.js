import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

/**
 * Escapes regex special characters to prevent ReDoS and Regex Query Injection
 */
export function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates a standard 24-char hex MongoDB ObjectId
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validates standard email address format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 120;
}

/**
 * Validates 10-digit Indian mobile number
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

/**
 * Validates 6-digit Indian PIN code
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  const digits = String(pincode).trim();
  return /^[1-9][0-9]{5}$/.test(digits);
}

/**
 * Sanitizes input to prevent NoSQL query operator injection (e.g. $gt, $ne, $where)
 */
function cleanNoSqlObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanNoSqlObject);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    // Strip keys that start with $ (MongoDB query operators) or contain .
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    const val = obj[key];
    cleaned[key] = typeof val === 'object' && val !== null ? cleanNoSqlObject(val) : val;
  }
  return cleaned;
}

export function noSqlSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanNoSqlObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete req.query[key];
      } else if (typeof req.query[key] === 'object' && req.query[key] !== null) {
        req.query[key] = cleanNoSqlObject(req.query[key]);
      }
    }
  }
  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete req.params[key];
      }
    }
  }
  next();
}

/**
 * Strict Rate Limiter for Authentication endpoints (prevents brute-force & credential stuffing)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this network. Please try again after 15 minutes.'
  }
});

/**
 * Rate Limiter for Order Creation
 */
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many order requests. Please try again in a few minutes.'
  }
});

/**
 * Rate Limiter for Public Tracking and Order Lookup (prevents order enumeration)
 */
export const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 45 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many lookup requests. Please try again in a few minutes.'
  }
});

/**
 * General API Limiter (DDoS and abuse prevention)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // 400 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down and try again.'
  }
});

export default {
  escapeRegex,
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  isValidPincode,
  noSqlSanitizer,
  authLimiter,
  orderLimiter,
  lookupLimiter,
  apiLimiter
};
