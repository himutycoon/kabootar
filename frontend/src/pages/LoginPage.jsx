import { useState, useRef, useEffect } from 'react';
import { auth } from '../lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  PhoneAuthProvider,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, ChevronLeft, Shield, RotateCcw, Edit2, Phone } from 'lucide-react';
import LegalModal from '../components/LegalModal';

const isNativeApp = Capacitor.isNativePlatform();
const STEPS = { HOME: 'home', PHONE: 'phone', OTP: 'otp', NAME: 'name' };
const RESEND_SECS = 30;

export default function LoginPage() {
  const [step, setStep]             = useState(STEPS.HOME);
  const [legalModal, setLegalModal] = useState(null);
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [name, setName]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [idToken, setIdToken]       = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [confirmResult,  setConfirmResult]  = useState(null);

  const otpRefs     = useRef([]);
  const timerRef    = useRef(null);
  const cancelledRef = useRef(false); // prevents stale callbacks from updating state after "change number"
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startResendTimer = () => {
    setResendTimer(RESEND_SECS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };

  const redirectAfterLogin = (res) => {
    if (res?.requiresProfileCompletion) navigate('/complete-profile', { replace: true });
    else navigate(location.state?.from || '/', { replace: true });
  };

  const finishLogin = async (token, displayName = null) => {
    try {
      const res = await login(token, displayName);
      if (res.success) { toast.success('Welcome! 🕊️'); redirectAfterLogin(res); }
      else if (res.newUser) { setIdToken(token); setName(displayName || ''); setStep(STEPS.NAME); }
      else toast.error(res.message || 'Login failed. Check your connection.');
    } catch { toast.error('Cannot reach server. Check internet.'); }
  };

  // ── Back navigation — goes PHONE→HOME, OTP→PHONE ──────────────────────────
  const handleBack = () => {
    cancelledRef.current = true; // silence any in-flight callbacks
    clearInterval(timerRef.current);
    if (step === STEPS.OTP) {
      setOtp(['', '', '', '', '', '']);
      setVerificationId(null);
      setConfirmResult(null);
      setLoading(false);
      setOtpSending(false);
      setResendTimer(0);
      setStep(STEPS.PHONE);
      // reset cancelled flag after transition so next send works
      setTimeout(() => { cancelledRef.current = false; }, 300);
    } else {
      setStep(STEPS.HOME);
      setPhone('');
      setLoading(false);
      setOtpSending(false);
      setTimeout(() => { cancelledRef.current = false; }, 300);
    }
  };

  // ── Google ─────────────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      if (isNativeApp) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize({
          clientId: '705500228139-epbriuarbpoqhpgb3051efn4kgevidvt.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result     = await signInWithCredential(auth, credential);
        const token      = await result.user.getIdToken();
        await finishLogin(token, result.user.displayName);
      } else {
        const provider = new GoogleAuthProvider();
        const result   = await signInWithPopup(auth, provider);
        const token    = await result.user.getIdToken();
        await finishLogin(token, result.user.displayName);
      }
    } catch (err) {
      const cancelled = err.code === 'auth/popup-closed-by-user' || err.message === 'User cancelled.';
      if (!cancelled) toast.error(`Google sign-in: ${err.code || err.message || 'failed'}`);
    } finally { setGoogleLoading(false); }
  };

  // ── Phone OTP ──────────────────────────────────────────────────────────────
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  const sendOtp = async () => {
    if (fullPhone.replace(/\D/g, '').length < 12) {
      toast.error('Enter a valid 10-digit mobile number'); return;
    }
    cancelledRef.current = false;
    setLoading(true);
    setOtpSending(true);

    if (isNativeApp) {
      let codeSentHandle = null, autoHandle = null, failedHandle = null;
      const cleanup = () => { codeSentHandle?.remove?.(); autoHandle?.remove?.(); failedHandle?.remove?.(); };
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

        codeSentHandle = await FirebaseAuthentication.addListener('phoneCodeSent', (ev) => {
          cleanup();
          if (cancelledRef.current) return;
          setVerificationId(ev.verificationId);
          setOtpSending(false);
          setLoading(false);
          setStep(STEPS.OTP);
          startResendTimer();
          setTimeout(() => otpRefs.current[0]?.focus(), 200);
        });

        autoHandle = await FirebaseAuthentication.addListener('phoneVerificationCompleted', (ev) => {
          if (ev.verificationCode && ev.verificationId) {
            cleanup();
            if (cancelledRef.current) return;
            setVerificationId(ev.verificationId);
            setOtp(ev.verificationCode.split(''));
            setOtpSending(false);
            setLoading(false);
            setStep(STEPS.OTP);
            setTimeout(() => verifyNative(ev.verificationId, ev.verificationCode), 300);
          }
        });

        failedHandle = await FirebaseAuthentication.addListener('phoneVerificationFailed', (ev) => {
          cleanup();
          if (cancelledRef.current) return;
          setOtpSending(false);
          setLoading(false);
          toast.error(ev.message || 'Could not send OTP — try again');
        });

        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: fullPhone, timeout: 60 });
      } catch (err) {
        cleanup();
        if (cancelledRef.current) return;
        setOtpSending(false);
        setLoading(false);
        toast.error(err.code || err.message || 'OTP failed');
      }
      return;
    }

    // Web: invisible reCAPTCHA
    try {
      try { window.recaptchaVerifier?.clear?.(); } catch {}
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      if (cancelledRef.current) return;
      setConfirmResult(result);
      setOtpSending(false);
      setStep(STEPS.OTP);
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err) {
      try { window.recaptchaVerifier?.clear?.(); } catch {}
      window.recaptchaVerifier = null;
      if (cancelledRef.current) return;
      setOtpSending(false);
      const msg =
        err.code === 'auth/invalid-phone-number' ? 'Invalid phone number.' :
        err.code === 'auth/too-many-requests'     ? 'Too many attempts — try later.' :
        `OTP error: ${err.code || err.message}`;
      toast.error(msg);
    } finally { if (!cancelledRef.current) setLoading(false); }
  };

  const verifyNative = async (vid, code) => {
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(vid || verificationId, code);
      const result     = await signInWithCredential(auth, credential);
      const token      = await result.user.getIdToken();
      await finishLogin(token);
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-verification-code' ? 'Wrong OTP — check and retry.' :
        err.code === 'auth/code-expired'               ? 'OTP expired — tap Resend.' :
        `Verify error: ${err.code || err.message}`;
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally { setLoading(false); }
  };

  const verifyWeb = async (code) => {
    setLoading(true);
    try {
      const result = await confirmResult.confirm(code);
      const token  = await result.user.getIdToken();
      await finishLogin(token);
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-verification-code' ? 'Wrong OTP — check and retry.' :
        err.code === 'auth/code-expired'               ? 'OTP expired — tap Resend.' :
        `Verify error: ${err.code || err.message}`;
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally { setLoading(false); }
  };

  const verifyOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    isNativeApp ? verifyNative(verificationId, code) : verifyWeb(code);
  };

  const handleOtpChange = (val, idx) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    else if (digit && idx === 5 && next.every(d => d !== '')) {
      otpRefs.current[5]?.blur();
      setTimeout(() => isNativeApp ? verifyNative(verificationId, next.join('')) : verifyWeb(next.join('')), 120);
    }
  };
  const handleOtpKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setOtp(['', '', '', '', '', '']);
    await sendOtp();
  };

  const submitName = async () => {
    if (!name.trim() || name.trim().length < 2) { toast.error('Enter your full name'); return; }
    setLoading(true);
    const res = await login(idToken, name.trim());
    setLoading(false);
    if (res.success) { toast.success('Welcome to Kabutar! 🕊️'); redirectAfterLogin(res); }
    else toast.error(res.message || 'Try again.');
  };

  // ── HOME screen ─────────────────────────────────────────────────────────────
  if (step === STEPS.HOME) {
    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(160deg, #f97316 0%, #ea580c 50%, #9a3412 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute top-1/3 -left-20 w-48 h-48 rounded-full bg-white/8" />
          <div className="absolute bottom-1/4 right-0 w-32 h-32 rounded-full bg-white/6" />
        </div>

        {/* Brand block */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 pt-16 pb-4">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl mb-5 border-4 border-white/25 bg-white/15 flex items-center justify-center">
            <img src="/logo.png" alt="Kabutar" className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:52px">🕊️</span>'; }} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1.5">kabutar</h1>
          <p className="text-orange-100 text-center text-sm font-medium leading-relaxed max-w-[260px]">
            Travel together · Deliver together
          </p>

          {/* Trust pills */}
          <div className="flex gap-2 mt-6 flex-wrap justify-center">
            {['✅ OTP Verified', '⭐ Trust Ratings', '🔐 KYC Secured'].map(t => (
              <span key={t} className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/20">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Action sheet */}
        <div className="relative z-10 mx-4 mb-8 bg-white/12 backdrop-blur-md rounded-3xl border border-white/20 p-4 space-y-2.5">
          <button onClick={signInWithGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl py-3.5 font-semibold text-stone-800 text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-70">
            {googleLoading ? <Spinner dark /> : <><GoogleIcon /><span>Continue with Google</span></>}
          </button>
          <button onClick={() => { setStep(STEPS.PHONE); setPhone(''); }}
            className="w-full flex items-center justify-center gap-3 bg-white/20 border border-white/30 rounded-2xl py-3.5 font-semibold text-white text-sm active:scale-[0.98] transition-all">
            <Phone size={16} /> Continue with Phone
          </button>
          <p className="text-center text-white/45 text-[11px] pt-1">
            By continuing you agree to our{' '}
            <button onClick={() => setLegalModal('terms')} className="underline text-white/65">Terms</button>
            {' '}&amp;{' '}
            <button onClick={() => setLegalModal('privacy')} className="underline text-white/65">Privacy Policy</button>
          </p>
        </div>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </div>
    );
  }

  // ── PHONE / OTP / NAME screens ───────────────────────────────────────────────
  const stepLabel  = step === STEPS.PHONE ? 'Enter Number' : step === STEPS.OTP ? 'Verify OTP' : 'Your Name';
  const stepNumber = step === STEPS.PHONE ? 1 : step === STEPS.OTP ? 2 : 3;

  return (
    // overflow-y-auto lets the page scroll when the keyboard pushes content up on mobile web
    <div className="min-h-screen flex flex-col bg-stone-50 overflow-y-auto">

      {/* Orange header — APK gets extra top padding for status bar; web just 24px */}
      <div className="px-5 pb-8 relative overflow-hidden"
        style={{ paddingTop: isNativeApp ? 'calc(env(safe-area-inset-top, 0px) + 56px)' : '24px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
        {/* Decorative circle */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />

        {/* Back button + logo */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <button onClick={handleBack}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all active:scale-90">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-white text-base">🕊️</span>
            <span className="font-black text-white text-base tracking-tight">kabutar</span>
          </div>
          {/* Step indicator pills */}
          <div className="ml-auto flex items-center gap-1.5">
            {[1, 2].map(n => (
              <div key={n} className={`rounded-full transition-all duration-300 ${
                n === stepNumber
                  ? 'w-5 h-2 bg-white'
                  : n < stepNumber
                    ? 'w-2 h-2 bg-white/70'
                    : 'w-2 h-2 bg-white/30'
              }`} />
            ))}
          </div>
        </div>

        {/* Step title */}
        <div className="relative z-10">
          <p className="text-orange-200 text-xs font-semibold uppercase tracking-wider mb-1">
            Step {Math.min(stepNumber, 2)} of 2
          </p>
          <h2 className="text-2xl font-black text-white">{stepLabel}</h2>
          <p className="text-orange-100/80 text-sm mt-1 leading-relaxed">
            {step === STEPS.PHONE && "We'll send a 6-digit verification code"}
            {step === STEPS.OTP   && (
              <span className="flex items-center gap-1.5 flex-wrap">
                Code sent to{' '}
                <span className="font-bold text-white">+91 {phone}</span>
                {/* Inline change number — always visible */}
                <button onClick={handleBack}
                  className="flex items-center gap-0.5 text-orange-200 hover:text-white text-xs font-semibold underline underline-offset-2 transition-colors">
                  <Edit2 size={11} /> Change
                </button>
              </span>
            )}
            {step === STEPS.NAME && 'Help others know who you are'}
          </p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 px-5 pt-6 pb-8 space-y-4">
        <div id="recaptcha-container" />

        {/* ── PHONE STEP ── */}
        {step === STEPS.PHONE && (
          <>
            <div className="flex gap-2.5 items-stretch">
              <div className="shrink-0 bg-white border border-stone-200 rounded-2xl flex items-center justify-center px-3.5 shadow-sm">
                <span className="text-stone-600 font-bold text-sm">🇮🇳 +91</span>
              </div>
              <input
                className="flex-1 min-w-0 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-lg font-bold tracking-widest text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-stone-300 placeholder:font-normal placeholder:tracking-normal shadow-sm"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && phone.length === 10 && sendOtp()}
                onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                type="tel" inputMode="numeric" autoFocus maxLength={10}
              />
            </div>

            {/* Character count hint */}
            <p className={`text-xs text-right font-medium transition-colors ${phone.length === 10 ? 'text-emerald-500' : 'text-stone-400'}`}>
              {phone.length}/10
            </p>

            <button
              onClick={sendOtp}
              disabled={loading || phone.length < 10}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: phone.length === 10 ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#d1d5db', boxShadow: phone.length === 10 ? '0 6px 20px rgba(249,115,22,0.4)' : 'none' }}>
              {otpSending ? (
                <>
                  <Spinner />
                  <span>Sending OTP</span>
                  <SendingDots />
                </>
              ) : loading ? <Spinner /> : (
                <><span>Get OTP</span><ArrowRight size={18} /></>
              )}
            </button>

            {/* Cancel during send — visible immediately when sending */}
            {otpSending && (
              <button onClick={handleBack}
                className="w-full py-3 text-sm text-stone-400 hover:text-orange-500 font-medium transition-colors text-center">
                ← Wrong number? Tap to go back
              </button>
            )}
          </>
        )}

        {/* ── OTP STEP ── */}
        {step === STEPS.OTP && (
          <>
            <p className="text-xs text-stone-400 text-center font-medium">
              {loading ? 'Verifying your code…' : 'Auto-fills from SMS · or enter below'}
            </p>

            {/* 6-digit boxes — grid so they shrink on narrow screens instead of overflowing */}
            <div className="grid grid-cols-6 gap-1.5 w-full max-w-xs mx-auto">
              {otp.map((d, i) => (
                <input key={i}
                  ref={el => (otpRefs.current[i] = el)}
                  className={`w-full text-center font-black text-xl border-2 rounded-xl outline-none transition-all bg-white
                    ${loading ? 'opacity-40 pointer-events-none' : ''}
                    ${d
                      ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-sm shadow-orange-100'
                      : 'border-stone-200 text-stone-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                    }`}
                  style={{ aspectRatio: '1 / 1.15' }}
                  value={d}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKey(e, i)}
                  onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  inputMode="numeric" maxLength={1}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  autoFocus={i === 0}
                  disabled={loading}
                />
              ))}
            </div>

            {/* Verify or verifying state */}
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-sm text-stone-500 font-medium">Verifying your OTP…</span>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={verifyOtp}
                  disabled={otp.join('').length !== 6}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}>
                  <Shield size={17} /> Verify &amp; Continue
                </button>

                {/* Resend + change number — clearly laid out */}
                <div className="flex items-center justify-between px-1 pt-1">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-stone-400">
                      Resend in <span className="font-bold text-orange-500">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button onClick={resendOtp}
                      className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors active:scale-95">
                      <RotateCcw size={13} /> Resend OTP
                    </button>
                  )}

                  {/* Change number — always visible on OTP screen */}
                  <button onClick={handleBack}
                    className="flex items-center gap-1 text-sm text-stone-400 hover:text-orange-500 font-medium transition-colors active:scale-95">
                    <Edit2 size={12} /> Change number
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── NAME STEP ── */}
        {step === STEPS.NAME && (
          <>
            <p className="text-xs text-stone-400 text-center">This is shown to other Kabutar users</p>
            <input
              className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-lg font-bold text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-stone-300 placeholder:font-normal shadow-sm"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitName()}
              autoFocus
            />
            <button
              onClick={submitName}
              disabled={loading || name.trim().length < 2}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}>
              {loading ? <Spinner /> : <><span>Get Started</span><ArrowRight size={18} /></>}
            </button>
          </>
        )}
      </div>

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SendingDots() {
  return (
    <span className="flex gap-0.5 items-end pb-0.5 ml-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-white inline-block"
          style={{ animation: `bounce 0.9s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

function Spinner({ dark = false }) {
  return (
    <svg className="animate-spin h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={dark ? '#374151' : 'white'} strokeWidth="4" />
      <path className="opacity-75" fill={dark ? '#374151' : 'white'} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
