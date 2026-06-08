# Comandos uteis da VPS

Comandos para administrar a VPS Oracle com o Scraper ja publicado, rodando com Nginx e PM2.

## Acessar a VPS

```bash
ssh ubuntu@163.176.197.25
```

Entrar na pasta do projeto:

```bash
cd /home/ubuntu/Scraper
```

## URLs do site

URL principal via Nginx:

```txt
http://163.176.197.25/
```

URL direta do Node:

```txt
http://163.176.197.25:3000/
```

Em producao, prefira usar a URL sem `:3000`, pois ela passa pelo Nginx.

## PM2

Ver status do app:

```bash
pm2 status
```

Ver logs em tempo real:

```bash
pm2 logs scraper
```

Ver ultimas linhas dos logs:

```bash
pm2 logs scraper --lines 100
```

Reiniciar o app:

```bash
pm2 restart scraper
```

Parar o app:

```bash
pm2 stop scraper
```

Iniciar novamente:

```bash
pm2 start scraper
```

Remover o app do PM2:

```bash
pm2 delete scraper
```

Salvar a lista atual para restaurar no reboot:

```bash
pm2 save
```

Ver detalhes do processo:

```bash
pm2 show scraper
```

## Variaveis de ambiente

Ver configuracao atual do intervalo automatico:

```bash
cat /home/ubuntu/Scraper/.env
```

Editar `.env`:

```bash
nano /home/ubuntu/Scraper/.env
```

Configuracao atual recomendada:

```env
AUTO_INTERVAL_HOURS=3
AUTO_MAX_CONCURRENCY=3
```

O minimo aceito pelo servidor e 3 horas para o intervalo. A concorrencia da busca automatica aceita de 1 a 10, com 3 como padrao recomendado. Depois de alterar:

```bash
pm2 restart scraper
pm2 save
```

Monitor interativo:

```bash
pm2 monit
```

## Testes rapidos

Testar Node local:

```bash
curl -I http://localhost:3000
```

Resposta esperada:

```txt
HTTP/1.1 200 OK
```

Testar Nginx local:

```bash
curl -I http://localhost
```

Resposta esperada:

```txt
HTTP/1.1 200 OK
```

Ver IP publico da VPS:

```bash
curl ifconfig.me
```

Ver portas abertas:

```bash
ss -ltnp | grep -E ':80|:3000'
```

Ver processo usando a porta 3000:

```bash
ss -ltnp | grep 3000
```

## Nginx

Testar configuracao:

```bash
sudo nginx -t
```

Recarregar Nginx sem derrubar:

```bash
sudo systemctl reload nginx
```

Reiniciar Nginx:

```bash
sudo systemctl restart nginx
```

Ver status do Nginx:

```bash
sudo systemctl status nginx
```

Editar configuracao do site:

```bash
sudo nano /etc/nginx/sites-available/scraper
```

Ver logs de acesso:

```bash
sudo tail -f /var/log/nginx/access.log
```

Ver logs de erro:

```bash
sudo tail -f /var/log/nginx/error.log
```

## Firewall

Ver regras do UFW:

```bash
sudo ufw status
```

Liberar Nginx:

```bash
sudo ufw allow 'Nginx Full'
```

Liberar porta 3000:

```bash
sudo ufw allow 3000/tcp
```

Ver regras do iptables:

```bash
sudo iptables -L INPUT -n --line-numbers
```

Liberar porta 80 no iptables:

```bash
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
```

Liberar porta 3000 no iptables:

```bash
sudo iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT
```

Salvar regras persistentes:

```bash
sudo netfilter-persistent save
```

## Atualizar o projeto na VPS

Fluxo recomendado depois de subir novos arquivos pelo FileZilla:

```bash
cd /home/ubuntu/Scraper
npm install --omit=dev
pm2 restart scraper
pm2 save
```

Testar depois da atualizacao:

```bash
curl -I http://localhost:3000
curl -I http://localhost
pm2 status
```

## Playwright

Instalar Chromium:

```bash
npx playwright install chromium
```

Instalar dependencias Linux:

```bash
sudo apt-get update
sudo apt-get install -y libasound2 libgbm1
```

Alternativa em Ubuntu mais novo:

```bash
sudo apt-get install -y libasound2t64 libgbm1
```

## Banco e dados

Banco principal:

```txt
/home/ubuntu/Scraper/data/scraper.db
```

Cache:

```txt
/home/ubuntu/Scraper/data/cache/
```

Listar arquivos de dados:

```bash
ls -lah /home/ubuntu/Scraper/data
```

Ver tamanho do banco:

```bash
du -h /home/ubuntu/Scraper/data/scraper.db
```

## Erros comuns

### PM2 em erro com EADDRINUSE

Erro:

```txt
EADDRINUSE: address already in use :::3000
```

Diagnosticar:

```bash
ss -ltnp | grep 3000
```

Encerrar processo manual antigo:

```bash
pkill -f "node dist/server.js"
```

Reiniciar PM2:

```bash
pm2 restart scraper
pm2 status
pm2 save
```

### Site abre localmente mas nao abre pelo IP publico

Testes:

```bash
curl -I http://localhost
curl -I http://localhost:3000
sudo ufw status
sudo iptables -L INPUT -n --line-numbers
```

Na Oracle, conferir:

```txt
Security List libera porta 80
Route Table tem 0.0.0.0/0 para Internet Gateway
IP publico da VNIC esta correto
```

### Nginx retorna 403

Normalmente o Nginx esta usando o site default em vez do proxy do Scraper.

Corrigir:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/scraper /etc/nginx/sites-enabled/scraper
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 nao sobe depois do reboot

Recriar startup:

```bash
pm2 startup
pm2 save
```

Executar o comando `sudo env ...` exibido pelo `pm2 startup`.

## Reiniciar tudo

```bash
sudo systemctl restart nginx
pm2 restart scraper
pm2 status
curl -I http://localhost
```

## Checagem de saude

Use este bloco quando quiser verificar se tudo esta no ar:

```bash
cd /home/ubuntu/Scraper
pm2 status
curl -I http://localhost:3000
curl -I http://localhost
ss -ltnp | grep -E ':80|:3000'
```
