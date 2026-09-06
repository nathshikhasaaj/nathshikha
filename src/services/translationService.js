import { api } from './api';

// In-memory session cache for instant translation switching
const sessionCache = new Map();

/**
 * Checks if a string contains Marathi / Devanagari script characters.
 */
export function isDevanagariText(text) {
  if (!text || typeof text !== 'string') return false;
  const devanagariPattern = /[\u0900-\u097F]/;
  return devanagariPattern.test(text);
}

/**
 * Cleans HTML entities and abnormal whitespace
 */
function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates if the translation actually converted the language
 */
function isValidTranslation(result, source, target, originalText) {
  if (!result || typeof result !== 'string' || !result.trim()) return false;
  const clean = cleanText(result);
  if (clean === originalText) return false;

  if (target === 'en' && isDevanagariText(clean)) {
    return false; // Still in Marathi/Devanagari
  }
  if (target === 'mr' && !isDevanagariText(clean)) {
    return false; // Still in English
  }
  return true;
}

/**
 * Generates a simple hash string for caching
 */
function hashKey(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `trans_${hash}`;
}

/**
 * Translates product description or text between English and Marathi.
 * @param {string} text - The input text to translate.
 * @param {'mr'|'en'} targetLang - Target language ('mr' or 'en').
 * @param {'en'|'mr'|'auto'} sourceLang - Source language.
 * @returns {Promise<string>} - The translated text string.
 */
export async function translateProductDescription(text, targetLang = 'mr', sourceLang = 'auto') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text || '';
  }

  const trimmed = text.trim();
  const effectiveSource = (!sourceLang || sourceLang === 'auto')
    ? (isDevanagariText(trimmed) ? 'mr' : 'en')
    : sourceLang.toLowerCase();

  const target = targetLang.toLowerCase();

  // If source and target are the same, return as-is
  if (effectiveSource === target) {
    return trimmed;
  }

  const cacheId = `${effectiveSource}_${target}_${hashKey(trimmed)}`;

  // 1. Check in-memory session cache
  if (sessionCache.has(cacheId)) {
    const cached = sessionCache.get(cacheId);
    if (isValidTranslation(cached, effectiveSource, target, trimmed)) {
      return cached;
    }
  }

  // 2. Check localStorage cache (with validation to purge stale or bad translations)
  try {
    const stored = localStorage.getItem(`nw_${cacheId}`);
    if (stored) {
      if (isValidTranslation(stored, effectiveSource, target, trimmed)) {
        sessionCache.set(cacheId, stored);
        return stored;
      } else {
        localStorage.removeItem(`nw_${cacheId}`);
      }
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
        to: target
      }
    });

    if (result && result.translatedText && isValidTranslation(result.translatedText, effectiveSource, target, trimmed)) {
      const translated = cleanText(result.translatedText);
      sessionCache.set(cacheId, translated);
      try {
        localStorage.setItem(`nw_${cacheId}`, translated);
      } catch {}
      return translated;
    }
  } catch (backendErr) {
    console.warn('Backend translation failed, attempting direct fallback:', backendErr?.message || backendErr);
  }

  // 4. Direct client-side fallback Tier A: Google Translate Client API
  try {
    const googleUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${effectiveSource}&tl=${target}&q=${encodeURIComponent(
      trimmed
    )}`;
    const res = await fetch(googleUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      let textRes = '';
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        textRes = data[0];
      } else if (Array.isArray(data) && Array.isArray(data[0])) {
        textRes = data[0].map((item) => (Array.isArray(item) ? item[0] : item)).join(' ');
      }

      if (textRes && isValidTranslation(textRes, effectiveSource, target, trimmed)) {
        const cleaned = cleanText(textRes);
        sessionCache.set(cacheId, cleaned);
        try {
          localStorage.setItem(`nw_${cacheId}`, cleaned);
        } catch {}
        return cleaned;
      }
    }
  } catch (gErr) {
    console.warn('Client Google translation fallback failed:', gErr?.message || gErr);
  }

  // 5. Direct client-side fallback Tier B: MyMemory API
  try {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=${encodeURIComponent(`${effectiveSource}|${target}`)}&de=info@nathshikha.in`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(7000) });
    if (res.ok) {
      const data = await res.json();
      let textRes = data?.responseData?.translatedText;
      if (textRes && isValidTranslation(textRes, effectiveSource, target, trimmed)) {
        const cleaned = cleanText(textRes);
        sessionCache.set(cacheId, cleaned);
        try {
          localStorage.setItem(`nw_${cacheId}`, cleaned);
        } catch {}
        return cleaned;
      }
    }
  } catch (clientErr) {
    console.warn('Direct MyMemory fallback failed:', clientErr?.message || clientErr);
  }

  return trimmed;
}
