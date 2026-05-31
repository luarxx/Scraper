import { useState, type FormEvent } from 'react';

interface SearchFormProps {
  onSearch: (q: string, site: string) => void;
  loading: boolean;
  compact?: boolean;
}

const SITES = [
  { key: 'kabum', nome: 'KaBuM!', color: 'text-orange-400', activeBg: 'bg-orange-600/20', activeBorder: 'border-orange-500/30' },
  { key: 'terabyteshop', nome: 'Terabyte', color: 'text-emerald-400', activeBg: 'bg-emerald-600/20', activeBorder: 'border-emerald-500/30' },
  { key: 'pichau', nome: 'Pichau', color: 'text-red-400', activeBg: 'bg-red-600/20', activeBorder: 'border-red-500/30' },
];

export function SearchForm({ onSearch, loading, compact }: SearchFormProps) {
  const [q, setQ] = useState('');
  const [site, setSite] = useState('kabum');
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    onSearch(q.trim(), site);
  }

  const inputClasses = compact
    ? 'py-2.5 pl-11 pr-28 text-sm'
    : 'py-4 pl-12 pr-32 text-base';

  const btnClasses = compact
    ? 'px-4 py-1.5 text-xs'
    : 'px-6 py-3 text-sm';

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <svg className="absolute left-4 w-5 h-5 text-slate-500 pointer-events-none z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ex: Ryzen 5 5600gt, RTX 4060..."
          className={`w-full bg-slate-900 border-2 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none shadow-2xl transition-all ${inputClasses}`}
          style={{
            borderColor: focused ? 'rgba(249, 115, 22, 0.5)' : '#1e293b',
            boxShadow: focused
              ? '0 0 0 4px rgba(249, 115, 22, 0.2), 0 25px 50px -12px rgba(0,0,0,0.25)'
              : '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className={`absolute right-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 whitespace-nowrap ${btnClasses}`}
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      <div className="flex items-center justify-center mt-2.5">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {SITES.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSite(s.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out active:scale-95 ${
                site === s.key
                  ? `${s.activeBg} ${s.color} border ${s.activeBorder} shadow-sm`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
              style={{
                animation: site === s.key ? 'tabActivate 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              }}
            >
              {s.nome}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
