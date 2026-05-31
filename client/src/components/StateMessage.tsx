interface StateMessageProps {
  type: 'initial' | 'loading' | 'empty' | 'error';
  message?: string;
  siteColor?: string;
}

export function StateMessage({ type, message, siteColor }: StateMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-[fadeIn_0.6s_ease-out]">
      {type === 'loading' && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border animate-[radarRing_2s_ease-out_infinite]"
              style={{ borderColor: `${siteColor ?? 'var(--color-accent)'}33`, animationDelay: '0s' }}
            />
            <div
              className="absolute inset-0 rounded-full border animate-[radarRing_2s_ease-out_infinite]"
              style={{ borderColor: `${siteColor ?? 'var(--color-accent)'}33`, animationDelay: '0.6s' }}
            />
            <div
              className="absolute inset-0 rounded-full border animate-[radarRing_2s_ease-out_infinite]"
              style={{ borderColor: `${siteColor ?? 'var(--color-accent)'}33`, animationDelay: '1.2s' }}
            />
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="absolute inset-0 animate-[radarSweep_2s_linear_infinite]"
                style={{
                  background: `conic-gradient(from 0deg, transparent 40%, ${siteColor ?? 'var(--color-accent)'} 45%, transparent 50%)`,
                }}
              />
            </div>
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: siteColor ?? 'var(--color-accent)',
                boxShadow: `0 0 8px ${siteColor ?? 'var(--color-accent)'}`,
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-text-muted">Buscando</p>
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-text-muted animate-[dotPulse_1.4s_ease-in-out_infinite]" />
              <span className="w-1 h-1 rounded-full bg-text-muted animate-[dotPulse_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
              <span className="w-1 h-1 rounded-full bg-text-muted animate-[dotPulse_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }} />
            </span>
          </div>
        </div>
      )}

      {(type === 'initial' || type === 'empty') && (
        <div className="w-12 h-12 rounded-full border border-white/[0.08] mb-8 flex items-center justify-center bg-white/[0.02]">
          <span className="w-5 h-px bg-accent" />
        </div>
      )}

      {type === 'error' && (
        <div className="w-12 h-12 rounded-full border border-white/[0.08] mb-8 flex items-center justify-center bg-white/[0.02]">
          <span className="text-accent font-sans text-lg font-medium">!</span>
        </div>
      )}

      {type === 'initial' && (
        <>
          <h2 className="font-sans text-lg font-medium text-text-primary mb-2">
            Busque por produtos
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[280px]">
            Digite o nome de um produto e escolha uma loja
          </p>
        </>
      )}

      {type === 'empty' && (
        <>
          <h2 className="font-sans text-lg font-medium text-text-primary mb-2">
            Nenhum resultado
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[280px]">
            Tente outro termo de busca
          </p>
        </>
      )}

      {type === 'error' && (
        <>
          <h2 className="font-sans text-lg font-medium text-text-primary mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[280px]">
            {message || 'Ocorreu um erro inesperado.'}
          </p>
        </>
      )}
    </div>
  );
}
