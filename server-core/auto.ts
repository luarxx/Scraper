import { buscarProduto } from '../scraper';
import { db } from './db';
import { isSiteEnabled } from './enabledSites';
import { registrarMetricaBusca } from './metrics';
import { salvarPrecos } from './priceHistory';
import { calcularProximoHorarioIntervalo, dbDatetimeToApi, formatApiDatetime, formatDbDatetime, parseLocalDatetime } from './time';

const MIN_AUTO_INTERVAL_HOURS = 3;
const DEFAULT_AUTO_INTERVAL_HOURS = 6;
const MIN_AUTO_CONCURRENCY = 1;
const MAX_AUTO_CONCURRENCY = 10;
const DEFAULT_AUTO_CONCURRENCY = 3;
const configuredIntervalHours = Number(process.env.AUTO_INTERVAL_HOURS);
export const AUTO_INTERVAL_HOURS = Number.isFinite(configuredIntervalHours)
  ? Math.max(MIN_AUTO_INTERVAL_HOURS, Math.floor(configuredIntervalHours))
  : DEFAULT_AUTO_INTERVAL_HOURS;
const configuredAutoConcurrency = Number(process.env.AUTO_MAX_CONCURRENCY);
export const AUTO_MAX_CONCURRENCY = Number.isFinite(configuredAutoConcurrency)
  ? Math.min(MAX_AUTO_CONCURRENCY, Math.max(MIN_AUTO_CONCURRENCY, Math.floor(configuredAutoConcurrency)))
  : DEFAULT_AUTO_CONCURRENCY;
const INTERVALO_MS = AUTO_INTERVAL_HOURS * 60 * 60 * 1000;
let schedulerStatus: 'idle' | 'executando' | 'agendado' = 'idle';
let proximaExecucao: string | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

type AutoConfig = {
  id: number;
  termo: string;
  site: string;
};

function calcularProximoHorario(): Date {
  return calcularProximoHorarioIntervalo(AUTO_INTERVAL_HOURS);
}

async function executarComConcorrencia<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index++;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

