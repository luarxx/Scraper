import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from '../http';
import { getStatsDashboard } from '../metrics';

export function handleStatsRoutes(pathname: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (pathname === '/api/stats/dashboard' && req.method === 'GET') {
    sendJson(res, 200, getStatsDashboard());
    return true;
  }

  return false;
}
