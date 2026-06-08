import { chromium } from 'playwright-extra';
import * as fs from 'fs';
import * as path from 'path';
import type { Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { HEADLESS, ROOT, TIMEOUT } from './config';
import { comportamentoHumano, detectarChallenge, randomWait } from './browserBehavior';
import { gerarFingerprint, criarFingerprintInitScript } from './fingerprint';
import { lerCache, salvarCache, normalizarTermo } from './cache';
import { extrairProdutoPorUrlHtml } from './productPageParser';
import { ordenarPorRelevancia } from './ranking';
import { criarPaginaComSessao, salvarSessaoDoContexto } from './browserSession';
import { executarComRetry, ScraperChallengeError, ScraperParseError } from './retry';
import { SITES } from './sites';
import type { Produto, Resultado, ResultadoProdutoUrl, SiteConfig } from './types';

const inFlightSearches = new Map<string, Promise<Resultado>>();
const inFlightProductPages = new Map<string, Promise<ResultadoProdutoUrl>>();
let stealthRegistered = false;

function registrarStealth(): void {
  if (stealthRegistered) return;
  chromium.use(StealthPlugin());
  stealthRegistered = true;
}

function devePersistirSessao(site: SiteConfig): boolean {
  return site.persistSession !== false;
}

function criarResultadoErro(siteKey: string, site: SiteConfig, termoBusca: string, err: unknown): Resultado {
  const error = err instanceof Error ? err : new Error(String(err));
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
}

function criarChaveBusca(siteKey: string, termoBusca: string): string {
  return `search:${siteKey}:${normalizarTermo(termoBusca)}`;
}

function criarChaveProdutoUrl(siteKey: string, produtoUrl: string): string {
  return `url:${siteKey}:${produtoUrl.trim()}`;
}

async function verificarChallenge(page: Page, contexto: 'busca' | 'produto'): Promise<void> {
  const isChallenge = await detectarChallenge(page);
  if (!isChallenge) return;

  if (HEADLESS) {
    throw new ScraperChallengeError('O site ativou um desafio de segurança.');
  }

  console.log('🔓 Resolva o captcha na janela aberta...');
  try {
    await page.waitForFunction(() => {
      const body = document.body?.innerHTML || '';
      const title = document.title || '';
      const hasChallenge = body.includes('verificação de segurança')
        || body.includes('Enable JavaScript')
        || title.includes('Um momento')
        || title.includes('Just a moment');
      const hasContent = document.body?.innerText?.trim().length;
      return !hasChallenge && Boolean(hasContent);
    }, { timeout: 60000 });
  } catch {
    const stillChallenge = await detectarChallenge(page).catch(() => true);
    if (stillChallenge) {
      throw new ScraperChallengeError(`Desafio de segurança não resolvido na ${contexto}.`);
    }
  }
}

async function criarPagina(siteKey: string, site: SiteConfig) {
  registrarStealth();
  const fingerprint = gerarFingerprint(siteKey);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const { context, page } = await criarPaginaComSessao(
      browser,
      siteKey,
      fingerprint,
      devePersistirSessao(site),
    );

    await page.addInitScript(criarFingerprintInitScript(fingerprint));
    return { browser, context, page, fingerprint };
  } catch (err) {
    await browser.close().catch(() => undefined);
    throw err;
  }
}

async function salvarSessaoComSucesso(siteKey: string, site: SiteConfig, context: Awaited<ReturnType<typeof criarPagina>>['context']): Promise<void> {
  await salvarSessaoDoContexto(context, siteKey, devePersistirSessao(site));
}

function salvarResultadoBusca(resultado: Resultado): void {
  const dataDir = path.join(ROOT, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonStr = JSON.stringify(resultado, null, 2);
  fs.writeFileSync(path.join(dataDir, 'resultado.json'), jsonStr, 'utf-8');
  fs.writeFileSync(path.join(dataDir, 'resultado.js'), `window.__RESULT = ${jsonStr};`, 'utf-8');
}

async function buscarProdutoUmaVez(siteKey: string, termoBusca: string): Promise<Resultado> {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Site "${siteKey}" não encontrado.`);

  const { browser, context, page, fingerprint } = await criarPagina(siteKey, site);

  try {
    if (site.precisaHomePrimeiro) {
      await page.goto(site.urlBase, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await randomWait(1500, 3000);
      await comportamentoHumano(page, fingerprint.viewport);
    }

    let produtos: Produto[];

    if (site.usaApi) {
      if (site.precisaHomePrimeiro) {
        await verificarChallenge(page, 'busca');
      }
      const data = await site.extrairProdutosViaApi!(page, termoBusca);
      produtos = ordenarPorRelevancia(data, termoBusca);
    } else {
      const urlBusca = site.searchUrl!(termoBusca);
      await page.goto(urlBusca, { waitUntil: site.waitStrategy!, timeout: TIMEOUT });
      await randomWait(2000, 4000);
      await comportamentoHumano(page, fingerprint.viewport);
      await verificarChallenge(page, 'busca');

      const cardSelector = site.selectors!.productCard;
      try {
        await page.waitForSelector(cardSelector, { timeout: 10000 });
      } catch { /* empty */ }
      await randomWait(300, 800);

      produtos = await page.evaluate(site.extrairProdutos!, termoBusca);
      produtos = ordenarPorRelevancia(produtos, termoBusca);
    }

    const output: Resultado = {
      termo: termoBusca,
      site: siteKey,
      siteNome: site.nome,
      timestamp: new Date().toISOString(),
      total: produtos.length,
      produtos,
    };

    salvarResultadoBusca(output);
    salvarCache(siteKey, termoBusca, output);
    await salvarSessaoComSucesso(siteKey, site, context);

    return output;
  } finally {
    await browser.close();
  }
}

async function executarBuscaProduto(siteKey: string, termoBusca: string): Promise<Resultado> {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Site "${siteKey}" não encontrado.`);

  return executarComRetry(
    async () => buscarProdutoUmaVez(siteKey, termoBusca),
    {
      maxAttemptsTransient: 3,
      maxAttemptsChallenge: 2,
      onRetry: ({ attempt, kind, delayMs, message }) => {
        console.log(`[Busca Manual] Tentativa ${attempt} falhou (${kind}): ${message}. Retentando em ${delayMs}ms.`);
      },
    },
  ).catch((err: unknown) => criarResultadoErro(siteKey, site, termoBusca, err));
}

