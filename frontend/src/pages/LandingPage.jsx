import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Scroll-reveal hook ───────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Mini sparkline SVG ───────────────────────────────── */
function Spark({ vals, color = '#f97316' }) {
  const w = 80, h = 28;
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = max - min || 1;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * w,
    h - ((v - min) / rng) * (h - 5) - 2,
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const fill = [...pts, [w, h], [0, h]].map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z';
  const id = `sg${color.slice(1)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Section wrapper with fade-up animation ──────────── */
function Section({ children, className = '' }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
}

/* ── Train SVG illustration ───────────────────────────── */
function TrainIllustration() {
  return (
    <svg viewBox="0 0 520 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="60%" stopColor="#fff7ed" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="trainBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      {/* Background sky */}
      <rect width="520" height="380" fill="url(#sky)" />

      {/* Sun */}
      <circle cx="420" cy="60" r="38" fill="#fbbf24" opacity="0.35" />
      <circle cx="420" cy="60" r="24" fill="#f97316" opacity="0.55" />

      {/* Mountain silhouettes */}
      <path d="M0 250 L80 140 L160 230 L260 100 L380 200 L460 130 L520 180 L520 380 L0 380Z"
        fill="#fdba74" opacity="0.3" />
      <path d="M0 290 L100 200 L200 270 L320 170 L440 240 L520 200 L520 380 L0 380Z"
        fill="#fb923c" opacity="0.15" />

      {/* Animated route path */}
      <path d="M30 300 Q180 260 320 240 Q420 225 500 210"
        stroke="#f97316" strokeWidth="2" strokeDasharray="8 5" fill="none" opacity="0.5"
        style={{ strokeDashoffset: 0, animation: 'dashFlow 3s linear infinite' }} />

      {/* Route pins */}
      <g transform="translate(24,286)">
        <circle r="8" fill="#f97316" />
        <circle r="4" fill="white" />
      </g>
      <g transform="translate(498,200)">
        <circle r="8" fill="#f97316" />
        <circle r="4" fill="white" />
      </g>

      {/* Ground / track area */}
      <rect x="0" y="300" width="520" height="80" fill="url(#ground)" opacity="0.6" />

      {/* Rails */}
      <line x1="0" y1="310" x2="520" y2="310" stroke="#d97706" strokeWidth="2.5" opacity="0.5" />
      <line x1="0" y1="318" x2="520" y2="318" stroke="#d97706" strokeWidth="2.5" opacity="0.5" />
      {[30,80,130,180,230,280,330,380,430,480].map(x => (
        <line key={x} x1={x} y1="307" x2={x} y2="321" stroke="#d97706" strokeWidth="3" opacity="0.35" />
      ))}

      {/* ── TRAIN BODY ── */}
      <g transform="translate(40, 220)">
        {/* Shadow */}
        <ellipse cx="210" cy="94" rx="195" ry="8" fill="rgba(0,0,0,0.12)" />

        {/* Car 2 (rear) */}
        <rect x="280" y="12" width="130" height="68" rx="6" fill="url(#trainBody)" />
        <rect x="284" y="16" width="122" height="60" rx="4" fill="#f8fafc" />
        {/* Car 2 windows */}
        {[296, 318, 340, 362, 384].map(x => (
          <rect key={x} x={x} y="22" width="16" height="24" rx="3" fill="#bfdbfe" opacity="0.8" />
        ))}
        {/* Car 2 orange stripe */}
        <rect x="280" y="60" width="130" height="8" fill="#f97316" opacity="0.85" />

        {/* Connector */}
        <rect x="268" y="30" width="14" height="40" rx="2" fill="#e2e8f0" />

        {/* Car 1 (front) — main */}
        <rect x="0" y="8" width="272" height="72" rx="8" fill="url(#trainBody)" />
        <rect x="4" y="12" width="264" height="64" rx="6" fill="#f8fafc" />

        {/* Front nose */}
        <path d="M0 8 Q-28 8 -32 40 Q-28 72 0 80 L0 8Z" fill="white" />
        <path d="M-2 15 Q-22 20 -24 40 Q-22 60 -2 65" stroke="#e2e8f0" strokeWidth="1" fill="none" />
        {/* Headlight */}
        <ellipse cx="-20" cy="40" rx="8" ry="5" fill="#fde68a" opacity="0.9" />
        <ellipse cx="-20" cy="40" rx="4" ry="2.5" fill="#fbbf24" />
        {/* Kabutar logo on front */}
        <text x="-8" y="44" fontSize="10" fill="#f97316" opacity="0.7" fontWeight="bold">🕊️</text>

        {/* Car 1 windows row 1 */}
        {[18, 46, 74, 102, 130, 158, 186, 214, 242].map(x => (
          <rect key={x} x={x} y="16" width="22" height="20" rx="3" fill="#bfdbfe" opacity="0.75" />
        ))}
        {/* Car 1 windows row 2 (doors) */}
        {[30, 110, 190].map(x => (
          <rect key={x} x={x} y="40" width="18" height="28" rx="3" fill="#dbeafe" opacity="0.6" />
        ))}

        {/* Orange stripe */}
        <rect x="0" y="56" width="272" height="10" rx="2" fill="#f97316" opacity="0.85" />
        <rect x="-28" y="56" width="30" height="10" rx="1" fill="#ea580c" opacity="0.7" />

        {/* Bottom skirting */}
        <rect x="-28" y="72" width="300" height="10" rx="3" fill="#94a3b8" opacity="0.4" />

        {/* Wheels Car 1 */}
        {[40, 130, 220].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="90" r="14" fill="#475569" />
            <circle cx={cx} cy="90" r="10" fill="#334155" />
            <circle cx={cx} cy="90" r="5" fill="#94a3b8" />
            <line x1={cx - 10} y1="90" x2={cx + 10} y2="90" stroke="#64748b" strokeWidth="1.5" />
            <line x1={cx} y1="80" x2={cx} y2="100" stroke="#64748b" strokeWidth="1.5" />
          </g>
        ))}
        {/* Wheels Car 2 */}
        {[310, 390].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="90" r="14" fill="#475569" />
            <circle cx={cx} cy="90" r="10" fill="#334155" />
            <circle cx={cx} cy="90" r="5" fill="#94a3b8" />
          </g>
        ))}

        {/* Speed lines */}
        {[-50, -60, -55].map((x, i) => (
          <line key={i} x1={x - 30} y1={30 + i * 10} x2={x} y2={30 + i * 10}
            stroke="#f97316" strokeWidth="1.5" opacity="0.4" strokeLinecap="round"
            style={{ animation: `speedLine 0.8s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </g>

      {/* Birds */}
      <path d="M60 90 Q65 85 70 90" stroke="#fb923c" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M72 82 Q77 77 82 82" stroke="#fb923c" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M110 110 Q115 105 120 110" stroke="#fb923c" strokeWidth="1.2" fill="none" opacity="0.4" />
    </svg>
  );
}

