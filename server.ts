import * as http from 'http';
import { AUTO_INTERVAL_HOURS, executarAutoBuscas, getAutoStatus, iniciarScheduler } from './server-core/auto';
import { createServer } from './server-core/app';
import { db, initDatabase } from './server-core/db';
import { PORT, PORT_AUTO_FALLBACK, PORT_MAX_ATTEMPTS } from './server-core/env';
import { brlToCents, centsToBrl, parseTargetPrice } from './server-core/money';
import { calcularProximoHorarioIntervalo, formatApiDatetime, formatDbDatetime } from './server-core/time';
import { WATCH_INTERVAL_HOURS, executarWatchAlerts, getWatchStatus, iniciarWatchScheduler, normalizarWatchAlert } from './server-core/watch';

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
    iniciarScheduler();
    iniciarWatchScheduler();
    console.log('');
    console.log('  ┌──────────────────────────────────────┐');
    console.log(`  │  🚀  ${String('http://localhost:' + String(currentPort)).padEnd(26)}│`);
    console.log('  │                                      │');
    console.log(`  │  ⏰  Auto-busca a cada ${String(AUTO_INTERVAL_HOURS + 'h').padEnd(13)}│`);
    console.log(`  │  🔔  Watch a cada ${String(WATCH_INTERVAL_HOURS + 'h').padEnd(18)}│`);
    console.log('  └──────────────────────────────────────┘');
    console.log('');
  });
  return server;
}

export {
  AUTO_INTERVAL_HOURS,
  WATCH_INTERVAL_HOURS,
  brlToCents,
  calcularProximoHorarioIntervalo,
  centsToBrl,
  createServer,
  db,
  executarAutoBuscas,
  executarWatchAlerts,
  formatApiDatetime,
  formatDbDatetime,
  getAutoStatus,
  getWatchStatus,
  initDatabase,
  normalizarWatchAlert,
  parseTargetPrice,
  startServer,
};

if (require.main === module) {
  startServer();
}
