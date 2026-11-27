import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ChevronDown, ChevronUp, Camera, Trash2, Edit2, CheckCircle2, AlertTriangle, History, Star } from 'lucide-react';
import ParcelStatusTimeline from '../components/ParcelStatusTimeline';
import OtpVerifyModal from '../components/OtpVerifyModal';
import HandoverCodeCard from '../components/HandoverCodeCard';
import RatingModal from '../components/RatingModal';
import { PhotoStrip } from '../components/ParcelCard';
import PostParcelModal from '../components/PostParcelModal';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, Tabs, EmptyState, Avatar, Pill } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { ScreenHeader, Segmented } from '../components/mobile/ui';
import { FileText, Smartphone, Shirt, Package, KeyRound, BadgeCheck } from 'lucide-react';

const DESK_ITEM_ICON = { documents: FileText, electronics: Smartphone, clothes: Shirt, others: Package };
const DESK_STATUS = {
  open:       ['Looking for a traveller', 'green'],
  matched:    ['Traveller found', 'blue'],
  requested:  ['Awaiting response', 'blue'],
  accepted:   ['Accepted, awaiting pickup', 'amber'],
  picked:     ['Picked up', 'amber'],
  in_transit: ['In transit', 'amber'],
  delivered:  ['Delivered, confirm receipt', 'orange'],
  completed:  ['Completed', 'green'],
  cancelled:  ['Cancelled', 'slate'],
};

const ITEM_EMOJI = { documents: '📄', electronics: '📱', clothes: '👕', others: '📦' };

const STATUS_BADGE = {
  open:       'badge-green',
  matched:    'badge-blue',
  requested:  'badge-blue',
  accepted:   'badge-amber',
  picked:     'badge-orange',
  in_transit: 'badge-amber',
  delivered:  'badge-violet',
  completed:  'badge-green',
  cancelled:  'badge-stone',
};

const STATUS_LABEL = {
  open:       '🟢 Open',
  accepted:   '⚡ In Progress',
  picked:     '📤 Picked Up',
  in_transit: '🚚 In Transit',
  delivered:  '📦 Delivered — Confirm?',
  completed:  '✅ Completed',
  cancelled:  '❌ Cancelled',
};

