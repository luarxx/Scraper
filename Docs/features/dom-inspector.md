# DOM Inspector

Ferramenta de desenvolvimento frontend para inspecionar elementos da pagina e copiar HTML bruto — util para debugar seletores de scraping.

## Visao Geral

- **Frontend puro**: sem dependencia de backend, API ou banco.
- **Botao flutuante**: fixo no canto inferior direito (`fixed bottom-5 right-5 z-50`).
- **Toggle**: ativa/desativa o modo de inspecao.

## Comportamento

### Inativo (padrao)

- Botao exibe `DEV Inspect` com indicador verde.
- Nenhum listener de evento extra esta ativo.

### Ativo

1. **Cursor** muda para `crosshair` no `<html>`.
2. **Hover**: o elemento sob o mouse ganha contorno azul (`2px dashed #3b82f6`). O contorno anterior e removido.
3. **Clique**: na fase de captura, o evento padrao e cancelado. O `outerHTML` do elemento clicado e copiado para a area de transferencia. Um toast de confirmacao (ou erro) aparece por 2,5s. O inspetor e desativado apos o clique.
4. **Escape**: desativa o inspetor sem copiar nada.
5. **Clique no proprio botao**: ignora a inspecao e apenas desativa o modo.

## Arquivos

| Arquivo | Papel |
|---|---|
| `client/src/components/DomInspector.tsx` | Componente React (156 linhas) |
| `client/src/App.tsx` | Importa e renderiza `<DomInspector />` |
| `client/src/index.css` | Animacao `fadeInUp` do toast |

## Estrutura do Componente

### Estado

- `isActive: boolean` — modo ligado/desligado.
- `toast: string | null` — mensagem do toast.
- `highlightedRef: Ref<HTMLElement | null>` — elemento atualmente destacado.
- `buttonRef: Ref<HTMLButtonElement>` — referencia ao proprio botao (excluido do highlight).
- `toastTimerRef: Ref<timeout>` — timer de auto-limpeza do toast (2,5s).

### Metodos

- `showToast(msg)` — exibe toast por 2,5s.
- `deactivate()` — limpa outline e cursor, desliga modo.
- `toggle()` — alterna `isActive`.

### Effects

| Effect | Gatilho | Acao |
|---|---|---|
| keydown | `isActive` | Esc -> `deactivate()` |
| mousemove | `isActive` | Destaca elemento sob o mouse |
| click (capture) | `isActive` | Copia outerHTML e desativa |
| cursor | `isActive` | Seta `crosshair` no `<html>` |
| cleanup | montagem | Remove outline e cursor ao desmontar |

## Toast

- Exibido em `fixed bottom-20 right-5 z-50`.
- Animado com `fadeInUp` (0,3s ease-out).
- Texto: `> HTML copiado para a area de transferencia` (verde) ou `> Falha ao copiar HTML` (em erro).
- Desaparece automaticamente apos 2,5s.

## Notas

- Nao possui testes.
- Nao possui configuracao ou env vars.
- Renderizado incondicionalmente em `App.tsx`.
- Independente do sistema de scraping — e uma ferramenta de desenvolvimento, nao de extracao de dados.
