# Design System — Scraper

## Identidade Visual

| Atributo | Valor |
|---|---|
| Tema | Dark mode nativo |
| Fundo | `#020617` (slate-950) |
| Superfície | `#0f172a` (slate-900) |
| Superfície alternativa | `#1b2440` |
| Borda | `#1e293b` (slate-800) |
| Fonte principal | `system-ui` stack (ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif) |
| Cor de destaque (accent) | `#f97316` (laranja) |
| Preço | `#fbbf24` (âmbar) |
| Texto primário | `#f1f5f9` (slate-100) |
| Texto secundário | `#94a3b8` (slate-400) |
| Texto muted | `#64748b` (slate-500) |

## Cores por Loja

| Loja | Cor Texto | Fundo Badge | Fundo Botão |
|---|---|---|---|
| KaBuM! | `#f97316` laranja | `rgba(249,115,22,0.1)` | `linear-gradient(to right, #f97316, #f59e0b)` |
| Pichau | `#ef4444` vermelho | `rgba(239,68,68,0.1)` | `linear-gradient(to right, #ef4444, #f43f5e)` |
| Terabyte | `#34d399` esmeralda | `rgba(52,211,153,0.1)` | `linear-gradient(to right, #10b981, #14b8a6)` |

## Background Animado

O fundo da página usa três gradientes radiais fixos que se deslocam lentamente:

```
radial-gradient(ellipse 60% 50% at 15% -10%, rgba(249,115,22,0.07), transparent 60%)
radial-gradient(ellipse 40% 40% at 85% 90%, rgba(249,115,22,0.04), transparent 50%)
radial-gradient(ellipse 50% 30% at 50% 50%, rgba(59,130,246,0.03), transparent 40%)
```

Animação `gradientShift` alterna `background-position` entre 0% e 100% em 30s infinita.

## Animações

| Nome | Duração | Onde Usa |
|---|---|---|
| `fadeInUp` | 0.5s | ProductCards (entrada em cascata com delay `index * 0.05s`) |
| `fadeIn` | 0.6s | StateMessage, footer |
| `badgePop` | 0.4s | "Melhor Opção" badge |
| `dotPulse` | 1.4s | Loading dots animados |
| `spinSlow` | — | Spinners |
| `spinReverse` | — | Spinners reversos |
| `shimmer` | — | Efeito brilho em superfícies |
| `breathe` | 2s | Elementos pulsantes (escala 1 → 1.5) |
| `tabActivate` | 0.35s | Aba de site ao ser selecionada (escala 0.92 → 1.05 → 1) |
| `radarRing` | 2s | Anéis expansivos no loading (3 anéis com delay 0s, 0.6s, 1.2s) |
| `radarSweep` | 2s | Sweep cônico no loading |
| `gradientShift` | 30s | Background animado (infinite alternate) |

## Componentes

### SearchForm
- Input de texto com placeholder "Ex: Ryzen 5 5600gt, RTX 4060..."
- Borda laranja com glow `rgba(249,115,22,0.5)` ao focar
- Seletor de site em **abas** (botões lado a lado com fundo slate-900 e borda slate-800)
- Aba ativa: cor da loja + fundo translúcido + animação `tabActivate`
- Botão "Buscar" com gradiente `from-orange-600 to-amber-600`, shadow laranja
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
1. **Imagem no topo** — container branco com padding, imagem `object-contain`, hover scale 1.1
2. **Badge "Melhor Opção"** — absoluta no canto superior esquerdo, cor da loja
3. **Store badge** — nome da loja com cor + borda translúcida
4. **Título** — fonte bold, `line-clamp-3`
5. **Preço** — âmbar, bold, tamanho `text-xl sm:text-2xl`, com "De:" riscado se houver preço original
6. **Parcelamento** — badge slate-800/50 com borda, inline
7. **Botão "Ir para a Loja"** — gradiente por loja, largura total, hover scale 1.02, active scale 0.98

**Comportamento:**
- Fallback de imagem: mostra "∅" se `onError` disparar
- `loading="lazy"` nas imagens
- Animação `fadeInUp` com delay progressivo (`index * 0.05s`)
- Hover: card levanta 0.5px, borda clareia

## Responsividade

- Breakpoints Tailwind padrão (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Container centralizado com `max-w-7xl` para resultados
- `max-w-2xl` para form no header
- Input adapta padding entre `compact` e modo normal
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

## Header

- Sticky no topo, `z-20`
- Fundo `bg-surface/80` com `backdrop-blur-md`
- Borda inferior sutil `border-white/[0.06]`
- SearchForm em modo compacto dentro do header

## Tipografia

- `system-ui` stack — sem dependência externa
- Uppercase + tracking-wider em labels (ex: "BUSCAR POR: RYZEN 5 5600GT")
- `font-black` no preço, `font-bold` em badges e botões
- `text-[11px]` para badges de loja e "Melhor Opção"

## Convenções de Espaçamento

- Padding horizontal: `px-4 sm:px-6`
- Padding vertical do conteúdo: `pt-5 sm:pt-8 pb-20 sm:pb-24`
- Gap entre cards: `gap-4 sm:gap-5 lg:gap-6`
- Footer afastado com `mt-14`

## Seleção de Texto

```css
::selection {
  background-color: rgba(249, 115, 22, 0.3);
  color: #fff;
}
```
