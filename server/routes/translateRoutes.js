import express from 'express';

const router = express.Router();

// In-memory cache for fast translation retrieval
const translationCache = new Map();

/**
 * POST /api/translate
 * Body: { text: string, from?: string, to?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { text, from = 'en', to = 'mr' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    const trimmedText = text.trim();
    const langPair = `${from.toLowerCase()}|${to.toLowerCase()}`;
    const cacheKey = `${langPair}:::${trimmedText}`;

    // Return cached translation if available
    if (translationCache.has(cacheKey)) {
      return res.json({
        translatedText: translationCache.get(cacheKey),
        from,
        to,
        cached: true
      });
    }

    // Split into smaller chunks if text is long to prevent API truncation
    const maxChunkLen = 450;
    let finalTranslated = '';

    if (trimmedText.length <= maxChunkLen) {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        trimmedText
      )}&langpair=${encodeURIComponent(langPair)}`;

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'NathshikhaJewellery/1.0' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`Translation upstream returned status ${response.status}`);
      }

      const data = await response.json();
      finalTranslated = data?.responseData?.translatedText || trimmedText;
    } else {
      // Chunk by sentence/punctuation
      const sentences = trimmedText.split(/(?<=[.!?\n])\s+/);
      const translatedChunks = [];

      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          sentence.trim()
        )}&langpair=${encodeURIComponent(langPair)}`;

        try {
          const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'NathshikhaJewellery/1.0' },
            signal: AbortSignal.timeout(6000)
          });
          const data = await response.json();
          translatedChunks.push(data?.responseData?.translatedText || sentence);
        } catch {
          translatedChunks.push(sentence);
        }
      }
      finalTranslated = translatedChunks.join(' ');
    }

    // Clean up HTML entities or weird quotes returned by translation services
    finalTranslated = finalTranslated
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Cache the result
    translationCache.set(cacheKey, finalTranslated);
    // Limit cache size to prevent memory leaks
    if (translationCache.size > 2000) {
      const oldestKey = translationCache.keys().next().value;
      translationCache.delete(oldestKey);
    }

    return res.json({
      translatedText: finalTranslated,
      from,
      to,
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
