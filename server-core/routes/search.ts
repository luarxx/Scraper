import type { IncomingMessage, ServerResponse } from 'http';
import { buscarProduto, SITES } from '../../scraper';
import { jsonHeaders } from '../http';
import { registrarMetricaBusca } from '../metrics';
import { salvarPrecos } from '../priceHistory';
import { getEnabledSiteKeys, getEnabledSites, isSiteEnabled } from '../enabledSites';

function executarComLog(contexto: string, action: () => void): void {
  try {
    action();
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[Busca Manual] ${contexto}: ${error.message}`);
  }
}

export function handleSearchRoute(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q');
    const enabledKeys = getEnabledSiteKeys();
    const site = parsedUrl.searchParams.get('site') || enabledKeys[0] || '';

    if (!q || !q.trim()) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: 'Parâmetro "q" é obrigatório' }));
      return true;
    }

    if (!SITES[site]) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: `Site "${site}" não encontrado. Opções: ${enabledKeys.join(', ')}` }));
      return true;
    }
    if (!isSiteEnabled(site)) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: `Site "${site}" está desabilitado no momento` }));
      return true;
    }

    res.writeHead(200, jsonHeaders());

    const startedAt = Date.now();
    buscarProduto(site, q.trim())
      .then((data) => {
        if (!('erro' in data) || !data.erro) {
          executarComLog('falha ao salvar histórico de preços', () => salvarPrecos(data.produtos, site));
          executarComLog('falha ao registrar métrica de sucesso', () => {
            registrarMetricaBusca({
              origem: 'manual',
              site,
              termo: q.trim(),
              status: 'ok',
              total: data.total,
              duracaoMs: Date.now() - startedAt,
            });
          });
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — ${data.total} produto(s) encontrado(s)`);
        } else {
          executarComLog('falha ao registrar métrica de erro', () => {
            registrarMetricaBusca({
              origem: 'manual',
              site,
              termo: q.trim(),
              status: 'erro',
              total: 0,
              duracaoMs: Date.now() - startedAt,
              erro: data.mensagem,
            });
          });
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${data.mensagem}`);
        }
        res.end(JSON.stringify(data));
      })
      .catch((err: unknown) => {
        const error = err as Error;
        executarComLog('falha ao registrar métrica de exceção', () => {
          registrarMetricaBusca({
            origem: 'manual',
            site,
            termo: q.trim(),
            status: 'erro',
            total: 0,
            duracaoMs: Date.now() - startedAt,
            erro: error.message,
          });
        });
        console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${error.message}`);
        res.end(JSON.stringify({ erro: true, mensagem: error.message }));
      });

    return true;
  }

  if (pathname === '/api/sites' && req.method === 'GET') {
    res.writeHead(200, jsonHeaders());
    const sites = Object.entries(getEnabledSites()).map(([key, val]) => ({ key, nome: val.nome }));
    res.end(JSON.stringify(sites));
    return true;
  }

  return false;
}
