// Profile sections: traveller earnings, route alerts and notification settings.
// Each works on desktop (inside a Card) and in the mobile app.
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BellRing, Trash2, Send, Package } from 'lucide-react';
import api from '../lib/api';
import { rupees } from '../lib/format';
import { useAuth } from '../context/AuthContext';

// ── Earnings ─────────────────────────────────────────────────────────────────
export function EarningsPanel({ data, compact = false }) {
  if (!data) return null;
  if (!data.deliveries) {
    return (
      <div className="px-5 py-4">
        <p className="text-[15px] font-semibold text-slate-900">No deliveries yet</p>
        <p className="text-[13px] text-slate-500 mt-0.5">When you carry a parcel and the sender confirms receipt, the agreed amount shows up here.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-3 text-center py-4 border-b border-slate-100">
        <Stat label="Total" value={rupees(data.total)} />
        <Stat label="This month" value={rupees(data.thisMonth)} border />
        <Stat label="Deliveries" value={data.deliveries} />
      </div>
      <ul className="divide-y divide-slate-100">
        {data.items.slice(0, compact ? 5 : 50).map(it => (
          <li key={it._id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-slate-900 truncate">{it.fromCity} → {it.toCity}</span>
              <span className="block text-[12px] text-slate-500">{[it.weight && `${it.weight} kg`, it.completedAt && format(new Date(it.completedAt), 'dd MMM yyyy')].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`text-[14px] font-semibold ${it.amount ? 'text-slate-900' : 'text-slate-400'}`}>{it.amount ? rupees(it.amount) : 'No price set'}</span>
          </li>
        ))}
      </ul>
      {data.unpriced > 0 && (
        <p className="px-5 py-3 text-[12px] text-slate-500 border-t border-slate-100">
          {data.unpriced} {data.unpriced === 1 ? 'delivery has' : 'deliveries have'} no price agreed in Kabutar, so {data.unpriced === 1 ? "it isn't" : "they aren't"} counted in the total.
        </p>
      )}
    </div>
  );
}

const Stat = ({ label, value, border }) => (
  <div className={border ? 'border-x border-slate-100' : ''}>
    <p className="text-[18px] font-semibold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

// ── Route alerts ─────────────────────────────────────────────────────────────
export function RouteAlertsList() {
  const [alerts, setAlerts] = useState(null);
  useEffect(() => {
    api.get('/route-alerts').then(r => setAlerts(r.data.alerts || [])).catch(() => setAlerts([]));
  }, []);
  const remove = async (id) => {
    try {
      await api.delete(`/route-alerts/${id}`);
      setAlerts(prev => prev.filter(a => a._id !== id));
      toast.success('Alert removed');
    } catch { toast.error("Couldn't remove the alert"); }
  };
  if (!alerts) return <p className="px-5 py-4 text-[13px] text-slate-500">Loading…</p>;
  if (!alerts.length) {
    return (
      <div className="px-5 py-4">
        <p className="text-[14px] font-medium text-slate-900">No route alerts</p>
        <p className="text-[13px] text-slate-500 mt-0.5">Search a route on the Trips or Parcels screen and tap "Alert me" to hear when something new is posted.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map(a => {
        const Icon = a.kind === 'trips' ? Send : Package;
        return (
          <li key={a._id} className="flex items-center gap-3 px-5 py-3">
            <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-slate-900 truncate">{a.fromCity} → {a.toCity}</span>
              <span className="block text-[12px] text-slate-500">{a.kind === 'trips' ? 'New trips' : 'New parcel requests'}</span>
            </span>
            <button type="button" onClick={() => remove(a._id)} aria-label={`Remove alert ${a.fromCity} to ${a.toCity}`}
              className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 active:bg-slate-100">
              <Trash2 size={16} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// "Alert me" button for a searched route. kind: 'trips' | 'parcels'
export function RouteAlertButton({ kind, fromCity, toCity, className = '' }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = user && fromCity?.trim() && toCity?.trim() && fromCity.trim().toLowerCase() !== toCity.trim().toLowerCase();
  // A new route resets the saved state
  const [routeKey, setRouteKey] = useState('');
  const key = `${kind}|${fromCity}|${toCity}`.toLowerCase();
  if (key !== routeKey) { setRouteKey(key); setSaved(false); }
  if (!ready) return null;
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/route-alerts', { kind, fromCity: fromCity.trim(), toCity: toCity.trim() });
      setSaved(true);
      toast.success(`We'll tell you when ${kind === 'trips' ? 'a trip' : 'a parcel request'} is posted for ${fromCity.trim()} → ${toCity.trim()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save the alert");
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={save} disabled={busy || saved}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border text-[13px] font-semibold transition-colors disabled:pointer-events-none ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-50'} ${className}`}>
      <BellRing size={14} /> {saved ? 'Alert on' : 'Alert me'}
    </button>
  );
}

// ── Notification settings ────────────────────────────────────────────────────
const PREFS = [
  ['messages', 'Messages', 'New chat messages'],
  ['parcelUpdates', 'Parcel updates', 'Requests, acceptances, pickup and delivery'],
  ['routeAlerts', 'Route alerts', 'New trips and parcels on routes you follow'],
  ['announcements', 'Announcements', 'News and updates from Kabutar'],
];

export function NotificationPrefsList() {
  const { user, setUser } = useAuth();
  const prefs = { messages: true, parcelUpdates: true, routeAlerts: true, announcements: true, ...(user?.notificationPrefs || {}) };
  const toggle = async (k) => {
    const next = { ...prefs, [k]: !prefs[k] };
    const apply = (np) => {
      const updated = { ...user, notificationPrefs: np };
      setUser(updated);
      try { localStorage.setItem('kabootar_user', JSON.stringify(updated)); } catch { /* storage unavailable */ }
    };
    apply(next);
    try {
      const { data } = await api.patch('/auth/me/notification-prefs', { [k]: next[k] });
      apply(data.notificationPrefs);
    } catch {
      apply(prefs);
      toast.error("Couldn't save. Check your connection.");
    }
  };
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {PREFS.map(([k, label, sub]) => (
          <li key={k}>
            <label className="flex items-center gap-3 px-5 min-h-[60px] py-3 cursor-pointer">
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-slate-900">{label}</span>
                <span className="block text-[13px] text-slate-500 mt-0.5">{sub}</span>
              </span>
              <Toggle on={prefs[k]} onChange={() => toggle(k)} label={label} />
            </label>
          </li>
        ))}
      </ul>
      <p className="px-5 py-3 text-[12px] text-slate-500 border-t border-slate-100">
        Pickup and delivery codes and verification results are always sent, so you never miss a handover.
      </p>
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-kb-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}
