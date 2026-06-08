import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { Icon } from './Icon';
import type { SearchHistoryEntry } from '../hooks/useSearchHistory';

interface SearchFormProps {
  onSearch: (q: string, site: string) => void;
  loading: boolean;
  compact?: boolean;
  history?: SearchHistoryEntry[];
}

const SITES = [
  { key: 'kabum', nome: 'KaBuM!', color: 'text-orange-400', activeBg: 'bg-orange-600/20', activeBorder: 'border-orange-500/30' },
  { key: 'terabyteshop', nome: 'Terabyte', color: 'text-emerald-400', activeBg: 'bg-emerald-600/20', activeBorder: 'border-emerald-500/30' },
  { key: 'pichau', nome: 'Pichau', color: 'text-red-400', activeBg: 'bg-red-600/20', activeBorder: 'border-red-500/30' },
];

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

const EXAMPLE_SUGGESTIONS = [
  'RTX 4060',
  'Ryzen 7 5700X',
  'SSD NVMe 1TB',
  'Monitor 144Hz',
  'Fonte 650W',
  'Placa mãe B550',
];

const MAX_SUGGESTIONS = 6;

interface SearchSuggestion {
  termo: string;
  site?: string;
  siteNome?: string;
  source: 'history' | 'example';
}

function normalizeTerm(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

export function SearchForm({ onSearch, loading, compact, history = [] }: SearchFormProps) {
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const [q, setQ] = useState('');
  const [site, setSite] = useState('kabum');
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const query = normalizeTerm(q);
    const seen = new Set<string>();
    const seenTerms = new Set<string>();
    const entries: SearchSuggestion[] = [];

    for (const entry of history) {
      const termKey = normalizeTerm(entry.termo);
      const uniqueKey = `${termKey}|${entry.site}`;
      if (!termKey || seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      seenTerms.add(termKey);
      entries.push({ ...entry, source: 'history' });
    }

    for (const termo of EXAMPLE_SUGGESTIONS) {
      const termKey = normalizeTerm(termo);
      if (seenTerms.has(termKey)) continue;
      seenTerms.add(termKey);
      entries.push({ termo, source: 'example' });
    }

    return entries
      .filter(s => !query || normalizeTerm(s.termo).includes(query))
      .slice(0, MAX_SUGGESTIONS);
  }, [history, q]);

  const showSuggestions = open && suggestions.length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    onSearch(q.trim(), site);
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    const nextSite = suggestion.site ?? site;
    setQ(suggestion.termo);
    setSite(nextSite);
    setOpen(false);
    setActiveIndex(-1);
    onSearch(suggestion.termo, nextSite);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex(prev => (prev + 1) % suggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  }

  const inputClasses = compact
    ? 'py-2.5 pl-11 pr-44 text-sm'
    : 'py-4 pl-12 pr-56 text-base max-sm:pr-4';

  const btnClasses = compact
    ? 'px-3 py-1.5 text-[11px] max-[420px]:px-2 max-[420px]:text-[10px]'
    : 'px-6 py-3 text-sm max-sm:static max-sm:w-full max-sm:justify-center';

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`relative flex ${compact ? 'items-center' : 'items-center max-sm:flex-col max-sm:items-stretch max-sm:gap-2'}`}>
        <span className="absolute left-4 text-slate-500 pointer-events-none z-10">
          <Icon icon={Search} size={20} strokeWidth={2.5} />
        </span>
        <input
          id={inputId}
          type="text"
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ex: RTX 4060, Ryzen 7 5700X, SSD NVMe 1TB"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className={`w-full bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none transition-colors ${inputClasses}`}
          style={{
            borderColor: focused ? 'rgba(249, 115, 22, 0.65)' : '#1e293b',
            boxShadow: focused
              ? '0 0 0 3px rgba(249, 115, 22, 0.14)'
            : '0 1px 2px rgba(0,0,0,0.18)',
          }}
        />
        {showSuggestions && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
          >
            {suggestions.map((suggestion, index) => {
              const suggestionSite = suggestion.site ?? site;
              const c = SITE_COLORS[suggestionSite] ?? SITE_COLORS.kabum;
              return (
                <button
                  id={`${listboxId}-${index}`}
                  key={`${suggestion.termo}-${suggestion.site ?? 'example'}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    activeIndex === index
                      ? 'bg-orange-500/12 text-white'
                      : 'text-slate-200 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">{suggestion.termo}</span>
                  <span className="grid w-32 flex-shrink-0 grid-cols-[1fr_4.75rem] items-center gap-1.5 self-center">
                    <span className="inline-flex h-5 items-center justify-end text-[10px] font-medium leading-none text-slate-500">
                      {suggestion.source === 'history' ? 'recente' : ''}
                    </span>
                    <span
                      className="inline-flex h-5 min-w-0 items-center justify-center truncate rounded-full px-1.5 text-[10px] font-medium leading-none"
                      style={{ color: c.text, background: c.bg }}
                    >
                      {SITE_BADGES[suggestionSite] || suggestion.siteNome || suggestionSite}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`absolute right-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${btnClasses}`}
        >
          {loading ? 'Comparando...' : 'Comparar precos agora'}
        </button>
      </div>

      <div className="flex items-center justify-center mt-2.5">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {SITES.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSite(s.key)}
              aria-pressed={site === s.key}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors active:scale-95 ${
                site === s.key
                  ? `${s.activeBg} ${s.color} border ${s.activeBorder}`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {s.nome}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
