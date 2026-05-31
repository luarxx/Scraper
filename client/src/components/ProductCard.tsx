import { useState } from 'react';
import type { Produto } from '../types';

interface ProductCardProps {
  produto: Produto;
  index: number;
  siteKey: string;
  isBestOption?: boolean;
  totalPalavras: number;
}

const SITE_COLORS: Record<string, { text: string; bg: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  terabyteshop: { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
};

function categoriaRelevancia(relevancia: number, total: number): string {
  if (relevancia === 0) return 'Sem correspondência';
  if (relevancia === total) return 'Correspondência total';
  if (relevancia > total / 2) return 'Correspondência alta';
  return 'Correspondência baixa';
}

export function ProductCard({ produto, index, siteKey, isBestOption, totalPalavras }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const priceDisplay = produto.price || 'Preço não informado';

  return (
    <div
      className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col opacity-0 animate-[fadeInUp_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] transition-all duration-400 hover:bg-white/[0.05] hover:border-accent/20 hover:-translate-y-0.5"
      style={{
        animationDelay: `${index * 0.05}s`,
        transitionProperty: 'border-color, background-color, box-shadow, transform',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex gap-4 mb-auto">
        {produto.image && !imgError ? (
          <img
            src={produto.image}
            alt=""
            loading="lazy"
            className="w-20 h-20 rounded-xl object-contain bg-white/[0.03] flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-white/[0.03] flex-shrink-0 flex items-center justify-center text-text-muted text-xl">
            ∅
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted font-body">
            {categoriaRelevancia(produto.relevancia, totalPalavras)}
          </span>
          <h3 className="font-display text-sm leading-snug text-text-primary line-clamp-3 mt-1.5 font-medium">
            {produto.title}
          </h3>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-display text-xl font-semibold leading-none tracking-tight ${
                produto.price ? 'text-price' : 'text-text-muted'
              }`}
            >
              {priceDisplay}
            </span>
            {isBestOption && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-[badgePop_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                style={{
                  color: SITE_COLORS[siteKey]?.text ?? '#f97316',
                  background: SITE_COLORS[siteKey]?.bg ?? 'rgba(249, 115, 22, 0.1)',
                }}
              >
                Melhor Opção
              </span>
            )}
          </div>
          {produto.parcelamento && (
            <div className="text-xs text-text-secondary font-body mt-1">
              {produto.parcelamento}
            </div>
          )}
        </div>
        <a
          href={produto.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-text-secondary hover:text-accent transition-colors duration-300 whitespace-nowrap flex-shrink-0 no-underline flex items-center gap-1.5 group/link"
        >
          Acessar
          <span className="inline-block transition-transform duration-300 group-hover/link:translate-x-1">
            →
          </span>
        </a>
      </div>
    </div>
  );
}
