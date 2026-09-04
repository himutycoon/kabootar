import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { format } from 'date-fns';
import {
  X, Star, CheckCircle, Clock, MapPin, MessageCircle,
  IndianRupee, ExternalLink, Shield, Train, Plane, Bus, Car,
  Package, ChevronRight, Share2, CalendarDays,
} from 'lucide-react';
import { getTripDates, formatTripDatesLong } from '../lib/tripDates';

const TRANSPORT_META = {
  train:  { icon: Train,  emoji: '🚂', label: 'Train',  color: 'bg-blue-50 text-blue-600 border-blue-100' },
  flight: { icon: Plane,  emoji: '✈️', label: 'Flight', color: 'bg-sky-50 text-sky-600 border-sky-100' },
  bus:    { icon: Bus,    emoji: '🚌', label: 'Bus',    color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  car:    { icon: Car,    emoji: '🚗', label: 'Car',    color: 'bg-amber-50 text-amber-600 border-amber-100' },
};

const fmtTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function TripDetailModal({ trip, onClose }) {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const authGate  = useAuthGate();
  const [offerOpen, setOfferOpen] = useState(false);

  if (!trip) return null;

  const meta      = TRANSPORT_META[trip.transportMode] || TRANSPORT_META.train;
  const ModeIcon  = meta.icon;
  const traveller = trip.userId;
  const isOwn     = traveller?._id === user?._id || trip.userId === user?._id;
  const isVerified= traveller?.kycStatus === 'verified';
  const dep       = fmtTime(trip.departureTime);
  const arr       = fmtTime(trip.arrivalTime);

  let duration = '';
  if (trip.departureTime && trip.arrivalTime) {
    const [dh, dm] = trip.departureTime.split(':').map(Number);
    const [ah, am] = trip.arrivalTime.split(':').map(Number);
    const mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins > 0) { const h = Math.floor(mins/60), m = mins%60; duration = `${h>0?h+'h ':''}${m>0?m+'m':''}`.trim(); }
  }

  const handleChat = () => {
    onClose();
    authGate(() => navigate(`/chat/${traveller._id}`));
  };

  const tripDates = getTripDates(trip);

  const handleShare = () => {
    const text = `🕊️ *Kabutar* — Traveller available!\n${trip.fromCity} → ${trip.toCity}\n📅 ${formatTripDatesLong(trip)} ${meta.emoji}\nCan carry ${trip.availableWeight}kg · ₹${trip.pricePerKg}/kg\nhttps://app.kabutar.in`;
    if (navigator.share) navigator.share({ title: 'Kabutar Traveller', text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl animate-slide-up"
        style={{ maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Drag handle + close — always visible at the very top ── */}
        <div className="shrink-0 bg-white px-4 pt-3 pb-2">
          {/* Drag handle pill */}
          <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-3" />
          {/* Header row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${meta.color}`}>
                {meta.emoji} {meta.label}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                {formatTripDatesLong(trip)}
              </span>
            </div>
            <button onClick={handleShare}
              className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 active:scale-90 transition-all shrink-0">
              <Share2 size={13} />
            </button>
            {/* Prominent close button */}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-white active:scale-90 transition-all shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="h-px bg-stone-100 shrink-0" />

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Route visualization — compact */}
          <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 mx-4 mt-3 rounded-2xl mb-3">
            <div className="flex items-center gap-3">
              {/* Origin */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200 shrink-0" />
                  <p className="text-lg font-black text-stone-900 truncate">{trip.fromCity}</p>
                </div>
                {trip.pickupStation && (
                  <p className="text-[11px] text-stone-500 ml-4.5 truncate pl-4">{trip.pickupStation}</p>
                )}
                {dep && <p className="text-sm font-bold text-orange-600 pl-4 mt-0.5">{dep}</p>}
              </div>

              {/* Connector */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="h-px w-10 bg-gradient-to-r from-orange-200 to-stone-200" />
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                  <ModeIcon size={14} className="text-stone-500" />
                </div>
                {duration && <p className="text-[9px] text-stone-400 font-semibold">{duration}</p>}
                <div className="h-px w-10 bg-gradient-to-r from-stone-200 to-emerald-200" />
              </div>

              {/* Destination */}
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-1.5 mb-0.5 justify-end">
                  <p className="text-lg font-black text-stone-900 truncate">{trip.toCity}</p>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                </div>
                {trip.dropStation && (
                  <p className="text-[11px] text-stone-500 truncate pr-4">{trip.dropStation}</p>
                )}
                {arr && <p className="text-sm font-bold text-emerald-600 pr-4 mt-0.5">{arr}</p>}
              </div>
            </div>
          </div>

          <div className="px-5 space-y-4 pb-4">

            {/* Full list of travel dates — only shown when there's more than one */}
            {tripDates.length > 1 && (
              <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CalendarDays size={11} /> Available on {tripDates.length} dates
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tripDates.map((d) => (
                    <span key={d.toISOString()} className="text-[11px] font-bold bg-white border border-stone-200 text-stone-700 px-2 py-1 rounded-lg">
                      {format(d, 'dd MMM yyyy')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PNR / Flight verification */}
            {(trip.pnrNumber || trip.flightNumber || trip.trainNumber) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-wide">Ticket Verification</p>
                {trip.pnrNumber && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 font-semibold">PNR Number</p>
                      <p className="text-base font-black text-stone-900 tracking-widest font-mono">
                        {trip.pnrNumber.slice(0,3)}
                        <span className="text-stone-300">●●●●</span>
                        {trip.pnrNumber.slice(-3)}
                      </p>
                    </div>
                    <button onClick={() => window.open(`https://enquiry.indianrail.gov.in/mntes/?pnr=${trip.pnrNumber}`, '_blank')}
                      className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
                      <ExternalLink size={12} /> Verify NTES
                    </button>
                  </div>
                )}
                {trip.trainNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-semibold">Train No:</span>
                    <span className="text-sm font-black text-stone-800 font-mono">{trip.trainNumber}</span>
                    <button onClick={() => window.open(`https://www.indiarailinfo.com/train/${trip.trainNumber}`, '_blank')}
                      className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 active:scale-95">
                      Track <ExternalLink size={9} />
                    </button>
                  </div>
                )}
                {trip.flightNumber && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 font-semibold">Flight Number</p>
                      <p className="text-base font-black text-stone-900 font-mono">{trip.flightNumber}</p>
                    </div>
                    <button onClick={() => window.open(`https://www.flightradar24.com/${trip.flightNumber}`, '_blank')}
                      className="flex items-center gap-1.5 bg-sky-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
                      <ExternalLink size={12} /> Track FR24
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-blue-500 flex items-center gap-1">
                  <Shield size={10} /> Traveller has shared verifiable ticket info
                </p>
              </div>
            )}

            {/* Capacity & price */}
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide mb-3">Capacity & Pricing</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-stone-100 text-center">
                  <Package size={18} className="text-orange-500 mx-auto mb-1" />
                  <p className="text-xl font-black text-stone-900">{trip.availableWeight} kg</p>
                  <p className="text-[10px] text-stone-400 font-medium">Available weight</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-stone-100 text-center">
                  <IndianRupee size={18} className="text-emerald-500 mx-auto mb-1" />
                  <p className="text-xl font-black text-stone-900">₹{trip.pricePerKg}</p>
                  <p className="text-[10px] text-stone-400 font-medium">Per kilogram</p>
                </div>
              </div>
              <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-stone-600">
                  Send a <span className="font-bold">2 kg</span> parcel →{' '}
                  <span className="font-black text-orange-600 text-sm">₹{trip.pricePerKg * 2}</span>
                  <span className="text-stone-400"> · </span>
                  <span className="font-bold">5 kg</span> →{' '}
                  <span className="font-black text-orange-600 text-sm">₹{trip.pricePerKg * 5}</span>
                </p>
              </div>
            </div>

            {/* Traveller profile */}
            {traveller && typeof traveller === 'object' && !isOwn && (
              <div className="border border-stone-100 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Traveller</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-orange-100 flex items-center justify-center font-black text-xl text-orange-600 shrink-0 border-2 border-orange-100">
                    {traveller.profileImage
                      ? <img src={traveller.profileImage} alt={traveller.name} className="w-full h-full object-cover" />
                      : traveller.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-stone-900 text-base">{traveller.name}</span>
                      {isVerified && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle size={9} /> KYC Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-bold text-stone-700">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        {traveller.rating?.toFixed(1)}
                        <span className="text-xs font-normal text-stone-400">({traveller.totalRatings || 0})</span>
                      </span>
                      {traveller.tripsCompleted > 0 && (
                        <span className="text-xs text-stone-500 font-semibold">
                          ✅ {traveller.tripsCompleted} deliveries done
                        </span>
                      )}
                      {traveller.city && (
                        <span className="text-xs text-stone-400">📍 {traveller.city}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {trip.notes && (
              <div className="bg-stone-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide mb-1.5">Traveller's Note</p>
                <p className="text-sm text-stone-700 leading-relaxed">"{trip.notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky CTA ── */}
        <div className="px-4 py-3 border-t border-stone-100 bg-white shrink-0 space-y-2">
          {!isOwn && traveller && typeof traveller === 'object' && (
            <button onClick={handleChat}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white text-sm transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
              <MessageCircle size={16} />
              Chat with {traveller.name?.split(' ')[0]}
            </button>
          )}
          {/* Always-visible close — user doesn't need to scroll up to dismiss */}
          <button onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-stone-100 text-stone-600 text-sm font-semibold active:scale-[0.98] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
