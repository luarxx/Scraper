import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { buscarProduto, SITES } from './scraper';

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const hasReactBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sendStatic(res: http.ServerResponse, filePath: string, fallback?: () => void): void {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' && fallback) return fallback();
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>404</h1><p>${escapeHtml(path.basename(filePath))} não encontrado</p>`);
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function sendSpa(res: http.ServerResponse): void {
  if (!hasReactBuild) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
    return;
  }
  sendStatic(res, path.join(CLIENT_DIST, 'index.html'));
}

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = new URL(req.url!, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // ─── API: busca ────────────────────────────────────────────────
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q');
    const site = parsedUrl.searchParams.get('site') || 'kabum';

    if (!q || !q.trim()) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: 'Parâmetro "q" é obrigatório' }));
      return;
    }

    if (!SITES[site]) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: `Site "${site}" não encontrado. Opções: ${Object.keys(SITES).join(', ')}` }));
      return;
    }

    res.writeHead(200, jsonHeaders());

    buscarProduto(site, q.trim())
      .then((data) => res.end(JSON.stringify(data)))
      .catch((err: unknown) => {
        const error = err as Error;
        res.end(JSON.stringify({ erro: true, mensagem: error.message }));
      });

    return;
  }

  // ─── API: lista de sites ────────────────────────────────────────
  if (pathname === '/api/sites' && req.method === 'GET') {
    res.writeHead(200, jsonHeaders());
    const sites = Object.entries(SITES).map(([key, val]) => ({ key, nome: val.nome }));
    res.end(JSON.stringify(sites));
    return;
  }

  // ─── Static: React build (produção) ─────────────────────────
  if (hasReactBuild) {
    const url = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(CLIENT_DIST, url);
    sendStatic(res, filePath, () => {
      if (!path.extname(pathname)) {
        return sendSpa(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404</h1><p>${escapeHtml(pathname)} não encontrado</p>`);
    });
    return;
  }

  // ─── Legacy: servir da raiz ─────────────────────────────────
  const url = pathname === '/' ? '/index.html' : pathname;
  sendStatic(res, path.join(ROOT, url));
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────┐');
  console.log(`  │  🚀  ${String('http://localhost:' + String(PORT)).padEnd(26)}│`);
  console.log('  │                                      │');
  console.log('  │  Pressione Ctrl+C para encerrar      │');
  console.log('  └──────────────────────────────────────┘');
  console.log('');
});
