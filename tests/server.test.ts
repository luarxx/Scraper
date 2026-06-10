import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const buscarProdutoMock = vi.fn();
const buscarProdutoPorUrlMock = vi.fn();

type ServerModule = typeof import('../server');
type ImportServerOptions = {
  auto?: string;
  autoConcurrency?: string;
  watch?: string;
  wishlist?: string;
  webhook?: string;
  legacyAutoConfig?: boolean;
};

async function importServer(options: ImportServerOptions = {}): Promise<ServerModule> {
  vi.resetModules();
  buscarProdutoMock.mockReset();
  buscarProdutoPorUrlMock.mockReset();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-tests-'));
  process.env.SCRAPER_DB_PATH = path.join(dir, 'scraper.db');
  process.env.AUTO_INTERVAL_HOURS = options.auto;
  process.env.AUTO_MAX_CONCURRENCY = options.autoConcurrency;
  process.env.WATCH_INTERVAL_HOURS = options.watch;
  process.env.WISHLIST_INTERVAL_HOURS = options.wishlist;
  process.env.DISCORD_WEBHOOK_URL = options.webhook || '';
  process.env.DISCORD_WEBHOOK_AVATAR_URL = '';

  if (options.legacyAutoConfig) {
    const legacyDb = new Database(process.env.SCRAPER_DB_PATH);
    legacyDb.exec(`
      CREATE TABLE auto_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        termo TEXT NOT NULL,
        site TEXT NOT NULL
      );
      INSERT INTO auto_config (termo, site) VALUES ('ssd', 'kabum');
    `);
    legacyDb.close();
  }

  vi.doMock('../scraper', () => ({
    SITES: {
      kabum: { nome: 'KaBuM!' },
      pichau: { nome: 'Pichau' },
      terabyteshop: { nome: 'TerabyteShop' },
    },
    buscarProduto: buscarProdutoMock,
    buscarProdutoPorUrl: buscarProdutoPorUrlMock,
  }));

  return import('../server');
}

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta TCP');
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: http.Server | null): Promise<void> {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  });
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 1000) throw new Error('Timeout aguardando condição');
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

async function jsonRequest(baseUrl: string, pathname: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const body = await res.json();
  return { res, body };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.SCRAPER_DB_PATH;
  delete process.env.AUTO_INTERVAL_HOURS;
  delete process.env.AUTO_MAX_CONCURRENCY;
  delete process.env.WATCH_INTERVAL_HOURS;
  delete process.env.WISHLIST_INTERVAL_HOURS;
  delete process.env.DISCORD_WEBHOOK_URL;
  vi.doUnmock('../scraper');
});

