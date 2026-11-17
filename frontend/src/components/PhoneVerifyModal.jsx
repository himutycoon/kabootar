import { useState, useRef, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Shield, ArrowRight } from 'lucide-react';
import { Sheet } from './mobile/ui';
import { m } from './mobile/styles';

// Props:
//   onClose()          — close the modal
//   onSuccess(user)    — called with updated user after verification
//   prefillPhone       — optional: pre-fill + skip to OTP (for "verify existing" flow)

export default function PhoneVerifyModal({ onClose, onSuccess, prefillPhone }) {
  const { setUser } = useAuth();
  const [step, setStep]         = useState(prefillPhone ? 'sending' : 'phone');
  const [phone, setPhone]       = useState(prefillPhone?.replace('+91', '') || '');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const otpRefs = useRef([]);
  const rcRef   = useRef(null); // recaptcha instance ref

  // If prefillPhone provided, auto-send OTP on mount
  useEffect(() => {
    if (prefillPhone) sendOtp(prefillPhone.replace('+91', ''));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setupRecaptcha = () => {
    if (!rcRef.current) {
      rcRef.current = new RecaptchaVerifier(
        auth,
        'recaptcha-phone-container',
        { size: 'invisible' }
      );
    }
    return rcRef.current;
  };

  const sendOtp = async (phoneDigits = phone) => {
    if (phoneDigits.length !== 10) { toast.error('Enter a valid 10-digit number'); return; }
    const fullPhone = `+91${phoneDigits}`;
    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      const result   = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmResult(result);
      setStep('otp');
      toast.success('Code sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
      rcRef.current = null; // reset so it can be re-created
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      // Firebase confirms OTP — proves user owns the number
      await confirmResult.confirm(code);
      // Tell backend: set phone + isPhoneVerified = true
      const { data } = await api.post('/auth/me/phone', { phone: `+91${phone}` });
      localStorage.setItem('kabootar_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Phone number verified');
      onSuccess?.(data.user);
      onClose();
    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') {
        toast.error('Wrong OTP. Try again.');
      } else {
        toast.error(err.response?.data?.message || 'Verification failed');
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const resend = () => {
    rcRef.current = null;
    setOtp(['', '', '', '', '', '']);
    setStep('phone');
    setConfirmResult(null);
  };

  const handleDigit = (val, idx) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  return (
    <Sheet title={step === 'otp' ? 'Enter the code' : 'Verify your phone'} onClose={onClose}>
      {step === 'phone' && (
        <div className="space-y-4">
          <p className="text-[15px] text-slate-600">We'll text a one-time code to confirm the number is yours. A verified number helps senders trust you.</p>
          <div>
            <label htmlFor="pv-phone" className="block text-[13px] font-semibold text-slate-700 mb-1.5">Mobile number</label>
            <div className="flex items-stretch h-12 rounded-xl border border-slate-200 focus-within:border-kb-500 focus-within:ring-4 focus-within:ring-kb-100 overflow-hidden">
              <span className="flex items-center px-3.5 text-[15px] font-semibold text-slate-600 border-r border-slate-200 bg-slate-50">+91</span>
              <input id="pv-phone" className="flex-1 min-w-0 px-3.5 text-[16px] outline-none" placeholder="98765 43210"
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && sendOtp()} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} autoFocus />
            </div>
          </div>
          <button type="button" onClick={() => sendOtp()} disabled={loading || phone.length !== 10} className={`${m.btnPrimary} w-full`}>
            {loading ? 'Sending…' : <>Send code <ArrowRight size={17} /></>}
          </button>
        </div>
      )}

      {step === 'sending' && <p className="py-6 text-center text-[15px] text-slate-500">Sending a code to +91 {phone}…</p>}

      {step === 'otp' && (
        <div className="space-y-4">
          <p className="text-[15px] text-slate-600">
            Sent to <span className="font-semibold text-slate-900">+91 {phone}</span>{' '}
            <button type="button" onClick={resend} className="text-kb-600 font-semibold">Change</button>
          </p>
          <div className="grid grid-cols-6 gap-2">
            {otp.map((d, i) => (
              <input key={i} ref={el => (otpRefs.current[i] = el)} aria-label={`Digit ${i + 1}`}
                className="w-full h-14 text-center text-[22px] font-semibold rounded-xl border border-slate-200 outline-none focus:border-kb-500 focus:ring-4 focus:ring-kb-100"
                value={d} onChange={e => handleDigit(e.target.value, i)} onKeyDown={e => handleKey(e, i)}
                inputMode="numeric" maxLength={1} autoComplete={i === 0 ? 'one-time-code' : 'off'} autoFocus={i === 0} />
            ))}
          </div>
          <button type="button" onClick={verifyOtp} disabled={loading || otp.join('').length !== 6} className={`${m.btnPrimary} w-full`}>
            <Shield size={17} /> {loading ? 'Verifying…' : 'Verify and save'}
          </button>
          <button type="button" onClick={resend} className="w-full h-11 text-[14px] font-semibold text-slate-600">Didn't get it? Send a new code</button>
        </div>
      )}

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-phone-container" />
    </Sheet>
  );
}
