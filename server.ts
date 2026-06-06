import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { buscarProduto, buscarProdutoPorUrl, SITES } from './scraper';
import type { Produto } from './scraper';

const ROOT = path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '..') : __dirname;
loadEnv();
process.env.TZ = 'America/Sao_Paulo';

const PORT = Number(process.env.PORT || 3000);
const PORT_AUTO_FALLBACK = !process.env.PORT && process.env.PORT_STRICT !== '1';
const PORT_MAX_ATTEMPTS = Number(process.env.PORT_MAX_ATTEMPTS || 10);
const APP_TIME_ZONE = 'America/Sao_Paulo';
const APP_TIME_OFFSET = '-03:00';
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const hasReactBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loadEnv(): void {
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

function sendStatic(res: http.ServerResponse, filePath: string, fallback?: () => void): void {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' && fallback) return fallback();
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>404</h1><p>${escapeHtml(path.basename(filePath))} não encontrado</p>`);
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function sendSpa(res: http.ServerResponse): void {
  if (!hasReactBuild) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
    return;
  }
  sendStatic(res, path.join(CLIENT_DIST, 'index.html'));
}

// ─── Helpers ──────────────────────────────────────────────────

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, jsonHeaders());
  res.end(JSON.stringify(data));
}

function getBrazilParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
}

function formatDbDatetime(date = new Date()): string {
  const p = getBrazilParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function formatApiDatetime(date = new Date()): string {
  return `${formatDbDatetime(date).replace(' ', 'T')}${APP_TIME_OFFSET}`;
}

function dbDatetimeToApi(value: string | null): string | null {
  if (!value) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value;
  return `${value.replace(' ', 'T')}${APP_TIME_OFFSET}`;
}

function parseLocalDatetime(s: string): Date {
  return new Date(dbDatetimeToApi(s)!);
}

function brlToCents(price: string | null): number | null {
  if (!price) return null;
  let s = price.replace(/R\$\s*/i, '').trim();
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot !== -1 && lastComma === -1 && /^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  const num = parseFloat(s);
  return isNaN(num) ? null : Math.round(num * 100);
}

function centsToBrl(cents: number | null): string {
  if (cents === null) return 'Preço indisponível';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseTargetPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;
  return brlToCents(value);
}

function salvarPrecos(produtos: { title: string; price: string | null; parcelamento: string | null; image: string; url: string; relevancia: number }[], site: string): void {
  if (produtos.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO price_history (url, site, price_cents, parcelamento, captured_at) VALUES (?, ?, ?, ?, ?)`
  );
  const saveMany = db.transaction((items: { url: string; price: string | null; parcelamento: string | null }[]) => {
    const capturedAt = formatDbDatetime();
    for (const p of items) {
      insert.run(p.url, site, brlToCents(p.price), p.parcelamento, capturedAt);
    }
  });
  saveMany(produtos);
}

// ─── Database ──────────────────────────────────────────────────

