import { useState, useEffect, useRef, useCallback } from 'react';
import type { Site, AutoConfigEntry } from '../types';

const SITE_CONFIG: Record<string, { text: string; bg: string; label: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'KaBuM!' },
  pichau: { text: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Pichau' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Terabyte' },
};

interface AutoConfigListProps {
  sites: Site[];
  configs: AutoConfigEntry[];
  onSave: (entries: { termo: string; site: string }[]) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  saving: boolean;
  loading: boolean;
}

interface LocalEntry {
  tempId: number;
  termo: string;
  site: string;
  savedId?: number;
}

let nextTempId = Date.now();

export function AutoConfigList({ sites, configs, onSave, saving, loading }: AutoConfigListProps) {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const newEntryRef = useRef<HTMLInputElement>(null);

  // Sync from server configs
  useEffect(() => {
    if (!initialized.current || !dirty) {
      setEntries(configs.map((c) => ({ tempId: c.id, termo: c.termo, site: c.site, savedId: c.id })));
      initialized.current = true;
    }
  }, [configs, dirty]);

  const addEntry = useCallback(() => {
    if (entries.length >= 10) return;
    const newId = nextTempId++;
    setEntries((prev) => [...prev, { tempId: newId, termo: '', site: sites[0]?.key || 'kabum' }]);
    setDirty(true);
    // Focus the new entry after render
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-config-term]');
      const last = inputs[inputs.length - 1];
      last?.focus();
    }, 50);
  }, [entries.length, sites]);

  function updateEntry(tempId: number, field: 'termo' | 'site', value: string) {
    setEntries((prev) => prev.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e)));
    setDirty(true);
  }

  function removeEntry(tempId: number) {
    setEntries((prev) => prev.filter((e) => e.tempId !== tempId));
    setDirty(true);
  }

  async function handleSave() {
    const valid = entries.filter((e) => e.termo.trim().length > 0 && sites.some((s) => s.key === e.site));
    if (valid.length === 0) {
      setError('Adicione pelo menos um produto com termo de busca válido');
      return;
    }
    if (valid.length > 10) {
      setError('Máximo de 10 produtos');
      return;
    }
    setError(null);
    await onSave(valid.map((e) => ({ termo: e.termo.trim(), site: e.site })));
    setDirty(false);
    initialized.current = false;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <div className="absolute inset-2 rounded-full border border-accent/10 border-b-accent/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-display font-bold text-text-primary uppercase tracking-wider">
          Produtos monitorados
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted tabular-nums">{entries.length}/10</span>
          {dirty && (
            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              Não salvo
            </span>
          )}
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-14 rounded-xl bg-surface/30 border border-dashed border-white/[0.08]">
          <div className="mb-4 flex justify-center">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-40">
              <rect x="12" y="20" width="40" height="28" rx="4" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <path d="M22 20V16a4 4 0 014-4h12a4 4 0 014 4v4" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <path d="M28 34l3 3 5-6" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="48" cy="44" r="8" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <path d="M48 40v4l2.5 2.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-text-muted mb-2 font-display font-semibold">Nenhum produto configurado</p>
          <p className="text-xs text-text-muted/60 mb-5 max-w-xs mx-auto leading-relaxed">
            Adicione até 10 produtos para busca automática a cada 6 horas
          </p>
          <button
            onClick={addEntry}
            className="text-sm px-5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all font-semibold shadow-lg shadow-accent/15"
          >
            + Adicionar primeiro produto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            return (
              <div
                key={entry.tempId}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-surface/40 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Drag handle visual */}
                <div className="shrink-0 flex flex-col gap-0.5 opacity-20 group-hover:opacity-50 transition-opacity cursor-grab">
                  <span className="block w-3 h-px bg-text-muted" />
                  <span className="block w-3 h-px bg-text-muted" />
                  <span className="block w-3 h-px bg-text-muted" />
                </div>

                {/* Number */}
                <span className="text-[11px] text-text-muted w-4 shrink-0 font-mono tabular-nums">{idx + 1}</span>

                {/* Termo input */}
                <input
                  ref={idx === entries.length - 1 ? newEntryRef : undefined}
                  data-config-term
                  type="text"
                  value={entry.termo}
                  onChange={(e) => updateEntry(entry.tempId, 'termo', e.target.value)}
                  placeholder="Ex: RTX 4070"
                  className="flex-1 min-w-0 bg-transparent border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-ui"
                />

                {/* Site selector — button group */}
                <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  {sites.map((site) => {
                    const cfg = SITE_CONFIG[site.key] || SITE_CONFIG.kabum;
                    const isActive = entry.site === site.key;
                    return (
                      <button
                        key={site.key}
                        type="button"
                        onClick={() => updateEntry(entry.tempId, 'site', site.key)}
                        className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                          isActive
                            ? 'shadow-sm'
                            : 'text-text-muted/60 hover:text-text-secondary'
                        }`}
                        style={
                          isActive
                            ? { color: cfg.text, backgroundColor: cfg.bg }
                            : undefined
                        }
                      >
                        {site.nome}
                      </button>
                    );
                  })}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeEntry(entry.tempId)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Remover"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {entries.length < 10 && (
              <button
                onClick={addEntry}
                className="text-sm px-4 py-2 rounded-xl border border-dashed border-white/[0.12] text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-accent/5 transition-all font-medium flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Adicionar
              </button>
            )}
            {entries.length >= 10 && (
              <span className="text-xs text-text-muted/60 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Limite máximo de 10 produtos
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-400">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="text-sm px-5 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-accent/15"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando
                </span>
              ) : dirty ? (
                'Salvar configuração'
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Salvo
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
