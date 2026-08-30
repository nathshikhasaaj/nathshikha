import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WATERMARK_GOLD_PATH = path.resolve(__dirname, '../../public/assets/watermark-gold.png');
const WATERMARK_CLEAN_PATH = path.resolve(__dirname, '../../public/assets/watermark-clean.png');
const WATERMARK_MASTER_PATH = path.resolve(__dirname, '../../public/assets/product_logo.png');

let cachedGoldWatermarkBuffer = null;

/**
 * Ensures the transparent luxury gold watermark asset exists and caches it in memory.
 */
async function getGoldenWatermarkBuffer() {
  if (cachedGoldWatermarkBuffer) {
    return cachedGoldWatermarkBuffer;
  }

  // 1. If pre-rendered golden watermark exists, load it
  if (fs.existsSync(WATERMARK_GOLD_PATH)) {
    try {
      cachedGoldWatermarkBuffer = await fs.promises.readFile(WATERMARK_GOLD_PATH);
      return cachedGoldWatermarkBuffer;
    } catch {
      // fallback to generation
    }
  }

  // 2. Generate clean transparent watermark from source logo
  let baseCleanBuffer = null;
  if (fs.existsSync(WATERMARK_CLEAN_PATH)) {
    baseCleanBuffer = await fs.promises.readFile(WATERMARK_CLEAN_PATH);
  } else {
    const sourcePath = fs.existsSync(WATERMARK_MASTER_PATH)
      ? WATERMARK_MASTER_PATH
      : path.resolve(__dirname, '../../public/assets/nathshikha-logo.png');

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Master logo file not found at ${sourcePath}`);
    }

    const { data, info } = await sharp(sourcePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const outputData = Buffer.from(data);

    for (let i = 0; i < outputData.length; i += channels) {
      const r = outputData[i];
      const g = outputData[i + 1];
      const b = outputData[i + 2];
      const brightness = (r + g + b) / 3;

      if (r > 240 && g > 240 && b > 240) {
        outputData[i + 3] = 0; // Pure white becomes transparent
      } else if (r > 210 && g > 210 && b > 210) {
        const factor = (240 - brightness) / 30;
        outputData[i + 3] = Math.min(255, Math.max(0, Math.round(255 * factor)));
      }
    }

    baseCleanBuffer = await sharp(outputData, {
      raw: { width, height, channels }
    })
      .trim()
      .png()
      .toBuffer();

    await fs.promises.writeFile(WATERMARK_CLEAN_PATH, baseCleanBuffer).catch(() => {});
  }

  // 3. Convert to luxury radiant gold
  const { data: cleanData, info: cleanInfo } = await sharp(baseCleanBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = cleanInfo;
  const goldData = Buffer.from(cleanData);

  for (let i = 0; i < goldData.length; i += channels) {
    const alpha = goldData[i + 3];
    if (alpha === 0) continue;

    const r = goldData[i];
    const g = goldData[i + 1];
    const b = goldData[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    const isRuby = r > 120 && g < 70 && b < 70;
    const isPearl = r > 190 && g > 180 && b > 160 && lum > 0.7;

    if (isRuby) {
      goldData[i] = Math.min(255, Math.round(220 + lum * 35));
      goldData[i + 1] = Math.round(30 + lum * 40);
      goldData[i + 2] = Math.round(50 + lum * 40);
    } else if (isPearl) {
      goldData[i] = Math.min(255, Math.round(245 * lum + 10));
      goldData[i + 1] = Math.min(255, Math.round(230 * lum + 15));
      goldData[i + 2] = Math.min(255, Math.round(190 * lum + 20));
    } else {
      const invertLum = 1 - lum;
      const goldIntensity = Math.min(1, Math.max(0, invertLum * 1.3 + 0.2));

      goldData[i] = Math.min(255, Math.round(230 * goldIntensity + 25));     // Gold Red
      goldData[i + 1] = Math.min(255, Math.round(185 * goldIntensity + 15)); // Gold Green
      goldData[i + 2] = Math.min(255, Math.round(75 * goldIntensity + 10));  // Gold Blue
    }
  }

  const generatedGoldBuffer = await sharp(goldData, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();

  await fs.promises.writeFile(WATERMARK_GOLD_PATH, generatedGoldBuffer).catch(() => {});
  cachedGoldWatermarkBuffer = generatedGoldBuffer;
  return generatedGoldBuffer;
}

/**
 * Apply centered, subtle golden Nathshikha logo watermark to any uploaded product image.
 *
 * @param {Buffer|string} input - Image buffer or path to image
 * @param {Object} [options={}] - Customization options
 * @param {string} [options.position='center'] - 'center' | 'bottom-right' | 'bottom-center'
 * @param {number} [options.scale=0.54] - Fraction of base image width (default 54% for centered layout)
 * @param {number} [options.opacity=0.30] - Low watermark opacity (subtle & transparent: 0.25 - 0.35)
 * @param {number} [options.marginRatio=0.035] - Edge margin for non-center positions
 * @param {string} [options.format='jpeg'] - Output format ('jpeg' | 'webp' | 'png')
 * @param {number} [options.quality=92] - Output quality
 * @returns {Promise<Buffer>} - Processed image buffer with embedded golden watermark
 */
export async function applyWatermark(input, options = {}) {
  const {
    position = 'center',
    scale = 0.54,
    opacity = 0.30,
    marginRatio = 0.035,
    format = 'jpeg',
    quality = 92
  } = options;

  // 1. Inspect base image dimensions
  const baseImage = sharp(input);
  const metadata = await baseImage.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: unable to read dimensions.');
  }

  const baseWidth = metadata.width;
  const baseHeight = metadata.height;

  // 2. Load golden watermark
  const masterGoldWatermark = await getGoldenWatermarkBuffer();

  // Determine target watermark width proportional to image
  const targetWidth = Math.min(
    Math.max(180, Math.round(baseWidth * scale)),
    Math.round(baseWidth * 0.85)
  );

  let watermarkSharp = sharp(masterGoldWatermark).resize({
    width: targetWidth,
    withoutEnlargement: false
  });

  // Apply subtle opacity reduction (semi-transparent watermark)
  if (opacity < 1.0) {
    const { data, info } = await watermarkSharp
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const adjustedData = Buffer.from(data);
    for (let i = 3; i < adjustedData.length; i += info.channels) {
      adjustedData[i] = Math.round(adjustedData[i] * opacity);
    }

    watermarkSharp = sharp(adjustedData, {
      raw: { width: info.width, height: info.height, channels: info.channels }
    }).png();
  }

  const resizedWatermarkBuffer = await watermarkSharp.toBuffer();
  const wmMeta = await sharp(resizedWatermarkBuffer).metadata();

  const wmWidth = wmMeta.width || targetWidth;
  const wmHeight = wmMeta.height || Math.round(targetWidth * 0.45);

  // 3. Compute Coordinates (Center by default)
  let left = 0;
  let top = 0;
  const marginX = Math.round(baseWidth * marginRatio);
  const marginY = Math.round(baseHeight * marginRatio);

  if (position === 'center') {
    left = Math.round((baseWidth - wmWidth) / 2);
    top = Math.round((baseHeight - wmHeight) / 2);
  } else if (position === 'bottom-center') {
    left = Math.round((baseWidth - wmWidth) / 2);
    top = Math.max(0, baseHeight - wmHeight - marginY);
  } else {
    // bottom-right
    left = Math.max(0, baseWidth - wmWidth - marginX);
    top = Math.max(0, baseHeight - wmHeight - marginY);
  }

  // 4. Composite onto base image and output
  let pipeline = sharp(input).composite([
    {
      input: resizedWatermarkBuffer,
      top: Math.max(0, top),
      left: Math.max(0, left),
      blend: 'over'
    }
  ]);

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality: Math.min(100, quality) });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return await pipeline.toBuffer();
}

export default {
  applyWatermark
};
