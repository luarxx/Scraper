import { useEffect, useRef } from 'react';
import { useSearch } from './hooks/useSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { SearchForm } from './components/SearchForm';
import { SearchHistory } from './components/SearchHistory';
import { ProductGrid } from './components/ProductGrid';
import { StateMessage } from './components/StateMessage';

const SITE_COLORS: Record<string, { text: string; bg: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  terabyteshop: { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
};

function formatDate(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function App() {
  const { loading, produtos, termo, siteKey, siteNome, timestamp, erro, total, search, fetchSites } = useSearch();

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
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center shadow-sm">
              <span className="text-[9px] font-bold text-white">M</span>
            </div>
            <span className="font-display text-sm font-semibold text-text-primary tracking-tight">
              Meu Buscador
            </span>
          </div>

          <div className="flex-1 max-w-lg">
            <SearchForm onSearch={search} loading={loading} compact />
          </div>

          {isResults && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary flex-shrink-0">
              <span
                className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md"
                style={{
                  color: SITE_COLORS[siteKey]?.text ?? 'var(--color-accent)',
                  background: SITE_COLORS[siteKey]?.bg ?? 'var(--color-accent-subtle)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: SITE_COLORS[siteKey]?.text ?? 'var(--color-accent)' }}
                />
                {siteNome}
              </span>
              <span className="text-text-muted">·</span>
              <span className="font-medium text-text-secondary">
                {total}
              </span>
            </div>
          )}
        </div>
      </header>

      <SearchHistory history={history} onSelect={handleHistorySelect} />

      {isResults ? (
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 pt-8 pb-24">
            <div className="mb-6">
              <span className="font-display text-sm text-text-primary truncate max-w-[100px]">
                &ldquo;{termo}&rdquo;
              </span>
            </div>
            <ProductGrid produtos={produtos} termo={termo} siteKey={siteKey} />
            <footer className="mt-14 text-center animate-[fadeIn_0.6s_ease-out_0.3s_both]">
              <div className="w-6 h-px bg-white/[0.06] mx-auto mb-4" />
              <p className="text-xs text-text-muted font-body">
                Dados obtidos via scraper ·{' '}
                <time className="text-text-secondary">{formatDate(timestamp)}</time>
              </p>
            </footer>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <StateMessage type={state as 'initial' | 'loading' | 'empty' | 'error'} />
          </div>
        </main>
      )}
    </div>
  );
}
