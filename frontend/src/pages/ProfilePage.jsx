import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { uploadImageToStorage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { formatTripDatesLong, hasUpcomingDate } from '../lib/tripDates';
import {
  Star, Phone, LogOut, Package, Send,
  Shield, CheckCircle, Clock, Camera, Lock, MapPin,
  History, AlertCircle, Edit2, Pencil, Trash2, Train,
  Plane, Bus, Car, ChevronDown, ChevronUp, Plus,
  Settings, ChevronRight, Award, Truck, MessageCircle,
  UserCheck, FileText, HelpCircle, Trash, Share2,
} from 'lucide-react';
import KYCUploadModal from '../components/KYCUploadModal';
import PhoneVerifyModal from '../components/PhoneVerifyModal';
import PostTripModal from '../components/PostTripModal';
import PostParcelModal from '../components/PostParcelModal';
import CityInput from '../components/CityInput';
import LegalModal from '../components/LegalModal';
import TripCard from '../components/TripCard';
import ParcelCard from '../components/ParcelCard';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, Tabs, EmptyState, Avatar, Pill } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';

const TRANSPORT_ICON = { train: Train, flight: Plane, bus: Bus, car: Car };
const TRANSPORT_EMOJI = { train: '🚂', flight: '✈️', bus: '🚌', car: '🚗' };

const calcCompletion = (user) => {
  const checks = [
    !!user?.name?.trim(),
    !!user?.phone && !user?.phone?.startsWith('google_'),
    !!user?.profileImage,
    !!user?.city?.trim(),
    !!user?.isPhoneVerified || user?.kycStatus === 'verified',
  ];
  return Math.round((checks.filter(Boolean).length / 5) * 100);
};

