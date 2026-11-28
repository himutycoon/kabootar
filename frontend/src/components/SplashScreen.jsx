import { useState, useEffect } from 'react';

/* ─── 3-D stylised Kabutar SVG ──────────────────────────────────────────────
   Built with layered shapes + perspective tilt to give real depth.
   Wings are separate <g> tags so we can animate them independently.          */
function KabutarSVG({ flap = true }) {
  return (
    <svg
      viewBox="0 0 260 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: 180,
        height: 'auto',
        filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.35)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
        overflow: 'visible',
      }}
    >
      {/* ── Ground shadow ── */}
      <ellipse cx="126" cy="168" rx="58" ry="8" fill="rgba(0,0,0,0.18)" />

      {/* ── Back wing (far wing — darker for 3-D depth) ── */}
      <g style={{
        transformOrigin: '126px 100px',
        animation: flap ? 'backWingFlap 0.48s ease-in-out infinite' : 'none',
      }}>
        <path
          d="M126 100 C100 62 64 44 38 55 C58 72 96 88 126 108"
          fill="#b8aea8"
        />
        {/* Back wing feather lines */}
        <path d="M126 100 C105 65 72 50 52 58" stroke="#a09690" strokeWidth="1" opacity="0.6" />
        <path d="M126 100 C108 68 78 55 60 62" stroke="#a09690" strokeWidth="1" opacity="0.6" />
      </g>

      {/* ── Tail feathers ── */}
      <path d="M68 103 C52 94 40 110 46 122 C58 114 68 107 68 103" fill="#cdc5c0" />
      <path d="M68 103 C48 98 36 114 44 126 C56 116 68 107 68 103" fill="#bdb5b0" />
      <path d="M68 103 C54 92 42 106 48 118 C60 110 68 107 68 103" fill="#d5cdc8" />

      {/* ── Body — main mass ── */}
      <ellipse cx="122" cy="105" rx="56" ry="30" fill="#eee9e5" />
      {/* Body top highlight */}
      <ellipse cx="128" cy="96" rx="38" ry="16" fill="white" opacity="0.55" />
      {/* Body underside shadow */}
      <ellipse cx="116" cy="116" rx="42" ry="14" fill="#c8bfb8" opacity="0.45" />

      {/* ── Iridescent neck/breast patch (realistic pigeon detail) ── */}
      <ellipse cx="158" cy="96" rx="18" ry="12" fill="#a8b4d4" opacity="0.25" />
      <ellipse cx="155" cy="93" rx="12" ry="8" fill="#c4b5d4" opacity="0.2" />

      {/* ── Neck ── */}
      <ellipse cx="164" cy="88" rx="22" ry="26" fill="#eae6e2" />
      <ellipse cx="162" cy="82" rx="14" ry="11" fill="white" opacity="0.5" />

      {/* ── Head ── */}
      <circle cx="178" cy="65" r="26" fill="#ede9e5" />
      {/* Head highlight */}
      <ellipse cx="174" cy="57" rx="14" ry="10" fill="white" opacity="0.55" />

      {/* ── Beak ── */}
      <path d="M200 62 L222 66 L200 71" fill="#f97316" />
      <path d="M200 62 L220 64 L200 66" fill="#fed7aa" />
      {/* Cere/nostril bump */}
      <ellipse cx="205" cy="63" rx="5" ry="3" fill="#ea580c" />

      {/* ── Eye ── */}
      <circle cx="188" cy="60" r="7.5" fill="#dc2626" />
      <circle cx="188" cy="60" r="5.5" fill="#1c0d00" />
      <circle cx="190" cy="58" r="2" fill="white" />
      {/* Eye ring */}
      <circle cx="188" cy="60" r="9" fill="none" stroke="#fed7aa" strokeWidth="1.5" />

      {/* ── Front wing (near wing — white/bright for 3-D pop) ── */}
      <g style={{
        transformOrigin: '126px 98px',
        animation: flap ? 'frontWingFlap 0.48s ease-in-out infinite' : 'none',
      }}>
        {/* Wing body */}
        <path
          d="M126 98 C106 52 126 22 160 28 C148 55 132 78 126 110"
          fill="white"
        />
        {/* Wing shading */}
        <path
          d="M126 98 C110 56 130 26 162 32 C150 58 134 80 126 110"
          fill="#ede9e5"
        />
        {/* Wing feather detail lines */}
        <path d="M126 98 C112 60 118 30 142 28" stroke="#d4ccc8" strokeWidth="1.2" />
        <path d="M126 98 C114 62 122 34 150 30" stroke="#d4ccc8" strokeWidth="1.2" />
        <path d="M126 98 C118 65 128 38 158 32" stroke="#d4ccc8" strokeWidth="1" />
        {/* Wing tip highlight */}
        <path d="M126 98 C108 54 124 24 156 28" stroke="white" strokeWidth="2" opacity="0.6" />
      </g>

      {/* ── Legs + string to envelope ── */}
      <line x1="120" y1="132" x2="118" y2="148" stroke="#8a7a70" strokeWidth="2" strokeLinecap="round" />
      <line x1="128" y1="132" x2="130" y2="148" stroke="#8a7a70" strokeWidth="2" strokeLinecap="round" />
      {/* String */}
      <line x1="124" y1="148" x2="124" y2="158" stroke="#8a7a70" strokeWidth="1.5" strokeDasharray="3 2" />

      <style>{`
        @keyframes frontWingFlap {
          0%,100% { transform: rotate(0deg)    scaleY(1);    }
          30%      { transform: rotate(-28deg)  scaleY(0.88); }
          70%      { transform: rotate(18deg)   scaleY(1.08); }
        }
        @keyframes backWingFlap {
          0%,100% { transform: rotate(0deg);   }
          30%      { transform: rotate(22deg);  }
          70%      { transform: rotate(-16deg); }
        }
      `}</style>
    </svg>
  );
}

