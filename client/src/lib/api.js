const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data?.details);
  return data;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/media', form);
}

// Sends a file straight to a Supabase Storage signed upload URL — used for clips
// too large to pass through the API — reporting progress as a 0–1 fraction.
export function uploadToSignedUrl(signedUrl, file, { contentType, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      if (xhr.status === 413) return reject(new ApiError('Audio files can be at most 10 MB.', 413));
      let message = `Upload failed (${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText).message || message;
      } catch {
        // Keep the status-based message.
      }
      reject(new ApiError(message, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('The upload was interrupted. Check your connection and try again.', 0));
    xhr.send(file);
  });
}

// Media uploaded to the blog is stored as a site-relative /api/media/<id> path.
export function mediaUrl(url) {
  if (!url) return '';
  return url.startsWith('/api/') ? `${BASE}${url}` : url;
}
