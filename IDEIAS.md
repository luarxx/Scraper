# Ideias Frontend / Design

Ideias para evolução do frontend. Cada seção contém descrição, estimativa de esforço, dependências e considerações técnicas.

---

## A) Visibilidade da randomização de intervalo

**Liga com:** backend de intervalo aleatório recém-implementado.

**O que mostrar:**
- No **AutoSearchPanel**: badge "Intervalo variável 3–9h" abaixo do status, substituindo "a cada 3h"
- No **StatsDashboard**: próximo horário de execução com barra de range (ex: "Próxima: entre 14:30 e 20:30") com indicador fuzzy
- **Tooltip** explicativo: "O intervalo varia aleatoriamente entre 3h e 9h para evitar detecção"
- Log de últimas execuções com os intervalos reais sorteados

**Esforço:** baixo (1–2 componentes pequenos, sem endpoint novo)
**Dependências:** nenhuma (dados já disponíveis)
**Prioridade sugerida:** alta — coeso com as mudanças recentes

---

## B) Status de challenge por site

**Liga com:** melhorias anti-detecção recém-implementadas.

**O que mostrar:**
- **Header / resultados:** badge de saúde por site — verde (ok), laranja (desafiado mas passou), vermelho (bloqueado)
- **StatsDashboard:** coluna "Challenges" na tabela SiteRow com taxa de sucesso nas últimas N execuções
- **ProductCard / resultados:** tooltip "Este site está sob desafio de segurança" quando aplicável
- Gráfico de linha: challenges ao longo do tempo (oscilação)

**Esforço:** médio (precisa expor métricas de challenge via endpoint ou extrair dos dados existentes)
**Dependências:** endpoint `/api/stats/challenges` ou incluir campo de challenge nas métricas atuais
**Prioridade sugerida:** alta — coeso com as mudanças recentes

---

## C) Central de notificações (Watch + Wishlist)

**O que mostrar:**
- **Header:** ícone de sino com badge numérico de alertas disparados / itens com queda de preço
- **Dropdown:** últimos N alertas, cada um com:
  - Nome do produto, loja, preço
  - Setinha verde indicando queda
  - Link para o produto
  - Timestamp relativo ("há 2h")
- **Badge com pulso** quando há alertas não visualizados
- Estado vazio com ilustração e texto "Nenhuma notificação ainda"

**Esforço:** médio (componente novo + hook de polling)
**Dependências:** armazenar no backend quais alertas foram "visualizados" ou usar last-seen timestamp
**Prioridade sugerida:** média — alto valor de UX, mas depende de definição de "lido"

---

## D) Comparação de produtos

**O que mostrar:**
- **ProductGrid:** checkbox no canto de cada card ao ativar modo "Comparar"
- **Barra flutuante:** "2 selecionados" com botão "Comparar"
- **Modal de comparação:** tabela lado a lado com colunas:
  - Produto, loja, preço à vista, parcelamento, link
  - Destaque na melhor oferta (menor preço)
  - Badge de diferença percentual ("12% mais barato na Pichau")
- **Botão "Copiar"** formata como texto para Discord/WhatsApp
- Estado vazio do modal: "Selecione ao menos 2 produtos para comparar"

**Esforço:** alto (componente novo + lógica de seleção + modal + formatação)
**Dependências:** nenhuma
**Prioridade sugerida:** baixa — feature nova, não essencial

---

## E) Micro sparkline de preço nos cards

**O que mostrar:**
- **ProductCard:** minigráfico inline de 7 dias (~100px, sem eixos, só a linha)
- Só aparece se houver histórico para aquele produto
- Cor da linha conforme tendência:
  - Verde (`#34d399`) se preço caiu nos últimos 7 dias
  - Vermelho (`#ef4444`) se subiu
  - Cinza (`#64748b`) se estável
