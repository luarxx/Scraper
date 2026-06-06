# Analise UX, Marketing e Posicionamento

## Diagnostico geral

O projeto ja tem base de produto real: busca manual, historico, cards com preco, loja, parcelamento, grafico de historico, alertas e busca automatica. Isso e muito mais do que um "scraper".

O principal ponto de melhoria e a comunicacao. Hoje o produto ainda parece uma ferramenta tecnica. Para usuarios finais, ele deveria se apresentar como um comparador e monitor de precos de informatica.

Proposta de valor recomendada:

> Compare precos de informatica sem abrir varias abas.

O usuario nao quer usar um scraper. Ele quer economizar tempo, evitar pagar caro, acompanhar queda de preco e decidir em qual loja comprar.

## Principais problemas

### 1. Nome "Scraper" reduz confianca comercial

Para desenvolvedores, o termo e claro. Para usuarios finais, soa tecnico, frio e possivelmente suspeito. "Scraper" comunica metodo, nao beneficio.

### 2. Primeira dobra nao vende o valor

O estado inicial diz "Busque por produtos" e "Digite o nome de um produto e escolha uma loja". Funciona, mas nao explica o ganho principal: comparar lojas, economizar tempo, criar alertas e acompanhar historico.

### 3. Labels internos demais

Os modos "Manual", "Automatica" e "Watch" parecem nomes internos do sistema.

Sugestao:

| Atual | Melhor |
|---|---|
| Manual | Buscar |
| Automatica | Buscas salvas |
| Watch | Alertas |

### 4. Escolher loja antes de buscar cria friccao

Se a promessa e comparar sem abrir varias abas, o usuario espera pesquisar em todas as lojas por padrao. A escolha de loja deveria ser filtro, nao etapa obrigatoria.

### 5. Cards poderiam ajudar mais na decisao

Os cards ja mostram dados importantes, mas poderiam deixar mais evidente:

- Menor preco encontrado
- Loja de origem
- Ultima atualizacao
- Variacao de preco
- Parcelamento
- Acao principal de compra
- Acao secundaria de alerta

## Prioridades

### Alta prioridade

- Reposicionar o produto como comparador e monitor de precos.
- Substituir "Scraper" por um nome ou promessa mais comercial.
- Reescrever headline, subheadline, estado inicial e CTAs.
- Renomear os modos de navegacao.
- Fazer a primeira tela explicar o beneficio antes do input.
- Adicionar mensagens de confianca sobre origem e atualizacao dos dados.
- Destacar "ultima atualizacao" em resultados e cards.
- Usar CTA principal orientado a beneficio: "Comparar precos agora".

### Media prioridade

- Criar bloco curto "Como funciona".
- Adicionar categorias populares.
- Melhorar estados vazios com sugestoes prontas de busca.
- Adicionar filtros e ordenacao por preco, loja, relevancia, parcelamento e tendencia.
- Fortalecer alertas de preco como acao secundaria de alto valor.

### Baixa prioridade

- Criar pagina individual de produto.
- Criar login/cadastro.
- Adicionar favoritos.
- Criar ranking editorial de ofertas.
- Adicionar recomendacoes relacionadas.
- Usar prova social quando houver dados reais de usuarios ou buscas.

## Posicionamento recomendado

O site deve se comunicar menos como "web scraper" e mais como:

- Comparador de precos de informatica
- Buscador de ofertas de hardware
- Radar de precos para pecas de PC
- Monitor de queda de preco
- Assistente de compra para hardware

### Possiveis nomes

- Radar Hardware
- BuscaHardware
- PrecoTech
- Comparador Tech
- Preco de Peca
- Radar de Pecas
- Hardware Radar
- Oferta Hardware

### Frases comerciais

- Compare precos de informatica sem abrir varias abas.
- Encontre o melhor preco para seu proximo upgrade.
- Monitore placas de video, processadores, SSDs e perifericos.
- Veja onde comprar hardware pelo menor preco.
- Pesquise em lojas brasileiras e acompanhe quando o preco baixar.
- Seu radar de precos para pecas de PC.

### Diferenciais competitivos

- Foco em hardware e informatica.
- Lojas brasileiras relevantes para o nicho.
- Comparacao centralizada.
- Historico de precos.
- Alertas de queda.
- Busca automatica recorrente.
- Parcelamento e preco em um so card.
- Experiencia simples para quem ja pesquisa antes de comprar.

## Hero section recomendada

### Headline

> Compare precos de informatica sem abrir varias abas.

### Subheadline

> Busque produtos em lojas como KaBuM!, Pichau e Terabyte. Veja preco, parcelamento, historico e crie alertas quando o valor baixar.

### Campo de busca

Placeholder:

> Ex: RTX 4060, Ryzen 7 5700X, SSD NVMe 1TB

### CTA principal

> Comparar precos

### CTA secundario

> Ver alertas de preco

### Provas de confianca

- Consulta lojas brasileiras de hardware.
- Mostra origem dos dados.
- Exibe ultima atualizacao.
- Permite acompanhar historico.
- Alerta quando o preco chega no alvo.

