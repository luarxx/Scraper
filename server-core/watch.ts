import { buscarProdutoPorUrl, SITES, Produto } from '../scraper';
import { db } from './db';
import { isSiteEnabled } from './enabledSites';
import { registrarMetricaBusca } from './metrics';
import { brlToCents, centsToBrl } from './money';
import { salvarPrecos } from './priceHistory';
import { dbDatetimeToApi, formatApiDatetime, formatDbDatetime } from './time';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const DISCORD_WEBHOOK_AVATAR_URL = process.env.DISCORD_WEBHOOK_AVATAR_URL || '';
const MIN_WATCH_INTERVAL_HOURS = 3;
const DEFAULT_WATCH_INTERVAL_HOURS = 3;
const configuredWatchIntervalHours = Number(process.env.WATCH_INTERVAL_HOURS);
export const WATCH_INTERVAL_HOURS = Number.isFinite(configuredWatchIntervalHours)
  ? Math.max(MIN_WATCH_INTERVAL_HOURS, Math.floor(configuredWatchIntervalHours))
  : DEFAULT_WATCH_INTERVAL_HOURS;

const configuredWatchJitterHours = Number(process.env.WATCH_INTERVAL_JITTER_HOURS);
export const WATCH_INTERVAL_JITTER_HOURS = Number.isFinite(configuredWatchJitterHours)
  ? Math.max(0, Math.floor(configuredWatchJitterHours))
  : 6;

let watchStatus: 'idle' | 'executando' | 'agendado' = 'idle';
let proximaWatchExecucao: string | null = null;
let watchTimer: ReturnType<typeof setTimeout> | null = null;

function sortearIntervaloWatchMs(): number {
  const baseMs = WATCH_INTERVAL_HOURS * 60 * 60 * 1000;
  if (WATCH_INTERVAL_JITTER_HOURS <= 0) return baseMs;
  const extraHours = Math.floor(Math.random() * (WATCH_INTERVAL_JITTER_HOURS + 1));
  return baseMs + extraHours * 60 * 60 * 1000;
}

function agendarProximaWatch(): void {
  const delayMs = sortearIntervaloWatchMs();
  const next = new Date(Date.now() + delayMs);
  proximaWatchExecucao = formatApiDatetime(next);
  watchStatus = 'agendado';

  watchTimer = setTimeout(async () => {
    await executarWatchAlerts();
    agendarProximaWatch();
  }, delayMs);
}

