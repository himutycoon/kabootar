// Shared building blocks for the desktop-web pages. Mobile never imports these.
import { ArrowRight, BadgeCheck, Star } from 'lucide-react';
import { btn } from './styles';


export function Card({ children, className = '', ...rest }) {
  return <div className={`bg-white border border-slate-200 rounded-2xl ${className}`} {...rest}>{children}</div>;
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900">{title}</h1>
        {sub && <p className="text-[15px] text-slate-500 mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, sub, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-[17px] font-semibold text-slate-900 tracking-[-0.01em]">{title}</h2>
        {sub && <p className="text-[13px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction}
          className="shrink-0 text-[13px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors">
          {actionLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// Underline tabs — items: [{ k, label, count? }]
export function Tabs({ items, value, onChange }) {
  return (
    <div role="tablist" className="flex items-center gap-6 border-b border-slate-200">
      {items.map(({ k, label, count }) => {
        const active = value === k;
        return (
          <button key={k} type="button" role="tab" aria-selected={active} onClick={() => onChange(k)}
            className={`relative -mb-px pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${active ? 'text-slate-900 border-b-2 border-kb-500' : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'}`}>
            {label}
            {typeof count === 'number' && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${active ? 'bg-kb-50 text-kb-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ user, size = 40, className = '' }) {
  return (
    <span className={`rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      {user?.profileImage
        ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" loading="lazy" />
        : <span className="text-slate-600 font-semibold" style={{ fontSize: Math.max(11, size * 0.36) }}>{user?.name?.[0]?.toUpperCase() || '?'}</span>}
    </span>
  );
}

export const VerifiedBadge = ({ label = 'ID verified' }) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
    <BadgeCheck size={12} /> {label}
  </span>
);

export function Rating({ user }) {
  if (!user?.totalRatings) return <span className="text-xs text-slate-400">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <Star size={12} className="fill-amber-400 text-amber-400" />
      <span className="font-semibold text-slate-800">{Number(user.rating).toFixed(1)}</span>
      <span className="text-slate-400">({user.totalRatings})</span>
    </span>
  );
}

export function RouteText({ from, to, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <span className="truncate">{from}</span>
      <ArrowRight size={14} className="text-slate-400 shrink-0" />
      <span className="truncate">{to}</span>
    </span>
  );
}

export function EmptyState({ icon, title, body, actionLabel, onAction, children }) {
  const Icon = icon;
  return (
    <div className="px-6 py-12 text-center">
      {Icon && <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 inline-flex items-center justify-center mb-3"><Icon size={20} /></span>}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {body && <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">{body}</p>}
      {actionLabel && (
        <button type="button" onClick={onAction} className={`${btn.secondary} ${btn.sm} mt-4`}>{actionLabel}</button>
      )}
      {children}
    </div>
  );
}

export const RowSkeleton = () => (
  <div className="flex items-center gap-4 px-5 py-4">
    <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
      <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
    </div>
  </div>
);

export function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate:   'bg-slate-100 text-slate-600',
    green:   'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    blue:    'bg-sky-50 text-sky-700',
    orange:  'bg-kb-50 text-kb-700',
    red:     'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${tones[tone] || tones.slate}`}>{children}</span>;
}
