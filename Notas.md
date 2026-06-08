# Ideias e Próximos Passos — Scraper

Ideias de funcionalidades organizadas por categoria, com valor estimado, complexidade e status.

**Legenda:** ✅ concluído | 🟡 parcialmente concluído / base criada | ⬜ pendente

---

## Já foi feito

- ✅ Interface React com busca manual por loja, histórico local das últimas buscas, cards de produto, destaque de melhor opção e estados de carregamento/erro/vazio.
- ✅ Scraper multi-loja com KaBuM!, Pichau e TerabyteShop, usando DOM scraping para KaBuM!/Pichau e API scraping para TerabyteShop.
- ✅ Ordenação por relevância e preço, extração de título, preço, parcelamento, imagem e URL.
- ✅ Cache local de resultados em `data/cache/` com chave SHA256 e TTL de 10 minutos.
- ✅ SQLite com `better-sqlite3` em `data/scraper.db`, incluindo tabelas de auto-busca e histórico de preços.
- ✅ Aba "Automática" no frontend para configurar até 10 produtos, acompanhar status, disparar execução manual e ver resultados da última execução.
- ✅ Scheduler server-side a cada 6 horas, com execução sequencial, recuperação de execução interrompida e persistência dos resultados.
- ✅ Histórico de preços por produto salvo no SQLite e exibido no card por meio de gráfico e KPIs de mínimo, máximo, média, preço atual e tendência.
- ✅ Endpoints `/api/auto/*` e `/api/history*` implementados no servidor HTTP puro.
- ✅ Anti-detecção reforçada com `playwright-extra`, plugin stealth, fingerprint realístico por contexto, spoof avançado de navegador e comportamento humano simulado.

---

## 1. Persistência de Dados / Banco de Dados

### 1.1 Banco de dados local (SQLite) ✅
Implementado com `better-sqlite3` em `data/scraper.db`. Hoje armazena configuração automática, execuções, resultados e histórico de preços. O cache de busca ainda existe em JSON por TTL curto.
**Valor:** Alto | **Complexidade:** Média

### 1.2 Exportação de resultados (CSV, JSON) ⬜
Usuário baixa o resultado da busca como CSV ou JSON para análise offline.
**Valor:** Médio | **Complexidade:** Baixa

---

## 2. Monitoramento e Rastreamento de Produtos

### 2.1 "Watch" de preços (alertas de queda) ⬜
Usuário cadastra um alerta com Nome, URL, Preço-alvo, Site e Canal. O servidor verifica o preço atual periodicamente (via cron interno ou scheduler) e, quando o preço fica ≤ alvo, dispara uma notificação no canal configurado.

**Fluxo:**
1. Frontend exibe botão "Criar Alerta" no card do produto e uma página `/alerts` para gerenciar todos os alertas.
2. Ao criar, usuário informa: preço-meta, canal de notificação e intervalo de verificação.
3. Alerta é salvo em banco (SQLite, item 1.1) com status `active`.
4. Servidor executa scraping do produto em background no intervalo configurado.
5. Se preço atual ≤ preço-meta, marca alerta como `triggered` e envia notificação.
6. Canal suporta: console (log), email (nodemailer), Discord (webhook), Telegram (bot), WebSocket (SSE em tempo real no frontend).
7. Usuário pode pausar, reativar ou excluir alerta.

**Stack:** node-cron ou `setInterval` para scheduler; `nodemailer` para email; webhook HTTP para Discord/Telegram; SSE (`text/event-stream`) para notificações no frontend.
**Valor:** Alto | **Complexidade:** Alta

### 2.2 Histórico de preços por produto ✅
Implementado. O servidor salva cada preço encontrado em `price_history`, expõe `/api/history` e `/api/history/summary`, e o frontend mostra gráfico + KPIs dentro do `ProductCard`.
**Valor:** Alto | **Complexidade:** Média-Alta

### 2.3 Lista de favoritos / "Desejos" ⬜
Usuário salva produtos favoritos (localStorage ou DB) com atalho para ver preços atualizados de todos de uma vez.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 2.4 Scraping periódico automático (cron) ✅
Implementado no `server.ts` com scheduler a cada 6h, até 10 produtos configuráveis, execução sequencial, botão "Executar agora", status e persistência em SQLite.
**Valor:** Alto | **Complexidade:** Média

---

## 3. Melhorias no Scraping (Fontes e Robustez)

