# Design System — Scraper

## Uso eficiente deste guia

- Consulte este arquivo apenas em tarefas de UI, UX, layout, responsividade, motion, cores, tipografia ou componentes visuais.
- Para ajustes pequenos em um componente, leia primeiro a seção do componente afetado e depois, se necessário, `Identidade Visual`, `Responsividade` ou `Convenções de Código`.
- Não releia todo o guia para mudanças de backend, scraper, SQLite, deploy, testes ou documentação não visual.
- Ao alterar um componente já documentado, mantenha a seção correspondente atualizada com uma frase curta; evite duplicar detalhes que já existem em `AGENTS.md`.
- Para decisões rápidas, preserve o tema dark, accent laranja, cores por loja, foco visível e motion usado como feedback de estado.

## Identidade Visual

| Atributo | Valor |
|---|---|
| Tema | Dark mode nativo |
| Fundo | `#020617` (slate-950) |
| Superfície | `#0f172a` (slate-900) |
| Superfície alternativa | `#1b2440` |
| Borda | `#1e293b` (slate-800) |
| Fonte UI | `Inter` (Google Fonts, variável 400–700) |
| Fonte Display | `DM Sans` (Google Fonts, 500–900), reservada para momentos pontuais |
| Cor de destaque (accent) | `#f97316` (laranja) |
| Preço | `#34d399` (esmeralda) |
| Texto primário | `#f1f5f9` (slate-100) |
| Texto secundário | `#94a3b8` (slate-400) |
| Texto muted | `#64748b` (slate-500) |

As cores principais são expostas por variáveis CSS customizadas via `@theme` em `client/src/index.css`. O accent laranja aparece em inputs, badges, botões, foco e seleção de texto.

### Logo

A marca usa o componente `Logo` com o asset `client/public/Logo.png`: símbolo com "S", lupa, tag de preço e acentos laranja/esmeralda. O mesmo PNG é usado como favicon para manter consistência entre header e aba do navegador.

## Cores por Loja

| Loja | Cor Texto | Fundo Badge | Fundo Botão |
|---|---|---|---|
| KaBuM! | `#f97316` laranja | `rgba(249,115,22,0.1)` | `linear-gradient(to right, #f97316, #f59e0b)` |
| Pichau | `#ef4444` vermelho | `rgba(239,68,68,0.1)` | `linear-gradient(to right, #ef4444, #f43f5e)` |
| Terabyte | `#34d399` esmeralda | `rgba(52,211,153,0.1)` | `linear-gradient(to right, #10b981, #14b8a6)` |

As cores por loja devem permanecer sincronizadas entre `App.tsx`, `ProductCard.tsx`, `SearchHistory.tsx`, `AutoResultsView.tsx` e as variáveis/classes de apoio em `index.css`.

## Background

### Gradientes Estáticos
O fundo da página usa três gradientes radiais fixos e discretos:

```css
radial-gradient(ellipse 60% 50% at 15% -10%, rgba(249,115,22,0.045), transparent 60%)
radial-gradient(ellipse 40% 40% at 85% 90%, rgba(249,115,22,0.025), transparent 50%)
radial-gradient(ellipse 50% 30% at 50% 50%, rgba(59,130,246,0.02), transparent 40%)
```

O fundo não anima por padrão. Motion deve indicar feedback de estado, não decoração.

### Textura Noise
Uma camada sutil de ruído fractal (SVG `feTurbulence`, 35% opacity, `mix-blend-mode: overlay`) sobrepõe o background para adicionar profundidade sem custo de performance.

### Scrollbar
- Largura: 6px
- Track: transparente
- Thumb: `rgba(249,115,22,0.25)` com hover `rgba(249,115,22,0.45)`

## Animações

