import { chromium } from 'playwright-extra';
import type { Page } from 'playwright';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
import * as cheerio from 'cheerio';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// ─── TYPES ──────────────────────────────────────────────────────────────

interface Produto {
  title: string;
  price: string | null;
  parcelamento: string | null;
  image: string;
  url: string;
  relevancia: number;
}

interface SiteConfig {
  nome: string;
  urlBase: string;
  searchUrl: ((termo: string) => string) | null;
  waitStrategy: 'networkidle' | 'domcontentloaded' | 'load' | null;
  precisaHomePrimeiro: boolean;
  selectors: { productCard: string; title: string; priceContainer: string } | null;
  usaApi?: boolean;
  apiUrl?: (termo: string) => string;
  extrairProdutos?: (termo: string) => Produto[];
  extrairProdutosViaApi?: (page: Page, termo: string) => Promise<Produto[]>;
}

interface ResultadoSucesso {
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: number;
  produtos: Produto[];
}

interface ResultadoErro {
  erro: true;
  mensagem: string;
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: 0;
  produtos: [];
}

type Resultado = ResultadoSucesso | ResultadoErro;

// ─── CONFIGURAÇÃO GLOBAL ────────────────────────────────────────────────
const HEADLESS = true;
const TIMEOUT = 30000;
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_DIR = path.join(__dirname, 'data', 'cache');

// ─── FINGERPRINT ──────────────────────────────────────────────────────────

interface Fingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  pluginsLength: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  webglVendor: string;
  webglRenderer: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

const WEBGL_VENDORS = ['Intel Inc.', 'Google Inc.', 'Apple Inc.', 'NVIDIA Corporation', 'AMD'];
const WEBGL_RENDERERS = [
  'Intel Iris OpenGL Engine',
  'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
  'Apple M1',
  'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)',
  'Google SwiftShader',
];

function gerarFingerprint(): Fingerprint {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: {
      width: 1920 + Math.floor(Math.random() * 401) - 200,
      height: 1080 + Math.floor(Math.random() * 201) - 100,
    },
    pluginsLength: 3 + Math.floor(Math.random() * 3),
    hardwareConcurrency: 4 + Math.floor(Math.random() * 13),
    deviceMemory: [4, 8][Math.floor(Math.random() * 2)],
    webglVendor: WEBGL_VENDORS[Math.floor(Math.random() * WEBGL_VENDORS.length)],
    webglRenderer: WEBGL_RENDERERS[Math.floor(Math.random() * WEBGL_RENDERERS.length)],
  };
}

async function randomWait(min = 200, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(r => setTimeout(r, ms));
}

async function scrollGradual(page: Page, targetY: number, steps = 4): Promise<void> {
  const stepSize = Math.floor(targetY / steps);
  for (let i = 0; i < steps; i++) {
    const delta = stepSize + Math.floor(Math.random() * 101) - 50;
    await page.mouse.wheel(0, Math.max(1, delta));
    await randomWait(200, 600);
  }
}

async function mouseMove(page: Page, x: number, y: number): Promise<void> {
  const steps = 3 + Math.floor(Math.random() * 5);
  const startX = Math.floor(Math.random() * 200);
  const startY = Math.floor(Math.random() * 200);
  await page.mouse.move(startX + Math.floor(Math.random() * 100), startY + Math.floor(Math.random() * 100));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.floor(startX + (x - startX) * t + (Math.random() - 0.5) * 20);
    const cy = Math.floor(startY + (y - startY) * t + (Math.random() - 0.5) * 20);
    await page.mouse.move(cx, cy);
    await randomWait(30, 100);
  }
}

