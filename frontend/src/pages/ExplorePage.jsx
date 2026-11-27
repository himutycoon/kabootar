import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import TripCard from '../components/TripCard';
import ParcelCard from '../components/ParcelCard';
import { TrendingUp, Star, RefreshCw, ChevronRight, Users, Send, Package } from 'lucide-react';
import { useAuthGate } from '../hooks/useAuthGate';
import { useAuth } from '../context/AuthContext';
import PostTripModal from '../components/PostTripModal';
import PostParcelModal from '../components/PostParcelModal';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, SectionHeader, EmptyState, RowSkeleton, Avatar, RouteText } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { Route, BadgeCheck, Search } from 'lucide-react';
import { ScreenHeader, SectionTitle, Segmented, CardSkeleton, ErrorState } from '../components/mobile/ui';
import { m } from '../components/mobile/styles';
import { getTripDates } from '../lib/tripDates';
import OfflineNotice from '../components/OfflineNotice';
import { saveCache, readCache, isOffline } from '../lib/offlineCache';

export default function ExplorePage() {
  const navigate  = useNavigate();
  const authGate  = useAuthGate();
  const { user }  = useAuth();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineAt,  setOfflineAt]  = useState(null);
  const [showTrip,   setShowTrip]   = useState(false);
  const [showParcel, setShowParcel] = useState(false);
  const routerLocation = useLocation();
  const [kind,  setKind]  = useState(routerLocation.state?.tab === 'parcels' ? 'parcels' : 'trips');
  const [query, setQuery] = useState('');
  const [when,  setWhen]  = useState('any'); // any | today | week | month

  const load = async () => {
    try {
      const r = await api.get('/explore');
      setData(r.data);
      setOfflineAt(null);
      saveCache('explore', r.data);
    } catch (err) {
      // Offline: show the last feed saved on this device; otherwise data stays null → error state
      const cached = isOffline(err) ? readCache('explore') : null;
      if (cached) { setData(cached.data); setOfflineAt(cached.at); }
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const refresh = () => { setRefreshing(true); load(); };


  const isDesktopWeb = useDesktopWeb();
  const postTrip = () => authGate(() => {
    if (user?.kycStatus !== 'verified') {
      import('react-hot-toast').then(({ default: t }) => t.error('KYC required to post trips'));
      setTimeout(() => navigate('/kyc'), 600);
      return;
    }
    setShowTrip(true);
  });

  // ── Desktop browser layout (never used by the Android app) ──
  if (isDesktopWeb) {
    const trips = data?.trips || [];
    const parcels = data?.parcels || [];
    const trending = data?.trending || [];
    const members = data?.users || [];
    return (
      <div className="space-y-8">
        <PageHeader title="Explore" sub="Upcoming trips and open parcel requests across Kabutar."
          actions={<>
            <button type="button" onClick={refresh} className={`${btn.secondary} ${btn.lg}`} aria-label="Refresh">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" onClick={() => authGate(() => setShowParcel(true))} className={`${btn.secondary} ${btn.lg}`}><Package size={16} /> Send a parcel</button>
            <button type="button" onClick={postTrip} className={`${btn.primary} ${btn.lg}`}><Send size={15} /> Post a trip</button>
          </>} />
        {offlineAt && <OfflineNotice at={offlineAt} onRetry={refresh} />}

        <section>
          <SectionHeader title="Trending routes" sub="Routes with the most upcoming trips" />
          {loading ? (
            <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <div key={i} className="h-[74px] bg-white border border-slate-200 rounded-2xl animate-pulse" />)}</div>
          ) : trending.length === 0 ? (
            <Card><EmptyState icon={TrendingUp} title="No upcoming trips yet" body="Trending routes appear once travellers post trips." /></Card>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {trending.map(r => (
                <button key={`${r.from}-${r.to}`} type="button" onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                  className="text-left bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:border-slate-300 transition-colors">
                  <RouteText from={r.from} to={r.to} className="text-sm font-semibold text-slate-900 max-w-full" />
                  <span className="block text-xs text-slate-500 mt-1">{r.count} upcoming trip{r.count !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <div className="space-y-8 min-w-0">
            <section>
              <SectionHeader title="Upcoming trips" sub="Recently posted by travellers" actionLabel="Search travellers" onAction={() => navigate('/trips')} />
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {loading ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> :
                 trips.length === 0 ? <EmptyState icon={Route} title="No upcoming trips right now" actionLabel="Post your trip" onAction={postTrip} /> :
                 trips.map(t => <TripCard key={t._id} trip={t} variant="row" />)}
              </Card>
            </section>
            <section>
              <SectionHeader title="Open parcel requests" sub="From senders in the last 30 days" actionLabel="Search parcels" onAction={() => navigate('/parcels')} />
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {loading ? <><RowSkeleton /><RowSkeleton /></> :
                 parcels.length === 0 ? <EmptyState icon={Package} title="No open requests right now" actionLabel="Post a request" onAction={() => authGate(() => setShowParcel(true))} /> :
                 parcels.map(p => <ParcelCard key={p._id} parcel={p} variant="row" />)}
              </Card>
            </section>
          </div>

          <aside className="sticky top-24">
            <Card>
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-slate-900">Experienced travellers</h3>
                <p className="text-xs text-slate-500 mt-0.5">ID-verified, with completed deliveries</p>
              </div>
              {loading ? <div className="px-5 pb-4 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div> :
               members.length === 0 ? <p className="px-5 pb-5 text-[13px] text-slate-500">No completed deliveries yet.</p> : (
                <ul className="pb-2">
                  {members.map(u => (
                    <li key={u._id} className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar user={u} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-slate-900 truncate">{u.name}</span>
                          <BadgeCheck size={13} className="text-emerald-600 shrink-0" aria-label="ID verified" />
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {u.tripsCompleted} deliver{u.tripsCompleted === 1 ? 'y' : 'ies'}
                          {u.totalRatings > 0 ? ` · ★ ${Number(u.rating).toFixed(1)}` : ''}{u.city ? ` · ${u.city}` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>

        {showTrip && <PostTripModal onClose={() => setShowTrip(false)} onSuccess={() => { setShowTrip(false); load(); }} />}
        {showParcel && <PostParcelModal onClose={() => setShowParcel(false)} onSuccess={() => { setShowParcel(false); load(); }} />}
      </div>
    );
  }

  // ── Mobile layout (Android app + phone browsers) ──
  const q = query.trim().toLowerCase();
  const matchesQuery = (x) => !q || [x.fromCity, x.toCity].some(c => c?.toLowerCase().includes(q));
  const inWindow = (trip) => {
    if (when === 'any') return true;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + (when === 'today' ? 1 : when === 'week' ? 7 : 31));
    return getTripDates(trip).some(d => d >= start && d < end);
  };
  const trips   = (data?.trips || []).filter(t => matchesQuery(t) && inWindow(t));
  const parcels = (data?.parcels || []).filter(matchesQuery);
  const list    = kind === 'trips' ? trips : parcels;

  return (
    <div className="px-4 pt-1 pb-4">
      <ScreenHeader title="Explore" sub="Upcoming trips and open requests"
        right={<button type="button" onClick={refresh} aria-label="Refresh"
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 active:bg-slate-100">
          <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
        </button>} />

      {offlineAt && <div className="mb-3"><OfflineNotice at={offlineAt} onRetry={refresh} /></div>}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input className={`${m.input} pl-11`} placeholder="Filter by city or route" value={query}
          onChange={e => setQuery(e.target.value)} enterKeyHint="search" aria-label="Filter by city" />
      </div>

      <Segmented className="mt-3" value={kind} onChange={setKind}
        items={[['trips', 'Travellers', data ? trips.length : undefined], ['parcels', 'Parcels', data ? parcels.length : undefined]]} />

      {kind === 'trips' && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 mt-3 pb-0.5 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {[['any', 'Any time'], ['today', 'Today'], ['week', 'Next 7 days'], ['month', 'Next 30 days']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setWhen(k)} className={`${m.chip(when === k)} shrink-0`}>{label}</button>
          ))}
        </div>
      )}

      {!loading && (data?.trending?.length ?? 0) > 0 && !q && (
        <section className="mt-6">
          <SectionTitle title="Popular routes" />
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {data.trending.map(r => (
              <button key={`${r.from}-${r.to}`} type="button" onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                className="shrink-0 h-10 px-3.5 rounded-full bg-white border border-slate-200 flex items-center gap-2 text-[13px] font-semibold text-slate-800 active:bg-slate-50">
                {r.from} <span className="text-slate-400">→</span> {r.to}
                <span className="text-xs font-medium text-slate-400">{r.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-3">
        <SectionTitle title={kind === 'trips' ? 'Available trips' : 'Recent parcel requests'}
          action={kind === 'trips' ? 'Search by route' : 'Search by route'}
          onAction={() => navigate(kind === 'trips' ? '/trips' : '/parcels')} />
        {loading ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : !data ? (
          <div className={m.card}><ErrorState onRetry={refresh} /></div>
        ) : list.length === 0 ? (
          <div className={m.card}>
            {kind === 'trips' ? (
              <EmptyState icon={Route} title={q || when !== 'any' ? 'No trips match these filters' : 'No upcoming trips right now'}
                body={q || when !== 'any' ? 'Try another city or a wider date range.' : 'Be the first to post a trip on your route.'}
                actionLabel={q || when !== 'any' ? 'Clear filters' : 'Post a trip'}
                onAction={q || when !== 'any' ? () => { setQuery(''); setWhen('any'); } : postTrip} />
            ) : (
              <EmptyState icon={Package} title={q ? 'No requests match this city' : 'No open requests right now'}
                body={q ? 'Try another city.' : 'Post a request and travellers heading your way can reach you.'}
                actionLabel={q ? 'Clear filter' : 'Send a parcel'}
                onAction={q ? () => setQuery('') : () => authGate(() => setShowParcel(true))} />
            )}
          </div>
        ) : kind === 'trips'
          ? trips.map(t => <TripCard key={t._id} trip={t} />)
          : parcels.map(p => <ParcelCard key={p._id} parcel={p} />)}
      </section>

      {showTrip && <PostTripModal onClose={() => setShowTrip(false)} onSuccess={() => { setShowTrip(false); load(); }} />}
      {showParcel && <PostParcelModal onClose={() => setShowParcel(false)} onSuccess={() => { setShowParcel(false); load(); }} />}
    </div>
  );
}
