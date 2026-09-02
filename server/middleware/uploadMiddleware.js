import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../public/uploads');

// Ensure directory exists
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  console.error('Error creating uploads directory:', err);
}

// Comprehensive image file validator
const imageFileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  const isImageMime =
    mime.startsWith('image/') ||
    /^image\/(jpeg|jpg|png|webp|gif|heic|heif|avif|pjpeg|x-png|jfif|bmp|tiff)$/i.test(mime);

  const isImageExt = /\.(jpe?g|png|webp|gif|heic|heif|avif|jfif|bmp|tiff)$/i.test(name);

  if (isImageMime || isImageExt) {
    return cb(null, true);
  }

  // Reject with clear error
  return cb(new Error('Only image files (JPG, PNG, WEBP, GIF, HEIC, AVIF) are allowed.'));
};

export const baseMulter = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
    files: 10
  },
  fileFilter: imageFileFilter
});

/**
 * Middleware for single image upload supporting multiple potential field names
 * (e.g. 'image', 'photo', 'file')
 */
export function uploadSingle(fieldNames = ['image', 'photo', 'file']) {
  const fields = (Array.isArray(fieldNames) ? fieldNames : [fieldNames]).map((name) => ({
    name,
    maxCount: 1
  }));

  const uploadHandler = baseMulter.fields(fields);

  return (req, res, next) => {
    uploadHandler(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image file is too large. Maximum size allowed is 25MB.' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Invalid image file upload.' });
      }

      // Consolidate found file to req.file
      if (req.files) {
        for (const f of fields) {
          if (req.files[f.name] && req.files[f.name][0]) {
            req.file = req.files[f.name][0];
            break;
          }
        }
      }

      next();
    });
  };
}

/**
 * Middleware for multiple images upload supporting multiple potential field names
 * (e.g. 'images', 'photos', 'files')
 */
export function uploadMultiple(fieldNames = ['images', 'photos', 'files'], maxCount = 10) {
  const fields = (Array.isArray(fieldNames) ? fieldNames : [fieldNames]).map((name) => ({
    name,
    maxCount
  }));

  const uploadHandler = baseMulter.fields(fields);

  return (req, res, next) => {
    uploadHandler(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'One or more image files exceed the 25MB size limit.' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: `Maximum ${maxCount} images can be uploaded at a time.` });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Invalid image file upload.' });
      }

      // Consolidate found files to req.files array
      let combinedFiles = [];
      if (req.files) {
        for (const f of fields) {
          if (Array.isArray(req.files[f.name])) {
            combinedFiles.push(...req.files[f.name]);
          }
        }
      }
      req.files = combinedFiles;

      next();
    });
  };
}

export default {
  uploadsDir,
  baseMulter,
  uploadSingle,
  uploadMultiple
};
