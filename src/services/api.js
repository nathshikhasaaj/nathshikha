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

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || (res.status === 413 ? 'File size too large' : 'Something went wrong');
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
    formData = new FormData();
    formData.append(fieldName, fileOrFormData);
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || data.message || (res.status === 413 ? 'Image size exceeds maximum limit' : 'Failed to upload image');
    throw new Error(errorMsg);
  }
  return data;
}

