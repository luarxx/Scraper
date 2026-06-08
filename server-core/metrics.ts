import { SITES } from '../scraper';
import { db } from './db';
import { dbDatetimeToApi, formatDbDatetime } from './time';

export type SearchMetricOrigem = 'manual' | 'auto' | 'watch';
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