describe('server helpers', () => {
  it('aplica intervalo mínimo de 3 horas', async () => {
    const mod = await importServer({ auto: '1', watch: '2', wishlist: '1' });

    expect(mod.AUTO_INTERVAL_HOURS).toBe(3);
    expect(mod.AUTO_MAX_CONCURRENCY).toBe(3);
    expect(mod.WATCH_INTERVAL_HOURS).toBe(3);
    expect(mod.WISHLIST_INTERVAL_HOURS).toBe(3);

    mod.db.close();
  });

  it('normaliza concorrência máxima da busca automática', async () => {
    const defaultMod = await importServer();
    expect(defaultMod.AUTO_MAX_CONCURRENCY).toBe(3);
    defaultMod.db.close();

    const minMod = await importServer({ autoConcurrency: '0' });
    expect(minMod.AUTO_MAX_CONCURRENCY).toBe(1);
    minMod.db.close();

    const invalidMod = await importServer({ autoConcurrency: 'abc' });
    expect(invalidMod.AUTO_MAX_CONCURRENCY).toBe(3);
    invalidMod.db.close();

    const maxMod = await importServer({ autoConcurrency: '12' });
    expect(maxMod.AUTO_MAX_CONCURRENCY).toBe(10);
    maxMod.db.close();
  });

  it('resolve a raiz do projeto quando roda compilado em dist/server-core', async () => {
    const mod = await importServer();

    expect(mod.resolveProjectRoot(path.join('home', 'ubuntu', 'Scraper', 'dist', 'server-core')))
      .toBe(path.resolve('home', 'ubuntu', 'Scraper'));

    mod.db.close();
  });

  it('calcula próxima execução na próxima grade horária', async () => {
    const mod = await importServer({ auto: '3', watch: '3' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T10:15:00-03:00'));

    expect(mod.calcularProximoHorarioIntervalo(3).toISOString()).toBe(new Date('2026-06-05T12:00:00-03:00').toISOString());

    mod.db.close();
  });

  it('converte preços BRL e alvos para centavos', async () => {
    const mod = await importServer();

    expect(mod.brlToCents('R$ 1.234,56')).toBe(123456);
    expect(mod.brlToCents('1299.90')).toBe(129990);
    expect(mod.brlToCents('4.490')).toBe(449000);
    expect(mod.brlToCents('4.490,00')).toBe(449000);
    expect(mod.brlToCents('4490')).toBe(449000);
    expect(mod.centsToBrl(123456).replace(/\s/, ' ')).toBe('R$ 1.234,56');
    expect(mod.parseTargetPrice('R$ 799,90')).toBe(79990);
    expect(mod.parseTargetPrice('4.490')).toBe(449000);
    expect(mod.parseTargetPrice(79990)).toBe(79990);

    mod.db.close();
  });

  it('migra configuração automática legada sem coluna ativo', async () => {
    const mod = await importServer({ legacyAutoConfig: true });
    const server = mod.createServer();
    const baseUrl = await listen(server);
    const row = mod.db.prepare(`SELECT termo, site, ordem, ativo FROM auto_config`).get() as {
      termo: string;
      site: string;
      ordem: number;
      ativo: number;
    };

    expect(row).toEqual({ termo: 'ssd', site: 'kabum', ordem: 0, ativo: 1 });
    expect(mod.getAutoStatus().total_configurados).toBe(1);
    expect((await jsonRequest(baseUrl, '/api/auto/config')).body).toEqual([
      { id: 1, termo: 'ssd', site: 'kabum', ordem: 0 },
    ]);

    await closeServer(server);
    mod.db.close();
  });
});

describe('server API', () => {
  let server: http.Server | null = null;

  afterEach(async () => {
    await closeServer(server);
    server = null;
  });

  it('expõe sites, busca manual, auto config, status e results', async () => {
    const mod = await importServer();
    server = mod.createServer();
    const baseUrl = await listen(server);

    buscarProdutoMock.mockResolvedValue({
      termo: 'ssd',
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: '2026-06-05T10:00:00.000Z',
      total: 1,
      produtos: [{
        title: 'SSD NVMe',
        price: 'R$ 299,90',
        parcelamento: null,
        image: '',
        url: 'https://loja.test/ssd',
        relevancia: 1,
      }],
    });

    expect((await jsonRequest(baseUrl, '/api/sites')).body).toEqual([
      { key: 'kabum', nome: 'KaBuM!' },
      { key: 'pichau', nome: 'Pichau' },
      { key: 'terabyteshop', nome: 'TerabyteShop' },
    ]);

    const search = await jsonRequest(baseUrl, '/api/search?q=ssd&site=kabum');
    expect(search.res.status).toBe(200);
    expect(search.body.total).toBe(1);
    expect(buscarProdutoMock).toHaveBeenCalledWith('kabum', 'ssd');
    expect((await jsonRequest(baseUrl, '/api/stats/dashboard')).body).toMatchObject({
      total_buscas: 1,
      sucessos: 1,
      erros: 0,
      taxa_sucesso: 100,
      sites: [expect.objectContaining({ site: 'kabum', total: 1, sucessos: 1, erros: 0 })],
    });

    mod.db.prepare(
      `INSERT INTO search_metrics (origem, site, termo, status, total, duracao_ms, erro, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('manual', 'pichau', 'gpu', 'erro', 0, 900, 'Falha mockada', '2026-06-05 10:03:00');
    mod.db.prepare(
      `INSERT INTO search_metrics (origem, site, termo, status, total, duracao_ms, erro, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('auto', 'terabyteshop', 'ram', 'ok', 0, 200, null, '2026-06-05 10:04:00');

    const dashboard = await jsonRequest(baseUrl, '/api/stats/dashboard');
    expect(dashboard.res.status).toBe(200);
    expect(dashboard.body.total_buscas).toBe(3);
    expect(dashboard.body.taxa_sucesso).toBeCloseTo(66.67, 2);
    expect(dashboard.body.tempo_medio_resposta_ms).toBeGreaterThan(0);
    expect(dashboard.body.sites.map((item: { site: string }) => item.site)).toEqual(['kabum', 'terabyteshop', 'pichau']);

    const saved = await jsonRequest(baseUrl, '/api/auto/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ termo: 'ssd', site: 'kabum' }, { termo: 'gpu', site: 'pichau' }]),
    });
    expect(saved.res.status).toBe(200);
    expect(saved.body).toHaveLength(2);

    expect((await jsonRequest(baseUrl, '/api/auto/config')).body.map((item: { termo: string }) => item.termo)).toEqual(['ssd', 'gpu']);

    const deleteRes = await jsonRequest(baseUrl, `/api/auto/config/${saved.body[0].id}`, { method: 'DELETE' });
    expect(deleteRes.body).toEqual({ ok: true });
    expect((await jsonRequest(baseUrl, '/api/auto/status')).body.total_configurados).toBe(1);

    const exec = mod.db.prepare(`INSERT INTO auto_execucoes (iniciada_em, finalizada_em, status) VALUES (?, ?, ?)`)
      .run('2026-06-05 10:00:00', '2026-06-05 10:01:00', 'concluido');
    mod.db.prepare(`INSERT INTO auto_resultados (execucao_id, termo, site, status, total, produtos, erro) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(exec.lastInsertRowid, 'gpu', 'pichau', 'ok', 1, JSON.stringify([{ title: 'GPU', price: 'R$ 1.999,90', parcelamento: null, image: '', url: 'u', relevancia: 1 }]), null);

    const results = await jsonRequest(baseUrl, '/api/auto/results');
    expect(results.body.execucao.status).toBe('concluido');
    expect(results.body.resultados[0].produtos[0].title).toBe('GPU');

    mod.db.close();
  });

  it('cria, atualiza, lista e pausa alertas Watch', async () => {
    const mod = await importServer();
    server = mod.createServer();
    const baseUrl = await listen(server);

    const created = await jsonRequest(baseUrl, '/api/watch/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'SSD NVMe',
        url: 'https://www.kabum.com.br/produto/1',
        site: 'kabum',
        canal: 'discord',
        preco_alvo: 'R$ 299,90',
        ultimo_preco: 'R$ 329,90',
        ultimo_parcelamento: 'No PIX ou 10x de R$ 36,65',
      }),
    });
    expect(created.res.status).toBe(201);
    expect(created.body.preco_alvo_cents).toBe(29990);
    expect(created.body.ultimo_preco_cents).toBe(32990);
    expect(created.body.ultimo_preco_text).toBe('R$ 329,90');
    expect(created.body.ultimo_parcelamento).toBe('No PIX ou 10x de R$ 36,65');
    expect(created.body.ativo).toBe(true);

    const patched = await jsonRequest(baseUrl, `/api/watch/alerts/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preco_alvo: 'R$ 249,90' }),
    });
    expect(patched.body.preco_alvo_cents).toBe(24990);

    expect((await jsonRequest(baseUrl, '/api/watch/alerts')).body).toHaveLength(1);
    expect((await jsonRequest(baseUrl, '/api/watch/status')).body.total_ativos).toBe(1);

    const removed = await jsonRequest(baseUrl, `/api/watch/alerts/${created.body.id}`, { method: 'DELETE' });
    expect(removed.body).toEqual({ ok: true });
    expect((await jsonRequest(baseUrl, '/api/watch/status')).body.total_ativos).toBe(0);

    mod.db.close();
  });

  it('salva, deduplica e remove itens da lista de desejos', async () => {
    const mod = await importServer();
    server = mod.createServer();
    const baseUrl = await listen(server);

    const created = await jsonRequest(baseUrl, '/api/wishlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'SSD NVMe',
        url: 'https://www.kabum.com.br/produto/1',
        site: 'kabum',
        image: 'https://img.test/ssd.png',
        price: 'R$ 329,90',
        parcelamento: '10x de R$ 32,99',
      }),
    });
    expect(created.res.status).toBe(201);
    expect(created.body.ultimo_preco_cents).toBe(32990);
    expect(created.body.ativo).toBe(true);

    const updated = await jsonRequest(baseUrl, '/api/wishlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'SSD NVMe atualizado',
        url: 'https://www.kabum.com.br/produto/1',
        site: 'kabum',
        image: 'https://img.test/ssd-new.png',
        price: 'R$ 299,90',
        parcelamento: 'No PIX',
      }),
    });
    expect(updated.res.status).toBe(201);
    expect(updated.body.id).toBe(created.body.id);
    expect(updated.body.title).toBe('SSD NVMe atualizado');
    expect(updated.body.ultimo_preco_cents).toBe(29990);

    const list = await jsonRequest(baseUrl, '/api/wishlist/items');
    expect(list.body).toHaveLength(1);
    expect((await jsonRequest(baseUrl, '/api/wishlist/status')).body.total_ativos).toBe(1);

    const removed = await jsonRequest(baseUrl, `/api/wishlist/items/${created.body.id}`, { method: 'DELETE' });
    expect(removed.body).toEqual({ ok: true });
    expect((await jsonRequest(baseUrl, '/api/wishlist/items')).body).toHaveLength(0);
    expect((await jsonRequest(baseUrl, '/api/wishlist/status')).body.total_ativos).toBe(0);

    mod.db.close();
  });

  it('pré-visualiza produto Watch pela URL', async () => {
    const mod = await importServer();
    server = mod.createServer();
    const baseUrl = await listen(server);

    buscarProdutoPorUrlMock.mockResolvedValue({
      title: 'SSD NVMe',
      price: 'R$ 299,90',
      parcelamento: null,
      image: '',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 0,
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: '2026-06-05T10:00:00.000Z',
    });

    const preview = await jsonRequest(baseUrl, '/api/watch/preview?site=kabum&url=https%3A%2F%2Fwww.kabum.com.br%2Fproduto%2F1');

    expect(preview.res.status).toBe(200);
    expect(preview.body.title).toBe('SSD NVMe');
    expect(buscarProdutoPorUrlMock).toHaveBeenCalledWith('kabum', 'https://www.kabum.com.br/produto/1');

    mod.db.close();
  });
});

