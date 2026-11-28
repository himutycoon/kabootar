import { saveCache, readCache } from '../../lib/offlineCache';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Send, Package, ShieldCheck, ChevronRight, TrainFront, Plane, Bus, Car, Route,
  FileText, Smartphone, Shirt, BadgeCheck, Star, Megaphone, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthGate } from '../../hooks/useAuthGate';
import api from '../../lib/api';
import { getTripDates, formatTripDatesShort } from '../../lib/tripDates';
import PostTripModal from '../../components/PostTripModal';
import PostParcelModal from '../../components/PostParcelModal';
import MobileRouteSearch from '../../components/mobile/MobileRouteSearch';
import { SectionTitle, Sheet, ErrorState } from '../../components/mobile/ui';
import { m } from '../../components/mobile/styles';
import { Avatar, RouteText } from '../../components/desktop/ui';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);
const nextDate = (trip) => getTripDates(trip).find(d => d >= startOfToday());
const MODE_ICON = { train: TrainFront, flight: Plane, bus: Bus, car: Car };
const MODE_LABEL = { train: 'Train', flight: 'Flight', bus: 'Bus', car: 'Car' };
const ITEM_ICON = { documents: FileText, electronics: Smartphone, clothes: Shirt, others: Package };
const ITEM_LABEL = { documents: 'Documents', electronics: 'Electronics', clothes: 'Clothes', others: 'Other items' };

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

