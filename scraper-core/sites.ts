import type { Produto, SiteConfig } from './types';
import { TIMEOUT } from './config';
import { ScraperRateLimitError } from './retry';

function extrairProdutosKabum(termo: string): Produto[] {
  const imagemPorUrl = new Map<string, string>();
  const nextDataScript = document.getElementById('__NEXT_DATA__');
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript.textContent || '{}');
      const catalogData = nextData?.props?.pageProps?.data?.catalogServer?.data;
      if (Array.isArray(catalogData)) {
        for (const item of catalogData) {
          const productUrl = typeof item.url === 'string' ? item.url : (typeof item.link === 'string' ? item.link : '');
          const img = typeof item.image === 'string' ? item.image
            : typeof item.thumbnail === 'string' ? item.thumbnail
            : Array.isArray(item.images) && typeof item.images[0] === 'string' ? item.images[0]
            : '';
          if (productUrl && img) {
            const path = productUrl.replace(/https?:\/\/[^\/]+/, '');
            imagemPorUrl.set(path, img.startsWith('http') ? img : `https:${img}`);
          }
        }
      }
    } catch { /* empty */ }
  }

  const produtosJsonLd: Produto[] = [];
  const vistosJsonLd = new Set<string>();
  let totalJsonLdScripts = 0;
  let totalJsonLdProdutos = 0;

  Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
    const text = script.textContent?.trim();
    if (!text) return;
    totalJsonLdScripts++;

    try {
      const parsed = JSON.parse(text);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      roots.forEach((root) => {
        if (!root || typeof root !== 'object') return;
        const item = root as Record<string, any>;
        const type = item['@type'];
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        if (!isProduct) return;

        const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const title = typeof item.name === 'string' ? item.name.trim() : '';
        const urlValue = typeof offers?.url === 'string' ? offers.url : item.url;
        const url = typeof urlValue === 'string' ? urlValue : '';
        const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
        const image = typeof imageValue === 'string' ? imageValue : '';
        const rawPrice = offers?.price;
        const numero = typeof rawPrice === 'number'
          ? rawPrice
          : typeof rawPrice === 'string'
            ? Number(rawPrice.includes(',') ? rawPrice.replace(/\./g, '').replace(',', '.') : rawPrice)
            : NaN;
        const price = Number.isFinite(numero) && numero > 0
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero).replace(/\u00a0/g, ' ')
          : null;

        if (title && url && !vistosJsonLd.has(url)) {
          vistosJsonLd.add(url);
          produtosJsonLd.push({
            title,
            price,
            parcelamento: null,
            image,
            url,
            relevancia: 0,
          });
        }
      });

      const stack: unknown[] = [parsed];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node) continue;
        if (Array.isArray(node)) {
          node.forEach((child) => stack.push(child));
          continue;
        }
        if (typeof node !== 'object') continue;

        const item = node as Record<string, any>;
        const type = item['@type'];
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        if (isProduct) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const title = typeof item.name === 'string' ? item.name.trim() : '';
          const urlValue = typeof offers?.url === 'string' ? offers.url : item.url;
          const url = typeof urlValue === 'string' ? urlValue : '';
          const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
          const image = typeof imageValue === 'string' ? imageValue : '';
          const rawPrice = offers?.price;
          const numero = typeof rawPrice === 'number'
            ? rawPrice
            : typeof rawPrice === 'string'
              ? Number(rawPrice.includes(',') ? rawPrice.replace(/\./g, '').replace(',', '.') : rawPrice)
              : NaN;
          const price = Number.isFinite(numero) && numero > 0
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero).replace(/\u00a0/g, ' ')
            : null;

          if (title && url && !vistosJsonLd.has(url)) {
            vistosJsonLd.add(url);
            produtosJsonLd.push({
              title,
              price,
              parcelamento: null,
              image,
              url,
              relevancia: 0,
            });
          }
        }

        if (item['@graph']) stack.push(item['@graph']);
        if (item.itemListElement) stack.push(item.itemListElement);
        if (item.item) stack.push(item.item);
      }
    } catch { /* empty */ }
  });

  console.log(`[Kabum] Scripts JSON-LD encontrados: ${totalJsonLdScripts}, produtos extraídos: ${produtosJsonLd.length}`);

  const links = Array.from(document.querySelectorAll('a[href*="/produto/"]'));
  const results: Produto[] = [];

  let ignoradosSellerOffer = 0;
  let ignoradosSemTitulo = 0;
  let comTitulo = 0;

  links.forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.includes('seller_offer') || href.includes('buyBox') || href.includes('similar')) {
      ignoradosSellerOffer++;
      return;
    }

    const titleEl = a.querySelector('span.text-sm.text-left.text-gray-800.text-ellipsis');
    if (!titleEl) {
      ignoradosSemTitulo++;
      return;
    }
    const title = titleEl.textContent!.trim();
    if (!title) {
      ignoradosSemTitulo++;
      return;
    }
    comTitulo++;

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
    let image = '';
    if (imgEl) {
      const src = imgEl.getAttribute('src') || '';
      image = src.startsWith('http') ? src : '';
      if (!image) {
        const srcset = imgEl.getAttribute('srcset');
        if (srcset) {
          const firstUrl = srcset.split(',')[0]?.trim().split(/\s+/)[0];
          if (firstUrl?.startsWith('http')) image = firstUrl;
        }
      }
      if (!image) image = imgEl.getAttribute('data-src') || '';
    }
    if (!image) {
      const path = href.replace(/https?:\/\/[^\/]+/, '');
      image = imagemPorUrl.get(path) || '';
    }

    results.push({
      title,
      price,
      parcelamento,
      image: image.startsWith('http') ? image : '',
      url: href.startsWith('http') ? href : `https://www.kabum.com.br${href}`,
      relevancia: termo ? termo.toLowerCase().split(/\s+/).filter(p => title.toLowerCase().includes(p)).length : 0,
    });
  });

  console.log(`[Kabum] Links /produto/: ${links.length} (ignorados seller_offer: ${ignoradosSellerOffer}, sem titulo: ${ignoradosSemTitulo}, com titulo: ${comTitulo})`);
  console.log(`[Kabum] Produtos extraídos via DOM: ${results.length}`);

  if (results.length > 0) return results;

  console.log(`[Kabum] Fallback para JSON-LD — ${produtosJsonLd.length} produto(s)`);
  return produtosJsonLd.map((produto) => ({
    ...produto,
    relevancia: termo
      ? termo.toLowerCase().split(/\s+/).filter((p) => produto.title.toLowerCase().includes(p)).length
      : 0,
  }));
}

