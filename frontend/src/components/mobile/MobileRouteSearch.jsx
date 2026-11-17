import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Search } from 'lucide-react';
import { CityField } from '../desktop/RouteSearch';
import { INDIAN_CITIES, POPULAR_CITIES_TOP } from '../../lib/cities';
import { useServiceArea } from '../../context/ServiceAreaContext';
import { Segmented } from './ui';
import { m } from './styles';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Home-screen search: Travellers (with date) or Parcels. Navigates to the
// existing /trips or /parcels results screens with the same router state.
export default function MobileRouteSearch() {
  const navigate = useNavigate();
  const { cityNames, isRestricted } = useServiceArea() || {};
  const list    = isRestricted ? cityNames : INDIAN_CITIES;
  const popular = isRestricted ? cityNames.slice(0, 8) : POPULAR_CITIES_TOP.slice(0, 8);

  const [type, setType] = useState('trips');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const toId = useId();
  const isTrips = type === 'trips';

  const submit = () => {
    if (!from.trim() && !to.trim()) { setError('Enter a pickup or destination city'); return; }
    setError('');
    navigate(isTrips ? '/trips' : '/parcels', { state: { from: from.trim(), to: to.trim(), date: isTrips ? date : '' } });
  };

  return (
    <div className={`${m.card} p-3`}>
      <Segmented value={type} onChange={setType} items={[['trips', 'Find travellers'], ['parcels', 'Find parcels']]} />
      <div className="relative mt-3 border border-slate-200 rounded-xl divide-y divide-slate-200">
        <div className="px-3.5 py-2.5 pr-14">
          <CityField label={isTrips ? 'From' : 'Pickup city'} placeholder="Where from?" dot="bg-kb-500" value={from}
            onChange={v => { setFrom(v); setError(''); }} list={list} popular={popular}
            onPicked={() => document.getElementById(toId)?.focus()} onEnter={submit} />
        </div>
        <div className="px-3.5 py-2.5 pr-14">
          <CityField id={toId} label={isTrips ? 'To' : 'Delivery city'} placeholder="Where to?" dot="bg-slate-900" value={to}
            onChange={v => { setTo(v); setError(''); }} list={list} popular={popular} onEnter={submit} />
        </div>
        <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap cities"
          className="absolute right-3 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-50"
          style={{ top: isTrips ? 'calc(33.3% - 18px)' : 'calc(50% - 18px)' }}>
          <ArrowUpDown size={16} />
        </button>
        {isTrips && (
          <label className="block px-3.5 py-2.5">
            <span className="block text-xs font-medium text-slate-500 mb-1">Travel date <span className="text-slate-400 font-normal">(optional)</span></span>
            <span className="relative block">
              <input type="date" min={todayStr()} value={date} onChange={e => setDate(e.target.value)} aria-label="Travel date"
                className={`w-full bg-transparent outline-none text-[15px] font-semibold ${date ? 'text-slate-900' : 'text-transparent'}`} />
              {!date && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-slate-400 pointer-events-none">Any date</span>}
            </span>
          </label>
        )}
      </div>
      {error && <p className="text-[13px] text-red-600 mt-2 px-1" role="alert">{error}</p>}
      <button type="button" onClick={submit} className={`${m.btnPrimary} w-full mt-3`}>
        <Search size={17} /> {isTrips ? 'Find travellers' : 'Find parcels'}
      </button>
    </div>
  );
}
