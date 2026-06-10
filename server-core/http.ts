import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { CLIENT_DIST, hasReactBuild, ROOT } from './env';

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
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

export function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;');
}

export function securityHeaders(contentType: 'json' | 'html' | 'static'): Record<string, string> {
  const h: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer-when-downgrade',
  };
  if (contentType === 'html') {
    h['Content-Security-Policy'] = "default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; script-src 'self'";
  }
  return h;
}

export function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, jsonHeaders());
  res.end(JSON.stringify(data));
}

export function sendStatic(res: http.ServerResponse, filePath: string, fallback?: () => void): void {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' && fallback) return fallback();
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders('html') });
        res.end(`<h1>404</h1><p>${escapeHtml(path.basename(filePath))} não encontrado</p>`);
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    const mime = MIME[ext] || 'application/octet-stream';
    const extra = ext === '.html' ? securityHeaders('html') : securityHeaders('static');
    res.writeHead(200, { 'Content-Type': mime, ...extra });
    res.end(data);
  });
}

export function sendSpa(res: http.ServerResponse): void {
  if (!hasReactBuild) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders('html') });
    res.end('<h1>404</h1>');
    return;
  }
  sendStatic(res, path.join(CLIENT_DIST, 'index.html'));
}

export function serveStatic(pathname: string, res: http.ServerResponse): void {
  if (hasReactBuild) {
    const url = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(CLIENT_DIST, url);
    sendStatic(res, filePath, () => {
      if (!path.extname(pathname)) {
        return sendSpa(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders('html') });
      res.end(`<h1>404</h1><p>${escapeHtml(pathname)} não encontrado</p>`);
    });
    return;
  }

  const url = pathname === '/' ? '/index.html' : pathname;
  sendStatic(res, path.join(ROOT, url));
}
