import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { BarChart3, CalendarClock, Clock, ExternalLink, Heart, RefreshCcw, ShieldCheck, Trash2, TrendingDown, TrendingUp, Warehouse } from 'lucide-react';
import type { Site, WishlistItem, WishlistStatus } from '../types';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { PriceHistoryChart } from './PriceHistoryChart';
import { Icon } from './Icon';
import { formatBrazilDateMonthTime } from '../utils/date';

interface WishlistPanelProps {
  sites: Site[];
  items: WishlistItem[];
  status: WishlistStatus | null;
  loading: boolean;
  saving: boolean;
  running: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  triggerRun: () => Promise<void>;
}

const SITE_COLORS: Record<string, { text: string; bg: string; border: string; label: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.28)', label: 'KaBuM!' },
  pichau: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)', label: 'Pichau' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.28)', label: 'Terabyte' },
};

function centsToBrl(cents: number | null): string {
  if (cents === null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCountdown(iso: string | null, now: number): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return 'A qualquer momento';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  return mins > 0 ? `${mins}min` : '< 1min';
}

function siteLabel(site: string, sites: Site[]): string {
  return sites.find((item) => item.key === site)?.nome || SITE_COLORS[site]?.label || site;
}

function WishlistItemRow({ item, sites, onRemove }: { item: WishlistItem; sites: Site[]; onRemove: (id: number) => void }) {
  const siteColor = SITE_COLORS[item.site] ?? SITE_COLORS.kabum;
  const currentPrice = item.ultimo_preco_text || centsToBrl(item.ultimo_preco_cents);
  const { loading, history, summary, erro, fetchSummary, fetchHistory } = usePriceHistory();
  const historyKeyRef = useRef('');
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!item.url) return;
    const key = `${item.site}|${item.url}`;
    if (historyKeyRef.current === key) return;
    historyKeyRef.current = key;
    fetchSummary(item.url, item.site);
    fetchHistory(item.url, item.site);
  }, [item.site, item.url, fetchSummary, fetchHistory]);

  const trendBadge = useMemo(() => {
    if (!summary || summary.records < 2 || summary.trend_percent === null) return null;
    const pct = summary.trend_percent;
    const down = pct < 0;
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{
          color: down ? '#34d399' : '#ef4444',
          background: down ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        }}
      >
        <Icon icon={down ? TrendingDown : TrendingUp} size={12} /> {Math.abs(pct).toFixed(1)}%
      </span>
    );
  }, [summary]);

  return (
    <div className="group overflow-hidden rounded-xl border border-white/[0.06] bg-surface/60 shadow-sm transition-colors hover:border-white/[0.12]">
      <div className="grid gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white">
          {item.image && !imgError ? (
            <>
              {!imgLoaded && (
                <div
                  className="absolute inset-0 animate-[shimmer_1.5s_linear_infinite] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100"
                  style={{ backgroundSize: '200% 100%' }}
                />
              )}
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="max-h-20 max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
                style={{ opacity: imgLoaded ? 1 : 0 }}
              />
            </>
          ) : (
            <Icon icon={Warehouse} size={28} className="text-slate-300" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{item.title}</h3>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                  style={{ color: siteColor.text, background: siteColor.bg, border: `1px solid ${siteColor.border}` }}
                >
                  {siteLabel(item.site, sites)}
                </span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary no-underline"
              >
                <span className="truncate">{item.url}</span>
                <Icon icon={ExternalLink} size={13} />
              </a>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded-lg border border-slate-700/70 p-2 text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Remover dos desejos"
            >
              <Icon icon={Trash2} size={16} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <span className="block text-[11px] text-text-muted">Último preço</span>
              <span className="text-sm font-semibold text-emerald-300 tabular-nums">{currentPrice}</span>
            </div>
            <div>
              <span className="block text-[11px] text-text-muted">Último check</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums">{formatBrazilDateMonthTime(item.ultimo_check_em || item.atualizado_em)}</span>
            </div>
            <div>
              <span className="block text-[11px] text-text-muted">Parcelamento</span>
              <span className="text-sm font-semibold text-text-primary line-clamp-1">{item.ultimo_parcelamento || '—'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-text-muted">Tendência</span>
              <span className="text-sm font-semibold text-text-primary">{trendBadge || '—'}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1">
              <Icon icon={ShieldCheck} size={13} /> Atualizado a partir da loja
            </span>
            {item.ultimo_disparo_em && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                <Icon icon={Clock} size={13} /> Queda notificada em {formatBrazilDateMonthTime(item.ultimo_disparo_em)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
        <PriceHistoryChart
          history={history}
          siteColor={siteColor.text}
          loading={loading}
          erro={erro}
          summary={summary}
        />
        {item.erro && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {item.erro}
          </div>
        )}
        {!item.erro && (
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            A próxima checagem compara o preço da loja com a referência salva e com o último valor encontrado. Se houver queda em relação ao padrão acompanhado, o Discord recebe aviso e a nova referência é atualizada.
          </p>
        )}
      </div>
    </div>
  );
}

const MemoWishlistItemRow = memo(WishlistItemRow);

export function WishlistPanel({
  sites,
  items,
  status,
  loading,
  saving,
  running,
  error,
  fetchItems,
  fetchStatus,
  removeItem,
  triggerRun,
}: WishlistPanelProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevStatusRef = useRef<string | undefined>(undefined);

  const refreshAll = useCallback(() => {
    fetchItems();
    fetchStatus();
  }, [fetchItems, fetchStatus]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status?.status !== 'executando') return;
    const id = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(id);
  }, [status?.status, fetchStatus]);

  useEffect(() => {
    if (!status?.proxima_execucao || status.status === 'executando') return;
    const delay = Math.max(new Date(status.proxima_execucao).getTime() - Date.now() + 1500, 0);
    const id = setTimeout(() => {
      fetchStatus();
    }, delay);
    return () => clearTimeout(id);
  }, [status?.proxima_execucao, status?.status, fetchStatus]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = status?.status;
    if (prev === 'executando' && curr !== 'executando') {
      fetchItems();
    }
    prevStatusRef.current = curr;
  }, [status?.status, fetchItems]);

  const handleRun = useCallback(async () => {
    await triggerRun();
    fetchStatus();
    setTimeout(refreshAll, 1600);
  }, [triggerRun, fetchStatus, refreshAll]);

  const isRunning = status?.status === 'executando' || running;
  const totalItems = status?.total_ativos ?? items.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-20 sm:pb-24 animate-[fadeIn_0.3s_ease-out]">
      <section className="mb-5 flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-surface/45 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
            <Icon icon={Heart} size={14} />
            Lista de desejos
          </div>
          <h1 className="text-lg font-bold text-text-primary sm:text-xl">
            Guarde ofertas que valem acompanhar e receba aviso quando baixarem
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Salve um produto a partir de um card de resultado para usar o preço atual como referência. Nas próximas checagens, se a loja oscilar para baixo do preço salvo ou do último valor encontrado, o aviso chega pelo Discord.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || saving}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Atualizando
            </>
          ) : (
            <>
              <Icon icon={RefreshCcw} size={15} />
              Atualizar todos
            </>
          )}
        </button>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <span className="relative flex h-3 w-3 shrink-0">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Status</span>
            <span className="text-sm font-semibold text-text-primary mt-0.5 inline-flex items-center gap-1.5">
              <Icon icon={isRunning ? RefreshCcw : ShieldCheck} size={16} /> {isRunning ? 'Checando...' : 'Agendado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={CalendarClock} size={18} />
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Próxima checagem</span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {isRunning ? 'Em execução' : formatCountdown(status?.proxima_execucao ?? null, nowMs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={Clock} size={18} />
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Última execução</span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {status?.ultima_execucao ? formatBrazilDateMonthTime(status.ultima_execucao) : '—'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={BarChart3} size={18} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Itens</span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {totalItems} ativos · {status?.total_disparados ?? 0} quedas
            </span>
          </div>
          <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-text-secondary">
            Discord {status?.webhook_configurado ? 'ok' : 'off'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center text-sm text-text-secondary">
          Carregando desejos…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center">
          <Icon icon={Heart} size={28} className="mx-auto text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-text-primary">Nenhum produto salvo ainda</p>
          <p className="mt-1 text-xs text-text-muted">Abra uma busca, salve uma oferta nos desejos e acompanhe as próximas quedas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MemoWishlistItemRow key={item.id} item={item} sites={sites} onRemove={removeItem} />
          ))}
        </div>
      )}
    </div>
  );
}
