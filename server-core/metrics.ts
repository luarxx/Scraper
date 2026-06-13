import { SITES } from '../scraper';
import { db } from './db';
import { dbDatetimeToApi, formatDbDatetime } from './time';

export type SearchMetricOrigem = 'manual' | 'auto' | 'watch' | 'wishlist';
export type SearchMetricStatus = 'ok' | 'erro';

export type SearchMetricInput = {
  origem: SearchMetricOrigem;
  site: string;
  termo?: string | null;
  url?: string | null;
  status: SearchMetricStatus;
  total?: number;
  duracaoMs: number;
  erro?: string | null;
};

export type SiteStats = {
  site: string;
  siteNome: string;
  total: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number;
};

export type StatsDashboardResponse = {
  total_buscas: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number;
  atualizado_em: string | null;
  sites: SiteStats[];
};

function calcularTaxa(sucessos: number, total: number): number {
  if (total === 0) return 0;
  return Number(((sucessos / total) * 100).toFixed(2));
}

export function registrarMetricaBusca(input: SearchMetricInput): void {
  db.prepare(
    `INSERT INTO search_metrics (origem, site, termo, url, status, total, duracao_ms, erro, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.origem,
    input.site,
    input.termo ?? null,
    input.url ?? null,
    input.status,
    input.total ?? 0,
    Math.max(0, Math.round(input.duracaoMs)),
    input.erro ?? null,
    formatDbDatetime(),
  );
}

export function getStatsDashboard(): StatsDashboardResponse {
  const geral = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as sucessos,
       AVG(duracao_ms) as tempo_medio,
       MAX(criado_em) as atualizado_em
     FROM search_metrics`
  ).get() as { total: number; sucessos: number | null; tempo_medio: number | null; atualizado_em: string | null };

  const rows = db.prepare(
    `SELECT
       site,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as sucessos,
       AVG(duracao_ms) as tempo_medio
     FROM search_metrics
     GROUP BY site`
  ).all() as { site: string; total: number; sucessos: number | null; tempo_medio: number | null }[];

  const total = geral.total || 0;
  const sucessos = geral.sucessos || 0;
  const sites = rows.map((row) => {
    const siteSucessos = row.sucessos || 0;
    const siteTotal = row.total || 0;
    return {
      site: row.site,
      siteNome: SITES[row.site]?.nome || row.site,
      total: siteTotal,
      sucessos: siteSucessos,
      erros: siteTotal - siteSucessos,
      taxa_sucesso: calcularTaxa(siteSucessos, siteTotal),
      tempo_medio_resposta_ms: Math.round(row.tempo_medio || 0),
    };
  }).sort((a, b) => {
    if (b.taxa_sucesso !== a.taxa_sucesso) return b.taxa_sucesso - a.taxa_sucesso;
    if (b.total !== a.total) return b.total - a.total;
    return a.tempo_medio_resposta_ms - b.tempo_medio_resposta_ms;
  });

  return {
    total_buscas: total,
    sucessos,
    erros: total - sucessos,
    taxa_sucesso: calcularTaxa(sucessos, total),
    tempo_medio_resposta_ms: Math.round(geral.tempo_medio || 0),
    atualizado_em: dbDatetimeToApi(geral.atualizado_em),
    sites,
  };
}

function getPeriodCondition(period: string): string {
  switch (period) {
    case '24h': return "criado_em >= datetime('now', '-3 hours', '-24 hours')";
    case '7d': return "criado_em >= datetime('now', '-3 hours', '-7 days')";
    case '30d': return "criado_em >= datetime('now', '-3 hours', '-30 days')";
    default: return '1=1';
  }
}

export function getPeriodStats(period: string): { total: number; sucessos: number; erros: number; taxa_sucesso: number; tempo_medio_resposta_ms: number | null } {
  const condition = getPeriodCondition(period);
  const row = db.prepare(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as sucessos, AVG(duracao_ms) as tempo_medio FROM search_metrics WHERE ${condition}`
  ).get() as { total: number; sucessos: number | null; tempo_medio: number | null };
  const total = row.total || 0;
  const sucessos = row.sucessos || 0;
  return {
    total, sucessos, erros: total - sucessos,
    taxa_sucesso: total === 0 ? 0 : Number(((sucessos / total) * 100).toFixed(2)),
    tempo_medio_resposta_ms: row.tempo_medio ? Math.round(row.tempo_medio) : null,
  };
}

export function getOriginBreakdown(period: string): Array<{ origem: string; total: number; sucessos: number; erros: number; taxa_sucesso: number; tempo_medio_resposta_ms: number }> {
  const condition = getPeriodCondition(period);
  const rows = db.prepare(
    `SELECT origem, COUNT(*) as total, SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as sucessos, AVG(duracao_ms) as tempo_medio FROM search_metrics WHERE ${condition} GROUP BY origem ORDER BY total DESC`
  ).all() as { origem: string; total: number; sucessos: number | null; tempo_medio: number | null }[];
  return rows.map(row => {
    const sucessos = row.sucessos || 0;
    const total = row.total || 0;
    return { origem: row.origem, total, sucessos, erros: total - sucessos, taxa_sucesso: total === 0 ? 0 : Number(((sucessos / total) * 100).toFixed(2)), tempo_medio_resposta_ms: Math.round(row.tempo_medio || 0) };
  });
}

export function getRecentActivity(limit: number = 10): Array<{ id: number; origem: string; site: string; termo: string | null; status: string; total: number; duracao_ms: number; erro: string | null; criado_em: string }> {
  return db.prepare(`SELECT id, origem, site, termo, status, total, duracao_ms, erro, criado_em FROM search_metrics ORDER BY criado_em DESC LIMIT ?`).all(limit) as any;
}

export function getConfigCounts(): { auto_configs: number; watch_alertas_ativos: number; watch_disparados: number; wishlist_itens_ativos: number; total_produtos_rastreados: number; total_price_history_urls: number } {
  const autoCount = db.prepare("SELECT COUNT(*) as c FROM auto_config WHERE ativo = 1").get() as { c: number };
  const watchAtivos = db.prepare("SELECT COUNT(*) as c FROM watch_alerts WHERE ativo = 1 AND status = 'ativo'").get() as { c: number };
  const watchDisparados = db.prepare("SELECT COUNT(*) as c FROM watch_alerts WHERE status = 'disparado'").get() as { c: number };
  const wishlistCount = db.prepare("SELECT COUNT(*) as c FROM wishlist_items WHERE ativo = 1").get() as { c: number };
  const historyUrls = db.prepare("SELECT COUNT(DISTINCT url || '|' || site) as c FROM price_history").get() as { c: number };
  return { auto_configs: autoCount.c, watch_alertas_ativos: watchAtivos.c, watch_disparados: watchDisparados.c, wishlist_itens_ativos: wishlistCount.c, total_produtos_rastreados: watchAtivos.c + wishlistCount.c, total_price_history_urls: historyUrls.c };
}
