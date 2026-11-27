import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import { format } from 'date-fns';
import {
  Star, CheckCircle2, MapPin, MessageCircle, ExternalLink, Shield, TrainFront, Plane, Bus, Car,
  ChevronRight, Share2, CalendarDays, Clock, StickyNote, ShieldCheck,
} from 'lucide-react';
import { getTripDates, formatTripDatesLong } from '../lib/tripDates';
import { Sheet } from './mobile/ui';
import { m } from './mobile/styles';
import TravelerProfileModal from './TravelerProfileModal';

const TRANSPORT_META = {
  train:  { icon: TrainFront, label: 'Train' },
  flight: { icon: Plane,      label: 'Flight' },
  bus:    { icon: Bus,        label: 'Bus' },
  car:    { icon: Car,        label: 'Car' },
};

const fmtTime = (t) => {
  if (!t) return null;
  const [h, mi] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function TripDetailModal({ trip, onClose }) {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const authGate  = useAuthGate();
  const [showProfile, setShowProfile] = useState(false);

  if (!trip) return null;

  const meta      = TRANSPORT_META[trip.transportMode] || TRANSPORT_META.train;
  const ModeIcon  = meta.icon;
  const traveller = trip.userId;
  const hasTraveller = traveller && typeof traveller === 'object';
  const isOwn     = traveller?._id === user?._id || trip.userId === user?._id;
  const isVerified= traveller?.kycStatus === 'verified';
  const dep       = fmtTime(trip.departureTime);
  const arr       = fmtTime(trip.arrivalTime);
  const sod = new Date(); sod.setHours(0, 0, 0, 0);
  const tripDates = getTripDates(trip).filter(d => d >= sod); // upcoming only

  let duration = '';
  if (trip.departureTime && trip.arrivalTime) {
    const [dh, dm] = trip.departureTime.split(':').map(Number);
    const [ah, am] = trip.arrivalTime.split(':').map(Number);
    const mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins > 0) { const h = Math.floor(mins / 60), mm = mins % 60; duration = `${h > 0 ? h + 'h ' : ''}${mm > 0 ? mm + 'm' : ''}`.trim(); }
  }

  const handleChat = () => { onClose(); authGate(() => navigate(`/chat/${traveller._id}`)); };
  const handleShare = () => {
    const text = `Kabutar — traveller available\n${trip.fromCity} → ${trip.toCity}\n${formatTripDatesLong(trip)} · ${meta.label}\nCan carry ${trip.availableWeight} kg · ₹${trip.pricePerKg}/kg\nhttps://kabutar.in`;
    if (navigator.share) navigator.share({ title: 'Kabutar traveller', text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <>
      <Sheet title={`${trip.fromCity} → ${trip.toCity}`} onClose={onClose}
        footer={!isOwn && hasTraveller ? (
          <button type="button" onClick={handleChat} className={`${m.btnPrimary} w-full`}>
            <MessageCircle size={18} /> Message {traveller.name?.split(' ')[0]}
          </button>
        ) : null}>
        <div className="space-y-4">
          {/* Route */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <ModeIcon size={15} /> {meta.label} · {formatTripDatesLong(trip)}
              <button type="button" onClick={handleShare} aria-label="Share trip"
                className="ml-auto w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100 hover:bg-slate-100"><Share2 size={17} /></button>
            </div>
            <div className="mt-2 flex items-stretch gap-3">
              <div className="flex flex-col items-center pt-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-kb-500" />
                <span className="flex-1 w-px bg-slate-200 my-1" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-[17px] font-semibold text-slate-900">{trip.fromCity}</p>
                  <p className="text-[13px] text-slate-500">{[dep && `Departs ${dep}`, trip.pickupStation].filter(Boolean).join(' · ') || 'Departure details in chat'}</p>
                </div>
                {duration && <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> About {duration}</p>}
                <div>
                  <p className="text-[17px] font-semibold text-slate-900">{trip.toCity}</p>
                  <p className="text-[13px] text-slate-500">{[arr && `Arrives ${arr}`, trip.dropStation].filter(Boolean).join(' · ') || 'Arrival details in chat'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Space & price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-2xl p-3.5">
              <p className="text-xs text-slate-500">Space available</p>
              <p className="text-[20px] font-semibold text-slate-900 mt-0.5">{trip.availableWeight} kg</p>
            </div>
            <div className="border border-slate-200 rounded-2xl p-3.5">
              <p className="text-xs text-slate-500">Price</p>
              <p className="text-[20px] font-semibold text-slate-900 mt-0.5">₹{trip.pricePerKg}<span className="text-[14px] text-slate-400 font-normal">/kg</span></p>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 -mt-1 px-1">
            For example, 2 kg would be ₹{trip.pricePerKg * 2}. Agree the final amount with the traveller in chat.
          </p>

          {tripDates.length > 1 && (
            <div className="border border-slate-200 rounded-2xl p-4">
              <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5"><CalendarDays size={15} /> Travelling on {tripDates.length} upcoming dates</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tripDates.map(d => (
                  <span key={d.toISOString()} className="text-[12px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">{format(d, 'd MMM')}</span>
                ))}
              </div>
            </div>
          )}

          {trip.isVerified && (
            <div className="border border-emerald-200 bg-emerald-50/60 rounded-2xl p-4 flex gap-3">
              <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-slate-900">Ticket verified by Kabutar</p>
                <p className="text-[13px] text-slate-600 mt-0.5">We checked this traveller's ticket matches the route and date.</p>
              </div>
            </div>
          )}

          {(trip.pnrNumber || trip.flightNumber || trip.trainNumber) && (
            <div className="border border-sky-200 bg-sky-50/50 rounded-2xl p-4 space-y-3">
              <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5"><Shield size={15} className="text-sky-600" /> Ticket details shared</p>
              {trip.pnrNumber && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">PNR</p>
                    <p className="text-[15px] font-semibold text-slate-900 font-mono tracking-wider">{trip.pnrNumber.slice(0, 3)}••••{trip.pnrNumber.slice(-3)}</p>
                  </div>
                  <a href={`https://enquiry.indianrail.gov.in/mntes/?pnr=${trip.pnrNumber}`} target="_blank" rel="noopener noreferrer"
                    className={`${m.btnSmall} border border-sky-200 bg-white text-sky-700`}>Check on NTES <ExternalLink size={13} /></a>
                </div>
              )}
              {trip.trainNumber && (
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs text-slate-500">Train</p><p className="text-[15px] font-semibold text-slate-900 font-mono">{trip.trainNumber}</p></div>
                  <a href={`https://www.indiarailinfo.com/train/${trip.trainNumber}`} target="_blank" rel="noopener noreferrer"
                    className={`${m.btnSmall} border border-sky-200 bg-white text-sky-700`}>Train info <ExternalLink size={13} /></a>
                </div>
              )}
              {trip.flightNumber && (
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs text-slate-500">Flight</p><p className="text-[15px] font-semibold text-slate-900 font-mono">{trip.flightNumber}</p></div>
                  <a href={`https://www.flightradar24.com/${trip.flightNumber}`} target="_blank" rel="noopener noreferrer"
                    className={`${m.btnSmall} border border-sky-200 bg-white text-sky-700`}>Track flight <ExternalLink size={13} /></a>
                </div>
              )}
              <p className="text-xs text-slate-500">Shared by the traveller. Kabutar doesn't verify ticket details.</p>
            </div>
          )}

          {trip.notes && (
            <div className="border border-slate-200 rounded-2xl p-4">
              <p className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5"><StickyNote size={15} /> Note from the traveller</p>
              <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">{trip.notes}</p>
            </div>
          )}

          {hasTraveller && !isOwn && (
            <button type="button" onClick={() => setShowProfile(true)}
              className="w-full border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-left active:bg-slate-50 hover:bg-slate-50">
              <span className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-base font-semibold text-slate-600 shrink-0">
                {traveller.profileImage ? <img src={traveller.profileImage} alt="" className="w-full h-full object-cover" /> : traveller.name?.[0]?.toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-semibold text-slate-900 truncate">{traveller.name}</span>
                  {isVerified && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
                </span>
                <span className="flex items-center gap-1 text-[13px] text-slate-500 mt-0.5">
                  {traveller.totalRatings > 0
                    ? <><Star size={12} className="fill-amber-400 text-amber-400" /> {traveller.rating?.toFixed(1)} ({traveller.totalRatings})</>
                    : 'No reviews yet'}
                  {traveller.tripsCompleted > 0 && <> · {traveller.tripsCompleted} deliveries</>}
                  {traveller.city && <> · <MapPin size={12} /> {traveller.city}</>}
                </span>
                <span className="block text-[13px] font-semibold text-kb-600 mt-1">View profile</span>
              </span>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>
          )}
        </div>
      </Sheet>

      {showProfile && hasTraveller && (
        <TravelerProfileModal travelerId={traveller._id} travelerSnap={traveller}
          onClose={() => setShowProfile(false)}
          onChat={() => { setShowProfile(false); handleChat(); }} />
      )}
    </>
  );
}
