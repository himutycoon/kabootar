import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { uploadImageToStorage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Upload, Camera, CheckCircle2, Clock, XCircle, Shield, RotateCcw, IdCard, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { ScreenHeader, StepProgress } from '../components/mobile/ui';
import { m } from '../components/mobile/styles';

// Steps: 1=ID front  2=ID back  3=Selfie  4=Done
const STEPS = ['ID front', 'ID back', 'Selfie', 'Submitted'];

export default function KYCPage() {
  const navigate  = useNavigate();
  const isDesktopWeb = useDesktopWeb();
  const [status,   setStatus]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState(1);
  const [uploading,setUploading]= useState(false);

  // Previews for each uploaded file (shown only to the user during upload)
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
    (url) => { setFrontPreview(url); toast.success('Front of ID uploaded'); setStep(2); }
  );

  const uploadBack = (file) => doUpload(
    file, 'kyc-documents', '/kyc/upload', 'documentBackUrl',
    (url) => { setBackPreview(url); toast.success('Back of ID uploaded'); setStep(3); }
  );

  const uploadSelfie = (file) => doUpload(
    file, 'kyc-selfies', '/kyc/selfie', 'selfieUrl',
    (url) => {
      setSelfiePreview(url);
      toast.success('Selfie uploaded');
      setStep(4);
      setStatus(s => ({ ...s, kycStatus: 'pending', kycSubmittedAt: new Date().toISOString() }));
    }
  );

  if (loading) return (
    <div className={isDesktopWeb ? 'space-y-4' : 'px-4 pt-5 space-y-3'}>
      <div className="h-7 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
    </div>
  );

  const kycStatus = status?.kycStatus || 'none';

  const wizard = kycStatus !== 'verified' && (
    <div className={`${m.card} p-4 sm:p-5 space-y-5`}>
      <StepProgress steps={STEPS} current={step - 1} />

      {step === 1 && (
        <UploadStep
          title="Front of your ID"
          subtitle="Aadhaar, PAN, passport or driving licence"
          hint="Make sure your name and photo are clearly visible."
          preview={frontPreview}
          uploading={uploading}
          accept="image/*,application/pdf"
          icon={Upload}
          onFile={uploadFront}
          onRetake={() => setFrontPreview(null)}
        />
      )}

      {step === 2 && (
        <div className="space-y-3">
          <UploadStep
            title="Back of your ID"
            subtitle="Required for Aadhaar"
            hint="PAN and passport holders can skip this step."
            preview={backPreview}
            uploading={uploading}
            accept="image/*,application/pdf"
            icon={RotateCcw}
            onFile={uploadBack}
            onRetake={() => setBackPreview(null)}
          />
          <button onClick={() => setStep(3)} className={`${m.btnSecondary} w-full`}>
            Skip, my ID has no back side
          </button>
          <button onClick={() => setStep(1)} className="w-full h-10 text-[14px] font-semibold text-slate-500">Back</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <UploadStep
            title="Take a selfie"
            subtitle="Face the camera in good light, without sunglasses"
            hint="This must match the photo on your ID."
            preview={selfiePreview}
            uploading={uploading}
            accept="image/*"
            capture="user"
            icon={Camera}
            onFile={uploadSelfie}
            onRetake={() => setSelfiePreview(null)}
          />
          <button onClick={() => setStep(2)} className="w-full h-10 text-[14px] font-semibold text-slate-500">Back</button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-4">
          <span className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center justify-center"><CheckCircle2 size={28} /></span>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Documents submitted</h3>
          <p className="mt-1 text-[14px] text-slate-500 leading-relaxed">
            The Kabutar team will review them. You’ll get an alert as soon as you’re verified.
          </p>
          <button onClick={() => navigate(-1)} className={`${m.btnPrimary} w-full mt-5`}>Done</button>
        </div>
      )}
    </div>
  );

  const needs = (
    <ul className="space-y-3 text-[14px] text-slate-600">
      <li className="flex gap-3"><IdCard size={18} className="text-slate-400 shrink-0 mt-0.5" /> A government ID: Aadhaar, PAN, passport or driving licence</li>
      <li className="flex gap-3"><RotateCcw size={18} className="text-slate-400 shrink-0 mt-0.5" /> The back of the ID, if it has one (required for Aadhaar)</li>
      <li className="flex gap-3"><Camera size={18} className="text-slate-400 shrink-0 mt-0.5" /> A clear selfie that matches your ID photo</li>
    </ul>
  );
  const privacy = 'Documents are reviewed by the Kabutar team and are never shown on your public profile.';

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
              <h3 className="text-sm font-semibold text-slate-900 mb-3">What you'll need</h3>
              {needs}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">Why we verify</h3>
              <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
                Kabutar connects people who haven't met. Verifying travellers before they post trips helps senders decide who to trust with their parcels.
              </p>
              <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{privacy}</p>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  // ── Mobile layout (Android app + phone browsers) ──
  return (
    <div className="px-4 pt-1 pb-4 space-y-4">
      <ScreenHeader title="Identity verification" back />
      <StatusCard kycStatus={kycStatus} kycSubmittedAt={status?.kycSubmittedAt} />

      {kycStatus === 'verified' ? (
        <button type="button" onClick={() => navigate('/app', { state: { intent: 'trip' } })} className={`${m.btnPrimary} w-full`}>Post a trip</button>
      ) : (
        <>
          {step === 1 && kycStatus !== 'pending' && (
            <div className={`${m.card} p-4`}>
              <h2 className="text-[15px] font-semibold text-slate-900">Why we verify</h2>
              <p className="text-[14px] text-slate-600 mt-1 leading-relaxed">
                Kabutar connects people who haven't met. Travellers verify their identity before posting trips so senders know who they're trusting.
              </p>
              <h2 className="text-[15px] font-semibold text-slate-900 mt-4 mb-2.5">What you'll need</h2>
              {needs}
            </div>
          )}
          {wizard}
          <p className="flex gap-2 text-[13px] text-slate-500 px-1"><Lock size={14} className="shrink-0 mt-0.5" /> {privacy}</p>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function UploadStep({ title, subtitle, hint, preview, uploading, accept, capture, icon, onFile, onRetake }) {
  const Icon = icon;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[17px] font-semibold text-slate-900">{title}</h3>
        <p className="text-[14px] text-slate-500 mt-0.5">{subtitle}</p>
        {hint && <p className="text-[13px] text-slate-500 mt-1">{hint}</p>}
      </div>

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200">
          <img src={preview} alt="Uploaded document preview" className="w-full object-cover max-h-52" />
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[12px] font-semibold px-2 py-1 rounded-lg inline-flex items-center gap-1">
            <CheckCircle2 size={13} /> Uploaded
          </span>
          <button onClick={onRetake} className="absolute top-2 right-2 h-9 px-3 rounded-lg bg-white/95 text-slate-800 text-[13px] font-semibold inline-flex items-center gap-1.5">
            <RotateCcw size={14} /> Retake
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${uploading ? 'border-slate-200 opacity-60 pointer-events-none' : 'border-slate-300 active:bg-slate-50 hover:border-kb-500 hover:bg-kb-50/40'}`}>
          {uploading ? (
            <>
              <span className="w-8 h-8 border-[3px] border-slate-200 border-t-kb-500 rounded-full animate-spin" />
              <p className="text-[14px] font-semibold text-slate-600">Uploading securely…</p>
            </>
          ) : (
            <>
              <span className="w-12 h-12 rounded-full bg-kb-50 text-kb-600 flex items-center justify-center"><Icon size={22} /></span>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-slate-900">Take a photo or choose a file</p>
                <p className="text-[13px] text-slate-500 mt-0.5">JPG, PNG or PDF · up to 5 MB</p>
              </div>
            </>
          )}
          <input type="file" accept={accept} capture={capture} className="hidden" disabled={uploading}
            onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

function StatusCard({ kycStatus, kycSubmittedAt }) {
  const configs = {
    none:     { Icon: Shield,       tone: 'bg-white border-slate-200',           ic: 'bg-slate-100 text-slate-600',     title: 'Not started',          desc: 'Verify your identity to post trips and earn an ID-verified badge.' },
    pending:  { Icon: Clock,        tone: 'bg-amber-50/60 border-amber-200',     ic: 'bg-amber-100 text-amber-700',     title: 'Pending verification', desc: kycSubmittedAt ? `Submitted ${format(new Date(kycSubmittedAt), 'd MMM yyyy')}. We’ll alert you once it’s reviewed.` : 'Your documents are being reviewed.' },
    verified: { Icon: CheckCircle2, tone: 'bg-emerald-50/60 border-emerald-200', ic: 'bg-emerald-100 text-emerald-700', title: 'Verified',             desc: 'Your identity is verified. You can post trips.' },
    rejected: { Icon: XCircle,      tone: 'bg-red-50/60 border-red-200',         ic: 'bg-red-100 text-red-700',         title: 'Action required',      desc: 'Your documents weren’t accepted. Please upload clearer photos below.' },
  };
  const c = configs[kycStatus] || configs.none;
  const Icon = c.Icon;
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${c.tone}`} role="status">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.ic}`}><Icon size={20} /></span>
      <div>
        <p className="text-[15px] font-semibold text-slate-900">{c.title}</p>
        <p className="text-[14px] text-slate-600 mt-0.5 leading-relaxed">{c.desc}</p>
      </div>
    </div>
  );
}
