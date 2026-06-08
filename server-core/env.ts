import * as fs from 'fs';
import * as path from 'path';

export function resolveProjectRoot(runtimeDir: string): string {
  const parent = path.resolve(runtimeDir, '..');
  return path.basename(parent) === 'dist' ? path.resolve(parent, '..') : parent;
}

export const ROOT = resolveProjectRoot(__dirname);

export function loadEnv(): void {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv();
process.env.TZ = 'America/Sao_Paulo';

export const PORT = Number(process.env.PORT || 3000);
export const PORT_AUTO_FALLBACK = !process.env.PORT && process.env.PORT_STRICT !== '1';
export const PORT_MAX_ATTEMPTS = Number(process.env.PORT_MAX_ATTEMPTS || 10);
export const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
export const hasReactBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));
