<purpose>
Analisa todas as alterações do repositório, gera uma mensagem de commit detalhada em português (pt-BR) seguindo as regras de commit do projeto, e executa o commit após confirmação do usuário.

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `question` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-the agent runtimes (OpenAI Codex, Gemini CLI, etc.) where `question` is not available.
</purpose>

<required_reading>
- Read AGENTS.md to understand commit message rules (prefix format, body structure, file grouping)
- Read all changed files to understand the context and purpose of changes
</required_reading>

<process>

<step name="check_status">
Verificar o estado atual do repositório:

```bash
git status --short
```

```bash
git diff --stat
```

```bash
git diff --cached --stat
```

Listar arquivos modificados, adicionados e deletados. Separar em:
- Arquivos com mudanças staged (já no index)
- Arquivos com mudanças unstaged (modificados mas não adicionados)
- Arquivos untracked (novos)

Se não houver nenhuma alteração (staged ou unstaged):
```
Nenhuma alteração encontrada para commit.
```
E encerrar o workflow.
</step>

<step name="analyze_changes">
Para cada arquivo alterado, ler o diff para entender o contexto da mudança:

```bash
git diff --no-color -- arquivo1 arquivo2 ...
```

```bash
git diff --cached --no-color -- arquivo1 arquivo2 ...
```

Para arquivos novos (untracked), ler o conteúdo completo com a ferramenta Read.

Analisar e categorizar as mudanças por funcionalidade:
- Identificar o tipo de alteração (feat, fix, docs, refactor, style, test, chore)
- Agrupar arquivos por funcionalidade ou módulo
- Determinar a finalidade e contexto de cada mudança
- Identificar motivos e impacto das alterações
</step>

<step name="generate_message">
Gerar a mensagem de commit seguindo rigorosamente o padrão definido em AGENTS.md:

**1. Linha de resumo (máx 72 caracteres, imperativa, prefixo):**
- `feat:` - nova funcionalidade
- `fix:` - correção de bug
- `docs:` - documentação
- `refactor:` - refatoração
- `style:` - formatação, sem lógica
- `test:` - testes
- `chore:` - tarefas auxiliares

**2. Corpo da mensagem (separado por linha em branco):**
- Explicação clara da finalidade e contexto
- Lista de arquivos afetados, agrupados por funcionalidade
- Informações adicionais (motivo da mudança, impacto)

Exemplo de estrutura:
```
tipo: resumo imperativo com máximo 72 caracteres

Explicação clara da finalidade e contexto da alteração.

Arquivos afetados:
- Funcionalidade A: caminho/arquivo1.ts, caminho/arquivo2.ts
- Funcionalidade B: caminho/arquivo3.tsx
- Configuração: package.json, tsconfig.json

Informações adicionais: motivo da mudança, impacto no projeto.
```
</step>

<step name="confirm">
Mostrar a mensagem gerada e pedir confirmação:

```
Mensagem de commit gerada:

----------------------------------------
{tipo: resumo}

{explicação da finalidade e contexto}

Arquivos afetados:
- {grupo1}: {arquivos}
- {grupo2}: {arquivos}

{informações adicionais}
----------------------------------------

Arquivos que serão commitados:
{lista de todos os arquivos staged e unstaged}
```

question:
  question: "Deseja prosseguir com este commit?"
  header: "Confirmar"
  options:
    - label: "Confirmar"
      description: "Executar o commit com a mensagem gerada"
    - label: "Editar mensagem"
      description: "Permitir edição da mensagem antes do commit"
    - label: "Cancelar"
      description: "Abortar o commit"
</step>

<step name="execute_commit">
Se confirmado, executar o commit:

1. Se houver arquivos unstaged, adicioná-los ao stage:
```bash
git add arquivo1 arquivo2 ...
```

2. Executar o commit com a mensagem gerada:
```bash
git commit -m "MENSAGEM_COMPLETA"
```

Importante: A mensagem deve ser passada exatamente como gerada, respeitando quebras de linha. Usar aspas e formato adequado para o shell no Windows (PowerShell).

Exemplo para PowerShell:
```bash
git commit -m "tipo: resumo

Explicação da finalidade e contexto.

Arquivos afetados:
- Grupo: arquivo1, arquivo2"
```

3. Verificar o resultado:
```bash
git log -1 --stat
```

Se "Editar mensagem" foi escolhido, perguntar a nova mensagem ou abrir editor.
Se "Cancelar" foi escolhido, encerrar sem fazer commit.
</step>

<step name="report">
Apresentar o resultado:

```
Commit realizado com sucesso!

Hash: {hash do commit}
Resumo: {linha de resumo}

Arquivos alterados:
{estatísticas do git log --stat}
```
</step>

</process>

<edge_cases>
1. **Nenhuma alteração**: Encerrar com mensagem informativa
2. **Apenas arquivos staged**: Fazer commit direto, sem `git add`
3. **Apenas arquivos untracked**: Adicionar com `git add` antes do commit
4. **Diff muito grande**: Resumir alterações por funcionalidade em vez de ler arquivo por arquivo
5. **Mensagem muito longa**: Garantir que a linha de resumo tenha no máximo 72 caracteres
6. **Conflitos de merge**: Não lidar com conflitos - avisar que o commit não pode ser feito com conflitos pendentes
7. **Arquivos de credencial**: Avisar se detectar arquivos como .env, credentials.json e sugerir adicioná-los ao .gitignore
</edge_cases>

<success_criteria>
- [ ] Git status e diff analisados completamente
- [ ] Mensagem gerada em pt-BR seguindo rigorosamente o padrão de AGENTS.md
- [ ] Linha de resumo com máximo 72 caracteres e prefixo correto
- [ ] Arquivos agrupados por funcionalidade no corpo da mensagem
- [ ] Confirmação do usuário obtida antes do commit
- [ ] Commit executado com sucesso
- [ ] Resultado reportado com hash e estatísticas
</success_criteria>
