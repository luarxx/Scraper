import * as http from 'http';
import { AUTO_DISABLED, AUTO_INTERVAL_HOURS, AUTO_INTERVAL_JITTER_HOURS, AUTO_MAX_CONCURRENCY, executarAutoBuscas, getAutoStatus, iniciarScheduler } from './server-core/auto';
import { createServer } from './server-core/app';
import { db, initDatabase } from './server-core/db';
import { PORT, PORT_AUTO_FALLBACK, PORT_MAX_ATTEMPTS, resolveProjectRoot } from './server-core/env';
import { brlToCents, centsToBrl, parseTargetPrice } from './server-core/money';
import { calcularProximoHorarioIntervalo, formatApiDatetime, formatDbDatetime } from './server-core/time';
import { WATCH_INTERVAL_HOURS, WATCH_INTERVAL_JITTER_HOURS, executarWatchAlerts, getWatchStatus, iniciarWatchScheduler, normalizarWatchAlert } from './server-core/watch';
import { WISHLIST_INTERVAL_HOURS, WISHLIST_INTERVAL_JITTER_HOURS, executarWishlistChecks, getWishlistStatus, iniciarWishlistScheduler, normalizarWishlistItem } from './server-core/wishlist';

const STARTUP_BOX_WIDTH = 46;

function startupLine(content = ''): string {
  return `  │ ${content.padEnd(STARTUP_BOX_WIDTH)} │`;
}

function startupRule(left: string, fill: string, right: string): string {
  return `  ${left}${fill.repeat(STARTUP_BOX_WIDTH + 2)}${right}`;
}

function startupRow(icon: string, label: string, value: string): string {
  return startupLine(`${icon}  ${label.padEnd(12)} ${value}`);
}

function logStartup(currentPort: number): void {
  console.log('');
  console.log(startupRule('┌', '─', '┐'));
  console.log(startupLine('◆  Scraper pronto'));
  console.log(startupRule('├', '─', '┤'));
  console.log(startupRow('●', 'Servidor', `http://localhost:${currentPort}`));
  console.log(startupRow('◷', 'Auto-busca', AUTO_DISABLED ? 'desativado' : `a cada ${AUTO_INTERVAL_HOURS}-${AUTO_INTERVAL_HOURS + AUTO_INTERVAL_JITTER_HOURS}h`));
  console.log(startupRow('◉', 'Watch', `a cada ${WATCH_INTERVAL_HOURS}-${WATCH_INTERVAL_HOURS + WATCH_INTERVAL_JITTER_HOURS}h`));
  console.log(startupRow('▣', 'Desejos', `a cada ${WISHLIST_INTERVAL_HOURS}-${WISHLIST_INTERVAL_HOURS + WISHLIST_INTERVAL_JITTER_HOURS}h`));
  console.log(startupRule('└', '─', '┘'));
  console.log('');
}

function startServer(): http.Server {
  const server = createServer();
  let currentPort = PORT;
  let attempts = 0;
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      if (PORT_AUTO_FALLBACK && attempts < PORT_MAX_ATTEMPTS) {
        attempts += 1;
        currentPort += 1;
        console.warn(`[Servidor] Porta ${currentPort - 1} em uso. Tentando http://localhost:${currentPort}...`);
        server.listen(currentPort);
        return;
      }

      console.error(`[Servidor] Porta ${currentPort} já está em uso. Encerre o processo existente ou rode com PORT=${currentPort + 1}.`);
      process.exitCode = 1;
      return;
    }

    console.error('[Servidor] Falha ao iniciar:', err.message);
    process.exitCode = 1;
  });
  server.listen(currentPort, () => {
    if (!AUTO_DISABLED) iniciarScheduler();
    iniciarWatchScheduler();
    iniciarWishlistScheduler();
    logStartup(currentPort);
  });
  return server;
}

export {
  AUTO_DISABLED,
  AUTO_INTERVAL_HOURS,
  AUTO_INTERVAL_JITTER_HOURS,
  AUTO_MAX_CONCURRENCY,
  WATCH_INTERVAL_HOURS,
  WATCH_INTERVAL_JITTER_HOURS,
  WISHLIST_INTERVAL_HOURS,
  WISHLIST_INTERVAL_JITTER_HOURS,
  brlToCents,
  calcularProximoHorarioIntervalo,
  centsToBrl,
  createServer,
  db,
  executarAutoBuscas,
  executarWatchAlerts,
  executarWishlistChecks,
  formatApiDatetime,
  formatDbDatetime,
  getAutoStatus,
  getWatchStatus,
  getWishlistStatus,
  initDatabase,
  normalizarWatchAlert,
  normalizarWishlistItem,
  parseTargetPrice,
  resolveProjectRoot,
  startServer,
};

if (require.main === module) {
  startServer();
}
