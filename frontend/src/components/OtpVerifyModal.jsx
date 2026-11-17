import { useState, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { KeyRound, Send } from 'lucide-react';
import { Sheet } from './mobile/ui';
import { m } from './mobile/styles';

// Traveller side of a handover. The traveller asks Kabutar to send a code to
// the sender; the sender (or the recipient they share it with) reads it out at
// the handover, and the traveller enters it here. The traveller never sees the
// code until it is given to them in person.
export default function OtpVerifyModal({ parcel, type, onClose, onSuccess }) {
  const [step, setStep]       = useState('request'); // request | enter
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const refs = useRef([]);

  const label = type === 'pickup' ? 'Pickup' : 'Delivery';
  const senderName = (parcel.userId && typeof parcel.userId === 'object' && parcel.userId.name?.split(' ')[0]) || 'the sender';
  const giver = type === 'pickup' ? senderName : `the person receiving it (${senderName} shares the code with them)`;

  const requestCode = async () => {
    setLoading(true);
    try {
      await api.post(`/otp/${type}/generate`, { parcelId: parcel._id });
      toast.success(`Code sent to ${senderName}`);
      setOtp(['', '', '', '', '', '']);
      setStep('enter');
      setTimeout(() => refs.current[0]?.focus(), 150);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      const { data } = await api.post(`/otp/${type}/verify`, { parcelId: parcel._id, otp: code });
      toast.success(`${label} confirmed`);
      onSuccess(data.parcel);
      onClose();
    } catch (err) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
      toast.error(err.response?.data?.message || 'Wrong code');
      if (err.response?.status === 429) setStep('request'); // code cancelled — needs a new one
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (val, idx) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const digitBox = 'w-full h-14 text-center text-[22px] font-semibold rounded-xl border outline-none transition-colors border-slate-200 focus:border-kb-500 focus:ring-4 focus:ring-kb-100';

  return (
    <Sheet title={`Confirm ${label.toLowerCase()}`} onClose={onClose}
      footer={step === 'request'
        ? <button type="button" onClick={requestCode} disabled={loading} className={`${m.btnPrimary} w-full`}><Send size={17} /> {loading ? 'Sending…' : `Send code to ${senderName}`}</button>
        : (
          <div className="flex gap-3">
            <button type="button" onClick={requestCode} disabled={loading} className={`${m.btnSecondary} flex-1`}>Resend code</button>
            <button type="button" onClick={verify} disabled={loading || otp.join('').length !== 6} className={`${m.btnPrimary} flex-[2]`}>
              <KeyRound size={17} /> {loading ? 'Checking…' : `Confirm ${label.toLowerCase()}`}
            </button>
          </div>
        )}>
      {step === 'request' ? (
        <div>
          <p className="text-[15px] text-slate-600">Confirm the {label.toLowerCase()} in person with a one-time code.</p>
          <ol className="mt-4 space-y-3">
            {[
              `We send a 6-digit code to ${senderName}`,
              `When you meet, ${giver} reads it out to you`,
              'Enter it here to confirm the handover',
            ].map((t, i) => (
              <li key={t} className="flex gap-3 text-[14px] text-slate-700">
                <span className="w-6 h-6 rounded-full border border-slate-300 text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-slate-500">Only request the code when you're about to meet. It's valid for 10 minutes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[15px] text-slate-600">
            We've sent the code to {senderName}. Ask {type === 'pickup' ? 'them' : 'for it'} at the handover and enter it below.
          </p>
          <div className={`grid grid-cols-6 gap-2 ${shaking ? 'animate-bounce' : ''}`}>
            {otp.map((d, i) => (
              <input key={i} ref={el => (refs.current[i] = el)} className={digitBox} aria-label={`Digit ${i + 1}`}
                value={d} onChange={e => handleDigit(e.target.value, i)} onKeyDown={e => handleKey(e, i)}
                inputMode="numeric" maxLength={1} autoFocus={i === 0} />
            ))}
          </div>
          <p className="text-[13px] text-slate-500">The code expires after 10 minutes or 5 wrong attempts.</p>
        </div>
      )}
    </Sheet>
  );
}
