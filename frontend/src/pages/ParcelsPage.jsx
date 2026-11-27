import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import ParcelCard from '../components/ParcelCard';
import PostParcelModal from '../components/PostParcelModal';
import MatchesModal from '../components/MatchesModal';
import toast from 'react-hot-toast';
import LocationFilterBar from '../components/LocationFilterBar';
import { ParcelSkeletons } from '../components/SkeletonCard';
import { Plus, X, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { useLocationFilter } from '../hooks/useLocationFilter';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, Tabs, EmptyState, RowSkeleton } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import ResultsSearchBar from '../components/desktop/ResultsSearchBar';
import MobileResultsSearch from '../components/mobile/MobileResultsSearch';
import { ScreenHeader, Segmented, CardSkeleton } from '../components/mobile/ui';
import { m } from '../components/mobile/styles';
import { Package, SearchX } from 'lucide-react';
import { RouteAlertButton } from '../components/ProfileExtras';
import OfflineNotice from '../components/OfflineNotice';
import { saveCache, readCache, isOffline } from '../lib/offlineCache';

const PULL_THRESHOLD = 64;

function AlertStrip({ from, to }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
      <p className="flex-1 text-[13px] text-slate-600 min-w-0">Get notified when someone needs a parcel carried on <span className="font-semibold text-slate-900">{from} → {to}</span></p>
      <RouteAlertButton kind="parcels" fromCity={from} toCity={to} />
    </div>
  );
}

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

