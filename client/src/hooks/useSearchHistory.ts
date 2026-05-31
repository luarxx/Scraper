import { useState, useCallback } from 'react';

export interface SearchHistoryEntry {
  termo: string;
  site: string;
  siteNome: string;
}

const STORAGE_KEY = 'recent-searches';
const MAX_ENTRIES = 5;

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  const addEntry = useCallback((termo: string, site: string, siteNome: string) => {
    setHistory(prev => {
      const filtered = prev.filter(e => !(e.termo === termo && e.site === site));
      const next = [{ termo, site, siteNome }, ...filtered].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  return { history, addEntry };
}
