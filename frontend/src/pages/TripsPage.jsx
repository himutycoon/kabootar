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

const today = new Date().toISOString().split('T')[0];
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
    date: '',
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

  const clearFilter = (key) => setSearch(s => ({ ...s, [key]: '' }));
  const clearAll    = () => setSearch({ from: '', to: '', date: '' });

  const activeFilters = [
    search.from && { key: 'from', label: `From: ${search.from}` },
    search.to   && { key: 'to',   label: `To: ${search.to}` },
    search.date && { key: 'date', label: format(new Date(search.date), 'dd MMM') },
  ].filter(Boolean);

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

  const renderStaggered = (items, fn) =>
    items.map((item, i) => (
      <div key={item._id} style={{ animation: 'staggerIn 0.35s ease both', animationDelay: `${i * 55}ms` }}>
        {fn(item)}
      </div>
    ));

  return (
    <div className="px-4 py-5 relative"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

      {/* Pull-to-refresh indicator */}
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
          <h1 className="text-lg font-bold text-stone-900">Travellers</h1>
          {fetchedAt && !loading && <LiveBadge time={fetchedAt} />}
        </div>
        <button onClick={openPostTripModal}
          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-2 rounded-xl active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
          <Plus size={13} /> Post Trip
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
          resultCount={activeFilter !== 'all' ? filteredTrips.length : undefined}
        />
      </div>

      {/* Search row — From | To | Date | Search — all in one line */}
      <div className="mb-3 space-y-1.5">
        <div className="flex gap-1.5">
          <input className="input-field flex-1 text-xs py-2" placeholder="From" value={search.from}
            onChange={e => setSearch(s => ({ ...s, from: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchTrips()} />
          <input className="input-field flex-1 text-xs py-2" placeholder="To" value={search.to}
            onChange={e => setSearch(s => ({ ...s, to: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchTrips()} />
          <div className="relative shrink-0">
            <Calendar size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input type="date" className="input-field pl-6 text-xs py-2 w-28" min={today} value={search.date}
              onChange={e => setSearch(s => ({ ...s, date: e.target.value }))} />
          </div>
          <button onClick={fetchTrips} className="bg-orange-500 text-white px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all">
            <Search size={14} />
          </button>
          {activeFilters.length > 0 && (
            <button onClick={clearAll} className="px-2.5 py-2 rounded-xl bg-stone-100 text-stone-400 shrink-0 active:scale-95 transition-all">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {activeFilters.map(f => (
              <button key={f.key} onClick={() => clearFilter(f.key)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                {f.label} <X size={8} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs — compact */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-0.5 mb-3">
        <button onClick={() => setTab('all')}
          className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${tab === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          All Travellers
        </button>
        <button onClick={() => authGate(() => setTab('mine'))}
          className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${tab === 'mine' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          My Trips
        </button>
      </div>

      {/* All Travellers tab */}
      {tab === 'all' && (
        !hasSearched ? (
          <div className="card p-8 text-center animate-fade-in">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-stone-700 font-semibold text-sm mb-1">Search for Travellers</p>
            <p className="text-stone-400 text-xs leading-relaxed">
              Enter a From or To city above to find travellers on your route.
            </p>
          </div>
        ) : loading ? <TripSkeletons count={3} /> :
        filteredTrips.length === 0 ? (
          <div className="card p-8 text-center animate-fade-in">
            <div className="text-3xl mb-2">✈️</div>
            <p className="text-stone-600 text-sm font-semibold mb-1">
              {activeFilter === 'nearby' && loc.city
                ? `No travellers found near ${loc.city}`
                : 'No travellers found on this route'}
            </p>
            {activeFilter !== 'all' ? (
              <button onClick={() => setActiveFilter('all')} className="text-orange-500 text-xs font-semibold mt-1">
                Show all results
              </button>
            ) : (
              <p className="text-stone-400 text-xs mt-1">Try a different route or date</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {search.date && !exactDateMatch && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-1">
                <p className="text-xs text-amber-700 font-semibold">
                  No travellers on {format(new Date(search.date), 'dd MMM')} — showing other upcoming dates on this route
                </p>
              </div>
            )}
            <p className="text-xs text-stone-400">
              {filteredTrips.length} traveller{filteredTrips.length !== 1 ? 's' : ''} found
              {activeFilter === 'nearby' && loc.city ? ` near ${loc.city}` : ''}
            </p>
            {renderStaggered(filteredTrips, trip => <TripCard trip={trip} />)}
          </div>
        )
      )}

      {/* My Trips tab */}
      {tab === 'mine' && (
        loading ? <TripSkeletons count={2} /> : (
          <div className="space-y-4">
            {futureMyTrips.length === 0 ? (
              <div className="card p-6 text-center animate-fade-in">
                <div className="text-2xl mb-2">✈️</div>
                <p className="text-stone-600 text-sm font-semibold">No upcoming trips</p>
                <button onClick={openPostTripModal}
                  className="text-orange-500 text-xs font-semibold mt-2 block mx-auto">
                  + Post your first trip
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {renderStaggered(futureMyTrips, trip => (
                  <TripCard trip={trip}
                    showDelete={isOwner(trip)}
                    onDelete={() => handleDelete(trip._id)}
                    onEdit={isOwner(trip) ? () => setEditingTrip(trip) : undefined}
                    onMarkFull={isOwner(trip) ? () => handleMarkFull(trip._id) : undefined}
                  />
                ))}
              </div>
            )}

            {pastMyTrips.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History size={13} className="text-stone-400" />
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Travel History</span>
                  <div className="flex-1 h-px bg-stone-100" />
                  <span className="text-[11px] text-stone-400">{pastMyTrips.length} past</span>
                </div>
                <div className="space-y-2">
                  {renderStaggered(pastMyTrips, trip => <TripCard trip={trip} isPast />)}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {showModal && (
        <PostTripModal onClose={() => setShowModal(false)}
          onSuccess={trip => { setMyTrips(prev => [trip, ...prev]); setTrips(prev => [trip, ...prev]); setShowModal(false); }} />
      )}
      {editingTrip && (
        <PostTripModal initialData={editingTrip} tripId={editingTrip._id}
          onClose={() => setEditingTrip(null)} onSuccess={handleEditSuccess} />
      )}
    </div>
  );
}
