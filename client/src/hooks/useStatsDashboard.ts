import { useCallback, useState } from 'react';
import type { StatsDashboardResponse } from '../types';

interface StatsDashboardState {
  stats: StatsDashboardResponse | null;
  loading: boolean;
  error: string | null;
}

export function useStatsDashboard() {
  const [state, setState] = useState<StatsDashboardState>({
    stats: null,
    loading: false,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/stats/dashboard');
      const data = await res.json();
      if (!res.ok || data.erro) {
        setState((s) => ({
          ...s,
          loading: false,
          error: data.mensagem || `Erro ${res.status}`,
        }));
        return;
      }
      setState({ stats: data, loading: false, error: null });
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Não foi possível carregar as estatísticas.',
      }));
    }
  }, []);

  return { ...state, fetchStats };
}
