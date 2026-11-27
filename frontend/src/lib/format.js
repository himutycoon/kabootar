// "+919680739550" → "+91 96807 39550". Leaves anything it doesn't recognise as-is.
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return String(phone);
}

// 12500 → "₹12,500"
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
