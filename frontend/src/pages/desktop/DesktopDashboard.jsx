import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Send, Package, ArrowRight, ShieldCheck, Star, TrainFront, Plane, Bus, Car,
  FileText, Smartphone, Shirt, Route, Boxes, BadgeCheck, MessageSquare, KeyRound,
  Flag, Megaphone, TrendingUp, RefreshCw, X, CircleUser,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthGate } from '../../hooks/useAuthGate';
import api from '../../lib/api';
import { getTripDates, formatTripDatesShort } from '../../lib/tripDates';
import PostTripModal from '../../components/PostTripModal';
import PostParcelModal from '../../components/PostParcelModal';
import RouteSearch from '../../components/desktop/RouteSearch';
import { PlayStoreBadge } from '../../components/desktop/BrandLogo';
import { Card, SectionHeader, Avatar, VerifiedBadge, Rating, EmptyState, RowSkeleton, RouteText } from '../../components/desktop/ui';

// ── helpers ──────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);
const nextDate = (trip) => getTripDates(trip).find(d => d >= startOfToday());

const MODE_ICON  = { train: TrainFront, flight: Plane, bus: Bus, car: Car };
const MODE_LABEL = { train: 'Train', flight: 'Flight', bus: 'Bus', car: 'Car' };
const ITEM_ICON  = { documents: FileText, electronics: Smartphone, clothes: Shirt, others: Package };
const ITEM_LABEL = { documents: 'Documents', electronics: 'Electronics', clothes: 'Clothes', others: 'Other items' };
const ACTIVE_PARCEL = (p) => !['completed', 'cancelled'].includes(p.status);