// ─── CONFIGURAÇÃO DOS SITES ─────────────────────────────────────────────
const SITES: Record<string, SiteConfig> = {
  kabum: {
    nome: 'KaBuM!',
    urlBase: 'https://www.kabum.com.br',
    searchUrl: (termo) => `https://www.kabum.com.br/busca/${encodeURIComponent(termo)}`,
    waitStrategy: 'networkidle',
    precisaHomePrimeiro: false,
    selectors: {
      productCard: 'a[href*="/produto/"]',
      title: 'span.text-sm.text-left.text-gray-800.text-ellipsis',
      priceContainer: 'div.flex.flex-col div.flex.gap-4.items-center',
    },
    extrairProdutos(termo) {
      const links = Array.from(document.querySelectorAll('a[href*="/produto/"]'));
      const results: Produto[] = [];

      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (href.includes('seller_offer') || href.includes('buyBox') || href.includes('similar')) return;

        const titleEl = a.querySelector('span.text-sm.text-left.text-gray-800.text-ellipsis');
        if (!titleEl) return;
        const title = titleEl.textContent!.trim();
        if (!title) return;

        const priceContainer = a.querySelector('div.flex.flex-col div.flex.gap-4.items-center');
        let price: string | null = null;
        if (priceContainer) {
          const match = priceContainer.textContent!.match(/R\$\s*([\d.,]+)/);
          if (match) price = match[0].trim();
        }
        if (!price) {
          const match = a.textContent!.replace(/\s+/g, ' ').match(/R\$\s*([\d.,]+)/);
          if (match) price = match[0].trim();
        }

        const priceDiv = a.querySelector('div.flex.flex-col');
        let parcelamento: string | null = null;
        if (priceDiv) {
          const spans = priceDiv.querySelectorAll('span.text-xs.text-gray-400.h-16');
          for (const s of spans) {
            const txt = s.textContent!.trim();
            if (txt.includes('x de R$')) {
              parcelamento = txt;
              break;
            }
          }
        }

        const imgEl = a.querySelector('img');
        const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

        results.push({
          title,
          price,
          parcelamento,
          image: image.startsWith('http') ? image : '',
          url: href.startsWith('http') ? href : `https://www.kabum.com.br${href}`,
          relevancia: termo ? termo.toLowerCase().split(/\s+/).filter(p => title.toLowerCase().includes(p)).length : 0,
        });
      });

      return results;
    },
  },

  pichau: {
    nome: 'Pichau',
    urlBase: 'https://www.pichau.com.br',
    searchUrl: (termo) => `https://www.pichau.com.br/search?q=${encodeURIComponent(termo)}`,
    waitStrategy: 'domcontentloaded',
    precisaHomePrimeiro: true,
    selectors: {
      productCard: 'a[data-cy="list-product"]',
      title: 'h2',
      priceContainer: '[class*="price_vista"], [class*="price_total"]',
    },
    extrairProdutos(termo) {
      const links = Array.from(document.querySelectorAll('a[data-cy="list-product"]'));
      const results: Produto[] = [];
      const seen = new Set<string>();

      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : `https://www.pichau.com.br${href}`;
        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);

        const titleEl = a.querySelector('h2');
        if (!titleEl) return;
        const title = titleEl.textContent!.trim();
        if (!title || title.length < 5) return;

        const imgEl = a.querySelector('img');
        const img = imgEl ? (imgEl.getAttribute('src') || '') : '';

        let price: string | null = null;
        const priceVista = a.querySelector('[class*="price_vista"]');
        if (priceVista) {
          price = priceVista.textContent!.trim();
        }
        if (!price) {
          const priceTotal = a.querySelector('[class*="price_total"]');
          if (priceTotal) price = priceTotal.textContent!.trim();
        }

        let parcelamento: string | null = null;
        const parcelEl = a.querySelector('[class*="price_parcelado_inline"]');
        if (parcelEl) {
          const parcelText = a.querySelector('[class*="price_parcelado_text"]');
          if (parcelText) {
            const match = parcelText.textContent!.trim().match(/(\d+x\s*de\s*R\$\s*[\d.,]+)/i);
            if (match) {
              parcelamento = match[1].trim();
            } else {
              parcelamento = parcelEl.textContent!.trim();
            }
          } else {
            parcelamento = parcelEl.textContent!.trim();
          }
        }

        results.push({
          title,
          price,
          parcelamento,
          image: img.startsWith('http') ? img : '',
          url: fullUrl,
          relevancia: termo
            ? termo.toLowerCase().split(/\s+/).filter((p) => title.toLowerCase().includes(p)).length
            : 0,
        });
      });

      return results;
    },
  },

  terabyteshop: {
    nome: 'TerabyteShop',
    urlBase: 'https://www.terabyteshop.com.br',
    searchUrl: null,
    waitStrategy: null,
    precisaHomePrimeiro: true,
    selectors: null,
    usaApi: true,
    apiUrl: (termo) => `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`,
    async extrairProdutosViaApi(page, termo) {
      const url = `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`;
      const data: any[] = await page.evaluate(async (apiUrl) => {
        const resp = await fetch(apiUrl);
        const json = await resp.json();
        return json.products || [];
      }, url);

      return data.map((p: any) => ({
        title: p.nome,
        price: p.preco ? `R$ ${String(p.preco).replace('.', ',')}` : null,
        parcelamento: (p.parcelas && p.valorParcela)
          ? `${p.parcelas}x de R$ ${String(p.valorParcela).replace('.', ',')}`
          : null,
        image: p.imagem || p.img || p.image || '',
        url: `https://www.terabyteshop.com.br/produto/${p.externalId}/${p.slug}`,
        relevancia: termo.toLowerCase().split(/\s+/).filter((w) => p.nome.toLowerCase().includes(w)).length,
      }));
    },
  },
};

