import { useId, useState } from 'react';
import { ArrowLeftRight, Search, X } from 'lucide-react';
import { CityField } from './RouteSearch';
import { INDIAN_CITIES, POPULAR_CITIES_TOP } from '../../lib/cities';
import { useServiceArea } from '../../context/ServiceAreaContext';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Search bar for the Travellers / Parcels result pages. Keeps a draft locally and
// only commits on submit, so results don't refetch on every keystroke.
// Remount it (change `key`) when the committed search changes from outside.
export default function ResultsSearchBar({ value, onSubmit, showDate = false, submitLabel = 'Search' }) {
  const { cityNames, isRestricted } = useServiceArea() || {};
  const list    = isRestricted ? cityNames : INDIAN_CITIES;
  const popular = isRestricted ? cityNames.slice(0, 8) : POPULAR_CITIES_TOP.slice(0, 8);

  const [draft, setDraft] = useState({ from: value.from || '', to: value.to || '', date: value.date || '' });
  const toId = useId();
  const set = (k) => (v) => setDraft(d => ({ ...d, [k]: v }));
  const submit = () => onSubmit({ from: draft.from.trim(), to: draft.to.trim(), ...(showDate ? { date: draft.date } : {}) });
  const hasAny = draft.from || draft.to || draft.date;

  return (
    <div className={`grid items-stretch border border-slate-200 rounded-2xl bg-white ${showDate ? 'grid-cols-[1fr_1fr_0.8fr_auto]' : 'grid-cols-[1fr_1fr_auto]'}`}>
      <div className="relative px-5 py-3 border-r border-slate-200">
        <CityField label="From" placeholder="Pickup city" dot="bg-kb-500" value={draft.from} onChange={set('from')}
          list={list} popular={popular} onPicked={() => document.getElementById(toId)?.focus()} onEnter={submit} />
        <button type="button" aria-label="Swap cities" onClick={() => setDraft(d => ({ ...d, from: d.to, to: d.from }))}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors">
          <ArrowLeftRight size={14} />
        </button>
      </div>
      <div className={`px-5 pl-7 py-3 ${showDate ? 'border-r border-slate-200' : ''}`}>
        <CityField id={toId} label="To" placeholder="Destination city" dot="bg-slate-900" value={draft.to} onChange={set('to')}
          list={list} popular={popular} onEnter={submit} />
      </div>
      {showDate && (
        <div className="px-5 py-3 min-w-0">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Travel date <span className="text-slate-400 font-normal">(optional)</span></label>
          <input type="date" min={todayStr()} value={draft.date} onChange={e => set('date')(e.target.value)} aria-label="Travel date"
            className={`w-full min-w-0 bg-transparent outline-none text-[15px] font-semibold ${draft.date ? 'text-slate-900' : 'text-slate-400'}`} />
        </div>
      )}
      <div className="p-2 flex items-stretch gap-1.5">
        {hasAny && (
          <button type="button" aria-label="Clear search" title="Clear"
            onClick={() => { setDraft({ from: '', to: '', date: '' }); onSubmit({ from: '', to: '', ...(showDate ? { date: '' } : {}) }); }}
            className="w-11 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X size={17} />
          </button>
        )}
        <button type="button" onClick={submit}
          className="px-6 rounded-xl bg-kb-500 hover:bg-kb-600 text-white text-[15px] font-semibold flex items-center gap-2 transition-colors">
          <Search size={16} /> {submitLabel}
        </button>
      </div>
    </div>
  );
}
