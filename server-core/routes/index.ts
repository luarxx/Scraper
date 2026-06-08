import type { IncomingMessage, ServerResponse } from 'http';
import { handleAutoRoutes } from './auto';
import { handleHistoryRoutes } from './history';
import { handleSearchRoute } from './search';
import { handleStatsRoutes } from './stats';
import { handleWatchRoutes } from './watch';

export function handleApiRoutes(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  return handleSearchRoute(pathname, req, res, parsedUrl)
    || handleAutoRoutes(pathname, req, res)
    || handleWatchRoutes(pathname, req, res, parsedUrl)
    || handleStatsRoutes(pathname, req, res)
    || handleHistoryRoutes(pathname, req, res, parsedUrl);
}
