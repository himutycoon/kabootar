import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import TripCard from '../components/TripCard';
import ParcelCard from '../components/ParcelCard';
import { TripCardSkeleton, ParcelCardSkeleton } from '../components/SkeletonCard';
import { TrendingUp, Star, RefreshCw, ChevronRight, Users, Send, Package } from 'lucide-react';
import { useAuthGate } from '../hooks/useAuthGate';
import { useAuth } from '../context/AuthContext';
import PostTripModal from '../components/PostTripModal';
import PostParcelModal from '../components/PostParcelModal';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, SectionHeader, EmptyState, RowSkeleton, Avatar, RouteText } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { Route, BadgeCheck } from 'lucide-react';

function Section({ icon, title, cta, onCta, children, loading, skeletonCount = 2, skeletonType = 'trip' }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h2 className="font-bold text-stone-900 text-sm">{title}</h2>
        </div>
        {cta && (
          <button onClick={onCta} className="text-orange-500 text-xs font-semibold flex items-center gap-0.5">
            {cta} <ChevronRight size={13} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i}>
              {skeletonType === 'parcel'
                ? <ParcelCardSkeleton delay={i * 80} />
                : <TripCardSkeleton delay={i * 80} />}
            </div>
          ))}
        </div>
      ) : children}
    </section>
  );
}

export default function ExplorePage() {
  const navigate  = useNavigate();
  const authGate  = useAuthGate();
  const { user }  = useAuth();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTrip,   setShowTrip]   = useState(false);
  const [showParcel, setShowParcel] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/explore');
      setData(r.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const refresh = () => { setRefreshing(true); load(); };

  const stagger = (items, render) => items.map((item, i) => (
    <div key={item._id} style={{ animation: 'staggerIn 0.35s ease both', animationDelay: `${i * 55}ms` }}>
      {render(item)}
    </div>
  ));

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

  return (
    <div className="px-4 py-5 space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Explore</h1>
          <p className="text-xs text-stone-400 mt-0.5">Live marketplace — updated now</p>
        </div>
        <button onClick={refresh}
          className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center active:scale-90 transition-all">
          <RefreshCw size={15} className={`text-stone-500 ${refreshing ? 'animate-spin' : ''}`}
            style={{ animationDuration: '0.8s' }} />
        </button>
      </div>

      {/* ── POST ACTIONS ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => authGate(() => {
            if (user?.kycStatus !== 'verified') {
              import('react-hot-toast').then(({ default: t }) => t.error('KYC required to post trips'));
              setTimeout(() => navigate('/kyc'), 600);
              return;
            }
            setShowTrip(true);
          })}
          className="flex items-center gap-2.5 rounded-2xl px-4 py-3 active:scale-[0.97] transition-all text-left"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 3px 12px rgba(249,115,22,0.3)' }}>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Send size={15} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white">Post a Trip</p>
            <p className="text-[10px] text-orange-100">Earn by carrying</p>
          </div>
        </button>
        <button
          onClick={() => authGate(() => setShowParcel(true))}
          className="flex items-center gap-2.5 rounded-2xl px-4 py-3 active:scale-[0.97] transition-all text-left"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 3px 12px rgba(59,130,246,0.3)' }}>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Package size={15} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white">Send Parcel</p>
            <p className="text-[10px] text-blue-100">Find a traveller</p>
          </div>
        </button>
      </div>

      {/* Trending Routes */}
      <Section icon="🔥" title="Trending Routes" loading={false}>
        {loading ? (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[0,1,2,3].map(i => <div key={i} className="h-16 w-32 shrink-0 bg-stone-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (data?.trending?.length ?? 0) === 0 ? (
          <p className="text-stone-400 text-xs py-3 text-center bg-stone-50 rounded-xl">No active routes yet</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {data.trending.map((r, i) => (
              <button key={i}
                onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                className="shrink-0 bg-white border border-stone-100 rounded-2xl px-4 py-3 text-left shadow-sm active:scale-95 transition-all hover:border-orange-200"
                style={{ animation: 'staggerIn 0.3s ease both', animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={11} className="text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-500">#{i + 1}</span>
                </div>
                <div className="text-xs font-bold text-stone-900 whitespace-nowrap">{r.from} → {r.to}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{r.count} traveller{r.count !== 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Active Travellers */}
      <Section icon="✈️" title="Active Travellers"
        cta="Search" onCta={() => navigate('/trips')}
        loading={loading} skeletonCount={3} skeletonType="trip">
        {(data?.trips?.length ?? 0) === 0 ? (
          <div className="card p-6 text-center">
            <div className="text-2xl mb-2">✈️</div>
            <p className="text-stone-500 text-sm">No active trips right now</p>
            <button onClick={() => authGate(() => setShowTrip(true))}
              className="text-orange-500 text-xs font-semibold mt-2">+ Post your trip</button>
          </div>
        ) : (
          <div className="space-y-2">
            {stagger(data.trips.slice(0, 6), trip => <TripCard trip={trip} />)}
            {data.trips.length > 6 && (
              <button onClick={() => navigate('/trips')}
                className="w-full py-3 text-orange-500 text-sm font-semibold bg-orange-50 rounded-2xl border border-orange-100 active:scale-98 transition-all">
                See all {data.trips.length} travellers →
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Open Parcel Requests */}
      <Section icon="📦" title="Open Parcel Requests"
        cta="Search" onCta={() => navigate('/parcels')}
        loading={loading} skeletonCount={2} skeletonType="parcel">
        {(data?.parcels?.length ?? 0) === 0 ? (
          <div className="card p-6 text-center">
            <div className="text-2xl mb-2">📦</div>
            <p className="text-stone-500 text-sm">No open requests right now</p>
            <button onClick={() => authGate(() => setShowParcel(true))}
              className="text-orange-500 text-xs font-semibold mt-2">+ Post a request</button>
          </div>
        ) : (
          <div className="space-y-2">
            {stagger(data.parcels.slice(0, 5), parcel => <ParcelCard parcel={parcel} />)}
            {data.parcels.length > 5 && (
              <button onClick={() => navigate('/parcels')}
                className="w-full py-3 text-orange-500 text-sm font-semibold bg-orange-50 rounded-2xl border border-orange-100 active:scale-98 transition-all">
                See all {data.parcels.length} requests →
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Trusted Members */}
      {(data?.users?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-orange-500" />
            <h2 className="font-bold text-stone-900 text-sm">Trusted Members</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {data.users.map((u, i) => (
              <div key={u._id}
                className="shrink-0 bg-white border border-stone-100 rounded-2xl p-3 text-center shadow-sm"
                style={{ minWidth: 80, animation: 'staggerIn 0.35s ease both', animationDelay: `${i * 50}ms` }}>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-orange-100 mx-auto mb-2 flex items-center justify-center">
                  {u.profileImage
                    ? <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                    : <span className="text-orange-600 font-black text-lg">{u.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="text-[11px] font-bold text-stone-900 truncate max-w-[72px]">{u.name?.split(' ')[0]}</div>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <Star size={9} className="text-amber-400 fill-amber-400" />
                  <span className="text-[10px] text-stone-500 font-medium">{u.rating?.toFixed(1)}</span>
                </div>
                <div className="text-[9px] text-emerald-500 font-semibold mt-0.5">✓ KYC</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showTrip && (
        <PostTripModal onClose={() => setShowTrip(false)}
          onSuccess={() => { setShowTrip(false); load(); }} />
      )}
      {showParcel && (
        <PostParcelModal onClose={() => setShowParcel(false)}
          onSuccess={() => { setShowParcel(false); load(); }} />
      )}
    </div>
  );
}
