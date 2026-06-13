import { useCallback, useEffect, useRef, useState } from 'react';

export function DomInspector() {
  const [isActive, setIsActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const highlightedRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  const deactivate = useCallback(() => {
    if (highlightedRef.current) {
      highlightedRef.current.style.outline = '';
      highlightedRef.current = null;
    }
    document.documentElement.style.cursor = '';
    setIsActive(false);
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      deactivate();
    } else {
      setIsActive(true);
    }
  }, [isActive, deactivate]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        deactivate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, deactivate]);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (buttonRef.current?.contains(target)) {
        if (highlightedRef.current) {
          highlightedRef.current.style.outline = '';
          highlightedRef.current = null;
        }
        return;
      }

      if (highlightedRef.current && highlightedRef.current !== target) {
        highlightedRef.current.style.outline = '';
      }

      if (highlightedRef.current !== target) {
        target.style.outline = '2px dashed #3b82f6';
        target.style.outlineOffset = '-2px';
        highlightedRef.current = target;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (highlightedRef.current) {
        highlightedRef.current.style.outline = '';
        highlightedRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (buttonRef.current?.contains(target)) return;

      e.preventDefault();
      e.stopPropagation();

      const html = target.outerHTML;

      navigator.clipboard.writeText(html).then(
        () => showToast('HTML copiado para a área de transferência'),
        () => showToast('Falha ao copiar HTML'),
      );

      deactivate();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isActive, deactivate, showToast]);

  useEffect(() => {
    if (isActive) {
      document.documentElement.style.cursor = 'crosshair';
    }
    return () => {
      document.documentElement.style.cursor = '';
    };
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (highlightedRef.current) {
        highlightedRef.current.style.outline = '';
        highlightedRef.current = null;
      }
      document.documentElement.style.cursor = '';
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-pressed={isActive}
        className={`fixed bottom-5 right-5 z-50 font-mono text-[11px] leading-none tracking-tight transition-all shadow-lg ${
          isActive
            ? 'bg-red-800/90 hover:bg-red-700 text-red-100 border border-red-500/40'
            : 'bg-neutral-950/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/50'
        } flex items-center gap-1.5 px-2.5 py-2 rounded-sm`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
          isActive ? 'bg-red-400 animate-pulse' : 'bg-emerald-500'
        }`} />
        <span className="font-semibold">{isActive ? 'STOP' : 'DEV'}</span>
        <span className={`${isActive ? 'text-red-200' : 'text-neutral-500'}`}>
          {isActive ? 'Cancelar' : 'Inspect'}
        </span>
      </button>

      {toast && (
        <div className="fixed bottom-20 right-5 z-50 font-mono text-[11px] leading-normal px-3 py-1.5 rounded-sm bg-neutral-950 border border-emerald-700/50 text-emerald-400 shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {'>'} {toast}
        </div>
      )}
    </>
  );
}
