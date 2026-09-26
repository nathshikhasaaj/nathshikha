/**
 * Client-Side Image Pre-Processing & Auto-Compression Utility
 *
 * Automatically scales down high-resolution smartphone camera captures (5-25MB+)
 * to optimized, web-ready photos (~250KB-600KB) in milliseconds before uploading.
 * Eliminates 'Request payload too large' (413) errors, reduces network payload by 90%+,
 * preserves high visual fidelity for jewelry detail and transparent PNGs.
 */

// Maximum supported safe upload payload across Nginx / Express / Multer
export const MAX_SAFE_PAYLOAD_BYTES = 25 * 1024 * 1024; // 25 MB total
export const MAX_PRODUCT_IMAGES_LIMIT = 10;
export const DEFAULT_MAX_DIMENSION = 1920; // 1920px max dimension is optimal for zoom & galleries
export const DEFAULT_IMAGE_QUALITY = 0.88; // 88% quality retains jewelry luster without artifacts

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Validate that a file is a genuine supported image type
 */
export function isValidImageFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };
  
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const isImageMime =
    mime.startsWith('image/') ||
    /^image\/(jpeg|jpg|png|webp|gif|heic|heif|avif|pjpeg|x-png|jfif|bmp|tiff)$/i.test(mime);

  const isImageExt = /\.(jpe?g|png|webp|gif|heic|heif|avif|jfif|bmp|tiff)$/i.test(name);

  if (!isImageMime && !isImageExt) {
    return {
      valid: false,
      error: `"${file.name || 'File'}" is not a supported image. Only JPG, PNG, WEBP, and AVIF images are allowed.`
    };
  }

  return { valid: true };
}

/**
 * Check whether a canvas has transparent pixels (alpha < 250)
 */
function hasTransparency(ctx, width, height) {
  try {
    // Sample a grid of pixels to be fast and memory efficient
    const stepX = Math.max(1, Math.floor(width / 30));
    const stepY = Math.max(1, Math.floor(height / 30));
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha < 250) {
          return true; // Found transparent pixel
        }
      }
    }
  } catch (e) {
    // If canvas is tainted or getImageData fails, assume no transparency
  }
  return false;
}

/**
 * Compress a single image File / Blob
 * @param {File|Blob} file - The raw image file from input / camera
 * @param {Object} options - Configuration options
 * @returns {Promise<File>} - Optimized File ready for upload
 */
