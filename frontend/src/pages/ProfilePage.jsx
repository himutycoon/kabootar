import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { uploadImageToStorage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { hasUpcomingDate } from '../lib/tripDates';
import {
  Star, Phone, LogOut, Package, Send,
  Shield, CheckCircle, Clock, Camera, Lock, MapPin,
  History, AlertCircle, Edit2, Pencil, Trash2, Train,
  Plane, Bus, Car, ChevronDown, ChevronUp, Plus,
  Settings, ChevronRight, Award, Truck, MessageCircle,
  UserCheck, FileText, HelpCircle, Trash, Share2, Wallet, Bell, BellRing,
} from 'lucide-react';
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
import { ListRow, Sheet } from '../components/mobile/ui';
import { EarningsPanel, RouteAlertsList, NotificationPrefsList } from '../components/ProfileExtras';
import { useEarnings } from '../hooks/useEarnings';
import { formatPhone, rupees } from '../lib/format';
import { m } from '../components/mobile/styles';


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
  const [showPhoneVerify,  setShowPhoneVerify]  = useState(false);
  const [myTrips,          setMyTrips]          = useState([]);
  const [myParcels,        setMyParcels]        = useState([]);
  const [editingTrip,      setEditingTrip]      = useState(null);
  const [editingParcel,    setEditingParcel]    = useState(null);

  // ── new UI state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('trips'); // trips | parcels | settings
  const [sheet, setSheet] = useState(null); // mobile: earnings | alerts | notifications
  const earnings = useEarnings(!!user);

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
                  } catch (err) {
                    // Don't claim success or sign out if the server didn't record the request
                    toast.error(err.response?.data?.message || "Couldn't delete your account. Check your connection and try again.");
                    setDeletingAccount(false);
                    return;
                  }
                  toast.success('Account scheduled for deletion. Log in within 3 days to cancel.');
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
              {earnings?.deliveries > 0 && (
                <section>
                  <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Your earnings</h2>
                  <Card className="overflow-hidden"><EarningsPanel data={earnings} /></Card>
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
                  <DeskSetting icon={Phone} label="Phone number" sub={hasRealPhone ? `${formatPhone(user.phone)} · ${user?.isPhoneVerified ? 'Verified' : 'Not verified yet'}` : 'Not added'} onClick={() => setShowPhoneVerify(true)} />
                  <DeskSetting icon={Shield} label="Identity verification" sub={kyc[0]} onClick={() => navigate('/kyc')} />
                  <DeskSetting icon={Camera} label="Profile photo" sub={hasPhoto ? 'Photo added' : 'No photo yet'} onClick={() => photoRef.current?.click()} />
                </Card>
              </section>
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Notifications</h2>
                <Card className="overflow-hidden"><NotificationPrefsList /></Card>
              </section>
              <section>
                <h2 className="text-[17px] font-semibold text-slate-900 mb-3">Route alerts</h2>
                <Card className="overflow-hidden"><RouteAlertsList /></Card>
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

  // ── Mobile layout (Android app + phone browsers) ──
  const kycM = {
    verified: ['Verified', 'green', 'Your identity is verified'],
    pending:  ['Pending verification', 'amber', 'Documents under review'],
    rejected: ['Action required', 'red', 'Re-upload your documents'],
  }[user?.kycStatus] || ['Not started', 'slate', 'Required to post trips'];

  return (
    <div className="px-4 pt-4 pb-4 space-y-5">
      {/* Identity card */}
      <section className={`${m.card} p-5`}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar user={user} size={76} />
            <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto} aria-label="Change profile photo"
              className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center">
              {uploadingPhoto ? <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Camera size={15} />}
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold text-slate-900 truncate">{user?.name || 'Your profile'}</h1>
            <div className="mt-1"><Pill tone={kycM[1]}>{user?.kycStatus === 'verified' ? <UserCheck size={12} /> : <Shield size={12} />} {kycM[0]}</Pill></div>
            <p className="text-[13px] text-slate-500 mt-1.5 truncate">
              {[user?.city, memberSince && `Joined ${memberSince}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {user?.bio && <p className="text-[14px] text-slate-600 mt-4 leading-relaxed">{user.bio}</p>}
        <div className="grid grid-cols-3 mt-5 pt-4 border-t border-slate-100 text-center">
          <div>
            <p className="text-[18px] font-semibold text-slate-900">{user?.tripsCompleted || 0}</p>
            <p className="text-xs text-slate-500">Deliveries</p>
          </div>
          <div className="border-x border-slate-100">
            <p className="text-[18px] font-semibold text-slate-900">{user?.totalRatings ? Number(user.rating).toFixed(1) : '—'}</p>
            <p className="text-xs text-slate-500">{user?.totalRatings ? `${user.totalRatings} review${user.totalRatings === 1 ? '' : 's'}` : 'No reviews'}</p>
          </div>
          <div>
            <p className="text-[18px] font-semibold text-slate-900">{myTrips.length}</p>
            <p className="text-xs text-slate-500">Upcoming trips</p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing(true)} className={`${m.btnSecondary} w-full mt-4 h-11`}><Pencil size={15} /> Edit profile</button>
      </section>

      {completion < 100 && (
        <section className={`${m.card} p-4`}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-slate-900">Complete your profile</p>
            <span className="text-[13px] font-semibold text-slate-500">{completion}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden"><div className="h-full bg-kb-500 rounded-full" style={{ width: `${completion}%` }} /></div>
          <ul className="mt-2 -mx-1">
            {checklist.filter(c => !c.done).map(c => (
              <li key={c.label}>
                <button type="button" onClick={c.action} className="w-full flex items-center gap-3 px-1 h-11 text-left text-[14px] text-slate-700 active:bg-slate-50 rounded-lg">
                  <span className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  <span className="flex-1">{c.label}</span>
                  <ChevronRight size={17} className="text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Your activity</p>
        <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
          <ListRow icon={Send} title="My trips" sub={myTrips.length ? `${myTrips.length} upcoming` : 'No upcoming trips'}
            onClick={() => navigate('/trips', { state: { tab: 'mine' } })} />
          <ListRow icon={Package} title="My parcels" sub="Sending, carrying and delivery history" onClick={() => navigate('/my-parcels')} />
          <ListRow icon={Wallet} title="Earnings"
            sub={earnings?.deliveries ? `${rupees(earnings.total)} from ${earnings.deliveries} ${earnings.deliveries === 1 ? 'delivery' : 'deliveries'}` : 'From parcels you carry'}
            onClick={() => setSheet('earnings')} />
        </div>
      </section>

      <section>
        <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Notifications</p>
        <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
          <ListRow icon={Bell} title="Notification settings" sub="Choose what you get notified about" onClick={() => setSheet('notifications')} />
          <ListRow icon={BellRing} title="Route alerts" sub="Routes you follow for new trips and parcels" onClick={() => setSheet('alerts')} />
        </div>
      </section>

      <section>
        <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Account</p>
        <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
          <ListRow icon={Pencil} title="Personal information" sub="Name, hometown and bio" onClick={() => setEditing(true)} />
          <ListRow icon={Phone} title="Phone number"
            sub={hasRealPhone ? `${formatPhone(user.phone)}${user?.isPhoneVerified ? ' · Verified' : ' · Not verified'}` : 'Not added'}
            onClick={() => setShowPhoneVerify(true)} />
          <ListRow icon={Shield} title="Identity verification" sub={kycM[2]} onClick={() => navigate('/kyc')} />
          <ListRow icon={Camera} title="Profile photo" sub={hasPhoto ? 'Photo added' : 'No photo yet'} onClick={() => photoRef.current?.click()} />
        </div>
      </section>

      {(user?.frequentRoute?.from || user?.frequentRoute?.to) && (
        <section className={`${m.card} p-4`}>
          <p className="text-[13px] text-slate-500">Frequent route</p>
          <p className="text-[15px] font-semibold text-slate-900 mt-0.5">{user.frequentRoute.from} → {user.frequentRoute.to}</p>
          <p className="text-[13px] text-slate-500 mt-1">You get alerts for trips and parcels on this route.</p>
        </section>
      )}

      <section>
        <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Privacy</p>
        <BlockedUsersList desktop />
      </section>

      <section>
        <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Help and legal</p>
        <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
          <ListRow icon={HelpCircle} title="Help and support" sub="kabutar.support@gmail.com"
            onClick={() => window.open('mailto:kabutar.support@gmail.com?subject=Kabutar Support', '_blank')} />
          <ListRow icon={FileText} title="Terms and conditions" onClick={() => setLegalModal('terms')} />
          <ListRow icon={Lock} title="Privacy policy" onClick={() => setLegalModal('privacy')} />
        </div>
      </section>

      <section className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
        <ListRow icon={LogOut} title="Log out" onClick={handleLogout} right={<span />} />
        <ListRow icon={Trash2} title="Delete account" danger onClick={() => setShowDeleteModal(true)} right={<span />} />
      </section>

      {sheet && (
        <Sheet title={{ earnings: 'Earnings', alerts: 'Route alerts', notifications: 'Notifications' }[sheet]} onClose={() => setSheet(null)}>
          <div className={`${m.card} overflow-hidden -mx-0`}>
            {sheet === 'earnings' && (earnings ? <EarningsPanel data={earnings} /> : <p className="px-5 py-4 text-[13px] text-slate-500">Loading…</p>)}
            {sheet === 'alerts' && <RouteAlertsList />}
            {sheet === 'notifications' && <NotificationPrefsList />}
          </div>
        </Sheet>
      )}
      {editSheet}
      {modals}
    </div>
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
