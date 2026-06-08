import type { IncomingMessage, ServerResponse } from 'http';
import { buscarProduto, SITES } from '../../scraper';
import { jsonHeaders } from '../http';
import { registrarMetricaBusca } from '../metrics';
import { salvarPrecos } from '../priceHistory';

export function handleSearchRoute(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q');
    const site = parsedUrl.searchParams.get('site') || 'kabum';

    if (!q || !q.trim()) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: 'Parâmetro "q" é obrigatório' }));
      return true;
    }

    if (!SITES[site]) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: `Site "${site}" não encontrado. Opções: ${Object.keys(SITES).join(', ')}` }));
      return true;
    }

    res.writeHead(200, jsonHeaders());

    const startedAt = Date.now();
    buscarProduto(site, q.trim())
      .then((data) => {
        if (!('erro' in data) || !data.erro) {
          salvarPrecos(data.produtos, site);
          registrarMetricaBusca({
            origem: 'manual',
            site,
            termo: q.trim(),
            status: 'ok',
            total: data.total,
            duracaoMs: Date.now() - startedAt,
          });
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — ${data.total} produto(s) encontrado(s)`);
        } else {
          registrarMetricaBusca({
            origem: 'manual',
            site,
            termo: q.trim(),
            status: 'erro',
            total: 0,
            duracaoMs: Date.now() - startedAt,
            erro: data.mensagem,
          });
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${data.mensagem}`);
        }
        res.end(JSON.stringify(data));
      })
      .catch((err: unknown) => {
        const error = err as Error;
        registrarMetricaBusca({
          origem: 'manual',
          site,
          termo: q.trim(),
          status: 'erro',
          total: 0,
          duracaoMs: Date.now() - startedAt,
          erro: error.message,
        });
        console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${error.message}`);
        res.end(JSON.stringify({ erro: true, mensagem: error.message }));
      });

    return true;
  }

  if (pathname === '/api/sites' && req.method === 'GET') {
    res.writeHead(200, jsonHeaders());
    const sites = Object.entries(SITES).map(([key, val]) => ({ key, nome: val.nome }));
    res.end(JSON.stringify(sites));
    return true;
  }

  return false;
}