- Tooltip ao passar o mouse: "R$ 399,90 → R$ 349,90 (-12%)"
- Fallback: se sem histórico, não renderiza nada (sem quebra de layout)

**Esforço:** baixo (reusa PriceHistoryChart existente + hook usePriceHistory)
**Dependências:** nenhuma (dados já disponíveis via usePriceHistory)
**Prioridade sugerida:** alta — pouco esforço, alto impacto visual

---

## F) Esqueleto shimmer nas listas

**O que mostrar:**
- **ProductGrid:** skeleton cards com animação shimmer (já definida em index.css como `@keyframes shimmer`)
- **AutoResultsView:** skeleton rows na tabela de resultados
- **WatchPanel / WishlistPanel:** skeleton cards nas listas de alertas/itens
- Cards fantasmas imitam layout real: retângulo de imagem, 2–3 linhas de texto, placeholder de preço
- Animação: gradiente móvel da esquerda para a direita com pulso de opacidade

**Esforço:** baixo (componente SkeletonCard + substituir StateMessage "carregando")
**Dependências:** nenhuma
**Prioridade sugerida:** alta — percepção de velocidade, reuso em várias telas

---

## G) Tour / onboarding para primeira visita

**O que mostrar:**
- Detecta primeira visita (localStorage vazio ou flag `onboarding_visto`)
- Overlay com 3–4 tooltips sequenciais, cada um apontando para um elemento da UI:
  1. Campo de busca: "Busque produtos em lojas de informática brasileiras"
  2. Modo Buscas Salvas: "Salve termos para monitoramento automático"
  3. Modo Alertas: "Crie alertas Watch para ser notificado no Discord quando o preço cair"
  4. Modo Desejos: "Adicione produtos aos favoritos e receba notificações de queda"
- Navegação: "Próximo" / "Anterior" / "Pular"
- Botão "Reiniciar tour" nas configurações ou footer

**Esforço:** médio (componente standalone + hook de estado + tooltips posicionados)
**Dependências:** nenhuma
**Prioridade sugerida:** média — bom para novos usuários, irrelevante para quem já usa

---

## H) Atalhos de teclado

**O que mostrar:**
- **`/`** — foco no campo de busca (qualquer modo)
- **`Esc`** — fecha modal de comparação / limpa seleção / sai do DOM Inspector
- **`1`** — modo Buscar
- **`2`** — modo Buscas Salvas (Auto Search)
- **`3`** — modo Desejos
- **`4`** — modo Alertas (Watch)
- **`5`** — modo Dashboard
- **`c`** — (em modo Buscar com resultados) ativa/desativa modo Comparação
- **`?`** — abre modal de ajuda com todos os atalhos listados

**Esforço:** baixo (hook `useHotkeys` + componente HelpModal)
**Dependências:** nenhuma
**Prioridade sugerida:** baixa — polish, não essencial

---

## Sumário de prioridades

| Prioridade | Ideia | Esforço | Coeso com backend recente |
|---|---|---|---|
| Alta | A — Intervalo variável | Baixo | Sim |
| Alta | B — Status de challenge | Médio | Sim |
| Alta | E — Sparkline nos cards | Baixo | Não |
| Alta | F — Shimmer nas listas | Baixo | Não |
| Média | C — Central de notificações | Médio | Não |
| Média | G — Tour onboarding | Médio | Não |
| Baixa | D — Comparação de produtos | Alto | Não |
| Baixa | H — Atalhos de teclado | Baixo | Não |

---

## Notas técnicas

- Todas as ideias respeitam o design system existente (dark mode, `Inter`, `DM Sans`, cores, motion via `@keyframes`, `prefers-reduced-motion`)
- Nenhuma delas exige nova lib externa
- A, B, E e F podem começar em paralelo por terem dependências independentes
- C precisa de decisão sobre o modelo de "notificação lida": localStorage (simples) vs coluna no banco (robusto)
- D é a única que impacta significativamente o layout do ProductGrid
