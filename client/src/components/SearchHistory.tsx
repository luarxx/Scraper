import type { SearchHistoryEntry } from '../hooks/useSearchHistory';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSelect: (termo: string, site: string) => void;
}

const SITE_BADGES: Record<string, string> = {
  kabum: 'KaBuM!',
  terabyteshop: 'TerabyteShop',
  pichau: 'Pichau',
};

const SITE_COLORS: Record<string, { text: string; bg: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  terabyteshop: { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
};

export function SearchHistory({ history, onSelect }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-1">
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <span className="text-[11px] font-medium text-text-muted tracking-wide uppercase mr-0.5">
          Últimas buscas
        </span>
        {history.map((entry, i) => {
          const c = SITE_COLORS[entry.site] ?? SITE_COLORS.kabum;
          return (
            <button
              key={`${entry.termo}-${entry.site}-${i}`}
              type="button"
              onClick={() => onSelect(entry.termo, entry.site)}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-[var(--site-bg)] hover:border-[var(--site-border)] transition-all duration-200 cursor-pointer"
              style={{
                '--site-bg': c.bg,
                '--site-border': `${c.text}4D`,
              } as React.CSSProperties}
            >
              <span
                className="w-1 h-1 rounded-full transition-all duration-200 flex-shrink-0 opacity-60 group-hover:opacity-100"
                style={{ background: c.text }}
              />
              <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors duration-200 truncate max-w-[120px]">
                &ldquo;{entry.termo}&rdquo;
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors duration-200"
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
