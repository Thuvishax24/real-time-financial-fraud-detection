/**
 * Centralized API utility for FraudGuard AI
 * Supports relative endpoints (for proxy/production) and absolute endpoints via VITE_API_URL
 */

export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (API_BASE) {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanPath}`;
  }
  return endpoint;
}

export async function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  return fetch(url, options);
}

export default apiFetch;
