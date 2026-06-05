import { useEffect, useRef, useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { useSearch } from './hooks/useSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { SearchForm } from './components/SearchForm';
import { SearchHistory } from './components/SearchHistory';
import { ProductGrid } from './components/ProductGrid';
import { StateMessage } from './components/StateMessage';
import { AutoSearchPanel } from './components/AutoSearchPanel';
import { Icon } from './components/Icon';

function formatDate(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SITE_COLORS: Record<string, { text: string }> = {
  kabum: { text: '#f97316' },
  pichau: { text: '#ef4444' },
  terabyteshop: { text: '#34d399' },
};

export default function App() {
  const { loading, produtos, termo, siteKey, siteNome, timestamp, erro, search, fetchSites, sites } = useSearch();
  const [modo, setModo] = useState<'manual' | 'auto'>('manual');

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const { history, addEntry } = useSearchHistory();
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (termo && produtos.length > 0 && siteKey && siteKey !== prevKeyRef.current + termo) {
      addEntry(termo, siteKey, siteNome);
      prevKeyRef.current = siteKey + termo;
    }
  }, [termo, produtos, siteKey, siteNome, addEntry]);

  function handleHistorySelect(t: string, s: string) {
    search(t, s);
  }

  const state = (() => {
    if (loading) return 'loading';
    if (erro) return 'error';
    if (termo && produtos.length === 0) return 'empty';
    if (termo && produtos.length > 0) return 'results';
    return 'initial';
  })() as 'initial' | 'loading' | 'results' | 'empty' | 'error';

  const isResults = state === 'results';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          {/* Mode toggle */}
          <div className="flex items-center justify-center sm:justify-start gap-1 mb-2">
            <button
              onClick={() => setModo('manual')}
              aria-pressed={modo === 'manual'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                modo === 'manual'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`}
            >
              <Icon icon={Search} size={14} /> <span>Manual</span>
            </button>
            <button
              onClick={() => setModo('auto')}
              aria-pressed={modo === 'auto'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                modo === 'auto'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              }`}
            >
              <Icon icon={Clock} size={14} /> <span>Automática</span>
            </button>
          </div>
          {modo === 'manual' && (
            <>
              <SearchForm onSearch={search} loading={loading} compact />
              {termo && timestamp && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 animate-[fadeIn_0.3s_ease-out]">
                  <span className="text-[11px] text-text-muted font-medium">
                    Última busca
                  </span>
                  <span className="w-1 h-1 rounded-full bg-accent/40" />
                  <time className="text-[11px] text-text-secondary font-medium tabular-nums">
                    {formatDate(timestamp)}
                  </time>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {modo === 'auto' ? (
        <main className="flex-1">
          <AutoSearchPanel sites={sites} />
        </main>
      ) : (
        <>
          <SearchHistory history={history} onSelect={handleHistorySelect} />

          {isResults ? (
            <main className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-20 sm:pb-24">
                <div className="mb-6">
                  <span className="font-sans text-base sm:text-lg font-semibold text-text-primary">
                    Resultados para{' '}
                    <span style={{ color: (SITE_COLORS[siteKey] ?? SITE_COLORS.kabum).text }}>
                      &ldquo;{termo}&rdquo;
                    </span>
                  </span>
                </div>
                <ProductGrid produtos={produtos} siteKey={siteKey} />
                <footer className="mt-14 text-center animate-[fadeIn_0.6s_ease-out_0.3s_both]">
                  <div className="w-6 h-px bg-white/[0.06] mx-auto mb-4" />
                  <p className="text-xs text-text-muted">
                    Dados obtidos via scraper ·{' '}
                    <time className="text-text-secondary">{formatDate(timestamp)}</time>
                  </p>
                </footer>
              </div>
            </main>
          ) : (
            <main className="flex-1 flex items-center justify-center px-6">
              <div className="w-full max-w-md">
                <StateMessage type={state as 'initial' | 'loading' | 'empty' | 'error'} siteColor={(SITE_COLORS[siteKey] ?? SITE_COLORS.kabum).text} />
              </div>
            </main>
          )}
        </>
      )}
    </div>
  );
}
