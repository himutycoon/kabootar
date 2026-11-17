import { useId, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { CityField } from '../desktop/RouteSearch';
import { INDIAN_CITIES, POPULAR_CITIES_TOP } from '../../lib/cities';
import { useServiceArea } from '../../context/ServiceAreaContext';
import { m } from './styles';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Search for the Travellers / Parcels result screens. Collapses to a summary
// once a search is active; keeps a local draft and commits on submit.
// Remount (change `key`) when the committed search changes from outside.
export default function MobileResultsSearch({ value, onSubmit, showDate = false, submitLabel = 'Search' }) {
  const { cityNames, isRestricted } = useServiceArea() || {};
  const list    = isRestricted ? cityNames : INDIAN_CITIES;
  const popular = isRestricted ? cityNames.slice(0, 8) : POPULAR_CITIES_TOP.slice(0, 8);

  const active = !!(value.from || value.to || value.date);
  const [open, setOpen]   = useState(!active);
  const [draft, setDraft] = useState({ from: value.from || '', to: value.to || '', date: value.date || '' });
  const [error, setError] = useState('');
  const toId = useId();
  const set = (k) => (v) => { setDraft(d => ({ ...d, [k]: v })); setError(''); };

  const submit = () => {
    if (!draft.from.trim() && !draft.to.trim()) { setError('Enter a pickup or destination city'); return; }
    onSubmit({ from: draft.from.trim(), to: draft.to.trim(), ...(showDate ? { date: draft.date } : {}) });
  };
  const clear = () => onSubmit({ from: '', to: '', ...(showDate ? { date: '' } : {}) });

  if (!open && active) {
    return (
      <div className={`${m.card} flex items-center gap-2 pl-4 pr-1.5 h-14`}>
        <button type="button" onClick={() => setOpen(true)} className="flex-1 min-w-0 flex items-center gap-3 text-left h-full">
          <Search size={18} className="text-slate-400 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-slate-900 truncate">
              {value.from || 'Anywhere'} → {value.to || 'Anywhere'}
            </span>
            {showDate && value.date && <span className="block text-xs text-slate-500">{format(new Date(value.date), 'EEE, d MMM')}</span>}
          </span>
        </button>
        <button type="button" onClick={() => setOpen(true)} aria-label="Edit search" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 active:bg-slate-100">
          <SlidersHorizontal size={18} />
        </button>
        <button type="button" onClick={clear} aria-label="Clear search" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className={`${m.card} p-3`}>
      <div className="relative border border-slate-200 rounded-xl divide-y divide-slate-200">
        <div className="px-3.5 py-2.5 pr-14">
          <CityField label="From" placeholder="Pickup city" dot="bg-kb-500" value={draft.from} onChange={set('from')}
            list={list} popular={popular} onPicked={() => document.getElementById(toId)?.focus()} onEnter={submit} />
        </div>
        <div className="px-3.5 py-2.5 pr-14">
          <CityField id={toId} label="To" placeholder="Destination city" dot="bg-slate-900" value={draft.to} onChange={set('to')}
            list={list} popular={popular} onEnter={submit} />
        </div>
        <button type="button" onClick={() => setDraft(d => ({ ...d, from: d.to, to: d.from }))} aria-label="Swap cities"
          className="absolute right-3 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-50"
          style={{ top: showDate ? 'calc(33.3% - 18px)' : 'calc(50% - 18px)' }}>
          <ArrowUpDown size={16} />
        </button>
        {showDate && (
          <label className="block px-3.5 py-2.5">
            <span className="block text-xs font-medium text-slate-500 mb-1">Travel date <span className="text-slate-400 font-normal">(optional)</span></span>
            <input type="date" min={todayStr()} value={draft.date} onChange={e => set('date')(e.target.value)}
              className={`w-full bg-transparent outline-none text-[15px] font-semibold ${draft.date ? 'text-slate-900' : 'text-slate-400'}`} />
          </label>
        )}
      </div>
      {error && <p className="text-[13px] text-red-600 mt-2 px-1" role="alert">{error}</p>}
      <div className="flex gap-2 mt-3">
        {active && <button type="button" onClick={() => setOpen(false)} className={`${m.btnSecondary} flex-1`}>Cancel</button>}
        <button type="button" onClick={submit} className={`${m.btnPrimary} flex-[2]`}><Search size={17} /> {submitLabel}</button>
      </div>
    </div>
  );
}
