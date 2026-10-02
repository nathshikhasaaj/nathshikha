import { Counter } from '../models/Counter.js';

/**
 * Generates an atomic, sequential, collision-free Order ID in the format:
 * NS-YYYY-NNNNNN (e.g. NS-2026-000001, NS-2026-000002)
 *
 * Safe under high concurrency using MongoDB findOneAndUpdate with atomic $inc.
 * Uses a separate counter per year (order-2026, order-2027, etc.).
 *
 * @param {number|string} [targetYear] - Optional year override (defaults to current UTC/local year)
 * @returns {Promise<string>} Unique sequential Order ID (e.g. 'NS-2026-000001')
 */
export async function generateOrderNo(targetYear = null) {
  const currentYear = targetYear ? String(targetYear) : String(new Date().getFullYear());
  const counterKey = `order-${currentYear}`;

  const counterDoc = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  const sequenceNumber = counterDoc.seq;
  const paddedSequence = String(sequenceNumber).padStart(6, '0');
  return `NS-${currentYear}-${paddedSequence}`;
}

/**
 * Validates whether a given string is a valid Nathshikha Order ID
 * Supports both new format (NS-2026-000001) and legacy format (NW12345678)
 *
 * @param {string} orderNo
 * @returns {boolean}
 */
export function isValidOrderNoFormat(orderNo) {
  if (!orderNo || typeof orderNo !== 'string') return false;
  const clean = orderNo.trim().replace(/^#/, '');
  // New format: NS-YYYY-NNNNNN (e.g. NS-2026-000001)
  const newFormatRegex = /^NS-\d{4}-\d{6,}$/i;
  // Legacy format: NW followed by digits or alphanumeric
  const legacyFormatRegex = /^NW[a-zA-Z0-9]+$/i;
  return newFormatRegex.test(clean) || legacyFormatRegex.test(clean);
}