export type WatchAlertRow = {
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

export function normalizarUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.hostname}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export function carregarCacheAutoResultados(): Map<string, Produto> {
  const map = new Map<string, Produto>();

  const ultimaExec = db.prepare(
    `SELECT id FROM auto_execucoes WHERE status = 'concluido' ORDER BY id DESC LIMIT 1`
  ).get() as { id: number } | undefined;

  if (!ultimaExec) return map;

  const resultados = db.prepare(
    `SELECT site, produtos FROM auto_resultados WHERE execucao_id = ? AND status = 'ok' AND produtos IS NOT NULL`
  ).all(ultimaExec.id) as { site: string; produtos: string }[];

  for (const r of resultados) {
    const produtos: Produto[] = JSON.parse(r.produtos);
    for (const p of produtos) {
      const key = normalizarUrl(p.url);
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
  }

  return map;
}

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

export function normalizarWatchAlert(row: WatchAlertRow) {
  return {
    ...row,
    ativo: Boolean(row.ativo),
    ultimo_check_em: dbDatetimeToApi(row.ultimo_check_em),
    disparado_em: dbDatetimeToApi(row.disparado_em),
    criado_em: dbDatetimeToApi(row.criado_em),
    atualizado_em: dbDatetimeToApi(row.atualizado_em),
  };
}

export async function executarWatchAlerts(): Promise<void> {
  if (watchStatus === 'executando') return;
  watchStatus = 'executando';
  proximaWatchExecucao = null;

  const alertas = db.prepare(
    `SELECT * FROM watch_alerts WHERE ativo = 1 AND status = 'ativo' ORDER BY id`
  ).all() as WatchAlertRow[];

  const alertasFiltrados = alertas.filter(a => isSiteEnabled(a.site));

  if (alertasFiltrados.length === 0) {
    watchStatus = 'agendado';
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
  let resolvidosPorAuto = 0;

  const cacheAuto = carregarCacheAutoResultados();

  for (const alerta of alertasFiltrados) {
    const checkedAt = formatDbDatetime();
    const startedAt = Date.now();

    const urlNormalizada = normalizarUrl(alerta.url);
    const produtoCached = cacheAuto.get(urlNormalizada);

    if (produtoCached) {
      const cachedPriceCents = brlToCents(produtoCached.price);

      if (cachedPriceCents !== null) {
        if (cachedPriceCents === alerta.ultimo_preco_cents) {
          console.log(`[Watch] Alerta "${alerta.nome}" em ${siteNome(alerta.site)} — cache com mesmo preço, forçando scrape real`);
        } else {
          resolvidosPorAuto++;
          const produto = { ...produtoCached, site: alerta.site, siteNome: siteNome(alerta.site), timestamp: new Date().toISOString() };
          console.log(`[Watch] Alerta "${alerta.nome}" em ${siteNome(alerta.site)} — resolvido via Busca Automática, preço ${produto.price || 'N/D'}`);
          const precoCents = cachedPriceCents;
          salvarPrecos([produto], alerta.site);

          precosVerificados++;

          if (precoCents <= alerta.preco_alvo_cents) {
            const notified = await enviarWatchDiscord(alerta, precoCents, produto.price || centsToBrl(precoCents), produto.parcelamento);
            const erro = notified ? null : 'Falha ao enviar notificação Discord';
            insertCheck.run(alerta.id, checkedAt, notified ? 'disparado' : 'erro', precoCents, produto.price, erro, notified ? 1 : 0);
            registrarMetricaBusca({
              origem: 'watch',
              site: alerta.site,
              termo: alerta.nome,
              url: alerta.url,
              status: notified ? 'ok' : 'erro',
              total: 1,
              duracaoMs: Date.now() - startedAt,
              erro,
            });
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
            registrarMetricaBusca({
              origem: 'watch',
              site: alerta.site,
              termo: alerta.nome,
              url: alerta.url,
              status: 'ok',
              total: 1,
              duracaoMs: Date.now() - startedAt,
            });
            ok++;
            db.prepare(
              `UPDATE watch_alerts
               SET ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, ultimo_check_em = ?, erro = NULL, atualizado_em = ?
               WHERE id = ?`
            ).run(precoCents, produto.price, produto.parcelamento, checkedAt, checkedAt, alerta.id);
          }
          continue;
        }
      } else {
        console.log(`[Watch] Alerta "${alerta.nome}" em ${siteNome(alerta.site)} — cache sem preço, buscando direto`);
      }
    }

    try {
      const produto = await buscarProdutoPorUrl(alerta.site, alerta.url, alerta.nome);
      console.log(`[Watch] Alerta "${alerta.nome}" em ${siteNome(alerta.site)} — preço ${produto.price || 'N/D'}${produto.priceSource ? ` (${produto.priceSource})` : ''}`);
      const precoCents = brlToCents(produto.price);
      salvarPrecos([produto], alerta.site);

      if (precoCents === null) {
        const erro = 'Preço atual não identificado';
        insertCheck.run(alerta.id, checkedAt, 'erro', null, produto.price, erro, 0);
        registrarMetricaBusca({
          origem: 'watch',
          site: alerta.site,
          termo: alerta.nome,
          url: alerta.url,
          status: 'erro',
          total: 0,
          duracaoMs: Date.now() - startedAt,
          erro,
        });
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
        registrarMetricaBusca({
          origem: 'watch',
          site: alerta.site,
          termo: alerta.nome,
          url: alerta.url,
          status: notified ? 'ok' : 'erro',
          total: 1,
          duracaoMs: Date.now() - startedAt,
          erro,
        });
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
        registrarMetricaBusca({
          origem: 'watch',
          site: alerta.site,
          termo: alerta.nome,
          url: alerta.url,
          status: 'ok',
          total: 1,
          duracaoMs: Date.now() - startedAt,
        });
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
      registrarMetricaBusca({
        origem: 'watch',
        site: alerta.site,
        termo: alerta.nome,
        url: alerta.url,
        status: 'erro',
        total: 0,
        duracaoMs: Date.now() - startedAt,
        erro: error.message,
      });
      erros++;
      db.prepare(
        `UPDATE watch_alerts SET ultimo_check_em = ?, erro = ?, atualizado_em = ? WHERE id = ?`
      ).run(checkedAt, error.message, checkedAt, alerta.id);
    }
  }

  console.log(`[Watch] Verificação concluída — ${alertasFiltrados.length} alerta(s), ${ok} ok, ${disparados} disparado(s), ${erros} erro(s), ${precosVerificados} preço(s) verificado(s)${resolvidosPorAuto > 0 ? `, ${resolvidosPorAuto} resolvido(s) via Busca Automática` : ''}`);
  watchStatus = 'agendado';
}

export function iniciarWatchScheduler(): void {
  agendarProximaWatch();
}

export function getWatchStatus(): {
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

export function isWatchRunning(): boolean {
  return watchStatus === 'executando';
}
