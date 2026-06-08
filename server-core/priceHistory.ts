import { db } from './db';
import { brlToCents } from './money';
import { formatDbDatetime } from './time';
import type { Produto } from '../scraper';

export function salvarPrecos(produtos: Produto[], site: string): void {
  if (produtos.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO price_history (url, site, price_cents, parcelamento, captured_at) VALUES (?, ?, ?, ?, ?)`
  );
  const saveMany = db.transaction((items: { url: string; price: string | null; parcelamento: string | null }[]) => {
    const capturedAt = formatDbDatetime();
    for (const p of items) {
      insert.run(p.url, site, brlToCents(p.price), p.parcelamento, capturedAt);
    }
  });
  saveMany(produtos);
}