export default function MyParcelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpModal,      setOtpModal]      = useState(null);
  const [uploadingPhoto,setUploadingPhoto] = useState({});
  const [editingParcel, setEditingParcel]  = useState(null);

  useEffect(() => {
    api.get('/parcels/my')
      .then(r => setParcels(r.data.parcels))
      .catch(() => toast.error('Failed to load parcels'))
      .finally(() => setLoading(false));
  }, []);


  const isTraveler = (parcel) =>
    parcel.travelerId && (
      parcel.travelerId._id === user?._id || parcel.travelerId === user?._id
    );

  const uploadPhoto = async (parcelId, type, file) => {
    setUploadingPhoto(p => ({ ...p, [`${parcelId}-${type}`]: true }));
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post(`/parcels/${parcelId}/${type}-photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParcels(prev => prev.map(p => p._id === parcelId ? { ...p, ...data.parcel } : p));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingPhoto(p => ({ ...p, [`${parcelId}-${type}`]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this parcel request?')) return;
    try {
      await api.delete(`/parcels/${id}`);
      setParcels(prev => prev.filter(p => p._id !== id));
      toast.success('Parcel request deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleEditSuccess = (updated) => {
    setParcels(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
    setEditingParcel(null);
    toast.success('Parcel updated!');
  };

  const handleOtpSuccess = (updated) => {
    setParcels(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
  };

  const [confirming, setConfirming] = useState({});
  const [marking,    setMarking]    = useState({});
  const isDesktopWeb = useDesktopWeb();
  const [searchParams] = useSearchParams();
  const [deskTab, setDeskTab] = useState(searchParams.get('tab') === 'history' ? 'history' : 'active');
  const [reviewing, setReviewing] = useState(null); // { parcel, partner }

  const markDelivered = async (parcelId) => {
    if (!confirm('Mark this parcel as delivered? This will complete the transaction and update the traveller\'s delivery count.')) return;
    setMarking(m => ({ ...m, [parcelId]: true }));
    try {
      const { data } = await api.patch(`/parcels/${parcelId}/mark-delivered`);
      setParcels(prev => prev.map(p => p._id === parcelId ? { ...p, ...data.parcel } : p));
      toast.success('✅ Parcel marked as delivered! Traveller count updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed — try again');
    } finally {
      setMarking(m => ({ ...m, [parcelId]: false }));
    }
  };
  const confirmReceipt = async (parcelId) => {
    if (!confirm('Confirm you have received this parcel? This will complete the delivery and update the traveller\'s count.')) return;
    setConfirming(c => ({ ...c, [parcelId]: true }));
    try {
      const { data } = await api.post(`/parcels/${parcelId}/confirm-receipt`);
      setParcels(prev => prev.map(p => p._id === parcelId ? { ...p, ...data.parcel } : p));
      toast.success('✅ Receipt confirmed! Traveller\'s delivery count updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    } finally {
      setConfirming(c => ({ ...c, [parcelId]: false }));
    }
  };

  if (loading) return (
    <div className={isDesktopWeb ? 'space-y-6' : 'px-4 pt-1 pb-4 space-y-4'}>
      {isDesktopWeb
        ? <PageHeader title="My parcels" sub="Parcels you are sending and parcels you are carrying." />
        : <ScreenHeader title="My parcels" back />}
      <div className="space-y-4">{[0, 1].map(i => <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse" />)}</div>
    </div>
  );

  if (loading) return (
    <div className="px-4 py-5 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-stone-100 rounded w-3/4 mb-2" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  const activeParcels    = parcels.filter(p => !['completed','cancelled'].includes(p.status));
  const completedParcels = parcels.filter(p => p.status === 'completed');

  // ── One layout for desktop and mobile (stacks on phones) ──
  {
    const photoInput = (parcel, type) => {
      const busy = uploadingPhoto[`${parcel._id}-${type}`];
      return (
        <label className={`${btn.secondary} ${btn.md} cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          <Camera size={15} /> {busy ? 'Uploading…' : `Upload ${type} photo`}
          <input type="file" accept="image/*" className="hidden" disabled={busy}
            onChange={e => e.target.files[0] && uploadPhoto(parcel._id, type, e.target.files[0])} />
        </label>
      );
    };
    const list = deskTab === 'active' ? activeParcels : completedParcels;
    return (
      <div className={isDesktopWeb ? 'space-y-6' : 'px-4 pt-1 pb-4 space-y-4'}>
        {isDesktopWeb ? (
          <>
            <PageHeader title="My parcels" sub="Parcels you are sending and parcels you are carrying."
              actions={<button type="button" onClick={() => navigate('/parcels')} className={`${btn.secondary} ${btn.lg}`}>Browse parcel requests</button>} />
            <Tabs value={deskTab} onChange={setDeskTab}
              items={[{ k: 'active', label: 'Active', count: activeParcels.length }, { k: 'history', label: 'Delivery history', count: completedParcels.length }]} />
          </>
        ) : (
          <>
            <ScreenHeader title="My parcels" back />
            <Segmented value={deskTab} onChange={setDeskTab}
              items={[['active', 'Active', activeParcels.length], ['history', 'History', completedParcels.length]]} />
          </>
        )}

        {list.length === 0 ? (
          <Card>
            <EmptyState icon={Package}
              title={deskTab === 'active' ? 'No active parcels' : 'No completed deliveries yet'}
              body={deskTab === 'active' ? 'Post a parcel request, or accept one on a trip you are taking.' : 'Completed deliveries you send or carry will be listed here.'} />
          </Card>
        ) : deskTab === 'history' ? (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {list.map(parcel => {
              const ItemIcon = DESK_ITEM_ICON[parcel.itemType] || Package;
              const asTrav = isTraveler(parcel);
              const partner = asTrav ? parcel.userId : parcel.travelerId;
              const canReview = partner && typeof partner === 'object' && !(asTrav ? parcel.travelerReviewed : parcel.senderReviewed);
              return (
                <div key={parcel._id} className={`flex items-center gap-3 ${isDesktopWeb ? 'px-5 py-4 gap-4' : 'p-4'}`}>
                  <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><ItemIcon size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{parcel.fromCity} → {parcel.toCity}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{asTrav ? 'Carried' : 'Sent'} · {parcel.weight} kg{parcel.offeredPrice ? ` · ₹${parcel.offeredPrice}` : ''}</span>
                  </span>
                  {isDesktopWeb && <span className="text-xs text-slate-400">{parcel.completedAt ? formatDistanceToNow(new Date(parcel.completedAt), { addSuffix: true }) : ''}</span>}
                  {canReview ? (
                    <button type="button" onClick={() => setReviewing({ parcel, partner })} className={`${btn.primary} ${btn.sm} shrink-0`}>
                      <Star size={14} /> Review
                    </button>
                  ) : <Pill tone="green"><CheckCircle2 size={12} /> {isDesktopWeb ? 'Completed' : 'Done'}</Pill>}
                </div>
              );
            })}
          </Card>
        ) : (
          <div className="space-y-4">
            {list.map(parcel => {
              const asTraveler = isTraveler(parcel);
              const partner = asTraveler ? parcel.userId : parcel.travelerId;
              const hasPartner = partner && typeof partner === 'object';
              const ItemIcon = DESK_ITEM_ICON[parcel.itemType] || Package;
              const [stLabel, stTone] = DESK_STATUS[parcel.status] || [parcel.status, 'slate'];
              const inProgress = ['accepted', 'picked', 'in_transit'].includes(parcel.status);
              const step = asTraveler && parcel.status === 'accepted' ? 'pickup' : asTraveler && parcel.status === 'picked' ? 'delivery' : null;
              const stepPhoto = step === 'pickup' ? parcel.pickupPhotoUrl : step === 'delivery' ? parcel.deliveryPhotoUrl : null;
              return (
                <Card key={parcel._id} className={isDesktopWeb ? 'grid grid-cols-[minmax(0,1fr)_300px] overflow-hidden' : 'overflow-hidden'}>
                  <div className={`${isDesktopWeb ? 'p-6' : 'p-4'} space-y-5 min-w-0`}>
                    <div className="flex items-start gap-4">
                      <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><ItemIcon size={20} /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-900">{parcel.fromCity} → {parcel.toCity}</h3>
                          <Pill tone={stTone}>{stLabel}</Pill>
                          <Pill tone={asTraveler ? 'blue' : 'slate'}>{asTraveler ? 'You are carrying' : 'You are sending'}</Pill>
                        </div>
                        <p className="text-[13px] text-slate-500 mt-1">
                          {parcel.weight} kg{parcel.offeredPrice ? ` · ₹${parcel.offeredPrice} agreed` : ''}{parcel.pickupStation ? ` · ${parcel.pickupStation}` : ''} · posted {formatDistanceToNow(new Date(parcel.createdAt), { addSuffix: true })}
                        </p>
                        {parcel.description && <p className="text-[13px] text-slate-600 mt-2">{parcel.description}</p>}
                        {parcel.photos?.length > 0 && <div className="mt-2.5"><PhotoStrip photos={parcel.photos} size={52} /></div>}
                      </div>
                    </div>

                    {hasPartner && (
                      <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3">
                        <Avatar user={partner} size={36} />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 truncate">{partner.name}</span>
                            {partner.kycStatus === 'verified' && <BadgeCheck size={14} className="text-emerald-600" aria-label="ID verified" />}
                          </span>
                          <span className="block text-xs text-slate-500">{asTraveler ? 'Sender' : 'Traveller'}</span>
                        </span>
                        <button type="button" onClick={() => navigate(`/chat/${partner._id}`)} className={`${btn.secondary} ${btn.sm}`}>
                          <MessageCircle size={14} /> Chat
                        </button>
                      </div>
                    )}

                    {/* Traveller step: photo, then one-time code */}
                    {step && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-slate-900">{step === 'pickup' ? 'Confirm pickup' : 'Confirm delivery'}</p>
                        <p className="text-[13px] text-slate-500 mt-0.5">Upload a {step} photo, then send a one-time code to the sender and enter it when they give it to you.</p>
                        <div className={`flex gap-3 mt-3 ${isDesktopWeb ? 'items-center' : 'flex-col items-stretch'}`}>
                          {stepPhoto
                            ? <img src={stepPhoto} alt={`${step} photo`} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                            : photoInput(parcel, step)}
                          <button type="button" onClick={() => setOtpModal({ parcel, type: step })} disabled={!stepPhoto} className={`${btn.primary} ${btn.md}`}>
                            <KeyRound size={15} /> Confirm with code
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sender: the handover code the traveller asked Kabutar to send */}
                    {!asTraveler && inProgress && (
                      <HandoverCodeCard parcel={parcel} type={parcel.status === 'accepted' ? 'pickup' : 'delivery'} />
                    )}

                    {/* Sender actions */}
                    {!asTraveler && inProgress && (
                      <div className={`flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 ${isDesktopWeb ? 'items-start' : 'flex-col'}`}>
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[13px] text-amber-800 flex-1">
                          In progress. This request is hidden from public listings.
                          {parcel.status === 'accepted' ? ' The traveller will pick it up soon.' : parcel.status === 'picked' ? ' The traveller has picked it up.' : ' Your parcel is on its way.'}
                        </p>
                        <button type="button" onClick={() => markDelivered(parcel._id)} disabled={marking[parcel._id]}
                          className={`${btn.secondary} ${btn.sm} shrink-0`}>
                          <CheckCircle2 size={14} /> {marking[parcel._id] ? 'Saving…' : 'Mark as delivered'}
                        </button>
                      </div>
                    )}
                    {!asTraveler && parcel.status === 'delivered' && (
                      <div className={`flex gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 ${isDesktopWeb ? 'items-center' : 'flex-col'}`}>
                        <p className="text-[13px] text-emerald-800 flex-1">The traveller marked this as delivered. Confirming receipt completes the delivery.</p>
                        <button type="button" onClick={() => confirmReceipt(parcel._id)} disabled={confirming[parcel._id]}
                          className={`${btn.primary} ${btn.sm} shrink-0`}>
                          <CheckCircle2 size={14} /> {confirming[parcel._id] ? 'Confirming…' : 'Confirm received'}
                        </button>
                      </div>
                    )}
                    {!asTraveler && ['open', 'cancelled'].includes(parcel.status) && (
                      <div className="flex items-center gap-2">
                        {parcel.status === 'open' && (
                          <button type="button" onClick={() => setEditingParcel(parcel)} className={`${btn.secondary} ${btn.sm}`}><Edit2 size={13} /> Edit</button>
                        )}
                        <button type="button" onClick={() => handleDelete(parcel._id)} className={`${btn.danger} ${btn.sm}`}><Trash2 size={13} /> Delete</button>
                      </div>
                    )}
                  </div>
                  <div className={isDesktopWeb ? 'bg-slate-50 border-l border-slate-200 p-5' : 'bg-slate-50 border-t border-slate-200 p-4'}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Progress</p>
                    <ParcelStatusTimeline status={parcel.status} acceptedAt={parcel.acceptedAt} pickedAt={parcel.pickedAt}
                      deliveredAt={parcel.deliveredAt} completedAt={parcel.completedAt} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {reviewing && (
          <RatingModal partner={reviewing.partner} parcelId={reviewing.parcel._id} onClose={() => setReviewing(null)}
            onSubmitted={() => setParcels(prev => prev.map(p => p._id !== reviewing.parcel._id ? p
              : { ...p, [isTraveler(p) ? 'travelerReviewed' : 'senderReviewed']: true }))} />
        )}
        {otpModal && <OtpVerifyModal parcel={otpModal.parcel} type={otpModal.type} onClose={() => setOtpModal(null)} onSuccess={handleOtpSuccess} />}
        {editingParcel && <PostParcelModal initialData={editingParcel} parcelId={editingParcel._id} onClose={() => setEditingParcel(null)} onSuccess={handleEditSuccess} />}
      </div>
    );
  }

}
