import { createElement, useState } from 'react';
import { Route, MessageCircle, ShieldCheck, ArrowRight } from 'lucide-react';

const SLIDES = [
  {
    icon: Route,
    title: 'Same route, shared journey',
    body: 'Kabutar connects people travelling between cities with people who need parcels sent the same way.',
  },
  {
    icon: MessageCircle,
    title: 'Post, chat, deliver',
    body: 'Post a trip or a parcel in a minute. Agree the details in chat, then confirm pickup and delivery in the app.',
  },
  {
    icon: ShieldCheck,
    title: 'Built on trust',
    body: 'Travellers verify their ID before posting trips. Handovers are confirmed with photos and one-time codes, and reviews come only from completed deliveries.',
  },
];

// No useNavigate — this renders outside BrowserRouter; use onDone() callback only
export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const last  = idx === SLIDES.length - 1;

  const done = () => {
    localStorage.setItem('kabutar_onboarded', '1');
    onDone?.();
  };
  const next = () => (last ? done() : setIdx(i => i + 1));

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-[#FAF9F7] font-inter text-slate-900"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-between px-5 pt-4 h-14">
        <img src="/brand/logo-64.png" alt="Kabutar" width={32} height={32} className="w-8 h-8 rounded-lg" />
        {!last && (
          <button onClick={done} className="h-10 px-3 rounded-lg text-[14px] font-semibold text-slate-600 active:bg-slate-100">Skip</button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center px-7">
        <div key={idx} className="animate-slide-up">
          <span className="w-20 h-20 rounded-3xl bg-kb-50 text-kb-600 flex items-center justify-center">
            {createElement(slide.icon, { size: 38, strokeWidth: 1.8 })}
          </span>
          <h1 className="mt-8 text-[30px] leading-[1.15] font-semibold tracking-[-0.025em]">{slide.title}</h1>
          <p className="mt-3 text-[16px] text-slate-600 leading-relaxed">{slide.body}</p>
        </div>
      </div>

      <div className="px-5 pb-6 space-y-6">
        <div className="flex gap-2" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((s, i) => (
            <button key={s.title} onClick={() => setIdx(i)} role="tab" aria-selected={i === idx} aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-8 bg-kb-500' : 'w-4 bg-slate-300'}`} />
          ))}
        </div>
        <button onClick={next}
          className="w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 text-white text-[16px] font-semibold flex items-center justify-center gap-2">
          {last ? 'Get started' : 'Next'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
