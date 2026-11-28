// User-supplied image links must point at our own storage (or a Google profile photo),
// never an arbitrary site or a javascript:/data: URL.
const TRUSTED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
]);

function isTrustedImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && TRUSTED_HOSTS.has(u.hostname);
  } catch { return false; }
}

module.exports = { isTrustedImageUrl };
