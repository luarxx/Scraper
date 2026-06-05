import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { AlertTriangle, BadgeDollarSign, BarChart, Search, XCircle, Radio, Timer, CheckCircle, Loader2, Package, ThumbsUp, ChevronsUp, ChevronsDown, ChevronRight } from 'lucide-react';
import type { AutoExecucao, AutoResultadoItem, Produto } from '../types';
import { ProductGrid } from './ProductGrid';
import { Icon } from './Icon';
import { formatBrazilDateMonth, formatBrazilTime } from '../utils/date';

const SITE_COLORS: Record<string, { text: string; light: string; glow: string }> = {
  kabum: { text: '#f97316', light: 'rgba(249,115,22,0.08)', glow: 'rgba(249,115,22,0.15)' },
  pichau: { text: '#ef4444', light: 'rgba(239,68,68,0.08)', glow: 'rgba(239,68,68,0.15)' },
  terabyteshop: { text: '#34d399', light: 'rgba(52,211,153,0.08)', glow: 'rgba(52,211,153,0.15)' },
};

interface AutoResultsViewProps {
  execucao: AutoExecucao | null;
  resultados: AutoResultadoItem[];
  loading: boolean;
  running: boolean;
  onRefresh: () => void;
}

function parsePrice(price: string | null): number {
  if (!price) return Infinity;
  return parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'));
}

