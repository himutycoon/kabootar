import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import api from '../lib/api';
import PostTripModal from '../components/PostTripModal';
import PostParcelModal from '../components/PostParcelModal';
import { POPULAR_CITIES } from '../lib/cityCoords';
import {
  Send, Package, ArrowRight, ChevronRight,
  TrendingUp, Megaphone, Compass, Search, Calendar,
  X, ArrowLeftRight, MapPin, Sparkles,
} from 'lucide-react';
import PostCard from '../components/PostCard';
import DesktopDashboard from './desktop/DesktopDashboard';
import { useDesktopWeb } from '../hooks/useDesktopWeb';

const today = new Date().toISOString().split('T')[0];

const HERO_PHRASES = [
  'Ship smarter with Kabutar',
  'Earn while you travel',
  'Connect · Carry · Earn',
  'Your trusted travel network',
  'Same route, shared journey',
];

const LOGGED_IN_PHRASES = [
  'Where are you headed today?',
  'Ready for your next trip?',
  'Find a traveller on your route',
  'Deliver something special today',
];

function CountUp({ value }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  const ref  = useRef(null);
  useEffect(() => {
    const target = parseInt(value) || 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return;
      done.current = true;
      let step = 0; const steps = 25;
      const iv = setInterval(() => {
        step++;
        setN(Math.round(target * (step / steps)));
        if (step >= steps) clearInterval(iv);
      }, 500 / steps);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{n}</span>;
}

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
};

const calcPct = (user) => {
  const checks = [
    !!user?.name?.trim(),
    !!user?.phone && !user?.phone?.startsWith('google_'),
    !!user?.profileImage,
    !!user?.city?.trim(),
    !!user?.isPhoneVerified || user?.kycStatus === 'verified',
  ];
  return Math.round((checks.filter(Boolean).length / 5) * 100);
};

const ANNOUNCE_STYLE = {
  info:    'border-stone-100 bg-white',
  warning: 'border-amber-200 bg-amber-50',
  alert:   'border-red-200   bg-red-50',
  feature: 'border-orange-200 bg-orange-50',
};

// Desktop browsers get the redesigned dashboard; the Android app and phone
// browsers keep the original mobile dashboard below, unchanged.
export default function Dashboard() {
  const isDesktopWeb = useDesktopWeb();
  return isDesktopWeb ? <DesktopDashboard /> : <MobileDashboard />;
}

function MobileDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const authGate  = useAuthGate();

  const [searchType,    setSearchType]    = useState('trips');
  const [phraseIdx,     setPhraseIdx]     = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const [heroSearch,    setHeroSearch]    = useState({ from: '', to: '', date: '' });
  const [fromSuggs,     setFromSuggs]     = useState([]);
  const [toSuggs,       setToSuggs]       = useState([]);
  const [showFrom,      setShowFrom]      = useState(false);
  const [showTo,        setShowTo]        = useState(false);
  const fromRef = useRef(null);
  const toRef   = useRef(null);
  const [stats,         setStats]         = useState({ activeTrips: null, activeRoutes: null, verifiedUsers: null });
  const [trending,      setTrending]      = useState([]);
  const [loadingTrend,  setLoadingTrend]  = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [posts,         setPosts]         = useState([]);
  const [activeStory,   setActiveStory]   = useState(null);
  const [myTrips,       setMyTrips]       = useState([]);
  const [myParcels,     setMyParcels]     = useState([]);
  const [showTripModal,   setShowTripModal]   = useState(false);
  const [showParcelModal, setShowParcelModal] = useState(false);

  // Cycle through hero phrases
  useEffect(() => {
    const phrases = user ? LOGGED_IN_PHRASES : HERO_PHRASES;
    const iv = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % phrases.length);
        setPhraseVisible(true);
      }, 350);
    }, 3000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    api.get('/trips/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/trips/trending').then(r => setTrending(r.data.routes || [])).catch(() => {}).finally(() => setLoadingTrend(false));
    api.get('/announcements').then(r => setAnnouncements(r.data.announcements || [])).catch(() => {});
    api.get('/posts').then(r => setPosts(r.data.posts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    api.get('/trips/my').then(r => setMyTrips(r.data.trips)).catch(() => {});
    api.get('/parcels/my').then(r => setMyParcels(r.data.parcels)).catch(() => {});
  }, [user?._id]);

  const firstName           = user?.name?.split(' ')[0] || 'there';
  const activeTripsCount    = myTrips.filter(t => t.status === 'active').length;
  const pendingParcelsCount = myParcels.filter(p => ['open','requested'].includes(p.status)).length;
  const pct                 = calcPct(user);
  const frequentFrom        = user?.frequentRoute?.from;
  const frequentTo          = user?.frequentRoute?.to;

  const handleSearch = () => {
    if (!heroSearch.from && !heroSearch.to) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Enter From or To city'));
      return;
    }
    navigate(searchType === 'trips' ? '/trips' : '/parcels', {
      state: { from: heroSearch.from, to: heroSearch.to, date: heroSearch.date },
    });
  };

  const swapCities = () => {
    setHeroSearch(s => ({ ...s, from: s.to, to: s.from }));
    setShowFrom(false); setShowTo(false);
  };

  const filterCities = (val) =>
    val.trim().length === 0
      ? POPULAR_CITIES.slice(0, 6)
      : POPULAR_CITIES.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0, 6);

  const onFromChange = (val) => {
    setHeroSearch(s => ({ ...s, from: val }));
    setFromSuggs(filterCities(val));
    setShowFrom(true);
  };
  const onToChange = (val) => {
    setHeroSearch(s => ({ ...s, to: val }));
    setToSuggs(filterCities(val));
    setShowTo(true);
  };
  const pickFrom = (city) => {
    setHeroSearch(s => ({ ...s, from: city }));
    setShowFrom(false);
    toRef.current?.focus();
  };
  const pickTo = (city) => {
    setHeroSearch(s => ({ ...s, to: city }));
    setShowTo(false);
  };
  const hideFrom = () => setTimeout(() => setShowFrom(false), 150);
  const hideTo   = () => setTimeout(() => setShowTo(false),   150);

  const FEATURES = [
    { icon: '💰', title: 'Earn on trips', sub: '₹300–₹1000 avg' },
    { icon: '⚡', title: 'Fast & reliable', sub: 'Real-time tracking' },
    { icon: '🛡️', title: 'Trusted community', sub: 'Verified travellers' },
    { icon: '🤝', title: 'People helping people', sub: 'Across 100+ cities' },
  ];

  return (
    <div className="px-4 py-4 space-y-4 pb-8 lg:px-0 lg:py-0 lg:space-y-0">

      {/* ── HERO ── */}
      <div className="rounded-t-3xl lg:rounded-none overflow-hidden lg:flex lg:items-stretch"
        style={{ background: 'linear-gradient(150deg, #f97316 0%, #ea580c 55%, #c2410c 100%)' }}>
        {/* Left content */}
        <div className="px-5 pt-5 pb-7 lg:px-8 lg:pt-8 lg:pb-8 lg:flex-1 lg:flex lg:flex-col lg:justify-center" style={{ animation: 'staggerIn 0.35s ease both' }}>
          <p className="text-orange-100 text-xs font-semibold">
            Good {getGreeting()} 👋
            {user && (activeTripsCount > 0 || pendingParcelsCount > 0) && (
              <span className="ml-1 opacity-80">
                · {activeTripsCount} trip{activeTripsCount !== 1 ? 's' : ''} · {pendingParcelsCount} parcel{pendingParcelsCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
          {user ? (
            <>
              <h1 className="text-white text-[22px] lg:text-4xl font-black leading-tight mt-0.5 lg:mt-2">
                {user ? `Turn every trip\ninto earnings` : `Hey, ${firstName}!`}
              </h1>
              <p className="hidden lg:block text-orange-100 text-sm mt-2 font-medium">Travel → Deliver → Earn</p>
              <p style={{ opacity: phraseVisible ? 1 : 0, transform: phraseVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.35s ease, transform 0.35s ease', color: 'rgba(255,237,213,0.85)', fontSize: 12, marginTop: 2, fontWeight: 500 }} className="lg:hidden">
                {LOGGED_IN_PHRASES[phraseIdx % LOGGED_IN_PHRASES.length]}
              </p>
            </>
          ) : (
            <h1 className="text-white text-[22px] lg:text-4xl font-black leading-tight mt-0.5 lg:mt-2"
              style={{ opacity: phraseVisible ? 1 : 0, transform: phraseVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.35s ease, transform 0.35s ease', whiteSpace: 'pre-line' }}>
              {`Turn every trip\ninto earnings`}
            </h1>
          )}
        </div>

        {/* Right — transport illustration (desktop only) */}
        <div className="hidden lg:flex items-end justify-end shrink-0 overflow-hidden" style={{ width: 480, minHeight: 220 }}>
          <svg viewBox="0 0 480 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            {/* Animated dashed route lines */}
            <path d="M55 175 Q200 80 350 48" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="8 5" fill="none"/>
            <path d="M55 175 Q220 155 420 145" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="5 4" fill="none"/>

            {/* Origin pin */}
            <circle cx="55" cy="170" r="14" fill="rgba(255,255,255,0.18)"/>
            <circle cx="55" cy="170" r="7" fill="white"/>
            <circle cx="55" cy="170" r="3" fill="rgba(249,115,22,0.7)"/>

            {/* Destination pin */}
            <circle cx="420" cy="148" r="12" fill="rgba(255,255,255,0.18)"/>
            <circle cx="420" cy="148" r="6" fill="white"/>
            <circle cx="420" cy="148" r="2.5" fill="rgba(249,115,22,0.7)"/>

            {/* ── AIRPLANE (top right, tilted) ── */}
            <g transform="translate(290,28) rotate(-18)" style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.22))' }}>
              {/* Fuselage */}
              <ellipse cx="0" cy="0" rx="48" ry="10" fill="white"/>
              {/* Nose */}
              <path d="M48 -5 Q62 0 48 5 Z" fill="rgba(255,255,255,0.9)"/>
              {/* Tail vertical fin */}
              <path d="M-46 -10 L-32 -28 L-22 -10 Z" fill="rgba(255,255,255,0.75)"/>
              {/* Tail horizontal fin */}
              <path d="M-42 6 L-30 18 L-18 6 Z" fill="rgba(255,255,255,0.75)"/>
              {/* Main wings */}
              <path d="M-8 2 L-36 34 L8 14 Z" fill="rgba(255,255,255,0.88)"/>
              <path d="M12 -2 L4 -30 L28 -8 Z" fill="rgba(255,255,255,0.88)"/>
              {/* Windows */}
              <circle cx="22" cy="-3" r="3.5" fill="rgba(253,186,116,0.7)"/>
              <circle cx="10" cy="-3" r="3.5" fill="rgba(253,186,116,0.7)"/>
              <circle cx="-2" cy="-3" r="3.5" fill="rgba(253,186,116,0.7)"/>
              <circle cx="-14" cy="-3" r="3.5" fill="rgba(253,186,116,0.6)"/>
              {/* Engine */}
              <ellipse cx="-5" cy="10" rx="8" ry="4" fill="rgba(255,255,255,0.6)"/>
            </g>

            {/* ── TRAIN (bottom left, perspective) ── */}
            <g transform="translate(62,128)" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))' }}>
              {/* Car 1 body */}
              <rect x="0" y="8" width="110" height="42" rx="6" fill="rgba(255,255,255,0.92)"/>
              {/* Car 1 cabin top */}
              <rect x="5" y="-8" width="78" height="20" rx="5" fill="rgba(255,255,255,0.82)"/>
              {/* Windows */}
              <rect x="10" y="-4" width="14" height="11" rx="2.5" fill="rgba(253,186,116,0.55)"/>
              <rect x="28" y="-4" width="14" height="11" rx="2.5" fill="rgba(253,186,116,0.55)"/>
              <rect x="46" y="-4" width="14" height="11" rx="2.5" fill="rgba(253,186,116,0.55)"/>
              {/* Body windows */}
              <rect x="10" y="16" width="14" height="10" rx="2" fill="rgba(253,186,116,0.4)"/>
              <rect x="30" y="16" width="14" height="10" rx="2" fill="rgba(253,186,116,0.4)"/>
              <rect x="50" y="16" width="14" height="10" rx="2" fill="rgba(253,186,116,0.4)"/>
              <rect x="70" y="16" width="14" height="10" rx="2" fill="rgba(253,186,116,0.4)"/>
              {/* Orange stripe */}
              <rect x="0" y="30" width="110" height="5" rx="2" fill="rgba(249,115,22,0.35)"/>
              {/* Wheels */}
              <circle cx="22" cy="53" r="10" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              <circle cx="22" cy="53" r="4" fill="rgba(249,115,22,0.5)"/>
              <circle cx="88" cy="53" r="10" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              <circle cx="88" cy="53" r="4" fill="rgba(249,115,22,0.5)"/>
              {/* Headlight */}
              <circle cx="107" cy="22" r="5" fill="rgba(253,230,138,0.8)"/>
            </g>

            {/* ── BUS (mid right) ── */}
            <g transform="translate(355,98)" opacity="0.82" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.15))' }}>
              <rect x="0" y="0" width="72" height="34" rx="6" fill="rgba(255,255,255,0.85)"/>
              <rect x="4" y="-12" width="60" height="16" rx="4" fill="rgba(255,255,255,0.75)"/>
              <rect x="8" y="-8" width="10" height="8" rx="2" fill="rgba(253,186,116,0.5)"/>
              <rect x="22" y="-8" width="10" height="8" rx="2" fill="rgba(253,186,116,0.5)"/>
              <rect x="36" y="-8" width="10" height="8" rx="2" fill="rgba(253,186,116,0.5)"/>
              <rect x="8" y="10" width="10" height="7" rx="1.5" fill="rgba(253,186,116,0.4)"/>
              <rect x="22" y="10" width="10" height="7" rx="1.5" fill="rgba(253,186,116,0.4)"/>
              <rect x="36" y="10" width="10" height="7" rx="1.5" fill="rgba(253,186,116,0.4)"/>
              <rect x="0" y="20" width="72" height="4" rx="2" fill="rgba(249,115,22,0.3)"/>
              <circle cx="16" cy="37" r="8" fill="rgba(255,255,255,0.65)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <circle cx="16" cy="37" r="3.5" fill="rgba(249,115,22,0.4)"/>
              <circle cx="56" cy="37" r="8" fill="rgba(255,255,255,0.65)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <circle cx="56" cy="37" r="3.5" fill="rgba(249,115,22,0.4)"/>
              <rect x="68" y="8" width="4" height="12" rx="1" fill="rgba(253,230,138,0.7)"/>
            </g>

            {/* ── PARCEL BOX (floating center) ── */}
            <g transform="translate(196, 62)" style={{ animation: 'birdBob 2.5s ease-in-out infinite', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.25))' }}>
              {/* Box left face */}
              <path d="M0 24 L0 62 L32 80 L32 42 Z" fill="rgba(255,255,255,0.75)"/>
              {/* Box right face */}
              <path d="M32 42 L32 80 L64 62 L64 24 Z" fill="rgba(255,255,255,0.85)"/>
              {/* Box top face */}
              <path d="M0 24 L32 6 L64 24 L32 42 Z" fill="white"/>
              {/* Tape vertical */}
              <path d="M32 42 L32 80" stroke="rgba(249,115,22,0.45)" strokeWidth="5"/>
              {/* Tape horizontal on top */}
              <path d="M16 33 L48 33" stroke="rgba(249,115,22,0.35)" strokeWidth="4"/>
              {/* Brand mark */}
              <text x="10" y="65" fontSize="10" fill="rgba(249,115,22,0.5)" fontWeight="bold" fontFamily="monospace">🕊️</text>
              {/* Box shadow */}
              <ellipse cx="32" cy="83" rx="25" ry="6" fill="rgba(0,0,0,0.12)"/>
            </g>

            {/* Sparkles */}
            <circle cx="170" cy="52" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="390" cy="72" r="2" fill="rgba(255,255,255,0.4)"/>
            <circle cx="448" cy="38" r="2.5" fill="rgba(255,255,255,0.35)"/>
            <circle cx="148" cy="130" r="2" fill="rgba(255,255,255,0.3)"/>
          </svg>
        </div>
      </div>

      {/* ── DESKTOP FEATURES STRIP ── */}
      <div className="hidden lg:grid grid-cols-4 gap-3 bg-white border-b border-stone-100 px-8 py-4">
        {FEATURES.map(f => (
          <div key={f.title} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-xl shrink-0">{f.icon}</div>
            <div>
              <p className="text-sm font-bold text-stone-900">{f.title}</p>
              <p className="text-[11px] text-stone-400">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP TWO-COLUMN CONTENT WRAPPER ── */}
      <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-6 lg:px-8 lg:pt-6 lg:items-start">
      <div className="lg:space-y-5">
      {/* ── SEARCH CARD — outside overflow-hidden so dropdowns render freely ── */}
      {/* Negative margin pulls card up to visually overlap the hero bottom     */}
      <div className="bg-white rounded-b-3xl rounded-t-2xl shadow-lg relative z-10"
        style={{ marginTop: -12, animation: 'staggerIn 0.35s ease 0.07s both' }}>
        <div className="p-3 space-y-2.5">

          {/* Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-0.5 gap-0.5">
            {['trips', 'parcels'].map(t => (
              <button key={t} onClick={() => setSearchType(t)}
                className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  searchType === t ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500'
                }`}>
                {t === 'trips' ? '✈️ Travellers' : '📦 Parcels'}
              </button>
            ))}
          </div>

          {/* From → To row */}
          <div className="grid items-start gap-1.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

            {/* From */}
            <div className="relative min-w-0">
              <div className={`flex items-center gap-2 bg-stone-50 border rounded-xl px-3 py-2.5 transition-all ${showFrom ? 'border-orange-400 ring-2 ring-orange-100' : 'border-stone-200'}`}>
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <input
                  ref={fromRef}
                  className="min-w-0 w-full text-sm font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-400 placeholder:font-normal"
                  placeholder="From"
                  value={heroSearch.from}
                  onChange={e => onFromChange(e.target.value)}
                  onFocus={() => { setFromSuggs(filterCities(heroSearch.from)); setShowFrom(true); }}
                  onBlur={hideFrom}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  autoComplete="off"
                />
                {heroSearch.from && (
                  <button onMouseDown={e => e.preventDefault()}
                    onClick={() => { setHeroSearch(s => ({ ...s, from: '' })); setShowFrom(false); }}
                    className="text-stone-300 hover:text-stone-500 shrink-0">
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* Suggestions — renders outside overflow-hidden, no clipping */}
              {showFrom && fromSuggs.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl overflow-hidden"
                  style={{ zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
                  {fromSuggs.map(city => (
                    <button key={city} onMouseDown={e => e.preventDefault()} onClick={() => pickFrom(city)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-orange-50 active:bg-orange-100 transition-colors border-b border-stone-50 last:border-0">
                      <MapPin size={12} className="text-orange-400 shrink-0" />
                      <span className="text-sm text-stone-700 font-medium">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap */}
            <button onClick={swapCities}
              className="w-8 h-8 mt-0.5 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0">
              <ArrowLeftRight size={13} className="text-stone-500" />
            </button>

            {/* To */}
            <div className="relative min-w-0">
              <div className={`flex items-center gap-2 bg-stone-50 border rounded-xl px-3 py-2.5 transition-all ${showTo ? 'border-orange-400 ring-2 ring-orange-100' : 'border-stone-200'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <input
                  ref={toRef}
                  className="min-w-0 w-full text-sm font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-400 placeholder:font-normal"
                  placeholder="To"
                  value={heroSearch.to}
                  onChange={e => onToChange(e.target.value)}
                  onFocus={() => { setToSuggs(filterCities(heroSearch.to)); setShowTo(true); }}
                  onBlur={hideTo}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  autoComplete="off"
                />
                {heroSearch.to && (
                  <button onMouseDown={e => e.preventDefault()}
                    onClick={() => { setHeroSearch(s => ({ ...s, to: '' })); setShowTo(false); }}
                    className="text-stone-300 hover:text-stone-500 shrink-0">
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* Suggestions */}
              {showTo && toSuggs.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl overflow-hidden"
                  style={{ zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
                  {toSuggs.map(city => (
                    <button key={city} onMouseDown={e => e.preventDefault()} onClick={() => pickTo(city)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-orange-50 active:bg-orange-100 transition-colors border-b border-stone-50 last:border-0">
                      <MapPin size={12} className="text-emerald-400 shrink-0" />
                      <span className="text-sm text-stone-700 font-medium">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date — trips only */}
          {searchType === 'trips' && (
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
              <Calendar size={13} className="text-stone-400 shrink-0" />
              <input type="date" min={today}
                className="flex-1 text-sm text-stone-600 bg-transparent outline-none font-medium"
                value={heroSearch.date}
                onChange={e => setHeroSearch(s => ({ ...s, date: e.target.value }))} />
            </div>
          )}

          {/* Search CTA */}
          <button onClick={handleSearch}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
            style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>
            <Search size={15} />
            {searchType === 'trips' ? 'Find Travellers' : 'Find Parcels'}
          </button>
        </div>
      </div>


      {/* ── PROFILE COMPLETION ──────────────────────────────────────── */}
      {user && pct < 100 && (
        <button onClick={() => navigate(user?.isProfileComplete ? '/profile' : '/complete-profile')}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all text-left"
          style={{ animation: 'staggerIn 0.35s ease 0.12s both' }}>
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#fde68a" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16 * pct / 100} 999`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-amber-700">{pct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900">Complete your profile</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Build trust · unlock all features</p>
          </div>
          <div className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-0.5">
            Finish <ChevronRight size={12} />
          </div>
        </button>
      )}

      {/* ── QUICK ACTIONS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3" style={{ animation: 'staggerIn 0.35s ease 0.15s both' }}>

        {/* Post a Trip — clearly tappable with bottom CTA */}
        <button onClick={() => authGate(() => {
            if (user?.kycStatus !== 'verified') {
              import('react-hot-toast').then(({ default: t }) =>
                t.error('KYC verification required to post trips'));
              setTimeout(() => navigate('/kyc'), 600);
              return;
            }
            setShowTripModal(true);
          })}
          className="group relative overflow-hidden rounded-2xl text-left transition-all duration-150 active:scale-[0.96] active:brightness-90"
          style={{ background: 'linear-gradient(145deg, #f97316, #ea580c)', boxShadow: '0 6px 20px rgba(249,115,22,0.45)' }}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center">
                <span className="text-xl">✈️</span>
              </div>
              <ArrowRight size={16} className="text-white/70 mt-1 group-active:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-sm font-black text-white leading-tight">I'm Travelling</p>
            <p className="text-[11px] text-orange-100 mt-1">Post trip &amp; earn carrying</p>
          </div>
          {/* Clear tap CTA at bottom */}
          <div className="bg-black/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">Tap to post trip</span>
            <span className="text-white text-xs">＋</span>
          </div>
        </button>

        {/* Send a Parcel — clearly tappable with bottom CTA */}
        <button onClick={() => authGate(() => setShowParcelModal(true))}
          className="group relative overflow-hidden rounded-2xl text-left transition-all duration-150 active:scale-[0.96] active:brightness-90"
          style={{ background: 'linear-gradient(145deg, #3b82f6, #2563eb)', boxShadow: '0 6px 20px rgba(59,130,246,0.45)' }}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center">
                <span className="text-xl">📦</span>
              </div>
              <ArrowRight size={16} className="text-white/70 mt-1 group-active:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-sm font-black text-white leading-tight">Send a Parcel</p>
            <p className="text-[11px] text-blue-100 mt-1">Find traveller on your route</p>
          </div>
          <div className="bg-black/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">Tap to send parcel</span>
            <span className="text-white text-xs">＋</span>
          </div>
        </button>
      </div>

      {/* ── TRENDING ROUTES ─────────────────────────────────────────── */}
      <section style={{ animation: 'staggerIn 0.35s ease 0.2s both' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-orange-500" />
            <h2 className="font-bold text-stone-900 text-sm">Trending Routes</h2>
          </div>
          <button onClick={() => navigate('/explore')}
            className="text-orange-500 text-xs font-semibold flex items-center gap-0.5">
            Explore <ArrowRight size={12} />
          </button>
        </div>
        {loadingTrend ? (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[0,1,2,3].map(i => <div key={i} className="h-16 w-28 shrink-0 skeleton-shimmer rounded-2xl" />)}
          </div>
        ) : trending.length === 0 ? (
          <p className="text-stone-400 text-xs text-center py-4 bg-stone-50 rounded-2xl border border-stone-100">
            No active routes yet
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {trending.map((r, i) => (
              <button key={i}
                onClick={() => navigate(searchType === 'trips' ? '/trips' : '/parcels', { state: { from: r.from, to: r.to } })}
                className="shrink-0 bg-white border border-stone-100 rounded-2xl px-3.5 py-2.5 text-left shadow-sm active:scale-95 transition-all"
                style={{ animation: 'staggerIn 0.3s ease both', animationDelay: `${i * 40}ms` }}>
                <div className="text-[10px] font-bold text-orange-500 mb-0.5">#{i + 1}</div>
                <div className="text-xs font-bold text-stone-900 whitespace-nowrap">{r.from} → {r.to}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">{r.count} traveller{r.count !== 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── FOR YOU ─────────────────────────────────────────────────── */}
      {frequentFrom && frequentTo && (
        <section style={{ animation: 'staggerIn 0.35s ease 0.25s both' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Compass size={14} className="text-orange-500" />
            <h2 className="font-bold text-stone-900 text-sm">For You</h2>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-4 py-4">
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide mb-0.5">Your frequent route</p>
            <p className="font-black text-stone-900">{frequentFrom} → {frequentTo}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate('/trips', { state: { from: frequentFrom, to: frequentTo } })}
                className="flex-1 bg-orange-500 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                Find Travellers
              </button>
              <button onClick={() => navigate('/parcels', { state: { from: frequentFrom, to: frequentTo } })}
                className="flex-1 bg-white border border-stone-200 text-stone-700 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                Find Parcels
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── IMPACT STORIES (featured posts as story cards) ─────────── */}
      {posts.filter(p => p.featured).length > 0 && (
        <section style={{ animation: 'staggerIn 0.35s ease 0.28s both' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={14} className="text-orange-500" />
            <h2 className="font-bold text-stone-900 text-sm">Impact Stories</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {posts.filter(p => p.featured).map((post, i) => (
              <button key={post._id} onClick={() => setActiveStory(post)}
                className="shrink-0 w-[110px] h-[160px] rounded-2xl overflow-hidden relative active:scale-95 transition-all"
                style={{ animation: 'staggerIn 0.3s ease both', animationDelay: `${i * 55}ms` }}>
                {post.image ? (
                  <img src={post.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(145deg, ${['#f97316,#ea580c','#6366f1,#4f46e5','#10b981,#059669'][i % 3]})` }}>
                    <span className="text-5xl opacity-90">{post.emoji}</span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                {/* Story ring */}
                <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-400 ring-offset-1 ring-offset-transparent" />
                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">{post.title}</p>
                  {post.stats?.route && (
                    <p className="text-white/65 text-[9px] mt-1 truncate">{post.stats.route}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── COMMUNITY POSTS FEED ────────────────────────────────────── */}
      {posts.length > 0 && (
        <section style={{ animation: 'staggerIn 0.35s ease 0.32s both' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm">🕊️</span>
            <h2 className="font-bold text-stone-900 text-sm">From the Community</h2>
          </div>
          <div className="space-y-3">
            {posts.map(post => (
              <PostCard key={post._id} post={post} onOpen={setActiveStory} />
            ))}
          </div>
        </section>
      )}

      {/* ── ANNOUNCEMENTS ───────────────────────────────────────────── */}
      {announcements.length > 0 && (
        <section style={{ animation: 'staggerIn 0.35s ease 0.3s both' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Megaphone size={13} className="text-orange-500" />
              <h2 className="font-bold text-stone-900 text-sm">Community</h2>
            </div>
            <button onClick={() => navigate('/notifications')}
              className="text-orange-500 text-xs font-semibold flex items-center gap-0.5">
              All <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {announcements.slice(0, 3).map((a, i) => (
              <div key={a._id}
                className={`flex gap-3 border rounded-2xl px-4 py-3 items-start ${ANNOUNCE_STYLE[a.type] || 'border-stone-100 bg-white'}`}
                style={{ animation: 'staggerIn 0.3s ease both', animationDelay: `${i * 60}ms` }}>
                <span className="text-xl shrink-0">{a.icon}</span>
                <div>
                  <p className="text-xs font-bold text-stone-900">{a.title}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Story full-screen overlay ── */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end animate-fade-in"
          onClick={() => setActiveStory(null)}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease both' }}>
            {activeStory.image && (
              <div className="relative">
                <img src={activeStory.image} alt="" className="w-full object-cover" style={{ maxHeight: 240 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            {!activeStory.image && (
              <div className="h-32 flex items-center justify-center"
                style={{ background: 'linear-gradient(145deg, #f97316, #ea580c)' }}>
                <span className="text-6xl">{activeStory.emoji}</span>
              </div>
            )}
            <div className="px-5 py-5">
              <h2 className="text-base font-black text-stone-900 leading-snug">{activeStory.title}</h2>
              {activeStory.stats && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {activeStory.stats.route && <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600">📍 {activeStory.stats.route}</span>}
                  {activeStory.stats.time  && <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600">⏱ {activeStory.stats.time}</span>}
                  {activeStory.stats.saved && <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600">💰 {activeStory.stats.saved}</span>}
                </div>
              )}
              <p className="text-sm text-stone-600 leading-relaxed mt-3">{activeStory.content}</p>
              <button onClick={() => setActiveStory(null)}
                className="w-full mt-5 py-3 rounded-2xl bg-stone-100 text-stone-600 text-sm font-bold active:scale-98 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>{/* close lg:space-y-5 */}

      {/* ── DESKTOP RIGHT SIDEBAR ── */}
      <aside className="hidden lg:block space-y-5 lg:sticky lg:top-4">

        {/* Quick post actions */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <p className="text-xs font-black text-stone-400 uppercase tracking-wide">Quick Post</p>
          </div>
          <button onClick={() => authGate(() => {
              if (user?.kycStatus !== 'verified') { import('react-hot-toast').then(({ default: t }) => t.error('KYC required')); setTimeout(() => navigate('/kyc'), 600); return; }
              setShowTripModal(true);
            })}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-orange-50 transition-colors border-b border-stone-50">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0"><Send size={15} className="text-white" /></div>
            <div className="text-left flex-1"><p className="text-sm font-bold text-stone-900">I'm Travelling</p><p className="text-[11px] text-stone-400">Post trip &amp; start earning</p></div>
            <ArrowRight size={14} className="text-stone-300 shrink-0" />
          </button>
          <button onClick={() => authGate(() => setShowParcelModal(true))}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0"><Package size={15} className="text-white" /></div>
            <div className="text-left flex-1"><p className="text-sm font-bold text-stone-900">Send a Parcel</p><p className="text-[11px] text-stone-400">Find a traveller on your route</p></div>
            <ArrowRight size={14} className="text-stone-300 shrink-0" />
          </button>
        </div>

        {/* Trending routes sidebar */}
        {trending.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-orange-500" />
                <p className="text-xs font-black text-stone-800">Trending Routes</p>
              </div>
              <button onClick={() => navigate('/explore')} className="text-[10px] font-bold text-orange-500">All →</button>
            </div>
            {trending.slice(0, 5).map((r, i) => (
              <button key={i} onClick={() => navigate('/trips', { state: { from: r.from, to: r.to } })}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-orange-500">#{i+1}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-stone-900 truncate">{r.from} → {r.to}</p>
                  <p className="text-[10px] text-stone-400">{r.count} traveller{r.count !== 1 ? 's' : ''} available</p>
                </div>
                <ArrowRight size={12} className="text-stone-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Community updates sidebar */}
        {announcements.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
              <div className="flex items-center gap-2">
                <Megaphone size={13} className="text-orange-500" />
                <p className="text-xs font-black text-stone-800">Community</p>
              </div>
              <button onClick={() => navigate('/notifications')} className="text-[10px] font-bold text-orange-500">All →</button>
            </div>
            {announcements.slice(0, 3).map((a, i) => (
              <div key={a._id} className="flex gap-3 px-4 py-3 border-b border-stone-50 last:border-0 items-start">
                <span className="text-lg shrink-0">{a.icon}</span>
                <div><p className="text-xs font-bold text-stone-900">{a.title}</p><p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed line-clamp-2">{a.body}</p></div>
              </div>
            ))}
          </div>
        )}
      </aside>

      </div>{/* close lg:grid */}

      {showTripModal && (
        <PostTripModal onClose={() => setShowTripModal(false)}
          onSuccess={trip => { setMyTrips(prev => [trip, ...prev]); setShowTripModal(false); }} />
      )}
      {showParcelModal && (
        <PostParcelModal onClose={() => setShowParcelModal(false)}
          onSuccess={parcel => { setMyParcels(prev => [parcel, ...prev]); setShowParcelModal(false); }} />
      )}
    </div>
  );
}