### 3.1 Novos sites (Magalu, Amazon, Mercado Livre, Shopee) ⬜
Cada nova loja aumenta a utilidade do scraper. Amazon e ML são notoriamente difíceis (anti-bot agressivo).
**Valor:** Alto | **Complexidade:** Média-Alta

### 3.2 Estratégias de anti-bot mais robustas
O scraper já combina stealth plugin, pool de fingerprints por contexto e comportamento humano simulado. Para enfrentar Cloudflare avançado, Amazon e Mercado Livre, ainda pode evoluir com proxies, retries mais inteligentes e resolução externa de challenges. Abaixo em fases progressivas.

#### 3.2.1 Fase 1 — Plug-and-play stealth (baixo esforço) ✅
Implementado com `playwright-extra` + `puppeteer-extra-plugin-stealth`.

- **Integração:** substituir `chromium.launch()` por `playwright-extra` com o stealth plugin
- **Cobertura:** resolve bloqueios de sites com proteção média (Pichau, KaBuM! mais agressivo, TerabyteShop)
- **Manutenção:** quase zero — o plugin é mantido pela comunidade
- **Stack:** `playwright-extra` + `playwright-stealth` (npm)
- **Esforço:** 1 dia
- **Valor:** Alto | **Complexidade:** Baixa

#### 3.2.2 Fase 2 — Pool de fingerprints + comportamento humano (médio esforço) ✅
Implementado em `scraper.ts`: geração de fingerprint único por `browser.newContext()`, rotação por site para evitar repetir a mesma assinatura em buscas consecutivas, user-agent real/recente de Chrome desktop, viewport variável, spoof de navegador e comportamento humano simulado após navegação.

**Fingerprint realístico por contexto:**
- Para cada `browser.newContext()`, gera combinação única de: viewport (1920±200 × 1080±100), `userAgent` rotativo, `navigator.plugins`, `navigator.mimeTypes`, `navigator.hardwareConcurrency` (4-16), `navigator.deviceMemory` (4-8), `navigator.language`, `navigator.languages`, `navigator.platform`, timezone `America/Sao_Paulo` e WebGL vendor/renderer.
- Mantém memória da última assinatura por site e evita repetir a mesma combinação em requisições consecutivas.
- Pool atual usa UAs desktop Chrome 148/149 para Windows, Linux e macOS, além de perfis WebGL Intel, NVIDIA, AMD, Apple e Mesa.

**Comportamento humano simulado:**
- Scroll fixo foi substituído por scroll gradual via `page.mouse.wheel()` com pausas aleatórias (3-5 passos de 200-400px).
- Movimento de mouse usa coordenadas intermediárias, easing, jitter e pausas curtas entre passos.
- Esperas usam `randomWait()` com valores aleatórios em vez de constantes fixas.
- Rotina `comportamentoHumano()` roda após navegação em páginas DOM e na home de sites API quando necessário.
- Pausas entre digitação ficam como melhoria futura caso sejam adicionados fluxos com formulários.

**Stack:** nenhuma dependência extra — tudo via Playwright API pura (`context.addInitScript()`, `page.mouse`, `page.keyboard`)
**Esforço:** concluído
**Valor:** Alto | **Complexidade:** Média

#### 3.2.3 Fase 3 — Proxies rotativos + bypass Cloudflare (futuro)
*Reservado para implementação futura quando necessário.* Incluirá pool de proxies (BrightData/Webshare), retry com proxy diferente a cada falha, integração com 2Captcha/Capsolver para resolver challenges de Amazon e Mercado Livre.
**Valor:** Alto | **Complexidade:** Alta

### 3.3 Suporte a paginação (mais resultados) ⬜
Atualmente pega apenas a primeira página. Adicionar navegação para coletar significativamente mais produtos.
**Valor:** Alto | **Complexidade:** Média

### 3.4 Cache inteligente com stale-while-revalidate 🟡
Existe cache local JSON com SHA256 e TTL de 10 minutos. Ainda falta o comportamento stale-while-revalidate com atualização em background.
**Valor:** Médio | **Complexidade:** Média

### 3.5 Parsing avançado de parcelamento (CET, juros) ✅
Extrair dados mais ricos: com/sem juros, valor total a prazo, taxa de juros efetiva.
**Valor:** Médio | **Complexidade:** Baixa

