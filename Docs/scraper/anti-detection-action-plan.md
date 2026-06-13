# Plano de Ação: Anti-Detecção

Analise do estado atual das mitigacoes anti-bot e plano priorizado para reduzir CAPTCHAs e bloqueios.

Leia `Docs/scraper/anti-detection.md` primeiro para entender o que ja existe.

---

## Problemas Identificados

### 🔴 Criticos — corrigir primeiro

#### 1. Bloqueio de imagens, fontes e midia ✅ (Fase 1 #1)

**Arquivo:** `scraper-core/search.ts:197-204`

```typescript
if (type === 'media') {
  route.abort();
}
```

**Resolvido:** agora bloqueia apenas `media`. O bloqueio de `image` e `font` foi removido — navegadores reais sempre carregam esses recursos.

#### 2. Headless mode detectavel

**Arquivo:** `scraper-core/config.ts` — `HEADLESS = true`

Mesmo com stealth plugin, o argumento `--headless` do Chromium deixa rastros detectaveis:
- User-Agent contem `HeadlessChrome` (embora o stealth plugin tente mascarar)
- `navigator` expoe propriedades de headless
- Renderizador WebGL diferente
- Ausencia de `chrome.runtime` ou extensoes

**Status:** Playwright 1.60+ ja usa o novo modo headless internamente (`--headless=chrome` / headless shell) quando `headless: true`. Nao ha flags `--headless` explicitas nos launch args. O modo nao-headless via `SCRAPER_HEADLESS=false` ja funciona (item 14 resolvido). Ainda ha risco residual de deteccao do novo headless — mitigado parcialmente pelo stealth plugin e spoofing.

**Proxima acao:** monitorar; se challenges persistirem, testar com `channel: 'chrome'` em modo headless (Chrome real vs. Chromium headless shell).

#### 3. Launch args sempre identicos ✅ (Fase 2 #7)

**Arquivo:** `scraper-core/search.ts:44-70`

**Resolvido:** `montarLaunchArgs()` varia args conforme `SCRAPER_VPS`; remove `--disable-gpu` e `--use-gl=*` em não-VPS; shuffle aleatório; 30% de chance de omitir `--no-sandbox`; 20% de chance de adicionar `--disable-sync`.

---

### 🟡 Melhorias de Comportamento

#### 4. Comportamento humano muito mecanico ✅ (Fase 2 #8)

**Arquivo:** `scraper-core/browserBehavior.ts`

**Resolvido:** `comportamentoHumano()` agora tem variabilidade probabilistica:
- `idleLongo()` de 2-8s (25% no inicio, 25% no meio, 25% no fim)
- `mouseMove()` em 80% das vezes (nao 100%)
- `scrollVariado()` com 15% de chance de nao scrollar; quando scrolla, variacao de 1-2 passos pequenos (20%), 1-3 passos grandes (20%), ou 2-4 passos medios (45%)
- 50% de chance de scroll reverso corretivo
- Movimento de mouse com easing cubico + jitter + caminho irregular em 40% dos casos

#### 5. Delay insuficiente antes de navegar ✅ (Fase 1 #2)

**Arquivo:** `scraper-core/search.ts`

**Resolvido:** adicionado `await randomWait(1800, 4500)` antes de cada `page.goto()` em:
- `extrairProdutosViaDom` (search URL)
- `buscarProdutoNaPagina` (navegacao para home)
- `buscarProdutoPorUrlUmaVez` (pagina de produto)

#### 6. Navegacao direta para searchUrl ✅ (Fase 3 #10)

**Arquivo:** `scraper-core/search.ts`

**Resolvido:** toda busca DOM agora passa pela home antes da URL de busca:
- Condicao alterada de `site.precisaHomePrimeiro` para `site.precisaHomePrimeiro || !site.usaApi`
- Apos `comportamentoHumano()`, 60% de chance de clique em area generica (fundo) simulando interacao humana
- Scroll ja incluso no `comportamentoHumano()`

#### 7. Sem variacao de locale/timezone ✅ (Fase 2 #7)

**Arquivo:** `scraper-core/browserSession.ts:51-52`

**Resolvido:** locale e timezoneId agora fazem parte do `Fingerprint`. 80% das sessoes usam `pt-BR` / `America/Sao_Paulo`; 20% variam para `pt` ou `en-US` / `America/Recife` ou `America/Manaus`.

---

### 🟣 Anti-Fingerprinting

#### 8. Inconsistencia UA + WebGL + Platform ✅ (Fase 1 #2)

**Arquivo:** `scraper-core/fingerprint.ts:22-116`

**Resolvido:** `USER_AGENTS` e `WEBGL_PROFILES` removidos. Substituido por `PerfilCompleto` com 13 perfis coerentes:
- 7x Windows (Intel UHD 630 / Iris Xe, NVIDIA RTX 3060 / GTX 1660 SUPER, AMD RX 6600 — todos D3D)
- 4x Mac (Intel Iris OpenGL, Apple M1)
- 2x Linux (llvmpipe/Mesa)

`gerarFingerprint` agora sorteia um `perfil` completo via `sample(PERFIS)`, garantindo UA + WebGL vendor/renderer + platform sempre consistentes.

#### 9. Plugins expostos irreais ✅ (Fase 1 #3)

**Arquivo:** `scraper-core/fingerprint.ts:188`

**Resolvido:** plugins reduzidos para 0-1 aleatoriamente; 70% das sessoes com 0 plugins.

#### 10. `navigator.deviceMemory` e `hardwareConcurrency` inconsistentes

**Arquivo:** `scraper-core/fingerprint.ts:110-111`

