import type { IncomingMessage, ServerResponse } from 'http';
import { handleAutoRoutes } from './auto';
import { handleHistoryRoutes } from './history';
import { handleSearchRoute } from './search';
import { handleWatchRoutes } from './watch';

export function handleApiRoutes(pathname: string, req: IncomingMessage, res: ServerResponse, parsedUrl: URL): boolean {
  return handleSearchRoute(pathname, req, res, parsedUrl)
    || handleAutoRoutes(pathname, req, res)
    || handleWatchRoutes(pathname, req, res, parsedUrl)
    || handleHistoryRoutes(pathname, req, res, parsedUrl);
}
