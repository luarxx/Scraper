import { useState, useCallback, useEffect, useRef } from 'react';
import type { PricePoint, HistorySummary } from '../types';

interface PriceHistoryState {
  loading: boolean;
  history: PricePoint[];
  summary: HistorySummary | null;
  erro: string | null;
}

// Module-level cache: chave = `${siteKey}|${url}|${days}` -> { history, summary, erro }
const responseCache = new Map<string, {
  history: PricePoint[];
  summary: HistorySummary | null;
  erro: string | null;
}>();

// In-flight dedupe: chave -> Promise (compartilhado entre todos os hooks)
const inflight = new Map<string, Promise<void>>();

const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheMeta = new Map<string, number>();

function cacheKey(url: string, siteKey: string, days: number) {
  return `${siteKey}|${days}|${url}`;
}

function isExpired(key: string): boolean {
  const ts = cacheMeta.get(key);
  if (!ts) return true;
  return Date.now() - ts > CACHE_TTL_MS;
}

async function fetchBoth(url: string, siteKey: string, days: number): Promise<void> {
  const params = new URLSearchParams({ url, site: siteKey, days: String(days) });
  const [summaryRes, historyRes] = await Promise.all([
    fetch(`/api/history/summary?${params}`),
    fetch(`/api/history?${params}`),
  ]);

  const summary =
    summaryRes.ok && summaryRes.status !== 404
      ? ((await summaryRes.json()) as HistorySummary)
      : null;

  let history: PricePoint[] = [];
  let erro: string | null = null;
  if (historyRes.ok && historyRes.status !== 404) {
    const data = await historyRes.json();
    history = Array.isArray(data) ? data : data.history || [];
  } else if (historyRes.status !== 404) {
    erro = `Erro ${historyRes.status}`;
  }

  responseCache.set(cacheKey(url, siteKey, days), { history, summary, erro });
  cacheMeta.set(cacheKey(url, siteKey, days), Date.now());
}

function getOrFetch(url: string, siteKey: string, days: number): Promise<void> {
  const key = cacheKey(url, siteKey, days);
  if (!isExpired(key) && responseCache.has(key)) {
    return Promise.resolve();
  }
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetchBoth(url, siteKey, days).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

export function usePriceHistory() {
  const [state, setState] = useState<PriceHistoryState>(() => ({
    loading: false,
    history: [],
    summary: null,
    erro: null,
  }));
  const fetchedRef = useRef<string | null>(null);

  const ensure = useCallback(async (url: string, siteKey: string, days = 90) => {
    const key = cacheKey(url, siteKey, days);
    fetchedRef.current = key;
    setState((prev) => ({ ...prev, loading: true, erro: null }));
    try {
      await getOrFetch(url, siteKey, days);
      const cached = responseCache.get(key);
      // Só atualiza state se este hook ainda é o "dono" da fetch atual
      if (fetchedRef.current === key && cached) {
        setState({
          loading: false,
          history: cached.history,
          summary: cached.summary,
          erro: cached.erro,
        });
      }
    } catch (err) {
      if (fetchedRef.current === key) {
        setState((prev) => ({ ...prev, loading: false, erro: (err as Error).message }));
      }
    }
  }, []);

  // API legada mantida para compatibilidade
  const fetchSummary = useCallback((url: string, siteKey: string, days = 90) => {
    return ensure(url, siteKey, days);
  }, [ensure]);

  const fetchHistory = useCallback((url: string, siteKey: string, days = 90) => {
    return ensure(url, siteKey, days);
  }, [ensure]);

  // Limpa fetchedRef ao desmontar
  useEffect(() => {
    return () => {
      fetchedRef.current = null;
    };
  }, []);

  return { ...state, fetchSummary, fetchHistory };
}
