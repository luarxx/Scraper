import { useState, useCallback } from 'react';
import type { AutoConfigEntry, AutoStatus } from '../types';

interface UseAutoConfigReturn {
  configs: AutoConfigEntry[];
  status: AutoStatus | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  saveConfig: (entries: { termo: string; site: string }[]) => Promise<void>;
  removeConfig: (id: number) => Promise<void>;
}

export function useAutoConfig(): UseAutoConfigReturn {
  const [configs, setConfigs] = useState<AutoConfigEntry[]>([]);
  const [status, setStatus] = useState<AutoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auto/config');
      if (!res.ok) throw new Error('Erro ao carregar configuração');
      const data: AutoConfigEntry[] = await res.json();
      setConfigs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auto/status');
      if (!res.ok) return;
      const data: AutoStatus = await res.json();
      setStatus(data);
    } catch {
      // silencioso — status não crítico
    }
  }, []);

  const saveConfig = useCallback(async (entries: { termo: string; site: string }[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auto/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      });
      if (!res.ok) {
        const err = await res.json() as { mensagem?: string };
        throw new Error(err.mensagem || 'Erro ao salvar configuração');
      }
      const data: AutoConfigEntry[] = await res.json();
      setConfigs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  }, []);

  const removeConfig = useCallback(async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/auto/config/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover item');
      await fetchConfig();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, [fetchConfig]);

  return { configs, status, loading, saving, error, fetchConfig, fetchStatus, saveConfig, removeConfig };
}
