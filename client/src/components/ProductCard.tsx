import { useState, useEffect, useRef, memo } from 'react';
import { TrendingUp, TrendingDown, ImageOff, BellPlus } from 'lucide-react';
import type { Produto } from '../types';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { PriceHistoryChart } from './PriceHistoryChart';
import { Icon } from './Icon';
import { formatBrazilDateTime } from '../utils/date';

interface ProductCardProps {
  produto: Produto;
  index: number;
  siteKey: string;
  updatedAt?: string | null;
  isBestOption?: boolean;
  onCreateAlert?: (produto: Produto, siteKey: string) => void;
}

const SITE_COLORS: Record<string, { text: string; bg: string; btnBg: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', btnBg: 'linear-gradient(to right, #f97316, #f59e0b)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', btnBg: 'linear-gradient(to right, #ef4444, #f43f5e)' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', btnBg: 'linear-gradient(to right, #10b981, #14b8a6)' },
};

const SITE_NAMES: Record<string, string> = {
  kabum: 'KaBuM!',
  terabyteshop: 'Terabyte',
  pichau: 'Pichau',
};

export const ProductCard = memo(function ProductCard({ produto, index, siteKey, updatedAt, isBestOption, onCreateAlert }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const siteStyle = SITE_COLORS[siteKey] ?? SITE_COLORS.kabum;
  const siteName = SITE_NAMES[siteKey] ?? siteKey;
  const { loading, history, summary, erro, fetchSummary, fetchHistory } = usePriceHistory();
  const fetchedRef = useRef(false);

  // Busca summary + histórico ao montar (apenas uma vez)
  useEffect(() => {
    if (!fetchedRef.current && produto.url) {
      fetchedRef.current = true;
      fetchSummary(produto.url, siteKey);
      fetchHistory(produto.url, siteKey);
    }
  }, [produto.url, siteKey, fetchSummary, fetchHistory]);

  // Calcula tendência
  const trendBadge = (() => {
    if (!summary || summary.records < 2 || summary.trend_percent === null) return null;
    const pct = summary.trend_percent;
    const isDown = pct < 0;
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{
          color: isDown ? '#34d399' : '#ef4444',
          background: isDown ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        }}
      >
        {isDown ? <Icon icon={TrendingDown} size={12} /> : <Icon icon={TrendingUp} size={12} />} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  })();

  return (
    <div
      className="group bg-slate-900 border border-slate-800/90 rounded-xl shadow-sm flex flex-col overflow-hidden opacity-0 animate-[fadeInUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] transition-colors duration-200 hover:border-slate-700/90 min-h-[450px] sm:min-h-[470px]"
      style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
    >
      <div className="bg-white p-5 flex items-center justify-center border-b border-slate-200 overflow-hidden relative min-h-[160px]">
        {produto.image && !imgError ? (
          <>
            {/* Shimmer placeholder */}
            {!imgLoaded && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-[shimmer_1.5s_linear_infinite]"
                style={{ backgroundSize: '200% 100%' }}
              />
            )}
            <img
              src={produto.image}
              alt={produto.title}
              loading="lazy"
              className="max-w-full max-h-36 object-contain group-hover:scale-[1.03] transition-transform duration-300 ease-out"
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center text-slate-300">
            <Icon icon={ImageOff} size={28} />
          </div>
        )}

        {isBestOption && (
          <span
            className="absolute top-2 left-2 text-[11px] font-semibold px-2.5 py-1 rounded-full z-10 animate-[badgePop_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]"
            style={{ color: '#fff', background: siteStyle.text }}
          >
            Melhor Opção
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <span
          className="mb-2.5 px-2.5 py-1 text-[11px] font-semibold rounded-md self-start"
          style={{
            color: siteStyle.text,
            background: siteStyle.bg,
            border: `1px solid ${siteStyle.text}33`,
          }}
        >
          {siteName}
        </span>
        {updatedAt && (
          <div className="mb-2 text-[11px] text-text-muted leading-snug">
            Fonte: <span className="text-text-secondary">{siteName}</span>
            <span className="text-white/[0.18]"> · </span>
            Atualizado em{' '}
            <time className="text-text-secondary tabular-nums">{formatBrazilDateTime(updatedAt)}</time>
          </div>
        )}

        <h3 className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-3 min-h-[3.6rem] sm:min-h-[4.125rem]">
          {produto.title}
        </h3>

        <div className="flex-1" />

        <div className="mt-3 pt-3 border-t border-slate-800/50">
          {produto.price && (
            <span className="text-xs text-slate-500 line-through mb-1 block">
              De: {produto.price}
            </span>
          )}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              {produto.price || 'Preço não informado'}
            </span>
            {trendBadge}
          </div>
          {produto.parcelamento && (
            <div className="text-xs font-medium text-slate-400 mt-1.5 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/50 inline-block">
              {produto.parcelamento}
            </div>
          )}
        </div>

        <PriceHistoryChart
          history={history}
          siteColor={siteStyle.text}
          loading={loading}
          erro={erro}
          summary={summary}
        />

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => onCreateAlert?.(produto, siteKey)}
            className="w-full text-slate-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.99] border border-slate-700/70 bg-slate-800/70 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            <Icon icon={BellPlus} size={16} /> Avisar quando baixar
          </button>
          <a
            href={produto.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-slate-950 font-semibold text-sm px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.99] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            style={{ background: siteStyle.btnBg }}
          >
            Ver oferta na loja
          </a>
        </div>
      </div>
    </div>
  );
});
