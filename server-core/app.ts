import * as http from 'http';
import { PORT } from './env';
import { serveStatic } from './http';
import { handleApiRoutes } from './routes';

export function createServer(): http.Server {
  return http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const parsedUrl = new URL(req.url!, `http://${req.headers.host || `localhost:${PORT}`}`);
    const pathname = parsedUrl.pathname;

    if (handleApiRoutes(pathname, req, res, parsedUrl)) return;

    serveStatic(pathname, res);
  });
}
