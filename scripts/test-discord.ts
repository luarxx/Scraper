import fs from 'fs';
import path from 'path';

type EnvMap = Record<string, string>;

const ROOT = path.resolve(__dirname, '..');

function carregarEnv(): EnvMap {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};

  return fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce<EnvMap>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      acc[key] = rawValue.replace(/^["']|["']$/g, '');
      return acc;
    }, {});
}

async function main(): Promise<void> {
  const env = { ...carregarEnv(), ...process.env };
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const avatarUrl = env.DISCORD_WEBHOOK_AVATAR_URL;

  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL não configurado no .env');
  }

  const body = {
    username: 'Scraper de Preços',
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    embeds: [{
      title: 'Teste de alerta de preço',
      description: [
        'Teste manual do webhook Discord.',
        'Se esta mensagem chegou, o envio de alertas está funcionando.',
      ].join('\n'),
      color: 0x22c55e,
      timestamp: new Date().toISOString(),
    }],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao enviar alerta: ${response.status} ${detail}`);
  }

  console.log('OK: mensagem de teste enviada ao Discord');
}

main().catch((err: unknown) => {
  const error = err as Error;
  console.error(error.message);
  process.exit(1);
});
