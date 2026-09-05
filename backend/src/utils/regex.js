// Escapes regex special characters so user-supplied strings (search terms,
// city names) can be safely interpolated into `new RegExp(...)` without
// throwing on malformed input or opening a ReDoS surface.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