| Nome | Duração | Onde Usa |
|---|---|---|
| `fadeInUp` | 0.5s | ProductCards (entrada em cascata com delay `index * 0.05s`) |
| `fadeIn` | 0.6s | StateMessage, footer, painéis |
| `badgePop` | 0.4s | "Melhor Opção" badge |
| `dotPulse` | 1.4s | Loading dots animados |
| `spinSlow` | — | Spinners |
| `spinReverse` | — | Spinners reversos |
| `shimmer` | 1.5s | Placeholder de imagem em ProductCard |
| `breathe` | 2s | Elementos pulsantes (escala 1 → 1.5) |
| `tabActivate` | 0.35s | Aba de site ao ser selecionada (escala 0.92 → 1.05 → 1) |
| `radarRing` | 2s | Anéis expansivos no loading (3 anéis com delay 0s, 0.6s, 1.2s) |
| `radarSweep` | 2s | Sweep cônico no loading |
| `numberTick` | 0.4s | Entrada de números em KPI (blur → foco) |
| `sparkDraw` | 0.6s | Desenho de sparkline SVG |
| `panelSlideIn` | 0.35s | Conteúdo expansível (painéis de resultado) |
| `kpiStagger` | 0.4s | KPI cards em cascata (entrada com translateY) |
| `dotPing` | — | Indicadores pontuais de status |

Todas as animações respeitam `prefers-reduced-motion: reduce`, que reduz transições/animações a duração mínima e desativa loops decorativos.

## Componentes

### SearchForm
- Input de texto com placeholder "Ex: RTX 4060, Ryzen 7 5700X, SSD NVMe 1TB"
- Borda laranja com ring discreto ao focar
- Seletor de site em **abas** (botões lado a lado com fundo slate-900 e borda slate-800)
- Aba ativa: cor da loja + fundo translúcido + animação `tabActivate`
- Botão "Comparar precos agora" com cor sólida `accent`, hover `accent-hover` e foco visível
- Autocomplete customizado abaixo do input combina histórico local com exemplos fixos, suporta mouse, `ArrowUp`/`ArrowDown`, `Enter` e `Escape`, e mantém badges por loja
- Modo `compact` (header sticky) vs modo normal (página inicial)
- A primeira tela do modo Buscar apresenta a promessa "Compare precos de informatica sem abrir varias abas" antes do input.
- No estado inicial, o SearchForm aparece apenas no hero; o header compacto entra depois que a busca sai do estado inicial.

### SearchHistory
- Aparece como pills contextuais abaixo do formulário no hero inicial ou junto do cabeçalho de resultados
- Cada pill mostra o termo entre aspas e badge da loja
- Máximo 5 entradas no localStorage
- Clique reexecuta a busca
- Cor da badge segue a loja

### StateMessage
Quatro estados visuais centralizados:

| Estado | Ícone | Título | Descrição |
|---|---|---|---|
| `initial` | Barra horizontal `w-5 h-px bg-accent` em círculo | "Compare antes de comprar" | Explica que a busca mostra precos, parcelamento e alertas |
| `loading` | Radar animado (3 rings + sweep cônico + dot pulsante) + dots animados | — | "Consultando lojas de informatica..." |
| `empty` | Mesmo ícone do initial | "Nenhuma oferta encontrada" | Sugere buscar pelo modelo exato |
| `error` | Círculo com "!" em accent | "Algo deu errado" | Mensagem do erro ou fallback |

### ProductGrid
- Grid responsivo: 1 coluna mobile, 2 tablet, 3 desktop, 4 widescreen
- Destaque "Melhor Opção" no primeiro card
- Usa `gap-4` a `gap-6`

### ProductCard

