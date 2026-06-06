import type { SearchHistoryEntry } from '../hooks/useSearchHistory';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSelect: (termo: string, site: string) => void;
  compact?: boolean;
  align?: 'start' | 'center';
}

const SITE_BADGES: Record<string, string> = {
  kabum: 'KaBuM!',
  terabyteshop: 'Terabyte',
  pichau: 'Pichau',
};

const SITE_COLORS: Record<string, { text: string; bg: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
};

export function SearchHistory({ history, onSelect, compact, align = 'start' }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className={compact ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6'}>
      <div className={`flex flex-wrap items-center gap-1.5 ${align === 'center' ? 'justify-center' : ''}`}>
        <span className="text-[11px] font-medium text-text-muted mr-0.5">
          Últimas buscas
        </span>
        {history.map((entry, i) => {
          const c = SITE_COLORS[entry.site] ?? SITE_COLORS.kabum;
          return (
            <button
              key={`${entry.termo}-${entry.site}-${i}`}
              type="button"
              onClick={() => onSelect(entry.termo, entry.site)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-orange-500/40 rounded-lg text-slate-300 hover:text-white transition-colors font-medium text-xs active:translate-y-0 cursor-pointer flex items-center gap-1.5"
            >
              <span className="truncate max-w-[120px]">&ldquo;{entry.termo}&rdquo;</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ color: c.text, background: c.bg }}
              >
                {SITE_BADGES[entry.site] || entry.siteNome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
