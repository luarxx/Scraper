# Deploy and Production Operations

Use este documento apenas para tarefas envolvendo producao, deploy, VPS, FileZilla, PM2, Nginx ou GitHub Actions.

## Main Production Build

```bash
npm run build:prod
```

Esse comando gera:

- `client/dist/`
- `dist/`

## VPS/FileZilla Flow

1. Rodar `npm run build:prod`.
2. Subir para a VPS os arquivos do projeto sem `node_modules/`.
3. Na VPS, executar `npm install`.
4. Na VPS, executar `npx playwright install chromium`.
5. Iniciar com `npm start` ou PM2 apontando para `dist/server.js`.

## Static Serving in Production

- O servidor de producao usa `dist/server.js`.
- Mesmo rodando de `dist/`, caminhos persistentes sao resolvidos a partir da raiz do projeto.
- Se `client/dist/index.html` existir, o servidor serve a SPA de `client/dist/`.

## Existing Deployment References

Consulte estes documentos somente quando a tarefa pedir detalhes operacionais:

- `DEPLOY_ORACLE_VPS.md`: Oracle VPS, FileZilla, Nginx e PM2.
- `DEPLOY_GITHUB_ACTIONS.md`: deploy automatico via GitHub Actions.
- `COMANDOS_VPS.md`: comandos operacionais para administrar a VPS em producao.
- `ATUALIZAR_SITE_VPS.md`: fluxo curto para atualizar a VPS apos mudancas locais.

## Production Environment Variables

Variaveis comuns:

```bash
AUTO_INTERVAL_HOURS=3
AUTO_MAX_CONCURRENCY=3
WATCH_INTERVAL_HOURS=3
PORT=3000
API_PORT=3000
CLIENT_PORT=5173
DISCORD_WEBHOOK_URL=
DISCORD_WEBHOOK_AVATAR_URL=https://alguma-url-da-imagem.png
```

## Notes

- Auto Search nao envia Discord em producao.
- Auto Search usa `AUTO_MAX_CONCURRENCY=3` por padrao para limitar browsers simultaneos.
- Watch Alerts usa `DISCORD_WEBHOOK_URL` para notificacoes.
- Auto e Watch tem intervalo minimo de 3h.
- Horarios devem usar `America/Sao_Paulo`, inclusive em VPS UTC.
