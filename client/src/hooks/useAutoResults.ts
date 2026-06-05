import { useState, useCallback } from 'react';
import type { AutoResultsResponse, AutoExecucao, AutoResultadoItem } from '../types';

interface UseAutoResultsReturn {
  execucao: AutoExecucao | null;
  resultados: AutoResultadoItem[];
  loading: boolean;
  running: boolean;
  error: string | null;
  fetchResults: () => Promise<void>;
  triggerRun: () => Promise<void>;
}

export function useAutoResults(): UseAutoResultsReturn {
  const [execucao, setExecucao] = useState<AutoExecucao | null>(null);
  const [resultados, setResultados] = useState<AutoResultadoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auto/results');
      if (!res.ok) throw new Error('Erro ao carregar resultados');
      const data: AutoResultsResponse = await res.json();
      setExecucao(data.execucao);
      setResultados(data.resultados);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/auto/run', { method: 'POST' });
      if (!res.ok) {
        if (res.status === 409) {
          setError('Já existe uma execução em andamento');
        } else {
          throw new Error('Erro ao iniciar execução');
        }
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setRunning(false);
    }
  }, []);

  return { execucao, resultados, loading, running, error, fetchResults, triggerRun };
}