/* ── India route map ──────────────────────────────────── */
const MAP_CITIES = [
  { name: 'Delhi',     x: 38, y: 19, major: true  },
  { name: 'Patna',     x: 60, y: 30, major: true  },
  { name: 'Lucknow',   x: 50, y: 24, major: false },
  { name: 'Kolkata',   x: 74, y: 41, major: true  },
  { name: 'Mumbai',    x: 20, y: 53, major: true  },
  { name: 'Hyderabad', x: 44, y: 60, major: true  },
  { name: 'Bengaluru', x: 38, y: 72, major: false },
  { name: 'Chennai',   x: 52, y: 77, major: false },
  { name: 'Ranchi',    x: 65, y: 37, major: false },
  { name: 'Pune',      x: 24, y: 58, major: false },
];
const MAP_ROUTES = [
  ['Delhi','Patna'],['Delhi','Lucknow'],['Lucknow','Patna'],
  ['Patna','Kolkata'],['Patna','Ranchi'],['Ranchi','Kolkata'],
  ['Delhi','Mumbai'],['Mumbai','Pune'],['Mumbai','Hyderabad'],
  ['Hyderabad','Bengaluru'],['Bengaluru','Chennai'],['Hyderabad','Chennai'],
];
function getCity(name) { return MAP_CITIES.find(c => c.name === name); }

function IndiaMap() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* India outline simplified */}
      <path d="M26 8 Q50 4 68 14 Q86 24 82 44 Q90 54 85 65 Q78 80 62 87 Q52 92 44 88 Q28 82 20 67 Q9 52 12 34 Q15 18 26 8Z"
        fill="rgba(249,115,22,0.06)" stroke="rgba(249,115,22,0.2)" strokeWidth="0.5" />

      {/* Route lines */}
      {MAP_ROUTES.map(([a, b], i) => {
        const ca = getCity(a), cb = getCity(b);
        if (!ca || !cb) return null;
        return (
          <line key={i}
            x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y}
            stroke="#f97316" strokeWidth="0.6" strokeDasharray="2 1.5" opacity="0.45"
            style={{ strokeDashoffset: 0, animation: `dashFlow ${2 + i * 0.2}s linear infinite` }}
          />
        );
      })}

      {/* City dots */}
      {MAP_CITIES.map(c => (
        <g key={c.name}>
          <circle cx={c.x} cy={c.y} r={c.major ? 3.5 : 2.5} fill="rgba(249,115,22,0.2)"
            style={{ animation: `pulseRing ${1.5 + Math.random() * 0.5}s ease-in-out infinite` }} />
          <circle cx={c.x} cy={c.y} r={c.major ? 2 : 1.5} fill="#f97316" opacity="0.8" />
        </g>
      ))}

      {/* City labels (major only) */}
      {MAP_CITIES.filter(c => c.major).map(c => (
        <text key={c.name} x={c.x + 3} y={c.y + 1} fontSize="3.5"
          fill="#78350f" fontWeight="600" opacity="0.85">{c.name}</text>
      ))}
    </svg>
  );
}

