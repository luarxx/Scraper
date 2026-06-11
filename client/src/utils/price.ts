export function parseBrlPrice(price: string | null | undefined): number | null {
  if (!price) return null;

  const raw = String(price)
    .trim()
    .replace(/[^\d.,-]/g, '');

  if (!raw) return null;

  let normalized = raw;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes('.')) {
    const parts = raw.split('.');
    if (parts.length > 2) {
      normalized = raw.replace(/\./g, '');
    } else {
      const [whole, fraction = ''] = parts;
      normalized = fraction.length === 3 ? `${whole}${fraction}` : raw;
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