**Estrutura:**
1. **Imagem no topo** — container branco com padding, imagem `object-contain`, hover scale 1.1; shimmer placeholder animado enquanto carrega
2. **Badge "Melhor Opção"** — absoluta no canto superior esquerdo, cor da loja
3. **Store badge** — nome da loja com cor + borda translúcida
4. **Linha de confianca** — origem da loja e ultima atualizacao da busca atual
5. **Título** — fonte bold, `line-clamp-3`
6. **Preço** — esmeralda, `font-black`, tamanho `text-xl sm:text-2xl`, com "De:" riscado se houver preço original
7. **Trend badge** — indicador ▲/▼ com percentual (resumo do histórico)
8. **Parcelamento** — badge slate-800/50 com borda, inline
9. **PriceHistoryChart** — colapsável com sparkline e KPI (in/out), site color accent
10. **Botão "Avisar quando baixar"** — botão secundário slate com ícone `BellPlus`, usado para preencher a aba Alertas com o produto atual
11. **Botão "Ver oferta na loja"** — gradiente por loja, largura total, hover scale 1.02, active scale 0.98

**Comportamento:**
- Fallback de imagem: mostra "∅" se `onError` disparar
- `loading="lazy"` nas imagens
- Animação `fadeInUp` com delay progressivo (`index * 0.05s`)
- Hover: borda clareia de forma sutil, sem salto visual
- PriceHistoryChart mantém o gráfico montado durante o recolhimento para animar fechamento com altura, opacidade e leve deslocamento antes de desmontar.

### KpiCard (componente interno)
Usado em `AutoResultsView` e `AutoSearchPanel` para métricas visuais:

```
[ícone] label
        valor
        sub (opcional)
```

- Entrada com `kpiStagger` (cascata, delay `index * 0.06s`)
- `tabular-nums` para alinhamento de dígitos
- Cor do valor configurável via prop `accent`

### AutoSearchPanel
- **Painel de contexto**: explica o valor de salvar buscas para acompanhar novos precos sem repetir pesquisa e concentra o CTA "Rodar busca agora"
- **Status bar**: 4 KPI tiles (Status com dot animado, Próxima busca com countdown, Última execução e Produtos configurados)
- **Sub-tabs**: "Configurar buscas" e "Precos encontrados" com contagem de resultados
- Trigger button: permanece estável quando idle e mostra spinner durante execução, fora dos KPI tiles para preservar leitura das métricas

### AutoResultsView
- **Execution summary**: grid de 4 KPI cards (⏱ Início, ✅ Fim, 📦 Produtos, 👍 Sucesso/⚠️ Erros)
- **Termo sections**: gradient wash na cor da loja (`rgba(cor,0.08)`), barra esquerda sutil, border highlight quando aberto
- **Per-termo KPI**: menor preço e média exibidos acima do ProductGrid
- **Default expandido**: todos os termos abertos na montagem
- **Toggle "Expandir/Recolher todos"**: botão no canto superior direito
- **Animações**: `panelSlideIn` no conteúdo, `kpiStagger` nos KPIs

### AutoConfigList
- **Entradas inline**: termo input + seletor de site em button-group (cores por loja) + drag handle funcional com card flutuante, slot de destino e suporte a teclado + botão remover
- **Animações**: sem animação de entrada nas entries editáveis; usar apenas transições de borda/fundo para evitar flicker ao adicionar, editar ou reordenar
- **Empty state**: ilustração SVG (caixa + lupa), título, exemplos de termos e CTA "Salvar primeira busca"
- **Status "Não salvo"**: badge laranja quando há mudanças pendentes
- **Botão "Salvar"**: mostra spinner durante save, checkmark quando salvo

### WatchPanel
- **Painel de contexto**: explica que o alerta compara uma URL com o preco-alvo e envia aviso pelo Discord, com CTA "Verificar alertas"
- **Status bar**: 4 KPI tiles (Status, Próximo check, Alertas e Discord)
- **Formulário**: campos URL, Nome, Preço-alvo e seletor de site em button-group com cores por loja; Nome fica bloqueado enquanto a URL está sendo identificada
- **Lista de alertas**: cards compactos com nome, site, status, preço-alvo, último preço, último check, canal/disparo e texto de confiança sobre a próxima verificação
- **Histórico de preços**: cada card de alerta reutiliza `PriceHistoryChart` com a URL e loja do alerta quando já existem registros salvos em `price_history`
- **Discord state**: tile mostra "Configurado" ou "Sem webhook" para evitar falha silenciosa
- **Estados**: loading inline, empty state com ícone `Bell`, erro em banner vermelho e badge "Salvo" após criação
- **Produto específico**: quando aberto pelo ProductCard, preenche nome, URL, site e preço atual como sugestão de alvo

