# Anti-Detection and Challenge Handling

O scraper usa mitigacoes de anti-deteccao para reduzir bloqueios em e-commerces.

## Fingerprint

- Fingerprint unico por `browser.newContext()`.
- Rotacao por site para evitar repetir a mesma assinatura em buscas consecutivas.
- User-Agent de Chrome desktop real/recente.
- Plataformas cobertas: Windows, Linux e macOS.
- Viewport aproximada: `1920 +/- 200` por `1080 +/- 100`.
- Locale: `pt-BR`.
- Timezone: `America/Sao_Paulo`.

## Session Reuse

- `scraper-core/browserSession.ts` reaproveita `storageState` do Playwright por site quando permitido.
- O estado fica em `data/session-state/<site>.json` e tambem e mantido em memoria durante o processo atual.
- `SiteConfig.persistSession = false` desliga o reuso para um site especifico.
- O estado so e salvo apos uma busca ou pagina de produto concluir com sucesso, evitando substituir cookies bons por uma sessao presa em captcha.

## Init Script Spoofing

`addInitScript` faz spoof de propriedades do navegador, incluindo:

- `navigator.webdriver`
- `language`
- `languages`
- `platform`
- `plugins`
- `mimeTypes`
- `hardwareConcurrency`
- `deviceMemory`
- WebGL vendor/renderer

## Browser Behavior

Apos navegacao, o scraper simula comportamento humano:

- movimento gradual de mouse;
- scroll via `page.mouse.wheel()`;
- 3 a 5 passos de scroll;
- passos de 200 a 400px;
- pausas aleatorias entre acoes.

## Challenge Detection

`detectarChallenge()` verifica se titulo ou body contem sinais como:

- `Um momento`
- `Just a moment`
- `verificacao de seguranca`
- `Enable JavaScript`

## Headless vs Non-Headless

- Em modo headless, challenge detectado vira erro retryable e nao salva sessao.
- Em modo nao-headless, aguarda resolucao manual.
- Timeout de resolucao manual: 60s.

## Retries and Backoff

- `scraper-core/retry.ts` aplica backoff exponencial com jitter.
- Falhas transitorias tentam ate 3 vezes.
- Challenges/captcha tentam ate 2 vezes com novo browser/contexto.
- Falhas estruturais de parsing, como pagina de produto sem preco confiavel, falham sem retry.
- Buscas iguais em voo sao deduplicadas por `site + termo` ou `site + url`.

## Relevant Files

- `scraper-core/fingerprint.ts`: fingerprint e init script anti-deteccao.
- `scraper-core/browserBehavior.ts`: waits, mouse/scroll e deteccao de challenge.
- `scraper-core/browserSession.ts`: storageState/cookies por site.
- `scraper-core/retry.ts`: retries limitados e backoff exponencial.