export async function executarAutoBuscas(): Promise<void> {
  if (schedulerStatus === 'executando') return;
  schedulerStatus = 'executando';
  proximaExecucao = null;

  const configs = db.prepare(
    `SELECT id, termo, site FROM auto_config WHERE ativo = 1 ORDER BY ordem`
  ).all() as AutoConfig[];

  const configsFiltrados = configs.filter(c => isSiteEnabled(c.site));

  if (configsFiltrados.length === 0) {
    schedulerStatus = 'agendado';
    proximaExecucao = formatApiDatetime(calcularProximoHorario());
    return;
  }

  const insertExec = db.prepare(
    `INSERT INTO auto_execucoes (iniciada_em, status) VALUES (?, 'executando')`
  );
  const execResult = insertExec.run(formatDbDatetime());
  const execucaoId = execResult.lastInsertRowid as number;

  const insertResultado = db.prepare(
    `INSERT INTO auto_resultados (execucao_id, config_id, termo, site, status, total, produtos, erro)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((items: { id: number; termo: string; site: string }[]) => {
    for (const config of items) {
      insertResultado.run(execucaoId, config.id, config.termo, config.site, 'pendente', 0, null, null);
    }
  });
  insertMany(configsFiltrados);

  await executarComConcorrencia(configsFiltrados, AUTO_MAX_CONCURRENCY, async (config) => {
    const startedAt = Date.now();
    try {
      const data = await buscarProduto(config.site, config.termo);
      if ('erro' in data && data.erro) {
        db.prepare(
          `UPDATE auto_resultados SET status = 'erro', erro = ? WHERE execucao_id = ? AND config_id = ?`
        ).run(data.mensagem, execucaoId, config.id);
        registrarMetricaBusca({
          origem: 'auto',
          site: config.site,
          termo: config.termo,
          status: 'erro',
          total: 0,
          duracaoMs: Date.now() - startedAt,
          erro: data.mensagem,
        });
      } else {
        db.prepare(
          `UPDATE auto_resultados SET status = 'ok', total = ?, produtos = ? WHERE execucao_id = ? AND config_id = ?`
        ).run(data.total, JSON.stringify(data.produtos), execucaoId, config.id);
        salvarPrecos(data.produtos, config.site);
        registrarMetricaBusca({
          origem: 'auto',
          site: config.site,
          termo: config.termo,
          status: 'ok',
          total: data.total,
          duracaoMs: Date.now() - startedAt,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      db.prepare(
        `UPDATE auto_resultados SET status = 'erro', erro = ? WHERE execucao_id = ? AND config_id = ?`
      ).run(error.message, execucaoId, config.id);
      registrarMetricaBusca({
        origem: 'auto',
        site: config.site,
        termo: config.termo,
        status: 'erro',
        total: 0,
        duracaoMs: Date.now() - startedAt,
        erro: error.message,
      });
    }
  });

  db.prepare(
    `UPDATE auto_execucoes SET finalizada_em = ?, status = 'concluido' WHERE id = ?`
  ).run(formatDbDatetime(), execucaoId);

  const resultados = db.prepare(
    `SELECT termo, site, status, total FROM auto_resultados WHERE execucao_id = ?`
  ).all(execucaoId) as { termo: string; site: string; status: string; total: number }[];

  const ok = resultados.filter(r => r.status === 'ok').length;
  const erros = resultados.filter(r => r.status === 'erro').length;
  const totalProdutos = resultados.reduce((acc, r) => acc + (r.total || 0), 0);

  console.log(`[Busca Automática] Concluída — ${resultados.length} termo(s), ${ok} ok, ${erros} erro(s), ${totalProdutos} produto(s) no total`);

  schedulerStatus = 'agendado';
  proximaExecucao = formatApiDatetime(calcularProximoHorario());
}

export function iniciarScheduler(): void {
  const ultimaExec = db.prepare(
    `SELECT iniciada_em, status FROM auto_execucoes ORDER BY id DESC LIMIT 1`
  ).get() as { iniciada_em: string; status: string } | undefined;

  let deveExecutarImediatamente = false;

  if (ultimaExec) {
    const ultimaDate = parseLocalDatetime(ultimaExec.iniciada_em);
    const agora = new Date();
    const diffMs = agora.getTime() - ultimaDate.getTime();
    if (diffMs >= INTERVALO_MS || ultimaExec.status === 'executando') {
      deveExecutarImediatamente = true;
    }
  } else {
    const count = db.prepare('SELECT COUNT(*) as c FROM auto_config WHERE ativo = 1').get() as { c: number };
    if (count.c > 0) {
      deveExecutarImediatamente = true;
    }
  }

  if (deveExecutarImediatamente) {
    executarAutoBuscas();
  }

  const next = calcularProximoHorario();
  const delay = Math.max(0, next.getTime() - Date.now());
  proximaExecucao = formatApiDatetime(next);
  if (schedulerStatus === 'idle') schedulerStatus = 'agendado';

  setTimeout(() => {
    executarAutoBuscas();
    schedulerTimer = setInterval(executarAutoBuscas, INTERVALO_MS);
  }, delay);
}

export function getAutoStatus(): {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_configurados: number;
} {
  const ultimaExec = db.prepare(
    `SELECT iniciada_em, finalizada_em, status FROM auto_execucoes ORDER BY id DESC LIMIT 1`
  ).get() as { iniciada_em: string; finalizada_em: string | null; status: string } | undefined;

  const totalConfig = db.prepare(
    `SELECT COUNT(*) as c FROM auto_config WHERE ativo = 1`
  ).get() as { c: number };

  return {
    status: schedulerStatus,
    ultima_execucao: ultimaExec ? dbDatetimeToApi(ultimaExec.iniciada_em) : null,
    proxima_execucao: proximaExecucao,
    total_configurados: totalConfig.c,
  };
}

export function isAutoRunning(): boolean {
  return schedulerStatus === 'executando';
}