const DB_PATH = process.env.SCRAPER_DB_PATH || path.join(ROOT, 'data', 'scraper.db');
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auto_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      termo TEXT NOT NULL,
      site TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE TABLE IF NOT EXISTS auto_execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iniciada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      finalizada_em TEXT,
      status TEXT NOT NULL DEFAULT 'executando'
    );

    CREATE TABLE IF NOT EXISTS auto_resultados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execucao_id INTEGER NOT NULL,
      config_id INTEGER,
      termo TEXT NOT NULL,
      site TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok',
      total INTEGER DEFAULT 0,
      produtos TEXT,
      erro TEXT,
      FOREIGN KEY (execucao_id) REFERENCES auto_execucoes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      price_cents INTEGER,
      parcelamento TEXT,
      captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_url ON price_history(url, site);

    CREATE TABLE IF NOT EXISTS watch_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'discord',
      preco_alvo_cents INTEGER NOT NULL,
      ultimo_preco_cents INTEGER,
      ultimo_preco_text TEXT,
      ultimo_parcelamento TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      ativo INTEGER NOT NULL DEFAULT 1,
      ultimo_check_em TEXT,
      disparado_em TEXT,
      erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours'))
    );

    CREATE TABLE IF NOT EXISTS watch_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '-3 hours')),
      status TEXT NOT NULL,
      preco_cents INTEGER,
      preco_text TEXT,
      erro TEXT,
      notified INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (alert_id) REFERENCES watch_alerts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_watch_alerts_active ON watch_alerts(ativo, status);
    CREATE INDEX IF NOT EXISTS idx_watch_checks_alert ON watch_checks(alert_id, checked_at);
  `);
}

initDatabase();

// ─── Scheduler ──────────────────────────────────────────────────

const MIN_AUTO_INTERVAL_HOURS = 3;
const DEFAULT_AUTO_INTERVAL_HOURS = 6;
const configuredIntervalHours = Number(process.env.AUTO_INTERVAL_HOURS);
const AUTO_INTERVAL_HOURS = Number.isFinite(configuredIntervalHours)
  ? Math.max(MIN_AUTO_INTERVAL_HOURS, Math.floor(configuredIntervalHours))
  : DEFAULT_AUTO_INTERVAL_HOURS;
const INTERVALO_MS = AUTO_INTERVAL_HOURS * 60 * 60 * 1000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const DISCORD_WEBHOOK_AVATAR_URL = process.env.DISCORD_WEBHOOK_AVATAR_URL || '';
let schedulerStatus: 'idle' | 'executando' | 'agendado' = 'idle';
let proximaExecucao: string | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
const MIN_WATCH_INTERVAL_HOURS = 3;
const DEFAULT_WATCH_INTERVAL_HOURS = 3;
const configuredWatchIntervalHours = Number(process.env.WATCH_INTERVAL_HOURS);
const WATCH_INTERVAL_HOURS = Number.isFinite(configuredWatchIntervalHours)
  ? Math.max(MIN_WATCH_INTERVAL_HOURS, Math.floor(configuredWatchIntervalHours))
  : DEFAULT_WATCH_INTERVAL_HOURS;
const WATCH_INTERVALO_MS = WATCH_INTERVAL_HOURS * 60 * 60 * 1000;
let watchStatus: 'idle' | 'executando' | 'agendado' = 'idle';
let proximaWatchExecucao: string | null = null;
let watchTimer: ReturnType<typeof setInterval> | null = null;

type WatchAlertRow = {
  id: number;
  nome: string;
  url: string;
  site: string;
  canal: string;
  preco_alvo_cents: number;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
  status: string;
  ativo: number;
  ultimo_check_em: string | null;
  disparado_em: string | null;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
};

function truncateDiscord(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function siteNome(site: string): string {
  return SITES[site]?.nome || site;
}

async function enviarWatchDiscord(alerta: WatchAlertRow, precoAtualCents: number, precoAtualText: string, parcelamento: string | null): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) return false;

  const body = {
    username: 'Scraper de Preços',
    ...(DISCORD_WEBHOOK_AVATAR_URL ? { avatar_url: DISCORD_WEBHOOK_AVATAR_URL } : {}),
    embeds: [{
      title: 'Preço alvo atingido',
      description: [
        `**${truncateDiscord(alerta.nome, 120)}**`,
        `Loja: ${siteNome(alerta.site)}`,
        `Preço atual: **${precoAtualText}**`,
        `Preço alvo: **${centsToBrl(alerta.preco_alvo_cents)}**`,
        parcelamento ? `Parcelamento: ${truncateDiscord(parcelamento, 120)}` : null,
        `[Abrir produto](${alerta.url})`,
      ].filter(Boolean).join('\n'),
      color: 0x22c55e,
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[Watch Discord] Falha ao enviar alerta: ${response.status} ${truncateDiscord(detail, 180)}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[Watch Discord] Falha ao enviar alerta: ${error.message}`);
    return false;
  }
}

