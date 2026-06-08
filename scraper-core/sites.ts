import type { Produto, SiteConfig } from './types';
import { TIMEOUT } from './config';

export const SITES: Record<string, SiteConfig> = {
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
    precisaHomePrimeiro: false,
    selectors: null,
    usaApi: true,
    apiUrl: (termo) => `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`,
    async extrairProdutosViaApi(page, termo) {
      const url = `https://www.terabyteshop.com.br/api/tss-proxy/?q=${encodeURIComponent(termo)}&limit=20`;
      const response = await page.request.get(url, {
        headers: {
          accept: 'application/json, text/plain, */*',
          referer: 'https://www.terabyteshop.com.br/',
        },
        timeout: TIMEOUT,
      });

      if (!response.ok()) {
        throw new Error(`TerabyteShop API retornou HTTP ${response.status()}`);
      }

      const json = await response.json();
      const data: any[] = Array.isArray(json?.products) ? json.products : [];

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