### 3.6 Retry com backoff exponencial ⬜
Se um site falhar (timeout, challenge, 503), tentar novamente com espera exponencial antes de retornar erro.
**Valor:** Alto | **Complexidade:** Baixa

---

## 4. APIs e Infraestrutura do Servidor

### 4.1 Rate limiting no servidor ⬜
Prevenir abuso (ex.: 100 requisições/min). Protege o servidor e evita bloqueio pelos sites alvo.
**Valor:** Médio | **Complexidade:** Baixa

### 4.2 Endpoint de busca multi-site ⬜
`/api/search/all?q=...` busca em todos os sites simultaneamente e agrega os resultados.
Criar categorias por exemplo: Busque em sites de informática(seria kabum, terabyte e Pichau por exemplo), Busque em marketplaces(seria mercado livre e shopee)
**Valor:** Alto | **Complexidade:** Média

### 4.3 Endpoint de sugestão / autocomplete ⬜
Sugerir termos de busca populares enquanto o usuário digita (baseado em histórico).
**Valor:** Médio | **Complexidade:** Baixa

### 4.4 Health check / status endpoint ⬜
`/api/health` para monitoramento (uptime, versão, status dos sites, uso de memória).
**Valor:** Médio | **Complexidade:** Baixa

### 4.5 Suporte a streaming (SSE ou WebSocket) ⬜
Notificar o frontend em tempo real quando uma busca concluir ou preço monitorado mudar.
**Valor:** Médio | **Complexidade:** Média

### 4.6 Logging estruturado ⬜
Substituir `console.log` por logger com níveis, timestamps e rotação de arquivos (pino, winston).
**Valor:** Médio | **Complexidade:** Baixa

### 4.7 Pool de browsers (limite de concorrência) ⬜
Impedir que N requisições abram N instâncias do Chromium e esgotem a memória.
**Valor:** Alto | **Complexidade:** Média-Alta

---

## 5. Melhorias na Interface (UX/UI)

### 5.1 Filtros no frontend (preço, parcelamento, ordenação, produtos que tiveram alteração) ⬜
Filtrar/ordenar resultados sem refazer requisição: menor preço, maior relevância, faixa de valor.
**Valor:** Alto | **Complexidade:** Média

### 5.2 Comparação lado a lado de produtos ⬜
Selecionar 2-3 produtos e ver tabela comparativa com preços e lojas.
**Valor:** Médio | **Complexidade:** Média-Alta

### 5.3 Modo claro / temas ⬜
Atualmente só tema escuro. Permitir trocar para tema claro ou temas customizados.
**Valor:** Médio | **Complexidade:** Baixa

### 5.4 PWA (instalável como app) ⬜
Service worker + manifest para instalar como aplicativo no celular/desktop.
**Valor:** Médio | **Complexidade:** Média

### 5.5 Melhorias de acessibilidade (a11y) ⬜
ARIA labels, foco gerenciado, contraste, navegação por teclado.
**Valor:** Médio | **Complexidade:** Média

### 5.6 Paginação dos resultados no frontend ⬜
Dividir muitos resultados em páginas de 12 ou 20 itens.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.7 Lightbox / prévia ampliada da imagem ⬜
Mostrar versão ampliada ao passar o mouse ou clicar na imagem.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.8 Compartilhar resultado da busca ⬜
Botão para copiar link da busca ou compartilhar.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.9 Scroll infinito ⬜
Carregar mais produtos conforme o usuário rola (IntersectionObserver).
**Valor:** Médio | **Complexidade:** Média

---

## 6. Comparação e Multi-Site

### 6.1 Busca integrada em todos os sites simultaneamente ⬜
Usuário busca em todas as lojas de uma vez e vê resultados agregados com melhor preço global em destaque.
**Valor:** Alto | **Complexidade:** Média

### 6.2 Aba "Melhor Preço Geral" (cross-site) ⬜
Destaque visual para o produto com menor preço entre todas as lojas para aquele termo.
**Valor:** Alto | **Complexidade:** Baixa

### 6.3 Cálculo de frete (via CEP) ⬜
Usuário insere o CEP e o scraper tenta extrair opções de frete de cada loja.
**Valor:** Médio | **Complexidade:** Alta

### 6.4 Cálculo de cashback / descontos ⬜
Exibir estimativas de cashback ou descontos para Pix/boleto.
**Valor:** Médio | **Complexidade:** Média

---

## 7. Notificações e Automação

