import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../db';
import { sendJson } from '../http';
import { dbDatetimeToApi, formatDbDatetime } from '../time';

export function handleHistoryRoutes(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  if (pathname === '/api/history/summary' && req.method === 'GET') {
    const url = parsedUrl.searchParams.get('url');
    const site = parsedUrl.searchParams.get('site') || 'kabum';
    const days = parseInt(parsedUrl.searchParams.get('days') || '90', 10);

    if (!url) {
      sendJson(res, 400, { erro: true, mensagem: 'Parâmetro "url" é obrigatório' });
      return true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDbDatetime(cutoff);

    const rows = db.prepare(
      `SELECT price_cents, parcelamento, captured_at FROM price_history
       WHERE url = ? AND site = ? AND captured_at >= ?
       ORDER BY captured_at ASC`
    ).all(url, site, cutoffStr) as { price_cents: number | null; parcelamento: string | null; captured_at: string }[];

    if (rows.length === 0) {
      sendJson(res, 404, { erro: true, mensagem: 'Nenhum histórico encontrado' });
      return true;
    }

    const cents = rows.map(r => r.price_cents).filter((c): c is number => c !== null);
    const current = cents[cents.length - 1] ?? null;
    const min = cents.length > 0 ? Math.min(...cents) : null;
    const max = cents.length > 0 ? Math.max(...cents) : null;
    const avg = cents.length > 0 ? Math.round(cents.reduce((a, b) => a + b, 0) / cents.length) : null;
    const trendPct = cents.length >= 2 ? parseFloat((((current! - cents[0]) / cents[0]) * 100).toFixed(2)) : null;

    sendJson(res, 200, {
      records: rows.length,
      trend_percent: trendPct,
      current_price: current,
      min_price: min,
      max_price: max,
      avg_price: avg,
      first_seen: dbDatetimeToApi(rows[0].captured_at),
    });
    return true;
  }

  if (pathname === '/api/history' && req.method === 'GET') {
    const url = parsedUrl.searchParams.get('url');
    const site = parsedUrl.searchParams.get('site') || 'kabum';
    const days = parseInt(parsedUrl.searchParams.get('days') || '90', 10);

    if (!url) {
      sendJson(res, 400, { erro: true, mensagem: 'Parâmetro "url" é obrigatório' });
      return true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDbDatetime(cutoff);

    const rows = db.prepare(
      `SELECT price_cents, parcelamento, captured_at FROM price_history
       WHERE url = ? AND site = ? AND captured_at >= ?
       ORDER BY captured_at ASC`
    ).all(url, site, cutoffStr) as { price_cents: number | null; parcelamento: string | null; captured_at: string }[];

    if (rows.length === 0) {
      sendJson(res, 404, { erro: true, mensagem: 'Nenhum histórico encontrado' });
      return true;
    }

    sendJson(res, 200, rows.map((row) => ({
      ...row,
      captured_at: dbDatetimeToApi(row.captured_at),
    })));
    return true;
  }

  return false;
}
