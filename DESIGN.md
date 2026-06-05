# Design System — Scraper

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

## Cores por Loja

| Loja | Cor Texto | Fundo Badge | Fundo Botão |
|---|---|---|---|
| KaBuM! | `#f97316` laranja | `rgba(249,115,22,0.1)` | `linear-gradient(to right, #f97316, #f59e0b)` |
| Pichau | `#ef4444` vermelho | `rgba(239,68,68,0.1)` | `linear-gradient(to right, #ef4444, #f43f5e)` |
| Terabyte | `#34d399` esmeralda | `rgba(52,211,153,0.1)` | `linear-gradient(to right, #10b981, #14b8a6)` |

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

Todas as animações respeitam `prefers-reduced-motion: reduce`, que reduz transições/animações a duração mínima e desativa loops decorativos.

## Componentes

### SearchForm
- Input de texto com placeholder "Ex: Ryzen 5 5600GT, RTX 4060"
- Borda laranja com ring discreto ao focar
- Seletor de site em **abas** (botões lado a lado com fundo slate-900 e borda slate-800)
- Aba ativa: cor da loja + fundo translúcido + animação `tabActivate`
- Botão "Buscar" com cor sólida `accent`, hover `accent-hover` e foco visível
- Modo `compact` (header sticky) vs modo normal (página inicial)

### SearchHistory
- Aparece como pills horizontais abaixo do header
- Cada pill mostra o termo entre aspas e badge da loja
- Máximo 5 entradas no localStorage
- Clique reexecuta a busca
- Cor da badge segue a loja

### StateMessage
Quatro estados visuais centralizados:

| Estado | Ícone | Título | Descrição |
|---|---|---|---|
| `initial` | Barra horizontal `w-5 h-px bg-accent` em círculo | "Busque por produtos" | "Digite o nome de um produto e escolha uma loja" |
| `loading` | Radar animado (3 rings + sweep cônico + dot pulsante) + dots animados | — | "Buscando" + 3 dots pulsantes |
| `empty` | Mesmo ícone do initial | "Nenhum resultado" | "Tente outro termo de busca" |
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
4. **Título** — fonte bold, `line-clamp-3`
5. **Preço** — esmeralda, `font-black`, tamanho `text-xl sm:text-2xl`, com "De:" riscado se houver preço original
6. **Trend badge** — indicador ▲/▼ com percentual (resumo do histórico)
7. **Parcelamento** — badge slate-800/50 com borda, inline
8. **PriceHistoryChart** — colapsável com sparkline e KPI (in/out), site color accent
9. **Botão "Ir para a Loja"** — gradiente por loja, largura total, hover scale 1.02, active scale 0.98

**Comportamento:**
- Fallback de imagem: mostra "∅" se `onError` disparar
- `loading="lazy"` nas imagens
- Animação `fadeInUp` com delay progressivo (`index * 0.05s`)
- Hover: borda clareia de forma sutil, sem salto visual

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
- **Status bar**: 3 KPI tiles (Status com dot animado, Próxima busca com countdown, Produtos configurados + botão Executar)
- **Sub-tabs**: "⚙️ Configurar" e "📊 Resultados" com contagem de resultados
- Trigger button: permanece estável quando idle e mostra spinner durante execução

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
- **Empty state**: ilustração SVG (caixa + lupa), título + descrição + CTA
- **Status "Não salvo"**: badge laranja quando há mudanças pendentes
- **Botão "Salvar"**: mostra spinner durante save, checkmark quando salvo

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
- Mode toggle com botões `rounded-xl`, `font-bold`, padding `px-4 py-2`
- Fonte Display para labels dos modos (Manual / Automática)
- SearchForm em modo compacto dentro do header (apenas modo manual)

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
