// Keeps the last loaded results so screens still show something when offline.
// Per-device convenience only; every read/write is guarded.
const PREFIX = 'kb_cache_';
const MAX_AGE = 3 * 24 * 60 * 60 * 1000; // ignore anything older than 3 days

export function saveCache(key, data) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data })); } catch { /* full or blocked */ }
}

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.at || Date.now() - v.at > MAX_AGE) return null;
    return v; // { at, data }
  } catch { return null; }
}

// Network failure (no response) vs. a real server error
export const isOffline = (err) => !err?.response || (typeof navigator !== 'undefined' && navigator.onLine === false);