export async function buscarProduto(siteKey: string, termoBusca: string): Promise<Resultado> {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Site "${siteKey}" não encontrado.`);

  console.log(`\n🔍 Buscando por "${termoBusca}" em ${site.nome}...\n`);

  const cacheHit = lerCache(siteKey, termoBusca);
  if (cacheHit) return cacheHit;

  const key = criarChaveBusca(siteKey, termoBusca);
  const inFlight = inFlightSearches.get(key);
  if (inFlight) return inFlight;

  const promise = executarBuscaProduto(siteKey, termoBusca)
    .finally(() => {
      inFlightSearches.delete(key);
    });

  inFlightSearches.set(key, promise);
  return promise;
}

async function buscarProdutoPorUrlUmaVez(siteKey: string, produtoUrl: string, nomeFallback = ''): Promise<ResultadoProdutoUrl> {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Site "${siteKey}" não encontrado.`);

  const { browser, context, page, fingerprint } = await criarPagina(siteKey, site);

  try {
    await page.goto(produtoUrl, { waitUntil: site.waitStrategy || 'domcontentloaded', timeout: TIMEOUT });
    await randomWait(1200, 2500);
    if (siteKey === 'terabyteshop') {
      await page.waitForFunction(() => {
        const value = document.querySelector('.areaEmPromo .info-price p#valVista, .areaEmPromo .info-price #valVista, .areaEmPromo #valVista, .info-price #valVista, p#valVista.val-prod.valVista, #valVista.val-prod.valVista, #valVista.valVista')?.textContent || '';
        return /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/.test(value);
      }, { timeout: 10000 }).catch(() => undefined);
    } else {
      await page.waitForSelector('h1, main, [class*="finalPrice"], [class*="price_vista"], [class*="prod-new-price"], [id*="valVista"]', { timeout: 5000 }).catch(() => undefined);
    }
    await comportamentoHumano(page, fingerprint.viewport);
    await verificarChallenge(page, 'produto');

    const html = await page.content();
    const textoVisivel = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const produto = extrairProdutoPorUrlHtml(siteKey, html, page.url(), nomeFallback, textoVisivel);

    if (!produto.title || !produto.price) {
      throw new ScraperParseError('Não foi possível identificar o preço atual na página do produto.');
    }

    const resultado = {
      ...produto,
      site: siteKey,
      siteNome: site.nome,
      timestamp: new Date().toISOString(),
    };

    await salvarSessaoComSucesso(siteKey, site, context);

    return resultado;
  } finally {
    await browser.close();
  }
}

async function executarBuscaProdutoPorUrl(siteKey: string, produtoUrl: string, nomeFallback = ''): Promise<ResultadoProdutoUrl> {
  return executarComRetry(
    async () => buscarProdutoPorUrlUmaVez(siteKey, produtoUrl, nomeFallback),
    {
      maxAttemptsTransient: 3,
      maxAttemptsChallenge: 2,
      onRetry: ({ attempt, kind, delayMs, message }) => {
        console.log(`[Busca por URL] Tentativa ${attempt} falhou (${kind}): ${message}. Retentando em ${delayMs}ms.`);
      },
    },
  );
}

export async function buscarProdutoPorUrl(siteKey: string, produtoUrl: string, nomeFallback = ''): Promise<ResultadoProdutoUrl> {
  const key = criarChaveProdutoUrl(siteKey, produtoUrl);
  const inFlight = inFlightProductPages.get(key);
  if (inFlight) return inFlight;

  const promise = executarBuscaProdutoPorUrl(siteKey, produtoUrl, nomeFallback)
    .finally(() => {
      inFlightProductPages.delete(key);
    });

  inFlightProductPages.set(key, promise);
  return promise;
}