export default function MobileHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const authGate = useAuthGate();

  // Last-seen data shows instantly on open; fresh data replaces it a moment later
  const [saved] = useState(() => ({ feed: readCache('explore'), ann: readCache('announcements'), posts: readCache('posts'), mine: readCache('trips_mine') }));
  const [feed, setFeed] = useState(() => saved.feed ? { trending: saved.feed.data.trending || [], trips: saved.feed.data.trips || [], parcels: saved.feed.data.parcels || [] } : { trending: [], trips: [], parcels: [] });
  const [feedState, setFeedState] = useState(saved.feed ? 'ready' : 'loading');
  const [myTrips, setMyTrips] = useState(() => saved.mine?.data || []);
  const [announcements, setAnnouncements] = useState(() => saved.ann?.data || []);
  const [posts, setPosts] = useState(() => saved.posts?.data || []);
  const [story, setStory] = useState(null);
  const [showTrip, setShowTrip] = useState(false);
  const [showParcel, setShowParcel] = useState(false);

  const loadFeed = useCallback(() => api.get('/explore')
    .then(r => { setFeed({ trending: r.data.trending || [], trips: r.data.trips || [], parcels: r.data.parcels || [] }); setFeedState('ready'); saveCache('explore', r.data); })
    .catch(() => setFeedState(s => (s === 'ready' ? s : 'error'))), []);

  useEffect(() => {
    loadFeed();
    api.get('/announcements').then(r => { setAnnouncements(r.data.announcements || []); saveCache('announcements', r.data.announcements || []); }).catch(() => {});
    api.get('/posts').then(r => { setPosts(r.data.posts || []); saveCache('posts', r.data.posts || []); }).catch(() => {});
  }, [loadFeed]);

  useEffect(() => {
    if (!user?._id) return;
    api.get('/trips/my').then(r => { setMyTrips(r.data.trips || []); saveCache('trips_mine', r.data.trips || []); }).catch(() => {});
  }, [user?._id]);

  const upcoming = useMemo(() => myTrips
    .filter(t => t.status === 'active' && nextDate(t))
    .sort((a, b) => nextDate(a) - nextDate(b)), [myTrips]);
  const travellers = useMemo(() => {
    const others = feed.trips.filter(t => idOf(t.userId) !== user?._id);
    const city = user?.city?.trim().toLowerCase();
    if (!city) return others.slice(0, 6);
    const near = (t) => [t.fromCity, t.toCity].some(c => c?.toLowerCase().includes(city));
    return [...others.filter(near), ...others.filter(t => !near(t))].slice(0, 6);
  }, [feed.trips, user?._id, user?.city]);
  const parcels = feed.parcels.filter(p => idOf(p.userId) !== user?._id).slice(0, 3);

  const firstName = user?.name?.split(' ')[0];
  const pct = user ? profilePct(user) : 100;
  const kyc = user?.kycStatus;

  const postTrip = () => authGate(() => {
    if (kyc !== 'verified') {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Verify your identity to post trips'));
      setTimeout(() => navigate('/kyc'), 600);
      return;
    }
    setShowTrip(true);
  });
  const sendParcel = () => authGate(() => setShowParcel(true));

  return (
    <div className="px-4 pt-5 pb-4 space-y-7">
      {/* Greeting */}
      <section>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
          {user ? `${greeting()}, ${firstName || 'there'}` : 'Welcome to Kabutar'}
        </h1>
        <p className="text-[15px] text-slate-500 mt-0.5">
          {user ? 'Where are you heading today?' : 'Send parcels with travellers already going your way.'}
        </p>
      </section>

      <MobileRouteSearch />

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <button type="button" onClick={postTrip} className={`${m.card} p-4 text-left active:bg-slate-50`}>
          <span className="w-10 h-10 rounded-xl bg-kb-500 text-white flex items-center justify-center"><Send size={18} /></span>
          <span className="block mt-3 text-[15px] font-semibold text-slate-900">I'm travelling</span>
          <span className="block text-[13px] text-slate-500 mt-0.5 leading-snug">Post a trip and earn on your journey</span>
        </button>
        <button type="button" onClick={sendParcel} className={`${m.card} p-4 text-left active:bg-slate-50`}>
          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Package size={18} /></span>
          <span className="block mt-3 text-[15px] font-semibold text-slate-900">Send a parcel</span>
          <span className="block text-[13px] text-slate-500 mt-0.5 leading-snug">Find a traveller going your way</span>
        </button>
      </section>

      {/* Account nudges (real status only) */}
      {user && (kyc !== 'verified' || pct < 100) && (
        <section className="space-y-2">
          {kyc !== 'verified' && (
            <button type="button" onClick={() => navigate('/kyc')} className={`${m.card} w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50`}>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kyc === 'pending' ? 'bg-amber-50 text-amber-600' : kyc === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-kb-50 text-kb-600'}`}>
                <ShieldCheck size={19} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-slate-900">
                  {kyc === 'pending' ? 'Verification under review' : kyc === 'rejected' ? 'Verification needs attention' : 'Verify your identity'}
                </span>
                <span className="block text-[13px] text-slate-500">
                  {kyc === 'pending' ? 'We’ll notify you when it’s reviewed' : kyc === 'rejected' ? 'Re-upload your documents' : 'Required before you can post trips'}
                </span>
              </span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          )}
          {pct < 100 && (
            <button type="button" onClick={() => navigate(user.isProfileComplete ? '/profile' : '/complete-profile')}
              className={`${m.card} w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50`}>
              <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><UserRound size={19} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-slate-900">Complete your profile</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><span className="block h-full bg-kb-500 rounded-full" style={{ width: `${pct}%` }} /></span>
                  <span className="text-xs font-semibold text-slate-500">{pct}%</span>
                </span>
              </span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          )}
        </section>
      )}

      {/* Your upcoming trips */}
      {user && upcoming.length > 0 && (
        <section>
          <SectionTitle title="Your upcoming trips" action="See all" onAction={() => navigate('/trips', { state: { tab: 'mine' } })} />
          <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
            {upcoming.slice(0, 2).map(t => {
              const ModeIcon = MODE_ICON[t.transportMode] || Route;
              return (
                <button key={t._id} type="button" onClick={() => navigate('/parcels', { state: { from: t.fromCity, to: t.toCity } })}
                  className={`w-full flex items-center gap-3 p-3.5 text-left ${m.press}`}>
                  <span className="w-10 h-10 rounded-xl bg-kb-50 text-kb-600 flex items-center justify-center shrink-0"><ModeIcon size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <RouteText from={t.fromCity} to={t.toCity} className="text-[15px] font-semibold text-slate-900 max-w-full" />
                    <span className="block text-[13px] text-slate-500">{formatTripDatesShort(t)} · {t.availableWeight} kg · Find parcels</span>
                  </span>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended travellers */}
      <section>
        <SectionTitle title="Recommended travellers" sub={user?.city ? `Routes through ${user.city} first` : 'Upcoming trips on Kabutar'}
          action="Explore" onAction={() => navigate('/explore')} />
        {feedState === 'loading' ? (
          <div className="flex gap-3 overflow-hidden">{[0, 1].map(i => <div key={i} className="w-[260px] h-[150px] shrink-0 bg-white border border-slate-200 rounded-2xl animate-pulse" />)}</div>
        ) : feedState === 'error' ? (
          <div className={m.card}><ErrorState onRetry={() => { setFeedState('loading'); loadFeed(); }} /></div>
        ) : travellers.length === 0 ? (
          <div className={`${m.card} p-5 text-center`}>
            <p className="text-[15px] font-semibold text-slate-900">No upcoming trips yet</p>
            <p className="text-[13px] text-slate-500 mt-1">Post a parcel request so travellers can find you.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {travellers.map(t => {
              const u = t.userId || {};
              const ModeIcon = MODE_ICON[t.transportMode] || Route;
              return (
                <button key={t._id} type="button" onClick={() => navigate('/trips', { state: { from: t.fromCity, to: t.toCity } })}
                  className={`${m.card} w-[264px] shrink-0 snap-start p-4 text-left active:bg-slate-50`}>
                  <span className="flex items-center gap-2.5">
                    <Avatar user={u} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold text-slate-900 truncate">{u.name || 'Traveller'}</span>
                        {u.kycStatus === 'verified' && <BadgeCheck size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        {u.totalRatings > 0
                          ? <><Star size={11} className="fill-amber-400 text-amber-400" /> {Number(u.rating).toFixed(1)} ({u.totalRatings})</>
                          : 'No reviews yet'}
                      </span>
                    </span>
                  </span>
                  <RouteText from={t.fromCity} to={t.toCity} className="mt-3.5 text-[15px] font-semibold text-slate-900 max-w-full" />
                  <span className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-1">
                    <ModeIcon size={14} /> {MODE_LABEL[t.transportMode]} · {formatTripDatesShort(t)}
                  </span>
                  <span className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[13px]">
                    <span className="text-slate-500">{t.availableWeight} kg space</span>
                    <span className="font-semibold text-slate-900">₹{t.pricePerKg}/kg</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Trending routes */}
      {feed.trending.length > 0 && (
        <section>
          <SectionTitle title="Trending routes" />
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {feed.trending.map(r => (
              <button key={`${r.from}-${r.to}`} type="button" onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                className="shrink-0 h-10 px-3.5 rounded-full bg-white border border-slate-200 flex items-center gap-2 text-[13px] font-semibold text-slate-800 active:bg-slate-50">
                {r.from} <span className="text-slate-400">→</span> {r.to}
                <span className="text-xs font-medium text-slate-400">{r.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent parcel requests */}
      {feedState === 'ready' && parcels.length > 0 && (
        <section>
          <SectionTitle title="Recent parcel requests" action="See all" onAction={() => navigate('/explore', { state: { tab: 'parcels' } })} />
          <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
            {parcels.map(p => {
              const Icon = ITEM_ICON[p.itemType] || Package;
              return (
                <button key={p._id} type="button" onClick={() => navigate('/parcels', { state: { from: p.fromCity, to: p.toCity } })}
                  className={`w-full flex items-center gap-3 p-3.5 text-left ${m.press}`}>
                  <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Icon size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <RouteText from={p.fromCity} to={p.toCity} className="text-[15px] font-semibold text-slate-900 max-w-full" />
                    <span className="block text-[13px] text-slate-500 truncate">
                      {ITEM_LABEL[p.itemType] || 'Parcel'} · {p.weight} kg · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Community updates */}
      {(announcements.length > 0 || posts.length > 0) && (
        <section>
          <SectionTitle title="Community" action={announcements.length > 0 ? 'All updates' : undefined} onAction={() => navigate('/notifications')} />
          <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
            {announcements.slice(0, 2).map(a => (
              <div key={a._id} className="flex gap-3 p-3.5">
                <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Megaphone size={17} /></span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-slate-900">{a.title}</span>
                  <span className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{a.body}</span>
                </span>
              </div>
            ))}
            {posts.slice(0, 2).map(p => (
              <button key={p._id} type="button" onClick={() => setStory(p)} className={`w-full flex gap-3 p-3.5 text-left ${m.press}`}>
                {p.image
                  ? <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" loading="lazy" />
                  : <span className="w-10 h-10 rounded-xl bg-kb-50 flex items-center justify-center shrink-0 text-lg" aria-hidden="true">{p.emoji}</span>}
                <span className="min-w-0">
                  <span className="text-[14px] font-semibold text-slate-900 line-clamp-1">{p.title}</span>
                  <span className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{p.content}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {story && (
        <Sheet title={story.title} onClose={() => setStory(null)}>
          {story.image && <img src={story.image} alt="" className="w-full max-h-56 object-cover rounded-xl mb-4" />}
          <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line">{story.content}</p>
        </Sheet>
      )}
      {showTrip && (
        <PostTripModal onClose={() => setShowTrip(false)}
          onSuccess={trip => { setMyTrips(prev => [trip, ...prev]); setShowTrip(false); }} />
      )}
      {showParcel && (
        <PostParcelModal onClose={() => setShowParcel(false)} onSuccess={() => { setShowParcel(false); loadFeed(); }} />
      )}
    </div>
  );
}
