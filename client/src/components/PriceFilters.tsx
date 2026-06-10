import { SlidersHorizontal, X } from 'lucide-react';
import { Icon } from './Icon';

interface PriceFiltersProps {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onClear: () => void;
  totalCount?: number;
  filteredCount?: number;
}

export function PriceFilters({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onClear,
  totalCount,
  filteredCount,
}: PriceFiltersProps) {
  const hasFilter = minPrice.trim().length > 0 || maxPrice.trim().length > 0;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-surface/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <Icon icon={SlidersHorizontal} size={14} />
          <span className="text-xs font-semibold">Preço</span>
        </div>
        {typeof totalCount === 'number' && typeof filteredCount === 'number' && totalCount > 0 && (
          <span className="text-[11px] font-medium text-text-muted tabular-nums">
            {filteredCount} de {totalCount}
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-text-muted">Mínimo</span>
          <input
            type="text"
            inputMode="decimal"
            value={minPrice}
            onChange={(event) => onMinPriceChange(event.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-text-muted">Máximo</span>
          <input
            type="text"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => onMaxPriceChange(event.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onClear}
            disabled={!hasFilter}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon icon={X} size={14} />
            Limpar
          </button>
        </div>
      </div>
    </section>
  );
}
