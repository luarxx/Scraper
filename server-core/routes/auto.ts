import type { IncomingMessage, ServerResponse } from 'http';
import { SITES } from '../../scraper';
import { executarAutoBuscas, getAutoStatus, isAutoRunning } from '../auto';
import { db } from '../db';
import { sendJson } from '../http';
import { dbDatetimeToApi } from '../time';

export function handleAutoRoutes(pathname: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (pathname === '/api/auto/config' && req.method === 'GET') {
    const configs = db.prepare(`SELECT id, termo, site, ordem FROM auto_config WHERE ativo = 1 ORDER BY ordem`).all();
    sendJson(res, 200, configs);
    return true;
  }

  if (pathname === '/api/auto/config' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        let entries: { termo: string; site: string }[] = JSON.parse(body);
        if (!Array.isArray(entries)) {
          sendJson(res, 400, { erro: true, mensagem: 'Body deve ser um array de { termo, site }' });
          return;
        }
        entries = entries.filter(e => e.termo && e.termo.trim() && e.site && SITES[e.site]);
        if (entries.length > 10) {
          sendJson(res, 400, { erro: true, mensagem: 'Máximo de 10 produtos permitidos' });
          return;
        }

        const del = db.prepare(`UPDATE auto_config SET ativo = 0 WHERE ativo = 1`);
        const ins = db.prepare(`INSERT INTO auto_config (termo, site, ordem) VALUES (?, ?, ?)`);
        const save = db.transaction((items: { termo: string; site: string }[]) => {
          del.run();
          items.forEach((item, idx) => {
            ins.run(item.termo.trim(), item.site, idx);
          });
        });
        save(entries);

        const configs = db.prepare(`SELECT id, termo, site, ordem FROM auto_config WHERE ativo = 1 ORDER BY ordem`).all();
        sendJson(res, 200, configs);
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return true;
  }

  const autoConfigDeleteMatch = pathname.match(/^\/api\/auto\/config\/(\d+)$/);
  if (autoConfigDeleteMatch && req.method === 'DELETE') {
    const id = parseInt(autoConfigDeleteMatch[1], 10);
    db.prepare(`UPDATE auto_config SET ativo = 0 WHERE id = ? AND ativo = 1`).run(id);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === '/api/auto/status' && req.method === 'GET') {
    sendJson(res, 200, getAutoStatus());
    return true;
  }

  if (pathname === '/api/auto/results' && req.method === 'GET') {
    const ultimaExec = db.prepare(`SELECT id, iniciada_em, finalizada_em, status FROM auto_execucoes ORDER BY id DESC LIMIT 1`).get() as { id: number; iniciada_em: string; finalizada_em: string | null; status: string } | undefined;
    if (!ultimaExec) {
      sendJson(res, 200, { execucao: null, resultados: [] });
      return true;
    }

    const resultados = db.prepare(
      `SELECT id, termo, site, status, total, produtos, erro
       FROM auto_resultados WHERE execucao_id = ? ORDER BY id`
    ).all(ultimaExec.id) as { id: number; termo: string; site: string; status: string; total: number; produtos: string | null; erro: string | null }[];

    const parsed = resultados.map(r => ({ ...r, produtos: r.produtos ? JSON.parse(r.produtos) : [] }));
    sendJson(res, 200, {
      execucao: {
        ...ultimaExec,
        iniciada_em: dbDatetimeToApi(ultimaExec.iniciada_em),
        finalizada_em: dbDatetimeToApi(ultimaExec.finalizada_em),
      },
      resultados: parsed,
    });
    return true;
  }

  if (pathname === '/api/auto/run' && req.method === 'POST') {
    if (isAutoRunning()) {
      sendJson(res, 409, { erro: true, mensagem: 'Já existe uma execução em andamento' });
      return true;
    }
    executarAutoBuscas();
    sendJson(res, 202, { ok: true, mensagem: 'Execução iniciada' });
    return true;
  }

  return false;
}
