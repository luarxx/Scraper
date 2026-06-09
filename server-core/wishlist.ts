import { buscarProdutoPorUrl, SITES } from '../scraper';
import { db } from './db';
import { registrarMetricaBusca } from './metrics';
import { brlToCents, centsToBrl } from './money';
import { salvarPrecos } from './priceHistory';
import { calcularProximoHorarioIntervalo, dbDatetimeToApi, formatApiDatetime, formatDbDatetime } from './time';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const DISCORD_WEBHOOK_AVATAR_URL = process.env.DISCORD_WEBHOOK_AVATAR_URL || '';
const MIN_WISHLIST_INTERVAL_HOURS = 3;
const DEFAULT_WISHLIST_INTERVAL_HOURS = 3;
const configuredWishlistIntervalHours = Number(process.env.WISHLIST_INTERVAL_HOURS);
export const WISHLIST_INTERVAL_HOURS = Number.isFinite(configuredWishlistIntervalHours)
  ? Math.max(MIN_WISHLIST_INTERVAL_HOURS, Math.floor(configuredWishlistIntervalHours))
  : DEFAULT_WISHLIST_INTERVAL_HOURS;
const WISHLIST_INTERVALO_MS = WISHLIST_INTERVAL_HOURS * 60 * 60 * 1000;
let wishlistStatus: 'idle' | 'executando' | 'agendado' = 'idle';
let proximaWishlistExecucao: string | null = null;
let wishlistTimer: ReturnType<typeof setInterval> | null = null;

