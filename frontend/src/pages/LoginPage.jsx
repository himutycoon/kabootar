import { createElement, useState, useRef, useEffect } from 'react';
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
import { ArrowRight, ArrowLeft, Shield, RotateCcw, Edit2, Phone, BadgeCheck, MessageCircle, Star } from 'lucide-react';
import { pushBackHandler } from '../lib/backStack';
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
      if (res.success) { toast.success('Welcome to Kabutar'); redirectAfterLogin(res); }
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
      try { window.recaptchaVerifier?.clear?.(); } catch { /* verifier already cleared */ }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      if (cancelledRef.current) return;
      setConfirmResult(result);
      setOtpSending(false);
      setStep(STEPS.OTP);
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err) {
      try { window.recaptchaVerifier?.clear?.(); } catch { /* verifier already cleared */ }
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
    if (res.success) { toast.success('Welcome to Kabutar'); redirectAfterLogin(res); }
    else toast.error(res.message || 'Try again.');
  };

  // Android back on the number/code/name screens steps back instead of exiting
  useEffect(() => {
    if (step === STEPS.HOME) return undefined;
    return pushBackHandler(() => handleBack());
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeTop = { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' };
  const safeBottom = { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' };

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (step === STEPS.HOME) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#FAF9F7] font-inter text-slate-900" style={safeTop}>
        <div className="flex justify-end px-4">
          <button onClick={() => navigate('/app', { replace: true })}
            className="h-10 px-3 rounded-lg text-[14px] font-semibold text-slate-600 active:bg-slate-100">
            Not now
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-6">
          <img src="/brand/logo-128.png" alt="" width={72} height={72} className="w-[72px] h-[72px] rounded-2xl" />
          <h1 className="mt-6 text-[30px] leading-[1.15] font-semibold tracking-[-0.025em]">
            Your journey can <span className="text-kb-500">deliver more.</span>
          </h1>
          <p className="mt-3 text-[16px] text-slate-600 leading-relaxed">
            Send parcels with travellers already heading your way, or earn on trips you're already taking.
          </p>
          <ul className="mt-7 space-y-3.5">
            {[
              [BadgeCheck, 'Travellers verify their ID before posting trips'],
              [MessageCircle, 'Agree the details in the app before you meet'],
              [Star, 'Reviews only come from completed deliveries'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-slate-700">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-kb-600 flex items-center justify-center shrink-0">
                  {createElement(icon, { size: 17 })}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 space-y-3" style={safeBottom}>
          <button onClick={() => { setStep(STEPS.PHONE); setPhone(''); }}
            className="w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 text-white text-[16px] font-semibold flex items-center justify-center gap-2.5">
            <Phone size={18} /> Continue with phone
          </button>
          <button onClick={signInWithGoogle} disabled={googleLoading}
            className="w-full h-[52px] rounded-xl bg-white border border-slate-200 active:bg-slate-50 text-slate-800 text-[16px] font-semibold flex items-center justify-center gap-3 disabled:opacity-70">
            {googleLoading ? <Spinner dark /> : <><GoogleIcon /><span>Continue with Google</span></>}
          </button>
          <p className="text-center text-[12px] text-slate-500 pt-1 leading-relaxed">
            By continuing you agree to our{' '}
            <button onClick={() => setLegalModal('terms')} className="underline underline-offset-2 text-slate-700">Terms</button>
            {' '}and{' '}
            <button onClick={() => setLegalModal('privacy')} className="underline underline-offset-2 text-slate-700">Privacy Policy</button>
          </p>
        </div>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </div>
    );
  }

  // ── Number / code / name screens ────────────────────────────────────────────
  const stepNumber = step === STEPS.PHONE ? 1 : step === STEPS.OTP ? 2 : 3;
  const title = step === STEPS.PHONE ? 'Enter your mobile number'
    : step === STEPS.OTP ? 'Enter the 6-digit code' : 'What should we call you?';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white font-inter text-slate-900 overflow-y-auto" style={safeTop}>
      <div className="flex items-center gap-2 px-4">
        <button onClick={handleBack} aria-label="Back"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100">
          <ArrowLeft size={21} />
        </button>
        {step !== STEPS.NAME && (
          <div className="flex-1 flex gap-1.5 max-w-[120px] ml-auto">
            {[1, 2].map(n => (
              <span key={n} className={`flex-1 h-1 rounded-full transition-colors ${n <= stepNumber ? 'bg-kb-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 px-6 pt-6 pb-8">
        <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">
          {step === STEPS.PHONE && "We'll text you a code to confirm it's you."}
          {step === STEPS.OTP && (
            <>Sent to <span className="font-semibold text-slate-900">+91 {phone}</span>{' '}
              <button onClick={handleBack} className="inline-flex items-center gap-1 text-kb-600 font-semibold">
                <Edit2 size={13} /> Change
              </button>
            </>
          )}
          {step === STEPS.NAME && 'This is shown to travellers and senders you connect with.'}
        </p>

        <div id="recaptcha-container" />

        {/* ── Phone ── */}
        {step === STEPS.PHONE && (
          <div className="mt-8 space-y-4">
            <div className="flex items-stretch h-14 rounded-xl border border-slate-200 focus-within:border-kb-500 focus-within:ring-4 focus-within:ring-kb-100 transition-colors overflow-hidden">
              <span className="flex items-center px-4 text-[17px] font-semibold text-slate-600 border-r border-slate-200 bg-slate-50">+91</span>
              <input
                className="flex-1 min-w-0 px-4 text-[19px] font-semibold tracking-[0.12em] text-slate-900 outline-none placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                placeholder="98765 43210"
                aria-label="Mobile number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && phone.length === 10 && sendOtp()}
                onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus maxLength={10}
              />
            </div>
            <button onClick={sendOtp} disabled={loading || phone.length < 10}
              className="w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[16px] font-semibold flex items-center justify-center gap-2.5 transition-colors">
              {otpSending ? <><Spinner /><span>Sending code</span><SendingDots /></>
                : loading ? <Spinner /> : <><span>Send code</span><ArrowRight size={18} /></>}
            </button>
            {otpSending && (
              <button onClick={handleBack} className="w-full h-11 text-[14px] text-slate-500 font-semibold">
                Wrong number? Go back
              </button>
            )}
          </div>
        )}

        {/* ── Code ── */}
        {step === STEPS.OTP && (
          <div className="mt-8 space-y-5">
            <div className="grid grid-cols-6 gap-2 w-full max-w-sm">
              {otp.map((d, i) => (
                <input key={i}
                  ref={el => (otpRefs.current[i] = el)}
                  aria-label={`Digit ${i + 1}`}
                  className={`w-full h-14 text-center text-[22px] font-semibold rounded-xl border outline-none transition-colors
                    ${loading ? 'opacity-50' : ''}
                    ${d ? 'border-kb-500 bg-kb-50 text-slate-900' : 'border-slate-200 text-slate-900 focus:border-kb-500 focus:ring-4 focus:ring-kb-100'}`}
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
            <p className="text-[13px] text-slate-500">{loading ? 'Checking your code…' : 'The code may fill in automatically from the SMS.'}</p>

            {!loading && (
              <>
                <button onClick={verifyOtp} disabled={otp.join('').length !== 6}
                  className="w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[16px] font-semibold flex items-center justify-center gap-2.5 transition-colors">
                  <Shield size={18} /> Verify and continue
                </button>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-[14px] text-slate-500">Resend code in <span className="font-semibold text-slate-900">{resendTimer}s</span></p>
                  ) : (
                    <button onClick={resendOtp} className="inline-flex items-center gap-1.5 h-10 px-3 text-[14px] font-semibold text-kb-600">
                      <RotateCcw size={14} /> Resend code
                    </button>
                  )}
                </div>
              </>
            )}
            {loading && <div className="flex justify-center py-2"><Spinner dark /></div>}
          </div>
        )}

        {/* ── Name ── */}
        {step === STEPS.NAME && (
          <div className="mt-8 space-y-4">
            <input
              className="w-full h-14 px-4 rounded-xl border border-slate-200 text-[17px] font-semibold text-slate-900 outline-none focus:border-kb-500 focus:ring-4 focus:ring-kb-100 placeholder:text-slate-300 placeholder:font-normal transition-colors"
              placeholder="Your full name"
              aria-label="Full name"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitName()}
              autoFocus
            />
            <button onClick={submitName} disabled={loading || name.trim().length < 2}
              className="w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[16px] font-semibold flex items-center justify-center gap-2.5 transition-colors">
              {loading ? <Spinner /> : <><span>Get started</span><ArrowRight size={18} /></>}
            </button>
          </div>
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
