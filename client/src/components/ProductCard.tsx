import { useState, useEffect, useRef, memo } from 'react';
import type { Produto } from '../types';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { PriceHistoryChart } from './PriceHistoryChart';

interface ProductCardProps {
  produto: Produto;
  index: number;
  siteKey: string;
  isBestOption?: boolean;
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

export const ProductCard = memo(function ProductCard({ produto, index, siteKey, isBestOption }: ProductCardProps) {
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
        {isDown ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  })();

  return (
    <div
      className="group bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden opacity-0 animate-[fadeInUp_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] transition-all duration-400 hover:border-slate-700/80 hover:-translate-y-0.5 min-h-[460px] sm:min-h-[480px]"
      style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
    >
      <div className="bg-white p-5 flex items-center justify-center border-b border-slate-200 shadow-inner overflow-hidden relative min-h-[160px]">
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
              alt=""
              loading="lazy"
              className="max-w-full max-h-36 object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center text-slate-300 text-2xl font-medium">
            ∅
          </div>
        )}

        {isBestOption && (
          <span
            className="absolute top-2 left-2 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider z-10 shadow-lg animate-[badgePop_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"
            style={{ color: '#fff', background: siteStyle.text }}
          >
            Melhor Opção
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <span
          className="mb-2.5 px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-widest self-start"
          style={{
            color: siteStyle.text,
            background: siteStyle.bg,
            border: `1px solid ${siteStyle.text}33`,
          }}
        >
          {siteName}
        </span>

        <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-3">
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
            <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-400">
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

        <a
          href={produto.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full text-slate-950 font-bold text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl no-underline"
          style={{ background: siteStyle.btnBg }}
        >
          Ir para a Loja
        </a>
      </div>
    </div>
  );
});
