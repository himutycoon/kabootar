import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, MapPin, Search } from 'lucide-react';
import { filterFromList, INDIAN_CITIES, POPULAR_CITIES_TOP } from '../../lib/cities';
import { useServiceArea } from '../../context/ServiceAreaContext';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── City input with keyboard-navigable suggestions ───────────────────────────
export function CityField({ id: idProp, label, placeholder, dot, value, onChange, list, popular, onPicked, onEnter, compact }) {
  const autoId = useId();
  const id = idProp || autoId;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = value.trim() ? filterFromList(value, list) : popular;
  const showList = open && suggestions.length > 0;

  const pick = (city) => {
    onChange(city);
    setOpen(false);
    setActive(-1);
    onPicked?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter') {
      if (showList && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
      else { setOpen(false); onEnter?.(); }
    }
  };

  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className={`block font-medium text-slate-500 ${compact ? 'text-[11px] mb-1' : 'text-xs mb-1.5'}`}>{label}</label>
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          className={`w-full min-w-0 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-semibold ${compact ? 'text-sm' : 'text-[15px]'}`}
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        <ul id={`${id}-list`} role="listbox"
          className="absolute left-0 top-full mt-3 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl py-1.5 z-50 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]">
          {!value.trim() && (
            <li className="px-3.5 pt-1 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Popular cities</li>
          )}
          {suggestions.map((city, i) => (
            <li key={city} role="option" aria-selected={i === active}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(city)}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-2.5 px-3.5 py-2 text-sm cursor-pointer ${i === active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}>
              <MapPin size={14} className="text-slate-400 shrink-0" /> {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Route search (Travellers / Parcels) ──────────────────────────────────────
// variant="panel"   → wide horizontal bar used on the desktop dashboard
// variant="compact" → stacked form used inside the header popover
export default function RouteSearch({ variant = 'panel', onDone, initialType = 'trips' }) {
  const navigate = useNavigate();
  const { cityNames, isRestricted } = useServiceArea() || {};
  const list    = isRestricted ? cityNames : INDIAN_CITIES;
  const popular = isRestricted ? cityNames.slice(0, 8) : POPULAR_CITIES_TOP.slice(0, 8);

  const [type, setType] = useState(initialType);
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const toId = useId();
  const compact = variant === 'compact';

  const submit = () => {
    if (!from.trim() && !to.trim()) { setError('Enter a pickup or destination city'); return; }
    setError('');
    navigate(type === 'trips' ? '/trips' : '/parcels', {
      state: { from: from.trim(), to: to.trim(), date: type === 'trips' ? date : '' },
    });
    onDone?.();
  };

  const swap = () => { setFrom(to); setTo(from); };

  const toggle = (
    <div role="tablist" aria-label="Search for" className="inline-flex p-1 bg-slate-100 rounded-lg">
      {[['trips', 'Travellers'], ['parcels', 'Parcels']].map(([k, label]) => (
        <button key={k} role="tab" aria-selected={type === k} type="button"
          onClick={() => setType(k)}
          className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${type === k ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-slate-700'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  const fromField = (
    <CityField label="From" placeholder="Pickup city" dot="bg-kb-500" value={from}
      onChange={v => { setFrom(v); setError(''); }} list={list} popular={popular}
      onPicked={() => document.getElementById(toId)?.focus()} onEnter={submit} compact={compact} />
  );
  const toField = (
    <CityField label="To" placeholder="Destination city" dot="bg-slate-900" value={to}
      onChange={v => { setTo(v); setError(''); }} list={list} popular={popular}
      id={toId} onEnter={submit} compact={compact} />
  );
  const swapBtn = (
    <button type="button" onClick={swap} aria-label="Swap cities"
      className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors">
      <ArrowLeftRight size={14} />
    </button>
  );
  const dateField = (
    <div className="min-w-0">
      <label className={`block font-medium text-slate-500 ${compact ? 'text-[11px] mb-1' : 'text-xs mb-1.5'}`}>
        Travel date <span className="text-slate-400 font-normal">(optional)</span>
      </label>
      <div className="flex items-center gap-2.5">
        <input type="date" min={todayStr()} value={date} onChange={e => setDate(e.target.value)}
          aria-label="Travel date"
          className={`w-full min-w-0 bg-transparent outline-none font-semibold ${date ? 'text-slate-900' : 'text-slate-400'} ${compact ? 'text-sm' : 'text-[15px]'}`} />
      </div>
    </div>
  );
  const submitBtn = (
    <button type="button" onClick={submit}
      className={`bg-kb-500 hover:bg-kb-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kb-500 ${compact ? 'w-full py-2.5 text-sm' : 'h-full px-7 text-[15px]'}`}>
      <Search size={16} /> {type === 'trips' ? 'Find travellers' : 'Find parcels'}
    </button>
  );

  if (compact) {
    return (
      <div className="space-y-3">
        {toggle}
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-200">
          <div className="px-3.5 py-2.5">{fromField}</div>
          <div className="relative px-3.5 py-2.5">
            <div className="absolute right-3 -top-4">{swapBtn}</div>
            {toField}
          </div>
          {type === 'trips' && <div className="px-3.5 py-2.5">{dateField}</div>}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {submitBtn}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {toggle}
        <p className="text-[13px] text-slate-500">
          {type === 'trips' ? 'Find people already travelling your route' : 'Find parcels you could carry on your trip'}
        </p>
      </div>
      <div className={`grid items-stretch border border-slate-200 rounded-2xl bg-white ${type === 'trips' ? 'grid-cols-[1fr_1fr_0.85fr_auto]' : 'grid-cols-[1fr_1fr_auto]'}`}>
        <div className="relative px-5 py-3.5 border-r border-slate-200">
          {fromField}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">{swapBtn}</div>
        </div>
        <div className={`px-5 pl-7 py-3.5 ${type === 'trips' ? 'border-r border-slate-200' : ''}`}>{toField}</div>
        {type === 'trips' && <div className="px-5 py-3.5">{dateField}</div>}
        <div className="p-2">{submitBtn}</div>
      </div>
      {error && <p className="text-[13px] text-red-600 mt-2" role="alert">{error}</p>}
    </div>
  );
}
