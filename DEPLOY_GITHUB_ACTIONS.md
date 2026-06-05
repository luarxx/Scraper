# Deploy automatico com GitHub Actions

Este projeto possui um workflow para atualizar a VPS automaticamente quando houver `push` no branch `master`.

Arquivo do workflow:

```txt
.github/workflows/deploy-vps.yml
```

## Como funciona

Fluxo:

```txt
git push origin master
        ↓
GitHub Actions
        ↓
npm ci
        ↓
npm run build:prod
        ↓
envia arquivos por SCP para /home/ubuntu/Scraper
        ↓
npm install --omit=dev na VPS
        ↓
pm2 restart scraper
```

O workflow envia somente os arquivos necessarios para producao:

```txt
dist/
client/dist/
package.json
package-lock.json
client/package.json
client/package-lock.json
.env
.env.example
```

Ele nao envia nem sobrescreve:

```txt
data/
node_modules/
client/node_modules/
.git/
```

Assim o banco da VPS, especialmente `data/scraper.db`, fica preservado.

## Secrets necessarios no GitHub

No GitHub, abra:

```txt
Repository > Settings > Secrets and variables > Actions > New repository secret
```

Crie estes secrets:

```txt
VPS_HOST=163.176.197.25
VPS_USER=ubuntu
VPS_PORT=22
VPS_SSH_KEY=conteudo da chave privada SSH
```

`VPS_PORT` pode ser omitido se o SSH usa a porta 22.

O erro abaixo significa que `VPS_SSH_KEY` nao foi criado, esta vazio ou recebeu a chave publica em vez da privada:

```txt
Error: can't connect without a private SSH key or password
```

## Criar chave SSH para o GitHub Actions

No seu computador local, gere uma chave especifica para deploy:

```bash
ssh-keygen -t ed25519 -C "github-actions-scraper" -f github-actions-scraper
```

Isso gera:

```txt
github-actions-scraper      # chave privada
github-actions-scraper.pub  # chave publica
```

No GitHub, o secret `VPS_SSH_KEY` deve receber o conteudo da chave privada:

```bash
cat github-actions-scraper
```

No Windows PowerShell, use:

```powershell
Get-Content .\github-actions-scraper -Raw
```

Copie tudo, incluindo as linhas:

```txt
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Na VPS, adicionar a chave publica ao usuario `ubuntu`:

```bash
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
```

Cole o conteudo de:

```bash
cat github-actions-scraper.pub
```

Ajuste permissoes na VPS:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Testar acesso SSH

No computador local:

```bash
ssh -i github-actions-scraper ubuntu@163.176.197.25
```

Se conectar, o GitHub Actions tambem deve conseguir.

## Primeiro deploy

Depois de criar os secrets, faca um push:

```bash
git add .
git commit -m "chore(deploy): adiciona deploy automatico"
git push origin master
```

No GitHub, acompanhe em:

```txt
Repository > Actions > Deploy VPS
```

## Rodar manualmente

O workflow tambem pode ser executado manualmente:

```txt
Repository > Actions > Deploy VPS > Run workflow
```

## Validar na VPS

Depois do deploy:

```bash
pm2 status
curl -I http://localhost
curl -I http://localhost:3000
```

Resposta esperada:

```txt
HTTP/1.1 200 OK
```

URL publica:

```txt
http://163.176.197.25/
```

## Observacoes importantes

- O workflow builda no GitHub, nao na VPS.
- A VPS recebe apenas os arquivos prontos de producao.
- A pasta `data/` da VPS nao deve ser sobrescrita.
- Se mudar dependencias do backend, o workflow roda `npm install --omit=dev` na VPS.
- Se mudar apenas frontend/backend, o PM2 reinicia o app automaticamente.
- O deploy roda em todo `push` para `master`.
