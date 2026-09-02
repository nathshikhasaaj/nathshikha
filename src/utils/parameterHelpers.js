/**
 * Parameter Library Helpers & Cart Composite Key Generator for Nathshikha
 */

export const ALL_CATEGORIES = [
  'Bangles',
  'Nath',
  'Mangalsutra',
  'Earrings',
  'Necklace',
  'Rings',
  'Pearl',
  'Traditional',
  'Signature',
  'Accessories',
  'Other'
];

/**
 * Generate a unique cart composite key based on productId and selectedParameters
 * Guarantees that different configurations (e.g. Medium + Red vs Medium + Green)
 * never merge into one item, while identical configurations merge correctly.
 */
export function getCartParameterKey(productId, selectedParameters = {}) {
  const pId = String(productId || '');
  if (!selectedParameters || typeof selectedParameters !== 'object') {
    return pId;
  }
  const keys = Object.keys(selectedParameters)
    .filter((k) => selectedParameters[k] !== undefined && selectedParameters[k] !== null && String(selectedParameters[k]).trim() !== '')
    .sort();

  if (keys.length === 0) {
    return pId;
  }

  const serialized = keys
    .map((k) => `${k.trim()}:${String(selectedParameters[k]).trim()}`)
    .join('|');

  return `${pId}__${serialized}`;
}

/**
 * Format selectedParameters into human-readable text for carts, badges, and receipts
 * e.g. "Size: Medium · Stone Color: Green"
 */
export function formatSelectedParametersText(selectedParameters) {
  if (!selectedParameters || typeof selectedParameters !== 'object') return '';
  const entries = Object.entries(selectedParameters).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ''
  );
  if (entries.length === 0) return '';
  return entries.map(([name, val]) => `${name}: ${val}`).join(' · ');
}

/**
 * Check if two parameter selection objects are identical
 */
export function areParametersEqual(paramA = {}, paramB = {}) {
  if (!paramA && !paramB) return true;
  if (!paramA || !paramB) return false;
  const keysA = Object.keys(paramA).sort();
  const keysB = Object.keys(paramB).sort();
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (String(paramA[k]).trim() !== String(paramB[k]).trim()) return false;
  }
  return true;
}

export default {
  ALL_CATEGORIES,
  getCartParameterKey,
  formatSelectedParametersText,
  areParametersEqual
};
