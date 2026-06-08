import * as fs from 'fs';
import * as path from 'path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { SESSION_STATE_DIR } from './config';
import type { Fingerprint } from './fingerprint';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

const sessionStateBySite = new Map<string, StorageState>();

function getSessionStatePath(siteKey: string): string {
  return path.join(SESSION_STATE_DIR, `${siteKey}.json`);
}

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_STATE_DIR)) {
    fs.mkdirSync(SESSION_STATE_DIR, { recursive: true });
  }
}

function readStorageState(siteKey: string): StorageState | undefined {
  const cached = sessionStateBySite.get(siteKey);
  if (cached) return cached;

  const file = getSessionStatePath(siteKey);
  if (!fs.existsSync(file)) return undefined;

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as StorageState;
    sessionStateBySite.set(siteKey, data);
    return data;
  } catch {
    return undefined;
  }
}

export function resetSessionStateCache(): void {
  sessionStateBySite.clear();
}

export async function criarContextoComSessao(
  browser: Browser,
  siteKey: string,
  fingerprint: Fingerprint,
  persistSession: boolean,
): Promise<BrowserContext> {
  const storageState = persistSession ? readStorageState(siteKey) : undefined;
  const contextOptions: Parameters<Browser['newContext']>[0] = {
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...(storageState ? { storageState } : {}),
  };

  return browser.newContext(contextOptions);
}

export async function criarPaginaComSessao(
  browser: Browser,
  siteKey: string,
  fingerprint: Fingerprint,
  persistSession: boolean,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await criarContextoComSessao(browser, siteKey, fingerprint, persistSession);
  const page = await context.newPage();
  return { context, page };
}

export async function salvarSessaoDoContexto(
  context: BrowserContext,
  siteKey: string,
  persistSession: boolean,
): Promise<void> {
  if (!persistSession) return;

  try {
    ensureSessionDir();
    const state = await context.storageState();
    sessionStateBySite.set(siteKey, state);
    fs.writeFileSync(getSessionStatePath(siteKey), JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Sessão] Falha ao salvar estado de "${siteKey}": ${message}`);
  }
}