function formatBRL(reaisOrString: number | string | null): string {
  if (reaisOrString === null || reaisOrString === undefined) return '—';
  if (typeof reaisOrString === 'number') {
    return reaisOrString.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const num = parsePrice(reaisOrString);
  if (num === Infinity) return '—';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTermoStats(produtos: Produto[]): { minPrice: number; avgPrice: number } {
  const prices = produtos
    .map((p) => parsePrice(p.price))
    .filter((p) => p !== Infinity);
  if (prices.length === 0) return { minPrice: 0, avgPrice: 0 };
  return {
    minPrice: Math.min(...prices),
    avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}

/* ─── KPI Card Component ─────────────────────────────────── */
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  index: number;
  sub?: string;
}

const KpiCard = memo(function KpiCard({ icon, label, value, accent, index, sub }: KpiCardProps) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-0"
      style={{
        animation: `kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) ${Math.min(index, 4) * 0.06}s both`,
      }}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="block text-[11px] font-medium text-text-muted leading-tight">
          {label}
        </span>
        <span
          className="block text-sm font-bold tabular-nums truncate mt-0.5"
          style={{ color: accent }}
        >
          {value}
        </span>
        {sub && (
          <span className="block text-[10px] text-text-muted/60 leading-tight truncate">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
});

/* ─── Termo Section (memoized) ───────────────────────────── */
interface TermoSectionProps {
  resultado: AutoResultadoItem;
  isOpen: boolean;
  onToggle: (id: number) => void;
}

const TermoSection = memo(function TermoSection({ resultado: r, isOpen, onToggle }: TermoSectionProps) {
  const siteColor = SITE_COLORS[r.site] || SITE_COLORS.kabum;
  const stats = useMemo(
    () => (r.status === 'ok' ? getTermoStats(r.produtos) : null),
    [r.status, r.produtos]
  );

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isOpen ? `${siteColor.text}22` : 'rgba(255,255,255,0.06)',
        background: isOpen
          ? `linear-gradient(135deg, ${siteColor.light}, transparent 70%), var(--color-surface)`
          : 'var(--color-surface)',
        boxShadow: isOpen ? `0 0 0 1px ${siteColor.glow}` : 'none',
        transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 72px',
      }}
    >
      <button
        onClick={() => onToggle(r.id)}
        className="flex items-center justify-between w-full px-4 py-3 text-left group"
        style={{
          borderBottom: isOpen ? `1px solid ${siteColor.text}18` : '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.3s',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200"
            style={{
              background: isOpen ? `${siteColor.text}15` : 'transparent',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <Icon
              icon={ChevronRight}
              size={14}
              strokeWidth={2.5}
              className="transition-colors"
              style={{ color: isOpen ? siteColor.text : '#64748b' }}
            />
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-sm sm:text-base font-semibold truncate"
              style={{ color: siteColor.text }}
            >
              {r.termo}
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 border"
              style={{
                color: siteColor.text,
                backgroundColor: `${siteColor.text}12`,
                borderColor: `${siteColor.text}25`,
              }}
            >
              {r.site}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          {r.status === 'ok' && stats && (
            <span className="text-xs font-semibold tabular-nums text-text-muted hidden sm:block">
              a partir de <span style={{ color: siteColor.text }}>R$ {formatBRL(stats.minPrice)}</span>
            </span>
          )}
          {r.status === 'pendente' && (
            <span className="text-xs text-yellow-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Buscando...
            </span>
          )}
          {r.status === 'erro' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 truncate max-w-[160px]" title={r.erro || ''}>
              <Icon icon={AlertTriangle} size={14} /> {r.erro?.slice(0, 40) || 'Erro'}
            </span>
          )}
          {r.status === 'ok' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-text-muted tabular-nums">{r.total}</span>
              <Icon icon={Package} size={12} className="text-text-muted" />
            </div>
          )}
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {isOpen && (
            <div
              className="px-2 sm:px-4 py-4 animate-[fadeIn_0.25s_ease-out]"
            >
              {r.status === 'ok' && r.produtos.length > 0 ? (
                <>
                  {stats && stats.minPrice > 0 && (
                    <div className="flex items-center gap-4 mb-3 px-2 text-xs text-text-muted/70">
                      <span className="flex items-center gap-1.5">
                        <Icon icon={BadgeDollarSign} size={14} /> Menor preço: <span className="font-semibold text-text-secondary">R$ {formatBRL(stats.minPrice)}</span>
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1.5">
                        <Icon icon={BarChart} size={14} /> Média: <span className="font-semibold text-text-secondary">R$ {formatBRL(stats.avgPrice)}</span>
                      </span>
                    </div>
                  )}
                  <ProductGrid produtos={r.produtos} siteKey={r.site} />
                </>
              ) : r.status === 'ok' && r.produtos.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-muted">
                  <span className="block mb-2"><Icon icon={Search} size={28} /></span>
                  Nenhum produto encontrado para este termo
                </div>
              ) : null}

              {r.status === 'erro' && (
                <div className="px-4 py-8 text-center text-sm text-text-muted">
                  <span className="block mb-2"><Icon icon={XCircle} size={28} /></span>
                  {r.erro || 'Erro desconhecido ao buscar produtos'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

/* ─── Main Component ─────────────────────────────────────── */
export function AutoResultsView({ execucao, resultados, loading, running, onRefresh }: AutoResultsViewProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && resultados.length > 0) {
      initializedRef.current = true;
      setExpanded(new Set(resultados.map((r) => r.id)));
    }
  }, [resultados]);

  const allExpanded = resultados.length > 0 && resultados.every((r) => expanded.has(r.id));

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(resultados.map((r) => r.id)));
    }
  }, [allExpanded, resultados]);

  const stats = useMemo(() => {
    const okCount = resultados.filter((r) => r.status === 'ok').length;
    const erroCount = resultados.filter((r) => r.status === 'erro').length;
    const totalProdutos = resultados.reduce((sum, r) => sum + (r.produtos?.length || 0), 0);
    return { okCount, erroCount, totalProdutos };
  }, [resultados]);

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

  if (!execucao) {
    return (
        <div className="text-center py-16 rounded-xl bg-surface/30 border border-dashed border-white/[0.08]">
        <div className="mb-4"><Icon icon={Radio} size={36} className="text-text-muted" /></div>
        <p className="text-sm text-text-secondary mb-2 font-semibold">Nenhuma execução automática ainda</p>
        <p className="text-xs text-text-muted/60 mb-5 max-w-xs mx-auto leading-relaxed">
          Configure produtos na aba "Configurar" e aguarde o próximo ciclo de 6h,
          ou clique em "Executar agora" para iniciar manualmente.
        </p>
        <button
          onClick={onRefresh}
          className="text-sm px-5 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
        >
          Atualizar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <KpiCard
          icon={<Icon icon={Timer} size={18} />}
          label="Início"
          value={formatBrazilTime(execucao.iniciada_em)}
          accent="#94a3b8"
          index={0}
          sub={formatBrazilDateMonth(execucao.iniciada_em)}
        />
        {execucao.finalizada_em ? (
          <KpiCard
            icon={<Icon icon={CheckCircle} size={18} />}
            label="Fim"
            value={formatBrazilTime(execucao.finalizada_em)}
            accent="#94a3b8"
            index={1}
            sub={formatBrazilDateMonth(execucao.finalizada_em)}
          />
        ) : (
          <KpiCard
            icon={<Icon icon={Loader2} size={18} className="animate-spin" />}
            label="Status"
            value="Em andamento"
            accent="#fbbf24"
            index={1}
          />
        )}
        <KpiCard
          icon={<Icon icon={Package} size={18} />}
          label="Produtos"
          value={String(stats.totalProdutos)}
          accent="#34d399"
          index={2}
          sub={`${stats.okCount} termo${stats.okCount !== 1 ? 's' : ''} ok`}
        />
        <KpiCard
          icon={stats.erroCount > 0 ? <Icon icon={AlertTriangle} size={18} /> : <Icon icon={ThumbsUp} size={18} />}
          label={stats.erroCount > 0 ? 'Erros' : 'Sucesso'}
          value={stats.erroCount > 0 ? String(stats.erroCount) : '100%'}
          accent={stats.erroCount > 0 ? '#ef4444' : '#34d399'}
          index={3}
        />
      </div>

      {running && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15 text-amber-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          Executando nova busca...
        </div>
      )}

      {resultados.length > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted font-medium">
            {resultados.length} termo{resultados.length !== 1 ? 's' : ''} de busca · {expanded.size} aberto{expanded.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={toggleAll}
            className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent/5 border border-transparent hover:border-accent/20"
            aria-pressed={allExpanded}
          >
            {allExpanded ? (
              <span className="flex items-center gap-1.5"><Icon icon={ChevronsUp} size={14} /> Recolher todos</span>
            ) : (
              <span className="flex items-center gap-1.5"><Icon icon={ChevronsDown} size={14} /> Expandir todos</span>
            )}
          </button>
        </div>
      )}

      {resultados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-muted">Nenhum resultado disponível</p>
        </div>
      ) : (
        resultados.map((r) => (
          <TermoSection
            key={r.id}
            resultado={r}
            isOpen={expanded.has(r.id)}
            onToggle={toggleExpand}
          />
        ))
      )}
    </div>
  );
}