export const SITES: Record<string, SiteConfig> = {
  kabum: {
    nome: 'KaBuM!',
    urlBase: 'https://www.kabum.com.br',
    searchUrl: (termo) => `https://www.kabum.com.br/busca/${encodeURIComponent(termo)}`,
    waitStrategy: 'load',
    precisaHomePrimeiro: true,
    selectors: {
      productCard: 'a[href*="/produto/"]',
      title: 'span.text-sm.text-left.text-gray-800.text-ellipsis',
      priceContainer: 'div.flex.flex-col div.flex.gap-4.items-center',
    },
    extrairProdutos: extrairProdutosKabum,
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
    extrairProdutos: (termo) => {
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
    searchUrl: (termo) => `https://www.terabyteshop.com.br/busca?str=${encodeURIComponent(termo)}`,
    waitStrategy: 'domcontentloaded',
    precisaHomePrimeiro: true,
    selectors: {
      productCard: 'a[href*="/produto/"]',
      title: 'h2, h3, [class*="tit"], [class*="nome"], [class*="name"]',
      priceContainer: '[class*="price"], [class*="preco"], [id*="valVista"], [class*="val"]',
    },
    usaApi: true,
    apiUrl: (termo) => `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`,
    extrairProdutos: (termo) => {
      const links = Array.from(document.querySelectorAll('a[href*="/produto/"]'));
      const results: Produto[] = [];
      const seen = new Set<string>();

      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : `https://www.terabyteshop.com.br${href}`;
        if (seen.has(fullUrl)) return;

        const rawText = (a.textContent || '').replace(/\s+/g, ' ').trim();
        const titleEl = a.querySelector('h2, h3, [class*="tit"], [class*="nome"], [class*="name"]');
        let title = titleEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!title) {
          title = rawText
            .replace(/R\$\s*[\d.]+,\d{2}.*/i, '')
            .replace(/\b(de|por|à vista|a vista|pix)\b.*$/i, '')
            .trim();
        }
        if (!title || title.length < 5 || !termo.toLowerCase().split(/\s+/).some((p) => title.toLowerCase().includes(p))) return;

        const priceMatch = rawText.match(/R\$\s*[\d.]+,\d{2}/);
        const parcelMatch = rawText.match(/\d+x\s+de\s+R\$\s*[\d.]+,\d{2}/i);
        const imgEl = a.querySelector('img');
        const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

        seen.add(fullUrl);
        results.push({
          title,
          price: priceMatch ? priceMatch[0].trim() : null,
          parcelamento: parcelMatch ? parcelMatch[0].trim() : null,
          image: image.startsWith('http') ? image : '',
          url: fullUrl,
          relevancia: termo.toLowerCase().split(/\s+/).filter((w) => title.toLowerCase().includes(w)).length,
        });
      });

      return results;
    },
    async extrairProdutosViaApi(page, termo) {
      const url = `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`;
      const response = await page.request.get(url, {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'x-requested-with': 'XMLHttpRequest',
          referer: 'https://www.terabyteshop.com.br/',
        },
        timeout: TIMEOUT,
      });

      if (!response.ok()) {
        if (response.status() === 429) {
          const body = await response.json().catch(() => null) as { retryAfterMs?: number; error?: string } | null;
          throw new ScraperRateLimitError(
            `TerabyteShop API retornou HTTP 429: ${body?.error || 'Too many requests'}`,
            body?.retryAfterMs || 60000,
          );
        }
        throw new Error(`TerabyteShop API retornou HTTP ${response.status()}`);
      }

      const json = await response.json();
      const data: any[] = Array.isArray(json?.products) ? json.products : [];

      return data.flatMap((p: any) => {
        const title = typeof p.nome === 'string' ? p.nome : typeof p.name === 'string' ? p.name : '';
        const slug = typeof p.slug === 'string' ? p.slug : '';
        const rawUrl = p.url || p.link || p.permalink;
        const id = p.externalId ?? p.external_id ?? p.idProduto ?? p.produtoId ?? p.productId ?? p.id_product ?? p.id;
        const url = typeof rawUrl === 'string' && rawUrl
          ? (rawUrl.startsWith('http') ? rawUrl : `https://www.terabyteshop.com.br${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`)
          : id && slug
            ? `https://www.terabyteshop.com.br/produto/${id}/${slug}`
            : null;

        if (!title || !url || url.includes('/undefined/')) return [];

        const preco = typeof p.preco === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco).replace(/\u00a0/g, ' ')
          : typeof p.preco === 'string' && p.preco.trim()
            ? `R$ ${p.preco.replace('.', ',')}`
            : null;

        return [{
          title,
          price: preco,
          parcelamento: (p.parcelas && p.valorParcela)
            ? `${p.parcelas}x de R$ ${String(p.valorParcela).replace('.', ',')}`
            : null,
          image: p.imagem || p.img || p.image || '',
          url,
          relevancia: termo.toLowerCase().split(/\s+/).filter((w) => title.toLowerCase().includes(w)).length,
        }];
      });
    },
  },
};