import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Icon } from './Icon';

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
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ex: RTX 4060, Ryzen 7 5700X, SSD NVMe 1TB"
          className={`w-full bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none transition-colors ${inputClasses}`}
          style={{
            borderColor: focused ? 'rgba(249, 115, 22, 0.65)' : '#1e293b',
            boxShadow: focused
              ? '0 0 0 3px rgba(249, 115, 22, 0.14)'
              : '0 1px 2px rgba(0,0,0,0.18)',
          }}
        />
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
