import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const buscarProdutoMock = vi.fn();
const buscarProdutoPorUrlMock = vi.fn();

type ServerModule = typeof import('../server');

async function importServer(options: { auto?: string; watch?: string; webhook?: string } = {}): Promise<ServerModule> {
  vi.resetModules();
  buscarProdutoMock.mockReset();
  buscarProdutoPorUrlMock.mockReset();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-tests-'));
  process.env.SCRAPER_DB_PATH = path.join(dir, 'scraper.db');
  process.env.AUTO_INTERVAL_HOURS = options.auto;
  process.env.WATCH_INTERVAL_HOURS = options.watch;
  process.env.DISCORD_WEBHOOK_URL = options.webhook || '';
  process.env.DISCORD_WEBHOOK_AVATAR_URL = '';
  process.env.DISCORD_ALERT_TOP_N = '1';

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
  delete process.env.WATCH_INTERVAL_HOURS;
  delete process.env.DISCORD_WEBHOOK_URL;
  vi.doUnmock('../scraper');
});

describe('server helpers', () => {
  it('aplica intervalo mínimo de 3 horas', async () => {
    const mod = await importServer({ auto: '1', watch: '2' });

    expect(mod.AUTO_INTERVAL_HOURS).toBe(3);
    expect(mod.WATCH_INTERVAL_HOURS).toBe(3);

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
    expect(mod.centsToBrl(123456).replace(/\s/, ' ')).toBe('R$ 1.234,56');
    expect(mod.parseTargetPrice('R$ 799,90')).toBe(79990);
    expect(mod.parseTargetPrice(79990)).toBe(79990);

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
      }),
    });
    expect(created.res.status).toBe(201);
    expect(created.body.preco_alvo_cents).toBe(29990);
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
});

describe('watch scheduler rules', () => {
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
    expect(alerta).toEqual({ status: 'disparado', ativo: 0, erro: null });
    expect(check).toEqual({ status: 'disparado', notified: 1 });
    expect(globalThis.fetch).toHaveBeenCalled();

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
});
