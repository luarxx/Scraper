# Ideias e Próximos Passos — Scraper

Ideias de funcionalidades organizadas por categoria, com valor estimado e complexidade.

---

## 1. Persistência de Dados / Banco de Dados

### 1.1 Banco de dados local (SQLite)
Substituir o cache baseado em JSON por SQLite estruturado. Permite consultas complexas (histórico de preços, logs), evita corrupção e dá suporte a concorrência.
**Valor:** Alto | **Complexidade:** Média

### 1.2 Exportação de resultados (CSV, JSON)
Usuário baixa o resultado da busca como CSV ou JSON para análise offline.
**Valor:** Médio | **Complexidade:** Baixa

---

## 2. Monitoramento e Rastreamento de Produtos

### 2.1 "Watch" de preços (alertas de queda)
Usuário marca um produto e recebe alerta quando o preço cai abaixo de um limite (console, email, WebSocket ou Discord).
**Valor:** Alto | **Complexidade:** Alta

### 2.2 Histórico de preços por produto
Gráfico mostrando a oscilação de preço ao longo do tempo. Ajuda o usuário a decidir o melhor momento de compra.
**Valor:** Alto | **Complexidade:** Média-Alta

### 2.3 Lista de favoritos / "Desejos"
Usuário salva produtos favoritos (localStorage ou DB) com atalho para ver preços atualizados de todos de uma vez.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 2.4 Scraping periódico automático (cron)
Rodar scraping de produtos monitorados em intervalos regulares (ex.: a cada 6h) para alimentar histórico sem ação do usuário.
**Valor:** Alto | **Complexidade:** Média

---

## 3. Melhorias no Scraping (Fontes e Robustez)

### 3.1 Novos sites (Magalu, Amazon, Mercado Livre, Shopee)
Cada nova loja aumenta a utilidade do scraper. Amazon e ML são notoriamente difíceis (anti-bot agressivo).
**Valor:** Alto | **Complexidade:** Média-Alta

### 3.2 Estratégias de anti-bot mais robustas
Proxies rotativos, fingerprint aleatório, `playwright-stealth`. Aumenta a taxa de sucesso em sites protegidos.
**Valor:** Alto | **Complexidade:** Média-Alta

### 3.3 Suporte a paginação (mais resultados)
Atualmente pega apenas a primeira página. Adicionar navegação para coletar significativamente mais produtos.
**Valor:** Alto | **Complexidade:** Média

### 3.4 Cache inteligente com stale-while-revalidate
Servir dado antigo imediatamente e atualizar em background enquanto o cache expira.
**Valor:** Médio | **Complexidade:** Média

### 3.5 Parsing avançado de parcelamento (CET, juros)
Extrair dados mais ricos: com/sem juros, valor total a prazo, taxa de juros efetiva.
**Valor:** Médio | **Complexidade:** Baixa

### 3.6 Retry com backoff exponencial
Se um site falhar (timeout, challenge, 503), tentar novamente com espera exponencial antes de retornar erro.
**Valor:** Alto | **Complexidade:** Baixa

---

## 4. APIs e Infraestrutura do Servidor

### 4.1 Rate limiting no servidor
Prevenir abuso (ex.: 100 requisições/min). Protege o servidor e evita bloqueio pelos sites alvo.
**Valor:** Médio | **Complexidade:** Baixa

### 4.2 Endpoint de busca multi-site
`/api/search/all?q=...` busca em todos os sites simultaneamente e agrega os resultados.
**Valor:** Alto | **Complexidade:** Média

### 4.3 Endpoint de sugestão / autocomplete
Sugerir termos de busca populares enquanto o usuário digita (baseado em histórico).
**Valor:** Médio | **Complexidade:** Baixa

### 4.4 Health check / status endpoint
`/api/health` para monitoramento (uptime, versão, status dos sites, uso de memória).
**Valor:** Médio | **Complexidade:** Baixa

### 4.5 Suporte a streaming (SSE ou WebSocket)
Notificar o frontend em tempo real quando uma busca concluir ou preço monitorado mudar.
**Valor:** Médio | **Complexidade:** Média

### 4.6 Logging estruturado
Substituir `console.log` por logger com níveis, timestamps e rotação de arquivos (pino, winston).
**Valor:** Médio | **Complexidade:** Baixa

### 4.7 Pool de browsers (limite de concorrência)
Impedir que N requisições abram N instâncias do Chromium e esgotem a memória.
**Valor:** Alto | **Complexidade:** Média-Alta

---

## 5. Melhorias na Interface (UX/UI)

### 5.1 Filtros no frontend (preço, parcelamento, ordenação)
Filtrar/ordenar resultados sem refazer requisição: menor preço, maior relevância, faixa de valor.
**Valor:** Alto | **Complexidade:** Média

### 5.2 Comparação lado a lado de produtos
Selecionar 2-3 produtos e ver tabela comparativa com preços e lojas.
**Valor:** Médio | **Complexidade:** Média-Alta

### 5.3 Modo claro / temas
Atualmente só tema escuro. Permitir trocar para tema claro ou temas customizados.
**Valor:** Médio | **Complexidade:** Baixa

### 5.4 PWA (instalável como app)
Service worker + manifest para instalar como aplicativo no celular/desktop.
**Valor:** Médio | **Complexidade:** Média

