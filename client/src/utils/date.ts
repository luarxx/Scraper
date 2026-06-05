export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

export function formatBrazilDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBrazilDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatBrazilDateMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  });
}

export function formatBrazilDateMonthTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBrazilMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    month: 'short',
    year: '2-digit',
  });
}

export function formatBrazilTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}
