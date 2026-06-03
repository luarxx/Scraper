import { useState, useCallback } from 'react';
import type { PricePoint, HistorySummary } from '../types';

interface PriceHistoryState {
  loading: boolean;
  history: PricePoint[];
  summary: HistorySummary | null;
  erro: string | null;
}

export function usePriceHistory() {
  const [state, setState] = useState<PriceHistoryState>({
    loading: false,
    history: [],
    summary: null,
    erro: null,
  });

  const fetchSummary = useCallback(async (url: string, siteKey: string, days = 90) => {
    setState(prev => ({ ...prev, loading: true, erro: null }));
    try {
      const params = new URLSearchParams({ url, site: siteKey, days: String(days) });
      const res = await fetch(`/api/history/summary?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          setState(prev => ({ ...prev, loading: false, summary: null, erro: null }));
          return;
        }
        throw new Error(`Erro ${res.status}`);
      }
      const data: HistorySummary = await res.json();
      setState(prev => ({ ...prev, loading: false, summary: data }));
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, erro: (err as Error).message }));
    }
  }, []);

  const fetchHistory = useCallback(async (url: string, siteKey: string, days = 90) => {
    setState(prev => ({ ...prev, loading: true, erro: null }));
    try {
      const params = new URLSearchParams({ url, site: siteKey, days: String(days) });
      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) {
        if (res.status === 404) {
          setState(prev => ({ ...prev, loading: false, history: [], erro: null }));
          return;
        }
        throw new Error(`Erro ${res.status}`);
      }
      const data = await res.json();
      setState(prev => ({ ...prev, loading: false, history: data.history || [] }));
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, erro: (err as Error).message }));
    }
  }, []);

  return { ...state, fetchSummary, fetchHistory };
}
