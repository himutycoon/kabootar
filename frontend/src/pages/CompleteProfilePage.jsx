import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { uploadImageToStorage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Camera, Check } from 'lucide-react';

export default function CompleteProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.profileImage || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // If profile is already complete, skip this page
  useEffect(() => {
    if (user?.isProfileComplete) navigate('/', { replace: true });
  }, [user, navigate]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const checks = [
    !!name.trim(),
    phone.length === 10,
    !!(photoPreview),
  ];
  const completedCount = checks.filter(Boolean).length;
  const canSubmit = checks.every(Boolean) && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      // Upload photo to Firebase Storage (persists permanently)
      if (photoFile) {
        const imageUrl = await uploadImageToStorage(photoFile, 'profile-images');
        await api.post('/auth/me/image', { imageUrl });
      }
      // Save name + phone
      await api.patch('/auth/me', { name: name.trim(), phone: `+91${phone}` });
      await refreshUser();
      toast.success('Profile complete. Welcome to Kabutar');
      navigate('/', { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('This phone is already registered to another account');
      } else if (err.response?.status === 400) {
        toast.error(err.response.data?.message || 'Invalid details');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const steps = [['Name', checks[0]], ['Phone', checks[1]], ['Photo', checks[2]]];
  return (
    <div className="min-h-[100dvh] bg-[#FAF9F7] font-inter text-slate-900 flex flex-col sm:items-center sm:justify-center"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
      <div className="w-full sm:max-w-md px-5 sm:px-0">
        <img src="/brand/logo-64.png" alt="" width={36} height={36} className="w-9 h-9 rounded-lg" />
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">Complete your profile</h1>
        <p className="mt-1.5 text-[15px] text-slate-600">A name, phone number and photo help travellers and senders trust you.</p>

        <div className="mt-6 flex gap-2">
          {steps.map(([label, done]) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              <p className={`mt-1.5 text-[12px] font-semibold flex items-center gap-1 ${done ? 'text-emerald-700' : 'text-slate-500'}`}>
                {done && <Check size={12} />} {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add profile photo"
              className="relative shrink-0">
              <span className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center ${photoPreview ? '' : 'bg-slate-100 border-2 border-dashed border-slate-300'}`}>
                {photoPreview
                  ? <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  : <Camera size={24} className="text-slate-400" />}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-kb-500 text-white flex items-center justify-center ring-2 ring-white">
                <Camera size={14} />
              </span>
            </button>
            <div>
              <p className="text-[15px] font-semibold text-slate-900">Profile photo</p>
              <p className="text-[13px] text-slate-500 mt-0.5">{photoPreview ? 'Looks good. Tap to change it.' : 'Required. A clear photo of your face.'}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
          </div>

          <div>
            <label htmlFor="cp-name" className="block text-[13px] font-semibold text-slate-700 mb-1.5">Full name</label>
            <input id="cp-name" className="w-full h-12 px-4 rounded-xl border border-slate-200 text-[15px] outline-none focus:border-kb-500 focus:ring-4 focus:ring-kb-100"
              placeholder="Your name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="cp-phone" className="block text-[13px] font-semibold text-slate-700 mb-1.5">Mobile number</label>
            <div className="flex items-stretch h-12 rounded-xl border border-slate-200 focus-within:border-kb-500 focus-within:ring-4 focus-within:ring-kb-100 overflow-hidden">
              <span className="flex items-center px-3.5 text-[15px] font-semibold text-slate-600 border-r border-slate-200 bg-slate-50">+91</span>
              <input id="cp-phone" className="flex-1 min-w-0 px-3.5 text-[15px] outline-none" placeholder="98765 43210"
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric" autoComplete="tel-national" maxLength={10} />
            </div>
            <p className="text-[13px] text-slate-500 mt-1.5">Used to verify your account. It isn't shown in full to other users.</p>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="mt-5 w-full h-[52px] rounded-xl bg-kb-500 active:bg-kb-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[16px] font-semibold flex items-center justify-center gap-2 transition-colors">
          {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : `Save profile (${completedCount}/3)`}
        </button>
      </div>
    </div>
  );
}
