import { describe, expect, it, vi } from 'vitest';
import {
  ScraperChallengeError,
  ScraperParseError,
  ScraperRateLimitError,
  executarComRetry,
} from '../scraper-core/retry';

describe('retry helper', () => {
  it('reprocessa falhas transitórias com backoff exponencial limitado', async () => {
    const delays: number[] = [];
    const action = vi.fn()
      .mockRejectedValueOnce(new Error('timeout waiting for selector'))
      .mockRejectedValueOnce(new Error('net::ERR_TIMED_OUT'))
      .mockResolvedValue('ok');

    const result = await executarComRetry(action, {
      baseDelayMs: 100,
      jitterRatio: 0,
      sleep: async (ms) => { delays.push(ms); },
    });

    expect(result).toBe('ok');
    expect(action).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([100, 200]);
  });

  it('limita challenges a duas tentativas', async () => {
    const delays: number[] = [];
    const action = vi.fn().mockRejectedValue(new ScraperChallengeError('captcha ativo'));

    await expect(executarComRetry(action, {
      baseDelayMs: 100,
      baseDelayChallengeMs: 100,
      jitterRatio: 0,
      sleep: async (ms) => { delays.push(ms); },
    })).rejects.toThrow('captcha ativo');

    expect(action).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([100]);
  });

  it('não retenta falhas estruturais de parsing', async () => {
    const action = vi.fn().mockRejectedValue(new ScraperParseError('preço ausente'));

    await expect(executarComRetry(action, {
      sleep: async () => undefined,
    })).rejects.toThrow('preço ausente');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('respeita retryAfterMs em rate limit', async () => {
    const delays: number[] = [];
    const action = vi.fn()
      .mockRejectedValueOnce(new ScraperRateLimitError('HTTP 429: Too many requests', 1500))
      .mockResolvedValue('ok');

    const result = await executarComRetry(action, {
      baseDelayMs: 100,
      jitterRatio: 0,
      sleep: async (ms) => { delays.push(ms); },
    });

    expect(result).toBe('ok');
    expect(action).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([1500]);
  });
});