// ─── FUNÇÕES AUXILIARES ─────────────────────────────────────────────────

function ordenarPorRelevancia(produtos: Produto[], termo: string): Produto[] {
  return produtos.sort((a, b) => {
    if (b.relevancia !== a.relevancia) return b.relevancia - a.relevancia;
    const precoA = a.price ? parseFloat(a.price.replace(/[^\d,]/g, '').replace(',', '.')) : Infinity;
    const precoB = b.price ? parseFloat(b.price.replace(/[^\d,]/g, '').replace(',', '.')) : Infinity;
    return precoA - precoB;
  });
}

function detectarChallenge(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = (document.body?.innerHTML || '').trim();
    const title = document.title || '';
    if (title.includes('Um momento') || title.includes('Just a moment')) return true;
    if (body.length > 0 && body.length < 10000 && body.includes('verificação de segurança')) return true;
    if (body.length > 0 && body.length < 10000 && body.includes('Enable JavaScript')) return true;
    return false;
  });
}

// ─── CACHE ──────────────────────────────────────────────────────────────

function normalizarTermo(termo: string): string {
  return termo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function gerarCacheKey(site: string, termo: string): string {
  const normalizado = normalizarTermo(termo);
  return createHash('sha256').update(`${site}:${normalizado}`).digest('hex');
}

function lerCache(site: string, termo: string): Resultado | null {
  const cacheKey = gerarCacheKey(site, termo);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  if (!fs.existsSync(cacheFile)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const cachedAt = new Date(data._cachedAt).getTime();
    const agora = Date.now();

    if (agora - cachedAt < CACHE_TTL) {
      const { _cachedAt: _, ...resultado } = data;
      console.log(`📦 Cache encontrado para "${termo}" (${Math.round((agora - cachedAt) / 1000)}s atrás)`);
      return resultado as Resultado;
    }

    fs.unlinkSync(cacheFile);
  } catch {
    // cache inválido ou corrompido, ignorar
  }

  return null;
}

function salvarCache(site: string, termo: string, resultado: Resultado): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cacheKey = gerarCacheKey(site, termo);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  const data = {
    ...resultado,
    _cachedAt: new Date().toISOString(),
  };

  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── FUNÇÃO PRINCIPAL ───────────────────────────────────────────────────

async function buscarProduto(siteKey: string, termoBusca: string): Promise<Resultado> {
  const site = SITES[siteKey];
  console.log(`\n🔍 Buscando por "${termoBusca}" em ${site.nome}...\n`);

  const cacheHit = lerCache(siteKey, termoBusca);
  if (cacheHit) return cacheHit;

  chromium.use(StealthPlugin());

  const fingerprint = gerarFingerprint();

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: 'pt-BR',
  });
  const page = await context.newPage();

  await page.addInitScript((fp: Fingerprint) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });

    const pluginNames = ['PDF Viewer', 'Chrome PDF Viewer', 'Chrome PDF Plugin'];
    const pluginList: any[] = [];
    for (let i = 0; i < fp.pluginsLength && i < pluginNames.length; i++) {
      pluginList.push({
        name: pluginNames[i],
        filename: pluginNames[i].toLowerCase().replace(/\s+/g, '') + '.dll',
        description: 'Portable Document Format',
        length: 1,
        item: () => ({ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }),
        namedItem: () => null,
      });
    }
    Object.defineProperty(navigator, 'plugins', {
      get: () => ({
        ...pluginList,
        length: pluginList.length,
        item: (i: number) => pluginList[i] || null,
        namedItem: () => null,
        [Symbol.iterator]: function* () { for (const p of pluginList) yield p; },
      }),
    });

    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (p: number) {
      if (p === 37445) return fp.webglVendor;
      if (p === 37446) return fp.webglRenderer;
      return origGetParam.call(this, p);
    };
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (p: number) {
        if (p === 37445) return fp.webglVendor;
        if (p === 37446) return fp.webglRenderer;
        return origGetParam2.call(this, p);
      };
    }
  }, fingerprint);

  try {
    if (site.precisaHomePrimeiro) {
      await page.goto(site.urlBase, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await randomWait(1500, 3000);
    }

    let produtos: Produto[];

    if (site.usaApi) {
      if (site.precisaHomePrimeiro) {
        const isChallenge = await detectarChallenge(page);
        if (isChallenge) {
          if (HEADLESS) {
            console.log('⚠️  O site ativou um desafio de segurança (Cloudflare).');
            console.log('   Dica: altere HEADLESS para false no script e resolva o captcha manualmente.');
            await browser.close();
            return {
              termo: termoBusca, site: siteKey, siteNome: site.nome,
              timestamp: new Date().toISOString(), total: 0, produtos: [],
            };
          }
          console.log('🔓 Resolva o captcha na janela aberta...');
          try {
            await page.waitForFunction(() => !document.body?.innerHTML?.includes('verificação de segurança'), { timeout: 60000 });
          } catch {
            console.log('⚠️  Desafio não resolvido. Continuando...');
          }
        }
      }
      const data = await site.extrairProdutosViaApi!(page, termoBusca);
      produtos = ordenarPorRelevancia(data, termoBusca);
    } else {
      const urlBusca = site.searchUrl!(termoBusca);
      await page.goto(urlBusca, { waitUntil: site.waitStrategy!, timeout: TIMEOUT });
      await randomWait(2000, 4000);
      await mouseMove(page, 600, 400);
      await scrollGradual(page, 600);

      const isChallenge = await detectarChallenge(page);
      if (isChallenge) {
        if (HEADLESS) {
          console.log('⚠️  O site ativou um desafio de segurança (Cloudflare).');
          console.log('   Dica: altere HEADLESS para false no script e resolva o captcha manualmente.');
          await browser.close();
          return {
            termo: termoBusca, site: siteKey, siteNome: site.nome,
            timestamp: new Date().toISOString(), total: 0, produtos: [],
          };
        }
        console.log('🔓 Resolva o captcha na janela aberta...');
        try {
          await page.waitForFunction(() => {
            const body = document.body?.innerHTML || '';
            return body.includes('/produto/') && !body.includes('verificação de segurança');
          }, { timeout: 60000 });
        } catch {
          console.log('⚠️  Desafio não resolvido. Continuando...');
        }
        await randomWait(1000, 3000);
      }

      const cardSelector = site.selectors!.productCard;
      try {
        await page.waitForSelector(cardSelector, { timeout: 10000 });
      } catch { /* empty */ }
      await randomWait(300, 800);

      produtos = await page.evaluate(site.extrairProdutos!, termoBusca);
      produtos = ordenarPorRelevancia(produtos, termoBusca);
    }

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const output: Resultado = {
      termo: termoBusca,
      site: siteKey,
      siteNome: site.nome,
      timestamp: new Date().toISOString(),
      total: produtos.length,
      produtos,
    };

    const jsonStr = JSON.stringify(output, null, 2);
    fs.writeFileSync(path.join(dataDir, 'resultado.json'), jsonStr, 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'resultado.js'), `window.__RESULT = ${jsonStr};`, 'utf-8');

    salvarCache(siteKey, termoBusca, output);

    return output;
  } catch (err: unknown) {
    const error = err as Error;
    return {
      erro: true as const,
      mensagem: error.message,
      termo: termoBusca,
      site: siteKey,
      siteNome: site.nome,
      timestamp: new Date().toISOString(),
      total: 0,
      produtos: [],
    };
  } finally {
    await browser.close();
  }
}

