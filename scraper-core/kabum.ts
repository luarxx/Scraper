import type { Produto } from './types';

function extrairProdutosKabum(termo: string): Produto[] {
  const produtosJsonLd: Produto[] = [];
  const vistosJsonLd = new Set<string>();

  Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
    const text = script.textContent?.trim();
    if (!text) return;

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

  if (results.length > 0) return results;

  return produtosJsonLd.map((produto) => ({
    ...produto,
    relevancia: termo
      ? termo.toLowerCase().split(/\s+/).filter((p) => produto.title.toLowerCase().includes(p)).length
      : 0,
  }));
}

export { extrairProdutosKabum };