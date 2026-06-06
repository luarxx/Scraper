import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Clock, ExternalLink, Play, Trash2, Webhook, Zap } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Site, WatchAlert, WatchDraft } from '../types';
import { useWatchAlerts } from '../hooks/useWatchAlerts';
import { Icon } from './Icon';

interface WatchPanelProps {
  sites: Site[];
  draft: WatchDraft | null;
  onDraftConsumed: () => void;
}

const SITE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  kabum: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.28)' },
  pichau: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.28)' },
  terabyteshop: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.28)' },
};

function centsToBrl(cents: number | null): string {
  if (cents === null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatCountdown(iso: string | null, now: number): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return 'A qualquer momento';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  return mins > 0 ? `${mins}min` : '< 1min';
}

function WatchAlertRow({ alert, onRemove }: { alert: WatchAlert; onRemove: (id: number) => void }) {
  const siteColor = SITE_COLORS[alert.site] ?? SITE_COLORS.kabum;
  const isDone = alert.status === 'disparado';

  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-4 animate-[fadeInUp_0.25s_ease-out_forwards]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{alert.nome}</h3>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ color: siteColor.text, background: siteColor.bg, border: `1px solid ${siteColor.border}` }}
            >
              {alert.site}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
              isDone
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                : 'text-orange-300 bg-orange-500/10 border-orange-500/20'
            }`}>
              {isDone ? 'Disparado' : 'Ativo'}
            </span>
          </div>
          <a
            href={alert.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary no-underline"
          >
            <span className="truncate">{alert.url}</span>
            <Icon icon={ExternalLink} size={13} />
          </a>
        </div>
        <button
          type="button"
          onClick={() => onRemove(alert.id)}
          className="self-start rounded-lg border border-slate-700/70 p-2 text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          aria-label="Remover alerta"
        >
          <Icon icon={Trash2} size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <span className="block text-[11px] text-text-muted">Preço alvo</span>
          <span className="text-sm font-semibold text-emerald-300 tabular-nums">{centsToBrl(alert.preco_alvo_cents)}</span>
        </div>
        <div>
          <span className="block text-[11px] text-text-muted">Último preço</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">{alert.ultimo_preco_text || centsToBrl(alert.ultimo_preco_cents)}</span>
        </div>
        <div>
          <span className="block text-[11px] text-text-muted">Último check</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">{formatDate(alert.ultimo_check_em)}</span>
        </div>
        <div>
          <span className="block text-[11px] text-text-muted">{isDone ? 'Disparado em' : 'Canal'}</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">{isDone ? formatDate(alert.disparado_em) : 'Discord'}</span>
        </div>
      </div>

      {alert.erro && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {alert.erro}
        </div>
      )}
    </div>
  );
}

export function WatchPanel({ sites, draft, onDraftConsumed }: WatchPanelProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [site, setSite] = useState('kabum');
  const [precoAlvo, setPrecoAlvo] = useState('');
  const [savedPulse, setSavedPulse] = useState(false);
  const { alerts, status, loading, saving, running, error, fetchAlerts, fetchStatus, createAlert, removeAlert, triggerRun } = useWatchAlerts();

  const activeSites = useMemo(() => sites.length > 0 ? sites : [
    { key: 'kabum', nome: 'KaBuM!' },
    { key: 'terabyteshop', nome: 'Terabyte' },
    { key: 'pichau', nome: 'Pichau' },
  ], [sites]);

  const refreshAll = useCallback(() => {
    fetchAlerts();
    fetchStatus();
  }, [fetchAlerts, fetchStatus]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!draft) return;
    setNome(draft.nome);
    setUrl(draft.url);
    setSite(draft.site);
    setPrecoAlvo(draft.preco_alvo);
    onDraftConsumed();
  }, [draft, onDraftConsumed]);

  const isRunning = status?.status === 'executando';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !url.trim() || !precoAlvo.trim()) return;
    await createAlert({
      nome: nome.trim(),
      url: url.trim(),
      site,
      canal: 'discord',
      preco_alvo: precoAlvo.trim(),
    });
    setNome('');
    setUrl('');
    setPrecoAlvo('');
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 1400);
  }

  async function handleRun() {
    await triggerRun();
    setTimeout(refreshAll, 1600);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-20 sm:pb-24 animate-[fadeIn_0.3s_ease-out]">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <span className="relative flex h-3 w-3 shrink-0">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Status</span>
            <span className="text-sm font-semibold text-text-primary mt-0.5 inline-flex items-center gap-1.5">
              <Icon icon={isRunning ? Zap : Clock} size={16} /> {isRunning ? 'Verificando...' : 'Agendado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={CalendarClock} size={18} />
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Próximo check</span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {isRunning ? 'Em execução' : formatCountdown(status?.proxima_execucao ?? null, nowMs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={Bell} size={18} />
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Alertas</span>
            <span className="block text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {status?.total_ativos ?? 0} ativos · {status?.total_disparados ?? 0} disparados
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/60 border border-white/[0.06]">
          <Icon icon={Webhook} size={18} />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-text-muted leading-tight">Discord</span>
            <span className={`block text-sm font-semibold mt-0.5 ${status?.webhook_configurado ? 'text-emerald-300' : 'text-amber-300'}`}>
              {status?.webhook_configurado ? 'Configurado' : 'Sem webhook'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={running || isRunning}
            className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running || isRunning ? 'Verificando…' : <span className="flex items-center gap-1.5"><Icon icon={Play} size={14} /> Verificar</span>}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-5">
        <form onSubmit={handleSubmit} className="rounded-xl bg-surface/60 border border-white/[0.06] p-4 sm:p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Icon icon={Bell} size={18} style={{ color: '#f97316' }} />
            <h2 className="text-base font-semibold text-text-primary">Novo alerta</h2>
            {savedPulse && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                <Icon icon={CheckCircle2} size={14} /> Salvo
              </span>
            )}
          </div>

          <label className="block text-xs font-medium text-text-secondary mb-1.5" htmlFor="watch-nome">Nome</label>
          <input
            id="watch-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-400"
            placeholder="Ex: RTX 4060 branca"
          />

          <label className="block text-xs font-medium text-text-secondary mb-1.5 mt-4" htmlFor="watch-url">URL do produto</label>
          <input
            id="watch-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-400"
            placeholder="https://..."
          />

          <label className="block text-xs font-medium text-text-secondary mb-1.5 mt-4" htmlFor="watch-price">Preço-alvo</label>
          <input
            id="watch-price"
            value={precoAlvo}
            onChange={(e) => setPrecoAlvo(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-400"
            placeholder="Ex: 1999,90"
            inputMode="decimal"
          />

          <span className="block text-xs font-medium text-text-secondary mb-2 mt-4">Site</span>
          <div className="flex flex-wrap gap-1.5">
            {activeSites.map((item) => {
              const colors = SITE_COLORS[item.key] ?? SITE_COLORS.kabum;
              const active = site === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSite(item.key)}
                  aria-pressed={active}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    color: active ? colors.text : '#94a3b8',
                    background: active ? colors.bg : 'rgba(15, 23, 42, 0.7)',
                    borderColor: active ? colors.border : '#1e293b',
                  }}
                >
                  {item.nome}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Criar alerta'}
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center text-sm text-text-secondary">
              Carregando alertas…
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-surface/60 p-8 text-center">
              <Icon icon={Bell} size={28} className="mx-auto text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-text-primary">Nenhum alerta cadastrado</p>
              <p className="mt-1 text-xs text-text-muted">Crie pelo formulário ou pelo botão em um card de produto.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <WatchAlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
