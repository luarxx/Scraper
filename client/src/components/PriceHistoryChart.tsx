import { useMemo, useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { PricePoint, HistorySummary } from '../types';

interface PriceHistoryChartProps {
  history: PricePoint[];
  siteColor: string;
  loading: boolean;
  erro: string | null;
  summary?: HistorySummary | null;
  collapsed: boolean;
  onToggle: () => void;
  onExpand?: () => void;
}

function formatBRL(cents: number | null): string {
  if (cents === null || cents === undefined) return '—';
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRLAxis(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function trendOf(summary: HistorySummary | null | undefined): { dir: 'up' | 'down' | 'flat'; pct: number } | null {
  if (!summary || summary.records < 2 || summary.trend_percent === null) return null;
  const pct = summary.trend_percent;
  if (Math.abs(pct) < 0.05) return { dir: 'flat', pct };
  return { dir: pct < 0 ? 'down' : 'up', pct };
}

function colorOf(dir: 'up' | 'down' | 'flat'): { fg: string; bg: string; border: string } {
  if (dir === 'down') return { fg: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', border: 'rgba(52, 211, 153, 0.22)' };
  if (dir === 'up') return { fg: '#fb7185', bg: 'rgba(251, 113, 133, 0.08)', border: 'rgba(251, 113, 133, 0.22)' };
  return { fg: '#94a3b8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.18)' };
}

function buildSparkPath(history: PricePoint[], width: number, height: number): string {
  const points = history
    .map(p => p.price_cents)
    .filter((v): v is number => v !== null);
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = 2;
  const drawH = height - pad * 2;
  return points
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + drawH - ((v - min) / range) * drawH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

interface TooltipPayloadItem { payload: PricePoint }

function CustomTooltip({ active, payload, siteColor }: { active?: boolean; payload?: readonly TooltipPayloadItem[]; siteColor: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (point.price_cents === null) return null;
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/95 backdrop-blur-sm px-2.5 py-2 shadow-2xl">
      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider tabular-nums">
        {formatDateFull(point.captured_at)}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[10px] text-slate-500">R$</span>
        <span className="text-base font-bold tabular-nums" style={{ color: siteColor }}>
          {formatBRL(point.price_cents)}
        </span>
      </div>
      {point.parcelamento && (
        <div className="mt-1 text-[10px] text-slate-500 leading-tight max-w-[180px]">
          {point.parcelamento}
        </div>
      )}
    </div>
  );
}

interface KpiCellProps {
  label: string;
  value: string;
  accent: 'emerald' | 'rose' | 'slate' | 'site';
  index: number;
  siteColor?: string;
  badge?: { dir: 'up' | 'down'; text: string; fg: string; bg: string; border: string } | null;
}

const ACCENT_COLOR: Record<KpiCellProps['accent'], string> = {
  emerald: '#34d399',
  rose: '#fb7185',
  slate: '#f1f5f9',
  site: '#f97316',
};

function KpiCell({ label, value, accent, index, siteColor, badge }: KpiCellProps) {
  const color = accent === 'site' && siteColor ? siteColor : ACCENT_COLOR[accent];
  return (
    <div
      className="relative bg-slate-950/40 px-2.5 py-2.5 flex flex-col items-center justify-center min-w-0"
      style={{ animation: `kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.06}s both` }}
    >
      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.18em] leading-none">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-0.5">
        <span className="text-[9px] font-medium text-slate-600 leading-none">R$</span>
        <span
          className="text-sm font-bold tabular-nums leading-none truncate max-w-full"
          style={{ color, animation: `numberTick 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.06 + 0.05}s both` }}
        >
          {value}
        </span>
      </div>
      {badge && (
        <span
          className="mt-1 text-[8.5px] font-bold tabular-nums px-1.5 py-px rounded border leading-none"
          style={{ color: badge.fg, background: badge.bg, borderColor: badge.border }}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

export function PriceHistoryChart({ history, siteColor, loading, erro, summary, collapsed, onToggle, onExpand }: PriceHistoryChartProps) {
  const gradientId = useId().replace(/:/g, '');

  const chartData = useMemo(() => {
    return history
      .filter(p => p.price_cents !== null)
      .map(p => ({
        ...p,
        date: formatDateShort(p.captured_at),
        price: p.price_cents! / 100,
      }));
  }, [history]);

  const trend = trendOf(summary);
  const trendColor = trend ? colorOf(trend.dir) : null;
  const hasData = summary && summary.records > 0;
  const sparkPath = useMemo(() => buildSparkPath(history, 64, 18), [history]);

  if (erro && history.length === 0) return null;
  if (!loading && history.length === 0 && !summary) return null;

  function handleExpand() {
    onToggle();
    onExpand?.();
  }

  if (collapsed) {
    return (
      <div className="mt-3 relative">
        <div
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
          style={{ background: siteColor, boxShadow: `0 0 12px ${siteColor}80` }}
          aria-hidden
        />
        <button
          onClick={handleExpand}
          className="group/btn w-full pl-4 pr-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all flex items-center gap-3 overflow-hidden"
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: siteColor }}
          >
            Histórico
          </span>

          {hasData && sparkPath && (
            <svg width="64" height="18" viewBox="0 0 64 18" className="opacity-80 group-hover/btn:opacity-100 transition-opacity">
              <path
                d={sparkPath}
                fill="none"
                stroke={siteColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 200,
                  strokeDashoffset: 200,
                  animation: 'sparkDraw 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              />
            </svg>
          )}

          {hasData && (
            <span className="text-[10px] text-slate-500 tabular-nums">
              {summary!.records} pt{summary!.records !== 1 ? 's' : ''}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-slate-500 group-hover/btn:text-slate-300 transition-colors">
            Expandir
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform group-hover/btn:translate-y-0.5">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="mt-3 relative rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden"
      style={{ animation: 'panelSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(to bottom, ${siteColor}, ${siteColor}40 60%, transparent)`,
          boxShadow: `0 0 16px ${siteColor}60`,
        }}
        aria-hidden
      />

      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${siteColor} 1px, transparent 1px), linear-gradient(90deg, ${siteColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      <div className="relative px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em] shrink-0"
            style={{ color: siteColor }}
          >
            Histórico de Preços
          </span>
          {summary?.first_seen && (
            <span className="text-[10px] text-slate-600 tabular-nums truncate">
              · desde {new Date(summary.first_seen).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="group/x text-[10px] font-medium text-slate-500 hover:text-white transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded -mr-1 shrink-0"
          aria-label="Fechar histórico"
        >
          <span className="hidden sm:inline">Fechar</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform group-hover/x:rotate-90">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {hasData && (
        <div className="relative px-4 pt-2 pb-4">
          <div
            className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.02]"
            role="group"
            aria-label="Resumo de preços"
          >
            <KpiCell label="Mín" value={formatBRL(summary!.min_price)} accent="emerald" index={0} />
            <KpiCell label="Máx" value={formatBRL(summary!.max_price)} accent="rose" index={1} />
            <KpiCell label="Média" value={formatBRL(summary!.avg_price)} accent="slate" index={2} />
            <KpiCell
              label="Atual"
              value={formatBRL(summary!.current_price)}
              accent={trend?.dir === 'down' ? 'emerald' : trend?.dir === 'up' ? 'rose' : 'site'}
              index={3}
              siteColor={siteColor}
              badge={trend && trend.dir !== 'flat' ? {
                dir: trend.dir,
                text: `${trend.dir === 'down' ? '▼' : '▲'} ${Math.abs(trend.pct).toFixed(1)}%`,
                fg: trendColor!.fg,
                bg: trendColor!.bg,
                border: trendColor!.border,
              } : null}
            />
          </div>
        </div>
      )}

      <div className="relative px-2 pb-3">
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span
              className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${siteColor}40`, borderTopColor: 'transparent' }}
            />
            Carregando série histórica
          </div>
        )}

        {!loading && chartData.length > 0 && (
          <div className="w-full" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={siteColor} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={siteColor} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={siteColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'inherit' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatBRLAxis}
                  width={48}
                />
                <Tooltip
                  content={<CustomTooltip siteColor={siteColor} />}
                  cursor={{ stroke: siteColor, strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={siteColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: siteColor,
                    strokeWidth: 2,
                    fill: '#020617',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loading && chartData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div
              className="w-8 h-8 rounded-full border border-dashed flex items-center justify-center text-slate-600"
              style={{ borderColor: `${siteColor}40` }}
            >
              ∅
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Sem dados suficientes para plotar a série de preços.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
