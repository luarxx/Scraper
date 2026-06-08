import { chromium } from 'playwright-extra';
import * as fs from 'fs';
import * as path from 'path';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { HEADLESS, ROOT, TIMEOUT } from './config';
import { comportamentoHumano, detectarChallenge, randomWait } from './browserBehavior';
import { gerarFingerprint, criarFingerprintInitScript } from './fingerprint';
import { lerCache, salvarCache } from './cache';
import { extrairProdutoPorUrlHtml } from './productPageParser';
import { ordenarPorRelevancia } from './ranking';
import { SITES } from './sites';
import type { Produto, Resultado, ResultadoProdutoUrl } from './types';

export async function buscarProduto(siteKey: string, termoBusca: string): Promise<Resultado> {
  const site = SITES[siteKey];
  console.log(`\n🔍 Buscando por "${termoBusca}" em ${site.nome}...\n`);

  const cacheHit = lerCache(siteKey, termoBusca);
  if (cacheHit) return cacheHit;

  chromium.use(StealthPlugin());

  const fingerprint = gerarFingerprint(siteKey);

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();

  await page.addInitScript(criarFingerprintInitScript(fingerprint));

  try {
    if (site.precisaHomePrimeiro) {
      await page.goto(site.urlBase, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      await randomWait(1500, 3000);
      await comportamentoHumano(page, fingerprint.viewport);
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
      await comportamentoHumano(page, fingerprint.viewport);

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

    const dataDir = path.join(ROOT, 'data');
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

export async function buscarProdutoPorUrl(siteKey: string, produtoUrl: string, nomeFallback = ''): Promise<ResultadoProdutoUrl> {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Site "${siteKey}" não encontrado.`);

  chromium.use(StealthPlugin());

  const fingerprint = gerarFingerprint(siteKey);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();

  await page.addInitScript(criarFingerprintInitScript(fingerprint));

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

    const isChallenge = await detectarChallenge(page);
    if (isChallenge) {
      throw new Error('O site ativou um desafio de segurança.');
    }

    const html = await page.content();
    const textoVisivel = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const produto = extrairProdutoPorUrlHtml(siteKey, html, page.url(), nomeFallback, textoVisivel);

    if (!produto.title || !produto.price) {
      throw new Error('Não foi possível identificar o preço atual na página do produto.');
    }

    return {
      ...produto,
      site: siteKey,
      siteNome: site.nome,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

