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

// ─── Wishlist ───────────────────────────────────────────────

export type WishlistStatusValue = 'ativo' | 'pausado';

export interface WishlistItem {
  id: number;
  title: string;
  url: string;
  site: string;
  image: string | null;
  ultimo_preco_cents: number | null;
  ultimo_preco_text: string | null;
  ultimo_parcelamento: string | null;
  status: WishlistStatusValue;
  ativo: boolean;
  ultimo_check_em: string | null;
  ultimo_disparo_em: string | null;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface WishlistStatus {
  status: 'idle' | 'executando' | 'agendado';
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  total_disparados: number;
  webhook_configurado: boolean;
}

export interface WishlistItemInput {
  title: string;
  url: string;
  site: string;
  image?: string | null;
  price?: string | null;
  parcelamento?: string | null;
}

// ─── Stats dashboard ─────────────────────────────────────────

export interface SiteStats {
  site: string;
  siteNome: string;
  total: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number;
}

export interface StatsDashboardResponse {
  total_buscas: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number;
  atualizado_em: string | null;
  sites: SiteStats[];
}

// ─── Enhanced Dashboard ──────────────────────────────────────

export interface OriginStats {
  origem: string;
  total: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number;
}

export interface SistemaAutoInfo {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_configurados: number;
}

export interface SistemaWatchInfo {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  total_disparados: number;
  webhook_configurado: boolean;
}

export interface SistemaWishlistInfo {
  status: string;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  total_ativos: number;
  webhook_configurado: boolean;
}

export interface DashboardSistemas {
  auto: SistemaAutoInfo;
  watch: SistemaWatchInfo;
  wishlist: SistemaWishlistInfo;
}

export interface DashboardConfiguracoes {
  auto_configs: number;
  watch_alertas_ativos: number;
  watch_disparados: number;
  wishlist_itens_ativos: number;
  total_produtos_rastreados: number;
  total_price_history_urls: number;
}

export interface AtividadeRecenteItem {
  id: number;
  origem: string;
  site: string;
  termo: string | null;
  status: string;
  total: number;
  duracao_ms: number;
  erro: string | null;
  criado_em: string;
}

export interface PeriodoStats {
  total: number;
  sucessos: number;
  erros: number;
  taxa_sucesso: number;
  tempo_medio_resposta_ms: number | null;
}

export interface EnhancedStatsDashboardResponse extends StatsDashboardResponse {
  periodo: string;
  periodo_stats: PeriodoStats;
  por_origem: OriginStats[];
  sistemas: DashboardSistemas;
  configuracoes: DashboardConfiguracoes;
  atividade_recente: AtividadeRecenteItem[];
}