```typescript
hardwareConcurrency: sample([4, 6, 8, 10, 12, 16]),
deviceMemory: sample([4, 8]),
```

Amostrados independentemente — pode gerar `deviceMemory: 4` com `hardwareConcurrency: 16`, que nao existe em hardware real.

**Solucao:** criar perfis de hardware realistas (4GB/4cores, 8GB/6cores, 8GB/8cores, 16GB/12cores, 32GB/16cores) e sortear perfil completo.

#### 11. WebGL vendor/renderer pode estar desatualizado

Os profiles de WebGL mencionam versoes ANGLE e hardware que podem ser detectados como inconsistentes com a versao do Chrome no UA. Ex: Chrome 149 com UHD Graphics 630 (lancada em 2017) e viavel; Chrome 149 com `llvmpipe (LLVM 17.0.6)` em Linux e suspeito se o site conhece fingerprints de browser.

**Solucao:** manter profiles atualizados, adicionando variantes de GPU mais recentes (RTX 4060, RX 7600, Arc, etc).

---

### 🔵 Infraestrutura

#### 12. Sem proxies rotativos

Mesmo com fingerprint perfeito, 20 buscas do mesmo IP em 5 minutos resultam em rate limit ou bloqueio. KaBuM! e TerabyteShop usam CDN que faz tracking por IP.

**Solucao:** adicionar suporte a proxy pool (residencial rotativo ou datacenter com boa reputacao).

#### 13. Sem resolvedor de CAPTCHA

Quando o CAPTCHA aparece, o scraper so sabe falhar com `ScraperChallengeError`. Nao ha tentativa de resolver.

**Solucao:** integrar 2captcha, CapMonster ou capsolver como fallback; configurar via env `CAPTCHA_API_KEY`.

#### 14. Stealth plugin pode estar gerando assinatura detectavel

`puppeteer-extra-plugin-stealth` modifica propriedades de forma previsivel. Alguns anti-bots (distil, Akamai) ja tem deteccao especifica para os patches do stealth.

**Solucao:** monitorar se o stealth plugin esta realmente ajudando; considerar remover e fazer spoof manual mais especifico se o problema persistir.

---

## Plano de Ação Priorizado

### ✅ Concluido

| # | Acao | Arquivo | Fase |
|---|---|---|---|
| 1 | Parar de bloquear imagens e fontes | `search.ts:197-204` | Fase 1 |
| 4 | Comportamento humano com variabilidade probabilistica | `browserBehavior.ts` | Fase 2 |
| 5 | Delay aleatorio 1.8-4.5s antes de navegar | `search.ts` (3 `goto()`) | Fase 1 |
| 6 | Navegacao previa a home para todas as buscas DOM | `search.ts:324-348` | Fase 3 |
| 7 | Variar launch args conforme ambiente | `search.ts:44-70` | Fase 2 |
| 8 | Perfis coerentes UA+WebGL+Platform (fim da inconsistencia) | `fingerprint.ts` | Fase 1 |
| 9 | Variar locale/timezone probabilisticamente | `fingerprint.ts` / `browserSession.ts` | Fase 2 |
| 14 | Modo nao-headless opcional via env | `config.ts:3` | Fase 3 |
| 9 | Reduzir plugins para 0-1 (70% com 0) | `fingerprint.ts:188` | Fase 1 |

### Fase 1 — Rapido (horas, alto impacto)

| # | Acao | Arquivo | Esforco | Impacto |
|---|---|---|---|---|---|---|
| 4 | Usar `--headless=new` em vez de `--headless` | `search.ts` / `config.ts` | 5min | Medio |

> **Nota item 4:** Playwright 1.60+ ja usa internamente o novo modo headless. Manter como pendente apenas para monitoramento — se challenges continuarem, testar com `channel: 'chrome'` em modo headless.

### Fase 2 — Intermediario (1-2 dias, impacto medio-alto)

| # | Acao | Arquivo | Esforco | Impacto |
|---|---|---|---|---|---|
| 8 | Timer aleatorio 5-30s entre requisicoes no Auto Search | `server-core/auto.ts` | 15min | Medio |

### Fase 3 — Avancado (3-7 dias, alto impacto)

| # | Acao | Arquivos envolvidos | Esforco | Impacto |
|---|---|---|---|---|
| 10 | Proxy pool rotativo | Nova camada + `config.ts` | 4h | Muito alto |
| 11 | Integracao resolvedor de CAPTCHA | Nova funcao + `config.ts` | 4h | Muito alto |
| 12 | Perfis de hardware realistas agrupados | `fingerprint.ts` | 1h | Medio |

---

## Metricas de Sucesso

- Reducao de `ScraperChallengeError` em >80%
- Reducao de `ScraperParseError` por pagina de bloqueio em >90%
- Aumento de taxa de sucesso na primeira tentativa (sem retry) de <50% para >85%
- Manter <5% de falsos positivos (challenge detectado quando nao ha)

---

## Arquivos Relevantes

| Arquivo | Responsabilidade |
|---|---|
| `scraper-core/fingerprint.ts` | Fingerprint, init script spoofing |
| `scraper-core/browserBehavior.ts` | Waits, mouse, scroll, challenge detection |
| `scraper-core/browserSession.ts` | Sessao, cookies, storageState |
| `scraper-core/search.ts` | Orquestracao da busca, launch args, routing |
| `scraper-core/retry.ts` | Backoff, classificacao de erros |
| `scraper-core/config.ts` | HEADLESS, timeouts, diretorios |
| `server-core/auto.ts` | Auto Search scheduler |
| `Docs/scraper/anti-detection.md` | Documentacao atual do que ja existe |
