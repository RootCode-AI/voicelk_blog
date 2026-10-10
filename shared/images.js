export function imageAlt(alt, context = '', decorative = false) {
  if (decorative) return '';
  return String(alt || '').trim() || String(context || '').trim() || 'Article illustration; description not provided';
}
