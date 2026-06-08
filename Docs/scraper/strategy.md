# Scraping Strategy

O scraper usa Playwright e suporta dois modos principais de coleta: DOM scraping e API scraping.

## SiteConfig

Interface em `scraper-core/types.ts`:

```typescript
interface SiteConfig {
  nome: string;
  urlBase: string;
  searchUrl: ((termo: string) => string) | null;
  waitStrategy: 'networkidle' | 'domcontentloaded' | 'load' | null;
  precisaHomePrimeiro: boolean;
  persistSession?: boolean;
  selectors: { productCard: string; title: string; priceContainer: string } | null;
  usaApi?: boolean;
  apiUrl?: (termo: string) => string;
  extrairProdutos?: (termo: string) => Produto[];
  extrairProdutosViaApi?: (page: Page, termo: string) => Promise<Produto[]>;
}
```

## Modes

| Modo | Como funciona | Sites |
|---|---|---|
| DOM | Navega ate `searchUrl()`, espera `waitStrategy`, faz `page.evaluate(extrairProdutos)`. O callback roda no contexto do navegador e extrai do DOM. | KaBuM!, Pichau |
| API | Consulta o endpoint via `page.request.get()` com o contexto Playwright, sem abrir a home quando `precisaHomePrimeiro` e `false`. | TerabyteShop |

## Public API

- `scraper.ts`: fachada publica e CLI.
- `scraper-core/search.ts`: `buscarProduto()` e `buscarProdutoPorUrl()`.
- `scraper-core/sites.ts`: configuracoes e extratores.
- `scraper-core/productPageParser.ts`: parsing HTML de pagina de produto por URL.

## New Sites

Para adicionar um site:

1. Adicionar entrada em `SITES` em `scraper-core/sites.ts`.
2. Seguir o pattern `SiteConfig`.
3. Para DOM scraping, definir `searchUrl`, `waitStrategy`, `selectors` quando util e `extrairProdutos`.
4. Para API scraping, definir `usaApi`, `apiUrl` e `extrairProdutosViaApi`.
5. Atualizar badges/cores no frontend quando necessario.
6. Criar ou atualizar fixtures/testes mockados sem acessar lojas reais.

## Cache

`scraper-core/cache.ts` cuida da normalizacao de termo e cache por SHA256.

O cache de resultados fica em `data/cache/` e tem TTL de 10 minutos.

Buscas identicas em voo sao deduplicadas por site + termo para evitar abrir browsers duplicados antes do cache ser salvo.

Nao investigar caches salvo quando a tarefa envolver explicitamente cache, persistencia ou artefatos gerados.

## Session and Retries

`scraper-core/browserSession.ts` carrega e salva `storageState` por site em `data/session-state/`.

Por padrao, sites reaproveitam sessao; use `persistSession: false` em `SiteConfig` para desligar. O estado so e salvo depois de uma coleta bem-sucedida.

`scraper-core/retry.ts` aplica:

- ate 3 tentativas para falhas transitorias;
- ate 2 tentativas para captcha/challenge;
- sem retry para falhas estruturais de parsing.
