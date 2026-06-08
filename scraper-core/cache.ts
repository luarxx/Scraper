import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CACHE_DIR, CACHE_TTL } from './config';
import type { Resultado } from './types';

export function normalizarTermo(termo: string): string {
  return termo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function gerarCacheKey(site: string, termo: string): string {
  const normalizado = normalizarTermo(termo);
  return createHash('sha256').update(`${site}:${normalizado}`).digest('hex');
}

export function lerCache(site: string, termo: string): Resultado | null {
  const cacheKey = gerarCacheKey(site, termo);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  if (!fs.existsSync(cacheFile)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const cachedAt = new Date(data._cachedAt).getTime();
    const agora = Date.now();

    if (agora - cachedAt < CACHE_TTL) {
      const { _cachedAt: _, ...resultado } = data;
      console.log(`📦 Cache encontrado para "${termo}" (${Math.round((agora - cachedAt) / 1000)}s atrás)`);
      return resultado as Resultado;
    }

    fs.unlinkSync(cacheFile);
  } catch {
    // cache inválido ou corrompido, ignorar
  }

  return null;
}

export function salvarCache(site: string, termo: string, resultado: Resultado): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cacheKey = gerarCacheKey(site, termo);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  const data = {
    ...resultado,
    _cachedAt: new Date().toISOString(),
  };

  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
}
