import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../db';
import { sendJson } from '../http';
import { parseTargetPrice } from '../money';
import { formatDbDatetime } from '../time';
import {
  executarWishlistChecks,
  getWishlistStatus,
  isWishlistRunning,
  normalizarWishlistItem,
  parseWishlistCreateBody,
  upsertWishlistItem,
} from '../wishlist';
import type { WishlistItemRow } from '../wishlist';

export function handleWishlistRoutes(pathname: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (pathname === '/api/wishlist/items' && req.method === 'GET') {
    const items = db.prepare(`SELECT * FROM wishlist_items WHERE ativo = 1 ORDER BY atualizado_em DESC, id DESC`).all() as WishlistItemRow[];
    sendJson(res, 200, items.map(normalizarWishlistItem));
    return true;
  }

  if (pathname === '/api/wishlist/items' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      const parsed = parseWishlistCreateBody(body);
      if (!parsed.ok || !parsed.item) {
        sendJson(res, 400, { erro: true, mensagem: parsed.error || 'JSON inválido' });
        return;
      }

      const item = upsertWishlistItem(parsed.item);
      sendJson(res, 201, normalizarWishlistItem(item));
    });
    return true;
  }

  const itemMatch = pathname.match(/^\/api\/wishlist\/items\/(\d+)$/);
  if (itemMatch && req.method === 'PATCH') {
    const id = parseInt(itemMatch[1], 10);
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const current = db.prepare(`SELECT * FROM wishlist_items WHERE id = ?`).get(id) as WishlistItemRow | undefined;
        if (!current) {
          sendJson(res, 404, { erro: true, mensagem: 'Item não encontrado' });
          return;
        }

        const data = JSON.parse(body) as {
          title?: string;
          price?: unknown;
          parcelamento?: unknown;
          image?: unknown;
          status?: string;
        };

        const title = data.title !== undefined ? data.title.trim() : current.title;
        const image = data.image !== undefined
          ? (typeof data.image === 'string' && data.image.trim() ? data.image.trim() : null)
          : current.image;
        const status = data.status !== undefined ? data.status.trim() : current.status;
        const ultimoPrecoCents = data.price !== undefined ? parseTargetPrice(data.price) : current.ultimo_preco_cents;
        const ultimoPrecoText = data.price !== undefined
          ? (typeof data.price === 'string' && data.price.trim() ? data.price.trim() : null)
          : current.ultimo_preco_text;
        const ultimoParcelamento = data.parcelamento !== undefined
          ? (typeof data.parcelamento === 'string' && data.parcelamento.trim() ? data.parcelamento.trim() : null)
          : current.ultimo_parcelamento;

        if (!title) {
          sendJson(res, 400, { erro: true, mensagem: 'Informe um título válido' });
          return;
        }
        if (!['ativo', 'pausado'].includes(status)) {
          sendJson(res, 400, { erro: true, mensagem: 'Status inválido' });
          return;
        }

        const now = formatDbDatetime();
        db.prepare(
          `UPDATE wishlist_items
           SET title = ?, image = ?, ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, status = ?, ativo = ?, atualizado_em = ?
           WHERE id = ?`
        ).run(title, image, ultimoPrecoCents, ultimoPrecoText, ultimoParcelamento, status, status === 'ativo' ? 1 : 0, now, id);

        const item = db.prepare(`SELECT * FROM wishlist_items WHERE id = ?`).get(id) as WishlistItemRow;
        sendJson(res, 200, normalizarWishlistItem(item));
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return true;
  }

  if (itemMatch && req.method === 'DELETE') {
    const id = parseInt(itemMatch[1], 10);
    db.prepare(`UPDATE wishlist_items SET ativo = 0, status = 'pausado', atualizado_em = ? WHERE id = ?`).run(formatDbDatetime(), id);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === '/api/wishlist/status' && req.method === 'GET') {
    sendJson(res, 200, getWishlistStatus());
    return true;
  }

  if (pathname === '/api/wishlist/run' && req.method === 'POST') {
    if (isWishlistRunning()) {
      sendJson(res, 409, { erro: true, mensagem: 'Já existe uma verificação em andamento' });
      return true;
    }
    executarWishlistChecks();
    sendJson(res, 202, { ok: true, mensagem: 'Verificação iniciada' });
    return true;
  }

  return false;
}