/* ─── Envelope SVG ───────────────────────────────────────────────────────── */
function EnvelopeSVG() {
  return (
    <svg viewBox="0 0 64 48" fill="none" style={{ width: 48, height: 36 }}>
      <rect x="2" y="2" width="60" height="44" rx="6" fill="white" />
      <rect x="2" y="2" width="60" height="44" rx="6" stroke="#f97316" strokeWidth="2.5" />
      {/* Flap */}
      <path d="M2 8 L32 28 L62 8" stroke="#f97316" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {/* Bottom fold lines for 3D effect */}
      <line x1="2" y1="46" x2="26" y2="30" stroke="#fed7aa" strokeWidth="1.5" />
      <line x1="62" y1="46" x2="38" y2="30" stroke="#fed7aa" strokeWidth="1.5" />
      {/* Stamp */}
      <rect x="46" y="8" width="12" height="10" rx="2" fill="#f97316" opacity="0.3" />
      <rect x="47" y="9" width="10" height="8" rx="1" stroke="#f97316" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ─── Main SplashScreen ──────────────────────────────────────────────────── */
export default function SplashScreen({ onDone }) {
  // phase: 1=fly-in  2=hover+text  3=envelope+loading-bar  4=exit
  // Starts at phase 1 immediately — no dark/black screen phase
  const [phase, setPhase] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Full intro only the first time; later launches get a short branded flash
    let seen = false;
    try { seen = !!localStorage.getItem('kabutar_splash_seen'); localStorage.setItem('kabutar_splash_seen', '1'); } catch { /* storage unavailable */ }
    const T = seen ? [250, 450, 800, 1250] : [1400, 2400, 5400, 5900];
    const t1 = setTimeout(() => setPhase(2),  T[0]); // pigeon lands, text begins
    const t2 = setTimeout(() => setPhase(3),  T[1]); // envelope + bar appear
    const t3 = setTimeout(() => setPhase(4),  T[2]); // start exit
    const t4 = setTimeout(() => onDone(),     T[3]); // hand off to app
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onDone]);

  // Progress bar — fills from 0→100 between phase 3 and phase 4
  useEffect(() => {
    if (phase < 3) return;
    setProgress(0);
    const start = Date.now();
    const dur   = 2800; // fills slowly over ~2.8 s (phase 3 window = 3 s)
    const iv = setInterval(() => {
      const p = Math.min(((Date.now() - start) / dur) * 100, 100);
      setProgress(p);
      if (p >= 100) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [phase]);

  const letters = 'kabutar'.split('');

  // Pigeon starts off-screen left (phase 1), swoops to centre, exits top-right (phase 4)
  const birdTransform = (() => {
    if (phase === 1) return 'translate(-300px, 70px) rotate(-14deg)';
    if (phase === 4) return 'translate(200px, -260px) rotate(28deg)';
    return 'translate(0px, 0px) rotate(0deg)';
  })();

  const birdTransition = (() => {
    if (phase === 2) return 'transform 1.3s cubic-bezier(0.22,1.15,0.36,1)';  // slow graceful landing
    if (phase === 4) return 'transform 0.6s cubic-bezier(0.55,0,1,0.45)';      // quick exit
    return 'none';
  })();

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: 'linear-gradient(160deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
        opacity:    phase === 4 ? 0 : 1,
        transform:  phase === 4 ? 'scale(1.06)' : 'scale(1)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      {/* Background decorative orbs — always visible */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: -80, right: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
      </div>

      {/* ── 3-D Pigeon ── */}
      <div style={{
        transform:  birdTransform,
        transition: birdTransition,
        animation:  (phase === 2 || phase === 3) ? 'birdHover 1.8s ease-in-out infinite' : 'none',
        perspective: '500px',
        perspectiveOrigin: '50% 50%',
      }}>
        <div style={{ transform: 'rotateY(-18deg) rotateX(6deg)', transformStyle: 'preserve-3d' }}>
          <KabutarSVG flap={phase >= 1 && phase <= 3} />
        </div>
      </div>

      {/* ── "kabutar" typewriter text ── */}
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 1, height: 52 }}>
        {letters.map((l, i) => (
          <span key={i}
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-1px',
              fontFamily: 'Sora, sans-serif',
              opacity:   phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.7)',
              transition: `opacity 0.35s ease ${i * 0.07}s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s`,
              textShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}>
            {l}
          </span>
        ))}
      </div>

      {/* ── Envelope + tagline ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        marginTop: 16,
        opacity:   phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ animation: phase >= 3 ? 'envSwing 2s ease-in-out infinite' : 'none' }}>
          <EnvelopeSVG />
        </div>
        <p style={{
          color: 'rgba(255,240,220,0.85)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'Sora, sans-serif',
        }}>
          Same route · Shared journey
        </p>
      </div>

      {/* ── Progress bar (buffering style) ── */}
      <div style={{
        position: 'absolute', bottom: 56,
        left: '50%', transform: 'translateX(-50%)',
        width: 140,
        opacity: phase >= 3 ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        {/* Track */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.2)',
          borderRadius: 99, overflow: 'hidden',
        }}>
          {/* Fill */}
          <div style={{
            height: '100%', background: 'white',
            borderRadius: 99,
            width: `${progress}%`,
            transition: 'width 0.08s linear',
            boxShadow: '0 0 8px rgba(255,255,255,0.6)',
          }} />
        </div>
        {/* Percentage */}
        <p style={{
          color: 'rgba(255,255,255,0.5)', fontSize: 10,
          textAlign: 'center', marginTop: 6,
          fontFamily: 'Sora, sans-serif', fontWeight: 600,
          letterSpacing: '0.08em',
        }}>
          {Math.round(progress)}%
        </p>
      </div>

      <style>{`
        @keyframes birdHover {
          0%,100% { transform: translateY(0px);   }
          50%      { transform: translateY(-10px); }
        }
        @keyframes envSwing {
          0%,100% { transform: rotate(-6deg);  }
          50%      { transform: rotate(6deg);   }
        }
      `}</style>
    </div>
  );
}