### Visual do produto

Em vez de ilustracao generica, mostrar uma previa real da interface com 2 ou 3 cards de produto contendo:

- Imagem do produto
- Loja
- Preco
- Badge "menor preco"
- Historico simples
- Botao "Avisar quando baixar"

### Hierarquia ideal

1. Beneficio claro
2. Campo de busca
3. Lojas suportadas
4. Exemplo visual de comparacao
5. Transparencia sobre dados

## CTAs recomendados

### Busca

- Comparar precos agora
- Buscar melhores precos
- Ver ofertas disponiveis
- Procurar nas lojas
- Encontrar menor preco

### Resultados

- Ver oferta na loja
- Abrir oferta
- Comparar este produto
- Ver detalhes da oferta

### Alertas

- Criar alerta de preco
- Avisar quando baixar
- Monitorar este produto
- Acompanhar queda de preco
- Receber alerta no Discord

### Busca automatica

- Salvar busca automatica
- Monitorar esta busca
- Acompanhar novos precos
- Rodar busca agora

### Conta

- Salvar meus alertas
- Entrar para acompanhar precos
- Criar conta para salvar buscas

## Jornada do usuario

### Fluxo ideal

1. Usuario digita um produto, como "RTX 4060".
2. O site busca em todas as lojas por padrao.
3. Os resultados aparecem agrupados e ordenados.
4. O usuario filtra por loja, preco, disponibilidade ou parcelamento.
5. O usuario abre a oferta ou cria alerta de preco.

### Friccoes atuais provaveis

- O usuario precisa escolher loja antes de saber onde esta o melhor preco.
- "Watch" nao e um termo claro para usuarios finais.
- "Automatica" pode parecer avancado demais.
- "Criar alerta" perde forca se nao explicar "quando baixar".
- Falta uma mensagem mais clara sobre atualizacao e confiabilidade dos precos.

### Melhorias de fluxo

- Usar "Todas as lojas" como padrao.
- Transformar lojas em filtro.
- Mostrar resumo acima dos resultados:
  - menor preco
  - lojas consultadas
  - total de ofertas
  - ultima atualizacao
- Permitir salvar busca a partir dos resultados.
- Permitir criar alerta direto a partir do card.

## Hierarquia visual

### Espacamento

Manter a interface densa, mas com separacao clara entre:

- busca
- filtros
- resumo dos resultados
- cards
- avisos de confianca

### Contraste

O tema escuro funciona bem para produto de hardware, mas informacoes criticas precisam ter contraste forte:

- preco
- loja
- CTA principal
- status de alerta
- ultima atualizacao

### Textos

Titulos devem comunicar beneficio. Labels devem ser operacionais e diretos.

Exemplo:

- "Busque por produtos" pode virar "Compare precos de hardware".
- "Criar alerta" pode virar "Avisar quando baixar".

### Botoes

Em cards de produto:

- CTA principal: "Ver oferta na loja"
- CTA secundario: "Avisar quando baixar"

### Estados

Loading:

- Informar o que esta acontecendo.
- Exemplo: "Consultando lojas de informatica..."

Erro:

- Explicar sem culpar o usuario.
- Exemplo: "A loja demorou para responder. Tente novamente em alguns instantes."

Vazio:

- Dar proximo passo.
- Exemplo: "Tente buscar pelo modelo exato, como RTX 4060 8GB."

## Confianca

Como o produto coleta dados de lojas externas, transparencia e parte da conversao.

### Mensagens recomendadas

Resultado:

> Precos coletados em 06/06/2026 as 14:32. Os valores podem mudar no site da loja.

Card:

> Fonte: KaBuM! · Atualizado ha 5 min

Rodape dos resultados:

> Conferimos preco, imagem e parcelamento diretamente nas lojas. Antes de comprar, confirme o valor final no checkout.

Como funciona:

> Voce pesquisa um produto, nos consultamos as lojas disponiveis e organizamos os resultados por relevancia e preco.

Alertas:

> O alerta usa o preco encontrado na pagina do produto. Se a loja mudar a pagina ou o preco, a proxima verificacao atualiza o status.

## Estrutura de landing page

### 1. Hero

Funcao: explicar o produto em 3 segundos e colocar a busca como acao principal.

Conteudo:

- Headline forte
- Subheadline clara
- Campo de busca
- CTA principal
- Lojas suportadas

### 2. Categorias populares

Funcao: reduzir esforco e mostrar foco em informatica.

Categorias:

- Placas de video
- Processadores
- SSDs
- Notebooks
- Monitores
- Fontes
- Gabinetes
- Perifericos

### 3. Como funciona

Funcao: explicar o produto sem linguagem tecnica.

Passos:

1. Pesquise o produto.
2. Compare ofertas nas lojas.
3. Crie alertas para comprar na hora certa.

### 4. Beneficios

Funcao: traduzir features em valor.

- Menos abas abertas
- Comparacao centralizada
- Historico de precos
- Alertas de queda
- Lojas brasileiras de hardware

### 5. Exemplo de busca

Funcao: mostrar o produto em uso.

