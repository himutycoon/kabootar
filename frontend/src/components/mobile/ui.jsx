// Mobile-app building blocks. Pair with the generic pieces in ../desktop/ui
// (Card, Avatar, Pill, EmptyState, RouteText, Rating) which work at any size.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, X, WifiOff, Check } from 'lucide-react';
import { useDesktopWeb } from '../../hooks/useDesktopWeb';
import { m } from './styles';
import { pushBackHandler } from '../../lib/backStack';

// Header for secondary screens (inside the app shell, below the main top bar)
export function ScreenHeader({ title, sub, back = false, onBack, right }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 pt-4 pb-3">
      {(back || onBack) && (
        <button type="button" onClick={onBack || (() => navigate(-1))} aria-label="Back"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100">
          <ArrowLeft size={21} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900 truncate">{title}</h1>
        {sub && <p className="text-[13px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
    </div>
  );
}

export function SectionTitle({ title, sub, action, onAction }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-2.5">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action && (
        <button type="button" onClick={onAction} className="shrink-0 text-[13px] font-semibold text-kb-600 active:text-kb-700 py-1">
          {action}
        </button>
      )}
    </div>
  );
}

// Full-width segmented control — items: [[key, label], …]
export function Segmented({ items, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex p-1 bg-slate-100 rounded-xl ${className}`}>
      {items.map(([k, label, count]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`flex-1 h-9 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${value === k ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-slate-500'}`}>
          {label}
          {typeof count === 'number' && count > 0 && (
            <span className={`text-[11px] px-1.5 rounded-md ${value === k ? 'bg-kb-50 text-kb-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</label>}
      {children}
      {error ? <p className="text-[13px] text-red-600 mt-1.5" role="alert">{error}</p>
        : hint ? <p className="text-xs text-slate-500 mt-1.5">{hint}</p> : null}
    </div>
  );
}

// Bottom sheet on phones, centred dialog on desktop browsers.
// `full` makes the phone version take the whole screen (for multi-step forms).
// `onBack` (optional) handles the Android back button instead of closing — e.g. previous step in a wizard
export function Sheet({ title, onClose, onBack, children, footer, full = false, headerLeft }) {
  const desktop = useDesktopWeb();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const unregisterBack = pushBackHandler(() => (onBack || onClose)?.());
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); unregisterBack(); };
  }, [onClose, onBack]);

  const frame = desktop
    ? 'w-full max-w-lg max-h-[88vh] rounded-2xl'
    : full ? 'w-full h-[100dvh]' : 'w-full max-h-[92dvh] rounded-t-3xl';

  return (
    <div className={`fixed inset-0 z-[70] bg-slate-900/50 flex animate-fade-in font-inter ${desktop ? 'items-center justify-center p-6' : 'items-end'}`}
      onClick={e => e.target === e.currentTarget && onClose?.()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-white flex flex-col overflow-hidden animate-slide-up ${frame}`}
        style={!desktop && full ? { paddingTop: 'env(safe-area-inset-top,0px)' } : undefined}>
        {!desktop && !full && <div className="flex justify-center pt-2.5"><span className="w-10 h-1 rounded-full bg-slate-200" /></div>}
        <div className="flex items-center gap-2 px-4 pt-3 pb-3 border-b border-slate-100 shrink-0">
          {headerLeft}
          <h2 className="flex-1 text-[17px] font-semibold text-slate-900 truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={!footer && !desktop ? { paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' } : undefined}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 px-4 pt-3 bg-white"
            style={{ paddingBottom: desktop ? 16 : 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Numbered step progress for multi-step forms
export function StepProgress({ steps, current }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => (
        <div key={label} className="flex-1 min-w-0">
          <div className={`h-1 rounded-full transition-colors ${i <= current ? 'bg-kb-500' : 'bg-slate-200'}`} />
          <p className={`mt-1.5 text-[11px] font-semibold truncate ${i === current ? 'text-slate-900' : i < current ? 'text-slate-500' : 'text-slate-400'}`}>
            {i < current ? <Check size={11} className="inline -mt-0.5 mr-0.5" /> : null}{label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ListRow({ icon, title, sub, onClick, right, danger = false }) {
  const Icon = icon;
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3.5 px-4 min-h-[60px] py-3 text-left ${m.press}`}>
      {Icon && (
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
          <Icon size={17} />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={`block text-[15px] font-medium ${danger ? 'text-red-600' : 'text-slate-900'}`}>{title}</span>
        {sub && <span className="block text-[13px] text-slate-500 mt-0.5 truncate">{sub}</span>}
      </span>
      {right ?? <ChevronRight size={18} className="text-slate-300 shrink-0" />}
    </button>
  );
}

export function ErrorState({ title = "Couldn't load this", body = 'Check your connection and try again. The server may take a moment to wake up.', onRetry }) {
  return (
    <div className="px-6 py-10 text-center">
      <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 inline-flex items-center justify-center mb-3"><WifiOff size={20} /></span>
      <p className="text-[15px] font-semibold text-slate-900">{title}</p>
      <p className="text-[13px] text-slate-500 mt-1">{body}</p>
      {onRetry && <button type="button" onClick={onRetry} className={`${m.btnSecondary} h-10 mt-4`}>Try again</button>}
    </div>
  );
}

export const CardSkeleton = ({ lines = 2 }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
    {lines > 1 && <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />}
  </div>
);

// Date/time input with a visible placeholder — Android WebView renders empty
// date and time inputs as blank boxes with no hint.
export function PickerInput({ type = 'date', value, placeholder, className = '', wrapClassName = '', ...rest }) {
  return (
    <span className={`relative block ${wrapClassName}`}>
      <input type={type} value={value} className={`${className} ${value ? '' : 'text-transparent'}`} {...rest} />
      {!value && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 pointer-events-none">{placeholder}</span>
      )}
    </span>
  );
}
