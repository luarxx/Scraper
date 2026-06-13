export function brlToCents(price: string | null): number | null {
  if (!price) return null;
  const normalized = price.replace(/\u00a0/g, ' ');
  let s = normalized.replace(/R\$\s*/i, '').trim();
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot !== -1 && lastComma === -1 && /^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  const num = parseFloat(s);
  return isNaN(num) ? null : Math.round(num * 100);
}

export function centsToBrl(cents: number | null): string {
  if (cents === null) return 'Preço indisponível';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseTargetPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;
  return brlToCents(value);
}
