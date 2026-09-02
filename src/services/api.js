import { compressImage } from '../utils/imageCompressor.js';

const API = '/api';

export const getToken = () => {
  const adminPath = window.location.pathname.startsWith('/admin');
  if (adminPath) {
    return localStorage.getItem('nw-admin-token') || localStorage.getItem('nw-customer-token');
  }
  return localStorage.getItem('nw-customer-token') || localStorage.getItem('nw-admin-token');
};

export async function api(path, opts = {}) {
  const token = getToken();
  const headers = {
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(opts.headers || {})
  };

  if (!(opts.body instanceof FormData) && !headers['Content-Type'] && opts.body) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(API + path, { ...opts, headers });
  } catch (netErr) {
    throw new Error(netErr.message || 'Network connection failed. Please check your internet connection.');
  }

  let rawText = '';
  let data = {};
  try {
    rawText = await res.text();
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    let errorMsg = data.error || data.message;
    if (!errorMsg) {
      if (res.status === 413) {
        errorMsg = 'Request payload too large. Please select optimized photos.';
      } else if (res.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (res.status === 403) {
        errorMsg = 'Admin access required.';
      } else if (rawText && rawText.length < 200 && !rawText.startsWith('<')) {
        errorMsg = rawText;
      } else {
        errorMsg = `Request failed (${res.status})`;
      }
    }
    throw new Error(errorMsg);
  }

  return data;
}

export async function uploadFile(fileOrFormData, path = '/admin/upload', fieldName = 'image') {
  const token = getToken();
  let formData;

  if (fileOrFormData instanceof FormData) {
    formData = fileOrFormData;
  } else {
    // Compress single image if it is a File/Blob
    let fileToUpload = fileOrFormData;
    try {
      fileToUpload = await compressImage(fileOrFormData);
    } catch {
      fileToUpload = fileOrFormData;
    }

    formData = new FormData();
    formData.append(fieldName, fileToUpload);
  }

  let res;
  try {
    res = await fetch(API + path, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: formData
    });
  } catch (netErr) {
    throw new Error(netErr.message || 'Network error during image upload.');
  }

  let data = {};
  try {
    const rawText = await res.text();
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const errorMsg = data.error || data.message || (res.status === 413 ? 'Image size exceeds maximum limit' : 'Failed to upload image');
    throw new Error(errorMsg);
  }
  return data;
}

