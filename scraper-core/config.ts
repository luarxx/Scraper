import * as path from 'path';

export const HEADLESS = true;
export const TIMEOUT = 30000;
export const CACHE_TTL = 10 * 60 * 1000;
export const ROOT = path.resolve(__dirname, '..');
export const CACHE_DIR = path.join(ROOT, 'data', 'cache');
export const SESSION_STATE_DIR = path.join(ROOT, 'data', 'session-state');
export const SCREENSHOT_DIR = path.join(ROOT, 'data', 'screenshots');