export type WishlistItemRow = {
  id: number;
  title: string;
  url: string;
  site: string;
  image: string | null;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
  status: string;
  ativo: number;
  ultimo_check_em: string | null;
  ultimo_disparo_em: string | null;
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

async function enviarWishlistDiscord(
  item: WishlistItemRow,
  precoAnteriorCents: number,
  precoAtualCents: number,
  precoAtualText: string,
  parcelamento: string | null,
): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) return false;

  const body = {
    username: 'Scraper de Preços',
    ...(DISCORD_WEBHOOK_AVATAR_URL ? { avatar_url: DISCORD_WEBHOOK_AVATAR_URL } : {}),
    embeds: [{
      title: 'Queda na lista de desejos',
      description: [
        `**${truncateDiscord(item.title, 120)}**`,
        `Loja: ${siteNome(item.site)}`,
        `Preço anterior: **${centsToBrl(precoAnteriorCents)}**`,
        `Preço atual: **${precoAtualText}**`,
        `Queda: **${centsToBrl(precoAnteriorCents - precoAtualCents)}**`,
        parcelamento ? `Parcelamento: ${truncateDiscord(parcelamento, 120)}` : null,
        `[Abrir produto](${item.url})`,
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
      console.error(`[Desejos Discord] Falha ao enviar alerta: ${response.status} ${truncateDiscord(detail, 180)}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[Desejos Discord] Falha ao enviar alerta: ${error.message}`);
    return false;
  }
}

function parseWishlistInput(data: {
  title?: string;
  url?: string;
  site?: string;
  image?: unknown;
  price?: unknown;
  parcelamento?: unknown;
}): {
  title: string;
  url: string;
  site: string;
  image: string | null;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
} {
  const title = (data.title || '').trim();
  const url = (data.url || '').trim();
  const site = (data.site || '').trim();
  const image = typeof data.image === 'string' && data.image.trim() ? data.image.trim() : null;
  const ultimo_preco_text = typeof data.price === 'string' && data.price.trim() ? data.price.trim() : null;
  const ultimo_preco_cents = parsePriceValue(data.price);
  const ultimo_parcelamento = typeof data.parcelamento === 'string' && data.parcelamento.trim()
    ? data.parcelamento.trim()
    : null;

  return { title, url, site, image, ultimo_preco_cents, ultimo_preco_text, ultimo_parcelamento };
}

function parsePriceValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;
  return brlToCents(value);
}

export function normalizarWishlistItem(row: WishlistItemRow) {
  return {
    ...row,
    ativo: Boolean(row.ativo),
    ultimo_check_em: dbDatetimeToApi(row.ultimo_check_em),
    ultimo_disparo_em: dbDatetimeToApi(row.ultimo_disparo_em),
    criado_em: dbDatetimeToApi(row.criado_em),
    atualizado_em: dbDatetimeToApi(row.atualizado_em),
  };
}

function calcularProximoWishlistHorario(): Date {
  return calcularProximoHorarioIntervalo(WISHLIST_INTERVAL_HOURS);
}

export async function executarWishlistChecks(): Promise<void> {
  if (wishlistStatus === 'executando') return;
  wishlistStatus = 'executando';
  proximaWishlistExecucao = null;

  const itens = db.prepare(
    `SELECT * FROM wishlist_items WHERE ativo = 1 AND status = 'ativo' ORDER BY id`
  ).all() as WishlistItemRow[];

  if (itens.length === 0) {
    wishlistStatus = 'agendado';
    proximaWishlistExecucao = formatApiDatetime(calcularProximoWishlistHorario());
    return;
  }

  const insertCheck = db.prepare(
    `INSERT INTO wishlist_checks (item_id, checked_at, status, preco_cents, preco_text, erro, notified)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  let ok = 0;
  let erros = 0;
  let disparados = 0;
  let precosVerificados = 0;

  for (const item of itens) {
    const checkedAt = formatDbDatetime();
    const startedAt = Date.now();
    try {
      const produto = await buscarProdutoPorUrl(item.site, item.url, item.title);
      console.log(`[Desejos] Item "${item.title}" em ${siteNome(item.site)} — preço ${produto.price || 'N/D'}${produto.priceSource ? ` (${produto.priceSource})` : ''}`);
      const precoCents = brlToCents(produto.price);
      salvarPrecos([produto], item.site);

      if (precoCents === null) {
        const erro = 'Preço atual não identificado';
        insertCheck.run(item.id, checkedAt, 'erro', null, produto.price, erro, 0);
        registrarMetricaBusca({
          origem: 'wishlist',
          site: item.site,
          termo: item.title,
          url: item.url,
          status: 'erro',
          total: 0,
          duracaoMs: Date.now() - startedAt,
          erro,
        });
        erros++;
        db.prepare(
          `UPDATE wishlist_items SET ultimo_check_em = ?, erro = ?, atualizado_em = ? WHERE id = ?`
        ).run(checkedAt, erro, checkedAt, item.id);
        continue;
      }

      precosVerificados++;
      const previousPriceCents = item.ultimo_preco_cents;
      const shouldNotify = previousPriceCents !== null && precoCents < previousPriceCents;
      const priceText = produto.price || centsToBrl(precoCents);
      const discordSent = shouldNotify
        ? await enviarWishlistDiscord(item, previousPriceCents, precoCents, priceText, produto.parcelamento)
        : true;
      const erro = shouldNotify && !discordSent ? 'Falha ao enviar notificação Discord' : null;

      insertCheck.run(item.id, checkedAt, shouldNotify ? (discordSent ? 'disparado' : 'erro') : 'ok', precoCents, produto.price, erro, shouldNotify && discordSent ? 1 : 0);
      registrarMetricaBusca({
        origem: 'wishlist',
        site: item.site,
        termo: item.title,
        url: item.url,
        status: erro ? 'erro' : 'ok',
        total: 1,
        duracaoMs: Date.now() - startedAt,
        erro,
      });

      if (shouldNotify && discordSent) disparados++;
      else if (erro) erros++;
      else ok++;

      db.prepare(
        `UPDATE wishlist_items
         SET title = ?, image = ?, ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, ultimo_check_em = ?, ultimo_disparo_em = ?, erro = ?, ativo = ?, status = ?, atualizado_em = ?
         WHERE id = ?`
      ).run(
        produto.title || item.title,
        produto.image || item.image,
        precoCents,
        produto.price,
        produto.parcelamento,
        checkedAt,
        shouldNotify && discordSent ? checkedAt : item.ultimo_disparo_em,
        erro,
        1,
        'ativo',
        checkedAt,
        item.id,
      );
    } catch (err: unknown) {
      const error = err as Error;
      insertCheck.run(item.id, checkedAt, 'erro', null, null, error.message, 0);
      registrarMetricaBusca({
        origem: 'wishlist',
        site: item.site,
        termo: item.title,
        url: item.url,
        status: 'erro',
        total: 0,
        duracaoMs: Date.now() - startedAt,
        erro: error.message,
      });
      erros++;
      db.prepare(
        `UPDATE wishlist_items SET ultimo_check_em = ?, erro = ?, atualizado_em = ? WHERE id = ?`
      ).run(checkedAt, error.message, checkedAt, item.id);
    }
  }

  console.log(`[Desejos] Verificação concluída — ${itens.length} item(s), ${ok} ok, ${disparados} disparado(s), ${erros} erro(s), ${precosVerificados} preço(s) verificado(s)`);
  wishlistStatus = 'agendado';
  proximaWishlistExecucao = formatApiDatetime(calcularProximoWishlistHorario());
}

export function iniciarWishlistScheduler(): void {
  const next = calcularProximoWishlistHorario();
  const delay = Math.max(0, next.getTime() - Date.now());
  proximaWishlistExecucao = formatApiDatetime(next);
  if (wishlistStatus === 'idle') wishlistStatus = 'agendado';

  setTimeout(() => {
    executarWishlistChecks();
    wishlistTimer = setInterval(executarWishlistChecks, WISHLIST_INTERVALO_MS);
  }, delay);
}

export function getWishlistStatus(): {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  total_disparados: number;
  webhook_configurado: boolean;
} {
  const ultimaCheck = db.prepare(
    `SELECT checked_at FROM wishlist_checks ORDER BY id DESC LIMIT 1`
  ).get() as { checked_at: string } | undefined;

  const totalAtivos = db.prepare(
    `SELECT COUNT(*) as c FROM wishlist_items WHERE ativo = 1 AND status = 'ativo'`
  ).get() as { c: number };

  const totalDisparados = db.prepare(
    `SELECT COUNT(*) as c FROM wishlist_checks WHERE status = 'disparado'`
  ).get() as { c: number };

  return {
    status: wishlistStatus,
    ultima_execucao: ultimaCheck ? dbDatetimeToApi(ultimaCheck.checked_at) : null,
    proxima_execucao: proximaWishlistExecucao,
    total_ativos: totalAtivos.c,
    total_disparados: totalDisparados.c,
    webhook_configurado: Boolean(DISCORD_WEBHOOK_URL),
  };
}

export function isWishlistRunning(): boolean {
  return wishlistStatus === 'executando';
}

export function upsertWishlistItem(input: {
  title: string;
  url: string;
  site: string;
  image: string | null;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
}) {
  const now = formatDbDatetime();
  const existing = db.prepare(
    `SELECT * FROM wishlist_items WHERE url = ? AND site = ?`
  ).get(input.url, input.site) as WishlistItemRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE wishlist_items
       SET title = ?, image = ?, ultimo_preco_cents = ?, ultimo_preco_text = ?, ultimo_parcelamento = ?, ativo = 1, status = 'ativo', erro = NULL, atualizado_em = ?
       WHERE id = ?`
    ).run(
      input.title,
      input.image,
      input.ultimo_preco_cents,
      input.ultimo_preco_text,
      input.ultimo_parcelamento,
      now,
      existing.id,
    );
    return db.prepare(`SELECT * FROM wishlist_items WHERE id = ?`).get(existing.id) as WishlistItemRow;
  }

  const result = db.prepare(
    `INSERT INTO wishlist_items
       (title, url, site, image, ultimo_preco_cents, ultimo_preco_text, ultimo_parcelamento, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.title,
    input.url,
    input.site,
    input.image,
    input.ultimo_preco_cents,
    input.ultimo_preco_text,
    input.ultimo_parcelamento,
    now,
    now,
  );

  return db.prepare(`SELECT * FROM wishlist_items WHERE id = ?`).get(result.lastInsertRowid) as WishlistItemRow;
}

export function parseWishlistCreateBody(body: string): {
  ok: boolean;
  error?: string;
  item?: ReturnType<typeof parseWishlistInput>;
} {
  try {
    const data = JSON.parse(body) as {
      title?: string;
      url?: string;
      site?: string;
      image?: unknown;
      price?: unknown;
      parcelamento?: unknown;
    };
    const item = parseWishlistInput(data);
    if (!item.title || !item.url || !item.site) {
      return { ok: false, error: 'Informe título, URL e site' };
    }
    if (!SITES[item.site]) {
      return { ok: false, error: `Site "${item.site}" não encontrado` };
    }
    try {
      const parsed = new URL(item.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo inválido');
    } catch {
      return { ok: false, error: 'URL inválida' };
    }
    return { ok: true, item };
  } catch {
    return { ok: false, error: 'JSON inválido' };
  }
}
