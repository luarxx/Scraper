import { useCallback, useState } from 'react';
import type { WatchAlert, WatchProductPreview, WatchStatus } from '../types';

interface WatchAlertInput {
  nome: string;
  url: string;
  site: string;
  canal: 'discord';
  preco_alvo: string;
}

export function useWatchAlerts() {
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/watch/alerts');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setAlerts(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/watch/status');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setStatus(await res.json());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const createAlert = useCallback(async (input: WatchAlertInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/watch/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || `Erro ${res.status}`);
      setAlerts((prev) => [data, ...prev]);
      await fetchStatus();
      return data as WatchAlert;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchStatus]);

  const previewProduct = useCallback(async (url: string, site: string, signal?: AbortSignal) => {
    setPreviewing(true);
    try {
      const params = new URLSearchParams({ url, site });
      const res = await fetch(`/api/watch/preview?${params.toString()}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || `Erro ${res.status}`);
      return data as WatchProductPreview;
    } finally {
      setPreviewing(false);
    }
  }, []);

  const removeAlert = useCallback(async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/watch/alerts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
      await fetchStatus();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [fetchStatus]);

  const triggerRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/watch/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || `Erro ${res.status}`);
      await fetchStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }, [fetchStatus]);

  return {
    alerts,
    status,
    loading,
    saving,
    running,
    previewing,
    error,
    fetchAlerts,
    fetchStatus,
    previewProduct,
    createAlert,
    removeAlert,
    triggerRun,
  };
}
