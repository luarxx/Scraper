import { useState, useCallback } from 'react';
import type { Produto, Site } from '../types';

interface SearchState {
  loading: boolean;
  produtos: Produto[];
  termo: string;
  siteKey: string;
  siteNome: string;
  timestamp: string;
  erro: string | null;
  total: number;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    loading: false,
    produtos: [],
    termo: '',
    siteKey: '',
    siteNome: '',
    timestamp: '',
    erro: null,
    total: 0,
  });
  const [sites, setSites] = useState<Site[]>([]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) setSites(await res.json());
    } catch { /* ignore */ }
  }, []);

  const search = useCallback(async (q: string, siteKey: string) => {
    setState(s => ({ ...s, loading: true, erro: null }));

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&site=${siteKey}`);
      const data = await res.json();

      if (data.erro) {
        setState(s => ({
          ...s,
          loading: false,
          erro: data.mensagem,
          produtos: [],
          total: 0,
        }));
        return;
      }

      setState({
        loading: false,
        produtos: data.produtos,
        termo: data.termo,
        siteKey: siteKey,
        siteNome: data.siteNome,
        timestamp: data.timestamp,
        erro: null,
        total: data.total,
      });
    } catch {
      setState(s => ({
        ...s,
        loading: false,
        erro: 'Não foi possível conectar ao servidor.',
        produtos: [],
        total: 0,
      }));
    }
  }, []);

  return { ...state, sites, search, fetchSites };
}