// ── Trust score ring ──────────────────────────────────────────────────────────
function TrustRing({ pct }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f97316' : '#f59e0b';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function ProfilePage() {
  const { user, logout, setUser, refreshUser } = useAuth();
  const navigate  = useNavigate();
  const photoRef  = useRef(null);
  const d         = useDesktopWeb();

  // ── existing derived values ────────────────────────────────────────────────
  const currentPhone  = user?.phone?.startsWith('google_') ? '' : (user?.phone?.replace('+91', '') || '');
  const isGoogleUser  = user?.phone?.startsWith('google_');
  const hasRealPhone  = user?.phone && !isGoogleUser;
  const hasPhoto      = !!user?.profileImage;
  const hasCity       = !!user?.city?.trim();
  const completion    = calcCompletion(user);
  const initials      = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const memberSince   = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';

  // ── existing state ─────────────────────────────────────────────────────────
  const [legalModal,       setLegalModal]       = useState(null);
  const [showDeleteModal,  setShowDeleteModal]   = useState(false);
  const [deletingAccount,  setDeletingAccount]  = useState(false);
  const [editing,          setEditing]          = useState(false);
  const [draft,            setDraft]            = useState({ name: user?.name || '', phone: currentPhone, city: user?.city || '', bio: user?.bio || '' });
  const [saving,           setSaving]           = useState(false);
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);
  const [showKyc,          setShowKyc]          = useState(false);
  const [showPhoneVerify,  setShowPhoneVerify]  = useState(false);
  const [myTrips,          setMyTrips]          = useState([]);
  const [myParcels,        setMyParcels]        = useState([]);
  const [editingTrip,      setEditingTrip]      = useState(null);
  const [editingParcel,    setEditingParcel]    = useState(null);
  const [completedParcels, setCompletedParcels] = useState([]);

  // ── new UI state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('trips'); // trips | parcels | settings

  useEffect(() => { refreshUser(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!user) return;
    const today = new Date(); today.setHours(0,0,0,0);
    api.get('/trips/my').then(r => {
      setMyTrips(r.data.trips.filter(t => t.status === 'active' && hasUpcomingDate(t, today)));
    }).catch(() => {});
    api.get('/parcels/my').then(r => {
      const all = r.data.parcels || [];
      setMyParcels(all.filter(p => p.status === 'open'));
      setCompletedParcels(all.filter(p => p.status === 'completed' && (
        String(p.travelerId?._id || p.travelerId) === String(user._id)
      )));
    }).catch(() => {});
  }, [user]);

  // ── existing handlers (unchanged) ─────────────────────────────────────────
  const deleteTrip = async (id) => {
    if (!confirm('Delete this trip?')) return;
    await api.delete(`/trips/${id}`);
    setMyTrips(prev => prev.filter(t => t._id !== id));
    toast.success('Trip deleted');
  };
  const markTripFull = async (id) => {
    if (!confirm('Mark as full? Removes from public listing.')) return;
    await api.patch(`/trips/${id}`, { status: 'completed' });
    setMyTrips(prev => prev.filter(t => t._id !== id));
    toast.success('Trip marked as full');
  };
  const deleteParcel = async (id) => {
    if (!confirm('Delete this parcel request?')) return;
    await api.delete(`/parcels/${id}`);
    setMyParcels(prev => prev.filter(p => p._id !== id));
    toast.success('Parcel request deleted');
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft({ name: user?.name || '', phone: currentPhone, city: user?.city || '', bio: user?.bio || '' });
  };
  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4 MB'); return; }
    setUploadingPhoto(true);
    try {
      const imageUrl = await uploadImageToStorage(file, 'profile-images');
      const { data } = await api.post('/auth/me/image', { imageUrl });
      const updated = { ...user, profileImage: data.user.profileImage };
      localStorage.setItem('kabootar_user', JSON.stringify(updated));
      setUser(updated);
      toast.success('Profile photo saved!');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };
  const saveProfile = async () => {
    if (!draft.name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    const payload = {};
    if (draft.name.trim() !== user?.name)        payload.name  = draft.name.trim();
    if (draft.city.trim() !== (user?.city || '')) payload.city  = draft.city.trim();
    if (draft.bio  !== (user?.bio  || ''))        payload.bio   = draft.bio;
    if (draft.phone && draft.phone.length === 10) payload.phone = '+91' + draft.phone;
    try {
      const { data } = await api.patch('/auth/me', payload);
      localStorage.setItem('kabootar_user', JSON.stringify(data.user));
      setUser(data.user);
      setEditing(false);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(err.response?.status === 409 ? 'Phone already registered' : 'Failed to save');
    } finally { setSaving(false); }
  };
  const handleLogout = async () => {
    if (!confirm('Log out of Kabutar?')) return;
    await logout();
    navigate('/login');
  };

  // ── Checklist items for completion ────────────────────────────────────────
  const checklist = [
    { label: 'Full name', done: !!user?.name?.trim(), action: () => setEditing(true) },
    { label: 'Phone number', done: hasRealPhone, action: () => setShowPhoneVerify(true) },
    { label: 'Profile photo', done: hasPhoto, action: () => photoRef.current?.click() },
    { label: 'Hometown city', done: hasCity, action: () => setEditing(true) },
    { label: 'Phone verified', done: !!user?.isPhoneVerified || user?.kycStatus === 'verified', action: () => setShowPhoneVerify(true) },
  ];

  const editSheet = (
    <>
      {/* ── EDIT PROFILE SHEET ────────────────────────────────────────────── */}
      {editing && (
        <div className={`fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm animate-fade-in ${d ? 'items-center p-6' : 'items-end'}`}
          onClick={e => e.target === e.currentTarget && cancelEdit()}>
          <div className={`w-full max-w-lg mx-auto bg-white px-5 py-6 space-y-4 animate-slide-up ${d ? 'rounded-2xl font-inter' : 'rounded-t-3xl'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-black text-stone-900 text-lg">Edit Profile</h2>
              <button onClick={cancelEdit} className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center active:scale-90 transition-all text-stone-500">✕</button>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1.5">Full Name</label>
              <input className="input-field w-full" placeholder="Your name" value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1.5">Hometown City</label>
              <CityInput value={draft.city} onChange={v => setDraft(d => ({ ...d, city: v }))} placeholder="e.g. Patna" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1.5">Bio</label>
              <textarea className="input-field w-full resize-none" rows={3} maxLength={160}
                placeholder="Tell senders about yourself — your routes, reliability, experience…"
                value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))} />
              <p className="text-[10px] text-stone-400 text-right mt-0.5">{draft.bio.length}/160</p>
            </div>
            {!hasRealPhone && !isGoogleUser && (
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1.5">Phone Number</label>
                <div className="flex gap-2">
                  <div className="input-field w-14 text-center text-stone-600 text-sm font-bold shrink-0 flex items-center justify-center">+91</div>
                  <input className="input-field flex-1" placeholder="9876543210" value={draft.phone}
                    onChange={e => setDraft(d => ({ ...d, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
                    inputMode="numeric" maxLength={10} />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={cancelEdit} className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-600 font-bold text-sm active:scale-95 transition-all">Cancel</button>
              <button onClick={saveProfile} disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
  const modals = (
    <>
      {/* ── MODALS ── */}
      {showKyc && <KYCUploadModal onClose={() => setShowKyc(false)} onSuccess={() => { setShowKyc(false); refreshUser(); }} />}
      {showPhoneVerify && (
        <PhoneVerifyModal
          onClose={() => setShowPhoneVerify(false)}
          onSuccess={(updated) => { setShowPhoneVerify(false); setDraft(d => ({ ...d, phone: updated.phone?.replace('+91','') || '' })); }}
          prefillPhone={hasRealPhone && !user?.isPhoneVerified ? user.phone : undefined}
        />
      )}
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {editingTrip && (
        <PostTripModal
          initialData={editingTrip === 'new' ? null : editingTrip}
          tripId={editingTrip === 'new' ? null : editingTrip._id}
          onClose={() => setEditingTrip(null)}
          onSuccess={trip => {
            if (editingTrip === 'new') setMyTrips(prev => [trip, ...prev]);
            else setMyTrips(prev => prev.map(t => t._id === trip._id ? trip : t));
            setEditingTrip(null);
            toast.success(editingTrip === 'new' ? 'Trip posted!' : 'Trip updated!');
          }}
        />
      )}
      {editingParcel && (
        <PostParcelModal
          initialData={editingParcel === 'new' ? null : editingParcel}
          parcelId={editingParcel === 'new' ? null : editingParcel._id}
          onClose={() => setEditingParcel(null)}
          onSuccess={parcel => {
            if (editingParcel === 'new') setMyParcels(prev => [parcel, ...prev]);
            else setMyParcels(prev => prev.map(p => p._id === parcel._id ? parcel : p));
            setEditingParcel(null);
            toast.success(editingParcel === 'new' ? 'Parcel posted!' : 'Updated!');
          }}
        />
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className={`fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm animate-fade-in ${d ? 'items-center p-6' : 'items-end'}`}
          onClick={() => setShowDeleteModal(false)}>
          <div className={`w-full max-w-lg mx-auto bg-white px-5 py-6 space-y-4 animate-slide-up ${d ? 'rounded-2xl font-inter' : 'rounded-t-3xl'}`}
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="font-black text-stone-900 text-lg">Delete your account?</h3>
              <p className="text-stone-500 text-sm mt-2 leading-relaxed">
                Your account will be scheduled for deletion. Log in within <strong>3 days</strong> to cancel.
              </p>
            </div>
            <div className="space-y-2">
              <button disabled={deletingAccount}
                onClick={async () => {
                  setDeletingAccount(true);
                  try {
                    await api.post('/auth/me/request-delete');
                  } catch {}
                  toast.success('Account scheduled for deletion 🕊️');
                  setShowDeleteModal(false);
                  setDeletingAccount(false);
                  await logout();
                }}
                className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {deletingAccount ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : 'Yes, delete my account'}
              </button>
              <button onClick={() => setShowDeleteModal(false)}
                className="w-full py-3.5 rounded-2xl bg-stone-100 text-stone-700 font-semibold text-sm active:scale-95 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Desktop browser layout (never used by the Android app) ──
  if (d) {
    const kyc = {
      verified: ['ID verified', 'green'],
      pending:  ['Verification under review', 'amber'],
      rejected: ['Verification not approved', 'red'],
    }[user?.kycStatus] || ['Not verified', 'slate'];
    return (
      <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-8 items-start">
        <aside className="space-y-5 sticky top-24">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar user={user} size={96} />
                <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                  aria-label="Change profile photo" title="Change profile photo"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center">
                  {uploadingPhoto ? <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Camera size={15} />}
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-slate-900">{user?.name || 'Your profile'}</h1>
              <div className="mt-2"><Pill tone={kyc[1]}>{user?.kycStatus === 'verified' ? <UserCheck size={12} /> : <Shield size={12} />} {kyc[0]}</Pill></div>
              <p className="mt-2 text-[13px] text-slate-500">
                {[user?.city, memberSince && `Member since ${memberSince}`].filter(Boolean).join(' · ')}
              </p>
              {user?.bio && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{user.bio}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-slate-100 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-900">{user?.tripsCompleted || 0}</p>
                <p className="text-xs text-slate-500">Deliveries</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{user?.totalRatings ? Number(user.rating).toFixed(1) : '—'}</p>
                <p className="text-xs text-slate-500">{user?.totalRatings ? `${user.totalRatings} review${user.totalRatings === 1 ? '' : 's'}` : 'No reviews'}</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{myTrips.length}</p>
                <p className="text-xs text-slate-500">Upcoming trips</p>
              </div>
            </div>
            <button type="button" onClick={() => setEditing(true)} className={`${btn.secondary} ${btn.md} w-full mt-5`}>
              <Pencil size={14} /> Edit profile
            </button>
          </Card>

          {completion < 100 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Profile completion</p>
                <span className="text-xs font-semibold text-slate-500">{completion}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-kb-500 rounded-full" style={{ width: `${completion}%` }} /></div>
              <ul className="mt-4 space-y-2">
                {checklist.map(c => (
                  <li key={c.label}>
                    <button type="button" onClick={c.done ? undefined : c.action} disabled={c.done}
                      className="w-full flex items-center gap-2.5 text-left text-[13px] disabled:cursor-default group">
                      {c.done
                        ? <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        : <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                      <span className={c.done ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}>{c.label}</span>
                      {!c.done && <ChevronRight size={14} className="ml-auto text-slate-400" />}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        <div className="space-y-6 min-w-0">
          <Tabs value={activeTab} onChange={setActiveTab}
            items={[{ k: 'trips', label: 'Trips', count: myTrips.length }, { k: 'parcels', label: 'Parcel requests', count: myParcels.length }, { k: 'settings', label: 'Settings' }]} />

          {activeTab === 'trips' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-slate-900">Upcoming trips</h2>
                <button type="button" onClick={() => user?.kycStatus === 'verified' ? setEditingTrip('new') : navigate('/kyc')} className={`${btn.primary} ${btn.md}`}>
                  <Plus size={16} /> Post a trip
                </button>
              </div>
              {myTrips.length === 0 ? (
                <Card><EmptyState icon={Send} title="No upcoming trips" body="Post a trip and senders on your route can request space." /></Card>
              ) : (
                <Card className="divide-y divide-slate-100 overflow-hidden">
                  {myTrips.map(t => (
                    <TripCard key={t._id} trip={t} variant="row" showDelete
                      onDelete={() => deleteTrip(t._id)} onEdit={() => setEditingTrip(t)} onMarkFull={() => markTripFull(t._id)} />
                  ))}
                </Card>
              )}
              {completedParcels.length > 0 && (
                <section>
                  <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Deliveries you've completed</h2>
                  <Card className="divide-y divide-slate-100 overflow-hidden">
                    {completedParcels.map(p => (
                      <div key={p._id} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><Package size={16} /></span>
                        <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">{p.fromCity} → {p.toCity}</span>
                        <span className="text-xs text-slate-500">{p.offeredPrice ? `₹${p.offeredPrice} · ` : ''}{p.completedAt ? format(new Date(p.completedAt), 'dd MMM yyyy') : ''}</span>
                        <Pill tone="green">Completed</Pill>
                      </div>
                    ))}
                  </Card>
                </section>
              )}
            </div>
          )}

          {activeTab === 'parcels' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-slate-900">Open parcel requests</h2>
                <button type="button" onClick={() => setEditingParcel('new')} className={`${btn.primary} ${btn.md}`}><Plus size={16} /> Send a parcel</button>
              </div>
              {myParcels.length === 0 ? (
                <Card><EmptyState icon={Package} title="No open parcel requests" body="Requests in progress are tracked in My parcels."
                  actionLabel="Open My parcels" onAction={() => navigate('/my-parcels')} /></Card>
              ) : (
                <Card className="divide-y divide-slate-100 overflow-hidden">
                  {myParcels.map(p => (
                    <ParcelCard key={p._id} parcel={p} variant="row" showDelete onDelete={() => deleteParcel(p._id)} onEdit={() => setEditingParcel(p)} />
                  ))}
                </Card>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Account</h2>
                <Card className="divide-y divide-slate-100 overflow-hidden">
                  <DeskSetting icon={Pencil} label="Profile details" sub="Name, hometown and bio" onClick={() => setEditing(true)} />
                  <DeskSetting icon={Phone} label="Phone number" sub={hasRealPhone ? (user?.isPhoneVerified ? 'Verified' : 'Not verified yet') : 'Not added'} onClick={() => setShowPhoneVerify(true)} />
                  <DeskSetting icon={Shield} label="Identity verification" sub={kyc[0]} onClick={() => navigate('/kyc')} />
                  <DeskSetting icon={Camera} label="Profile photo" sub={hasPhoto ? 'Photo added' : 'No photo yet'} onClick={() => photoRef.current?.click()} />
                </Card>
              </section>
              {(user?.frequentRoute?.from || user?.frequentRoute?.to) && (
                <section>
                  <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Frequent route</h2>
                  <Card className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{user.frequentRoute.from} → {user.frequentRoute.to}</p>
                    <p className="text-[13px] text-slate-500 mt-0.5">You get notifications for trips and parcels on this route.</p>
                  </Card>
                </section>
              )}
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Help and legal</h2>
                <Card className="divide-y divide-slate-100 overflow-hidden">
                  <DeskSetting icon={HelpCircle} label="Help and support" sub="kabutar.support@gmail.com" onClick={() => window.open('mailto:kabutar.support@gmail.com?subject=Kabutar Support', '_blank')} />
                  <DeskSetting icon={FileText} label="Terms of service" onClick={() => setLegalModal('terms')} />
                  <DeskSetting icon={Lock} label="Privacy policy" onClick={() => setLegalModal('privacy')} />
                </Card>
              </section>
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Privacy</h2>
                <BlockedUsersList desktop />
              </section>
              <section className="flex items-center gap-3 pt-2">
                <button type="button" onClick={handleLogout} className={`${btn.secondary} ${btn.md}`}><LogOut size={15} /> Log out</button>
                <button type="button" onClick={() => setShowDeleteModal(true)} className={`${btn.danger} ${btn.md}`}><Trash2 size={15} /> Delete account</button>
              </section>
            </div>
          )}
        </div>
        {editSheet}
        {modals}
      </div>
    );
  }

  return (
    <div className="pb-24 bg-stone-50 min-h-screen">

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Gradient banner */}
        <div className="h-36 lg:h-48 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 45%, #7c3aed 100%)' }}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 right-16 w-24 h-24 rounded-full bg-white/8" />
          <div className="absolute top-4 left-8 w-16 h-16 rounded-full bg-white/10" />
          {/* Edit photo overlay on banner if no photo */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => { if (!editing) setEditing(true); }}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/25 active:scale-95 transition-all">
              <Edit2 size={12} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Avatar — overlaps banner */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -48 }}>
          <div className="relative">
            {/* Avatar with optional blue verified ring for KYC users */}
            <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-orange-100 flex items-center justify-center font-black text-3xl text-orange-500 ${
              user?.kycStatus === 'verified' ? 'border-blue-400' : 'border-white'
            }`}>
              {hasPhoto
                ? <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
                : uploadingPhoto
                  ? <div className="animate-spin w-7 h-7 border-3 border-orange-400 border-t-transparent rounded-full" />
                  : initials}
            </div>
            {/* Instagram-style blue verified badge */}
            {user?.kycStatus === 'verified' && (
              <div className="absolute top-1 right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                title="KYC Verified">
                <svg viewBox="0 0 10 8" width="11" height="9" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <button onClick={() => photoRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors active:scale-90">
              <Camera size={14} className="text-white" />
            </button>
            <input ref={photoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoPick} />
          </div>
        </div>
      </div>

      {/* ── NAME + IDENTITY (below hero) ─────────────────────────────────── */}
      <div className="pt-16 px-5 text-center space-y-1" style={{ animation: 'staggerIn 0.35s ease both' }}>
        <h1 className="text-xl font-black text-stone-900">{user?.name}</h1>

        {/* Verification pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {user?.isPhoneVerified && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Phone size={10} /> Phone Verified
            </span>
          )}
          {user?.kycStatus === 'verified' && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              <Shield size={10} /> KYC Verified
            </span>
          )}
          {user?.kycStatus === 'pending' && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
              <Clock size={10} /> Under Review
            </span>
          )}
          {(!user?.kycStatus || user?.kycStatus === 'none') && (
            <button onClick={() => setShowKyc(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full hover:border-orange-300 hover:text-orange-600 transition-all">
              <Shield size={10} /> Get KYC Verified
            </button>
          )}
        </div>

        {/* Location + member since */}
        <div className="flex items-center justify-center gap-3 text-xs text-stone-400 pt-0.5">
          {user?.city && <span className="flex items-center gap-1"><MapPin size={11} />{user.city}</span>}
          {memberSince && <span>· Member since {memberSince}</span>}
        </div>

        {/* Bio */}
        {user?.bio && !editing && (
          <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto mt-1 italic">"{user.bio}"</p>
        )}
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div className="px-4 mt-5" style={{ animation: 'staggerIn 0.35s ease 0.08s both' }}>
        <div className="grid grid-cols-3 divide-x divide-stone-100 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="py-3.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span className="text-lg font-black text-stone-900">{user?.rating?.toFixed(1) || '5.0'}</span>
            </div>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Rating</p>
          </div>
          <div className="py-3.5 text-center">
            <div className="text-lg font-black text-stone-900 mb-0.5">{myTrips.length}</div>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Active Trips</p>
          </div>
          <div className="py-3.5 text-center">
            <div className="text-lg font-black text-stone-900 mb-0.5">{user?.tripsCompleted || 0}</div>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Deliveries</p>
          </div>
        </div>
      </div>

      {/* ── TRUST SCORE + PROFILE COMPLETION ─────────────────────────────── */}
      {completion < 100 && (
        <div className="px-4 mt-4" style={{ animation: 'staggerIn 0.35s ease 0.12s both' }}>
          <div className="bg-white border border-stone-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-4">
              <TrustRing pct={completion} />
              <div className="flex-1">
                <p className="text-sm font-black text-stone-900">Trust Score</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Complete your profile to earn more trust from senders
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {checklist.map(item => (
                    <button key={item.label} onClick={item.done ? undefined : item.action}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        item.done
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-orange-300 hover:text-orange-600'
                      }`}>
                      {item.done ? <CheckCircle size={9} /> : <Plus size={9} />}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editSheet}

      {/* ── STICKY TAB BAR ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-stone-50 px-4 pt-4 pb-0 mt-5">
        <div className="flex bg-white rounded-2xl border border-stone-100 shadow-sm p-1 gap-1">
          {[
            { id: 'trips',    label: 'My Trips',   icon: Send   },
            { id: 'parcels',  label: 'Parcels',    icon: Package },
            { id: 'settings', label: 'Settings',   icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === id ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50'
              }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">

        {/* ── TRIPS TAB ── */}
        {activeTab === 'trips' && (
          <div className="space-y-3" style={{ animation: 'staggerIn 0.25s ease both' }}>
            <button onClick={() => setEditingTrip('new')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <Plus size={16} /> Post a New Trip
            </button>

            {myTrips.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
                <div className="text-4xl mb-3">✈️</div>
                <p className="font-bold text-stone-700">No upcoming trips</p>
                <p className="text-xs text-stone-400 mt-1">Post a trip to start earning by carrying parcels</p>
              </div>
            ) : myTrips.map((trip, i) => {
              const Icon = TRANSPORT_ICON[trip.transportMode] || Train;
              return (
                <div key={trip._id} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm"
                  style={{ animation: `staggerIn 0.3s ease ${i * 50}ms both` }}>
                  {/* Route */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{TRANSPORT_EMOJI[trip.transportMode]}</span>
                    <span className="font-black text-stone-900 text-sm">{trip.fromCity}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-stone-200" />
                    <Icon size={12} className="text-stone-400" />
                    <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-emerald-200" />
                    <span className="font-black text-stone-900 text-sm">{trip.toCity}</span>
                  </div>
                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-3">
                    <span>📅 {formatTripDatesLong(trip)}</span>
                    <span>· 📦 {trip.availableWeight}kg</span>
                    <span>· ₹{trip.pricePerKg}/kg</span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTrip(trip)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-95 transition-all">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => markTripFull(trip._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all">
                      <CheckCircle size={12} /> Mark Full
                    </button>
                    <button onClick={() => deleteTrip(trip._id)}
                      className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 active:scale-95 transition-all shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Delivery history */}
            {completedParcels.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <History size={13} className="text-stone-400" />
                  <span className="text-xs font-black text-stone-400 uppercase tracking-wide">Delivery History</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>
                {completedParcels.map(p => (
                  <div key={p._id} className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 flex items-center gap-3 mb-2">
                    <span className="text-xl">📦</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-800">{p.fromCity} → {p.toCity}</p>
                      <p className="text-[11px] text-stone-400">{p.offeredPrice ? `₹${p.offeredPrice}` : p.weight + 'kg'} · {p.completedAt ? format(new Date(p.completedAt), 'dd MMM yy') : 'Completed'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✅ Done</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PARCELS TAB ── */}
        {activeTab === 'parcels' && (
          <div className="space-y-3" style={{ animation: 'staggerIn 0.25s ease both' }}>
            <button onClick={() => setEditingParcel('new')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
              <Plus size={16} /> Post a Parcel Request
            </button>

            {myParcels.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
                <div className="text-4xl mb-3">📦</div>
                <p className="font-bold text-stone-700">No open parcel requests</p>
                <p className="text-xs text-stone-400 mt-1">Post a request to find travellers on your route</p>
              </div>
            ) : myParcels.map((parcel, i) => (
              <div key={parcel._id} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm"
                style={{ animation: `staggerIn 0.3s ease ${i * 50}ms both` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">📦</span>
                  <span className="font-black text-stone-900 text-sm">{parcel.fromCity} → {parcel.toCity}</span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Open</span>
                </div>
                <p className="text-[11px] text-stone-500 mb-3">{parcel.weight}kg · {parcel.itemType} · {parcel.offeredPrice ? `₹${parcel.offeredPrice} offered` : 'Price negotiable'}</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditingParcel(parcel)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-95 transition-all">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => deleteParcel(parcel._id)}
                    className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 flex items-center justify-center text-red-400 active:scale-95 transition-all shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="space-y-4" style={{ animation: 'staggerIn 0.25s ease both' }}>

            {/* Account */}
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Account</p>
              <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
                <SettingRow icon={<Pencil size={15} className="text-orange-500" />} label="Edit Profile"
                  sub="Name, bio, city" onClick={() => setEditing(true)} />
                <SettingRow
                  icon={<Phone size={15} className={hasRealPhone ? 'text-emerald-500' : 'text-stone-400'} />}
                  label="Phone Number"
                  sub={hasRealPhone ? (user?.isPhoneVerified ? '✓ Verified' : 'Tap to verify') : 'Not added'}
                  onClick={() => setShowPhoneVerify(true)} />
                <SettingRow
                  icon={<Shield size={15} className={user?.kycStatus === 'verified' ? 'text-blue-500' : user?.kycStatus === 'pending' ? 'text-amber-500' : 'text-stone-400'} />}
                  label="KYC Verification"
                  sub={user?.kycStatus === 'verified' ? '✓ Identity verified' : user?.kycStatus === 'pending' ? 'Under review…' : 'Verify to post trips'}
                  onClick={() => navigate('/kyc')} />
                <SettingRow icon={<Camera size={15} className="text-violet-500" />} label="Profile Photo"
                  sub={hasPhoto ? 'Photo added' : 'Add a photo'} onClick={() => photoRef.current?.click()} />
              </div>
            </div>

            {/* Frequent route */}
            {(user?.frequentRoute?.from || user?.frequentRoute?.to) && (
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Frequent Route</p>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
                  <p className="text-sm font-black text-stone-900">{user.frequentRoute.from} → {user.frequentRoute.to}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">You get priority notifications for this route</p>
                </div>
              </div>
            )}

            {/* Support */}
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Help & Legal</p>
              <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
                <SettingRow icon={<HelpCircle size={15} className="text-orange-500" />} label="Help & Support"
                  sub="kabutar.support@gmail.com"
                  onClick={() => window.open('mailto:kabutar.support@gmail.com?subject=Kabutar Support', '_blank')} />
                <SettingRow icon={<FileText size={15} className="text-stone-400" />} label="Terms of Service"
                  sub="Our terms and conditions" onClick={() => setLegalModal('terms')} />
                <SettingRow icon={<Shield size={15} className="text-stone-400" />} label="Privacy Policy"
                  sub="How we handle your data" onClick={() => setLegalModal('privacy')} />
              </div>
            </div>

            {/* Danger zone */}
            <div className="space-y-2.5">
              <button onClick={handleLogout}
                className="w-full py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all">
                <LogOut size={16} /> Sign out
              </button>
              <button onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 rounded-2xl text-stone-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:text-red-400 transition-colors active:scale-95">
                <Trash2 size={13} /> Delete account
              </button>
              <p className="text-center text-[11px] text-stone-300">🕊️ Kabutar v1.0.2 · Made with ♥ in India</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BLOCKED USERS ── */}
      <BlockedUsersList />

      {modals}
    </div>
  );
}

// ── SettingRow helper ─────────────────────────────────────────────────────────
function SettingRow({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left">
      <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900">{label}</p>
        {sub && <p className="text-[11px] text-stone-400 mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={14} className="text-stone-300 shrink-0" />
    </button>
  );
}

// ── Desktop settings row ──────────────────────────────────────────────────────
function DeskSetting({ icon, label, sub, onClick }) {
  const Icon = icon;
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {sub && <span className="block text-[13px] text-slate-500 mt-0.5 truncate">{sub}</span>}
      </span>
      <ChevronRight size={16} className="text-slate-400 shrink-0" />
    </button>
  );
}

// ── Blocked Users List ────────────────────────────────────────────────────────
function BlockedUsersList({ desktop = false }) {
  const [blocked, setBlocked] = useState([]);
  const [show,    setShow]    = useState(desktop);
  useEffect(() => {
    if (!show) return;
    api.get('/users/blocked/list').then(r => setBlocked(r.data.blocked || [])).catch(() => {});
  }, [show]);
  const unblock = async (id, name) => {
    await api.delete(`/users/${id}/block`).catch(() => {});
    setBlocked(prev => prev.filter(u => u._id !== id));
    toast.success(`${name} unblocked`);
  };
  if (desktop) return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Blocked users</p>
        <p className="text-[13px] text-slate-500 mt-0.5">Trips and parcel requests from people you block are hidden from your search results.</p>
      </div>
      {blocked.length === 0 ? <p className="px-5 py-4 text-[13px] text-slate-500">You haven't blocked anyone.</p> : (
        <ul className="divide-y divide-slate-100">
          {blocked.map(u => (
            <li key={u._id} className="flex items-center gap-3 px-5 py-3">
              <Avatar user={u} size={32} />
              <span className="flex-1 text-sm font-medium text-slate-800">{u.name}</span>
              <button type="button" onClick={() => unblock(u._id, u.name)} className={`${btn.secondary} ${btn.sm}`}>Unblock</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
  if (!show) return (
    <div className="mx-4 mt-4 mb-2">
      <button onClick={() => setShow(true)}
        className="text-xs text-stone-400 font-semibold flex items-center gap-1.5 active:scale-95 transition-all">
        🚫 Manage blocked users
      </button>
    </div>
  );
  return (
    <div className="mx-4 mt-4 bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
        <span className="text-sm font-bold text-stone-900">Blocked Users</span>
        <button onClick={() => setShow(false)} className="text-xs text-stone-400">Hide</button>
      </div>
      {blocked.length === 0
        ? <p className="text-xs text-stone-400 text-center py-4">No blocked users</p>
        : blocked.map(u => (
          <div key={u._id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-0">
            <div className="w-8 h-8 rounded-full bg-stone-100 overflow-hidden flex items-center justify-center shrink-0">
              {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover" alt="" /> : <span className="text-stone-500 text-xs font-bold">{u.name?.[0]?.toUpperCase()}</span>}
            </div>
            <span className="flex-1 text-sm font-medium text-stone-700">{u.name}</span>
            <button onClick={() => unblock(u._id, u.name)}
              className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
              Unblock
            </button>
          </div>
        ))}
    </div>
  );
}
