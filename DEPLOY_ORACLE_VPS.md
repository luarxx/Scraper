# Deploy na Oracle VPS

Este documento registra a configuracao feita para publicar o projeto Scraper em uma VPS da Oracle usando FileZilla, Node.js, Playwright, Nginx e PM2.

## Estrutura enviada pelo FileZilla

Os arquivos do projeto foram enviados para a VPS dentro de:

```txt
/home/ubuntu/Scraper
```

A estrutura minima em producao deve ficar assim:

```txt
/home/ubuntu/Scraper/
├── client/
│   └── dist/
│       ├── index.html
│       └── assets/
├── data/
│   └── cache/
├── dist/
│   ├── server.js
│   └── scraper.js
├── node_modules/
├── .env
├── package.json
└── package-lock.json
```

Importante: no Linux, maiusculas e minusculas importam. A pasta do frontend precisa ser `client`, nao `Client`, porque o servidor procura `client/dist/index.html`.

## Build local antes do upload

No projeto local, gerar o build completo:

```bash
npm run build:prod
```

Esse comando gera:

```txt
client/dist/
dist/
```

Depois, subir pelo FileZilla pelo menos:

```txt
client/dist/
dist/
data/
package.json
package-lock.json
.env
```

## Node.js na VPS

O Playwright 1.60 exige Node.js 18 ou superior. A VPS estava com Node 12, entao foi necessario usar Node 20 via NVM.

Instalacao recomendada:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

Validar:

```bash
node -v
npm -v
```

## Dependencias do projeto

Dentro da pasta do projeto na VPS:

```bash
cd /home/ubuntu/Scraper
npm install --omit=dev
```

## Playwright

Instalar o Chromium usado pelo scraper:

```bash
npx playwright install chromium
```

Se o Playwright acusar dependencias Linux ausentes:

```bash
sudo apt-get update
sudo apt-get install -y libasound2 libgbm1
```

Em algumas versoes do Ubuntu, `libasound2` pode se chamar `libasound2t64`:

```bash
sudo apt-get install -y libasound2t64 libgbm1
```

## Teste direto do Node

Para testar o servidor sem PM2:

```bash
cd /home/ubuntu/Scraper
node dist/server.js
```

Em outro terminal:

```bash
curl -I http://localhost:3000
```

Resposta esperada:

```txt
HTTP/1.1 200 OK
```

## Variaveis de ambiente

O servidor carrega o arquivo:

```txt
/home/ubuntu/Scraper/.env
```

Variavel configurada:

```env
AUTO_INTERVAL_HOURS=3
```

Essa variavel controla o intervalo da busca automatica. O minimo aceito pelo servidor e 3 horas. Se for definido `1` ou `2`, o servidor usa 3 horas. Se a variavel nao existir, o padrao e 6 horas.

Depois de alterar o `.env`, reiniciar o app:

```bash
pm2 restart scraper
pm2 save
```

Se retornar `404`, verificar se existe:

```txt
/home/ubuntu/Scraper/client/dist/index.html
```

## Firewall do Ubuntu

As portas foram liberadas no `ufw`:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 'Nginx Full'
sudo ufw status
```

Regras esperadas:

```txt
OpenSSH    ALLOW Anywhere
Nginx Full ALLOW Anywhere
3000/tcp   ALLOW Anywhere
```

## Oracle Cloud

Na VCN da Oracle, foram conferidos os seguintes pontos:

1. A instancia possui IP publico:

```txt
163.176.197.25
```

2. A Security List possui regras de entrada para HTTP e Node:

```txt
Origem: 0.0.0.0/0
Protocolo: TCP
Porta destino: 80
```

```txt
Origem: 0.0.0.0/0
Protocolo: TCP
Porta destino: 3000
```

3. A Route Table possui saida para Internet Gateway:

```txt
Destino: 0.0.0.0/0
Tipo de destino: Internet Gateway
```

4. Nao havia Network Security Group associado bloqueando a VNIC.

## iptables da VPS

Mesmo com `ufw` e Security List corretos, a Oracle pode manter regras locais de `iptables` bloqueando entrada externa.

Para verificar:

```bash
sudo iptables -L INPUT -n --line-numbers
```

Foram adicionadas regras permitindo HTTP e porta 3000:

```bash
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT
```

Para persistir apos reboot:

```bash
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

## Nginx como proxy reverso

O Nginx foi configurado para expor o site na porta 80 e encaminhar para o Node na porta 3000.

Arquivo:

```txt
/etc/nginx/sites-available/scraper
```

Conteudo:

```nginx
server {
    listen 80 default_server;
    server_name 163.176.197.25 _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Ativar configuracao:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/scraper /etc/nginx/sites-enabled/scraper
sudo nginx -t
sudo systemctl reload nginx
```

Teste local:

```bash
curl -I http://localhost
```

Resposta esperada:

```txt
HTTP/1.1 200 OK
```

URL publica:

```txt
http://163.176.197.25/
```

## PM2

O PM2 foi usado para manter o Node rodando apos fechar o SSH e apos reboot da VPS.

Instalar:

```bash
sudo npm install -g pm2
```

Iniciar app:

```bash
cd /home/ubuntu/Scraper
pm2 start dist/server.js --name scraper
pm2 save
pm2 startup
```

O comando `pm2 startup` gera um comando com `sudo env ...`. Esse comando precisa ser copiado e executado.

Exemplo gerado:

```bash
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.20.2/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Depois:

```bash
pm2 save
pm2 status
```

Status esperado:

```txt
scraper online
```

## Erro EADDRINUSE no PM2

Erro observado:

```txt
Error: listen EADDRINUSE: address already in use :::3000
```

Significa que outro processo ja estava usando a porta 3000, normalmente um `node dist/server.js` iniciado manualmente.

Verificar:

```bash
ss -ltnp | grep 3000
```

Encerrar processo manual:

```bash
pkill -f "node dist/server.js"
```

Reiniciar pelo PM2:

```bash
pm2 restart scraper
pm2 status
pm2 save
```

## Comandos uteis

Ver processos PM2:

```bash
pm2 status
```

Ver logs:

```bash
pm2 logs scraper
```

Reiniciar app:

```bash
pm2 restart scraper
```

Parar app:

```bash
pm2 stop scraper
```

Testar Node local:

```bash
curl -I http://localhost:3000
```

Testar Nginx local:

```bash
curl -I http://localhost
```

Ver portas abertas:

```bash
ss -ltnp | grep -E ':80|:3000'
```

Ver IP publico:

```bash
curl ifconfig.me
```

## Checklist final

Para o site funcionar publicamente:

```txt
[x] client/dist/index.html existe
[x] dist/server.js existe
[x] .env existe com AUTO_INTERVAL_HOURS
[x] npm install --omit=dev executado
[x] Chromium do Playwright instalado
[x] Node responde em localhost:3000
[x] Nginx responde em localhost:80
[x] ufw libera Nginx e 3000
[x] Security List libera porta 80
[x] Route Table aponta 0.0.0.0/0 para Internet Gateway
[x] iptables permite portas 80 e 3000
[x] PM2 mantem o app online
```
