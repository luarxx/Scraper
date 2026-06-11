import { ArrowDownUp, ArrowUpAZ, BadgeDollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export type SortOption = 'relevance' | 'price-asc' | 'price-desc';

interface SortControlProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  totalCount?: number;
  compact?: boolean;
}

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'relevance', label: 'Relevância', icon: ArrowDownUp },
  { value: 'price-asc', label: 'Menor preço', icon: BadgeDollarSign },
  { value: 'price-desc', label: 'Maior preço', icon: BadgeDollarSign },
];

export function SortControl({ value, onChange, totalCount, compact }: SortControlProps) {
  return (
    <section
      className={`rounded-xl border border-white/[0.06] bg-surface/60 ${
        compact
          ? 'inline-flex max-w-full flex-wrap items-center gap-2 px-2.5 py-2'
          : 'px-4 py-3'
      }`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'shrink-0' : ''}`}>
        <div className="flex items-center gap-2 text-text-secondary">
          <Icon icon={ArrowUpAZ} size={compact ? 13 : 14} />
          <span className="text-xs font-semibold">Ordenar</span>
        </div>
        {!compact && typeof totalCount === 'number' && totalCount > 0 && (
          <span className="text-[11px] font-medium text-text-muted tabular-nums">
            {totalCount} ofertas
          </span>
        )}
      </div>

      <div className={compact ? 'flex min-w-0 flex-wrap gap-1.5' : 'mt-3 grid gap-2 sm:grid-cols-3'}>
        {SORT_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${
                compact ? 'h-7 px-2 text-[11px]' : 'h-10 px-3 text-xs'
              } ${
                selected
                  ? 'border-accent/35 bg-accent/15 text-orange-300'
                  : 'border-white/[0.08] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
              }`}
            >
              <Icon icon={option.icon} size={compact ? 12 : 14} />
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