/* ── Phone mockup ─────────────────────────────────────── */
function PhoneMockup({ children, accent = '#f97316', className = '' }) {
  return (
    <div className={`relative ${className}`}
      style={{ width: 140, height: 280, background: '#1c1917', borderRadius: 20, padding: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
      {/* Notch */}
      <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-50%)', width:40, height:8, background:'#1c1917', borderRadius:4, zIndex:10 }} />
      {/* Screen */}
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', height: '100%', position: 'relative' }}>
        {/* Status bar */}
        <div style={{ background: accent, height: 28, display:'flex', alignItems:'center', padding:'0 10px', justifyContent:'space-between' }}>
          <span style={{ color:'white', fontSize:7, fontWeight:700 }}>9:41</span>
          <div style={{ display:'flex', gap:3 }}>
            {[3,4,5].map(i => <div key={i} style={{ width:3, height:i*1.5, background:'rgba(255,255,255,0.7)', borderRadius:1 }} />)}
            <div style={{ width:10, height:5, background:'rgba(255,255,255,0.6)', borderRadius:2, marginLeft:2, marginTop:1 }} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*                    MAIN COMPONENT                       */
/* ─────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const NAV_LINKS = [
    { label: 'Home',         id: 'hero'     },
    { label: 'How It Works', id: 'how'      },
    { label: 'For Travelers',id: 'travelers' },
    { label: 'For Senders',  id: 'senders'  },
    { label: 'Safety',       id: 'safety'   },
    { label: 'Help',         id: 'footer'   },
  ];

  return (
    <>
      {/* ── CSS Keyframes ── */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes dashFlow { to { stroke-dashoffset: -40 } }
        @keyframes pulseRing { 0%,100%{r:3.5;opacity:0.2} 50%{r:5.5;opacity:0} }
        @keyframes speedLine { 0%{opacity:0;transform:translateX(-8px)} 50%{opacity:0.5} 100%{opacity:0;transform:translateX(0)} }
        @keyframes pulse-orange { 0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.4)} 70%{box-shadow:0 0 0 10px rgba(249,115,22,0)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .float { animation: float 3.5s ease-in-out infinite; }
        .float-slow { animation: floatSlow 4.5s ease-in-out 0.5s infinite; }
        .float-2 { animation: float 4s ease-in-out 1.2s infinite; }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,0.12); }
        .nav-blur { background: rgba(255,255,255,0.92); backdrop-filter: blur(16px); }
      `}</style>

      <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">

        {/* ═══════════════════════════════════════════
            1. NAVBAR
        ═══════════════════════════════════════════ */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-blur border-b border-stone-100 shadow-sm' : 'bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🕊️</span>
              <span className="font-black text-xl tracking-tight"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                kabutar
              </span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(l => (
                <button key={l.id} onClick={() => scrollTo(l.id)}
                  className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-stone-600 hover:text-orange-500 hover:bg-orange-50 transition-all">
                  {l.label}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden lg:flex items-center gap-2">
              <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
                ⬇ Download App
              </a>
              <button onClick={() => navigate('/app')}
                className="px-4 py-2 rounded-xl text-sm font-bold text-stone-700 border border-stone-200 hover:border-orange-300 hover:text-orange-500 transition-all">
                Open Web App
              </button>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenu(v => !v)} className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5">
              <span className={`w-6 h-0.5 bg-stone-700 rounded transition-all ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-0.5 bg-stone-700 rounded transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-0.5 bg-stone-700 rounded transition-all ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenu && (
            <div className="lg:hidden nav-blur border-t border-stone-100 px-5 py-4 space-y-1">
              {NAV_LINKS.map(l => (
                <button key={l.id} onClick={() => scrollTo(l.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                  {l.label}
                </button>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => navigate('/app')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                  Open Web App
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* ═══════════════════════════════════════════
            2. HERO SECTION
        ═══════════════════════════════════════════ */}
        <section id="hero" className="min-h-screen flex items-center pt-16 bg-gradient-to-br from-orange-50 via-white to-amber-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 w-full py-12 lg:py-0">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left: text */}
              <div className="space-y-7">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  10,000+ travelers across India
                </div>

                <h1 className="text-5xl lg:text-6xl font-black text-stone-900 leading-[1.08] tracking-tight">
                  Turn every trip<br />
                  into{' '}
                  <span style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    earnings
                  </span>
                </h1>

                <p className="text-lg text-stone-500 leading-relaxed max-w-md">
                  Send parcels faster through travelers already going your route. Earn money on every trip — no extra effort needed.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate('/trips')}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 8px 24px rgba(249,115,22,0.45)' }}>
                    ✈️ Search Trip
                  </button>
                  <button onClick={() => navigate('/parcels')}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-stone-700 text-base border-2 border-stone-200 hover:border-orange-300 hover:text-orange-500 transition-all bg-white">
                    📦 Send Parcel
                  </button>
                </div>

                {/* Social proof */}
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {['🧑','👩','🧔','👧','🧑‍💼'].map((e, i) => (
                      <div key={i} className="w-9 h-9 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-base shadow-sm" style={{ zIndex: 5 - i }}>
                        {e}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                      <span className="text-sm font-bold text-stone-700 ml-1">4.8/5</span>
                    </div>
                    <p className="text-xs text-stone-400 font-medium">Trusted by 10,000+ users</p>
                  </div>
                </div>
              </div>

              {/* Right: train + floating cards */}
              <div className="relative hidden lg:block" style={{ height: 480 }}>
                {/* Train illustration */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  <TrainIllustration />
                </div>

                {/* Floating card 1 — trending route */}
                <div className="float absolute top-12 right-4 bg-white rounded-2xl p-4 shadow-xl border border-stone-100 w-52"
                  style={{ backdropFilter: 'blur(12px)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">🔥 Trending Route</p>
                      <p className="font-black text-stone-900 text-base mt-0.5">Patna → Delhi</p>
                      <p className="text-[11px] text-stone-500">128 Active Travelers</p>
                      <p className="text-[10px] text-stone-400">This Week</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">↑24%</span>
                  </div>
                  <Spark vals={[40,55,48,72,65,90,85]} color="#f97316" />
                </div>

                {/* Floating card 2 — parcel requests */}
                <div className="float-slow absolute top-52 -left-4 bg-white rounded-2xl p-3.5 shadow-xl border border-stone-100 w-44">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-base">📦</div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold">Parcel Requests</p>
                      <p className="font-black text-stone-900 text-xl leading-none">24</p>
                      <p className="text-[9px] text-stone-400">Today</p>
                    </div>
                  </div>
                  <Spark vals={[15,22,18,28,24,35,32]} color="#3b82f6" />
                </div>

                {/* Floating card 3 — earnings */}
                <div className="float-2 absolute bottom-16 right-8 bg-white rounded-2xl p-3.5 shadow-xl border border-stone-100 w-48">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-base">💰</div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold">Earnings Opportunity</p>
                      <p className="font-black text-orange-500 text-xl leading-none">₹3,200+</p>
                      <p className="text-[9px] text-stone-400">Per Trip</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            3. TRUST BADGES
        ═══════════════════════════════════════════ */}
        <section className="py-10 bg-white border-y border-stone-100">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: '✅', title: 'KYC Verified',       sub: 'All users are verified',       color: 'bg-emerald-50 text-emerald-600' },
                  { icon: '💬', title: 'Secure Chat',         sub: 'In-app safe messaging',        color: 'bg-blue-50 text-blue-600' },
                  { icon: '⭐', title: 'Ratings & Reviews',   sub: 'Trusted by community',         color: 'bg-amber-50 text-amber-600' },
                  { icon: '🗺️', title: 'India-wide Network',  sub: '1000+ cities & towns',        color: 'bg-purple-50 text-purple-600' },
                ].map(b => (
                  <div key={b.title} className="card-hover flex items-center gap-3 bg-white border border-stone-100 rounded-2xl px-4 py-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl ${b.color} flex items-center justify-center text-xl shrink-0`}>{b.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{b.title}</p>
                      <p className="text-xs text-stone-400">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            4. LIVE ACTIVITY
        ═══════════════════════════════════════════ */}
        <section className="py-16 bg-stone-50">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600">Real-time updates from our network</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-stone-900">Live Activity on Kabutar</h2>
                </div>
                <button onClick={() => navigate('/explore')}
                  className="hidden lg:flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
                  View All Activity →
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Trending Route',   emoji: '🔥', value: 'Patna → Delhi', sub: '128 active travelers', badge: '+45', pct: '+24%', pctColor: 'text-emerald-500', vals: [40,55,48,72,65,90,85], color: '#f97316', bg: 'bg-orange-50' },
                  { label: 'Parcel Requests',  emoji: '📦', value: '24',             sub: 'Requests posted today',badge: '',    pct: '+12%', pctColor: 'text-emerald-500', vals: [15,22,18,28,24,35,32], color: '#10b981', bg: 'bg-emerald-50' },
                  { label: 'Upcoming Trips',   emoji: '✈️', value: '56',             sub: 'Trips available today', badge: '',   pct: '+8%',  pctColor: 'text-emerald-500', vals: [30,42,38,55,48,62,58], color: '#3b82f6', bg: 'bg-blue-50'   },
                  { label: 'Active Cities',    emoji: '⚡', value: '32',             sub: 'Cities active right now',badge: '+5', pct: '',     pctColor: '',                  vals: [20,28,25,35,30,40,38], color: '#8b5cf6', bg: 'bg-violet-50' },
                ].map((c, i) => (
                  <div key={i} className={`card-hover ${c.bg} rounded-2xl p-4 border border-white shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">{c.emoji} {c.label}</span>
                      {c.pct && <span className={`text-[10px] font-black ${c.pctColor}`}>{c.pct}</span>}
                    </div>
                    <p className="text-2xl font-black text-stone-900 leading-none">{c.value}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5 mb-3">{c.sub}</p>
                    <div className="flex items-end justify-between">
                      <Spark vals={c.vals} color={c.color} />
                      {c.badge && (
                        <div className="flex -space-x-1">
                          {['🧑','👩','🧔'].map((e, j) => (
                            <div key={j} className="w-5 h-5 rounded-full bg-white border border-white flex items-center justify-center text-[9px]">{e}</div>
                          ))}
                          <div className="w-5 h-5 rounded-full bg-orange-100 border border-white flex items-center justify-center text-[8px] font-bold text-orange-600">
                            {c.badge}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            5. HOW IT WORKS
        ═══════════════════════════════════════════ */}
        <section id="how" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-black text-stone-900 mb-3">How Kabutar Works?</h2>
                <p className="text-stone-400 text-base">Simple steps for a faster and smarter delivery experience</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* For Senders */}
                <div id="senders" className="rounded-3xl p-8 border border-orange-100" style={{ background: 'linear-gradient(145deg, #fff7ed, #fffbf5)' }}>
                  <div className="flex items-center gap-2 mb-7">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm">📦</div>
                    <h3 className="font-black text-stone-900 text-lg">For Senders</h3>
                  </div>
                  <div className="flex items-start gap-4">
                    {[
                      { n: '1', icon: '📝', title: 'Post Parcel',     sub: 'Add parcel details and your route'           },
                      { n: '2', icon: '🤝', title: 'Match Traveler',  sub: 'We match you with verified travelers'        },
                      { n: '3', icon: '✅', title: 'Get Delivery',    sub: 'Parcel delivered safely & on time'           },
                    ].map((s, i, arr) => (
                      <div key={i} className="flex-1 flex flex-col items-center text-center">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl shadow-md mb-3"
                            style={{ boxShadow: '0 8px 20px rgba(249,115,22,0.35)' }}>
                            {s.icon}
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-orange-200 flex items-center justify-center text-[11px] font-black text-orange-500">
                            {s.n}
                          </div>
                        </div>
                        <p className="font-bold text-stone-900 text-sm">{s.title}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{s.sub}</p>
                        {i < arr.length - 1 && (
                          <div className="hidden" /> /* arrow handled by flex gap */
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Arrows between steps */}
                  <div className="flex justify-center gap-0 mt-1 px-8">
                    <div className="flex-1" />
                    <span className="text-orange-300 text-2xl font-light">→</span>
                    <div className="flex-1" />
                    <span className="text-orange-300 text-2xl font-light">→</span>
                    <div className="flex-1" />
                  </div>
                </div>

                {/* For Travelers */}
                <div id="travelers" className="rounded-3xl p-8 border border-emerald-100" style={{ background: 'linear-gradient(145deg, #f0fdf4, #f8fffa)' }}>
                  <div className="flex items-center gap-2 mb-7">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm">✈️</div>
                    <h3 className="font-black text-stone-900 text-lg">For Travelers</h3>
                  </div>
                  <div className="flex items-start gap-4">
                    {[
                      { n: '1', icon: '🗺️', title: 'Add Trip',       sub: 'Share your travel details'             },
                      { n: '2', icon: '📦', title: 'Carry Parcel',   sub: 'Carry parcels on your trip'            },
                      { n: '3', icon: '💰', title: 'Earn Money',     sub: 'Earn extra money on every trip'        },
                    ].map((s, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center text-center">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl shadow-md mb-3"
                            style={{ boxShadow: '0 8px 20px rgba(16,185,129,0.35)' }}>
                            {s.icon}
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center text-[11px] font-black text-emerald-500">
                            {s.n}
                          </div>
                        </div>
                        <p className="font-bold text-stone-900 text-sm">{s.title}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-0 mt-1 px-8">
                    <div className="flex-1" />
                    <span className="text-emerald-300 text-2xl font-light">→</span>
                    <div className="flex-1" />
                    <span className="text-emerald-300 text-2xl font-light">→</span>
                    <div className="flex-1" />
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            6. SUCCESS STORIES + INDIA MAP
        ═══════════════════════════════════════════ */}
        <section className="py-20 bg-stone-50">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-black text-stone-900 flex items-center gap-2">❤️ Success Stories</h2>
                  <p className="text-stone-400 mt-1">Real stories from our amazing community</p>
                </div>
                <button className="hidden lg:flex items-center gap-1.5 text-sm font-bold text-orange-500">
                  View All Stories →
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Story cards */}
                {[
                  {
                    emoji: '🧑', name: 'Aman Kumar', city: 'Patna',
                    text: 'Delivered exam documents safely in just 9 hours from Patna to Delhi. Student was able to appear for his exam. 🙌',
                    route: 'Patna → Delhi', delay: '0s',
                  },
                  {
                    emoji: '👩', name: 'Neha Singh', city: 'Lucknow',
                    text: "Needed urgent medicine delivery for my father. Got it delivered within hours through Kabutar. Lifesaver app!",
                    route: 'Lucknow → Delhi', delay: '0.1s',
                  },
                  {
                    emoji: '🧔', name: 'Rahul Verma', city: 'Ranchi',
                    text: 'Made ₹2,800 on a single trip to Kolkata. The app matched me with 3 senders on the same route instantly!',
                    route: 'Ranchi → Kolkata', delay: '0.2s',
                  },
                ].map((s, i) => (
                  <div key={i} className="card-hover bg-white rounded-2xl p-5 shadow-sm border border-stone-100"
                    style={{ animationDelay: s.delay }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center text-xl shrink-0">{s.emoji}</div>
                      <div>
                        <p className="font-bold text-stone-900 text-sm">{s.name}</p>
                        <p className="text-xs text-stone-400">{s.city}</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed mb-4">{s.text}</p>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      ✓ Delivered Safely · {s.route}
                    </span>
                  </div>
                ))}
              </div>

              {/* India map */}
              <div className="mt-10 bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-black text-stone-900 mb-2">Active across India</h3>
                    <p className="text-stone-400 text-sm mb-6">Real-time delivery routes connecting cities</p>
                    <div className="space-y-2.5">
                      {[
                        { route: 'Patna → Delhi',    travelers: 128, color: 'bg-orange-500' },
                        { route: 'Ranchi → Kolkata', travelers: 56,  color: 'bg-blue-500'   },
                        { route: 'Delhi → Lucknow',  travelers: 84,  color: 'bg-emerald-500'},
                        { route: 'Mumbai → Pune',    travelers: 64,  color: 'bg-purple-500' },
                      ].map(r => (
                        <div key={r.route} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${r.color} shrink-0`} />
                          <span className="text-sm font-semibold text-stone-700 flex-1">{r.route}</span>
                          <span className="text-xs font-bold text-stone-400">{r.travelers} active</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-56 lg:h-72">
                    <IndiaMap />
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            7. APP SHOWCASE
        ═══════════════════════════════════════════ */}
        <section className="py-20 overflow-hidden" style={{ background: 'linear-gradient(145deg, #1c1917, #292524)' }}>
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-3">
                  Everything You Need,<br />
                  <span style={{ background: 'linear-gradient(135deg,#f97316,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    All in One App
                  </span>
                </h2>
                <div className="flex flex-col gap-2 mt-6 items-center lg:items-start lg:flex-row lg:justify-center text-sm text-stone-400 font-medium">
                  {['1000+ Cities Connected', '5000+ Active Travelers', 'Fast Growing Network'].map(f => (
                    <span key={f} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{f}</span>
                  ))}
                </div>
              </div>

              {/* Phone mockups */}
              <div className="flex justify-center items-end gap-4 lg:gap-6">
                {/* Phone 1: Search */}
                <PhoneMockup className="hidden lg:block" style={{ marginBottom: 20 }} accent="#f97316">
                  <div className="p-3 space-y-2">
                    <div className="h-6 bg-stone-100 rounded-lg" />
                    <div className="h-4 bg-orange-50 rounded-lg" />
                    <div className="h-4 bg-orange-50 rounded-lg" />
                    <div className="h-8 bg-orange-500 rounded-xl" />
                    <p className="text-[8px] text-stone-400 font-bold mt-1">Recent Searches</p>
                    {['Patna → Delhi', 'Ranchi → Kolkata', 'Patna → Pune', 'Patna → Delhi'].map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-1 border-b border-stone-50">
                        <div className="w-3 h-3 rounded-full bg-orange-100" />
                        <span className="text-[7px] text-stone-600 font-medium">{r}</span>
                      </div>
                    ))}
                    <p className="text-[8px] text-stone-400 font-bold mt-1">Parcel Requests</p>
                    <div className="h-14 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center">
                      <span className="text-[8px] text-stone-400">3 requests near you</span>
                    </div>
                  </div>
                </PhoneMockup>

                {/* Phone 2: Home feed */}
                <PhoneMockup className="hidden lg:block" accent="#1c1917">
                  <div className="p-3 space-y-2">
                    <p className="text-[8px] font-black text-stone-900">Trips</p>
                    {[
                      { route: 'Patna → Delhi',   kg: '5 kg', amt: '₹250' },
                      { route: 'Ranchi → Kolkata', kg: '3 kg', amt: '₹180' },
                      { route: 'Panchi → Pune',    kg: '8 kg', amt: '₹400' },
                    ].map((t, i) => (
                      <div key={i} className="bg-stone-50 rounded-xl p-2 border border-stone-100">
                        <p className="text-[8px] font-bold text-stone-900">{t.route}</p>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[7px] text-stone-400">{t.kg}</span>
                          <span className="text-[7px] font-bold text-orange-500">{t.amt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PhoneMockup>

                {/* Phone 3: Splash (center, elevated) */}
                <PhoneMockup accent="#f97316"
                  className="relative"
                  style={{ transform: 'translateY(-20px)', zIndex: 10 }}>
                  <div className="flex flex-col items-center justify-center h-full pb-8"
                    style={{ background: 'linear-gradient(145deg,#f97316,#ea580c)' }}>
                    <span className="text-5xl mb-4">🕊️</span>
                    <p className="font-black text-white text-base">kabutar</p>
                    <p className="text-orange-100 text-[9px] font-medium text-center px-4 mt-2 leading-relaxed">
                      Turn every trip into earnings
                    </p>
                  </div>
                </PhoneMockup>

                {/* Phone 4: My Trips */}
                <PhoneMockup className="hidden lg:block" accent="#f97316">
                  <div className="p-3 space-y-2">
                    <p className="text-[8px] font-black text-stone-900">My Trips</p>
                    <div className="space-y-1.5">
                      {['Patna → Delhi', 'Ranchi → Kolkata', 'Panchi → Pune'].map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-stone-50 rounded-xl p-2 border border-stone-100">
                          <span className="text-[7px] font-bold text-stone-700">{r}</span>
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                            {i === 0 ? 'Active' : 'Open'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PhoneMockup>

                {/* Phone 5: Profile */}
                <PhoneMockup className="hidden lg:block" style={{ marginBottom: 20 }} accent="#1c1917">
                  <div className="flex flex-col items-center p-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl mt-3 mb-2 border-2 border-orange-300">🧑‍💼</div>
                    <p className="text-[9px] font-black text-stone-900">Himanshu</p>
                    <p className="text-[7px] text-blue-500 font-bold flex items-center gap-0.5">✓ Verified Traveler</p>
                    <div className="grid grid-cols-3 gap-2 mt-3 w-full">
                      {[['18','Trips'],['32','KM'],['4.8','Rating']].map(([v,l]) => (
                        <div key={l} className="text-center bg-stone-50 rounded-lg py-1.5">
                          <p className="text-[10px] font-black text-stone-900">{v}</p>
                          <p className="text-[7px] text-stone-400">{l}</p>
                        </div>
                      ))}
                    </div>
                    {['My Trips','My Parcels','Reviews','Settings'].map(m => (
                      <div key={m} className="w-full flex items-center justify-between py-1.5 border-b border-stone-50">
                        <span className="text-[8px] text-stone-600 font-medium">{m}</span>
                        <span className="text-[8px] text-stone-300">›</span>
                      </div>
                    ))}
                  </div>
                </PhoneMockup>
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            8. SAFETY SECTION
        ═══════════════════════════════════════════ */}
        <section id="safety" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Section>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left: shield illustration */}
                <div className="flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    {/* Outer glow rings */}
                    <div className="absolute inset-0 rounded-full bg-violet-100 opacity-40"
                      style={{ animation: 'floatSlow 4s ease-in-out infinite' }} />
                    <div className="absolute inset-6 rounded-full bg-violet-200 opacity-50" />
                    {/* Shield */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 120 140" width="160" height="190">
                        <defs>
                          <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                        </defs>
                        <path d="M60 5 L110 25 L110 75 Q110 120 60 135 Q10 120 10 75 L10 25 Z"
                          fill="url(#shield)" opacity="0.9" />
                        <path d="M60 15 L100 32 L100 76 Q100 114 60 127 Q20 114 20 76 L20 32 Z"
                          fill="rgba(255,255,255,0.1)" />
                        <path d="M40 70 L54 84 L80 55" stroke="white" strokeWidth="6"
                          strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        {/* Kabutar bird on shield */}
                        <text x="52" y="108" fontSize="18" fill="rgba(255,255,255,0.25)">🕊️</text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Right: features */}
                <div>
                  <h2 className="text-3xl lg:text-4xl font-black text-stone-900 mb-3">
                    Your Safety is Our Priority
                  </h2>
                  <p className="text-stone-400 mb-8 leading-relaxed">
                    We follow strict guidelines to ensure a safe and secure experience for every traveler and sender on the network.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: '🛡️', title: 'KYC Verification', sub: 'Verified users only',   color: 'bg-violet-50 text-violet-600' },
                      { icon: '🔐', title: 'Secure Payments',   sub: 'Safe & encrypted',       color: 'bg-blue-50 text-blue-600'    },
                      { icon: '💬', title: 'In-App Chat',        sub: 'Private & secure',       color: 'bg-emerald-50 text-emerald-600' },
                      { icon: '🚨', title: 'Report System',      sub: '24/7 support',           color: 'bg-orange-50 text-orange-600' },
                    ].map(f => (
                      <div key={f.title} className="card-hover flex gap-3 items-start bg-stone-50 rounded-2xl p-4 border border-stone-100">
                        <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center text-xl shrink-0`}>{f.icon}</div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{f.title}</p>
                          <p className="text-xs text-stone-400">{f.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            9. FINAL CTA SECTION
        ═══════════════════════════════════════════ */}
        <section className="py-20 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)' }}>
          {/* Decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/8" />
            {/* Train silhouette */}
            <svg className="absolute bottom-0 right-0 opacity-15" width="400" height="120" viewBox="0 0 400 120">
              <rect x="20" y="30" width="330" height="60" rx="8" fill="white" />
              <rect x="24" y="34" width="322" height="52" rx="6" fill="white" opacity="0.5" />
              {[40,90,140,190,240,290].map(x => (
                <rect key={x} x={x} y="40" width="30" height="22" rx="3" fill="rgba(0,0,0,0.15)" />
              ))}
              <rect x="20" y="68" width="330" height="8" fill="rgba(0,0,0,0.1)" />
              {[60, 180, 310].map(cx => (
                <g key={cx}>
                  <circle cx={cx} cy="96" r="16" fill="rgba(0,0,0,0.15)" />
                  <circle cx={cx} cy="96" r="10" fill="rgba(0,0,0,0.1)" />
                </g>
              ))}
              {/* Location pins skyline */}
              {[50,150,260,360].map((x, i) => (
                <g key={x} transform={`translate(${x},${5 + i * 3})`}>
                  <circle cx={0} cy={0} r="5" fill="rgba(255,255,255,0.3)" />
                  <line x1={0} y1={5} x2={0} y2={20} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                </g>
              ))}
            </svg>
          </div>

          <Section>
            <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full mb-6 border border-white/30">
                🇮🇳 Made for India
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                Join India's traveler-powered<br />delivery network
              </h2>
              <p className="text-orange-100 text-lg mb-8">
                Be a sender or traveler and earn, save &amp; help others.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white text-stone-900 font-bold px-8 py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all hover:shadow-xl">
                  <span className="text-xl">▶</span> Download App
                </a>
                <button onClick={() => navigate('/app')}
                  className="flex items-center gap-3 bg-white/20 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl text-base backdrop-blur-sm active:scale-95 transition-all hover:bg-white/30">
                  🌐 Open Web App
                </button>
              </div>
            </div>
          </Section>
        </section>

        {/* ═══════════════════════════════════════════
            10. FOOTER
        ═══════════════════════════════════════════ */}
        <footer id="footer" className="bg-stone-950 text-stone-400 py-14">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🕊️</span>
                  <span className="font-black text-lg text-white">kabutar</span>
                </div>
                <p className="text-sm leading-relaxed text-stone-500">Turn every trip into earnings.</p>
                <p className="text-xs text-stone-600 mt-2">© 2025 Kabutar. All rights reserved.</p>
              </div>

              {/* Company */}
              <div>
                <p className="font-bold text-stone-300 text-sm mb-3">Company</p>
                <div className="space-y-2">
                  <button onClick={() => scrollTo('hero')}
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">About Us</button>
                  <a href="mailto:kabutar.support@gmail.com"
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Careers</a>
                  <a href="mailto:kabutar.support@gmail.com"
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Contact Us</a>
                </div>
              </div>

              {/* Support */}
              <div>
                <p className="font-bold text-stone-300 text-sm mb-3">Support</p>
                <div className="space-y-2">
                  <a href="mailto:kabutar.support@gmail.com"
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Help Center</a>
                  <button onClick={() => scrollTo('safety')}
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Safety</button>
                  <button onClick={() => navigate('/terms')}
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Terms &amp; Conditions</button>
                  <button onClick={() => navigate('/privacy')}
                    className="block text-sm text-stone-500 hover:text-orange-400 transition-colors">Privacy Policy</button>
                </div>
              </div>

              {/* Social */}
              <div>
                <p className="font-bold text-stone-300 text-sm mb-3">Follow Us</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { icon: '📸', label: 'Instagram', href: 'https://instagram.com' },
                    { icon: '🐦', label: 'Twitter',   href: 'https://twitter.com'   },
                    { icon: '📘', label: 'Facebook',  href: 'https://facebook.com'  },
                    { icon: '💼', label: 'LinkedIn',  href: 'https://linkedin.com'  },
                    { icon: '▶',  label: 'YouTube',   href: 'https://youtube.com'   },
                  ].map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-orange-500 flex items-center justify-center text-sm transition-all active:scale-90"
                      title={s.label}>
                      {s.icon}
                    </a>
                  ))}
                </div>
                <a href="mailto:kabutar.support@gmail.com"
                  className="text-xs text-stone-500 hover:text-orange-400 transition-colors mt-4 block">
                  kabutar.support@gmail.com
                </a>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-6 flex flex-col lg:flex-row justify-between items-center gap-3">
              <p className="text-xs text-stone-600">Designed with ❤️ for India's travelers</p>
              <div className="flex gap-4">
                <button onClick={() => navigate('/privacy')}
                  className="text-xs text-stone-600 hover:text-orange-400 transition-colors">Privacy Policy</button>
                <button onClick={() => navigate('/terms')}
                  className="text-xs text-stone-600 hover:text-orange-400 transition-colors">Terms</button>
                <button onClick={() => scrollTo('safety')}
                  className="text-xs text-stone-600 hover:text-orange-400 transition-colors">Safety</button>
                <a href="mailto:kabutar.support@gmail.com"
                  className="text-xs text-stone-600 hover:text-orange-400 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