export default function ParcelsPage() {
  const { user }  = useAuth();
  const authGate  = useAuthGate();
  const loc       = useLocationFilter();
  const routerLoc = useLocation();

  const [parcels,     setParcels]     = useState([]);
  const [myParcels,   setMyParcels]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [fetchedAt,   setFetchedAt]   = useState(null);
  const [offlineAt,   setOfflineAt]   = useState(null);
  const [tab,         setTab]         = useState('all');
  const [showModal,    setShowModal]    = useState(false);
  const [matchParcel,  setMatchParcel]  = useState(null);
  const [editingParcel,setEditingParcel]= useState(null);
  const [search,      setSearch]      = useState({
    from: routerLoc.state?.from || '',
    to:   routerLoc.state?.to   || '',
  });
  const [activeFilter,setActiveFilter]= useState('all');

  const touchStartY  = useRef(0);
  const [pullDelta,  setPullDelta]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const hasSearched = !!(search.from || search.to);

  const fetchParcels = useCallback(async () => {
    if (!search.from && !search.to) {
      setParcels([]); setLoading(false); return;
    }
    setLoading(true);
    try {
      const params = {};
      if (search.from) params.from = search.from;
      if (search.to)   params.to   = search.to;
      const cacheKey = `parcels_${search.from}|${search.to}`.toLowerCase();
      try {
        const promises = [api.get('/parcels', { params })];
        if (user) promises.push(api.get('/parcels/my'));
        const [allRes, myRes] = await Promise.all(promises);
        setParcels(allRes.data.parcels);
        if (myRes) setMyParcels(myRes.data.parcels);
        setFetchedAt(Date.now());
        setOfflineAt(null);
        saveCache(cacheKey, allRes.data.parcels);
      } catch (err) {
        const cached = isOffline(err) ? readCache(cacheKey) : null;
        if (cached) { setParcels(cached.data || []); setOfflineAt(cached.at); }
        else toast.error(isOffline(err) ? "You're offline. Check your connection." : "Couldn't load parcel requests. Try again.");
      }
    } finally { setLoading(false); }
  }, [search.from, search.to, user]);

  useEffect(() => { fetchParcels(); }, [fetchParcels]);

  // "My Requests" must load even before any route search (fetchParcels exits early without one)
  useEffect(() => {
    if (!user) return;
    api.get('/parcels/my').then(r => setMyParcels(r.data.parcels || [])).catch(() => {});
  }, [user]);

  const isDesktopWeb = useDesktopWeb();

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e) => {
    if (window.scrollY > 4) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullDelta(Math.min(delta * 0.38, PULL_THRESHOLD + 20));
  };
  const onTouchEnd = async () => {
    if (pullDelta >= PULL_THRESHOLD) { setRefreshing(true); await fetchParcels(); setRefreshing(false); }
    setPullDelta(0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    await api.delete(`/parcels/${id}`);
    setMyParcels(prev => prev.filter(p => p._id !== id));
    setParcels(prev => prev.filter(p => p._id !== id));
  };

  // Apply client-side location + recent filter on top of server results
  const source = tab === 'all' ? parcels : myParcels;
  const filtered = useMemo(() => {
    let list = [...source];
    if (activeFilter === 'nearby' && loc.enabled) {
      list = list.filter(p => loc.matchesNearby(p.fromCity, p.toCity));
    } else if (activeFilter === 'recent') {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [source, activeFilter, loc.enabled, loc.nearbyCities, loc.city]); // eslint-disable-line


  const modals = (
    <>
      {showModal && (
        <PostParcelModal onClose={() => setShowModal(false)}
          onSuccess={p => { setMyParcels(prev => [p, ...prev]); setParcels(prev => [p, ...prev]); setShowModal(false); }} />
      )}
      {matchParcel && <MatchesModal parcel={matchParcel} onClose={() => setMatchParcel(null)} />}
      {editingParcel && (
        <PostParcelModal initialData={editingParcel} parcelId={editingParcel._id}
          onClose={() => setEditingParcel(null)}
          onSuccess={updated => {
            setParcels(prev => prev.map(p => p._id === updated._id ? updated : p));
            setMyParcels(prev => prev.map(p => p._id === updated._id ? updated : p));
            setEditingParcel(null);
            toast.success('Parcel request updated!');
          }} />
      )}
    </>
  );

  // ── Desktop browser layout (never used by the Android app) ──
  if (isDesktopWeb) {
    const showResults = tab === 'mine' || hasSearched;
    return (
      <div className="space-y-6">
        <PageHeader title="Parcels" sub="Open parcel requests from senders, and the requests you've posted."
          actions={<button type="button" onClick={() => authGate(() => setShowModal(true))} className={`${btn.primary} ${btn.lg}`}><Plus size={16} /> Send a parcel</button>} />

        <Tabs value={tab} onChange={k => k === 'mine' ? authGate(() => setTab('mine')) : setTab(k)}
          items={[{ k: 'all', label: 'Find parcels' }, { k: 'mine', label: 'My requests', count: user ? myParcels.length : undefined }]} />

        {tab === 'all' && (
          <ResultsSearchBar key={`${search.from}|${search.to}`} value={search}
            submitLabel="Find parcels" onSubmit={next => setSearch(next)} />
        )}

        {showResults && (
          <div className="flex items-start justify-between gap-6">
            <div className="pt-1.5">
              <p className="text-sm text-slate-600">
                {loading && tab === 'all' ? 'Searching…' : <><span className="font-semibold text-slate-900">{filtered.length}</span> request{filtered.length !== 1 ? 's' : ''}{tab === 'all' ? ' found' : ''}{activeFilter === 'nearby' && loc.city ? ` near ${loc.city}` : ''}</>}
              </p>
              {tab === 'all' && fetchedAt && !loading && <LiveBadge time={fetchedAt} />}
            </div>
            <div className="max-w-md">
              <LocationFilterBar activeFilter={activeFilter} onFilter={setActiveFilter}
                loc={{ ...loc, nearbyCities: loc.nearbyCities }} onDetect={loc.detect} onCityChange={loc.setCity}
                onRangeChange={loc.setRange} onClear={loc.clear}
                resultCount={activeFilter !== 'all' ? filtered.length : undefined} />
            </div>
          </div>
        )}

        {tab === 'all' && offlineAt && !loading && <OfflineNotice at={offlineAt} onRetry={fetchParcels} />}
        {tab === 'all' && hasSearched && !loading && search.from && search.to && <AlertStrip from={search.from} to={search.to} />}

        {!showResults ? (
          <Card><EmptyState icon={Search} title="Search parcel requests"
            body="Enter a pickup or destination city to see open requests you could carry on your trip." /></Card>
        ) : loading && tab === 'all' ? (
          <Card className="divide-y divide-slate-100"><RowSkeleton /><RowSkeleton /><RowSkeleton /></Card>
        ) : filtered.length === 0 ? (
          <Card>
            {tab === 'mine' ? (
              <EmptyState icon={Package} title="No parcel requests yet"
                body="Post a request with your route, item and weight, and travellers heading that way can reach you."
                actionLabel="Send a parcel" onAction={() => setShowModal(true)} />
            ) : (
              <EmptyState icon={SearchX}
                title={activeFilter === 'nearby' && loc.city ? `No parcels found near ${loc.city}` : 'No open requests on this route'}
                body={activeFilter !== 'all' ? 'Try showing all results.' : 'Try a nearby city, or check back later.'}
                actionLabel={activeFilter !== 'all' ? 'Show all results' : undefined}
                onAction={() => setActiveFilter('all')} />
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {filtered.map(parcel => (
              <ParcelCard key={parcel._id} parcel={parcel} variant="row"
                showDelete={tab === 'mine'}
                onDelete={() => handleDelete(parcel._id)}
                onFindMatch={() => authGate(() => setMatchParcel(parcel))}
                onEdit={tab === 'mine' ? () => setEditingParcel(parcel) : undefined} />
            ))}
          </Card>
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

      <ScreenHeader title="Parcels" back
        right={<button type="button" onClick={() => authGate(() => setShowModal(true))} className={`${m.btnSmall} bg-kb-500 active:bg-kb-600 text-white`}><Plus size={15} /> Send</button>} />

      <Segmented value={tab} onChange={k => k === 'mine' ? authGate(() => setTab('mine')) : setTab(k)}
        items={[['all', 'Find parcels'], ['mine', 'My requests', user ? myParcels.length : undefined]]} />

      <div className="mt-4 space-y-3">
        {tab === 'all' && (
          <MobileResultsSearch key={`${search.from}|${search.to}`} value={search}
            submitLabel="Find parcels" onSubmit={next => setSearch(next)} />
        )}

        {(tab === 'mine' || hasSearched) && (
          <LocationFilterBar activeFilter={activeFilter} onFilter={setActiveFilter}
            loc={{ ...loc, nearbyCities: loc.nearbyCities }} onDetect={loc.detect} onCityChange={loc.setCity}
            onRangeChange={loc.setRange} onClear={loc.clear}
            resultCount={activeFilter !== 'all' ? filtered.length : undefined} />
        )}

        {tab === 'all' && offlineAt && !loading && <OfflineNotice at={offlineAt} onRetry={fetchParcels} />}
        {tab === 'all' && hasSearched && !loading && search.from && search.to && <AlertStrip from={search.from} to={search.to} />}

        {tab === 'all' && !hasSearched ? (
          <div className={m.card}><EmptyState icon={Search} title="Search parcel requests"
            body="Enter a pickup or destination city to see requests you could carry on your trip." /></div>
        ) : loading && tab === 'all' ? (
          <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
        ) : filtered.length === 0 ? (
          <div className={m.card}>
            {tab === 'mine' ? (
              <EmptyState icon={Package} title="No parcel requests yet"
                body="Post a request and travellers heading your way can reach you." actionLabel="Send a parcel" onAction={() => setShowModal(true)} />
            ) : (
              <EmptyState icon={SearchX}
                title={activeFilter === 'nearby' && loc.city ? `No parcels near ${loc.city}` : 'No open requests on this route'}
                body={activeFilter !== 'all' ? 'Try showing all results.' : 'Try a nearby city, or check back later.'}
                actionLabel={activeFilter !== 'all' ? 'Show all results' : undefined}
                onAction={() => setActiveFilter('all')} />
            )}
          </div>
        ) : (
          <>
            {tab === 'all' && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-slate-600"><span className="font-semibold text-slate-900">{filtered.length}</span> request{filtered.length !== 1 ? 's' : ''} found</p>
                {fetchedAt && <LiveBadge time={fetchedAt} />}
              </div>
            )}
            {filtered.map(parcel => (
              <ParcelCard key={parcel._id} parcel={parcel}
                showDelete={tab === 'mine'}
                onDelete={() => handleDelete(parcel._id)}
                onFindMatch={() => authGate(() => setMatchParcel(parcel))}
                onEdit={tab === 'mine' ? () => setEditingParcel(parcel) : undefined} />
            ))}
          </>
        )}
      </div>

      {modals}
    </div>
  );
}
