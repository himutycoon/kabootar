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
import { Package, SearchX } from 'lucide-react';

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

export default function ParcelsPage() {
  const { user }  = useAuth();
  const authGate  = useAuthGate();
  const loc       = useLocationFilter();
  const routerLoc = useLocation();

  const [parcels,     setParcels]     = useState([]);
  const [myParcels,   setMyParcels]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [fetchedAt,   setFetchedAt]   = useState(null);
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
      const promises = [api.get('/parcels', { params })];
      if (user) promises.push(api.get('/parcels/my'));
      const [allRes, myRes] = await Promise.all(promises);
      setParcels(allRes.data.parcels);
      if (myRes) setMyParcels(myRes.data.parcels);
      setFetchedAt(Date.now());
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

  const renderStaggered = (items, fn) =>
    items.map((item, i) => (
      <div key={item._id} style={{ animation: 'staggerIn 0.35s ease both', animationDelay: `${i * 55}ms` }}>
        {fn(item)}
      </div>
    ));

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

  return (
    <div className="px-4 py-5 relative"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

      {/* Pull-to-refresh */}
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 transition-all duration-200"
        style={{ top: Math.max(0, pullDelta - 8), opacity: pullDelta / PULL_THRESHOLD }}>
        <div className="bg-white rounded-full shadow-md border border-stone-100 px-3 py-1.5 flex items-center gap-2">
          <RefreshCw size={13} className={`text-orange-500 ${refreshing || pullDelta >= PULL_THRESHOLD ? 'animate-spin' : ''}`}
            style={{ animationDuration: '0.7s' }} />
          <span className="text-xs font-semibold text-stone-600">
            {pullDelta >= PULL_THRESHOLD ? 'Refreshing…' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Header */}
      {/* ── Compact header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Parcels</h1>
          {fetchedAt && !loading && <LiveBadge time={fetchedAt} />}
        </div>
        <button onClick={() => authGate(() => setShowModal(true))}
          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-2 rounded-xl active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
          <Plus size={13} /> Send Parcel
        </button>
      </div>

      {/* Location filter chips — compact */}
      <div className="mb-2.5">
        <LocationFilterBar
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
          loc={{ ...loc, nearbyCities: loc.nearbyCities }}
          onDetect={loc.detect}
          onCityChange={loc.setCity}
          onRangeChange={loc.setRange}
          onClear={loc.clear}
          resultCount={activeFilter !== 'all' ? filtered.length : undefined}
        />
      </div>

      {/* Search row — compact */}
      <div className="flex gap-1.5 mb-3">
        <input className="input-field flex-1 text-xs py-2" placeholder="From" value={search.from}
          onChange={e => setSearch(s => ({ ...s, from: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && fetchParcels()} />
        <input className="input-field flex-1 text-xs py-2" placeholder="To" value={search.to}
          onChange={e => setSearch(s => ({ ...s, to: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && fetchParcels()} />
        <button onClick={fetchParcels} className="bg-orange-500 text-white px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all">
          <Search size={14} />
        </button>
        {(search.from || search.to) && (
          <button onClick={() => setSearch({ from: '', to: '' })} className="px-2.5 py-2 rounded-xl bg-stone-100 text-stone-400 shrink-0 active:scale-95 transition-all">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs — compact */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-0.5 mb-3">
        <button onClick={() => setTab('all')}
          className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${tab === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          All Requests
        </button>
        <button onClick={() => authGate(() => setTab('mine'))}
          className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${tab === 'mine' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          My Requests
        </button>
      </div>

      {tab === 'all' && !hasSearched ? (
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-stone-700 font-semibold text-sm mb-1">Search for Parcel Requests</p>
          <p className="text-stone-400 text-xs leading-relaxed">
            Enter a From or To city above to find open parcel requests on your route.
          </p>
        </div>
      ) : loading ? <ParcelSkeletons count={3} /> :
       filtered.length === 0 ? (
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-stone-600 text-sm font-semibold mb-1">
            {activeFilter === 'nearby' && loc.city
              ? `No parcels found near ${loc.city}`
              : tab === 'mine' ? 'No requests yet' : 'No parcel requests on this route'}
          </p>
          {activeFilter !== 'all' ? (
            <button onClick={() => setActiveFilter('all')} className="text-orange-500 text-xs font-semibold mt-1">
              Show all results
            </button>
          ) : tab !== 'mine' && (
            <p className="text-stone-400 text-xs mt-1">Try a different route</p>
          )}
        </div>
       ) : (
        <div className="space-y-2">
          {hasSearched && (
            <p className="text-xs text-stone-400">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''} found
              {activeFilter === 'nearby' && loc.city ? ` near ${loc.city}` : ''}
            </p>
          )}
          {renderStaggered(filtered, parcel => (
            <ParcelCard parcel={parcel}
              showDelete={tab === 'mine'}
              onDelete={() => handleDelete(parcel._id)}
              onFindMatch={() => authGate(() => setMatchParcel(parcel))}
              onEdit={tab === 'mine' ? () => setEditingParcel(parcel) : undefined}
            />
          ))}
        </div>
       )
      }

      {showModal && (
        <PostParcelModal onClose={() => setShowModal(false)}
          onSuccess={p => { setMyParcels(prev => [p, ...prev]); setParcels(prev => [p, ...prev]); setShowModal(false); }} />
      )}
      {matchParcel && <MatchesModal parcel={matchParcel} onClose={() => setMatchParcel(null)} />}

      {editingParcel && (
        <PostParcelModal
          initialData={editingParcel}
          parcelId={editingParcel._id}
          onClose={() => setEditingParcel(null)}
          onSuccess={updated => {
            setParcels(prev => prev.map(p => p._id === updated._id ? updated : p));
            setMyParcels(prev => prev.map(p => p._id === updated._id ? updated : p));
            setEditingParcel(null);
            toast.success('Parcel request updated!');
          }}
        />
      )}
    </div>
  );
}
