import type { Page } from 'playwright';
import { randomInt } from './random';

export async function randomWait(min = 200, max = 800): Promise<void> {
  await new Promise(r => setTimeout(r, randomInt(min, max)));
}

async function idleLongo(): Promise<void> {
  await new Promise(r => setTimeout(r, randomInt(2000, 8000)));
}

async function scrollVariado(page: Page): Promise<void> {
  const roll = Math.random();

  if (roll < 0.15) return;

  if (roll < 0.35) {
    const steps = randomInt(1, 2);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, randomInt(100, 200));
      await randomWait(180, 450);
    }
    return;
  }

  if (roll < 0.55) {
    const steps = randomInt(1, 3);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, randomInt(800, 2000));
      await randomWait(300, 800);
    }
    return;
  }

  const steps = randomInt(2, 4);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, randomInt(200, 500));
    await randomWait(220, 750);
  }
}

async function mouseMove(page: Page, viewport: { width: number; height: number }, x?: number, y?: number): Promise<void> {
  const irregular = Math.random() < 0.4;
  const steps = irregular ? randomInt(8, 15) : randomInt(4, 8);
  const jitter = irregular ? 40 : 18;
  const jitterY = irregular ? 30 : 14;

  const startX = randomInt(40, Math.max(80, Math.floor(viewport.width * 0.35)));
  const startY = randomInt(40, Math.max(80, Math.floor(viewport.height * 0.35)));
  const targetX = x ?? randomInt(Math.floor(viewport.width * 0.35), Math.floor(viewport.width * 0.75));
  const targetY = y ?? randomInt(Math.floor(viewport.height * 0.3), Math.floor(viewport.height * 0.7));

  await page.mouse.move(startX, startY);
  await randomWait(80, 220);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t * t * (3 - 2 * t);
    const cx = Math.floor(startX + (targetX - startX) * ease + randomInt(-jitter, jitter));
    const cy = Math.floor(startY + (targetY - startY) * ease + randomInt(-jitterY, jitterY));
    await page.mouse.move(cx, cy);

    if (irregular && Math.random() < 0.15) {
      await randomWait(200, 600);
    } else {
      await randomWait(35, 140);
    }
  }

  if (irregular && Math.random() < 0.3) {
    await page.mouse.move(targetX + randomInt(-40, -10), targetY + randomInt(-20, 10));
    await randomWait(80, 200);
    await page.mouse.move(targetX, targetY);
  }
}

export async function comportamentoHumano(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await randomWait(350, 900);

  if (Math.random() < 0.25) {
    await idleLongo();
  }

  if (Math.random() < 0.8) {
    await mouseMove(page, viewport);
  }

  if (Math.random() < 0.25) {
    await idleLongo();
  }

  await scrollVariado(page);

  if (Math.random() < 0.5) {
    await randomWait(250, 700);
    await page.mouse.wheel(0, -randomInt(80, 180));
    if (Math.random() < 0.3) {
      await randomWait(150, 400);
      await page.mouse.wheel(0, randomInt(100, 300));
    }
  }

  if (Math.random() < 0.25) {
    await idleLongo();
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
    if (document.getElementById('challenge-form')) return true;
    if (document.querySelector('.cf-browser-verification, .cf-challenge, [data-translate="verify"]')) return true;
    if (document.querySelector('iframe[src*="challenges.cloudflare.com"]')) return true;
    return false;
  })()`);
}
