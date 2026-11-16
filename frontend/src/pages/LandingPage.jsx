import { createElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, Menu, X, Search, UserCheck, MessageSquare, Route, Send,
  Inbox, Wallet, CalendarDays, ListChecks, MapPinned, Activity, ShieldCheck,
  IdCard, Star, KeyRound, Flag, Mail, ChevronDown, CircleUser, Package,
} from 'lucide-react';
import { BrandLogo, PlayStoreBadge } from '../components/desktop/BrandLogo';
import { PLAY_STORE_URL, SUPPORT_EMAIL } from '../lib/links';

const NAV = [
  ['top',        'Home'],
  ['how',        'How It Works'],
  ['travellers', 'For Travellers'],
  ['senders',    'For Senders'],
  ['safety',     'Safety'],
  ['help',       'Help'],
];

const scrollTo = (id) => (e) => {
  e?.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Hero illustration: a traveller with luggage carrying a parcel between two cities
function HeroIllustration() {
  return (
    <svg viewBox="0 0 560 470" className="w-full h-auto" role="img"
      aria-label="Illustration of a traveller with a suitcase carrying a parcel from New Delhi to Lucknow">
      <defs>
        <pattern id="kb-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#F2D6BF" />
        </pattern>
      </defs>
      <rect width="560" height="470" rx="28" fill="#FFF5ED" />
      <rect width="560" height="470" rx="28" fill="url(#kb-dots)" opacity="0.7" />

      {/* Route */}
      <path d="M84 176 C 180 40, 360 40, 476 116" fill="none" stroke="#FF6B0A" strokeWidth="3"
        strokeDasharray="1 11" strokeLinecap="round" />
      <g transform="translate(84 176)">
        <circle r="17" fill="#FF6B0A" opacity="0.14" />
        <circle r="8" fill="#FF6B0A" />
        <circle r="3.2" fill="#fff" />
      </g>
      <g transform="translate(476 116)">
        <path d="M0 -36 C -13 -36 -21 -26 -21 -15 C -21 1 0 18 0 18 C 0 18 21 1 21 -15 C 21 -26 13 -36 0 -36Z" fill="#0F172A" />
        <circle cy="-15" r="7" fill="#fff" />
      </g>
      <g transform="translate(40 200)">
        <rect width="100" height="32" rx="16" fill="#fff" stroke="#EBDDD0" />
        <text x="50" y="21" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0F172A" fontFamily="Inter, sans-serif">New Delhi</text>
      </g>
      <g transform="translate(430 146)">
        <rect width="92" height="32" rx="16" fill="#fff" stroke="#EBDDD0" />
        <text x="46" y="21" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0F172A" fontFamily="Inter, sans-serif">Lucknow</text>
      </g>

      {/* Ground */}
      <ellipse cx="290" cy="432" rx="150" ry="11" fill="#F3DCC8" />

      {/* Traveller */}
      <path d="M262 330 L248 422" stroke="#1E293B" strokeWidth="17" strokeLinecap="round" />
      <path d="M282 330 L298 422" stroke="#334155" strokeWidth="17" strokeLinecap="round" />
      <ellipse cx="243" cy="427" rx="14" ry="6.5" fill="#0F172A" />
      <ellipse cx="305" cy="427" rx="14" ry="6.5" fill="#0F172A" />
      <path d="M254 254 C 238 286, 232 304, 230 322" stroke="#E85D00" strokeWidth="15" strokeLinecap="round" fill="none" />
      <circle cx="230" cy="326" r="7.5" fill="#B9805A" />
      <rect x="246" y="228" width="56" height="112" rx="26" fill="#FF6B0A" />
      <path d="M262 236 L262 300" stroke="#E85D00" strokeWidth="3" strokeLinecap="round" />
      <rect x="266" y="210" width="15" height="24" rx="6" fill="#B9805A" />
      <circle cx="273" cy="190" r="25" fill="#C68A62" />
      <path d="M248 188 C 247 162, 298 158, 299 186 C 291 174, 262 172, 248 188Z" fill="#1F2937" />
      <circle cx="285" cy="192" r="2.2" fill="#1F2937" />
      <path d="M292 250 C 312 272, 322 290, 330 306" stroke="#E85D00" strokeWidth="15" strokeLinecap="round" fill="none" />
      <circle cx="332" cy="310" r="7.5" fill="#B9805A" />

      {/* Suitcase + parcel */}
      <path d="M325 342 V 312 H 339 V 342" stroke="#475569" strokeWidth="5" fill="none" strokeLinejoin="round" />
      <rect x="350" y="300" width="42" height="40" rx="5" fill="#E9A46B" />
      <rect x="367" y="300" width="8" height="40" fill="#F8D6B3" />
      <rect x="352" y="318" width="12" height="8" rx="2" fill="#FF6B0A" />
      <rect x="314" y="340" width="86" height="82" rx="11" fill="#0F172A" />
      <rect x="330" y="352" width="6" height="58" rx="3" fill="#334155" />
      <rect x="378" y="352" width="6" height="58" rx="3" fill="#334155" />
      <circle cx="328" cy="426" r="6" fill="#475569" />
      <circle cx="386" cy="426" r="6" fill="#475569" />
    </svg>
  );
}

// ── Phone preview for the download section (no data — just the app's shape)
function PhonePreview() {
  return (
    <div className="mx-auto w-[260px] rounded-[38px] bg-slate-900 p-2.5 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)]" aria-hidden="true">
      <div className="rounded-[30px] bg-[#FAF9F7] overflow-hidden h-[500px]">
        <div className="flex justify-center pt-2"><div className="w-20 h-5 rounded-full bg-slate-900" /></div>
        <div className="px-4 pt-3 flex items-center gap-2">
          <img src="/brand/logo-64.png" alt="" className="w-6 h-6 rounded-md" />
          <span className="text-sm font-bold text-slate-900">Kabutar</span>
        </div>
        <div className="mx-4 mt-4 bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] font-semibold">
            <span className="flex-1 text-center py-1 rounded-md bg-white text-slate-900">Travellers</span>
            <span className="flex-1 text-center py-1 text-slate-500">Parcels</span>
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-kb-500" /> From
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> To
          </div>
          <div className="bg-kb-500 text-white text-[11px] font-semibold text-center rounded-lg py-2">Find travellers</div>
        </div>
        <div className="mx-4 mt-4 space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 rounded bg-slate-200 w-2/3" />
                <div className="h-2 rounded bg-slate-100 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body, center, inverted }) {
  return (
    <div className={center ? 'text-center max-w-2xl mx-auto' : 'max-w-xl'}>
      {eyebrow && <p className={`text-[13px] font-semibold tracking-wide uppercase ${inverted ? 'text-kb-300' : 'text-kb-600'}`}>{eyebrow}</p>}
      <h2 className={`mt-2 text-3xl lg:text-[40px] font-semibold tracking-[-0.025em] leading-[1.15] ${inverted ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {body && <p className={`mt-4 text-base lg:text-lg leading-relaxed ${inverted ? 'text-slate-300' : 'text-slate-600'}`}>{body}</p>}
    </div>
  );
}

function Feature({ icon, title, body }) {
  const Icon = icon;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <span className="w-10 h-10 rounded-xl bg-kb-50 text-kb-600 flex items-center justify-center"><Icon size={19} /></span>
      <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Steps({ title, icon, steps }) {
  const Icon = icon;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-7 lg:p-8">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Icon size={18} /></span>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <ol className="mt-7 space-y-6">
        {steps.map(([t, b], i) => (
          <li key={t} className="flex gap-4">
            <span className="w-7 h-7 rounded-full border border-slate-300 text-[13px] font-semibold text-slate-700 flex items-center justify-center shrink-0">{i + 1}</span>
            <div>
              <p className="text-[15px] font-semibold text-slate-900">{t}</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{b}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const FAQS = [
  ['Who can post a trip?',
   'Anyone with a Kabutar account who completes identity verification — a government ID and a selfie, reviewed by the Kabutar team. Sending a parcel only needs an account.'],
  ['How do I send a parcel?',
   'Search your route to see travellers heading that way, or post a parcel request with the item type, weight and cities. Then chat with the traveller in the app to agree on pickup, timing and price.'],
  ['How is the price decided?',
   'Travellers set a price per kg on each trip, and senders can suggest a price when posting a parcel. The final amount is agreed and paid directly between sender and traveller.'],
  ['How do handovers work?',
   'Meet at the place you agreed in chat. Pickup and delivery can be confirmed in the app with one-time codes, and the sender confirms receipt once the parcel arrives.'],
  ['What shouldn’t I send?',
   'Anything illegal, hazardous, or restricted on the traveller’s mode of transport. Travellers should always see what they are carrying. The Terms list the rules in full.'],
  ['Where is Kabutar available?',
   'Kabutar is rolling out city by city in India. Search your pickup and destination to see who is currently travelling.'],
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq]   = useState(0);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const findTraveller = () => navigate('/trips');
  const imTravelling  = () => navigate('/app', { state: { intent: 'trip' } });
  const go = (id) => (e) => { setMenuOpen(false); scrollTo(id)(e); };

  return (
    <div className="min-h-screen bg-canvas font-inter text-slate-900 antialiased overflow-x-hidden" id="top">

      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 bg-white/90 backdrop-blur border-b transition-colors ${scrolled ? 'border-slate-200' : 'border-transparent'}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
          <BrandLogo to="/" />
          <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="Main">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={go(id)}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-2.5">
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors">
              <Download size={16} /> Download app
            </a>
            <button type="button" onClick={() => navigate('/app')}
              className="h-10 px-4 rounded-lg bg-kb-500 hover:bg-kb-600 text-white text-sm font-semibold transition-colors">
              Open web app
            </button>
          </div>
          <button type="button" onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="Menu"
            className="lg:hidden ml-auto w-10 h-10 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={go(id)} className="block px-3 py-2.5 rounded-lg text-[15px] font-medium text-slate-700 hover:bg-slate-50">{label}</a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                className="h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 flex items-center justify-center gap-2">
                <Download size={16} /> Download app
              </a>
              <button type="button" onClick={() => navigate('/app')} className="h-11 rounded-lg bg-kb-500 text-white text-sm font-semibold">Open web app</button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-full pl-2.5 pr-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-kb-500" /> Connecting travellers and senders across India
          </span>
          <h1 className="mt-6 text-[40px] sm:text-5xl lg:text-[60px] font-semibold tracking-[-0.035em] leading-[1.05] text-slate-900">
            Your journey can <span className="text-kb-500">deliver more.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-[540px]">
            Send parcels through travellers already heading your way. Earn on your journeys while helping people send things faster and more conveniently.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={findTraveller}
              className="h-12 px-6 rounded-xl bg-kb-500 hover:bg-kb-600 text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors">
              <Search size={17} /> Find a Traveller
            </button>
            <button type="button" onClick={imTravelling}
              className="h-12 px-6 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors">
              <Send size={16} /> I'm Travelling
            </button>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <PlayStoreBadge height={58} />
            <span className="text-[13px] text-slate-500 leading-snug">Also on Android.<br />Same account, same trips.</span>
          </div>
        </div>
        <div className="max-w-[560px] w-full mx-auto lg:mx-0">
          <HeroIllustration />
        </div>
      </section>

      {/* ── Feature strip (product facts, not metrics) ── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          {[
            [IdCard,        'ID-verified travellers'],
            [MessageSquare, 'In-app chat'],
            [KeyRound,      'Pickup & delivery codes'],
            [Star,          'Reviews after delivery'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
              {createElement(icon, { size: 18, className: 'text-kb-500 shrink-0' })} {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="scroll-mt-16 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionIntro center eyebrow="How it works" title="Two simple journeys"
          body="Kabutar matches people sending parcels with people already making the trip." />
        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          <Steps title="For senders" icon={Package} steps={[
            ['Enter pickup and destination cities', 'Search the route your parcel needs to travel, with an optional date.'],
            ['Find a traveller going your way', 'Compare travellers by date, space available, price per kg, verification and reviews.'],
            ['Connect and arrange a secure handover', 'Agree the details in chat, then confirm pickup and delivery in the app.'],
          ]} />
          <Steps title="For travellers" icon={Route} steps={[
            ['Post your upcoming trip', 'Add your route, dates, mode of transport and the space you can spare.'],
            ['Receive parcel requests along your route', 'Senders on your route can request space, and you can browse open parcel requests.'],
            ['Accept suitable requests and earn', 'Carry only what you are comfortable with, at the price per kg you set.'],
          ]} />
        </div>
      </section>

      {/* ── For travellers ── */}
      <section id="travellers" className="scroll-mt-16 bg-white border-y border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div>
            <SectionIntro eyebrow="For travellers" title="Earn on journeys you're already taking."
              body="Spare space in your luggage can help someone get a parcel where it needs to go — and cover part of your travel costs." />
            <button type="button" onClick={imTravelling}
              className="mt-8 h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors">
              Post a trip <ArrowRight size={17} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feature icon={Wallet} title="Earn while travelling" body="Set your own price per kg for the space you can spare." />
            <Feature icon={Inbox} title="Accept suitable requests" body="Review the item type, weight and sender profile before you accept anything." />
            <Feature icon={CalendarDays} title="Choose your route and dates" body="Post a one-off trip, or add several dates for a route you travel regularly." />
            <Feature icon={ListChecks} title="Manage your trips" body="Edit a trip, mark it as full, or remove it whenever your plans change." />
          </div>
        </div>
      </section>

      {/* ── For senders ── */}
      <section id="senders" className="scroll-mt-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <div className="grid sm:grid-cols-2 gap-4 order-2 lg:order-1">
            <Feature icon={MapPinned} title="Find travellers on your route" body="Search by pickup city, destination and date to see who is heading your way." />
            <Feature icon={UserCheck} title="Connect directly" body="Message a traveller to agree on the pickup point, timing and price." />
            <Feature icon={Activity} title="Follow handover progress" body="See each parcel move from accepted to picked up, in transit and delivered." />
            <Feature icon={MessageSquare} title="Keep it on the platform" body="Chat inside Kabutar, so there is a record of what you agreed." />
          </div>
          <div className="order-1 lg:order-2">
            <SectionIntro eyebrow="For senders" title="Send with someone already going there."
              body="Instead of waiting on a courier route, find a person travelling between the same two cities." />
            <button type="button" onClick={findTraveller}
              className="mt-8 h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors">
              Find a traveller <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Safety ── */}
      <section id="safety" className="scroll-mt-16 bg-slate-900">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <SectionIntro inverted eyebrow="Safety and trust" title="Built for handovers between strangers."
            body="Kabutar connects people who haven't met before, so trust features are part of every step." />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              [IdCard,        'Identity verification', 'Travellers submit a government ID and a selfie, reviewed by our team, before they can post trips.'],
              [CircleUser,    'Traveller profiles',    'Check verification status, completed deliveries, ratings and reviews before handing anything over.'],
              [Star,          'Ratings and reviews',   'Reviews can only be left after a completed delivery, so feedback reflects real handovers.'],
              [MessageSquare, 'In-app messaging',      'Agree on the details in Kabutar chat before you meet in person.'],
              [KeyRound,      'Handover verification', 'Pickup and delivery can be confirmed with one-time codes, and senders confirm receipt.'],
              [Flag,          'Report, block and support', 'Report or block a user from their profile. Reports go to the Kabutar team for review.'],
            ].map(([icon, title, body]) => (
              <div key={title} className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-6">
                {createElement(icon, { size: 20, className: 'text-kb-300' })}
                <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-400 max-w-3xl leading-relaxed">
            <ShieldCheck size={15} className="inline -mt-0.5 mr-1.5 text-slate-400" />
            Kabutar connects people; it does not inspect parcels. Always see what you are carrying, and never accept items you can't verify.
          </p>
        </div>
      </section>

      {/* ── Help ── */}
      <section id="help" className="scroll-mt-16 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16">
        <div>
          <SectionIntro eyebrow="Help" title="Questions, answered."
            body="Can't find what you need? Write to the Kabutar team." />
          <a href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-8 inline-flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors">
            <span className="w-9 h-9 rounded-lg bg-kb-50 text-kb-600 flex items-center justify-center"><Mail size={17} /></span>
            <span>
              <span className="block text-xs text-slate-500">Email support</span>
              <span className="block text-sm font-semibold text-slate-900">{SUPPORT_EMAIL}</span>
            </span>
          </a>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {FAQS.map(([q, a], i) => (
            <div key={q}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between gap-6 py-5 text-left">
                <span className="text-[15px] font-semibold text-slate-900">{q}</span>
                <ChevronDown size={18} className={`text-slate-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="pb-5 -mt-1 text-[15px] text-slate-600 leading-relaxed pr-10">
                  {a}
                  {i === 4 && <> <button type="button" onClick={() => navigate('/terms')} className="text-kb-600 font-medium hover:underline">Read the Terms</button>.</>}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── App download ── */}
      <section id="download" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-28">
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden grid lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="p-8 sm:p-12 lg:p-16">
            <h2 className="text-3xl lg:text-[40px] font-semibold tracking-[-0.025em] leading-[1.15] text-slate-900">Take Kabutar wherever you go.</h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-md">
              Discover travellers, post trips and manage parcel requests directly from your phone.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <PlayStoreBadge height={64} />
              <div className="hidden sm:flex items-center gap-3">
                <img src="/brand/playstore-qr.svg" alt="QR code linking to Kabutar on Google Play"
                  className="w-24 h-24 rounded-lg border border-slate-200 p-1 bg-white" loading="lazy" />
                <span className="text-[13px] text-slate-500 leading-snug">Scan with your<br />phone camera</span>
              </div>
            </div>
          </div>
          <div className="bg-kb-50 h-full flex items-center justify-center py-12 lg:py-16 px-6">
            <PhonePreview />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandLogo to="/" inverted />
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              Kabutar connects people travelling between Indian cities with people who need parcels sent along the same route.
            </p>
            <PlayStoreBadge height={52} className="mt-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV.slice(0, 4).map(([id, label]) => (
                <li key={id}><a href={`#${id}`} onClick={go(id)} className="hover:text-white transition-colors">{label}</a></li>
              ))}
              <li><button type="button" onClick={() => navigate('/app')} className="hover:text-white transition-colors">Open web app</button></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Support</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#safety" onClick={go('safety')} className="hover:text-white transition-colors">Safety</a></li>
              <li><a href="#help" onClick={go('help')} className="hover:text-white transition-colors">Help and contact</a></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors break-all">{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><button type="button" onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button type="button" onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms and Conditions</button></li>
              <li><button type="button" onClick={() => navigate('/delete-account')} className="hover:text-white transition-colors">Delete account</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Kabutar. Made in India.
          </div>
        </div>
      </footer>
    </div>
  );
}
