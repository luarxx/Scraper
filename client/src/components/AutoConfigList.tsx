import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { X, Plus, AlertCircle, Check, GripVertical } from 'lucide-react';
import type { Site, AutoConfigEntry } from '../types';
import { Icon } from './Icon';

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

interface DragPreview {
  sourceId: number;
  sourceIndex: number;
  targetIndex: number;
  pointerY: number;
  grabOffsetY: number;
  itemHeight: number;
  itemWidth: number;
  itemLeft: number;
}

let nextTempId = Date.now();

export function AutoConfigList({ sites, configs, onSave, saving, loading }: AutoConfigListProps) {
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const initialized = useRef(false);
  const newEntryRef = useRef<HTMLInputElement>(null);
  const draggingIdRef = useRef<number | null>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);

  // Sync from server configs
  useEffect(() => {
    if (!initialized.current || !dirty) {
      setEntries(configs.map((c) => ({ tempId: c.id, termo: c.termo, site: c.site, savedId: c.id })));
      initialized.current = true;
    }
  }, [configs, dirty]);

  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  useEffect(() => {
    if (!draggingId) return undefined;

    function handleWindowPointerMove(event: globalThis.PointerEvent) {
      const sourceId = draggingIdRef.current;
      if (!sourceId) return;
      event.preventDefault();
      const targetIndex = getPointerTargetIndex(event.clientY, sourceId);
      setDragPreview((prev) => (prev ? { ...prev, pointerY: event.clientY, targetIndex } : prev));
    }

    function handleWindowPointerUp() {
      const preview = dragPreviewRef.current;
      if (preview && preview.targetIndex !== preview.sourceIndex) {
        moveEntryToIndex(preview.sourceId, preview.targetIndex);
      }
      draggingIdRef.current = null;
      setDraggingId(null);
      setDragPreview(null);
    }

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [draggingId]);

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

  function moveEntryToIndex(sourceId: number, targetIndex: number) {
    setEntries((prev) => {
      const sourceIndex = prev.findIndex((e) => e.tempId === sourceId);
      if (sourceIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      const safeIndex = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(safeIndex, 0, moved);
      return next;
    });
    setDirty(true);
  }

  function moveEntry(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    setEntries((prev) => {
      const sourceIndex = prev.findIndex((e) => e.tempId === sourceId);
      const targetIndex = prev.findIndex((e) => e.tempId === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDirty(true);
  }

  function getPointerTargetIndex(clientY: number, sourceId: number) {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-config-entry]'))
      .filter((row) => Number(row.dataset.configEntry) !== sourceId);
    let nextIndex = rows.length;
    rows.some((row, index) => {
      const rect = row.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        nextIndex = index;
        return true;
      }
      return false;
    });
    return nextIndex;
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, tempId: number) {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest<HTMLElement>('[data-config-entry]');
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const sourceIndex = entries.findIndex((entry) => entry.tempId === tempId);
    if (sourceIndex === -1) return;
    draggingIdRef.current = tempId;
    setDraggingId(tempId);
    setDragPreview({
      sourceId: tempId,
      sourceIndex,
      targetIndex: sourceIndex,
      pointerY: event.clientY,
      grabOffsetY: event.clientY - rect.top,
      itemHeight: rect.height,
      itemWidth: rect.width,
      itemLeft: rect.left,
    });
    event.preventDefault();
  }

  function handlePointerCancel() {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragPreview(null);
  }

  function handleHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tempId: number, index: number) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const targetIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
    const target = entries[targetIndex];
    if (target) moveEntry(tempId, target.tempId);
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

  const activeDragEntry = dragPreview ? entries.find((entry) => entry.tempId === dragPreview.sourceId) : null;
  const visibleEntries = activeDragEntry ? entries.filter((entry) => entry.tempId !== activeDragEntry.tempId) : entries;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-text-primary">
          Produtos monitorados
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted tabular-nums">{entries.length}/10</span>
          {dirty && (
            <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
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
          <p className="text-sm text-text-secondary mb-2 font-semibold">Nenhum produto configurado</p>
          <p className="text-xs text-text-muted/60 mb-5 max-w-xs mx-auto leading-relaxed">
            Adicione até 10 produtos para busca automática a cada 6 horas
          </p>
          <button
            onClick={addEntry}
            className="text-sm px-5 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors font-semibold"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Plus} size={16} />
              Adicionar primeiro produto
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleEntries.map((entry, idx) => {
            const isDragging = draggingId === entry.tempId;
            const showDropSlot = dragPreview?.targetIndex === idx;
            const displayIndex = dragPreview && dragPreview.targetIndex <= idx ? idx + 2 : idx + 1;
            return (
              <div key={entry.tempId} className="space-y-2">
                {showDropSlot && (
                  <div
                    className="rounded-xl border border-accent/50 bg-accent/10 transition-all duration-150"
                    style={{ height: dragPreview.itemHeight }}
                    aria-hidden="true"
                  />
                )}
                <div
                  data-config-entry={entry.tempId}
                  className={`flex items-center gap-2.5 p-3 rounded-xl bg-surface/40 border transition-colors duration-200 group ${
                    isDragging
                      ? 'border-accent/45 opacity-60'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => handlePointerDown(event, entry.tempId)}
                    onPointerCancel={handlePointerCancel}
                    onKeyDown={(event) => handleHandleKeyDown(event, entry.tempId, idx)}
                    aria-label={`Reordenar ${entry.termo || `produto ${displayIndex}`}`}
                    className="shrink-0 w-6 h-7 flex items-center justify-center rounded-md text-text-muted/35 hover:text-text-secondary focus:text-text-secondary active:cursor-grabbing cursor-grab transition-colors touch-none"
                    title="Arrastar para reordenar"
                  >
                    <Icon icon={GripVertical} size={15} />
                  </button>

                  {/* Number */}
                  <span className="text-[11px] text-text-muted w-4 shrink-0 font-mono tabular-nums">{displayIndex}</span>

                  {/* Termo input */}
                  <input
                    ref={idx === visibleEntries.length - 1 ? newEntryRef : undefined}
                    data-config-term
                    type="text"
                    value={entry.termo}
                    onChange={(e) => updateEntry(entry.tempId, 'termo', e.target.value)}
                    placeholder="Ex: RTX 4070"
                    className="flex-1 min-w-0 bg-transparent border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors font-ui"
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
                          aria-pressed={isActive}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors duration-200 ${
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
                    aria-label={`Remover ${entry.termo || `produto ${displayIndex}`}`}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remover"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {dragPreview && dragPreview.targetIndex === visibleEntries.length && (
            <div
              className="rounded-xl border border-accent/50 bg-accent/10 transition-all duration-150"
              style={{ height: dragPreview.itemHeight }}
              aria-hidden="true"
            />
          )}
          {dragPreview && activeDragEntry && (
            <div
              className="fixed z-50 flex items-center gap-2.5 p-3 rounded-xl bg-surface-alt border border-accent/70 shadow-[0_10px_30px_rgba(0,0,0,0.35)] pointer-events-none"
              style={{
                left: dragPreview.itemLeft,
                top: dragPreview.pointerY - dragPreview.grabOffsetY,
                width: dragPreview.itemWidth,
                height: dragPreview.itemHeight,
              }}
              aria-hidden="true"
            >
              <div className="shrink-0 w-6 h-7 flex items-center justify-center rounded-md text-text-secondary">
                <Icon icon={GripVertical} size={15} />
              </div>
              <span className="text-[11px] text-text-muted w-4 shrink-0 font-mono tabular-nums">{dragPreview.targetIndex + 1}</span>
              <div className="flex-1 min-w-0 border border-accent/30 rounded-lg px-3 py-2 text-sm text-text-primary font-ui truncate">
                {activeDragEntry.termo || 'Novo produto'}
              </div>
              <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                {sites.map((site) => {
                  const cfg = SITE_CONFIG[site.key] || SITE_CONFIG.kabum;
                  const isActive = activeDragEntry.site === site.key;
                  return (
                    <span
                      key={site.key}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold ${
                        isActive ? '' : 'text-text-muted/60'
                      }`}
                      style={isActive ? { color: cfg.text, backgroundColor: cfg.bg } : undefined}
                    >
                      {site.nome}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {entries.length < 10 && (
              <button
                onClick={addEntry}
                className="text-sm px-4 py-2 rounded-lg border border-dashed border-white/[0.12] text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-accent/5 transition-colors font-medium flex items-center gap-1.5"
              >
                <Icon icon={Plus} size={16} />
                Adicionar
              </button>
            )}
            {entries.length >= 10 && (
              <span className="text-xs text-text-muted/60 flex items-center gap-1.5">
                <Icon icon={AlertCircle} size={14} />
                Limite máximo de 10 produtos
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-400">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="text-sm px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
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
                  <Icon icon={Check} size={16} strokeWidth={2.5} />
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
