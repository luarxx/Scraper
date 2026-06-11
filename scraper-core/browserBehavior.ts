import type { Page } from 'playwright';
import { randomInt } from './random';

export async function randomWait(min = 200, max = 800): Promise<void> {
  await new Promise(r => setTimeout(r, randomInt(min, max)));
}

async function scrollGradual(page: Page): Promise<void> {
  const steps = randomInt(3, 5);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, randomInt(200, 400));
    await randomWait(220, 750);
  }
}

async function mouseMove(page: Page, viewport: { width: number; height: number }, x?: number, y?: number): Promise<void> {
  const steps = randomInt(4, 8);
  const startX = randomInt(40, Math.max(80, Math.floor(viewport.width * 0.35)));
  const startY = randomInt(40, Math.max(80, Math.floor(viewport.height * 0.35)));
  const targetX = x ?? randomInt(Math.floor(viewport.width * 0.35), Math.floor(viewport.width * 0.75));
  const targetY = y ?? randomInt(Math.floor(viewport.height * 0.3), Math.floor(viewport.height * 0.7));

  await page.mouse.move(startX, startY);
  await randomWait(80, 220);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t * t * (3 - 2 * t);
    const cx = Math.floor(startX + (targetX - startX) * ease + randomInt(-18, 18));
    const cy = Math.floor(startY + (targetY - startY) * ease + randomInt(-14, 14));
    await page.mouse.move(cx, cy);
    await randomWait(35, 140);
  }
}

export async function comportamentoHumano(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await randomWait(350, 900);
  await mouseMove(page, viewport);
  await scrollGradual(page);
  if (Math.random() > 0.35) {
    await randomWait(250, 700);
    await page.mouse.wheel(0, -randomInt(80, 180));
  }
}

export function detectarChallenge(page: Page): Promise<boolean> {
  return page.evaluate(`(() => {
    const body = (document.body?.innerHTML || '').trim();
    const title = document.title || '';
    if (title.includes('Um momento') || title.includes('Just a moment')) return true;
    if (title.includes('Azion')) return true;
    if (body.length > 0 && body.length < 10000 && body.includes('verificação de segurança')) return true;
    if (body.length > 0 && body.length < 10000 && body.includes('Enable JavaScript')) return true;
    return false;
  })()`);
}
