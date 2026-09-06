import express from 'express';

const router = express.Router();

// In-memory cache for fast translation retrieval
const translationCache = new Map();

/**
 * Checks if a string contains Devanagari script (Marathi / Hindi)
 */
function isDevanagari(str) {
  return /[\u0900-\u097F]/.test(str);
}

/**
 * Cleans HTML entities and abnormal quotes
 */
function cleanTranslationText(str) {
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
 * Tier 1: Google Translate Client API
 */
async function translateWithGoogle(text, from, to) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${from}&tl=${to}&q=${encodeURIComponent(
    text
  )}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) {
    throw new Error(`Google translate returned status ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
    return cleanTranslationText(data[0]);
  }
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return cleanTranslationText(data[0].map((item) => (Array.isArray(item) ? item[0] : item)).join(' '));
  }
  throw new Error('Unexpected Google translate format');
}

/**
 * Tier 2: MyMemory Translation API
 */
async function translateWithMyMemory(text, from, to) {
  const langPair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${encodeURIComponent(langPair)}&de=info@nathshikha.in`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nathshikha/1.0'
    },
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) {
    throw new Error(`MyMemory returned status ${response.status}`);
  }

  const data = await response.json();
  const resText = data?.responseData?.translatedText;
  if (resText && typeof resText === 'string' && resText.trim()) {
    return cleanTranslationText(resText);
  }
  throw new Error('MyMemory returned empty translation');
}

/**
 * POST /api/translate
 * Body: { text: string, from?: string, to?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { text, from, to = 'mr' } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    const trimmedText = text.trim();

    // Automatically detect source language if not provided or set to 'auto'
    const detectedFrom = (!from || from === 'auto')
      ? (isDevanagari(trimmedText) ? 'mr' : 'en')
      : from.toLowerCase();

    const targetTo = to.toLowerCase();

    // If source and target are the same, return as-is
    if (detectedFrom === targetTo) {
      return res.json({
        translatedText: trimmedText,
        from: detectedFrom,
        to: targetTo,
        cached: true
      });
    }

    const langPair = `${detectedFrom}|${targetTo}`;
    const cacheKey = `${langPair}:::${trimmedText}`;

    // Return cached translation if available
    if (translationCache.has(cacheKey)) {
      return res.json({
        translatedText: translationCache.get(cacheKey),
        from: detectedFrom,
        to: targetTo,
        cached: true
      });
    }

    let finalTranslated = '';

    // Attempt Tier 1: Google Translate
    try {
      finalTranslated = await translateWithGoogle(trimmedText, detectedFrom, targetTo);
    } catch (gErr) {
      console.warn('Google translation failed, trying MyMemory:', gErr.message);
    }

    // Attempt Tier 2: MyMemory if Tier 1 failed or returned identical untranslated string
    if (!finalTranslated || finalTranslated === trimmedText) {
      try {
        finalTranslated = await translateWithMyMemory(trimmedText, detectedFrom, targetTo);
      } catch (mmErr) {
        console.warn('MyMemory translation failed:', mmErr.message);
      }
    }

    // Final sanity check: if still empty, return original
    if (!finalTranslated || !finalTranslated.trim()) {
      finalTranslated = trimmedText;
    }

    // Cache the successful result
    if (finalTranslated !== trimmedText) {
      translationCache.set(cacheKey, finalTranslated);
      if (translationCache.size > 2000) {
        const oldestKey = translationCache.keys().next().value;
        translationCache.delete(oldestKey);
      }
    }

    return res.json({
      translatedText: finalTranslated,
      from: detectedFrom,
      to: targetTo,
      cached: false
    });
  } catch (err) {
    console.error('Translation service error:', err.message);
    return res.status(500).json({
      error: 'Translation failed',
      fallbackText: req.body?.text || ''
    });
  }
});

export default router;
