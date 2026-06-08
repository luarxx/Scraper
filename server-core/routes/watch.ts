import type { IncomingMessage, ServerResponse } from 'http';
import { buscarProdutoPorUrl, SITES } from '../../scraper';
import { db } from '../db';
import { sendJson } from '../http';
import { parseTargetPrice } from '../money';
import { formatDbDatetime } from '../time';
import { executarWatchAlerts, getWatchStatus, isWatchRunning, normalizarWatchAlert } from '../watch';
import type { WatchAlertRow } from '../watch';

export function handleWatchRoutes(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  if (pathname === '/api/watch/alerts' && req.method === 'GET') {
    const alertas = db.prepare(`SELECT * FROM watch_alerts WHERE ativo = 1 OR status = 'disparado' ORDER BY ativo DESC, id DESC`).all() as WatchAlertRow[];
    sendJson(res, 200, alertas.map(normalizarWatchAlert));
    return true;
  }

  if (pathname === '/api/watch/preview' && req.method === 'GET') {
    const url = (parsedUrl.searchParams.get('url') || '').trim();
    const site = (parsedUrl.searchParams.get('site') || 'kabum').trim();

    if (!url || !site) {
      sendJson(res, 400, { erro: true, mensagem: 'Informe URL e site' });
      return true;
    }
    if (!SITES[site]) {
      sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
      return true;
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo inválido');
    } catch {
      sendJson(res, 400, { erro: true, mensagem: 'URL inválida' });
      return true;
    }

    buscarProdutoPorUrl(site, url)
      .then((produto) => {
        console.log(`[Watch] Preview de URL em ${SITES[site].nome} — "${produto.title}" — preço ${produto.price || 'N/D'}${produto.priceSource ? ` (${produto.priceSource})` : ''}`);
        sendJson(res, 200, produto);
      })
      .catch((err: unknown) => {
        const error = err as Error;
        console.log(`[Watch] Preview de URL em ${SITES[site].nome} — erro: ${error.message}`);
        sendJson(res, 422, { erro: true, mensagem: error.message });
      });
    return true;
  }

  if (pathname === '/api/watch/alerts' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body) as {
          nome?: string;
          url?: string;
          site?: string;
          canal?: string;
          preco_alvo?: unknown;
          preco_alvo_cents?: unknown;
          ultimo_preco?: unknown;
          ultimo_preco_cents?: unknown;
          ultimo_parcelamento?: unknown;
        };
        const nome = (data.nome || '').trim();
        const url = (data.url || '').trim();
        const site = (data.site || '').trim();
        const canal = (data.canal || 'discord').trim();
        const precoAlvo = parseTargetPrice(data.preco_alvo_cents ?? data.preco_alvo);
        const ultimoPreco = data.ultimo_preco !== undefined || data.ultimo_preco_cents !== undefined
          ? parseTargetPrice(data.ultimo_preco_cents ?? data.ultimo_preco)
          : null;
        const ultimoPrecoText = typeof data.ultimo_preco === 'string' && data.ultimo_preco.trim()
          ? data.ultimo_preco.trim()
          : null;
        const ultimoParcelamento = typeof data.ultimo_parcelamento === 'string' && data.ultimo_parcelamento.trim()
          ? data.ultimo_parcelamento.trim()
          : null;

        if (!nome || !url || !site || precoAlvo === null) {
          sendJson(res, 400, { erro: true, mensagem: 'Informe nome, URL, site e preço-alvo' });
          return;
        }
        if (!SITES[site]) {
          sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
          return;
        }
        if (canal !== 'discord') {
          sendJson(res, 400, { erro: true, mensagem: 'Canal suportado: discord' });
          return;
        }
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo inválido');
        } catch {
          sendJson(res, 400, { erro: true, mensagem: 'URL inválida' });
          return;
        }

        const now = formatDbDatetime();
        const result = db.prepare(
          `INSERT INTO watch_alerts
             (nome, url, site, canal, preco_alvo_cents, ultimo_preco_cents, ultimo_preco_text, ultimo_parcelamento, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(nome, url, site, canal, precoAlvo, ultimoPreco, ultimoPrecoText, ultimoParcelamento, now, now);

        const alerta = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(result.lastInsertRowid) as WatchAlertRow;
        sendJson(res, 201, normalizarWatchAlert(alerta));
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return true;
  }

  const watchAlertMatch = pathname.match(/^\/api\/watch\/alerts\/(\d+)$/);
  if (watchAlertMatch && req.method === 'PATCH') {
    const id = parseInt(watchAlertMatch[1], 10);
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const current = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(id) as WatchAlertRow | undefined;
        if (!current) {
          sendJson(res, 404, { erro: true, mensagem: 'Alerta não encontrado' });
          return;
        }

        const data = JSON.parse(body) as { nome?: string; url?: string; site?: string; canal?: string; preco_alvo?: unknown; preco_alvo_cents?: unknown; status?: string };
        const nome = data.nome !== undefined ? data.nome.trim() : current.nome;
        const url = data.url !== undefined ? data.url.trim() : current.url;
        const site = data.site !== undefined ? data.site.trim() : current.site;
        const canal = data.canal !== undefined ? data.canal.trim() : current.canal;
        const precoAlvo = data.preco_alvo !== undefined || data.preco_alvo_cents !== undefined
          ? parseTargetPrice(data.preco_alvo_cents ?? data.preco_alvo)
          : current.preco_alvo_cents;
        const status = data.status !== undefined ? data.status.trim() : current.status;

        if (!nome || !url || !site || precoAlvo === null) {
          sendJson(res, 400, { erro: true, mensagem: 'Informe nome, URL, site e preço-alvo' });
          return;
        }
        if (!SITES[site]) {
          sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
          return;
        }
        if (canal !== 'discord') {
          sendJson(res, 400, { erro: true, mensagem: 'Canal suportado: discord' });
          return;
        }
        if (!['ativo', 'pausado', 'disparado'].includes(status)) {
          sendJson(res, 400, { erro: true, mensagem: 'Status inválido' });
          return;
        }

        const now = formatDbDatetime();
        db.prepare(
          `UPDATE watch_alerts
           SET nome = ?, url = ?, site = ?, canal = ?, preco_alvo_cents = ?, status = ?, ativo = ?, atualizado_em = ?
           WHERE id = ?`
        ).run(nome, url, site, canal, precoAlvo, status, status === 'ativo' ? 1 : 0, now, id);

        const alerta = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(id) as WatchAlertRow;
        sendJson(res, 200, normalizarWatchAlert(alerta));
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return true;
  }

  if (watchAlertMatch && req.method === 'DELETE') {
    const id = parseInt(watchAlertMatch[1], 10);
    db.prepare(`UPDATE watch_alerts SET ativo = 0, status = 'pausado', atualizado_em = ? WHERE id = ?`).run(formatDbDatetime(), id);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === '/api/watch/status' && req.method === 'GET') {
    sendJson(res, 200, getWatchStatus());
    return true;
  }

  if (pathname === '/api/watch/run' && req.method === 'POST') {
    if (isWatchRunning()) {
      sendJson(res, 409, { erro: true, mensagem: 'Já existe uma verificação em andamento' });
      return true;
    }
    executarWatchAlerts();
    sendJson(res, 202, { ok: true, mensagem: 'Verificação iniciada' });
    return true;
  }

  return false;
}
