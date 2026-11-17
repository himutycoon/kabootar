import { useState, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Copy, Check, KeyRound } from 'lucide-react';
import { Sheet } from './mobile/ui';
import { m } from './mobile/styles';

export default function OtpVerifyModal({ parcel, type, onClose, onSuccess }) {
  const [step, setStep]       = useState('generate');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState(''); // shown to traveler in MVP
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied]   = useState(false);
  const refs = useRef([]);

  const label = type === 'pickup' ? 'Pickup' : 'Delivery';

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/otp/${type}/generate`, { parcelId: parcel._id });
      // In production this OTP is SMS'd to the sender.
      // For MVP (no SMS): show it here so traveler can relay it verbally.
      setGeneratedOtp(data.otp || '');
      setStep('verify');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const copyOtp = () => {
    navigator.clipboard.writeText(generatedOtp).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-fill the input boxes if OTP is shown (dev convenience)
  const autoFill = () => {
    if (!generatedOtp) return;
    const digits = generatedOtp.split('');
    setOtp(digits);
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
      toast.error(err.response?.data?.message || 'Invalid OTP');
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
      footer={step === 'generate'
        ? <button type="button" onClick={generate} disabled={loading} className={`${m.btnPrimary} w-full`}><KeyRound size={18} /> {loading ? 'Creating code…' : `Create ${label.toLowerCase()} code`}</button>
        : (
          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep('generate'); setOtp(['', '', '', '', '', '']); setGeneratedOtp(''); }} className={`${m.btnSecondary} flex-1`}>New code</button>
            <button type="button" onClick={verify} disabled={loading} className={`${m.btnPrimary} flex-[2]`}>{loading ? 'Confirming…' : `Confirm ${label.toLowerCase()}`}</button>
          </div>
        )}>
      {step === 'generate' ? (
        <div>
          <p className="text-[15px] text-slate-600">Confirm the {label.toLowerCase()} in person with a one-time code.</p>
          <ol className="mt-4 space-y-3">
            {[
              'Create a 6-digit code below',
              `Share it with the ${type === 'pickup' ? 'sender' : 'receiver'} when you meet`,
              'They read it back to you, and you enter it to confirm',
            ].map((t, i) => (
              <li key={t} className="flex gap-3 text-[14px] text-slate-700">
                <span className="w-6 h-6 rounded-full border border-slate-300 text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="space-y-5">
          {generatedOtp && (
            <div className="border border-kb-200 bg-kb-50 rounded-2xl p-4">
              <p className="text-[13px] font-semibold text-kb-700">Code to share with the {type === 'pickup' ? 'sender' : 'receiver'}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[28px] font-semibold tracking-[0.3em] text-slate-900 font-mono">{generatedOtp}</span>
                <button type="button" onClick={copyOtp} className={`${m.btnSmall} ml-auto border border-kb-200 bg-white text-kb-700`}>
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-semibold text-slate-800">Enter the code they read back</p>
              {generatedOtp && <button type="button" onClick={autoFill} className="text-[13px] font-semibold text-kb-600">Auto-fill</button>}
            </div>
            <div className={`grid grid-cols-6 gap-2 ${shaking ? 'animate-bounce' : ''}`}>
              {otp.map((d, i) => (
                <input key={i} ref={el => (refs.current[i] = el)} className={digitBox} aria-label={`Digit ${i + 1}`}
                  value={d} onChange={e => handleDigit(e.target.value, i)} onKeyDown={e => handleKey(e, i)}
                  inputMode="numeric" maxLength={1} autoFocus={i === 0} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
