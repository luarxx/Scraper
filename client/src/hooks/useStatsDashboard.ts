import { useCallback, useState } from 'react';
import type { EnhancedStatsDashboardResponse } from '../types';

export type PeriodFilter = 'all' | '24h' | '7d' | '30d';

interface StatsDashboardState {
  stats: EnhancedStatsDashboardResponse | null;
  loading: boolean;
  error: string | null;
  period: PeriodFilter;
}

export function useStatsDashboard() {
  const [state, setState] = useState<StatsDashboardState>({
    stats: null,
    loading: false,
    error: null,
    period: 'all',
  });

  const fetchStats = useCallback(async (period?: PeriodFilter) => {
    const effectivePeriod = period ?? state.period;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url = effectivePeriod === 'all' 
        ? '/api/stats/dashboard' 
        : `/api/stats/dashboard?period=${effectivePeriod}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.erro) {
        setState((s) => ({ ...s, loading: false, error: data.mensagem || `Erro ${res.status}`, period: effectivePeriod }));
        return;
      }
      setState({ stats: data, loading: false, error: null, period: effectivePeriod });
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Não foi possível carregar as estatísticas.' }));
    }
  }, [state.period]);

  const setPeriod = useCallback((period: PeriodFilter) => {
    setState((s) => ({ ...s, period }));
    fetchStats(period);
  }, [fetchStats]);

  return { ...state, fetchStats, setPeriod };
}
