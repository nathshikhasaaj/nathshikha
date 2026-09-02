/**
 * Client-Side Image Pre-Processing & Auto-Compression Utility
 *
 * Automatically scales down high-resolution smartphone camera captures (10-25MB+)
 * to optimized, web-ready photos (~300KB-800KB) in milliseconds before uploading.
 * Eliminates 'File size too large' (413) errors, reduces network payload by 90%+,
 * and works seamlessly across desktop and mobile devices.
 */

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
 * Compress a single image File / Blob
 * @param {File|Blob} file - The raw image file from input / camera
 * @param {Object} options - Configuration options
 * @returns {Promise<File>} - Optimized File ready for upload
 */
export async function compressImage(file, options = {}) {
  if (!file || !(file instanceof Blob)) {
    return file;
  }

  // If not an image or SVG/GIF, return as is (GIFs lose animation in canvas)
  const mime = file.type || '';
  if (!mime.startsWith('image/') || mime === 'image/gif' || mime === 'image/svg+xml') {
    return file;
  }

  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.88,
    outputType = 'image/jpeg'
  } = options;

  // If already very small (< 400KB), return original file
  if (file.size <= 400 * 1024 && !file.name?.toLowerCase().endsWith('.heic')) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;

            // Calculate scaled dimensions while preserving aspect ratio
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
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
              // Fallback to original
              return resolve(file);
            }

            // Clean background for transparency in JPEG
            if (outputType === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
            }

            // Use high quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  return resolve(file);
                }

                // If compression somehow produced a larger file, keep original
                if (blob.size >= file.size && file.size > 0) {
                  return resolve(file);
                }

                // Create new File with clean name
                const baseName = (file.name || 'product-image').replace(/\.[^/.]+$/, '');
                const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
                const compressedFile = new File([blob], `${baseName}${ext}`, {
                  type: outputType,
                  lastModified: Date.now()
                });

                resolve(compressedFile);
              },
              outputType,
              quality
            );
          } catch (canvasErr) {
            console.warn('Canvas compression error, using original file:', canvasErr);
            resolve(file);
          }
        };

        img.onerror = () => {
          // If image element fails to decode, fallback to original
          resolve(file);
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        resolve(file);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Image reader error, using original file:', err);
      resolve(file);
    }
  });
}

/**
 * Compress an array / FileList of images with progress notification
 * @param {FileList|File[]} files
 * @param {Object} options
 * @param {Function} [onProgress]
 * @returns {Promise<File[]>}
 */
export async function compressMultipleImages(files, options = {}, onProgress) {
  if (!files || files.length === 0) return [];
  const fileArray = Array.from(files);
  const total = fileArray.length;
  const compressed = [];

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
    const result = await compressImage(file, options);
    compressed.push(result);
  }

  return compressed;
}

export default {
  compressImage,
  compressMultipleImages,
  formatBytes
};
