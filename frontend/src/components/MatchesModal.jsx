import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Star, ChevronRight, SearchX, CheckCircle2 } from 'lucide-react';
import { formatTripDatesShort } from '../lib/tripDates';
import TravelerProfileModal from './TravelerProfileModal';
import { Sheet, CardSkeleton, ErrorState } from './mobile/ui';
import { Avatar, EmptyState } from './desktop/ui';

export default function MatchesModal({ parcel, onClose }) {
  const [trips, setTrips] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [selectedTraveler, setSelectedTraveler] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/match/parcel/${parcel._id}`)
      .then(r => { setTrips(r.data.trips || []); setState('ready'); })
      .catch(() => setState('error'));
  }, [parcel._id]);

  return (
    <>
      <Sheet title="Travellers on your route" onClose={onClose}>
        <p className="text-[14px] text-slate-600 -mt-1 mb-4">{parcel.fromCity} → {parcel.toCity} · {parcel.weight} kg</p>
        {state === 'loading' ? (
          <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
        ) : state === 'error' ? (
          <ErrorState />
        ) : trips.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching travellers yet"
            body={`No one has posted a trip from ${parcel.fromCity} to ${parcel.toCity} with enough space. You'll get an alert when someone does.`} />
        ) : (
          <div className="space-y-3">
            {trips.map(trip => {
              const traveler = trip.userId;
              return (
                <button key={trip._id} type="button" onClick={() => setSelectedTraveler({ trip, traveler })}
                  className="w-full text-left border border-slate-200 rounded-2xl p-4 active:bg-slate-50 hover:bg-slate-50">
                  <span className="flex items-center gap-3">
                    <Avatar user={traveler} size={40} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[15px] font-semibold text-slate-900 truncate">{traveler?.name}</span>
                        {traveler?.kycStatus === 'verified' && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
                      </span>
                      <span className="flex items-center gap-1 text-[13px] text-slate-500">
                        {traveler?.totalRatings > 0
                          ? <><Star size={12} className="fill-amber-400 text-amber-400" /> {traveler.rating?.toFixed(1)} ({traveler.totalRatings})</>
                          : 'No reviews yet'}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-slate-300 shrink-0" />
                  </span>
                  <span className="flex flex-wrap gap-2 mt-3 text-[13px]">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{formatTripDatesShort(trip)}</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{trip.availableWeight} kg space</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">₹{trip.pricePerKg}/kg · about ₹{Math.ceil(parcel.weight * trip.pricePerKg)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      {selectedTraveler && (
        <TravelerProfileModal
          travelerId={selectedTraveler.traveler?._id}
          travelerSnap={selectedTraveler.traveler}
          onClose={() => setSelectedTraveler(null)}
          onChat={() => { onClose(); navigate(`/chat/${selectedTraveler.traveler?._id}`); }}
        />
      )}
    </>
  );
}
