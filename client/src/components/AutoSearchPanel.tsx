import { useEffect, useState, useCallback, useRef } from 'react';
import { Zap, Clock, Pause, CalendarClock, ClipboardList, Play, Settings, BarChart3 } from 'lucide-react';
import type { Site } from '../types';
import { useAutoConfig } from '../hooks/useAutoConfig';
import { useAutoResults } from '../hooks/useAutoResults';
import { AutoConfigList } from './AutoConfigList';
import { AutoResultsView } from './AutoResultsView';
import { Icon } from './Icon';
import { formatBrazilDateMonthTime } from '../utils/date';

interface AutoSearchPanelProps {
  sites: Site[];
}

export function AutoSearchPanel({ sites }: AutoSearchPanelProps) {
  const [tab, setTab] = useState<'config' | 'results'>('config');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { configs, status, loading: configLoading, saving, error: configError, fetchConfig, fetchStatus, saveConfig, removeConfig } = useAutoConfig();
  const { execucao, resultados, loading: resultsLoading, running, error: resultsError, fetchResults, triggerRun } = useAutoResults();

  const handleTriggerRun = useCallback(async () => {
    await triggerRun();
    fetchStatus();
  }, [triggerRun, fetchStatus]);

  const refreshAll = useCallback(() => {
    fetchConfig();
    fetchStatus();
    fetchResults();
  }, [fetchConfig, fetchStatus, fetchResults]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Poll leve: só status (sem refetch de results) enquanto executa.
  // Refetch de results acontece apenas na transição de "executando" -> outro estado.
  useEffect(() => {
    if (status?.status !== 'executando') return;
    const id = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(id);
  }, [status?.status, fetchStatus]);

  useEffect(() => {
    if (!status?.proxima_execucao || status.status === 'executando') return;
    const delay = Math.max(new Date(status.proxima_execucao).getTime() - Date.now() + 1500, 0);
    const id = setTimeout(() => {
      fetchStatus();
    }, delay);
    return () => clearTimeout(id);
  }, [status?.proxima_execucao, status?.status, fetchStatus]);

  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = status?.status;
    if (prev === 'executando' && curr !== 'executando') {
      fetchResults();
    }
    prevStatusRef.current = curr;
  }, [status?.status, fetchResults]);

  const isExecutando = status?.status === 'executando';
  const isAgendado = status?.status === 'agendado';

  const statusColor = isExecutando ? '#fbbf24'
    : isAgendado ? '#34d399'
    : '#64748b';

  const statusLabel = isExecutando ? 'Executando...'
    : isAgendado ? 'Agendado'
    : 'Parado';

  const statusIcon = isExecutando ? Zap : isAgendado ? Clock : Pause;

  function formatProximaExecucao(iso: string | null, now: number): string {
    if (!iso) return '—';
    const dt = new Date(iso);
    const diffMs = dt.getTime() - now;
    if (diffMs <= 0) return 'A qualquer momento';
    const horas = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (horas > 0) return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
    if (mins > 0) return `${mins}min`;
    return '< 1min';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-20 sm:pb-24 animate-[fadeIn_0.3s_ease-out]">
      {/* Status bar — KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-6">
        {/* Tile: Status */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]"
          style={{ animation: 'kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) 0s both' }}
        >
          <span className="relative flex h-3 w-3 shrink-0">
            {isExecutando && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusColor }} />
            )}
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: statusColor }} />
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">
              Status
            </span>
            <span className="text-sm font-semibold text-text-primary mt-0.5 inline-flex items-center gap-1.5">
              <Icon icon={statusIcon} size={16} /> {statusLabel}
            </span>
          </div>
        </div>

        {/* Tile: Next run */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]"
          style={{ animation: 'kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
        >
          <span className="shrink-0"><Icon icon={CalendarClock} size={18} /></span>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">
              Próxima busca
            </span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {status?.proxima_execucao && !isExecutando
                ? formatProximaExecucao(status.proxima_execucao, nowMs)
                : isExecutando ? 'Em execução' : '—'}
            </span>
          </div>
        </div>

        {/* Tile: Last execution */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]"
          style={{ animation: 'kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}
        >
          <span className="shrink-0"><Icon icon={Clock} size={18} /></span>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">
              Última execução
            </span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {status?.ultima_execucao
                ? formatBrazilDateMonthTime(status.ultima_execucao)
                : '—'}
            </span>
          </div>
        </div>

        {/* Tile: Configured count */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]"
          style={{ animation: 'kpiStagger 0.4s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}
        >
          <span className="shrink-0"><Icon icon={ClipboardList} size={18} /></span>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">
              Produtos
            </span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {status?.total_configurados ?? 0} / 10
            </span>
          </div>
          {/* Trigger button */}
          <button
            onClick={handleTriggerRun}
            disabled={running || isExecutando}
            className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando
              </span>
            ) : isExecutando ? (
              'Executando…'
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon icon={Play} size={14} /> Executar
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface/60 border border-white/[0.06] w-fit">
        <button
          onClick={() => setTab('config')}
          aria-pressed={tab === 'config'}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'config'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
          }`}
        >
          <Icon icon={Settings} size={15} /> Configurar
        </button>
        <button
          onClick={() => setTab('results')}
          aria-pressed={tab === 'results'}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'results'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
          }`}
        >
          <Icon icon={BarChart3} size={15} /> Resultados
          {execucao && (
            <span className="ml-1.5 text-xs opacity-70">
              ({resultados.filter(r => r.status === 'ok').length}/{resultados.length})
            </span>
          )}
        </button>
      </div>

      {/* Error banner */}
      {(configError || resultsError) && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {configError || resultsError}
        </div>
      )}

      {/* Content */}
      {tab === 'config' ? (
        <AutoConfigList
          sites={sites}
          configs={configs}
          onSave={saveConfig}
          onRemove={removeConfig}
          saving={saving}
          loading={configLoading}
        />
      ) : (
        <AutoResultsView
          execucao={execucao}
          resultados={resultados}
          loading={resultsLoading}
          running={running || status?.status === 'executando'}
          onRefresh={fetchResults}
        />
      )}
    </div>
  );
}
