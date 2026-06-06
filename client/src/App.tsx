import { useEffect, useRef, useState } from 'react';
import { Search, Clock, Bell } from 'lucide-react';
import { useSearch } from './hooks/useSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { SearchForm } from './components/SearchForm';
import { SearchHistory } from './components/SearchHistory';
import { ProductGrid } from './components/ProductGrid';
import { StateMessage } from './components/StateMessage';
import { AutoSearchPanel } from './components/AutoSearchPanel';
import { WatchPanel } from './components/WatchPanel';
import { Icon } from './components/Icon';
import { Logo } from './components/Logo';
import type { Produto, WatchDraft } from './types';
import { formatBrazilDateTime } from './utils/date';

const SITE_COLORS: Record<string, { text: string }> = {
  kabum: { text: '#f97316' },
  pichau: { text: '#ef4444' },
  terabyteshop: { text: '#34d399' },
};

function priceToInput(price: string | null): string {
  if (!price) return '';
  return price.replace(/R\$\s*/i, '').trim();
}

export default function App() {
  const { loading, produtos, termo, siteKey, siteNome, timestamp, erro, search, fetchSites, sites } = useSearch();
  const [modo, setModo] = useState<'manual' | 'auto' | 'watch'>('manual');
  const [watchDraft, setWatchDraft] = useState<WatchDraft | null>(null);

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

  function handleCreateAlert(produto: Produto, productSiteKey: string) {
    setWatchDraft({
      nome: produto.title,
      url: produto.url,
      site: productSiteKey,
      preco_alvo: priceToInput(produto.price),
      ultimo_preco: produto.price,
      ultimo_parcelamento: produto.parcelamento,
      skipPreview: true,
    });
    setModo('watch');
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex justify-center sm:justify-start">
              <Logo />
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-1">
              <button
                onClick={() => setModo('manual')}
                aria-pressed={modo === 'manual'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  modo === 'manual'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <Icon icon={Search} size={14} /> <span>Buscar</span>
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
                <Icon icon={Clock} size={14} /> <span>Buscas salvas</span>
              </button>
              <button
                onClick={() => setModo('watch')}
                aria-pressed={modo === 'watch'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  modo === 'watch'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <Icon icon={Bell} size={14} /> <span>Alertas</span>
              </button>
            </div>
          </div>
          {modo === 'manual' && state !== 'initial' && (
            <SearchForm onSearch={search} loading={loading} compact />
          )}
        </div>
      </header>

      {modo === 'auto' ? (
        <main className="flex-1">
          <AutoSearchPanel sites={sites} onCreateAlert={handleCreateAlert} />
        </main>
      ) : modo === 'watch' ? (
        <main className="flex-1">
          <WatchPanel
            sites={sites}
            draft={watchDraft}
            onDraftConsumed={() => setWatchDraft(null)}
          />
        </main>
      ) : (
        <>
          {isResults ? (
            <main className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-20 sm:pb-24">
                <div className="mb-6">
                  <span className="font-sans text-base sm:text-lg font-semibold text-text-primary">
                    Ofertas encontradas para{' '}
                    <span style={{ color: (SITE_COLORS[siteKey] ?? SITE_COLORS.kabum).text }}>
                      &ldquo;{termo}&rdquo;
                    </span>
                  </span>
                  {timestamp && (
                    <div className="flex items-center gap-1.5 mt-2 animate-[fadeIn_0.3s_ease-out]">
                      <span className="text-[11px] text-text-muted font-medium">
                        Ultima atualizacao
                      </span>
                      <span className="w-1 h-1 rounded-full bg-accent/40" />
                      <time className="text-[11px] text-text-secondary font-medium tabular-nums">
                        {formatBrazilDateTime(timestamp)}
                      </time>
                    </div>
                  )}
                  <p className="mt-3 max-w-2xl text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Precos coletados diretamente nas lojas consultadas. Os valores e a disponibilidade podem mudar no site da loja.
                  </p>
                  <div className="mt-4">
                    <SearchHistory history={history} onSelect={handleHistorySelect} compact />
                  </div>
                </div>
                <ProductGrid produtos={produtos} siteKey={siteKey} updatedAt={timestamp} onCreateAlert={handleCreateAlert} />
                <footer className="mt-14 text-center animate-[fadeIn_0.6s_ease-out_0.3s_both]">
                  <div className="w-6 h-px bg-white/[0.06] mx-auto mb-4" />
                  <p className="text-xs text-text-muted">
                    Precos coletados diretamente nas lojas. Confirme o valor final no checkout.{' '}
                    {timestamp && (
                      <>
                        <span className="text-white/[0.18]">·</span>{' '}
                        <span className="text-text-secondary">Ultima atualizacao: </span>
                        <time className="text-text-secondary tabular-nums">{formatBrazilDateTime(timestamp)}</time>
                      </>
                    )}
                  </p>
                </footer>
              </div>
            </main>
          ) : (
            <main className="flex-1 flex items-center justify-center px-6">
              <div className="w-full max-w-2xl">
                {state === 'initial' && (
                  <div className="mb-8 text-center animate-[fadeIn_0.6s_ease-out]">
                    <h1 className="font-sans text-2xl sm:text-4xl font-bold text-text-primary tracking-tight text-balance">
                      Compare precos de informatica sem abrir varias abas
                    </h1>
                    <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl mx-auto text-pretty">
                      Pesquise em lojas como KaBuM!, Pichau e Terabyte, veja preco, parcelamento e crie alertas quando o valor baixar.
                    </p>
                    <div className="mt-6 max-w-xl mx-auto">
                      <SearchForm onSearch={search} loading={loading} />
                    </div>
                    <div className="mt-4 max-w-xl mx-auto">
                      <SearchHistory history={history} onSelect={handleHistorySelect} compact align="center" />
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      Precos e disponibilidade podem mudar. Sempre confirme o valor final na loja.
                    </p>
                  </div>
                )}
                {state !== 'initial' && (
                  <StateMessage type={state as 'loading' | 'empty' | 'error'} siteColor={(SITE_COLORS[siteKey] ?? SITE_COLORS.kabum).text} />
                )}
              </div>
            </main>
          )}
        </>
      )}
    </div>
  );
}
