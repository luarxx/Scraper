export class ScraperChallengeError extends Error {
  override name = 'ScraperChallengeError';
}

export class ScraperParseError extends Error {
  override name = 'ScraperParseError';
}

export class ScraperRateLimitError extends Error {
  override name = 'ScraperRateLimitError';

  constructor(message: string, readonly retryAfterMs?: number) {
    super(message);
  }
}

export type RetryKind = 'transient' | 'challenge' | 'fatal';

export interface RetryClassification {
  kind: RetryKind;
  error: Error;
  retryAfterMs?: number;
}

export interface RetryOptions {
  maxAttemptsTransient?: number;
  maxAttemptsChallenge?: number;
  baseDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; kind: RetryKind; delayMs: number; message: string }) => void;
}

function normalizarMensagem(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getRetryAfterMs(err: Error): number | undefined {
  const value = (err as Error & { retryAfterMs?: unknown }).retryAfterMs;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function classificarErroScraper(err: unknown): RetryClassification {
  if (err instanceof ScraperChallengeError) {
    return { kind: 'challenge', error: err };
  }

  if (err instanceof ScraperParseError) {
    return { kind: 'fatal', error: err };
  }

  const error = err instanceof Error ? err : new Error(String(err));
  const message = normalizarMensagem(error.message);
  const retryAfterMs = getRetryAfterMs(error);

  if (
    message.includes('captcha')
    || message.includes('challenge')
    || message.includes('cloudflare')
    || message.includes('verificacao de seguranca')
    || message.includes('security check')
    || message.includes('just a moment')
    || message.includes('um momento')
  ) {
    return { kind: 'challenge', error: new ScraperChallengeError(error.message) };
  }

  if (
    message.includes('timeout')
    || message.includes('timed out')
    || message.includes('navigation failed')
    || message.includes('too many requests')
    || message.includes('rate limit')
    || message.includes('http 429')
    || message.includes('net::err')
    || message.includes('econnreset')
    || message.includes('fetch failed')
  ) {
    return { kind: 'transient', error, retryAfterMs };
  }

  return { kind: 'transient', error, retryAfterMs };
}

export function calcularBackoffMs(
  attempt: number,
  baseDelayMs = 500,
  jitterRatio = 0.35,
  random: () => number = Math.random,
): number {
  const exponent = Math.max(0, attempt - 1);
  const exponential = baseDelayMs * (2 ** exponent);
  const jitterScope = exponential * jitterRatio;
  const jitter = Math.round((random() * 2 - 1) * jitterScope);
  return Math.max(0, Math.round(exponential + jitter));
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executarComRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttemptsTransient = options.maxAttemptsTransient ?? 3;
  const maxAttemptsChallenge = options.maxAttemptsChallenge ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const jitterRatio = options.jitterRatio ?? 0.35;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      const classification = classificarErroScraper(err);
      if (classification.kind === 'fatal') throw classification.error;

      const maxAttempts = classification.kind === 'challenge'
        ? maxAttemptsChallenge
        : maxAttemptsTransient;

      if (attempt >= maxAttempts) {
        throw classification.error;
      }

      const backoffMs = calcularBackoffMs(attempt, baseDelayMs, jitterRatio, random);
      const delayMs = classification.retryAfterMs ? Math.max(backoffMs, classification.retryAfterMs) : backoffMs;
      options.onRetry?.({
        attempt,
        kind: classification.kind,
        delayMs,
        message: classification.error.message,
      });
      await sleep(delayMs);
    }
  }
}
