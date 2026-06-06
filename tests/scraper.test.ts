import { describe, expect, it } from 'vitest';
import { extrairProdutoPorUrlHtml, gerarCacheKey, normalizarTermo, ordenarPorRelevancia, SITES } from '../scraper';
import type { Produto } from '../scraper';

const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, options?: { url?: string }) => { window: { document: Document; close: () => void } } };

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

  it('ignora valor de parcela como preço atual por URL da KaBuM!', () => {
    const produto = extrairProdutoPorUrlHtml('kabum', `
      <html>
        <head>
          <meta property="og:title" content="Placa De Video RTX5050">
        </head>
        <body>
          <h1>Placa De Video RTX5050</h1>
          <section>
            <span class="price-installment">R$ 289,99</span>
            <span>10x de R$ 252,84 sem juros</span>
            <strong class="finalPrice">R$ 2.224,99 no Pix</strong>
          </section>
        </body>
      </html>
    `, 'https://www.kabum.com.br/produto/905341/placa-de-video-rtx5050', 'Fallback');

    expect(produto).toMatchObject({
      title: 'Placa De Video RTX5050',
      price: 'R$ 2.224,99',
      parcelamento: '10x de R$ 252,84',
      url: 'https://www.kabum.com.br/produto/905341/placa-de-video-rtx5050',
    });
  });

  it('mantém preço PIX da KaBuM! mesmo perto de texto de cartão', () => {
    const produto = extrairProdutoPorUrlHtml('kabum', `
      <html>
        <head>
          <meta property="og:title" content="Memoria Ram Para Notebook Kingston 16gb">
          <meta property="og:image" content="https://img.test/ram.jpg">
        </head>
        <body>
          <h1>Memoria Ram Para Notebook Kingston 16gb, 2666mhz, Ddr4 - Kvr26s19s8/16</h1>
          <aside>
            <span>Produto recomendado</span>
            <strong class="priceCard">R$ 430,25 no PIX</strong>
          </aside>
          <main>
            <span>De: R$ 599,00</span>
            <strong class="finalPrice">R$ 599,00 No PIX ou 10x de R$ 59,90 sem juros no cartão</strong>
          </main>
        </body>
      </html>
    `, 'https://www.kabum.com.br/produto/1042513/memoria-ram-para-notebook-kingston-16gb-2666mhz-ddr4-kvr26s19s8-16', 'Fallback');

    expect(produto).toMatchObject({
      title: 'Memoria Ram Para Notebook Kingston 16gb, 2666mhz, Ddr4 - Kvr26s19s8/16',
      price: 'R$ 599,00',
      parcelamento: '10x de R$ 59,90',
      image: 'https://img.test/ram.jpg',
      url: 'https://www.kabum.com.br/produto/1042513/memoria-ram-para-notebook-kingston-16gb-2666mhz-ddr4-kvr26s19s8-16',
    });
  });

  it('prioriza preço do bloco de compra da KaBuM! em vez de oferta relacionada', () => {
    const produto = extrairProdutoPorUrlHtml('kabum', `
      <html>
        <head>
          <meta property="og:title" content="Memoria RAM Para Notebook Rise Mode 16GB">
        </head>
        <body>
          <aside>
            <h2>Produtos recomendados</h2>
            <span>Oferta especial R$ 999,99 à vista no PIX com 15% de desconto</span>
          </aside>
          <main>
            <h1>Memoria RAM Para Notebook Rise Mode 16GB, 5200MHZ DDR5</h1>
            <section>
              <span>R$ 1.049,90 À vista no PIX com 15% de desconto</span>
              <span>R$ 1.235,18 em até 10x de R$ 123,51 sem juros ou 1x com 10% de desconto no cartão</span>
              <button>Comprar agora</button>
            </section>
          </main>
        </body>
      </html>
    `, 'https://www.kabum.com.br/produto/536979/memoria-ram', 'Fallback');

    expect(produto).toMatchObject({
      title: 'Memoria RAM Para Notebook Rise Mode 16GB, 5200MHZ DDR5',
      price: 'R$ 1.049,90',
      parcelamento: '10x de R$ 123,51',
      url: 'https://www.kabum.com.br/produto/536979/memoria-ram',
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

  it('prioriza preço à vista por URL da Pichau', () => {
    const produto = extrairProdutoPorUrlHtml('pichau', `
      <html>
        <head>
          <meta property="og:title" content="SSD NVMe 1TB">
          <meta property="og:image" content="https://img.test/ssd.jpg">
        </head>
        <body>
          <h1>SSD NVMe 1TB</h1>
          <main>
            <span class="price_old">De: R$ 499,90</span>
            <strong class="price_vista">R$ 399,90 à vista no PIX</strong>
            <span class="price_parcelado_text">em até 8x de R$ 49,99 sem juros</span>
          </main>
        </body>
      </html>
    `, 'https://www.pichau.com.br/produto/ssd-nvme', 'Fallback');

    expect(produto).toMatchObject({
      title: 'SSD NVMe 1TB',
      price: 'R$ 399,90',
      parcelamento: '8x de R$ 49,99',
      image: 'https://img.test/ssd.jpg',
      url: 'https://www.pichau.com.br/produto/ssd-nvme',
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

  it('prioriza preço à vista por URL da TerabyteShop', () => {
    const produto = extrairProdutoPorUrlHtml('terabyteshop', `
      <html>
        <head>
          <meta property="og:title" content="Processador Ryzen 5 5500">
          <meta property="og:image" content="https://img.test/ryzen.jpg">
        </head>
        <body>
          <h1>Processador Ryzen 5 5500</h1>
          <section class="historico-price-card">
            <span>Preço atual R$ 849,99</span>
          </section>
          <main>
            <span>De: R$ 849,99</span>
            <strong>Por: R$ 578,99 à vista com 15% de desconto no boleto ou pix</strong>
            <span>12x de R$ 56,76 s/juros no cartão</span>
          </main>
        </body>
      </html>
    `, 'https://www.terabyteshop.com.br/produto/20782/processador-amd-ryzen-5-5500', 'Fallback');

    expect(produto).toMatchObject({
      title: 'Processador Ryzen 5 5500',
      price: 'R$ 578,99',
      parcelamento: '12x de R$ 56,76',
      image: 'https://img.test/ryzen.jpg',
      url: 'https://www.terabyteshop.com.br/produto/20782/processador-amd-ryzen-5-5500',
    });
  });

  it('retorna preço nulo quando página por URL não tem preço confiável', () => {
    const produto = extrairProdutoPorUrlHtml('kabum', `
      <html>
        <head>
          <meta property="og:title" content="Produto indisponível">
        </head>
        <body>
          <h1>Produto indisponível</h1>
          <main>
            <p>Avise-me quando chegar</p>
            <span>Sem ofertas disponíveis no momento</span>
          </main>
        </body>
      </html>
    `, 'https://www.kabum.com.br/produto/sem-preco', 'Fallback');

    expect(produto.price).toBeNull();
  });
});
