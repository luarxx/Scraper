# Atualizar o site na VPS

Resumo do fluxo para atualizar o site em producao depois de alterar o repositorio local.

## Atualizacao automatica

O projeto tambem possui deploy automatico via GitHub Actions:

```txt
.github/workflows/deploy-vps.yml
```

Depois de configurar os secrets descritos em `DEPLOY_GITHUB_ACTIONS.md`, basta fazer:

```bash
git push origin master
```

O GitHub builda o projeto, envia os arquivos de producao para a VPS e reinicia o PM2 automaticamente.

O fluxo abaixo continua valido caso queira atualizar manualmente pelo FileZilla.

## 1. Gerar build local

No computador local, dentro do projeto:

```bash
npm run build:prod
```

Esse comando atualiza:

```txt
dist/
client/dist/
```

## 2. Subir arquivos pelo FileZilla

No FileZilla, enviar para:

```txt
/home/ubuntu/Scraper
```

Subir e substituir estes arquivos/pastas:

```txt
dist/
client/dist/
package.json
package-lock.json
.env
```

Se existir alteracao dentro de `client/package.json` ou `client/package-lock.json`, subir tambem:

```txt
client/package.json
client/package-lock.json
```

## 3. Arquivos que nao devem ser enviados

Nao subir:

```txt
node_modules/
client/node_modules/
.git/
.github/
.vscode/
.opencode/
```

Evitar sobrescrever:

```txt
data/
```

A pasta `data/` guarda o banco da VPS, incluindo:

```txt
data/scraper.db
data/cache/
```

Sobrescrever `data/` pode apagar configuracoes e historico da busca automatica.

## 4. Atualizar dependencias na VPS

Entrar na VPS:

```bash
ssh ubuntu@163.176.197.25
cd /home/ubuntu/Scraper
```

Se `package.json` ou `package-lock.json` mudaram, rodar:

```bash
npm install --omit=dev
```

Se nenhuma dependencia mudou, pode pular este passo.

## 5. Reiniciar o app

```bash
pm2 restart scraper
pm2 status
```

Salvar o estado do PM2:

```bash
pm2 save
```

## 6. Testar

Testar o Node:

```bash
curl -I http://localhost:3000
```

Testar o Nginx:

```bash
curl -I http://localhost
```

Resposta esperada nos dois:

```txt
HTTP/1.1 200 OK
```

Abrir no navegador:

```txt
http://163.176.197.25/
```

## Resumo rapido

Local:

```bash
npm run build:prod
```

FileZilla:

```txt
Subir dist/
Subir client/dist/
Subir package.json
Subir package-lock.json
Subir .env se mudou variavel de ambiente
Nao sobrescrever data/
```

VPS:

```bash
cd /home/ubuntu/Scraper
npm install --omit=dev
pm2 restart scraper
pm2 status
pm2 save
```

Se nao mudou dependencia, o comando `npm install --omit=dev` pode ser ignorado.
