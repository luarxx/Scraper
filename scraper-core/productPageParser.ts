import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { Produto } from './types';

function cleanText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizarTextoComparacao(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function centsToBrlText(cents: number): string {
  const reais = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = String(cents % 100).padStart(2, '0');
  return `R$ ${reais},${centavos}`;
}

function centsFromLoosePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100);
  }
  if (typeof value !== 'string') return null;

  const raw = value.replace(/[^\d.,]/g, '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

function extrairPrecoAtualTexto(siteKey: string, html: string, textoVisivel = '', tituloProduto = '', meta?: { source: string | null }): string | null {
  const $ = cheerio.load(html);
  type PrecoCandidato = { price: string; cents: number; score: number; index: number };
  const priceRegex = /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;

  function primeiroPrecoTexto(text: string): string | null {
    priceRegex.lastIndex = 0;
    const match = priceRegex.exec(cleanText(text));
    priceRegex.lastIndex = 0;
    return match ? match[0].trim() : null;
  }

  if (siteKey === 'terabyteshop') {
    const price = primeiroPrecoTexto($(
      '.areaEmPromo .info-price p#valVista, .areaEmPromo .info-price #valVista, .areaEmPromo #valVista, .info-price #valVista, p#valVista.val-prod.valVista, #valVista.val-prod.valVista, #valVista.valVista'
    ).first().text());
    if (price && meta) meta.source = 'TerabyteShop: .areaEmPromo .info-price #valVista';
    return price;
  }

  function nomesCompativeis(nomeJson: string): boolean {
    const nome = normalizarTextoComparacao(nomeJson);
    const titulo = normalizarTextoComparacao(tituloProduto);
    if (!nome || !titulo) return true;
    return nome.includes(titulo.slice(0, Math.min(titulo.length, 80)))
      || titulo.includes(nome.slice(0, Math.min(nome.length, 80)));
  }

  function ofertasJsonLd(value: unknown): unknown[] {
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    const offers = record.offers;
    if (Array.isArray(offers)) return offers;
    return offers ? [offers] : [];
  }

  function produtosJsonLd(value: unknown): Record<string, unknown>[] {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(produtosJsonLd);

    const record = value as Record<string, unknown>;
    const type = record['@type'];
    const types = Array.isArray(type) ? type.map(String) : [String(type || '')];
    const current = types.some((item) => item.toLowerCase() === 'product') ? [record] : [];
    const graph = Array.isArray(record['@graph']) ? produtosJsonLd(record['@graph']) : [];
    return [...current, ...graph];
  }

  function extrairJsonLdProductPrice(): string | null {
    const candidatos: { price: string; score: number }[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const text = $(el).contents().text();
      if (!text.trim()) return;
      try {
        const json = JSON.parse(text);
        const products = produtosJsonLd(json);
        products.forEach((product) => {
          const name = typeof product.name === 'string' ? product.name : '';
          if (name) {
            if (!nomesCompativeis(name)) return;
          } else if (tituloProduto && products.length !== 1) {
            return;
          }

          ofertasJsonLd(product).forEach((offer) => {
            if (!offer || typeof offer !== 'object') return;
            const record = offer as Record<string, unknown>;
            const cents = centsFromLoosePrice(record.price ?? record.lowPrice);
            if (cents === null) return;
            const currency = String(record.priceCurrency || product.priceCurrency || '').toUpperCase();
            const score = (currency === 'BRL' ? 2 : 1) + (name ? 2 : 0);
            candidatos.push({ price: centsToBrlText(cents), score });
          });
        });
      } catch {}
    });

    if (candidatos.length === 0) return null;
    candidatos.sort((a, b) => b.score - a.score);
    if (meta) meta.source = 'JSON-LD Product offers';
    return candidatos[0].price;
  }

  const jsonLdPrice = extrairJsonLdProductPrice();

  $('script,style,noscript,template').remove();

  function isContextoSecundario(el: AnyNode): boolean {
    const textos: string[] = [];
    let current = $(el);
    for (let depth = 0; depth < 5 && current.length > 0; depth += 1) {
      textos.push(cleanText([
        current.attr('class'),
        current.attr('id'),
        current.attr('data-testid'),
        current.attr('aria-label'),
        current.attr('data-cy'),
        current.attr('role'),
      ].filter(Boolean).join(' ')));
      const headingText = cleanText(current.children('h2,h3,h4').first().text());
      if (headingText) textos.push(headingText);
      current = current.parent();
    }
    const context = textos.join(' ').toLowerCase();
    return /hist[oó]rico|review|rating|seller|similar|recomend|compre junto|comprar junto|relacionad|carrossel|carousel|vitrine|showcase|shelf|price[_-]?old|pre[cç]o[_-]?old|old[_-]?price|pre[cç]o antigo|pre[cç]o anterior|ofertas? alternativas?/.test(context);
  }

  $('body *').each((_, el) => {
    if (isContextoSecundario(el)) $(el).remove();
  });

  function hasPreco(text: string): boolean {
    priceRegex.lastIndex = 0;
    const result = priceRegex.test(text);
    priceRegex.lastIndex = 0;
    return result;
  }

  function hasTextoSecundario(text: string): boolean {
    return /produtos? recomendad[ao]s?|recomendad[ao]s|similares|compre junto|comprar junto|relacionad[ao]s|hist[oó]rico|pre[cç]o anterior|seller|vitrine|showcase|carousel|carrossel/i.test(text);
  }

  const domBodyText = cleanText($('body').text());
  const visibleText = cleanText(textoVisivel);
  const bodyText = hasPreco(domBodyText) || !visibleText || hasTextoSecundario(visibleText)
    ? domBodyText
    : visibleText;
  const mainText = cleanText([
    $('main').text(),
    $('[role="main"]').text(),
    $('[class*="product"], [class*="Product"], [id*="product"], [id*="Product"]').first().text(),
  ].filter(Boolean).join(' '));
  const parcelTotals = Array.from(bodyText.matchAll(/(\d{1,2})\s*x\s+de\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/gi))
    .map((match) => {
      const parcelas = Number(match[1]);
      const valorParcela = centsFromPrice(`R$ ${match[2]}`);
      return Number.isFinite(parcelas) && Number.isFinite(valorParcela) ? parcelas * valorParcela : null;
    })
    .filter((value): value is number => value !== null && value > 0);

  function centsFromPrice(price: string): number {
    return Number(price.replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.')) * 100;
  }

  function criarColetor(): { candidatos: PrecoCandidato[]; addFromText: (text: string, baseScore?: number, contextHint?: string) => void } {
    const candidatos: PrecoCandidato[] = [];
    const seen = new Set<string>();

    function addFromText(text: string, baseScore = 0, contextHint = ''): void {
      const source = cleanText(text);
      let match: RegExpExecArray | null;

      while ((match = priceRegex.exec(source))) {
        const price = match[0].trim();
        const before = source.slice(Math.max(0, match.index - 80), match.index).toLowerCase();
        const after = source.slice(match.index + price.length, match.index + price.length + 120).toLowerCase();
        const context = `${contextHint.toLowerCase()} ${before} ${after}`;
        const beforeNear = before.slice(-24);
        const afterNear = after.slice(0, 42);
        if (/\d{1,2}\s*x\s*(?:de)?\s*$/.test(beforeNear) || /\bem at[eé]\s+\d{1,2}\s*x\s+de\s*$/.test(before)) continue;
        if (/^(?:\s*(?:sem juros|juros|no cart[aã]o|cart[aã]o|em at[eé]|s\/juros))/.test(afterNear)) continue;
        if (/\bprice[_-]?old\b|pre[cç]o antigo|pre[cç]o anterior|hist[oó]rico|\bde:?\s*$/.test(context)) continue;
        if (/compre junto|comprar junto|veja tamb[eé]m|produto recomendado|produtos recomendados|recomendad[ao]s|similares|ofertas relacionadas|relacionad[ao]s/.test(context)) continue;
        if (/\bmetadados?\b|link de compartilhamento|t[ií]tulo do produto/.test(context)) continue;

        let score = baseScore;
        if (/pix|à vista|a vista|boleto|pre[cç]o final|cash/.test(context)) score += 8;
        if (/pre[cç]o atual/.test(context)) score += siteKey === 'terabyteshop' ? 1 : 5;
        if (/desconto|promo[cç][aã]o|oferta|por\b/.test(context)) score += 3;
        if (siteKey === 'terabyteshop' && /pix|à vista|a vista|boleto/.test(context)) score += 8;
        if (siteKey === 'terabyteshop' && /\bpor:\s*$/.test(before)) score += 10;
        if (/\beconomize|era\s*$/.test(before)) score -= 10;
        if (siteKey === 'kabum' && /pix|à vista|a vista/.test(context)) score += 4;
        if (siteKey === 'pichau' && /à vista|a vista|pix|boleto/.test(context)) score += 6;

        const cents = Math.round(centsFromPrice(price));
        if (!Number.isFinite(cents) || cents <= 0) continue;
        if (parcelTotals.some((total) => cents < total * 0.6)) continue;
        const key = `${price}:${match.index}:${baseScore}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidatos.push({ price, cents, score, index: match.index });
      }

      priceRegex.lastIndex = 0;
    }

    return { candidatos, addFromText };
  }

  function melhor(candidatos: PrecoCandidato[]): string | null {
    if (candidatos.length === 0) return null;
    candidatos.sort((a, b) => b.score - a.score || a.index - b.index || a.cents - b.cents);
    return candidatos[0].price;
  }

  function contextHint(el: AnyNode): string {
    const textos: string[] = [];
    let current = $(el);
    for (let depth = 0; depth < 4 && current.length > 0; depth += 1) {
      textos.push(cleanText([
        current.attr('class'),
        current.attr('id'),
        current.attr('data-testid'),
        current.attr('aria-label'),
      ].filter(Boolean).join(' ')));
      current = current.parent();
    }
    return textos.join(' ');
  }

  function coletarPorSeletores(selectors: { selector: string; score: number }[]): PrecoCandidato[] {
    const coletor = criarColetor();
    selectors.forEach(({ selector, score }) => {
      $(selector).each((_, el) => {
        if (isContextoSecundario(el)) return;
        coletor.addFromText($(el).text(), score, contextHint(el));
      });
    });
    return coletor.candidatos;
  }

  function extrairKabum(): string | null {
    const coletor = criarColetor();
    const source = mainText && hasPreco(mainText) ? mainText : bodyText;
    Array.from(source.matchAll(/(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista)\s+no\s+pix[\s\S]{0,180}comprar agora/gi))
      .forEach((match) => coletor.addFromText(`${match[1]} à vista no PIX comprar agora`, 44));
    Array.from(source.matchAll(/(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista)\s+no\s+pix\s+com\s+\d+%\s+de\s+desconto/gi))
      .forEach((match) => coletor.addFromText(`${match[1]} à vista no PIX com desconto`, 30));
    coletarPorSeletores([
      { selector: '[class*="finalPrice"], [data-testid*="finalPrice"]', score: 24 },
      { selector: '[class*="pix"], [data-testid*="pix"]', score: 20 },
      { selector: '[class*="aVista"], [class*="avista"]', score: 18 },
      { selector: 'main section, main [class*="buy"], main [class*="Buy"], main [class*="purchase"], main [class*="Purchase"]', score: 12 },
      { selector: '[class*="priceCard"]', score: 8 },
      { selector: '[class*="price"], [data-testid*="price"], [id*="price"]', score: 4 },
    ]).forEach((candidato) => coletor.candidatos.push(candidato));
    const price = melhor(coletor.candidatos);
    if (price && meta) meta.source = 'KaBuM!: buy box / price selectors';
    return price;
  }

  function extrairPichau(): string | null {
    const candidatos = coletarPorSeletores([
      { selector: '[class*="price_vista"], [class*="priceVista"], [data-testid*="price-vista"]', score: 24 },
      { selector: '[class*="price_total"], [class*="priceTotal"], [data-testid*="price-total"]', score: 18 },
      { selector: '[class*="pix"], [class*="boleto"], [class*="avista"], [class*="aVista"]', score: 16 },
      { selector: '[class*="price"]:not([class*="price_old"]):not([class*="price-old"]), [data-testid*="price"], [id*="price"]', score: 4 },
    ]);
    const price = melhor(candidatos);
    if (price && meta) meta.source = 'Pichau: price_vista / price_total';
    return price;
  }

  function extrairTerabyte(): string | null {
    const coletor = criarColetor();
    const valorVista = coletarPorSeletores([
      { selector: '.areaEmPromo .info-price p#valVista, .areaEmPromo .info-price #valVista, .areaEmPromo #valVista, .info-price #valVista, .AreaInfvlrpdt #valVista, #valVista.val-prod.valVista, #valVista.valVista, p#valVista', score: 60 },
    ]);
    const melhorVista = melhor(valorVista);
    if (melhorVista) {
      if (meta) meta.source = 'TerabyteShop: .areaEmPromo .info-price #valVista';
      return melhorVista;
    }

    const source = mainText && hasPreco(mainText) ? mainText : bodyText;
    Array.from(source.matchAll(/(?:^|\s)por:\s*(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista|com|no pix|pix|boleto)/gi))
      .forEach((match) => coletor.addFromText(match[0], 32));
    Array.from(source.matchAll(/(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista)\s+(?:com|no|pix|boleto)/gi))
      .forEach((match) => coletor.addFromText(match[0], 26));
    coletarPorSeletores([
      { selector: '.areaEmPromo .info-price [class*="valVista"], .areaEmPromo .info-price [id*="valVista"], .areaEmPromo [class*="valVista"], .areaEmPromo [id*="valVista"], [class*="valVista"], [id*="valVista"], [class*="vista"], [class*="pix"], [class*="boleto"]', score: 22 },
      { selector: '[class*="prod-new-price"], [class*="new-price"], [class*="price"]', score: 6 },
    ]).forEach((candidato) => coletor.candidatos.push(candidato));
    const price = melhor(coletor.candidatos);
    if (price && meta) meta.source = 'TerabyteShop: texto/seletores secundários';
    return price;
  }

  const especifico = siteKey === 'kabum'
    ? extrairKabum()
    : siteKey === 'pichau'
      ? extrairPichau()
      : siteKey === 'terabyteshop'
        ? extrairTerabyte()
        : null;
  if (especifico) return especifico;
  if (jsonLdPrice) return jsonLdPrice;

  const fallback = criarColetor();
  const selectors: { selector: string; score: number }[] = [
    { selector: '[class*="finalPrice"], [data-testid*="finalPrice"]', score: 14 },
    { selector: '[class*="priceCard"]', score: 4 },
    { selector: '[class*="price"], [data-testid*="price"], [id*="price"]', score: 4 },
    { selector: '[class*="pix"], [data-testid*="pix"]', score: 6 },
    { selector: '[class*="avista"], [class*="aVista"]', score: 6 },
  ];

  coletarPorSeletores(selectors).forEach((candidato) => fallback.candidatos.push(candidato));

  if (siteKey === 'terabyteshop') {
    const source = mainText && hasPreco(mainText) ? mainText : bodyText;
    Array.from(source.matchAll(/(?:^|\s)por:\s*(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista|com)/gi))
      .forEach((match) => fallback.addFromText(match[0], 18));
    Array.from(source.matchAll(/(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:à vista|a vista)\s+com\s+\d+%\s+de\s+desconto/gi))
      .forEach((match) => fallback.addFromText(match[0], 18));
  }

  const fallbackSource = mainText && /h1|comprar agora|pix|à vista|a vista|por:/i.test(mainText)
    ? mainText
    : '';
  if (fallbackSource) fallback.addFromText(fallbackSource, -12, 'main product fallback');

  const fallbackPrice = melhor(fallback.candidatos);
  if (fallbackPrice && meta) meta.source = 'fallback selectors / text';
  return fallbackPrice;
}

export function extrairProdutoPorUrlHtml(siteKey: string, html: string, url: string, nomeFallback = '', textoVisivel = ''): Produto & { priceSource: string | null } {
  const $ = cheerio.load(html);
  $('script,style,noscript,template').remove();
  const meta = (selector: string) => cleanText($(selector).attr('content'));
  const title = cleanText($('h1').first().text())
    || meta('meta[property="og:title"]')
    || cleanText($('title').first().text())
    || nomeFallback;
  const bodyText = cleanText(textoVisivel) || cleanText($('body').text());
  const parcelMatch = bodyText.match(/\d{1,2}\s*x\s+de\s+R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/i);
  const image = meta('meta[property="og:image"]')
    || meta('meta[name="twitter:image"]')
    || cleanText($('img').first().attr('src'));
  const priceMeta = { source: null as string | null };
  const price = extrairPrecoAtualTexto(siteKey, html, textoVisivel, title, priceMeta);

  return {
    title,
    price,
    parcelamento: parcelMatch ? parcelMatch[0] : null,
    image: image.startsWith('http') ? image : '',
    url,
    relevancia: 0,
    priceSource: priceMeta.source,
  };
}