Exemplo:

- Busca por "RTX 4060"
- Cards com preco, loja, parcelamento e historico

### 6. Comparacao de precos

Funcao: ajudar tomada de decisao.

Tabela sugerida:

- Loja
- Preco
- Parcelamento
- Ultima atualizacao
- Acao

### 7. Alertas de preco

Funcao: aumentar retencao.

Mensagem:

> Defina o preco ideal e receba aviso quando o produto chegar nele.

### 8. FAQ

Funcao: reduzir duvidas e risco percebido.

Perguntas:

- Os precos sao em tempo real?
- Quais lojas sao consultadas?
- O site vende produtos?
- Posso confiar nos precos?
- Como funcionam os alertas?
- Preciso criar conta?

### 9. CTA final

Funcao: retomar acao principal.

Texto:

> Encontre o melhor preco para seu proximo upgrade.

Botao:

> Comparar precos agora

## Microcopy

### Placeholder

- Busque por RTX 4060, Ryzen 5600, SSD NVMe...
- Qual peca voce quer comparar hoje?
- Digite o produto que voce esta pesquisando.

### Loading

- Consultando lojas de informatica...
- Buscando precos e parcelamentos...
- Comparando ofertas disponiveis...
- Verificando dados nas lojas...

### Erro

- Nao consegui buscar agora. Tente novamente em alguns instantes.
- A loja demorou para responder. Voce pode tentar de novo.
- Algo falhou na coleta dos precos. Nenhuma compra foi afetada.

### Sem resultados

- Nao encontrei ofertas para esse termo.
- Tente buscar pelo modelo exato, por exemplo "RTX 4060 8GB".
- Nenhum resultado nesta loja. Experimente buscar em todas.

### Avisos

- Precos e disponibilidade podem mudar no site da loja.
- Confirme o valor final antes de concluir a compra.
- Ultima atualizacao: 06/06/2026 as 14:32.

### Textos proximos aos CTAs

- Gratis, sem cadastro para pesquisar.
- Voce so sai do site quando quiser comprar.
- O alerta usa o preco atual como sugestao.

## Ideias de evolucao do produto

### Alto valor percebido

1. Busca em todas as lojas por padrao.
2. Alertas de queda de preco por produto.
3. Historico de preco com menor preco dos ultimos 7, 30 e 90 dias.
4. Favoritos ou lista "meu proximo PC".
5. Comparador lado a lado.
6. Pagina de produto com historico, ofertas e lojas.

### Retencao

1. Ranking de melhores ofertas de hoje.
2. Notificacoes por Discord, email, Telegram ou navegador.
3. Buscas salvas com verificacao automatica.
4. Alertas recorrentes.
5. Relatorio semanal de quedas de preco.

### Descoberta

1. Categorias populares.
2. Recomendacoes relacionadas.
3. Filtros por especificacao.
4. Busca por faixa de preco.
5. Produtos similares mais baratos.

## Persuasao e conversao

### Clareza da proposta

Focar em:

> Compare precos, acompanhe historico e receba alerta quando baixar.

### Beneficios

Traduzir funcionalidades em ganhos:

- Scraping vira "consulta automatica nas lojas".
- Historico vira "saiba se o preco esta bom".
- Watch vira "aviso quando baixar".
- Automatica vira "buscas salvas".

### Reducao de friccao

- Permitir busca sem cadastro.
- Usar exemplos prontos.
- Buscar em todas as lojas por padrao.
- Explicar que o usuario compra diretamente na loja.
- Mostrar que os precos podem mudar.

### Prova social

Adicionar apenas quando houver dados reais:

- "Mais de X buscas feitas"
- "X produtos monitorados"
- "X alertas enviados"
- "Lojas consultadas: KaBuM!, Pichau e Terabyte"

### Motivacao para agir

O site deve criar a sensacao de que pesquisar ali evita trabalho e reduz arrependimento.

Mensagem central:

> Antes de comprar hardware, veja se o preco esta bom.

## Acoes praticas para implementar primeiro

1. Trocar a promessa principal para "Compare precos de informatica sem abrir varias abas".
2. Substituir "Scraper" por um nome ou descricao mais comercial.
3. Renomear "Manual", "Automatica" e "Watch".
4. Trocar CTAs:
   - "Buscar" para "Comparar precos"
   - "Criar alerta" para "Avisar quando baixar"
   - "Ir para a Loja" para "Ver oferta na loja"
5. Melhorar estado inicial com uma headline de beneficio.
6. Adicionar "Todas as lojas" como opcao padrao da busca.
7. Exibir ultima atualizacao com destaque.
8. Adicionar aviso de confianca sobre origem e variacao dos precos.
9. Destacar "menor preco encontrado" nos cards.
10. Criar um bloco curto "Como funciona" antes ou abaixo da busca.

## Resumo

O produto ja tem substancia. O salto agora e deixar de parecer "um scraper com interface" e passar a parecer "um assistente de compra para hardware".

A mudanca mais importante e de linguagem: vender economia de tempo, comparacao e monitoramento, nao a tecnologia por tras.
