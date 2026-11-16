import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { uploadImageToStorage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { ChevronLeft, Upload, Camera, CheckCircle, Clock, XCircle, Shield, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { IdCard } from 'lucide-react';

// Steps: 1=ID Front  2=ID Back  3=Selfie  4=Done
const STEPS = ['ID Front', 'ID Back', 'Selfie', 'Done'];

export default function KYCPage() {
  const navigate  = useNavigate();
  const isDesktopWeb = useDesktopWeb();
  const [status,   setStatus]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState(1);
  const [uploading,setUploading]= useState(false);

  // Previews for each uploaded file
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview,  setBackPreview]  = useState(null);
  const [selfiePreview,setSelfiePreview]= useState(null);

  useEffect(() => {
    api.get('/kyc/status')
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doUpload = async (file, folder, endpoint, bodyKey, onSuccess) => {
    setUploading(true);
    try {
      const url = await uploadImageToStorage(file, folder);
      await api.post(endpoint, { [bodyKey]: url });
      onSuccess(url);
    } catch (err) {
      const msg = err?.code === 'storage/unauthorized'
        ? 'Storage permission denied — contact support'
        : err?.message?.includes('Firebase')
          ? 'Upload failed: check your internet connection'
          : err.response?.data?.message || 'Upload failed — try again';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const uploadFront = (file) => doUpload(
    file, 'kyc-documents', '/kyc/upload', 'documentUrl',
    (url) => { setFrontPreview(url); toast.success('Front uploaded ✓'); setStep(2); }
  );

  const uploadBack = (file) => doUpload(
    file, 'kyc-documents', '/kyc/upload', 'documentBackUrl',
    (url) => { setBackPreview(url); toast.success('Back uploaded ✓'); setStep(3); }
  );

  const uploadSelfie = (file) => doUpload(
    file, 'kyc-selfies', '/kyc/selfie', 'selfieUrl',
    (url) => {
      setSelfiePreview(url);
      toast.success('Selfie uploaded ✓');
      setStep(4);
      setStatus(s => ({ ...s, kycStatus: 'pending', kycSubmittedAt: new Date().toISOString() }));
    }
  );

  if (loading) return (
    <div className="px-4 py-5 animate-pulse space-y-3">
      <div className="h-6 bg-stone-100 rounded w-1/2" />
      <div className="h-32 bg-stone-100 rounded-2xl" />
    </div>
  );

  const kycStatus = status?.kycStatus || 'none';

  const wizard = kycStatus !== 'verified' && (
        <div className="card p-5 space-y-5">

          {/* Step progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, idx) => {
              const s = idx + 1;
              const done = step > s;
              const active = step === s;
              return (
                <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border-2 transition-all ${
                    done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                    active ? 'bg-orange-500 border-orange-500 text-white' :
                             'border-stone-200 text-stone-400'
                  }`}>
                    {done ? '✓' : s}
                  </div>
                  {s < STEPS.length && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-300' : 'bg-stone-100'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-stone-400 text-center -mt-2">
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </p>

          {/* ── Step 1: ID Front ── */}
          {step === 1 && (
            <UploadStep
              title="Upload ID Document — Front"
              subtitle="Aadhaar · PAN · Passport · Driving Licence"
              hint="Clear photo of the front side with your name and photo visible"
              preview={frontPreview}
              uploading={uploading}
              accept="image/*,application/pdf"
              icon={<Upload size={28} className="text-orange-400" />}
              color="orange"
              onFile={uploadFront}
              onRetake={() => setFrontPreview(null)}
            />
          )}

          {/* ── Step 2: ID Back ── */}
          {step === 2 && (
            <div className="space-y-4">
              <UploadStep
                title="Upload ID Document — Back"
                subtitle="Clear photo of the back side"
                hint="Required for Aadhaar. For PAN/Passport you can skip."
                preview={backPreview}
                uploading={uploading}
                accept="image/*,application/pdf"
                icon={<RotateCcw size={28} className="text-violet-400" />}
                color="violet"
                onFile={uploadBack}
                onRetake={() => setBackPreview(null)}
              />
              <button onClick={() => setStep(3)}
                className="w-full py-2.5 rounded-xl border border-stone-200 text-sm text-stone-500 font-medium active:scale-95 transition-all hover:bg-stone-50">
                Skip — not applicable for my document
              </button>
              <button onClick={() => setStep(1)} className="btn-ghost w-full text-sm text-stone-400">
                ← Back
              </button>
            </div>
          )}

          {/* ── Step 3: Selfie ── */}
          {step === 3 && (
            <div className="space-y-4">
              <UploadStep
                title="Take a Live Selfie"
                subtitle="Face clearly visible · good lighting · no glasses"
                hint="Must match your ID document photo"
                preview={selfiePreview}
                uploading={uploading}
                accept="image/*"
                capture="user"
                icon={<Camera size={28} className="text-blue-400" />}
                color="blue"
                onFile={uploadSelfie}
                onRetake={() => setSelfiePreview(null)}
              />
              <button onClick={() => setStep(2)} className="btn-ghost w-full text-sm text-stone-400">
                ← Back
              </button>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div className="text-center space-y-3 py-4">
              <div className="text-5xl">🎉</div>
              <h3 className="font-black text-stone-900">Documents Submitted!</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                We'll verify your identity within 24 hours.<br />
                You'll be notified once approved.
              </p>
              {/* Preview summary */}
              <div className="flex justify-center gap-2 mt-2">
                {frontPreview  && <PreviewThumb src={frontPreview}  label="Front" />}
                {backPreview   && <PreviewThumb src={backPreview}   label="Back"  />}
                {selfiePreview && <PreviewThumb src={selfiePreview} label="Selfie"/>}
              </div>
              <button onClick={() => navigate(-1)} className="btn-primary w-full mt-2">Done</button>
            </div>
          )}
        </div>
  );

  // ── Desktop browser layout (never used by the Android app) ──
  if (isDesktopWeb) {
    return (
      <div className="space-y-6">
        <PageHeader title="Identity verification"
          sub="Verified travellers can post trips, and senders see an ID-verified badge on your profile." />
        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          <div className="space-y-5 min-w-0 max-w-2xl">
            <StatusCard kycStatus={kycStatus} kycSubmittedAt={status?.kycSubmittedAt} />
            {wizard}
            {kycStatus === 'verified' && (
              <Card className="p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">You're all set</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">Your identity is verified, so you can post trips.</p>
                </div>
                <button type="button" onClick={() => navigate('/app', { state: { intent: 'trip' } })} className={`${btn.primary} ${btn.md}`}>Post a trip</button>
              </Card>
            )}
          </div>
          <aside className="space-y-5 sticky top-24">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">What you'll need</h3>
              <ul className="mt-3 space-y-2.5 text-[13px] text-slate-600">
                <li className="flex gap-2.5"><IdCard size={16} className="text-slate-400 shrink-0 mt-0.5" /> A government ID: Aadhaar, PAN, passport or driving licence</li>
                <li className="flex gap-2.5"><RotateCcw size={16} className="text-slate-400 shrink-0 mt-0.5" /> The back of the ID, if it has one (required for Aadhaar)</li>
                <li className="flex gap-2.5"><Camera size={16} className="text-slate-400 shrink-0 mt-0.5" /> A clear selfie that matches your ID photo</li>
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Why we verify</h3>
              <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
                Kabutar connects people who haven't met. Verifying travellers before they post trips helps senders decide who to trust with their parcels.
              </p>
              <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
                Documents are reviewed by the Kabutar team and aren't shown on your public profile.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 -ml-1.5">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-stone-900">KYC Verification</h1>
      </div>

      {/* Status banner */}
      <StatusCard kycStatus={kycStatus} kycSubmittedAt={status?.kycSubmittedAt} />

      {/* Upload wizard — hide if already verified */}
      {wizard}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function UploadStep({ title, subtitle, hint, preview, uploading, accept, capture, icon, color, onFile, onRetake }) {
  const colors = {
    orange: { border: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50', ring: 'ring-orange-400' },
    violet: { border: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50', ring: 'ring-violet-400' },
    blue:   { border: 'border-blue-200   hover:border-blue-400   hover:bg-blue-50',   ring: 'ring-blue-400'   },
  };
  const c = colors[color] || colors.orange;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-stone-900 text-sm">{title}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
        {hint && <p className="text-[11px] text-stone-400 mt-1 bg-stone-50 px-3 py-1.5 rounded-xl">{hint}</p>}
      </div>

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-stone-200">
          <img src={preview} alt="preview" className="w-full object-cover max-h-48" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <button onClick={onRetake}
              className="bg-white text-stone-800 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
              <RotateCcw size={13} /> Retake
            </button>
          </div>
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Uploaded
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${uploading ? 'border-stone-200 opacity-60 pointer-events-none' : c.border}`}>
          {uploading ? (
            <>
              <svg className="animate-spin h-8 w-8 text-stone-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p className="text-sm font-semibold text-stone-500">Uploading to secure storage…</p>
            </>
          ) : (
            <>
              {icon}
              <div className="text-center">
                <p className="text-sm font-semibold text-stone-700">Tap to upload</p>
                <p className="text-xs text-stone-400 mt-0.5">JPG, PNG or PDF · Max 5MB</p>
              </div>
            </>
          )}
          <input
            type="file"
            accept={accept}
            capture={capture}
            className="hidden"
            disabled={uploading}
            onChange={e => e.target.files[0] && onFile(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}

function PreviewThumb({ src, label }) {
  return (
    <div className="text-center">
      <img src={src} alt={label} className="w-16 h-16 object-cover rounded-xl border border-stone-200 mx-auto" />
      <p className="text-[10px] text-stone-400 mt-1">{label}</p>
    </div>
  );
}

function StatusCard({ kycStatus, kycSubmittedAt }) {
  const configs = {
    none:     { icon: <Shield size={20} className="text-stone-400" />,       bg: 'bg-stone-50 border-stone-200',   title: 'Not Verified',            desc: 'Complete KYC to build trust and post trips.' },
    pending:  { icon: <Clock size={20} className="text-amber-500" />,        bg: 'bg-amber-50 border-amber-200',   title: 'Under Review ⏳',          desc: kycSubmittedAt ? `Submitted ${format(new Date(kycSubmittedAt), 'dd MMM yyyy')} · review within 24h` : 'Your documents are being reviewed.' },
    verified: { icon: <CheckCircle size={20} className="text-emerald-500" />,bg: 'bg-emerald-50 border-emerald-200',title: 'KYC Verified ✓',           desc: 'Your identity is verified. You can now post trips!' },
    rejected: { icon: <XCircle size={20} className="text-red-500" />,        bg: 'bg-red-50 border-red-200',       title: 'Verification Rejected',   desc: 'Documents not accepted. Please resubmit with clearer photos.' },
  };
  const cfg = configs[kycStatus] || configs.none;
  return (
    <div className={`card p-4 flex items-start gap-3 border ${cfg.bg}`}>
      <div className="mt-0.5 shrink-0">{cfg.icon}</div>
      <div>
        <div className="font-bold text-stone-900 text-sm">{cfg.title}</div>
        <div className="text-xs text-stone-500 mt-0.5">{cfg.desc}</div>
      </div>
    </div>
  );
}
