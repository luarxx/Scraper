export const APP_TIME_ZONE = 'America/Sao_Paulo';
export const APP_TIME_OFFSET = '-03:00';

function getBrazilParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
}

export function formatDbDatetime(date = new Date()): string {
  const p = getBrazilParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function formatApiDatetime(date = new Date()): string {
  return `${formatDbDatetime(date).replace(' ', 'T')}${APP_TIME_OFFSET}`;
}

export function dbDatetimeToApi(value: string | null): string | null {
  if (!value) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value;
  return `${value.replace(' ', 'T')}${APP_TIME_OFFSET}`;
}

export function parseLocalDatetime(s: string): Date {
  return new Date(dbDatetimeToApi(s)!);
}

export function calcularProximoHorarioIntervalo(intervalHours: number): Date {
  const now = new Date();
  const hours = now.getHours();
  const nextHour = (Math.floor(hours / intervalHours) + 1) * intervalHours;
  const next = new Date(now);
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return next;
}
