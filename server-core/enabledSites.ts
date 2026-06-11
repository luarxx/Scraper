import { SITES } from '../scraper';
import { DISABLED_SITES } from './env';

export function isSiteEnabled(siteKey: string): boolean {
  return !DISABLED_SITES.includes(siteKey);
}

export function getEnabledSites(): Record<string, typeof SITES[string]> {
  return Object.fromEntries(
    Object.entries(SITES).filter(([key]) => isSiteEnabled(key))
  );
}

export function getEnabledSiteKeys(): string[] {
  return Object.keys(SITES).filter(isSiteEnabled);
}
