import { useState, useRef, useEffect, type FormEvent } from 'react';

interface SearchFormProps {
  onSearch: (q: string, site: string) => void;
  loading: boolean;
  compact?: boolean;
}

const SITES = [
  { key: 'kabum', nome: 'KaBuM!' },
  { key: 'terabyteshop', nome: 'TerabyteShop' },
  { key: 'pichau', nome: 'Pichau' },
];

export function SearchForm({ onSearch, loading, compact }: SearchFormProps) {
  const [q, setQ] = useState('');
  const [site, setSite] = useState('kabum');
  const [focused, setFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    onSearch(q.trim(), site);
  }

  const height = compact ? 'h-9' : 'h-12';
  const textSize = compact ? 'text-xs' : 'text-sm';
  const inputPadding = compact ? 'px-4' : 'px-5';
  const selectedNome = SITES.find(s => s.key === site)?.nome || site;

  return (
    <form onSubmit={handleSubmit} className={`flex ${compact ? 'flex-row items-center' : 'flex-col sm:flex-row'} gap-2 w-full`}>
      <div className={`flex-1 relative ${compact ? 'min-w-[160px]' : ''}`}>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Buscar produto..."
          className={`w-full ${height} ${inputPadding} bg-white/[0.04] border rounded-lg ${textSize} text-text-primary placeholder:text-text-muted outline-none transition-all duration-300 ${focused ? 'border-accent' : 'border-white/[0.08]'}`}
          style={{
            boxShadow: focused ? '0 0 0 3px rgba(249, 115, 22, 0.15), 0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(8px)',
          }}
        />
      </div>
      <div className={`flex ${compact ? 'flex-row' : ''} gap-2`}>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`${height} px-3 bg-white/[0.04] border rounded-lg ${textSize} text-text-secondary outline-none transition-all duration-200 cursor-pointer min-w-[130px] appearance-none hover:border-white/[0.25] flex items-center justify-between gap-2 w-full ${dropdownOpen ? 'border-accent' : 'border-white/[0.08]'}`}
            style={{
              backdropFilter: 'blur(8px)',
              boxShadow: dropdownOpen ? '0 0 0 3px rgba(249, 115, 22, 0.15), 0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            <span>{selectedNome}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted transition-transform duration-200"
              style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 bg-surface/95 backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden z-30 animate-[fadeIn_0.15s_ease-out]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {SITES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => { setSite(s.key); setDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left ${textSize} transition-colors duration-150 ${
                    s.key === site
                      ? 'text-accent bg-accent-subtle'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  {s.nome}
                  {s.key === site && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`${height} px-5 bg-gradient-to-r from-accent to-orange-500 text-white font-medium ${textSize} rounded-lg hover:from-orange-500 hover:to-orange-400 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap tracking-wide shadow-lg shadow-orange-500/20`}
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
    </form>
  );
}
