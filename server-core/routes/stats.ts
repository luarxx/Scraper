import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from '../http';
import { getStatsDashboard, getPeriodStats, getOriginBreakdown, getRecentActivity, getConfigCounts } from '../metrics';
import { getAutoStatus } from '../auto';
import { getWatchStatus } from '../watch';
import { getWishlistStatus } from '../wishlist';
import { AUTO_DISABLED } from '../env';
import { dbDatetimeToApi } from '../time';

export function handleStatsRoutes(pathname: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (pathname === '/api/stats/dashboard' && req.method === 'GET') {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const period = url.searchParams.get('period') || 'all';

    const base = getStatsDashboard();
    const periodoStats = getPeriodStats(period);
    const porOrigem = getOriginBreakdown(period);
    const atividade = getRecentActivity(10);
    const configs = getConfigCounts();

    let autoStatus: Record<string, unknown> = { status: 'idle', ultima_execucao: null, proxima_execucao: null, total_configurados: 0 };
    let watchStatus: Record<string, unknown> = { status: 'idle', ultima_execucao: null, proxima_execucao: null, total_ativos: 0, total_disparados: 0, webhook_configurado: false };
    let wishlistStatus: Record<string, unknown> = { status: 'idle', ultima_execucao: null, proxima_execucao: null, total_ativos: 0, webhook_configurado: false };

    try { autoStatus = { ...getAutoStatus(), disabled: AUTO_DISABLED }; } catch {}
    try { watchStatus = getWatchStatus(); } catch {}
    try { wishlistStatus = getWishlistStatus(); } catch {}

    const webhook_configurado = Boolean(process.env.DISCORD_WEBHOOK_URL);

    sendJson(res, 200, {
      ...base,
      periodo: period,
      periodo_stats: periodoStats,
      por_origem: porOrigem,
      sistemas: { auto: autoStatus, watch: { ...watchStatus, webhook_configurado }, wishlist: { ...wishlistStatus, webhook_configurado } },
      configuracoes: configs,
      atividade_recente: atividade.map(r => ({ ...r, criado_em: dbDatetimeToApi(r.criado_em) || r.criado_em })),
    });
    return true;
  }

  return false;
}