### 7.1 Webhook Discord / Telegram 🟡
Webhook Discord implementado. Enviar resultado de busca ou alerta de preço para um canal.
**Valor:** Médio | **Complexidade:** Média

### 7.1.1 Adicionar link do Scraper na mensagem do bot do Discord ⬜
Incluir no embed da mensagem do Discord um link direto para o Scraper (URL do servidor) para que o usuário possa clicar e abrir a interface.
**Valor:** Baixo | **Complexidade:** Baixa

### 7.2 CLI interativa (prompt) ⬜
Menu interativo com `readline` ou `inquirer` para escolher site e termo.
**Valor:** Baixo | **Complexidade:** Baixa

### 7.3 Automação com GitHub Actions ⬜
Agendar scraping periódico via GitHub Actions (ex.: buscar "ryzen 5 5600" toda manhã).
**Valor:** Médio | **Complexidade:** Baixa

---

## 8. DevOps, Testes e Qualidade

### 8.1 Testes unitários (Vitest) ⬜
Garantir que parsing de preços, ordenação e lógica de extração funcionem corretamente.
**Valor:** Alto | **Complexidade:** Baixa-Média

### 8.2 Testes de integração (API endpoints) ⬜
Testar se `/api/search`, `/api/sites` respondem corretamente com validação e erros.
**Valor:** Alto | **Complexidade:** Média

### 8.3 Testes E2E com Playwright (frontend) ⬜
Fluxo completo: abrir app, digitar termo, ver resultados, clicar em histórico.
**Valor:** Alto | **Complexidade:** Média

### 8.4 Dockerfile e docker-compose ⬜
`docker compose up` sobe servidor + dependências.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 8.5 CI/CD (GitHub Actions) ⬜
Rodar `typecheck` + lint + testes automaticamente em cada push/PR.
**Valor:** Alto | **Complexidade:** Baixa

### 8.6 Bundle do servidor com esbuild ⬜
Build mais rápido e limpo que `tsc`.
**Valor:** Baixo | **Complexidade:** Baixa

---

## 9. Analytics e Dados

### 9.1 Dashboard de estatísticas ⬜
Página mostrando: total de buscas, taxa de sucesso, sites mais acessíveis, tempo médio de resposta.
**Valor:** Médio | **Complexidade:** Média

### 9.2 Termos de busca populares (anonymized) ⬜
Agregar termos para mostrar "produtos mais buscados".
**Valor:** Médio | **Complexidade:** Baixa-Média

### 9.3 Tracking de falhas por site ⬜
Monitorar quais sites estão com desafio/bloqueio e quais erros são mais comuns.
**Valor:** Médio | **Complexidade:** Baixa

---

## 10. Segurança e Confiabilidade

### 10.1 Sanitização de URLs (path traversal) ⬜
Garantir que `../etc/passwd` não funcione no servir de arquivos estáticos.
**Valor:** Alto | **Complexidade:** Baixa

### 10.2 Sanitização de inputs (XSS) 🟡
O servidor já usa `escapeHtml()` em respostas HTML de erro para arquivos estáticos, e a UI React escapa texto por padrão. Ainda vale revisar todos os caminhos de erro e qualquer HTML legado.
**Valor:** Alto | **Complexidade:** Baixa

### 10.3 Timeout global e cancelamento de requests 🟡
Há timeouts por operação do Playwright (`TIMEOUT = 30000` e esperas específicas), mas ainda falta cancelamento global por request com `AbortController`.
**Valor:** Alto | **Complexidade:** Baixa

---

## Roadmap Sugerido

| # | Feature | Esforço | Impacto |
|---|---|---|---|
| 1 | Busca multi-site simultânea | Médio | Alto |
| 2 | Pool de browsers / limite de concorrência | Médio-Alto | Alto |
| 3 | Filtros no frontend (preço, ordenação) | Médio | Alto |
| 4 | Watch de preços com alertas | Alto | Alto |
| 5 | Retry com backoff + timeout global | Baixo | Alto |
| 6 | Testes unitários (Vitest) | Baixo-Médio | Alto |
| 7 | CI/CD básico (typecheck + test) | Baixo | Médio |
| 8 | Export CSV | Baixo | Médio |
| 9 | Mais sites (Magalu, Amazon) | Médio-Alto | Médio |
| 10 | Rate limiting | Baixo | Médio |
| 11 | Stale-while-revalidate no cache | Médio | Médio |
| 12 | PWA (instalável) | Médio | Médio |
