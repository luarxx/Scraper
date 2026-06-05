import { useId, useState, useMemo, memo } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
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
import { Icon } from './Icon';

interface PriceHistoryChartProps {
  history: PricePoint[];
  siteColor: string;
  loading: boolean;
  erro: string | null;
  summary?: HistorySummary | null;
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

interface TooltipPayloadItem { payload: PricePoint }

const ACCENT_COLOR = {
  emerald: '#34d399',
  rose: '#fb7185',
  slate: '#f1f5f9',
  site: '#f97316',
} as const;

function tooltipValueColor(point: PricePoint, summary: HistorySummary | null | undefined): string {
  if (!summary || point.price_cents === null) return ACCENT_COLOR.slate;
  if (summary.min_price !== null && point.price_cents === summary.min_price) return ACCENT_COLOR.emerald;
  if (summary.max_price !== null && point.price_cents === summary.max_price) return ACCENT_COLOR.rose;
  if (summary.avg_price !== null && Math.abs(point.price_cents - summary.avg_price) < 1) return ACCENT_COLOR.slate;
  return ACCENT_COLOR.slate;
}

function CustomTooltip({ active, payload, summary }: { active?: boolean; payload?: readonly TooltipPayloadItem[]; summary?: HistorySummary | null }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (point.price_cents === null) return null;
  const valueColor = tooltipValueColor(point, summary);
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/95 backdrop-blur-sm px-2.5 py-2 shadow-2xl">
      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider tabular-nums">
        {formatDateFull(point.captured_at)}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[10px] text-slate-500">R$</span>
        <span className="text-base font-bold tabular-nums" style={{ color: valueColor }}>
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
  accent: keyof typeof ACCENT_COLOR;
  index: number;
  siteColor?: string;
}

const KpiCell = memo(function KpiCell({ label, value, accent, index, siteColor }: KpiCellProps) {
  const color = accent === 'site' && siteColor ? siteColor : ACCENT_COLOR[accent];
  return (
    <div
      className="relative bg-slate-950/40 px-5 py-3 flex flex-col items-center justify-center min-w-0 gap-2"
      style={{ animation: `kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.06}s both` }}
    >
      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.18em] leading-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-medium text-slate-600 leading-none">R$</span>
        <span
          className="text-sm font-bold tabular-nums leading-none truncate max-w-full"
          style={{ color, animation: `numberTick 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.06 + 0.05}s both` }}
        >
          {value}
        </span>
      </div>
    </div>
  );
});

/* ─── ChartBody: Recharts só monta quando expandido ─────────── */
interface ChartBodyProps {
  history: PricePoint[];
  siteColor: string;
  gradientId: string;
  summary?: HistorySummary | null;
}

const ChartBody = memo(function ChartBody({ history, siteColor, gradientId, summary }: ChartBodyProps) {
  const chartData = useMemo(() => {
    const filtered = history.filter((p) => p.price_cents !== null);
    return filtered.map((p, i) => {
      const prev = filtered[i - 1];
      const changed = i === 0 || p.price_cents !== prev?.price_cents;
      return {
        ...p,
        date: p.captured_at,
        price: p.price_cents! / 100,
        isChange: changed,
      };
    });
  }, [history]);

  if (chartData.length === 0) {
    return (
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
    );
  }

  return (
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
            tickFormatter={(val: string) => formatDateShort(val)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatBRLAxis}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip summary={summary} />}
            cursor={{ stroke: siteColor, strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={siteColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={(props: Record<string, unknown>) => {
              const p = props as { cx: number; cy: number; payload: { isChange?: boolean; price_cents?: number | null; captured_at?: string } };
              if (!p.payload?.isChange || p.cx == null || p.cy == null || isNaN(p.cx) || isNaN(p.cy)) return null;
              return (
                <g className="price-dot-group" style={{ cursor: 'pointer' }}>
                  <circle cx={p.cx} cy={p.cy} r={9} fill="transparent" />
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={3.5}
                    fill="#020617"
                    stroke={siteColor}
                    strokeWidth={1.5}
                    style={{
                      opacity: 0,
                      animation: 'badgePop 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
                      transition: 'stroke-width 0.15s, filter 0.15s',
                    }}
                  />
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={6}
                    fill="none"
                    stroke={siteColor}
                    strokeWidth={0}
                    opacity={0}
                    className="dot-glow"
                  />
                </g>
              );
            }}
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
  );
});

/* ─── Main: wrapper colapsável ─────────────────────────────── */
export function PriceHistoryChart({ history, siteColor, loading, erro, summary }: PriceHistoryChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [expanded, setExpanded] = useState(false);

  const trend = useMemo(() => trendOf(summary), [summary]);
  const hasData = !!summary && summary.records > 0;

  if (!loading && !hasData && history.length === 0) return null;

  return (
    <div className="mt-3 relative rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden">
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

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="relative w-full px-4 pt-3 pb-2 flex items-center justify-between gap-2 text-left hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {loading && (
            <span
              className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0"
              style={{ borderColor: `${siteColor}40`, borderTopColor: 'transparent' }}
              aria-hidden
            />
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
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
        <div className="flex items-center gap-2 shrink-0">
          {hasData && (
            <span className="text-[9px] text-slate-500 tabular-nums">
              {summary!.records} pt{summary!.records !== 1 ? 's' : ''}
            </span>
          )}
          {erro && !loading && (
            <span className="text-amber-500/70" title={erro}><Icon icon={AlertTriangle} size={14} /></span>
          )}
          <Icon
            icon={ChevronDown}
            size={12}
            strokeWidth={2.5}
            className="text-slate-500 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>

      {hasData && (
        <div className="relative px-4 pt-1 pb-3">
          <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.02]">
            <KpiCell label="Mín" value={formatBRL(summary!.min_price)} accent="emerald" index={0} />
            <KpiCell label="Máx" value={formatBRL(summary!.max_price)} accent="rose" index={1} />
            <KpiCell label="Média" value={formatBRL(summary!.avg_price)} accent="slate" index={2} />
            <KpiCell
              label="Atual"
              value={formatBRL(summary!.current_price)}
              accent={trend?.dir === 'down' ? 'emerald' : trend?.dir === 'up' ? 'rose' : 'site'}
              index={3}
              siteColor={siteColor}
            />
          </div>
        </div>
      )}

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {expanded && (
            <div className="relative px-2 pb-3 animate-[fadeIn_0.2s_ease-out]">
              <ChartBody history={history} siteColor={siteColor} gradientId={gradientId} summary={summary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
