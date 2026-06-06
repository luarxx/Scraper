import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { extrairProdutoPorUrlHtml, gerarCacheKey, normalizarTermo, ordenarPorRelevancia, SITES } from '../scraper';
import type { Produto } from '../scraper';

function withDocument(html: string, run: () => Produto[]): Produto[] {
  const dom = new JSDOM(html, { url: 'https://example.test' });
  const previousDocument = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    return run();
  } finally {
    globalThis.document = previousDocument;
    dom.window.close();
  }
}

describe('scraper helpers', () => {
  it('normaliza termos e gera cache key estável', () => {
    expect(normalizarTermo('  Placa Mãe  B550  ')).toBe('placa mae b550');
    expect(gerarCacheKey('kabum', 'Placa Mãe B550')).toBe(gerarCacheKey('kabum', 'placa mae   b550'));
    expect(gerarCacheKey('kabum', 'Placa Mãe B550')).not.toBe(gerarCacheKey('pichau', 'Placa Mãe B550'));
  });

  it('ordena por relevância e depois menor preço', () => {
    const produtos: Produto[] = [
      { title: 'SSD genérico', price: 'R$ 99,90', parcelamento: null, image: '', url: 'a', relevancia: 1 },
      { title: 'SSD NVMe caro', price: 'R$ 499,90', parcelamento: null, image: '', url: 'b', relevancia: 2 },
      { title: 'SSD NVMe barato', price: 'R$ 299,90', parcelamento: null, image: '', url: 'c', relevancia: 2 },
      { title: 'SSD sem preço', price: null, parcelamento: null, image: '', url: 'd', relevancia: 2 },
    ];

    expect(ordenarPorRelevancia(produtos, 'ssd nvme').map((p) => p.url)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('site extractors', () => {
  it('prioriza preço promocional por URL da KaBuM!', () => {
    const produto = extrairProdutoPorUrlHtml('kabum', `
      <html>
        <head>
          <meta property="og:title" content="Memória ram">
          <meta property="og:image" content="https://img.test/memoria.jpg">
        </head>
        <body>
          <h1>Memória ram</h1>
          <section>
            <span>De R$ 1.388,22</span>
            <span>10x de R$ 138,82 sem juros</span>
            <strong class="finalPrice">R$ 1.000,00 no Pix</strong>
          </section>
        </body>
      </html>
    `, 'https://www.kabum.com.br/produto/101657/memoria-ram', 'Fallback');

    expect(produto).toMatchObject({
      title: 'Memória ram',
      price: 'R$ 1.000,00',
      parcelamento: '10x de R$ 138,82',
      image: 'https://img.test/memoria.jpg',
      url: 'https://www.kabum.com.br/produto/101657/memoria-ram',
    });
  });

  it('extrai produtos KaBuM! de fixture HTML', () => {
    const produtos = withDocument(`
      <a href="/produto/1/placa-video">
        <span class="text-sm text-left text-gray-800 text-ellipsis">Placa de Vídeo RTX 4060</span>
        <div class="flex flex-col">
          <div class="flex gap-4 items-center">R$ 1.899,90</div>
          <span class="text-xs text-gray-400 h-16">10x de R$ 189,99</span>
        </div>
        <img src="https://img.test/rtx.jpg">
      </a>
    `, () => SITES.kabum.extrairProdutos!('rtx 4060'));

    expect(produtos).toEqual([{
      title: 'Placa de Vídeo RTX 4060',
      price: 'R$ 1.899,90',
      parcelamento: '10x de R$ 189,99',
      image: 'https://img.test/rtx.jpg',
      url: 'https://www.kabum.com.br/produto/1/placa-video',
      relevancia: 2,
    }]);
  });

  it('extrai produtos Pichau de fixture HTML', () => {
    const produtos = withDocument(`
      <a data-cy="list-product" href="/produto/ssd-nvme">
        <h2>SSD NVMe 1TB</h2>
        <img src="https://img.test/ssd.jpg">
        <div class="price_vista">R$ 399,90</div>
        <div class="price_parcelado_inline">
          <span class="price_parcelado_text">em até 8x de R$ 49,99</span>
        </div>
      </a>
    `, () => SITES.pichau.extrairProdutos!('ssd nvme'));

    expect(produtos[0]).toMatchObject({
      title: 'SSD NVMe 1TB',
      price: 'R$ 399,90',
      parcelamento: '8x de R$ 49,99',
      image: 'https://img.test/ssd.jpg',
      url: 'https://www.pichau.com.br/produto/ssd-nvme',
      relevancia: 2,
    });
  });

  it('extrai produtos TerabyteShop por API mockada', async () => {
    const page = {
      request: {
        get: async () => ({
          ok: () => true,
          status: () => 200,
          json: async () => ({
            products: [{
              nome: 'Processador Ryzen 5 5600',
              preco: 799.9,
              parcelas: 10,
              valorParcela: 79.99,
              imagem: 'https://img.test/ryzen.jpg',
              externalId: 123,
              slug: 'processador-ryzen-5-5600',
            }],
          }),
        }),
      },
    };

    const produtos = await SITES.terabyteshop.extrairProdutosViaApi!(page as never, 'ryzen 5600');

    expect(produtos[0]).toEqual({
      title: 'Processador Ryzen 5 5600',
      price: 'R$ 799,9',
      parcelamento: '10x de R$ 79,99',
      image: 'https://img.test/ryzen.jpg',
      url: 'https://www.terabyteshop.com.br/produto/123/processador-ryzen-5-5600',
      relevancia: 2,
    });
  });
});