describe('watch scheduler rules', () => {
  it('não envia Discord para resultados da busca automática', async () => {
    const mod = await importServer({ webhook: 'https://discord.test/webhook' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    buscarProdutoMock.mockResolvedValue({
      termo: 'ssd',
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: new Date().toISOString(),
      total: 1,
      produtos: [{
        title: 'SSD NVMe',
        price: 'R$ 199,90',
        parcelamento: null,
        image: '',
        url: 'https://www.kabum.com.br/produto/1',
        relevancia: 1,
      }],
    });

    mod.db.prepare(`INSERT INTO auto_config (termo, site, ordem, criado_em) VALUES (?, ?, ?, ?)`)
      .run('ssd', 'kabum', 1, '2026-06-05 10:00:00');

    await mod.executarAutoBuscas();

    const resultado = mod.db.prepare(`SELECT status, total FROM auto_resultados`).get() as { status: string; total: number };
    expect(resultado).toEqual({ status: 'ok', total: 1 });
    const metric = mod.db.prepare(`SELECT origem, site, termo, status, total FROM search_metrics`).get() as { origem: string; site: string; termo: string; status: string; total: number };
    expect(metric).toEqual({ origem: 'auto', site: 'kabum', termo: 'ssd', status: 'ok', total: 1 });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    mod.db.close();
  });

  it('executa busca automática com até 3 buscas simultâneas', async () => {
    const mod = await importServer({ autoConcurrency: '3' });
    const started: string[] = [];
    const resolvers = new Map<string, () => void>();

    buscarProdutoMock.mockImplementation((site: string, termo: string) => {
      started.push(termo);
      return new Promise((resolve) => {
        resolvers.set(termo, () => resolve({
          termo,
          site,
          siteNome: site,
          timestamp: new Date().toISOString(),
          total: 1,
          produtos: [{
            title: termo,
            price: 'R$ 199,90',
            parcelamento: null,
            image: '',
            url: `https://loja.test/${termo}`,
            relevancia: 1,
          }],
        }));
      });
    });

    for (const [ordem, termo] of ['ssd', 'gpu', 'cpu', 'ram'].entries()) {
      mod.db.prepare(`INSERT INTO auto_config (termo, site, ordem, criado_em) VALUES (?, ?, ?, ?)`)
        .run(termo, 'kabum', ordem, '2026-06-05 10:00:00');
    }

    const runPromise = mod.executarAutoBuscas();

    await waitUntil(() => started.length === 3);
    expect(started).toEqual(['ssd', 'gpu', 'cpu']);

    resolvers.get('ssd')?.();
    await waitUntil(() => started.length === 4);
    expect(started).toEqual(['ssd', 'gpu', 'cpu', 'ram']);

    resolvers.get('gpu')?.();
    resolvers.get('cpu')?.();
    resolvers.get('ram')?.();
    await runPromise;

    const resultados = mod.db.prepare(`SELECT status, total FROM auto_resultados ORDER BY id`).all() as { status: string; total: number }[];
    expect(resultados).toEqual([
      { status: 'ok', total: 1 },
      { status: 'ok', total: 1 },
      { status: 'ok', total: 1 },
      { status: 'ok', total: 1 },
    ]);

    mod.db.close();
  });

  it('dispara Discord e desativa alerta quando preço atual atinge o alvo', async () => {
    const mod = await importServer({ webhook: 'https://discord.test/webhook' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    buscarProdutoPorUrlMock.mockResolvedValue({
      title: 'SSD NVMe',
      price: 'R$ 199,90',
      parcelamento: '10x de R$ 19,99',
      image: '',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 0,
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: new Date().toISOString(),
    });

    mod.db.prepare(`INSERT INTO watch_alerts (nome, url, site, canal, preco_alvo_cents, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('SSD NVMe', 'https://www.kabum.com.br/produto/1', 'kabum', 'discord', 29990, '2026-06-05 10:00:00', '2026-06-05 10:00:00');

    await mod.executarWatchAlerts();

    const alerta = mod.db.prepare(`SELECT status, ativo, erro FROM watch_alerts`).get() as { status: string; ativo: number; erro: string | null };
    const check = mod.db.prepare(`SELECT status, notified FROM watch_checks`).get() as { status: string; notified: number };
    const metric = mod.db.prepare(`SELECT origem, site, termo, url, status, total FROM search_metrics`).get() as { origem: string; site: string; termo: string; url: string; status: string; total: number };
    expect(alerta).toEqual({ status: 'disparado', ativo: 0, erro: null });
    expect(check).toEqual({ status: 'disparado', notified: 1 });
    expect(metric).toEqual({
      origem: 'watch',
      site: 'kabum',
      termo: 'SSD NVMe',
      url: 'https://www.kabum.com.br/produto/1',
      status: 'ok',
      total: 1,
    });
    expect(globalThis.fetch).toHaveBeenCalled();
    const webhookBody = JSON.parse((vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).body as string);
    const description = webhookBody.embeds[0].description.replace(/\u00a0/g, ' ');
    expect(description).toContain('Preço atual: **R$ 199,90**');
    expect(description).toContain('Preço alvo: **R$ 299,90**');
    expect(description).toContain('Parcelamento: 10x de R$ 19,99');

    mod.db.close();
  });

  it('mantém alerta ativo quando webhook falha', async () => {
    const mod = await importServer({ webhook: 'https://discord.test/webhook' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, text: async () => 'bad webhook' })));
    buscarProdutoPorUrlMock.mockResolvedValue({
      title: 'SSD NVMe',
      price: 'R$ 199,90',
      parcelamento: null,
      image: '',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 0,
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: new Date().toISOString(),
    });

    mod.db.prepare(`INSERT INTO watch_alerts (nome, url, site, canal, preco_alvo_cents, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('SSD NVMe', 'https://www.kabum.com.br/produto/1', 'kabum', 'discord', 29990, '2026-06-05 10:00:00', '2026-06-05 10:00:00');

    await mod.executarWatchAlerts();

    const alerta = mod.db.prepare(`SELECT status, ativo, erro FROM watch_alerts`).get() as { status: string; ativo: number; erro: string };
    const check = mod.db.prepare(`SELECT status, notified, erro FROM watch_checks`).get() as { status: string; notified: number; erro: string };
    expect(alerta).toEqual({ status: 'ativo', ativo: 1, erro: 'Falha ao enviar notificação Discord' });
    expect(check).toEqual({ status: 'erro', notified: 0, erro: 'Falha ao enviar notificação Discord' });

    mod.db.close();
  });

  it('não notifica desejos quando preço não caiu', async () => {
    const mod = await importServer({ webhook: 'https://discord.test/webhook' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    buscarProdutoPorUrlMock.mockResolvedValue({
      title: 'SSD NVMe',
      price: 'R$ 349,90',
      parcelamento: null,
      image: '',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 0,
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: new Date().toISOString(),
    });

    mod.db.prepare(
      `INSERT INTO wishlist_items (title, url, site, ultimo_preco_cents, ultimo_preco_text, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('SSD NVMe', 'https://www.kabum.com.br/produto/1', 'kabum', 32990, 'R$ 329,90', '2026-06-05 10:00:00', '2026-06-05 10:00:00');

    await mod.executarWishlistChecks();

    const item = mod.db.prepare(`SELECT ultimo_preco_cents, erro, ativo, status FROM wishlist_items`).get() as { ultimo_preco_cents: number; erro: string | null; ativo: number; status: string };
    const check = mod.db.prepare(`SELECT status, notified FROM wishlist_checks`).get() as { status: string; notified: number };
    expect(item).toEqual({ ultimo_preco_cents: 34990, erro: null, ativo: 1, status: 'ativo' });
    expect(check).toEqual({ status: 'ok', notified: 0 });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    mod.db.close();
  });

  it('notifica desejos quando preço cai e mantém item ativo', async () => {
    const mod = await importServer({ webhook: 'https://discord.test/webhook' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    buscarProdutoPorUrlMock.mockResolvedValue({
      title: 'SSD NVMe',
      price: 'R$ 199,90',
      parcelamento: '10x de R$ 19,99',
      image: 'https://img.test/ssd.png',
      url: 'https://www.kabum.com.br/produto/1',
      relevancia: 0,
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: new Date().toISOString(),
    });

    mod.db.prepare(
      `INSERT INTO wishlist_items (title, url, site, image, ultimo_preco_cents, ultimo_preco_text, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('SSD NVMe', 'https://www.kabum.com.br/produto/1', 'kabum', '', 29990, 'R$ 299,90', '2026-06-05 10:00:00', '2026-06-05 10:00:00');

    await mod.executarWishlistChecks();

    const item = mod.db.prepare(`SELECT ultimo_preco_cents, ultimo_preco_text, ultimo_parcelamento, ultimo_disparo_em, erro, ativo, status FROM wishlist_items`).get() as {
      ultimo_preco_cents: number;
      ultimo_preco_text: string;
      ultimo_parcelamento: string;
      ultimo_disparo_em: string | null;
      erro: string | null;
      ativo: number;
      status: string;
    };
    const check = mod.db.prepare(`SELECT status, notified FROM wishlist_checks`).get() as { status: string; notified: number };
    const metric = mod.db.prepare(`SELECT origem, site, termo, url, status, total FROM search_metrics`).get() as { origem: string; site: string; termo: string; url: string; status: string; total: number };
    expect(item).toMatchObject({
      ultimo_preco_cents: 19990,
      ultimo_preco_text: 'R$ 199,90',
      ultimo_parcelamento: '10x de R$ 19,99',
      erro: null,
      ativo: 1,
      status: 'ativo',
    });
    expect(item.ultimo_disparo_em).not.toBeNull();
    expect(check).toEqual({ status: 'disparado', notified: 1 });
    expect(metric).toEqual({
      origem: 'wishlist',
      site: 'kabum',
      termo: 'SSD NVMe',
      url: 'https://www.kabum.com.br/produto/1',
      status: 'ok',
      total: 1,
    });
    expect(globalThis.fetch).toHaveBeenCalled();
    const webhookBody = JSON.parse((vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).body as string);
    const description = webhookBody.embeds[0].description.replace(/\u00a0/g, ' ');
    expect(description).toContain('Preço anterior: **R$ 299,90**');
    expect(description).toContain('Preço atual: **R$ 199,90**');
    expect(description).toContain('Parcelamento: 10x de R$ 19,99');

    mod.db.close();
  });
});