### StatsDashboardPanel
- **Aba Dashboard**: quarta opção no header, ao lado de Buscar, Buscas salvas e Alertas
- **Painel de contexto**: apresenta métricas operacionais do scraper sem linguagem promocional
- **KPI grid**: total de buscas, taxa de sucesso, tempo médio e falhas, usando `tabular-nums`, ícones lucide e `kpiStagger`
- **Sites mais acessíveis**: ranking por taxa de sucesso, com volume, erros e tempo médio para contexto
- **Estados**: loading inline, empty state quando ainda não há métricas e erro em banner vermelho
- **Escopo**: dados all-time de busca manual, Auto Search e Watch, sem filtro de período na primeira versão

## Responsividade

- Breakpoints Tailwind padrão (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Container: `max-w-4xl` para auto-search, `max-w-7xl` para resultados manuais
- `max-w-2xl` para form no header
- KPI grids: 1 col mobile, 2 col tablet, 3-4 col desktop (conforme contexto)
- Grid de produtos: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Input adapta padding entre `compact` e modo normal

## Header

- Sticky no topo, `z-20`
- Fundo `bg-surface/80` com `backdrop-blur-md`
- Borda inferior sutil `border-white/[0.06]`
- Logo à esquerda no desktop e centralizada no mobile, preservando o toggle de modos como controle principal
- Mode toggle com botões `rounded-xl`, `font-bold`, padding `px-4 py-2`
- Modos: Buscar, Buscas salvas e Alertas
- Modo Dashboard exibe estatísticas operacionais all-time
- Fonte Display para labels dos modos
- SearchForm em modo compacto dentro do header (modo Buscar após o estado inicial)

## Tipografia

- **UI**: Inter (400, 500, 600, 700) — carregado via Google Fonts e usado na maior parte da interface
- **Display**: DM Sans (500, 600, 700, 800, 900) — uso pontual, evitando labels operacionais
- Labels operacionais usam sentence case ou título curto, com pouco tracking
- `font-semibold`/`font-bold` em preços, badges e botões, evitando peso visual excessivo
- `text-[10px]` para labels de KPI, `text-[11px]` para badges
- `tabular-nums` para valores numéricos (preços, contagens, horários)

## Convenções de Espaçamento

- Padding horizontal do conteúdo: `px-4 sm:px-6`
- Padding vertical do conteúdo: `pt-5 sm:pt-8 pb-20 sm:pb-24`
- Gap entre cards: `gap-4 sm:gap-5 lg:gap-6`
- Footer afastado com `mt-14`
- KPI gaps: `gap-2.5`

## Seleção de Texto

```css
::selection {
  background-color: rgba(249, 115, 22, 0.3);
  color: #fff;
}
```

## Convenções de Código

- **KPI components**: usar `tabular-nums` + `kpiStagger` animation para entrada em cascata
- **Site sections**: usar gradient `linear-gradient(135deg, ${siteColor.light}, transparent 70%)` para background de termo
- **Loading spinners**: spinner duplo (anel externo + interno reverso) para estados de carregamento
- **Cards**: `fadeInUp` curto com delay progressivo, sem sombras grandes
- **Motion**: usar apenas para feedback de estado, expansão/recolhimento e carregamento; evitar loops decorativos
- **Acessibilidade**: controles selecionáveis usam `aria-pressed`; botões sem texto visual precisam de `aria-label`; foco visível deve ser preservado
