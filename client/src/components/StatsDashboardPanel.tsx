import { useCallback, useEffect } from 'react';
import { Activity, BarChart3, CheckCircle2, Clock, Gauge, RefreshCw, ShieldCheck, Store, XCircle } from 'lucide-react';
import { useStatsDashboard } from '../hooks/useStatsDashboard';
import type { SiteStats } from '../types';
import { Icon } from './Icon';
import { formatBrazilDateMonthTime } from '../utils/date';

const SITE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.28)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.28)' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.28)' },
};

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}min ${rest}s`;
}

function KpiTile({ icon, label, value, sub, accent, delay }: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface/60 px-4 py-3"
      style={{ animation: `kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}s both` }}
    >
      <span className="shrink-0" style={{ color: accent ?? '#f97316' }}>
        <Icon icon={icon} size={18} />
      </span>
      <div className="min-w-0">
        <span className="block text-[11px] font-medium leading-tight text-text-muted">{label}</span>
        <span className="mt-0.5 block text-sm font-semibold text-text-primary tabular-nums">{value}</span>
        {sub && <span className="mt-0.5 block text-[11px] text-text-muted">{sub}</span>}
      </div>
    </div>
  );
}

function SiteRow({ item, index }: { item: SiteStats; index: number }) {
  const colors = SITE_COLORS[item.site] ?? SITE_COLORS.kabum;
  const width = `${Math.max(4, Math.min(100, item.taxa_sucesso))}%`;

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-surface/60 p-4"
      style={{ animation: `fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) ${index * 0.04}s both` }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold tabular-nums"
              style={{ color: colors.text, background: colors.bg, borderColor: colors.border }}
            >
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-text-primary">{item.siteNome}</h3>
            <span
              className="rounded-md border px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: colors.text, background: colors.bg, borderColor: colors.border }}
            >
              {item.site}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full" style={{ width, background: colors.text }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:text-right">
          <div>
            <span className="block text-[11px] text-text-muted">Sucesso</span>
            <span className="text-sm font-semibold text-emerald-300 tabular-nums">{formatPercent(item.taxa_sucesso)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Buscas</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatNumber(item.total)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Erros</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatNumber(item.erros)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Tempo médio</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatDuration(item.tempo_medio_resposta_ms)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsDashboardPanel() {
  const { stats, loading, error, fetchStats } = useStatsDashboard();

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasData = Boolean(stats && stats.total_buscas > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-5 animate-[fadeIn_0.3s_ease-out] sm:px-6 sm:pt-8 sm:pb-24">
      <section className="mb-5 flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-surface/45 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-xs font-semibold text-blue-300">
            <Icon icon={ShieldCheck} size={14} />
            Operação do scraper
          </div>
          <h1 className="text-lg font-bold text-text-primary sm:text-xl">
            Estatísticas das buscas e verificações executadas
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Acompanhe volume, sucesso por loja e tempo médio de resposta das buscas manuais, automáticas e alertas Watch.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Atualizando
            </>
          ) : (
            <>
              <Icon icon={RefreshCw} size={15} />
              Atualizar dashboard
            </>
          )}
        </button>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center text-sm text-text-secondary">
          Carregando estatísticas...
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center">
          <Icon icon={BarChart3} size={30} className="mx-auto text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-text-primary">Nenhuma métrica registrada ainda</p>
          <p className="mt-1 text-xs text-text-muted">
            Execute uma busca manual, rode a busca automática ou verifique alertas para preencher o dashboard.
          </p>
        </div>
      ) : stats && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <KpiTile icon={Activity} label="Total de buscas" value={formatNumber(stats.total_buscas)} sub="Manual, Auto e Watch" delay={0} />
            <KpiTile icon={CheckCircle2} label="Taxa de sucesso" value={formatPercent(stats.taxa_sucesso)} sub={`${formatNumber(stats.sucessos)} ok`} accent="#34d399" delay={0.06} />
            <KpiTile icon={Clock} label="Tempo médio" value={formatDuration(stats.tempo_medio_resposta_ms)} sub="Resposta do scraper" accent="#fbbf24" delay={0.12} />
            <KpiTile icon={XCircle} label="Falhas" value={formatNumber(stats.erros)} sub={stats.atualizado_em ? `Atualizado ${formatBrazilDateMonthTime(stats.atualizado_em)}` : 'Sem atualização'} accent="#ef4444" delay={0.18} />
          </div>

          <section className="rounded-xl border border-white/[0.06] bg-surface/45 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                  <Icon icon={Store} size={18} />
                  Sites mais acessíveis
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  Ranking por taxa de sucesso, com volume e tempo médio para contexto.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-text-secondary">
                <Icon icon={Gauge} size={13} />
                Sucesso primeiro
              </span>
            </div>
            <div className="space-y-3">
              {stats.sites.map((item, index) => (
                <SiteRow key={item.site} item={item} index={index} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
