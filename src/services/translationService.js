import { api } from './api';

// In-memory session cache for instant translation switching
const sessionCache = new Map();

/**
 * Checks if a string primarily contains Marathi / Devanagari script characters.
 */
export function isDevanagariText(text) {
  if (!text || typeof text !== 'string') return false;
  const devanagariPattern = /[\u0900-\u097F]/;
  return devanagariPattern.test(text);
}

/**
 * Generates a simple hash string for caching
 */
function hashKey(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `trans_${hash}`;
}

/**
 * Translates product description or any text between English and Marathi.
 * @param {string} text - The input text to translate.
 * @param {'mr'|'en'} targetLang - Target language ('mr' for Marathi, 'en' for English).
 * @param {'en'|'mr'|'auto'} sourceLang - Source language ('en' or 'mr' or 'auto').
 * @returns {Promise<string>} - The translated text string.
 */
export async function translateProductDescription(text, targetLang = 'mr', sourceLang = 'en') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text || '';
  }

  const trimmed = text.trim();
  const effectiveSource = sourceLang === 'auto'
    ? isDevanagariText(trimmed) ? 'mr' : 'en'
    : sourceLang;

  // If source and target are the same language, no translation needed
  if (effectiveSource === targetLang) {
    return trimmed;
  }

  const cacheId = `${effectiveSource}_${targetLang}_${hashKey(trimmed)}`;

  // 1. Check in-memory cache
  if (sessionCache.has(cacheId)) {
    return sessionCache.get(cacheId);
  }

  // 2. Check localStorage cache
  try {
    const stored = localStorage.getItem(`nw_${cacheId}`);
    if (stored) {
      sessionCache.set(cacheId, stored);
      return stored;
    }
  } catch {
    // ignore storage access issues
  }

  // 3. Try backend proxy route first
  try {
    const result = await api('/translate', {
      method: 'POST',
      body: {
        text: trimmed,
        from: effectiveSource,
        to: targetLang
      }
    });

    if (result && result.translatedText) {
      const translated = result.translatedText;
      sessionCache.set(cacheId, translated);
      try {
        localStorage.setItem(`nw_${cacheId}`, translated);
      } catch {}
      return translated;
    }
  } catch (backendErr) {
    console.warn('Backend translation failed, attempting direct fallback:', backendErr);
  }

  // 4. Direct client-side fallback
  try {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=${encodeURIComponent(`${effectiveSource}|${targetLang}`)}`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(7000) });
    if (res.ok) {
      const data = await res.json();
      let textRes = data?.responseData?.translatedText || trimmed;
      textRes = textRes
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      sessionCache.set(cacheId, textRes);
      try {
        localStorage.setItem(`nw_${cacheId}`, textRes);
      } catch {}
      return textRes;
    }
  } catch (clientErr) {
    console.warn('Direct translation failed:', clientErr);
  }

  return trimmed;
}
