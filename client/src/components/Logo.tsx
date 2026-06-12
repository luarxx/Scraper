interface LogoProps {
  compact?: boolean;
  onClick?: () => void;
}

export function Logo({ compact = false, onClick }: LogoProps) {
  const content = (
    <>
      <img
        src="/Logo.png"
        alt=""
        width="44"
        height="44"
        className="h-11 w-11 shrink-0 object-contain"
      />
      {!compact && (
        <div className="min-w-0">
          <span className="block font-display text-base sm:text-lg font-black leading-none text-text-primary">
            Scraper
          </span>
          <span className="mt-0.5 hidden sm:block text-[11px] font-semibold leading-none text-text-muted">
            Ofertas monitoradas
          </span>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2.5 cursor-pointer"
        aria-label="Scraper"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5" aria-label="Scraper">
      {content}
    </div>
  );
}
