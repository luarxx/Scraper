import { useCallback, useState } from 'react';
import type { WishlistItem, WishlistItemInput, WishlistStatus } from '../types';

interface UseWishlistReturn {
  items: WishlistItem[];
  status: WishlistStatus | null;
  loading: boolean;
  saving: boolean;
  running: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  saveItem: (input: WishlistItemInput) => Promise<WishlistItem>;
  removeItem: (id: number) => Promise<void>;
  triggerRun: () => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [status, setStatus] = useState<WishlistStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wishlist/items');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setItems(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlist/status');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setStatus(await res.json());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const saveItem = useCallback(async (input: WishlistItemInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/wishlist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || `Erro ${res.status}`);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== data.id);
        return [data, ...next];
      });
      await fetchStatus();
      return data as WishlistItem;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchStatus]);

  const removeItem = useCallback(async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/wishlist/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      await fetchStatus();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [fetchStatus]);

  const triggerRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/wishlist/run', { method: 'POST' });
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
    items,
    status,
    loading,
    saving,
    running,
    error,
    fetchItems,
    fetchStatus,
    saveItem,
    removeItem,
    triggerRun,
  };
}
