---
description: "Analisa diff, stageia alterações e cria commit automático em pt-BR"
argument-hint: "contexto opcional do commit"
agent: "commit"
---

Crie um commit automaticamente para as alterações atuais do repositório.

Use o argumento do usuário apenas como contexto adicional:

```
$ARGUMENTS
```

## Objetivo

Verificar o estado do Git, analisar os diffs, stagear as mudanças apropriadas e executar `git commit` com uma mensagem em português do Brasil no padrão Conventional Commits.

## Regras obrigatórias

- Não faça `git push`.
- Não peça confirmação quando as alterações forem coesas e seguras.
- Pare e pergunte ao usuário se houver mudanças não relacionadas que deveriam virar commits separados.
- Pare sem commitar se houver conflitos de merge.
- Pare sem commitar se detectar arquivos ou trechos suspeitos de segredo, como `.env`, `*.pem`, `credentials.json`, tokens, chaves privadas, senhas ou variáveis com `SECRET`, `TOKEN`, `PASSWORD`, `API_KEY`.
- Não reverta alterações.
- Preserve mudanças existentes do usuário.
- Use português do Brasil em toda a mensagem de commit.
- Siga Conventional Commits: `tipo(escopo): descrição`.
- Use apenas estes tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `build`, `chore`, `ci`.
- Use escopo quando fizer sentido: `scraper`, `server`, `client`, `auto`, `docs`, `deps`, `config`.
- Mantenha a primeira linha com no máximo 72 caracteres.
- Escreva a descrição no presente, curta, direta e sem ponto final.
- Inclua corpo detalhado quando o diff tiver mais de uma mudança relevante.
- No corpo, explique o que mudou e por que mudou, agrupando por área afetada.
- Se houver breaking change, use `!` no tipo/escopo e explique no rodapé.

## Fluxo

1. Leia `AGENTS.md` para confirmar as regras do projeto.
2. Execute `git status --short`.
3. Execute `git diff --stat`.
4. Execute `git diff --cached --stat`.
5. Verifique se há conflitos com `git diff --name-only --diff-filter=U`.
6. Se não houver alterações staged, unstaged ou untracked, responda: `Nenhuma alteração encontrada para commit.`
7. Analise os diffs:
   - `git diff --no-color`
   - `git diff --cached --no-color`
   - Para arquivos untracked relevantes, leia o conteúdo antes de stagear.
8. Identifique se as mudanças formam um único commit coeso.
9. Se forem coesas e seguras, execute `git add -A`.
10. Execute `git diff --cached --stat` novamente.
11. Execute `git diff --cached --no-color` para revisar exatamente o que será commitado.
12. Gere a mensagem de commit.
13. Execute `git commit` com a mensagem gerada.
14. Execute `git log -1 --stat --oneline` para confirmar o resultado.
15. Responda com hash, mensagem usada e resumo dos arquivos commitados.

## Formato da mensagem

Use este formato para mudanças simples:

```text
tipo(escopo): descrição curta em pt-BR
```

Use este formato para mudanças detalhadas:

```text
tipo(escopo): descrição curta em pt-BR

Detalha a finalidade geral da alteração em uma ou duas frases.

Alterações:
- Área 1: descreve mudança relevante
- Área 2: descreve mudança relevante

Impacto:
- Explica efeitos práticos, compatibilidade ou observações de teste
```

## Exemplos

```text
feat(auto): adiciona painel de buscas automáticas

Implementa a configuração e visualização de buscas automáticas na interface.

Alterações:
- client: adiciona painel, lista de configuração e resultados por termo
- server: expõe endpoints para salvar configuração e consultar execuções
- banco: registra execuções e resultados no SQLite

Impacto:
- Permite acompanhar preços recorrentes sem acionar buscas manuais
```

```text
fix(scraper): corrige extração de preços da Pichau

Ajusta seletores para acompanhar a marcação atual da página de resultados.

Impacto:
- Reduz resultados vazios em buscas DOM da Pichau
```
