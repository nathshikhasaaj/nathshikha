/**
 * Format a number into Indian Rupee currency string (e.g. ₹2,499)
 * @param {number|string} n 
 * @returns {string}
 */
export function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

/**
 * Calculate dynamic order age in complete days from creation timestamp
 * @param {string|Date} createdAt 
 * @returns {number}
 */
export function getOrderAgeInDays(createdAt) {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return 0;
  const nowTime = Date.now();
  const diffMs = Math.max(0, nowTime - createdTime);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format order age label (e.g. "0 Days", "1 Day", "16 Days")
 * @param {number} days 
 * @returns {string}
 */
export function formatOrderAge(days) {
  const d = Math.max(0, Number(days) || 0);
  return d === 1 ? '1 Day' : `${d} Days`;
}

/**
 * Format exact order date and time in Indian formatting
 * @param {string|Date} createdAt 
 * @returns {{ dateStr: string, timeStr: string, fullStr: string }}
 */
export function formatOrderDate(createdAt) {
  if (!createdAt) {
    return { dateStr: '—', timeStr: '', fullStr: '—' };
  }
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) {
    return { dateStr: '—', timeStr: '', fullStr: '—' };
  }

  const dateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr}, ${timeStr}`
  };
}

/**
 * Format internal order status into refined luxury customer/admin terminology
 * @param {string} status
 * @returns {string}
 */
export function formatOrderStatus(status) {
  const s = String(status || 'placed').toLowerCase();
  switch (s) {
    case 'placed':
    case 'payment_pending':
    case 'verification_pending':
      return 'Order Received';
    case 'confirmed':
      return 'Order Confirmed';
    case 'making':
      return 'Artisan Crafting';
    case 'packing':
    case 'processing':
      return 'QC & Packaging';
    case 'shipped':
      return 'Dispatched & In Transit';
    case 'delivered':
      return 'Successfully Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

/**
 * Safely copy text to clipboard across all browser contexts (HTTPS, HTTP LAN IP, WebViews)
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  
  // 1. Try modern navigator.clipboard API if available (HTTPS or localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard writeText failed, trying fallback:', e);
    }
  }

  // 2. Fallback for non-secure / HTTP contexts (e.g. mobile testing on LAN IP)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Boolean(successful);
  } catch (err) {
    console.error('All copy methods failed:', err);
    return false;
  }
}