const profilePct = (user) => {
  const checks = [
    !!user?.name?.trim(),
    !!user?.phone && !user?.phone?.startsWith('google_'),
    !!user?.profileImage,
    !!user?.city?.trim(),
    !!user?.isPhoneVerified || user?.kycStatus === 'verified',
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

// ── rows ─────────────────────────────────────────────────────────────────────
function TravellerRow({ trip, onOpen }) {
  const u = trip.userId || {};
  const ModeIcon = MODE_ICON[trip.transportMode] || Route;
  return (
    <button type="button" onClick={onOpen}
      className="w-full grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] items-center gap-6 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
      <span className="flex items-center gap-3 min-w-0">
        <Avatar user={u} />
        <span className="min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate">{u.name || 'Traveller'}</span>
            {u.kycStatus === 'verified' && <VerifiedBadge />}
          </span>
          <span className="flex items-center gap-2 mt-0.5">
            <Rating user={u} />
            {u.tripsCompleted > 0 && <span className="text-xs text-slate-400">· {u.tripsCompleted} deliveries</span>}
          </span>
        </span>
      </span>
      <span className="min-w-0">
        <RouteText from={trip.fromCity} to={trip.toCity} className="text-sm font-semibold text-slate-900" />
        <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
          <ModeIcon size={13} /> {MODE_LABEL[trip.transportMode] || 'Trip'} · {formatTripDatesShort(trip)}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-slate-900">₹{trip.pricePerKg}<span className="text-slate-400 font-normal">/kg</span></span>
        <span className="block text-xs text-slate-500 mt-0.5">{trip.availableWeight} kg space</span>
      </span>
    </button>
  );
}

function ParcelRow({ parcel, onOpen }) {
  const Icon = ITEM_ICON[parcel.itemType] || Package;
  const sender = parcel.userId || {};
  return (
    <button type="button" onClick={onOpen}
      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
      <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Icon size={18} /></span>
      <span className="flex-1 min-w-0">
        <RouteText from={parcel.fromCity} to={parcel.toCity} className="text-sm font-semibold text-slate-900" />
        <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
          <span className="truncate">{ITEM_LABEL[parcel.itemType] || 'Parcel'} · {parcel.weight} kg · {sender.name || 'Sender'}</span>
          {sender.kycStatus === 'verified' && <BadgeCheck size={13} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
        </span>
      </span>
      <span className="text-right shrink-0">
        {parcel.offeredPrice
          ? <span className="block text-sm font-semibold text-slate-900">₹{parcel.offeredPrice}</span>
          : <span className="block text-xs text-slate-500">Price open</span>}
        <span className="block text-xs text-slate-400 mt-0.5">
          {parcel.createdAt ? formatDistanceToNow(new Date(parcel.createdAt), { addSuffix: true }) : ''}
        </span>
      </span>
    </button>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function DesktopDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const authGate = useAuthGate();

  const [feed, setFeed]           = useState({ trending: [], trips: [], parcels: [] });
  const [feedState, setFeedState] = useState('loading'); // loading | ready | error
  const [mine, setMine]           = useState({ trips: [], parcels: [], state: 'loading' });
  const [announcements, setAnnouncements] = useState([]);
  const [posts, setPosts]         = useState([]);
  const [story, setStory]         = useState(null);
  const [showTrip, setShowTrip]     = useState(false);
  const [showParcel, setShowParcel] = useState(false);

  const loadFeed = useCallback(() => {
    return api.get('/explore')
      .then(r => { setFeed({ trending: r.data.trending || [], trips: r.data.trips || [], parcels: r.data.parcels || [] }); setFeedState('ready'); })
      .catch(() => setFeedState('error'));
  }, []);

  useEffect(() => {
    loadFeed();
    api.get('/announcements').then(r => setAnnouncements(r.data.announcements || [])).catch(() => {});
    api.get('/posts').then(r => setPosts(r.data.posts || [])).catch(() => {});
  }, [loadFeed]);

  useEffect(() => {
    if (!user?._id) return;
    Promise.all([api.get('/trips/my'), api.get('/parcels/my')])
      .then(([t, p]) => setMine({ trips: t.data.trips || [], parcels: p.data.parcels || [], state: 'ready' }))
      .catch(() => setMine(m => ({ ...m, state: 'error' })));
  }, [user?._id]);

  // ── derived data (all from real API responses) ──
  const upcomingTrips = useMemo(() => mine.trips
    .filter(t => t.status === 'active' && nextDate(t))
    .sort((a, b) => nextDate(a) - nextDate(b)), [mine.trips]);
  const sending  = mine.parcels.filter(p => idOf(p.userId) === user?._id && ACTIVE_PARCEL(p));
  const carrying = mine.parcels.filter(p => idOf(p.travelerId) === user?._id && ACTIVE_PARCEL(p));

  const travellers = useMemo(() => {
    const others = feed.trips.filter(t => idOf(t.userId) !== user?._id);
    const city = user?.city?.trim().toLowerCase();
    if (!city) return others.slice(0, 5);
    const near = (t) => [t.fromCity, t.toCity].some(c => c?.toLowerCase().includes(city));
    return [...others.filter(near), ...others.filter(t => !near(t))].slice(0, 5);
  }, [feed.trips, user?._id, user?.city]);
  const parcels = feed.parcels.filter(p => idOf(p.userId) !== user?._id).slice(0, 5);

  const firstName = user?.name?.split(' ')[0];
  const pct = user ? profilePct(user) : 100;
  const kycVerified = user?.kycStatus === 'verified';

  const postTrip = () => authGate(() => {
    if (!kycVerified) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Verify your identity to post trips'));
      setTimeout(() => navigate('/kyc'), 600);
      return;
    }
    setShowTrip(true);
  });
  const sendParcel = () => authGate(() => setShowParcel(true));

  const KYC_CARD = {
    verified: { value: 'Verified',     hint: 'You can post trips',              tone: 'text-emerald-700' },
    pending:  { value: 'Under review', hint: 'Documents submitted for review',  tone: 'text-amber-700' },
    rejected: { value: 'Not approved', hint: user?.kycRejectedReason || 'Re-upload your documents', tone: 'text-red-700' },
  }[user?.kycStatus] || { value: 'Not verified', hint: 'Required before posting trips', tone: 'text-slate-900' };

  const next = upcomingTrips[0];

  return (
    <div className="space-y-8">
      {/* ── Welcome + quick actions ── */}
      <section className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900">
            {user ? `${greeting()}, ${firstName || 'there'}` : 'Welcome to Kabutar'}
          </h1>
          <p className="text-[15px] text-slate-500 mt-1">
            {user ? 'Where are you travelling next?' : 'Send parcels with travellers already heading your way.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button type="button" onClick={sendParcel}
            className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 flex items-center gap-2 transition-colors">
            <Package size={17} /> Send a parcel
          </button>
          <button type="button" onClick={postTrip}
            className="h-11 px-4 rounded-xl bg-kb-500 hover:bg-kb-600 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
            <Send size={16} /> I'm travelling
          </button>
        </div>
      </section>

      {/* ── Search ── */}
      <Card className="p-5">
        <RouteSearch variant="panel" />
      </Card>

      {/* ── Summary (signed-in only, real numbers only) ── */}
      {user && (
        <section className="grid grid-cols-4 gap-4" aria-label="Your summary">
          <SummaryCard label="Upcoming trips" icon={Route}
            value={mine.state === 'loading' ? '—' : upcomingTrips.length}
            hint={next ? `Next: ${next.fromCity} → ${next.toCity}` : 'No trips planned'}
            onClick={() => navigate('/trips', { state: { tab: 'mine' } })} />
          <SummaryCard label="Active parcels" icon={Boxes}
            value={mine.state === 'loading' ? '—' : sending.length + carrying.length}
            hint={`${sending.length} sending · ${carrying.length} carrying`}
            onClick={() => navigate('/my-parcels')} />
          <SummaryCard label="Completed deliveries" icon={Star}
            value={user.tripsCompleted || 0}
            hint={user.totalRatings ? `${Number(user.rating).toFixed(1)} rating · ${user.totalRatings} review${user.totalRatings === 1 ? '' : 's'}` : 'No reviews yet'}
            onClick={() => navigate('/profile')} />
          <SummaryCard label="Identity verification" icon={ShieldCheck}
            value={KYC_CARD.value} valueClass={KYC_CARD.tone} hint={KYC_CARD.hint}
            onClick={() => navigate('/kyc')} />
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        {/* ── Main column ── */}
        <div className="space-y-8 min-w-0">
          {user && (
            <section>
              <SectionHeader title="Your upcoming trips" actionLabel="All trips"
                onAction={() => navigate('/trips', { state: { tab: 'mine' } })} />
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {mine.state === 'loading' ? <><RowSkeleton /><RowSkeleton /></> :
                 mine.state === 'error' ? <EmptyState icon={RefreshCw} title="Couldn't load your trips" body="Check your connection and refresh the page." /> :
                 upcomingTrips.length === 0 ? (
                  <EmptyState icon={Route} title="No upcoming trips"
                    body="Travelling soon? Post your trip and senders on your route can request space."
                    actionLabel="Post a trip" onAction={postTrip} />
                 ) : upcomingTrips.slice(0, 3).map(t => {
                  const ModeIcon = MODE_ICON[t.transportMode] || Route;
                  return (
                    <div key={t._id} className="flex items-center gap-4 px-5 py-4">
                      <span className="w-10 h-10 rounded-xl bg-kb-50 text-kb-600 flex items-center justify-center shrink-0"><ModeIcon size={18} /></span>
                      <span className="flex-1 min-w-0">
                        <RouteText from={t.fromCity} to={t.toCity} className="text-sm font-semibold text-slate-900" />
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {MODE_LABEL[t.transportMode]} · {formatTripDatesShort(t)} · {t.availableWeight} kg at ₹{t.pricePerKg}/kg
                        </span>
                      </span>
                      <button type="button" onClick={() => navigate('/parcels', { state: { from: t.fromCity, to: t.toCity } })}
                        className="h-9 px-3.5 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        Find parcels
                      </button>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          <section>
            <SectionHeader title="Recommended travellers"
              sub={user?.city ? `Upcoming trips, with routes through ${user.city} first` : 'Upcoming trips recently posted by travellers'}
              actionLabel="Explore" onAction={() => navigate('/explore')} />
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {feedState === 'loading' ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /></> :
               feedState === 'error' ? (
                <EmptyState icon={RefreshCw} title="Couldn't load travellers" body="The server may be waking up. Try again in a moment."
                  actionLabel="Retry" onAction={() => { setFeedState('loading'); loadFeed(); }} />
               ) : travellers.length === 0 ? (
                <EmptyState icon={CircleUser} title="No upcoming trips yet"
                  body="Search your route above, or post a parcel request so travellers can find you."
                  actionLabel="Send a parcel" onAction={sendParcel} />
               ) : travellers.map(t => (
                <TravellerRow key={t._id} trip={t}
                  onOpen={() => navigate('/trips', { state: { from: t.fromCity, to: t.toCity } })} />
              ))}
            </Card>
          </section>

          <section>
            <SectionHeader title="Recent parcel requests" sub="Open requests from senders in the last 30 days"
              actionLabel="View all" onAction={() => navigate('/explore')} />
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {feedState === 'loading' ? <><RowSkeleton /><RowSkeleton /></> :
               feedState === 'error' ? <EmptyState icon={RefreshCw} title="Couldn't load parcel requests" /> :
               parcels.length === 0 ? (
                <EmptyState icon={Package} title="No open parcel requests"
                  body="When senders post parcels, they'll show up here." />
               ) : parcels.map(p => (
                <ParcelRow key={p._id} parcel={p}
                  onOpen={() => navigate('/parcels', { state: { from: p.fromCity, to: p.toCity } })} />
              ))}
            </Card>
          </section>

          {posts.length > 0 && (
            <section>
              <SectionHeader title="Community activity" sub="Stories and tips from the Kabutar community" />
              <div className="grid grid-cols-3 gap-4">
                {posts.slice(0, 3).map(post => (
                  <button key={post._id} type="button" onClick={() => setStory(post)}
                    className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors">
                    {post.image
                      ? <img src={post.image} alt="" className="w-full h-32 object-cover" loading="lazy" />
                      : <span className="w-full h-32 bg-kb-50 flex items-center justify-center text-4xl" aria-hidden="true">{post.emoji}</span>}
                    <span className="block p-4">
                      <span className="text-sm font-semibold text-slate-900 line-clamp-2">{post.title}</span>
                      {post.content && <span className="text-[13px] text-slate-500 mt-1 line-clamp-3">{post.content}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-5 sticky top-24">
          {user && pct < 100 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Complete your profile</p>
                <span className="text-xs font-semibold text-slate-500">{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-kb-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[13px] text-slate-500 mt-3">A photo and home city help people decide to trust you.</p>
              <button type="button" onClick={() => navigate(user.isProfileComplete ? '/profile' : '/complete-profile')}
                className="mt-3 text-[13px] font-semibold text-kb-600 hover:text-kb-700 flex items-center gap-1">
                Finish profile <ArrowRight size={14} />
              </button>
            </Card>
          )}

          <Card>
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-kb-500" />
              <h3 className="text-sm font-semibold text-slate-900">Trending routes</h3>
            </div>
            {feedState === 'loading' ? <div className="px-5 pb-4 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />)}</div> :
             feed.trending.length === 0 ? <p className="px-5 pb-5 text-[13px] text-slate-500">No upcoming trips posted yet.</p> : (
              <ul className="pb-2">
                {feed.trending.slice(0, 6).map(r => (
                  <li key={`${r.from}-${r.to}`}>
                    <button type="button" onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                      className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-slate-50 transition-colors">
                      <RouteText from={r.from} to={r.to} className="text-sm font-medium text-slate-800" />
                      <span className="text-xs text-slate-500 shrink-0">{r.count} trip{r.count === 1 ? '' : 's'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">How Kabutar keeps handovers safe</h3>
            <ul className="mt-3.5 space-y-3">
              {[
                [ShieldCheck,   'Travellers verify their ID before they can post trips'],
                [KeyRound,      'Handovers are confirmed with photos and one-time codes'],
                [MessageSquare, 'Chat in the app before you meet'],
                [Star,          'Reviews come only from completed deliveries'],
                [Flag,          'Report or block anyone from their profile'],
              ].map(([icon, text]) => (
                <li key={text} className="flex gap-2.5 text-[13px] text-slate-600 leading-snug">
                  {createElement(icon, { size: 15, className: 'text-slate-400 mt-0.5 shrink-0' })} {text}
                </li>
              ))}
            </ul>
            {user && !kycVerified && (
              <button type="button" onClick={() => navigate('/kyc')}
                className="mt-4 w-full h-9 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors">
                Verify your identity
              </button>
            )}
          </Card>

          {announcements.length > 0 && (
            <Card>
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Updates</h3>
                <button type="button" onClick={() => navigate('/notifications')} className="text-xs font-semibold text-slate-500 hover:text-slate-900">See all</button>
              </div>
              <ul className="pb-2">
                {announcements.slice(0, 3).map(a => (
                  <li key={a._id} className="flex gap-3 px-5 py-2.5">
                    <Megaphone size={15} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-900">{a.title}</span>
                      <span className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">Kabutar on Android</h3>
            <p className="text-[13px] text-slate-500 mt-1">Get trip and parcel alerts on your phone.</p>
            <PlayStoreBadge height={52} className="mt-2" />
          </Card>
        </aside>
      </div>

      {/* ── Community story dialog ── */}
      {story && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setStory(null)} role="dialog" aria-modal="true" aria-label={story.title}>
          <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {story.image && <img src={story.image} alt="" className="w-full max-h-64 object-cover" />}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">{story.title}</h2>
                <button type="button" onClick={() => setStory(null)} aria-label="Close"
                  className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"><X size={18} /></button>
              </div>
              {story.stats && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {[story.stats.route, story.stats.time, story.stats.saved].filter(Boolean).map(s => (
                    <span key={s} className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600">{s}</span>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed mt-4 whitespace-pre-line">{story.content}</p>
            </div>
          </div>
        </div>
      )}

      {showTrip && (
        <PostTripModal onClose={() => setShowTrip(false)}
          onSuccess={trip => { setMine(m => ({ ...m, trips: [trip, ...m.trips] })); setShowTrip(false); }} />
      )}
      {showParcel && (
        <PostParcelModal onClose={() => setShowParcel(false)}
          onSuccess={parcel => { setMine(m => ({ ...m, parcels: [parcel, ...m.parcels] })); setShowParcel(false); }} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint, icon, onClick, valueClass = 'text-slate-900' }) {
  const Icon = icon;
  return (
    <button type="button" onClick={onClick}
      className="text-left bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-slate-300 transition-colors">
      <span className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <Icon size={16} className="text-slate-400" />
      </span>
      <span className={`block text-2xl font-semibold tracking-[-0.02em] mt-2 ${valueClass}`}>{value}</span>
      <span className="block text-xs text-slate-500 mt-1 truncate">{hint}</span>
    </button>
  );
}