### 5.5 Melhorias de acessibilidade (a11y)
ARIA labels, foco gerenciado, contraste, navegação por teclado.
**Valor:** Médio | **Complexidade:** Média

### 5.6 Paginação dos resultados no frontend
Dividir muitos resultados em páginas de 12 ou 20 itens.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.7 Lightbox / prévia ampliada da imagem
Mostrar versão ampliada ao passar o mouse ou clicar na imagem.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.8 Compartilhar resultado da busca
Botão para copiar link da busca ou compartilhar.
**Valor:** Baixo | **Complexidade:** Baixa

### 5.9 Scroll infinito
Carregar mais produtos conforme o usuário rola (IntersectionObserver).
**Valor:** Médio | **Complexidade:** Média

---

## 6. Comparação e Multi-Site

### 6.1 Busca integrada em todos os sites simultaneamente
Usuário busca em todas as lojas de uma vez e vê resultados agregados com melhor preço global em destaque.
**Valor:** Alto | **Complexidade:** Média

### 6.2 Aba "Melhor Preço Geral" (cross-site)
Destaque visual para o produto com menor preço entre todas as lojas para aquele termo.
**Valor:** Alto | **Complexidade:** Baixa

### 6.3 Cálculo de frete (via CEP)
Usuário insere o CEP e o scraper tenta extrair opções de frete de cada loja.
**Valor:** Médio | **Complexidade:** Alta

### 6.4 Cálculo de cashback / descontos
Exibir estimativas de cashback ou descontos para Pix/boleto.
**Valor:** Médio | **Complexidade:** Média

---

## 7. Notificações e Automação

### 7.1 Webhook Discord / Telegram
Enviar resultado de busca ou alerta de preço para um canal.
**Valor:** Médio | **Complexidade:** Média

### 7.2 CLI interativa (prompt)
Menu interativo com `readline` ou `inquirer` para escolher site e termo.
**Valor:** Baixo | **Complexidade:** Baixa

### 7.3 Automação com GitHub Actions
Agendar scraping periódico via GitHub Actions (ex.: buscar "ryzen 5 5600" toda manhã).
**Valor:** Médio | **Complexidade:** Baixa

---

## 8. DevOps, Testes e Qualidade

### 8.1 Testes unitários (Vitest)
Garantir que parsing de preços, ordenação e lógica de extração funcionem corretamente.
**Valor:** Alto | **Complexidade:** Baixa-Média

### 8.2 Testes de integração (API endpoints)
Testar se `/api/search`, `/api/sites` respondem corretamente com validação e erros.
**Valor:** Alto | **Complexidade:** Média

### 8.3 Testes E2E com Playwright (frontend)
Fluxo completo: abrir app, digitar termo, ver resultados, clicar em histórico.
**Valor:** Alto | **Complexidade:** Média

### 8.4 Dockerfile e docker-compose
`docker compose up` sobe servidor + dependências.
**Valor:** Médio | **Complexidade:** Baixa-Média

### 8.5 CI/CD (GitHub Actions)
Rodar `typecheck` + lint + testes automaticamente em cada push/PR.
**Valor:** Alto | **Complexidade:** Baixa

### 8.6 Bundle do servidor com esbuild
Build mais rápido e limpo que `tsc`.
**Valor:** Baixo | **Complexidade:** Baixa

---

## 9. Analytics e Dados

### 9.1 Dashboard de estatísticas
Página mostrando: total de buscas, taxa de sucesso, sites mais acessíveis, tempo médio de resposta.
**Valor:** Médio | **Complexidade:** Média

### 9.2 Termos de busca populares (anonymized)
Agregar termos para mostrar "produtos mais buscados".
**Valor:** Médio | **Complexidade:** Baixa-Média

### 9.3 Tracking de falhas por site
Monitorar quais sites estão com desafio/bloqueio e quais erros são mais comuns.
**Valor:** Médio | **Complexidade:** Baixa

---

## 10. Segurança e Confiabilidade

### 10.1 Sanitização de URLs (path traversal)
Garantir que `../etc/passwd` não funcione no servir de arquivos estáticos.
**Valor:** Alto | **Complexidade:** Baixa

### 10.2 Sanitização de inputs (XSS)
Input do usuário aparece no HTML de resposta de erro — garantir que não haja XSS.
**Valor:** Alto | **Complexidade:** Baixa

### 10.3 Timeout global e cancelamento de requests
Se scraping demorar >60s, cancelar e retornar erro (AbortController).
**Valor:** Alto | **Complexidade:** Baixa

---

## Roadmap Sugerido

| # | Feature | Esforço | Impacto |
|---|---|---|---|
| 1 | Busca multi-site simultânea | Médio | Alto |
| 2 | Pool de browsers / limite de concorrência | Médio-Alto | Alto |
| 3 | Filtros no frontend (preço, ordenação) | Médio | Alto |
| 4 | SQLite para persistência e histórico | Médio | Alto |
| 5 | Retry com backoff + timeout global | Baixo | Alto |
| 6 | Testes unitários (Vitest) | Baixo-Médio | Alto |
| 7 | CI/CD básico (typecheck + test) | Baixo | Médio |
| 8 | Export CSV | Baixo | Médio |
| 9 | Mais sites (Magalu, Amazon) | Médio-Alto | Médio |
| 10 | Rate limiting | Baixo | Médio |
| 11 | Histórico de preços com gráfico | Médio-Alto | Médio |
| 12 | PWA (instalável) | Médio | Médio |
