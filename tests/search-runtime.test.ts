import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Resultado } from '../scraper-core/types';

const tempDirs: string[] = [];

type SearchModule = typeof import('../scraper-core/search');

interface RuntimeMock {
  browser: { newContext: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  context: { newPage: ReturnType<typeof vi.fn>; storageState: ReturnType<typeof vi.fn> };
  page: Record<string, unknown>;
}

interface SetupOptions {
  cacheHit?: Resultado | null;
  challenge?: boolean;
  html?: string;
  visibleText?: string;
  apiProducts?: Array<Record<string, unknown>>;
  apiStatus?: number;
  apiBody?: Record<string, unknown>;
  evaluateProducts?: Resultado['produtos'];
}

function createTempRoot(): { root: string; sessionDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-runtime-'));
  tempDirs.push(root);
  return {
    root,
    sessionDir: path.join(root, 'data', 'session-state'),
  };
}

function createPageMock(options: SetupOptions): Record<string, unknown> {
  const productUrl = 'https://www.kabum.com.br/produto/1/ssd';
  return {
    addInitScript: vi.fn(async () => undefined),
    goto: vi.fn(async () => undefined),
    waitForFunction: vi.fn(async () => undefined),
    waitForSelector: vi.fn(async () => undefined),
    evaluate: vi.fn(async () => options.evaluateProducts ?? []),
    request: {
      get: vi.fn(async () => ({
        ok: () => (options.apiStatus ?? 200) >= 200 && (options.apiStatus ?? 200) < 300,
        status: () => options.apiStatus ?? 200,
        json: async () => ({
          ...(options.apiBody ?? {}),
          products: options.apiProducts ?? [{
            nome: 'SSD NVMe 1TB',
            preco: 399.9,
            parcelas: 10,
            valorParcela: 39.99,
            imagem: 'https://img.test/ssd.jpg',
            externalId: 1,
            slug: 'ssd-nvme-1tb',
          }],
        }),
      })),
    },
    content: vi.fn(async () => options.html ?? `
      <html>
        <head><meta property="og:title" content="SSD NVMe 1TB"></head>
        <body>
          <main>
            <h1>SSD NVMe 1TB</h1>
            <strong class="finalPrice">R$ 399,90 à vista no PIX</strong>
          </main>
        </body>
      </html>
    `),
    locator: vi.fn(() => ({
      innerText: vi.fn(async () => options.visibleText ?? 'SSD NVMe 1TB R$ 399,90 à vista no PIX'),
    })),
    url: vi.fn(() => productUrl),
  };
}

async function setupSearchModule(options: SetupOptions = {}): Promise<{
  mod: SearchModule;
  launchMock: ReturnType<typeof vi.fn>;
  useMock: ReturnType<typeof vi.fn>;
  salvarCacheMock?: ReturnType<typeof vi.fn>;
  runtimes: RuntimeMock[];
  sessionDir: string;
}> {
  vi.resetModules();
  const { root, sessionDir } = createTempRoot();
  const runtimes: RuntimeMock[] = [];
  const useMock = vi.fn();
  const launchMock = vi.fn(async () => {
    const page = createPageMock(options);
    const context = {
      newPage: vi.fn(async () => page),
      storageState: vi.fn(async () => ({ cookies: [], origins: [] })),
    };
    const browser = {
      newContext: vi.fn(async () => context),
      close: vi.fn(async () => undefined),
    };
    runtimes.push({ browser, context, page });
    return browser;
  });

  vi.doMock('../scraper-core/config', () => ({
    HEADLESS: true,
    TIMEOUT: 30000,
    CACHE_TTL: 10 * 60 * 1000,
    ROOT: root,
    CACHE_DIR: path.join(root, 'data', 'cache'),
    SESSION_STATE_DIR: sessionDir,
  }));

  vi.doMock('playwright-extra', () => ({
    chromium: {
      use: useMock,
      launch: launchMock,
    },
  }));
  vi.doMock('puppeteer-extra-plugin-stealth', () => ({
    default: vi.fn(() => ({ name: 'stealth' })),
  }));
  vi.doMock('../scraper-core/browserBehavior', () => ({
    randomWait: vi.fn(async () => undefined),
    comportamentoHumano: vi.fn(async () => undefined),
    detectarChallenge: vi.fn(async () => Boolean(options.challenge)),
  }));

  let salvarCacheMock: ReturnType<typeof vi.fn> | undefined;
  if (options.cacheHit !== undefined) {
    salvarCacheMock = vi.fn();
    vi.doMock('../scraper-core/cache', () => ({
      normalizarTermo: (termo: string) => termo.toLowerCase().replace(/\s+/g, ' ').trim(),
      lerCache: vi.fn(() => options.cacheHit),
      salvarCache: salvarCacheMock,
    }));
  }

  const mod = await import('../scraper-core/search');
  return { mod, launchMock, useMock, salvarCacheMock, runtimes, sessionDir };
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock('../scraper-core/config');
  vi.doUnmock('../scraper-core/cache');
  vi.doUnmock('../scraper-core/browserBehavior');
  vi.doUnmock('playwright-extra');
  vi.doUnmock('puppeteer-extra-plugin-stealth');
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('search runtime', () => {
  it('retorna cache hit sem abrir browser', async () => {
    const cached: Resultado = {
      termo: 'ssd',
      site: 'kabum',
      siteNome: 'KaBuM!',
      timestamp: '2026-06-05T10:00:00.000Z',
      total: 1,
      produtos: [{
        title: 'SSD NVMe',
        price: 'R$ 399,90',
        parcelamento: null,
        image: '',
        url: 'https://loja.test/ssd',
        relevancia: 1,
      }],
    };
    const { mod, launchMock, useMock, salvarCacheMock } = await setupSearchModule({ cacheHit: cached });

    await expect(mod.buscarProduto('kabum', 'ssd')).resolves.toBe(cached);

    expect(launchMock).not.toHaveBeenCalled();
    expect(useMock).not.toHaveBeenCalled();
    expect(salvarCacheMock).not.toHaveBeenCalled();
  });

  it('deduplica buscas iguais em voo', async () => {
    const { mod, launchMock } = await setupSearchModule();

    const [first, second] = await Promise.all([
      mod.buscarProduto('terabyteshop', 'ssd nvme'),
      mod.buscarProduto('terabyteshop', 'SSD   NVMe'),
    ]);

    expect(first.total).toBe(1);
    expect(second).toBe(first);
    expect(launchMock).toHaveBeenCalledTimes(1);
  });

  it('usa fallback DOM na TerabyteShop quando a API retorna 429', async () => {
    const fallbackProducts = [{
      title: 'Placa de Video RTX 4060',
      price: 'R$ 2.199,90',
      parcelamento: null,
      image: '',
      url: 'https://www.terabyteshop.com.br/produto/1/rtx-4060',
      relevancia: 2,
    }];
    const { mod, runtimes } = await setupSearchModule({
      apiStatus: 429,
      apiBody: { error: 'Too many requests' },
      evaluateProducts: fallbackProducts,
    });

    const result = await mod.buscarProduto('terabyteshop', 'rtx 4060');

    expect(result).toMatchObject({
      total: 1,
      produtos: fallbackProducts,
    });
    expect(runtimes[0].page.goto).toHaveBeenCalledWith(
      'https://www.terabyteshop.com.br',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    );
    expect(runtimes[0].page.goto).toHaveBeenCalledWith(
      'https://www.terabyteshop.com.br/busca?str=rtx%204060',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    );
  });

  it('salva storageState apenas quando a página de produto é extraída com sucesso', async () => {
    const { mod, runtimes, sessionDir } = await setupSearchModule();

    await mod.buscarProdutoPorUrl('kabum', 'https://www.kabum.com.br/produto/1/ssd');

    expect(runtimes[0].context.storageState).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(sessionDir, 'kabum.json'))).toBe(true);
  });

  it('não salva storageState em erro terminal de parsing', async () => {
    const { mod, runtimes, sessionDir } = await setupSearchModule({
      html: '<html><body><h1>Produto indisponível</h1><p>Sem ofertas disponíveis</p></body></html>',
      visibleText: 'Produto indisponível Sem ofertas disponíveis',
    });

    await expect(mod.buscarProdutoPorUrl('kabum', 'https://www.kabum.com.br/produto/sem-preco'))
      .rejects.toThrow('Não foi possível identificar o preço atual');

    expect(runtimes[0].context.storageState).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(sessionDir, 'kabum.json'))).toBe(false);
  });

  it('não salva storageState quando challenge persiste após retries', async () => {
    const { mod, runtimes, sessionDir, launchMock } = await setupSearchModule({ challenge: true });

    await expect(mod.buscarProdutoPorUrl('kabum', 'https://www.kabum.com.br/produto/1/ssd'))
      .rejects.toThrow('desafio de segurança');

    expect(launchMock).toHaveBeenCalledTimes(2);
    expect(runtimes.every((runtime) => runtime.context.storageState.mock.calls.length === 0)).toBe(true);
    expect(fs.existsSync(path.join(sessionDir, 'kabum.json'))).toBe(false);
  });
});