export async function compressImage(file, options = {}) {
  if (!file || !(file instanceof Blob)) {
    return file;
  }

  const validation = isValidImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const {
    maxWidth = DEFAULT_MAX_DIMENSION,
    maxHeight = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_IMAGE_QUALITY
  } = options;

  const originalMime = (file.type || '').toLowerCase();
  const isGif = originalMime === 'image/gif' || file.name?.toLowerCase().endsWith('.gif');
  const isSvg = originalMime === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg');

  // GIFs & SVGs should not be rasterized in canvas
  if (isGif || isSvg) {
    return file;
  }

  // If already under 300KB and not a HEIC/uncompressed type, return original
  if (file.size <= 300 * 1024 && !file.name?.toLowerCase().endsWith('.heic')) {
    const untouched = file instanceof File ? file : new File([file], 'photo.jpg', { type: file.type || 'image/jpeg' });
    untouched.originalSize = file.size;
    untouched.optimizedSize = file.size;
    return untouched;
  }

  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (urlErr) {
      // Fallback to FileReader if createObjectURL fails
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = () => {
      try {
        let { width, height } = img;

        if (!width || !height) {
          cleanup();
          return resolve(file);
        }

        // Calculate scaled dimensions while preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve(file);
        }

        // High quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const isPng = originalMime === 'image/png' || file.name?.toLowerCase().endsWith('.png');
        let outputType = 'image/jpeg';
        let outputExt = '.jpg';

        if (isPng) {
          // Draw raw first to detect transparency
          ctx.drawImage(img, 0, 0, width, height);
          const hasAlpha = hasTransparency(ctx, width, height);

          if (hasAlpha) {
            // Keep WebP with transparency or PNG to preserve transparent background
            outputType = 'image/webp';
            outputExt = '.webp';
          } else {
            // Opaque PNG -> convert to high quality JPEG with white background for 90% size reduction
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            outputType = 'image/jpeg';
            outputExt = '.jpg';
          }
        } else {
          // Non-PNG: fill clean white background for transparency safety
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          outputType = 'image/jpeg';
          outputExt = '.jpg';
        }

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              return resolve(file);
            }

            // If compression made the file larger and original is already reasonable, keep original
            if (blob.size >= file.size && file.size > 0 && file.size < 2 * 1024 * 1024) {
              const resFile = file instanceof File ? file : new File([file], 'photo.jpg', { type: file.type || 'image/jpeg' });
              resFile.originalSize = file.size;
              resFile.optimizedSize = file.size;
              return resolve(resFile);
            }

            const baseName = (file.name || 'product-photo').replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}${outputExt}`, {
              type: outputType,
              lastModified: Date.now()
            });

            // Attach metrics
            compressedFile.originalSize = file.size;
            compressedFile.optimizedSize = blob.size;

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      } catch (err) {
        cleanup();
        console.warn('Canvas optimization encountered error, using original:', err);
        resolve(file);
      }
    };

    img.onerror = (e) => {
      cleanup();
      console.warn('Image decode error during compression:', e);
      // If image decoding failed, pass file or reject if corrupt
      resolve(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        resolve(file);
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Compress an array / FileList of images with progress notification
 * @param {FileList|File[]} files
 * @param {Object} options
 * @param {Function} [onProgress] - (current, total, fileName, stats) => void
 * @returns {Promise<File[] & { successful: File[], failed: Array<{ file: File, error: string }>, totalOriginalBytes: number, totalOptimizedBytes: number }>}
 */
export async function compressMultipleImages(files, options = {}, onProgress) {
  if (!files || files.length === 0) {
    const empty = [];
    empty.successful = [];
    empty.failed = [];
    empty.totalOriginalBytes = 0;
    empty.totalOptimizedBytes = 0;
    return empty;
  }

  const fileArray = Array.from(files);
  const total = fileArray.length;
  const compressed = [];
  const failed = [];
  let totalOriginal = 0;
  let totalOptimized = 0;

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    totalOriginal += file.size || 0;

    if (onProgress) {
      onProgress(i + 1, total, file.name, {
        progressPercent: Math.round(((i + 1) / total) * 100),
        currentFile: file.name
      });
    }

    try {
      const result = await compressImage(file, options);
      totalOptimized += result.size || (result.optimizedSize || file.size || 0);
      compressed.push(result);
    } catch (err) {
      console.error(`Failed to optimize image "${file.name}":`, err);
      failed.push({ file, error: err.message || 'Image optimization failed' });
    }
  }

  // Attach metadata while preserving array behavior
  compressed.successful = compressed;
  compressed.failed = failed;
  compressed.totalOriginalBytes = totalOriginal;
  compressed.totalOptimizedBytes = totalOptimized;

  return compressed;
}

/**
 * Validate that a batch of files does not exceed the safe total payload limit
 */
export function validateBatchPayload(files, maxBytes = MAX_SAFE_PAYLOAD_BYTES) {
  if (!files || files.length === 0) {
    return { valid: true, totalBytes: 0, formattedTotal: '0 B' };
  }

  const fileList = Array.from(files);
  let totalBytes = 0;
  for (const f of fileList) {
    totalBytes += f.size || 0;
  }

  if (totalBytes > maxBytes) {
    return {
      valid: false,
      totalBytes,
      formattedTotal: formatBytes(totalBytes),
      maxBytes,
      formattedMax: formatBytes(maxBytes),
      error: `Selected images combined (${formatBytes(totalBytes)}) exceed the maximum safe upload limit of ${formatBytes(maxBytes)}. Please select fewer images or lower-resolution photos.`
    };
  }

  return {
    valid: true,
    totalBytes,
    formattedTotal: formatBytes(totalBytes)
  };
}

export default {
  compressImage,
  compressMultipleImages,
  validateBatchPayload,
  isValidImageFile,
  formatBytes,
  MAX_SAFE_PAYLOAD_BYTES,
  MAX_PRODUCT_IMAGES_LIMIT,
  DEFAULT_MAX_DIMENSION,
  DEFAULT_IMAGE_QUALITY
};