// ─── PARSER DE ARGUMENTOS ───────────────────────────────────────────────

function parseArgs(): { site: string; termo: string | null } {
  const args = process.argv.slice(2);
  let site = 'kabum';
  let termo: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site' || args[i] === '-s') {
      site = args[++i] || site;
    } else if (!termo) {
      termo = args[i];
    }
  }

  return { site, termo };
}

// ─── EXPORTS ────────────────────────────────────────────────────────────

export { buscarProduto, SITES };
export type { Produto, SiteConfig, Resultado };

// ─── EXECUÇÃO VIA CLI ───────────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    const { site, termo } = parseArgs();

    if (!termo) {
      console.log('Uso: npx tsx scraper.ts [--site kabum|terabyteshop] "nome do produto"');
      console.log('');
      console.log('Sites disponíveis:');
      Object.entries(SITES).forEach(([key, val]) => {
        console.log(`   ${key}  →  ${val.nome} (${val.urlBase})`);
      });
      console.log('');
      console.log('Exemplos:');
      console.log('   npx tsx scraper.ts "ryzen 5 5500"');
      console.log('   npx tsx scraper.ts --site terabyteshop "ryzen 5 5500"');
      console.log('   npx tsx scraper.ts -s terabyteshop "rx 7600"');
      process.exit(1);
    }

    if (!SITES[site]) {
      console.error(`❌ Site "${site}" não encontrado.`);
      console.error(`   Sites disponíveis: ${Object.keys(SITES).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n🔍 Buscando por "${termo}" em ${SITES[site].nome}...\n`);
    const result = await buscarProduto(site, termo);

    if ('erro' in result && result.erro) {
      console.error(`❌ ${result.mensagem}`);
      return;
    }

    if (result.produtos.length === 0) {
      console.log(`❌ Nenhum produto encontrado para "${termo}" em ${SITES[site].nome}.`);
      return;
    }

    const melhor = result.produtos[0];
    const qtdPalavras = termo.split(/\s+/).length;
    console.log('═'.repeat(40));
    console.log(`🔍  ${SITES[site].nome}  |  ${termo}`);
    console.log('═'.repeat(40));
    console.log(`📌 Título: ${melhor.title}`);
    console.log(`💰 Preço:  ${melhor.price || 'N/A'}`);
    if (melhor.parcelamento) console.log(`💳 Parcelamento: ${melhor.parcelamento}`);
    console.log(`🔗 Link:   ${melhor.url}`);
    console.log(`📊 Score:   ${melhor.relevancia}/${qtdPalavras} palavras relevantes`);
    console.log('═'.repeat(40));

    if (result.produtos.length > 1) {
      console.log(`\n📋 Outros ${result.produtos.length - 1} resultado(s) (por relevância + preço):`);
      result.produtos.slice(1, Math.min(6, result.produtos.length)).forEach((p, i) => {
        const titleShort = p.title.length > 55 ? p.title.substring(0, 55) + '...' : p.title;
        const parc = p.parcelamento ? ` | ${p.parcelamento}` : '';
        console.log(`   ${i + 2}. ${titleShort} → ${p.price || 'N/A'}${parc}`);
      });
    }

    console.log(`\n💾 Resultado salvo em data/resultado.json (${result.produtos.length} produtos)`);
  })();
}
