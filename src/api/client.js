const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_TIMEOUT = 30_000;
const UPLOAD_TIMEOUT = 10 * 60_000;
const TOKEN_KEY = "studybuddy_access_token";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function storedToken() {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

function notifyUnauthorized() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("studybuddy:unauthorized"));
}

async function readError(response) {
  const body = await response.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(". ") || "Please check the submitted information.";
  }
  return body?.message || `Request failed (${response.status}). Please try again.`;
}

async function request(path, options = {}) {
  const token = storedToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (response.status === 401 && token) notifyUnauthorized();
    if (!response.ok) throw new ApiError(await readError(response), response.status);
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.");
    }
    throw new ApiError("Could not reach Study Buddy. Check your connection and try again.");
  } finally {
    window.clearTimeout(timeout);
  }
}

function upload(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = storedToken();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.timeout = UPLOAD_TIMEOUT;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status === 401 && token) notifyUnauthorized();
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body);
      const detail = body?.detail;
      reject(new ApiError(typeof detail === "string" ? detail : `Upload failed (${xhr.status}). Please try again.`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Upload failed because the server could not be reached."));
    xhr.ontimeout = () => reject(new ApiError("Upload timed out. Your document may still be processing."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const api = {
  register: (email, password) => request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
  documents: () => request("/documents"),
  uploadDocument: (file, onProgress) => upload("/documents", file, onProgress),
  retryDocument: (id) => request(`/documents/${id}/retry`, { method: "POST" }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  conversations: () => request("/conversations"),
  conversation: (id) => request(`/conversations/${id}`),
  createConversation: (payload) => request("/conversations", { method: "POST", body: JSON.stringify(payload) }),
  updateConversation: (id, payload) => request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: "DELETE" }),
  sendMessage: (id, content) => request(`/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    timeout: 3 * 60_000,
  }),
};

export { TOKEN_KEY };
