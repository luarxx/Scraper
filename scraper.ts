export { buscarProduto, buscarProdutoNoBrowser, buscarProdutoPorUrl, criarBrowserAuto } from './scraper-core/search';
export { extrairProdutoPorUrlHtml } from './scraper-core/productPageParser';
export { gerarCacheKey, normalizarTermo } from './scraper-core/cache';
export { ordenarPorRelevancia } from './scraper-core/ranking';
export { SITES } from './scraper-core/sites';
export type { Produto, SiteConfig, Resultado, ResultadoProdutoUrl } from './scraper-core/types';

if (require.main === module) {
  import('./scraper-core/cli').then(({ runCli }) => runCli());
}
