import { useCallback, useEffect } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight,
  BarChart3, Bell, CheckCircle2, Clock, Cpu, ExternalLink, Gauge,
  Globe, HardDrive, Heart, Info, List, Minus, Package, RefreshCw,
  Search, Settings, ShieldCheck, Store, XCircle, Zap,
} from 'lucide-react';
import { useStatsDashboard, type PeriodFilter } from '../hooks/useStatsDashboard';
import type { AtividadeRecenteItem, OriginStats } from '../types';
import { Icon } from './Icon';
import { formatBrazilDateMonthTime } from '../utils/date';

const SITE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.28)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.28)' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.28)' },
};

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: 'all', label: 'Total' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
];

const ORIGIN_META: Record<string, { icon: typeof Activity; label: string; color: string }> = {
  manual: { icon: Search, label: 'Manual', color: '#f97316' },
  auto: { icon: Cpu, label: 'Automática', color: '#3b82f6' },
  watch: { icon: Bell, label: 'Watch', color: '#fbbf24' },
  wishlist: { icon: Heart, label: 'Wishlist', color: '#ec4899' },
};

// ─── Helpers ───────────────────────────────────────────────────

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

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'agora';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d atrás`;
  return formatBrazilDateMonthTime(iso);
}

// ─── Sub-components ───────────────────────────────────────────

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

function StatBox({ icon, label, value, color }: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-surface/60 p-3 text-center">
      <span style={{ color }}><Icon icon={icon} size={20} /></span>
      <span className="text-lg font-bold text-text-primary tabular-nums leading-none">{value}</span>
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}

function SiteRow({ item, index }: { item: { site: string; siteNome: string; total: number; sucessos: number; erros: number; taxa_sucesso: number; tempo_medio_resposta_ms: number }; index: number }) {
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

// ─── Main Component ────────────────────────────────────────────

export function StatsDashboardPanel() {
  const { stats, loading, error, period, fetchStats, setPeriod } = useStatsDashboard();

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasData = Boolean(stats && stats.total_buscas > 0);

  // ─── Inline sub-renders (need component closure) ────────────

  function SistemaCard({ icon, titulo, status, detalhes }: {
    icon: typeof Activity;
    titulo: string;
    status: string;
    detalhes: { label: string; valor: string }[];
  }) {
    const executando = status === 'executando';
    return (
      <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-text-muted"><Icon icon={icon} size={15} /></span>
            <span className="text-sm font-semibold text-text-primary">{titulo}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            executando ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
          }`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${
              executando ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`} />
            {status === 'executando' ? 'Executando' : status === 'agendado' ? 'Agendado' : 'Parado'}
          </span>
        </div>
        <div className="space-y-1">
          {detalhes.map((d, i) => (
            <p key={i} className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{d.label}</span>
              <span className="tabular-nums text-text-secondary">{d.valor}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }

  function OriginCard({ data, index }: { data: OriginStats; index: number }) {
    const meta = ORIGIN_META[data.origem] ?? { icon: Activity, label: data.origem, color: '#94a3b8' };
    const width = `${Math.max(4, Math.min(100, data.taxa_sucesso))}%`;
    return (
      <div
        className="rounded-xl border border-white/[0.06] bg-surface/60 p-4"
        style={{ animation: `fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) ${index * 0.04}s both` }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span style={{ color: meta.color }}><Icon icon={meta.icon} size={16} /></span>
          <span className="text-sm font-semibold text-text-primary">{meta.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="block text-[11px] text-text-muted">Buscas</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatNumber(data.total)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Erros</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatNumber(data.erros)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Sucesso</span>
            <span className="text-sm font-semibold text-emerald-300 tabular-nums">{formatPercent(data.taxa_sucesso)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-text-muted">Tempo médio</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatDuration(data.tempo_medio_resposta_ms)}</span>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full" style={{ width, background: meta.color }} />
        </div>
      </div>
    );
  }

  function RecentActivityItem({ data, index }: { data: AtividadeRecenteItem; index: number }) {
    const meta = ORIGIN_META[data.origem];
    const siteColor = SITE_COLORS[data.site];
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-surface/60 px-3 py-2.5"
        style={{ animation: `fadeInUp 0.25s cubic-bezier(0.16,1,0.3,1) ${index * 0.02}s both` }}
      >
        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${data.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] text-text-muted tabular-nums whitespace-nowrap">{formatRelativeTime(data.criado_em)}</span>
          {meta ? (
            <span
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
              style={{ color: meta.color, borderColor: `${meta.color}30`, background: `${meta.color}10` }}
            >
              <Icon icon={meta.icon} size={10} />
              {meta.label}
            </span>
          ) : (
            <span className="text-[11px] text-text-muted">{data.origem}</span>
          )}
          {data.site && (
            <span className="text-[11px] whitespace-nowrap" style={{ color: siteColor?.text ?? '#94a3b8' }}>
              {data.site}
            </span>
          )}
          <span className="truncate text-xs text-text-primary min-w-0">{data.termo || '—'}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-right">
          <div>
            <span className="block text-[10px] text-text-muted">Itens</span>
            <span className="text-xs font-medium text-text-primary tabular-nums">{data.total}</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted">Duração</span>
            <span className="text-xs font-medium text-text-primary tabular-nums">{formatDuration(data.duracao_ms)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-5 animate-[fadeIn_0.3s_ease-out] sm:px-6 sm:pt-8 sm:pb-24">
      {/* ─── Header ──────────────────────────────────────────── */}
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
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                disabled={loading}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  period === opt.key
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {opt.label}
              </button>
            ))}
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
                Atualizar
              </>
            )}
          </button>
        </div>
      </section>

      {/* ─── Error banner ──────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ─── Loading / Empty / Content ──────────────────────── */}
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
          {/* ─── System Health ──────────────────────────────── */}
          {stats.sistemas && (
            <section className="mb-5 rounded-xl border border-white/[0.06] bg-surface/45 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon icon={Activity} size={16} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Status dos sistemas</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SistemaCard
                  icon={Cpu}
                  titulo="Auto Search"
                  status={stats.sistemas.auto.status}
                  detalhes={[
                    { label: 'Última execução', valor: formatRelativeTime(stats.sistemas.auto.ultima_execucao) },
                    { label: 'Próxima execução', valor: stats.sistemas.auto.proxima_execucao ? formatRelativeTime(stats.sistemas.auto.proxima_execucao) : '—' },
                    { label: 'Termos configurados', valor: formatNumber(stats.sistemas.auto.total_configurados) },
                  ]}
                />
                <SistemaCard
                  icon={Bell}
                  titulo="Watch Alerts"
                  status={stats.sistemas.watch.status}
                  detalhes={[
                    { label: 'Alertas ativos', valor: formatNumber(stats.sistemas.watch.total_ativos) },
                    { label: 'Disparados', valor: formatNumber(stats.sistemas.watch.total_disparados) },
                    { label: 'Próximo check', valor: stats.sistemas.watch.proxima_execucao ? formatRelativeTime(stats.sistemas.watch.proxima_execucao) : '—' },
                  ]}
                />
                <SistemaCard
                  icon={Heart}
                  titulo="Wishlist Itens"
                  status={stats.sistemas.wishlist.status}
                  detalhes={[
                    { label: 'Itens ativos', valor: formatNumber(stats.sistemas.wishlist.total_ativos) },
                    { label: 'Próximo check', valor: stats.sistemas.wishlist.proxima_execucao ? formatRelativeTime(stats.sistemas.wishlist.proxima_execucao) : '—' },
                  ]}
                />
                <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe size={15} className="text-text-muted shrink-0" />
                      <span className="text-sm font-semibold text-text-primary">Discord</span>
                    </div>
                    {stats.sistemas.watch.webhook_configurado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        <CheckCircle2 size={11} />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                        <XCircle size={11} />
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {stats.sistemas.watch.webhook_configurado ? 'Webhook configurado' : 'Sem webhook'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ─── Overview KPIs — Row 1 (All-time) ──────────── */}
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <KpiTile icon={Activity} label="Total de buscas" value={formatNumber(stats.total_buscas)} sub="Manual, Auto e Watch" delay={0} />
            <KpiTile icon={CheckCircle2} label="Taxa de sucesso" value={formatPercent(stats.taxa_sucesso)} sub={`${formatNumber(stats.sucessos)} ok`} accent="#34d399" delay={0.06} />
            <KpiTile icon={Clock} label="Tempo médio" value={formatDuration(stats.tempo_medio_resposta_ms)} sub="Resposta do scraper" accent="#fbbf24" delay={0.12} />
            <KpiTile icon={XCircle} label="Falhas" value={formatNumber(stats.erros)} sub={stats.atualizado_em ? `Atualizado ${formatBrazilDateMonthTime(stats.atualizado_em)}` : 'Sem atualização'} accent="#ef4444" delay={0.18} />
          </div>

          {/* ─── Overview KPIs — Row 2 (Period) ────────────── */}
          {period !== 'all' && stats.periodo_stats && (
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                No período ({period})
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                <KpiTile icon={Activity} label="Buscas no período" value={formatNumber(stats.periodo_stats.total)} sub={`Filtro ${period}`} delay={0} />
                <KpiTile icon={CheckCircle2} label="Sucesso no período" value={formatPercent(stats.periodo_stats.taxa_sucesso)} sub={`${formatNumber(stats.periodo_stats.sucessos)} ok`} accent="#34d399" delay={0.06} />
                <KpiTile icon={Clock} label="Tempo médio" value={stats.periodo_stats.tempo_medio_resposta_ms != null ? formatDuration(stats.periodo_stats.tempo_medio_resposta_ms) : '—'} sub="No período" accent="#fbbf24" delay={0.12} />
                <KpiTile icon={XCircle} label="Falhas no período" value={formatNumber(stats.periodo_stats.erros)} sub={`Em ${period}`} accent="#ef4444" delay={0.18} />
              </div>
            </div>
          )}

          {/* ─── By Origin Breakdown ────────────────────────── */}
          {stats.por_origem && stats.por_origem.length > 0 && (
            <section className="mb-5 rounded-xl border border-white/[0.06] bg-surface/45 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon icon={List} size={16} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Volume por origem</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stats.por_origem.map((item, index) => (
                  <OriginCard key={item.origem} data={item} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* ─── Config Summary ─────────────────────────────── */}
          {stats.configuracoes && (
            <section className="mb-5 rounded-xl border border-white/[0.06] bg-surface/45 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon icon={Settings} size={16} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Configurações ativas</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatBox icon={Cpu} label="Auto configs" value={formatNumber(stats.configuracoes.auto_configs)} color="#3b82f6" />
                <StatBox icon={Bell} label="Watch alertas" value={formatNumber(stats.configuracoes.watch_alertas_ativos)} color="#fbbf24" />
                <StatBox icon={Heart} label="Wishlist itens" value={formatNumber(stats.configuracoes.wishlist_itens_ativos)} color="#ec4899" />
                <StatBox icon={Package} label="Produtos trackeados" value={formatNumber(stats.configuracoes.total_produtos_rastreados)} color="#f97316" />
                <StatBox icon={HardDrive} label="Price history" value={formatNumber(stats.configuracoes.total_price_history_urls)} color="#a78bfa" />
              </div>
            </section>
          )}

          {/* ─── Recent Activity ────────────────────────────── */}
          {stats.atividade_recente && stats.atividade_recente.length > 0 && (
            <section className="mb-5 rounded-xl border border-white/[0.06] bg-surface/45 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon icon={Clock} size={16} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Atividade recente</h2>
              </div>
              <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {stats.atividade_recente.map((item, index) => (
                  <RecentActivityItem key={item.id} data={item} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* ─── Sites Performance ──────────────────────────── */}
          {stats.sites && stats.sites.length > 0 && (
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
          )}
        </>
      )}
    </div>
  );
}