function normalizarWatchAlert(row: WatchAlertRow) {
  return {
    ...row,
    ativo: Boolean(row.ativo),
    ultimo_check_em: dbDatetimeToApi(row.ultimo_check_em),
    disparado_em: dbDatetimeToApi(row.disparado_em),
    criado_em: dbDatetimeToApi(row.criado_em),
    atualizado_em: dbDatetimeToApi(row.atualizado_em),
  };
}

function calcularProximoHorarioIntervalo(intervalHours: number): Date {
  const now = new Date();
  const hours = now.getHours();
  const nextHour = (Math.floor(hours / intervalHours) + 1) * intervalHours;
  const next = new Date(now);
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return next;
}

function calcularProximoHorario(): Date {
  return calcularProximoHorarioIntervalo(AUTO_INTERVAL_HOURS);
}

function calcularProximoWatchHorario(): Date {
  return calcularProximoHorarioIntervalo(WATCH_INTERVAL_HOURS);
}

async function executarAutoBuscas(): Promise<void> {
  if (schedulerStatus === 'executando') return;
  schedulerStatus = 'executando';
  proximaExecucao = null;

  const configs = db.prepare(
    `SELECT id, termo, site FROM auto_config WHERE ativo = 1 ORDER BY ordem`
  ).all() as { id: number; termo: string; site: string }[];

  if (configs.length === 0) {
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
  insertMany(configs);

  for (const config of configs) {
    try {
      const data = await buscarProduto(config.site, config.termo);
      if ('erro' in data && data.erro) {
        db.prepare(
          `UPDATE auto_resultados SET status = 'erro', erro = ? WHERE execucao_id = ? AND config_id = ?`
        ).run(data.mensagem, execucaoId, config.id);
      } else {
        db.prepare(
          `UPDATE auto_resultados SET status = 'ok', total = ?, produtos = ? WHERE execucao_id = ? AND config_id = ?`
        ).run(data.total, JSON.stringify(data.produtos), execucaoId, config.id);
        salvarPrecos(data.produtos, config.site);
      }
    } catch (err: unknown) {
      const error = err as Error;
      db.prepare(
        `UPDATE auto_resultados SET status = 'erro', erro = ? WHERE execucao_id = ? AND config_id = ?`
      ).run(error.message, execucaoId, config.id);
    }
  }

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

async function executarWatchAlerts(): Promise<void> {
  if (watchStatus === 'executando') return;
  watchStatus = 'executando';
  proximaWatchExecucao = null;

  const alertas = db.prepare(
    `SELECT * FROM watch_alerts WHERE ativo = 1 AND status = 'ativo' ORDER BY id`
  ).all() as WatchAlertRow[];

  if (alertas.length === 0) {
    watchStatus = 'agendado';
    proximaWatchExecucao = formatApiDatetime(calcularProximoWatchHorario());
    return;
  }

  const insertCheck = db.prepare(
    `INSERT INTO watch_checks (alert_id, checked_at, status, preco_cents, preco_text, erro, notified)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  let ok = 0;
  let erros = 0;
  let disparados = 0;
  let precosVerificados = 0;

  for (const alerta of alertas) {
    const checkedAt = formatDbDatetime();
    try {
      const produto = await buscarProdutoPorUrl(alerta.site, alerta.url, alerta.nome);
      const precoCents = brlToCents(produto.price);
      salvarPrecos([produto], alerta.site);

      if (precoCents === null) {
        const erro = 'Preço atual não identificado';
        insertCheck.run(alerta.id, checkedAt, 'erro', null, produto.price, erro, 0);
        erros++;
        db.prepare(
          `UPDATE watch_alerts SET ultimo_check_em = ?, erro = ?, atualizado_em = ? WHERE id = ?`
        ).run(checkedAt, erro, checkedAt, alerta.id);
        continue;
      }

      precosVerificados++;

      if (precoCents <= alerta.preco_alvo_cents) {
        const notified = await enviarWatchDiscord(alerta, precoCents, produto.price || centsToBrl(precoCents), produto.parcelamento);
        const erro = notified ? null : 'Falha ao enviar notificação Discord';
        insertCheck.run(alerta.id, checkedAt, notified ? 'disparado' : 'erro', precoCents, produto.price, erro, notified ? 1 : 0);
        if (notified) {
          disparados++;
        } else {
          erros++;
        }
        db.prepare(
          `UPDATE watch_alerts
           SET ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, ultimo_check_em = ?, status = ?, ativo = ?, disparado_em = ?, erro = ?, atualizado_em = ?
           WHERE id = ?`
        ).run(
          precoCents,
          produto.price,
          produto.parcelamento,
          checkedAt,
          notified ? 'disparado' : 'ativo',
          notified ? 0 : 1,
          notified ? checkedAt : null,
          erro,
          checkedAt,
          alerta.id,
        );
      } else {
        insertCheck.run(alerta.id, checkedAt, 'ok', precoCents, produto.price, null, 0);
        ok++;
        db.prepare(
          `UPDATE watch_alerts
           SET ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, ultimo_check_em = ?, erro = NULL, atualizado_em = ?
           WHERE id = ?`
        ).run(precoCents, produto.price, produto.parcelamento, checkedAt, checkedAt, alerta.id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      insertCheck.run(alerta.id, checkedAt, 'erro', null, null, error.message, 0);
      erros++;
      db.prepare(
        `UPDATE watch_alerts SET ultimo_check_em = ?, erro = ?, atualizado_em = ? WHERE id = ?`
      ).run(checkedAt, error.message, checkedAt, alerta.id);
    }
  }

  console.log(`[Watch] Verificação concluída — ${alertas.length} alerta(s), ${ok} ok, ${disparados} disparado(s), ${erros} erro(s), ${precosVerificados} preço(s) verificado(s)`);
  watchStatus = 'agendado';
  proximaWatchExecucao = formatApiDatetime(calcularProximoWatchHorario());
}

function iniciarScheduler(): void {
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

function iniciarWatchScheduler(): void {
  const next = calcularProximoWatchHorario();
  const delay = Math.max(0, next.getTime() - Date.now());
  proximaWatchExecucao = formatApiDatetime(next);
  if (watchStatus === 'idle') watchStatus = 'agendado';

  setTimeout(() => {
    executarWatchAlerts();
    watchTimer = setInterval(executarWatchAlerts, WATCH_INTERVALO_MS);
  }, delay);
}

function getAutoStatus(): {
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

function getWatchStatus(): {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  total_disparados: number;
  webhook_configurado: boolean;
} {
  const ultimaCheck = db.prepare(
    `SELECT checked_at FROM watch_checks ORDER BY id DESC LIMIT 1`
  ).get() as { checked_at: string } | undefined;

  const totalAtivos = db.prepare(
    `SELECT COUNT(*) as c FROM watch_alerts WHERE ativo = 1 AND status = 'ativo'`
  ).get() as { c: number };

  const totalDisparados = db.prepare(
    `SELECT COUNT(*) as c FROM watch_alerts WHERE status = 'disparado'`
  ).get() as { c: number };

  return {
    status: watchStatus,
    ultima_execucao: ultimaCheck ? dbDatetimeToApi(ultimaCheck.checked_at) : null,
    proxima_execucao: proximaWatchExecucao,
    total_ativos: totalAtivos.c,
    total_disparados: totalDisparados.c,
    webhook_configurado: Boolean(DISCORD_WEBHOOK_URL),
  };
}

function createServer(): http.Server {
  return http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = new URL(req.url!, `http://${req.headers.host || `localhost:${PORT}`}`);
  const pathname = parsedUrl.pathname;

  // ─── API: busca ────────────────────────────────────────────────
  if (pathname === '/api/search' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q');
    const site = parsedUrl.searchParams.get('site') || 'kabum';

    if (!q || !q.trim()) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: 'Parâmetro "q" é obrigatório' }));
      return;
    }

    if (!SITES[site]) {
      res.writeHead(400, jsonHeaders());
      res.end(JSON.stringify({ erro: true, mensagem: `Site "${site}" não encontrado. Opções: ${Object.keys(SITES).join(', ')}` }));
      return;
    }

    res.writeHead(200, jsonHeaders());

    buscarProduto(site, q.trim())
      .then((data) => {
        if (!('erro' in data) || !data.erro) {
          salvarPrecos(data.produtos, site);
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — ${data.total} produto(s) encontrado(s)`);
        } else {
          console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${data.mensagem}`);
        }
        res.end(JSON.stringify(data));
      })
      .catch((err: unknown) => {
        const error = err as Error;
        console.log(`[Busca Manual] "${q.trim()}" em ${SITES[site].nome} — erro: ${error.message}`);
        res.end(JSON.stringify({ erro: true, mensagem: error.message }));
      });

    return;
  }

  // ─── API: lista de sites ────────────────────────────────────────
  if (pathname === '/api/sites' && req.method === 'GET') {
    res.writeHead(200, jsonHeaders());
    const sites = Object.entries(SITES).map(([key, val]) => ({ key, nome: val.nome }));
    res.end(JSON.stringify(sites));
    return;
  }

  // ─── API: auto-config (GET) ────────────────────────────────────
  if (pathname === '/api/auto/config' && req.method === 'GET') {
    const configs = db.prepare(
      `SELECT id, termo, site, ordem FROM auto_config WHERE ativo = 1 ORDER BY ordem`
    ).all();
    sendJson(res, 200, configs);
    return;
  }

  // ─── API: auto-config (POST) ──────────────────────────────────
  if (pathname === '/api/auto/config' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        let entries: { termo: string; site: string }[] = JSON.parse(body);
        if (!Array.isArray(entries)) {
          sendJson(res, 400, { erro: true, mensagem: 'Body deve ser um array de { termo, site }' });
          return;
        }
        entries = entries.filter(e => e.termo && e.termo.trim() && e.site && SITES[e.site]);
        if (entries.length > 10) {
          sendJson(res, 400, { erro: true, mensagem: 'Máximo de 10 produtos permitidos' });
          return;
        }

        const del = db.prepare(`UPDATE auto_config SET ativo = 0 WHERE ativo = 1`);
        const ins = db.prepare(
          `INSERT INTO auto_config (termo, site, ordem) VALUES (?, ?, ?)`
        );

        const save = db.transaction((items: { termo: string; site: string }[]) => {
          del.run();
          items.forEach((item, idx) => {
            ins.run(item.termo.trim(), item.site, idx);
          });
        });
        save(entries);

        const configs = db.prepare(
          `SELECT id, termo, site, ordem FROM auto_config WHERE ativo = 1 ORDER BY ordem`
        ).all();
        sendJson(res, 200, configs);
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return;
  }

  // ─── API: auto-config (DELETE) ────────────────────────────────
  const autoConfigDeleteMatch = pathname.match(/^\/api\/auto\/config\/(\d+)$/);
  if (autoConfigDeleteMatch && req.method === 'DELETE') {
    const id = parseInt(autoConfigDeleteMatch[1], 10);
    db.prepare(`UPDATE auto_config SET ativo = 0 WHERE id = ? AND ativo = 1`).run(id);
    sendJson(res, 200, { ok: true });
    return;
  }

  // ─── API: auto-status ──────────────────────────────────────────
  if (pathname === '/api/auto/status' && req.method === 'GET') {
    sendJson(res, 200, getAutoStatus());
    return;
  }

  // ─── API: auto-results ─────────────────────────────────────────
  if (pathname === '/api/auto/results' && req.method === 'GET') {
    const ultimaExec = db.prepare(
      `SELECT id, iniciada_em, finalizada_em, status FROM auto_execucoes ORDER BY id DESC LIMIT 1`
    ).get() as { id: number; iniciada_em: string; finalizada_em: string | null; status: string } | undefined;

    if (!ultimaExec) {
      sendJson(res, 200, { execucao: null, resultados: [] });
      return;
    }

    const resultados = db.prepare(
      `SELECT id, termo, site, status, total, produtos, erro
       FROM auto_resultados WHERE execucao_id = ? ORDER BY id`
    ).all(ultimaExec.id) as { id: number; termo: string; site: string; status: string; total: number; produtos: string | null; erro: string | null }[];

    const parsed = resultados.map(r => ({
      ...r,
      produtos: r.produtos ? JSON.parse(r.produtos) : [],
    }));

    sendJson(res, 200, {
      execucao: {
        ...ultimaExec,
        iniciada_em: dbDatetimeToApi(ultimaExec.iniciada_em),
        finalizada_em: dbDatetimeToApi(ultimaExec.finalizada_em),
      },
      resultados: parsed,
    });
    return;
  }

  // ─── API: auto-run (manual) ──────────────────────────────────
  if (pathname === '/api/auto/run' && req.method === 'POST') {
    if (schedulerStatus === 'executando') {
      sendJson(res, 409, { erro: true, mensagem: 'Já existe uma execução em andamento' });
      return;
    }
    // Executa sem aguardar (fire-and-forget)
    executarAutoBuscas();
    sendJson(res, 202, { ok: true, mensagem: 'Execução iniciada' });
    return;
  }

  if (pathname === '/api/watch/alerts' && req.method === 'GET') {
    const alertas = db.prepare(
      `SELECT * FROM watch_alerts WHERE ativo = 1 OR status = 'disparado' ORDER BY ativo DESC, id DESC`
    ).all() as WatchAlertRow[];
    sendJson(res, 200, alertas.map(normalizarWatchAlert));
    return;
  }

  if (pathname === '/api/watch/preview' && req.method === 'GET') {
    const url = (parsedUrl.searchParams.get('url') || '').trim();
    const site = (parsedUrl.searchParams.get('site') || 'kabum').trim();

    if (!url || !site) {
      sendJson(res, 400, { erro: true, mensagem: 'Informe URL e site' });
      return;
    }
    if (!SITES[site]) {
      sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
      return;
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo inválido');
    } catch {
      sendJson(res, 400, { erro: true, mensagem: 'URL inválida' });
      return;
    }

    buscarProdutoPorUrl(site, url)
      .then((produto) => {
        console.log(`[Watch] Preview de URL em ${SITES[site].nome} — "${produto.title}"`);
        sendJson(res, 200, produto);
      })
      .catch((err: unknown) => {
        const error = err as Error;
        console.log(`[Watch] Preview de URL em ${SITES[site].nome} — erro: ${error.message}`);
        sendJson(res, 422, { erro: true, mensagem: error.message });
      });
    return;
  }

  if (pathname === '/api/watch/alerts' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body) as {
          nome?: string;
          url?: string;
          site?: string;
          canal?: string;
          preco_alvo?: unknown;
          preco_alvo_cents?: unknown;
          ultimo_preco?: unknown;
          ultimo_preco_cents?: unknown;
          ultimo_parcelamento?: unknown;
        };
        const nome = (data.nome || '').trim();
        const url = (data.url || '').trim();
        const site = (data.site || '').trim();
        const canal = (data.canal || 'discord').trim();
        const precoAlvo = parseTargetPrice(data.preco_alvo_cents ?? data.preco_alvo);
        const ultimoPreco = data.ultimo_preco !== undefined || data.ultimo_preco_cents !== undefined
          ? parseTargetPrice(data.ultimo_preco_cents ?? data.ultimo_preco)
          : null;
        const ultimoPrecoText = typeof data.ultimo_preco === 'string' && data.ultimo_preco.trim()
          ? data.ultimo_preco.trim()
          : null;
        const ultimoParcelamento = typeof data.ultimo_parcelamento === 'string' && data.ultimo_parcelamento.trim()
          ? data.ultimo_parcelamento.trim()
          : null;

        if (!nome || !url || !site || precoAlvo === null) {
          sendJson(res, 400, { erro: true, mensagem: 'Informe nome, URL, site e preço-alvo' });
          return;
        }
        if (!SITES[site]) {
          sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
          return;
        }
        if (canal !== 'discord') {
          sendJson(res, 400, { erro: true, mensagem: 'Canal suportado: discord' });
          return;
        }
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo inválido');
        } catch {
          sendJson(res, 400, { erro: true, mensagem: 'URL inválida' });
          return;
        }

        const now = formatDbDatetime();
        const result = db.prepare(
          `INSERT INTO watch_alerts
             (nome, url, site, canal, preco_alvo_cents, ultimo_preco_cents, ultimo_preco_text, ultimo_parcelamento, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(nome, url, site, canal, precoAlvo, ultimoPreco, ultimoPrecoText, ultimoParcelamento, now, now);

        const alerta = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(result.lastInsertRowid) as WatchAlertRow;
        sendJson(res, 201, normalizarWatchAlert(alerta));
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return;
  }

  const watchAlertMatch = pathname.match(/^\/api\/watch\/alerts\/(\d+)$/);
  if (watchAlertMatch && req.method === 'PATCH') {
    const id = parseInt(watchAlertMatch[1], 10);
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const current = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(id) as WatchAlertRow | undefined;
        if (!current) {
          sendJson(res, 404, { erro: true, mensagem: 'Alerta não encontrado' });
          return;
        }

        const data = JSON.parse(body) as { nome?: string; url?: string; site?: string; canal?: string; preco_alvo?: unknown; preco_alvo_cents?: unknown; status?: string };
        const nome = data.nome !== undefined ? data.nome.trim() : current.nome;
        const url = data.url !== undefined ? data.url.trim() : current.url;
        const site = data.site !== undefined ? data.site.trim() : current.site;
        const canal = data.canal !== undefined ? data.canal.trim() : current.canal;
        const precoAlvo = data.preco_alvo !== undefined || data.preco_alvo_cents !== undefined
          ? parseTargetPrice(data.preco_alvo_cents ?? data.preco_alvo)
          : current.preco_alvo_cents;
        const status = data.status !== undefined ? data.status.trim() : current.status;

        if (!nome || !url || !site || precoAlvo === null) {
          sendJson(res, 400, { erro: true, mensagem: 'Informe nome, URL, site e preço-alvo' });
          return;
        }
        if (!SITES[site]) {
          sendJson(res, 400, { erro: true, mensagem: `Site "${site}" não encontrado` });
          return;
        }
        if (canal !== 'discord') {
          sendJson(res, 400, { erro: true, mensagem: 'Canal suportado: discord' });
          return;
        }
        if (!['ativo', 'pausado', 'disparado'].includes(status)) {
          sendJson(res, 400, { erro: true, mensagem: 'Status inválido' });
          return;
        }

        const now = formatDbDatetime();
        db.prepare(
          `UPDATE watch_alerts
           SET nome = ?, url = ?, site = ?, canal = ?, preco_alvo_cents = ?, status = ?, ativo = ?, atualizado_em = ?
           WHERE id = ?`
        ).run(nome, url, site, canal, precoAlvo, status, status === 'ativo' ? 1 : 0, now, id);

        const alerta = db.prepare(`SELECT * FROM watch_alerts WHERE id = ?`).get(id) as WatchAlertRow;
        sendJson(res, 200, normalizarWatchAlert(alerta));
      } catch {
        sendJson(res, 400, { erro: true, mensagem: 'JSON inválido' });
      }
    });
    return;
  }

  if (watchAlertMatch && req.method === 'DELETE') {
    const id = parseInt(watchAlertMatch[1], 10);
    db.prepare(
      `UPDATE watch_alerts SET ativo = 0, status = 'pausado', atualizado_em = ? WHERE id = ?`
    ).run(formatDbDatetime(), id);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/watch/status' && req.method === 'GET') {
    sendJson(res, 200, getWatchStatus());
    return;
  }

  if (pathname === '/api/watch/run' && req.method === 'POST') {
    if (watchStatus === 'executando') {
      sendJson(res, 409, { erro: true, mensagem: 'Já existe uma verificação em andamento' });
      return;
    }
    executarWatchAlerts();
    sendJson(res, 202, { ok: true, mensagem: 'Verificação iniciada' });
    return;
  }

  // ─── API: price history summary ──────────────────────────────
  if (pathname === '/api/history/summary' && req.method === 'GET') {
    const url = parsedUrl.searchParams.get('url');
    const site = parsedUrl.searchParams.get('site') || 'kabum';
    const days = parseInt(parsedUrl.searchParams.get('days') || '90', 10);

    if (!url) {
      sendJson(res, 400, { erro: true, mensagem: 'Parâmetro "url" é obrigatório' });
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDbDatetime(cutoff);

    const rows = db.prepare(
      `SELECT price_cents, parcelamento, captured_at FROM price_history
       WHERE url = ? AND site = ? AND captured_at >= ?
       ORDER BY captured_at ASC`
    ).all(url, site, cutoffStr) as { price_cents: number | null; parcelamento: string | null; captured_at: string }[];

    if (rows.length === 0) {
      sendJson(res, 404, { erro: true, mensagem: 'Nenhum histórico encontrado' });
      return;
    }

    const cents = rows.map(r => r.price_cents).filter((c): c is number => c !== null);
    const current = cents[cents.length - 1] ?? null;
    const min = cents.length > 0 ? Math.min(...cents) : null;
    const max = cents.length > 0 ? Math.max(...cents) : null;
    const avg = cents.length > 0 ? Math.round(cents.reduce((a, b) => a + b, 0) / cents.length) : null;
    const trendPct = cents.length >= 2 ? parseFloat((((current! - cents[0]) / cents[0]) * 100).toFixed(2)) : null;

    sendJson(res, 200, {
      records: rows.length,
      trend_percent: trendPct,
      current_price: current,
      min_price: min,
      max_price: max,
      avg_price: avg,
      first_seen: dbDatetimeToApi(rows[0].captured_at),
    });
    return;
  }

  // ─── API: price history detail ──────────────────────────────
  if (pathname === '/api/history' && req.method === 'GET') {
    const url = parsedUrl.searchParams.get('url');
    const site = parsedUrl.searchParams.get('site') || 'kabum';
    const days = parseInt(parsedUrl.searchParams.get('days') || '90', 10);

    if (!url) {
      sendJson(res, 400, { erro: true, mensagem: 'Parâmetro "url" é obrigatório' });
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDbDatetime(cutoff);

    const rows = db.prepare(
      `SELECT price_cents, parcelamento, captured_at FROM price_history
       WHERE url = ? AND site = ? AND captured_at >= ?
       ORDER BY captured_at ASC`
    ).all(url, site, cutoffStr) as { price_cents: number | null; parcelamento: string | null; captured_at: string }[];

    if (rows.length === 0) {
      sendJson(res, 404, { erro: true, mensagem: 'Nenhum histórico encontrado' });
      return;
    }

    sendJson(res, 200, rows.map((row) => ({
      ...row,
      captured_at: dbDatetimeToApi(row.captured_at),
    })));
    return;
  }

  // ─── Static: React build (produção) ─────────────────────────
  if (hasReactBuild) {
    const url = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(CLIENT_DIST, url);
    sendStatic(res, filePath, () => {
      if (!path.extname(pathname)) {
        return sendSpa(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404</h1><p>${escapeHtml(pathname)} não encontrado</p>`);
    });
    return;
  }

  // ─── Legacy: servir da raiz ─────────────────────────────────
  const url = pathname === '/' ? '/index.html' : pathname;
  sendStatic(res, path.join(ROOT, url));
  });
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
