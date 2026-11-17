import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { MapPin, Trash2, MessageCircle, Star,
         Train, Plane, Bus, Car, CheckCircle, ChevronRight, Clock, Edit2, ExternalLink } from 'lucide-react';
import TravelerProfileModal from './TravelerProfileModal';
import TripDetailModal from './TripDetailModal';
import { formatTripDatesLong } from '../lib/tripDates';

const TRANSPORT_ICONS  = { train: Train, flight: Plane, bus: Bus, car: Car };
const TRANSPORT_EMOJI  = { train: '🚂', flight: '✈️', bus: '🚌', car: '🚗' };
const TRANSPORT_LABELS = { train: 'Train', flight: 'Flight', bus: 'Bus', car: 'Car' };

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function WAIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function shareToWA(text) {
  if (navigator.share) navigator.share({ title: 'Kabutar', text }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function Avatar({ user, verified }) {
  return (
    <div className="relative shrink-0">
      <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-50 border-2 border-white shadow-sm flex items-center justify-center font-bold text-xs text-orange-600"
        style={verified ? { borderColor: '#3b82f6' } : {}}>
        {user?.profileImage
          ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
          : user?.name?.[0]?.toUpperCase()}
      </div>
      {/* Instagram-style blue verified tick */}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
          <svg viewBox="0 0 10 8" width="7" height="6" fill="white">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// variant="row" → desktop-web list row (used only by desktop pages); default is the mobile card
export default function TripCard({ trip, showDelete, onDelete, onEdit, onMarkFull, isPast = false, variant = 'card' }) {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const authGate   = useAuthGate();
  const [showProfile, setShowProfile] = useState(false);
  const [showDetail,  setShowDetail]  = useState(false);

  const Icon       = TRANSPORT_ICONS[trip.transportMode] || Train;
  const traveler   = trip.userId;
  const isOwn      = traveler?._id === user?._id || trip.userId === user?._id;
  const isVerified = traveler?.kycStatus === 'verified';

  // Departure → arrival string
  const dep = fmtTime(trip.departureTime);
  const arr = fmtTime(trip.arrivalTime);
  let duration = '';
  if (trip.departureTime && trip.arrivalTime) {
    const [dh, dm] = trip.departureTime.split(':').map(Number);
    const [ah, am] = trip.arrivalTime.split(':').map(Number);
    const mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins > 0) {
      const h = Math.floor(mins / 60), m = mins % 60;
      duration = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm' : ''}`.trim();
    }
  }

  const handleShare = (e) => {
    e.stopPropagation();
    shareToWA(
`🕊️ *Kabutar* — Traveller available for your parcel!

${trip.fromCity} → ${trip.toCity}
📅 ${formatTripDatesLong(trip)} · ${TRANSPORT_EMOJI[trip.transportMode]} ${TRANSPORT_LABELS[trip.transportMode]}
Can carry up to ${trip.availableWeight} kg · ₹${trip.pricePerKg}/kg${dep ? `\n🕐 Departs ${dep}` : ''}${arr ? ` · Arrives ${arr}` : ''}
${trip.pickupStation ? `📍 ${trip.pickupStation}` : ''}
${traveler?.rating ? `⭐ ${traveler.rating.toFixed(1)} rated traveller` : ''}

Book a parcel spot 👇
https://app.kabutar.in`
    );
  };

  const modals = (
    <>
      {showProfile && traveler && !isPast && (
        <TravelerProfileModal
          travelerId={traveler._id}
          travelerSnap={traveler}
          onClose={() => setShowProfile(false)}
          onChat={() => { setShowProfile(false); authGate(() => navigate(`/chat/${traveler._id}`)); }}
        />
      )}
      {showDetail && !isPast && (
        <TripDetailModal trip={trip} onClose={() => setShowDetail(false)} />
      )}
    </>
  );

  if (variant === 'row') {
    const hasTraveler = traveler && typeof traveler === 'object';
    const clickable = !isOwn && !isPast;
    const actBtn = 'h-9 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors';
    return (
      <>
        <div
          className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_7.5rem_auto] items-center gap-6 px-5 py-4 transition-colors ${clickable ? 'cursor-pointer hover:bg-slate-50' : ''} ${isPast ? 'opacity-60' : ''}`}
          onClick={() => { if (clickable) setShowDetail(true); }}>

          {/* Who */}
          <div className="flex items-center gap-3 min-w-0">
            {isOwn ? (
              <>
                <span className="w-10 h-10 rounded-xl bg-kb-50 text-kb-600 flex items-center justify-center shrink-0"><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Your trip</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{TRANSPORT_LABELS[trip.transportMode]}{isPast ? ' · Past' : ''}</span>
                </span>
              </>
            ) : hasTraveler ? (
              <>
                <span className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 text-sm font-semibold text-slate-600">
                  {traveler.profileImage ? <img src={traveler.profileImage} alt="" className="w-full h-full object-cover" loading="lazy" /> : traveler.name?.[0]?.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-slate-900 truncate">{traveler.name}</span>
                    {isVerified && (
                      <span title="ID verified" aria-label="ID verified" className="text-emerald-600 shrink-0 inline-flex">
                        <CheckCircle size={14} />
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    {traveler.totalRatings > 0 ? (
                      <><Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-800">{traveler.rating?.toFixed(1)}</span>
                        <span className="text-slate-400">({traveler.totalRatings})</span></>
                    ) : <span className="text-slate-400">No reviews yet</span>}
                    {traveler.tripsCompleted > 0 && <span className="text-slate-400">· {traveler.tripsCompleted} deliveries</span>}
                  </span>
                </span>
              </>
            ) : <span className="text-sm text-slate-500">Traveller</span>}
          </div>

          {/* Route + schedule */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 min-w-0">
              <span className="truncate">{trip.fromCity}</span>
              <span className="text-slate-400 shrink-0">→</span>
              <span className="truncate">{trip.toCity}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
              <Icon size={13} className="shrink-0" />
              <span className="truncate">
                {TRANSPORT_LABELS[trip.transportMode]} · {formatTripDatesLong(trip)}
                {dep ? ` · Departs ${dep}` : ''}{arr ? ` · Arrives ${arr}` : ''}{duration ? ` (${duration})` : ''}
              </span>
            </div>
            {(trip.pickupStation || trip.pnrNumber || trip.trainNumber || trip.flightNumber) && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 min-w-0">
                {trip.pickupStation && <span className="truncate flex items-center gap-1"><MapPin size={11} className="shrink-0" />{trip.pickupStation}</span>}
                {(trip.pnrNumber || trip.trainNumber) && <span className="shrink-0 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md font-semibold text-[11px]">Ticket details shared</span>}
                {trip.flightNumber && <span className="shrink-0 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md font-semibold text-[11px]">{trip.flightNumber}</span>}
              </div>
            )}
          </div>

          {/* Capacity */}
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">₹{trip.pricePerKg}<span className="text-slate-400 font-normal">/kg</span></div>
            <div className="text-xs text-slate-500 mt-0.5">{trip.availableWeight} kg space</div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            {!isPast && (
              <button type="button" onClick={handleShare} title="Share on WhatsApp" aria-label="Share on WhatsApp"
                className="w-9 h-9 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors">
                <WAIcon />
              </button>
            )}
            {!isOwn && !isPast && hasTraveler && (
              <>
                <button type="button" onClick={() => authGate(() => navigate(`/chat/${traveler._id}`))}
                  className={`${actBtn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                  <MessageCircle size={14} /> Chat
                </button>
                <button type="button" onClick={() => setShowDetail(true)}
                  className={`${actBtn} bg-kb-500 hover:bg-kb-600 text-white`}>
                  View <ChevronRight size={14} />
                </button>
              </>
            )}
            {isOwn && !isPast && (
              <>
                {onMarkFull && (
                  <button type="button" onClick={onMarkFull} className={`${actBtn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                    <CheckCircle size={14} /> Mark full
                  </button>
                )}
                {onEdit && (
                  <button type="button" onClick={onEdit} className={`${actBtn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                    <Edit2 size={13} /> Edit
                  </button>
                )}
                {showDelete && (
                  <button type="button" onClick={onDelete} aria-label="Delete trip" title="Delete trip"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {modals}
      </>
    );
  }

  const hasTraveler = traveler && typeof traveler === 'object';
  const clickable = !isOwn && !isPast;
  const sBtn = 'h-10 px-4 rounded-xl text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors';
  return (
    <>
      <div className={`bg-white border border-slate-200 rounded-2xl p-4 ${isPast ? 'opacity-60' : ''} ${clickable ? 'active:bg-slate-50' : ''}`}
        onClick={() => { if (clickable) setShowDetail(true); }}>

        {/* Who */}
        {isOwn ? (
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Your trip{isPast ? ' · Past' : ''}</span>
            {!isPast && (
              <button type="button" onClick={handleShare} aria-label="Share on WhatsApp"
                className="w-9 h-9 -mr-2 rounded-full text-slate-400 active:bg-emerald-50 active:text-emerald-600 flex items-center justify-center"><WAIcon /></button>
            )}
          </div>
        ) : hasTraveler && (
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 text-sm font-semibold text-slate-600">
              {traveler.profileImage ? <img src={traveler.profileImage} alt="" className="w-full h-full object-cover" loading="lazy" /> : traveler.name?.[0]?.toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-[15px] font-semibold text-slate-900 truncate">{traveler.name}</span>
                {isVerified && <CheckCircle size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
              </span>
              <span className="flex items-center gap-1 text-[13px] text-slate-500">
                {traveler.totalRatings > 0
                  ? <><Star size={12} className="fill-amber-400 text-amber-400" /> <span className="font-semibold text-slate-700">{traveler.rating?.toFixed(1)}</span> ({traveler.totalRatings})</>
                  : 'No reviews yet'}
                {traveler.tripsCompleted > 0 && <span>· {traveler.tripsCompleted} deliveries</span>}
              </span>
            </span>
            {!isPast && (
              <button type="button" onClick={handleShare} aria-label="Share on WhatsApp"
                className="w-9 h-9 -mr-2 rounded-full text-slate-400 active:bg-emerald-50 active:text-emerald-600 flex items-center justify-center shrink-0"><WAIcon /></button>
            )}
          </div>
        )}

        {/* Route */}
        <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-900 min-w-0">
          <span className="truncate">{trip.fromCity}</span>
          <span className="text-slate-400 shrink-0">→</span>
          <span className="truncate">{trip.toCity}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-1">
          <Icon size={14} className="shrink-0" />
          <span className="truncate">{TRANSPORT_LABELS[trip.transportMode]} · {formatTripDatesLong(trip)}</span>
        </div>
        {(dep || arr) && (
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-0.5">
            <Clock size={13} className="shrink-0" />
            <span>{dep && `Departs ${dep}`}{dep && arr ? ' · ' : ''}{arr && `Arrives ${arr}`}{duration ? ` (${duration})` : ''}</span>
          </div>
        )}
        {trip.pickupStation && (
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-0.5 min-w-0">
            <MapPin size={13} className="shrink-0" /><span className="truncate">{trip.pickupStation}</span>
          </div>
        )}

        {/* Capacity + price */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{trip.availableWeight} kg space</span>
          <span className="text-[13px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">₹{trip.pricePerKg}/kg</span>
          {(trip.pnrNumber || trip.trainNumber) && <span className="text-[12px] font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">Ticket details shared</span>}
          {trip.flightNumber && <span className="text-[12px] font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">{trip.flightNumber}</span>}
        </div>

        {/* Actions */}
        {!isPast && (clickable && hasTraveler ? (
          <div className="grid grid-cols-2 gap-2 mt-4" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => authGate(() => navigate(`/chat/${traveler._id}`))}
              className={`${sBtn} border border-slate-200 text-slate-800 active:bg-slate-50`}><MessageCircle size={16} /> Chat</button>
            <button type="button" onClick={() => setShowDetail(true)}
              className={`${sBtn} bg-kb-500 active:bg-kb-600 text-white`}>View trip <ChevronRight size={16} /></button>
          </div>
        ) : isOwn && (onMarkFull || onEdit || showDelete) ? (
          <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
            {onEdit && <button type="button" onClick={onEdit} className={`${sBtn} flex-1 border border-slate-200 text-slate-800 active:bg-slate-50`}><Edit2 size={15} /> Edit</button>}
            {onMarkFull && <button type="button" onClick={onMarkFull} className={`${sBtn} flex-1 border border-slate-200 text-slate-800 active:bg-slate-50`}><CheckCircle size={15} /> Mark full</button>}
            {showDelete && (
              <button type="button" onClick={onDelete} aria-label="Delete trip"
                className="w-10 h-10 rounded-xl border border-red-200 text-red-600 active:bg-red-50 flex items-center justify-center shrink-0"><Trash2 size={16} /></button>
            )}
          </div>
        ) : null)}
      </div>

      {modals}
    </>
  );
}
