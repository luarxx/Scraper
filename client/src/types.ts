export interface Produto {
  title: string;
  price: string | null;
  parcelamento: string | null;
  image: string;
  url: string;
  relevancia: number;
}

export interface Site {
  key: string;
  nome: string;
}

export interface ResultadoSucesso {
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: number;
  produtos: Produto[];
}

export interface ResultadoErro {
  erro: true;
  mensagem: string;
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: 0;
  produtos: [];
}

export type Resultado = ResultadoSucesso | ResultadoErro;

// ─── Price History ────────────────────────────────────────────

export interface PricePoint {
  price_cents: number | null;
  captured_at: string;
  parcelamento?: string;
}

export interface HistorySummary {
  records: number;
  trend_percent: number | null;
  current_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
  first_seen?: string;
}

// ─── Auto-search ──────────────────────────────────────────────

export interface AutoConfigEntry {
  id: number;
  termo: string;
  site: string;
  ordem: number;
}

export interface AutoStatus {
  status: 'idle' | 'executando' | 'agendado';
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_configurados: number;
}

export interface AutoResultadoItem {
  id: number;
  termo: string;
  site: string;
  status: 'ok' | 'erro' | 'pendente';
  total: number;
  produtos: Produto[];
  erro: string | null;
}

export interface AutoExecucao {
  id: number;
  iniciada_em: string;
  finalizada_em: string | null;
  status: string;
}

export interface AutoResultsResponse {
  execucao: AutoExecucao | null;
  resultados: AutoResultadoItem[];
}

// ─── Watch alerts ─────────────────────────────────────────────

export type WatchCanal = 'discord';
export type WatchStatusValue = 'ativo' | 'pausado' | 'disparado';

export interface WatchAlert {
  id: number;
  nome: string;
  url: string;
  site: string;
  canal: WatchCanal;
  preco_alvo_cents: number;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
  status: WatchStatusValue;
  ativo: boolean;
  ultimo_check_em: string | null;
  disparado_em: string | null;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface WatchStatus {
  status: 'idle' | 'executando' | 'agendado';
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  total_disparados: number;
  webhook_configurado: boolean;
}

export interface WatchDraft {
  nome: string;
  url: string;
  site: string;
  preco_alvo: string;
  ultimo_preco?: string | null;
  ultimo_parcelamento?: string | null;
  skipPreview?: boolean;
}

export interface WatchProductPreview extends Produto {
  site: string;
  siteNome: string;
  timestamp: string;
}
