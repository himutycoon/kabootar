import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../lib/api';
import TripCard from '../components/TripCard';
import PostTripModal from '../components/PostTripModal';
import LocationFilterBar from '../components/LocationFilterBar';
import { TripSkeletons } from '../components/SkeletonCard';
import { Plus, X, Calendar, Search, History, RefreshCw } from 'lucide-react';
import { hasUpcomingDate } from '../lib/tripDates';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { useLocationFilter } from '../hooks/useLocationFilter';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, Tabs, EmptyState, RowSkeleton } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import ResultsSearchBar from '../components/desktop/ResultsSearchBar';
import MobileResultsSearch from '../components/mobile/MobileResultsSearch';
import { ScreenHeader, Segmented, CardSkeleton } from '../components/mobile/ui';
import { m } from '../components/mobile/styles';
import { Route, SearchX } from 'lucide-react';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const PULL_THRESHOLD = 64;

function LiveBadge({ time }) {
  const [label, setLabel] = useState('Just now');
  useEffect(() => {
    const update = () => {
      const s = Math.floor((Date.now() - time) / 1000);
      setLabel(s < 8 ? 'Just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [time]);
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft shrink-0" />
      <span className="text-[10px] text-stone-400 font-medium">Updated {label}</span>
    </div>
  );
}

export default function TripsPage() {
  const { user }  = useAuth();
  const authGate  = useAuthGate();
  const navigate  = useNavigate();

  // KYC check before opening Post Trip modal
  const openPostTripModal = () => authGate(() => {
    if (user?.kycStatus !== 'verified') {
      toast.error('KYC verification required to post trips');
      setTimeout(() => navigate('/kyc'), 800);
      return;
    }
    setShowModal(true);
  });
  const location  = useLocation();
  const loc       = useLocationFilter();

  const [trips,      setTrips]      = useState([]);
  const [exactDateMatch, setExactDateMatch] = useState(true);
  const [myTrips,    setMyTrips]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [fetchedAt,  setFetchedAt]  = useState(null);
  const [tab,        setTab]        = useState(location.state?.tab === 'mine' ? 'mine' : 'all');
  const [showModal,  setShowModal]  = useState(false);
  const [editingTrip,setEditingTrip]= useState(null);
  const [search,     setSearch]     = useState({
    from: location.state?.from || '',
    to:   location.state?.to   || '',
    date: location.state?.date || '',
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'nearby' | 'recent'

  const touchStartY  = useRef(0);
  const [pullDelta,  setPullDelta]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const hasSearched = !!(search.from || search.to || search.date);

  const fetchTrips = useCallback(async () => {
    // Don't fetch until user provides at least one route param
    if (!search.from && !search.to && !search.date) {
      setTrips([]); setLoading(false); return;
    }
    setLoading(true);
    try {
      const params = {};
      if (search.from) params.from = search.from;
      if (search.to)   params.to   = search.to;
      if (search.date) params.date = search.date;

      const promises = [api.get('/trips', { params })];
      if (user) promises.push(api.get('/trips/my'));
      const [allRes, myRes] = await Promise.all(promises);
      setTrips(allRes.data.trips);
      setExactDateMatch(allRes.data.exactDateMatch !== false);
      if (myRes) setMyTrips(myRes.data.trips);
      setFetchedAt(Date.now());
    } finally { setLoading(false); }
  }, [search.from, search.to, search.date, user]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // "My Trips" must load even before any route search (fetchTrips exits early without one)
  useEffect(() => {
    if (!user) return;
    api.get('/trips/my').then(r => setMyTrips(r.data.trips || [])).catch(() => {});
  }, [user]);

  const isDesktopWeb = useDesktopWeb();

  // Pull-to-refresh
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (window.scrollY > 4) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullDelta(Math.min(delta * 0.38, PULL_THRESHOLD + 20));
  };
  const onTouchEnd = async () => {
    if (pullDelta >= PULL_THRESHOLD) {
      setRefreshing(true);
      await fetchTrips();
      setRefreshing(false);
    }
    setPullDelta(0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return;
    await api.delete(`/trips/${id}`);
    setMyTrips(prev => prev.filter(t => t._id !== id));
    setTrips(prev => prev.filter(t => t._id !== id));
  };

  const handleEditSuccess = (updated) => {
    setMyTrips(prev => prev.map(t => t._id === updated._id ? updated : t));
    setTrips(prev => prev.map(t => t._id === updated._id ? updated : t));
    setEditingTrip(null);
  };

  const handleMarkFull = async (id) => {
    if (!confirm('Mark this trip as full? It will move to your Travel History.')) return;
    try {
      await api.patch(`/trips/${id}`, { status: 'completed' });
      setTrips(prev => prev.filter(t => t._id !== id));
      setMyTrips(prev => prev.map(t => t._id === id ? { ...t, status: 'completed' } : t));
      toast.success('Trip marked as full — moved to Travel History');
    } catch { toast.error('Failed to update trip'); }
  };


  // Apply client-side location/recent filter
  const filteredTrips = useMemo(() => {
    if (activeFilter === 'nearby' && loc.enabled) {
      return trips.filter(t => loc.matchesNearby(t.fromCity, t.toCity));
    }
    if (activeFilter === 'recent') {
      return [...trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return trips;
  }, [trips, activeFilter, loc.enabled, loc.nearbyCities, loc.city]); // eslint-disable-line

  const sod = startOfToday();
  const futureMyTrips = myTrips.filter(t => t.status === 'active' && hasUpcomingDate(t, sod));
  // Travel history: no upcoming dates left OR trip marked as completed (full)
  const pastMyTrips   = myTrips.filter(t => !hasUpcomingDate(t, sod) || t.status === 'completed');
  const isOwner = (t) => t.userId?._id === user?._id || t.userId === user?._id;


  const modals = (
    <>
      {showModal && (
        <PostTripModal onClose={() => setShowModal(false)}
          onSuccess={trip => { setMyTrips(prev => [trip, ...prev]); setTrips(prev => [trip, ...prev]); setShowModal(false); }} />
      )}
      {editingTrip && (
        <PostTripModal initialData={editingTrip} tripId={editingTrip._id}
          onClose={() => setEditingTrip(null)} onSuccess={handleEditSuccess} />
      )}
    </>
  );

  // ── Desktop browser layout (never used by the Android app) ──
  if (isDesktopWeb) {
    const rows = (items, props = () => ({})) => (
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {items.map(t => <TripCard key={t._id} trip={t} variant="row" {...props(t)} />)}
      </Card>
    );
    return (
      <div className="space-y-6">
        <PageHeader title="Travellers" sub="Find people already travelling your route, or manage your own trips."
          actions={<button type="button" onClick={openPostTripModal} className={`${btn.primary} ${btn.lg}`}><Plus size={16} /> Post a trip</button>} />

        <Tabs value={tab} onChange={k => k === 'mine' ? authGate(() => setTab('mine')) : setTab(k)}
          items={[{ k: 'all', label: 'Find travellers' }, { k: 'mine', label: 'My trips', count: user ? futureMyTrips.length : undefined }]} />

        {tab === 'all' && (
          <>
            <ResultsSearchBar key={`${search.from}|${search.to}|${search.date}`} value={search} showDate
              submitLabel="Find travellers" onSubmit={next => setSearch(next)} />

            {hasSearched && (
              <div className="flex items-start justify-between gap-6">
                <div className="pt-1.5">
                  <p className="text-sm text-slate-600">
                    {loading ? 'Searching…' : <><span className="font-semibold text-slate-900">{filteredTrips.length}</span> traveller{filteredTrips.length !== 1 ? 's' : ''} found{activeFilter === 'nearby' && loc.city ? ` near ${loc.city}` : ''}</>}
                  </p>
                  {fetchedAt && !loading && <LiveBadge time={fetchedAt} />}
                </div>
                <div className="max-w-md">
                  <LocationFilterBar activeFilter={activeFilter} onFilter={setActiveFilter}
                    loc={{ ...loc, nearbyCities: loc.nearbyCities }} onDetect={loc.detect} onCityChange={loc.setCity}
                    onRangeChange={loc.setRange} onClear={loc.clear}
                    resultCount={activeFilter !== 'all' ? filteredTrips.length : undefined} />
                </div>
              </div>
            )}

            {search.date && !exactDateMatch && !loading && filteredTrips.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                No travellers on {format(new Date(search.date), 'dd MMM')}. Showing other upcoming dates on this route.
              </div>
            )}

            {!hasSearched ? (
              <Card><EmptyState icon={Search} title="Search for travellers"
                body="Enter a pickup or destination city to see upcoming trips on that route." /></Card>
            ) : loading ? (
              <Card className="divide-y divide-slate-100"><RowSkeleton /><RowSkeleton /><RowSkeleton /></Card>
            ) : filteredTrips.length === 0 ? (
              <Card>
                <EmptyState icon={SearchX}
                  title={activeFilter === 'nearby' && loc.city ? `No travellers found near ${loc.city}` : 'No travellers on this route yet'}
                  body={activeFilter !== 'all' ? 'Try showing all results.' : 'Try another date or nearby city, or post a parcel request so travellers can find you.'}
                  actionLabel={activeFilter !== 'all' ? 'Show all results' : undefined}
                  onAction={() => setActiveFilter('all')} />
              </Card>
            ) : rows(filteredTrips)}
          </>
        )}

        {tab === 'mine' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Upcoming</h2>
              {futureMyTrips.length === 0 ? (
                <Card><EmptyState icon={Route} title="No upcoming trips"
                  body="Post a trip and senders on your route can request space in your luggage."
                  actionLabel="Post a trip" onAction={openPostTripModal} /></Card>
              ) : rows(futureMyTrips, t => ({
                showDelete: isOwner(t),
                onDelete: () => handleDelete(t._id),
                onEdit: isOwner(t) ? () => setEditingTrip(t) : undefined,
                onMarkFull: isOwner(t) ? () => handleMarkFull(t._id) : undefined,
              }))}
            </section>
            {pastMyTrips.length > 0 && (
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  Travel history <span className="text-[13px] font-normal text-slate-500">{pastMyTrips.length} past</span>
                </h2>
                {rows(pastMyTrips, () => ({ isPast: true }))}
              </section>
            )}
          </div>
        )}
        {modals}
      </div>
    );
  }

  // ── Mobile layout (Android app + phone browsers) ──
  return (
    <div className="relative px-4 pt-1 pb-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 transition-all duration-200"
        style={{ top: Math.max(0, pullDelta - 8), opacity: pullDelta / PULL_THRESHOLD }}>
        <div className="bg-white rounded-full border border-slate-200 px-3 py-1.5 flex items-center gap-2">
          <RefreshCw size={13} className={`text-kb-500 ${refreshing || pullDelta >= PULL_THRESHOLD ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold text-slate-600">{pullDelta >= PULL_THRESHOLD ? 'Refreshing…' : 'Pull to refresh'}</span>
        </div>
      </div>

      <ScreenHeader title="Travellers" back
        right={<button type="button" onClick={openPostTripModal} className={`${m.btnSmall} bg-kb-500 active:bg-kb-600 text-white`}><Plus size={15} /> Post trip</button>} />

      <Segmented value={tab} onChange={k => k === 'mine' ? authGate(() => setTab('mine')) : setTab(k)}
        items={[['all', 'Find travellers'], ['mine', 'My trips', user ? futureMyTrips.length : undefined]]} />

      {tab === 'all' && (
        <div className="mt-4 space-y-3">
          <MobileResultsSearch key={`${search.from}|${search.to}|${search.date}`} value={search} showDate
            submitLabel="Find travellers" onSubmit={next => setSearch(next)} />

          {hasSearched && (
            <LocationFilterBar activeFilter={activeFilter} onFilter={setActiveFilter}
              loc={{ ...loc, nearbyCities: loc.nearbyCities }} onDetect={loc.detect} onCityChange={loc.setCity}
              onRangeChange={loc.setRange} onClear={loc.clear}
              resultCount={activeFilter !== 'all' ? filteredTrips.length : undefined} />
          )}

          {!hasSearched ? (
            <div className={m.card}><EmptyState icon={Search} title="Search for travellers"
              body="Enter a pickup or destination city to see upcoming trips on that route." /></div>
          ) : loading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : filteredTrips.length === 0 ? (
            <div className={m.card}>
              <EmptyState icon={SearchX}
                title={activeFilter === 'nearby' && loc.city ? `No travellers near ${loc.city}` : 'No travellers on this route yet'}
                body={activeFilter !== 'all' ? 'Try showing all results.' : 'Try another date or nearby city, or post a parcel request so travellers can find you.'}
                actionLabel={activeFilter !== 'all' ? 'Show all results' : undefined}
                onAction={() => setActiveFilter('all')} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-slate-600"><span className="font-semibold text-slate-900">{filteredTrips.length}</span> traveller{filteredTrips.length !== 1 ? 's' : ''} found</p>
                {fetchedAt && <LiveBadge time={fetchedAt} />}
              </div>
              {search.date && !exactDateMatch && (
                <p className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[13px] text-amber-800">
                  No travellers on {format(new Date(search.date), 'd MMM')}. Showing other upcoming dates.
                </p>
              )}
              {filteredTrips.map(trip => <TripCard key={trip._id} trip={trip} />)}
            </>
          )}
        </div>
      )}

      {tab === 'mine' && (
        <div className="mt-4 space-y-3">
          {futureMyTrips.length === 0 ? (
            <div className={m.card}><EmptyState icon={Route} title="No upcoming trips"
              body="Post a trip and senders on your route can request space." actionLabel="Post a trip" onAction={openPostTripModal} /></div>
          ) : futureMyTrips.map(trip => (
            <TripCard key={trip._id} trip={trip}
              showDelete={isOwner(trip)}
              onDelete={() => handleDelete(trip._id)}
              onEdit={isOwner(trip) ? () => setEditingTrip(trip) : undefined}
              onMarkFull={isOwner(trip) ? () => handleMarkFull(trip._id) : undefined} />
          ))}
          {pastMyTrips.length > 0 && (
            <>
              <p className="pt-3 px-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History size={13} /> Travel history · {pastMyTrips.length}
              </p>
              {pastMyTrips.map(trip => <TripCard key={trip._id} trip={trip} isPast />)}
            </>
          )}
        </div>
      )}

      {modals}
    </div>
  );
}
