import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Star, MessageCircle, CheckCircle2, Shield, Clock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import ReportBlockSheet from './ReportBlockSheet';
import { useAuth } from '../context/AuthContext';
import { Sheet } from './mobile/ui';
import { m } from './mobile/styles';
import { Avatar } from './desktop/ui';

const KYC_BADGE = {
  verified: { label: 'ID verified',          cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  pending:  { label: 'Verification pending', cls: 'bg-amber-50 text-amber-700',     Icon: Clock },
  none:     { label: 'Not verified',         cls: 'bg-slate-100 text-slate-600',    Icon: Shield },
  rejected: { label: 'Not verified',         cls: 'bg-slate-100 text-slate-600',    Icon: Shield },
};

export default function TravelerProfileModal({ travelerId, travelerSnap, onClose, onChat }) {
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showSheet,  setShowSheet]  = useState(false);
  const [isBlocked,  setIsBlocked]  = useState(false);
  const { user: me } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/users/${travelerId}`)
      .then(r => setProfile(r.data.user))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [travelerId]);

  const data = profile || travelerSnap;
  const badge = KYC_BADGE[data?.kycStatus || 'none'];
  const BadgeIcon = badge.Icon;
  const hasReviews = (data?.totalRatings || 0) > 0;
  const firstName = data?.name?.split(' ')[0] || 'them';

  const handleChat = () => {
    onClose();
    if (onChat) onChat();
    else navigate(`/chat/${travelerId}`);
  };

  return (
    <>
      <Sheet title="Profile" onClose={onClose}
        headerLeft={null}
        footer={me?._id !== travelerId ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowSheet(true)} aria-label="Report or block"
              className={`${m.btnSecondary} w-12 px-0`}><MoreVertical size={18} /></button>
            <button type="button" onClick={handleChat} className={`${m.btnPrimary} flex-1`}><MessageCircle size={18} /> Message {firstName}</button>
          </div>
        ) : null}>
        {loading && !data ? (
          <div className="flex flex-col items-center gap-3 py-6 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-slate-100" />
            <div className="h-4 bg-slate-100 rounded w-32" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <Avatar user={data} size={84} />
              <h3 className="mt-3 text-[20px] font-semibold text-slate-900">{data?.name}</h3>
              <span className={`mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md ${badge.cls}`}>
                <BadgeIcon size={13} /> {badge.label}
              </span>
              {data?.createdAt && <p className="text-[13px] text-slate-500 mt-1.5">Joined {format(new Date(data.createdAt), 'MMM yyyy')}</p>}
            </div>

            <div className="grid grid-cols-3 border border-slate-200 rounded-2xl divide-x divide-slate-200 text-center">
              <div className="py-3">
                <p className="text-[18px] font-semibold text-slate-900 flex items-center justify-center gap-1">
                  {hasReviews ? <><Star size={15} className="fill-amber-400 text-amber-400" />{Number(data.rating).toFixed(1)}</> : '—'}
                </p>
                <p className="text-xs text-slate-500">Rating</p>
              </div>
              <div className="py-3">
                <p className="text-[18px] font-semibold text-slate-900">{data?.totalRatings || 0}</p>
                <p className="text-xs text-slate-500">Reviews</p>
              </div>
              <div className="py-3">
                <p className="text-[18px] font-semibold text-slate-900">{profile?.deliveredCount ?? data?.tripsCompleted ?? 0}</p>
                <p className="text-xs text-slate-500">Deliveries</p>
              </div>
            </div>

            <section>
              <h4 className="text-[15px] font-semibold text-slate-900 mb-2">Reviews</h4>
              {profile?.reviews?.length > 0 ? (
                <div className="space-y-2.5">
                  {profile.reviews.map((r, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900">{r.from?.name || 'Kabutar user'}</span>
                        <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={11} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
                          ))}
                        </span>
                        {r.createdAt && <span className="text-xs text-slate-400 ml-auto">{format(new Date(r.createdAt), 'd MMM yyyy')}</span>}
                      </div>
                      {r.comment && <p className="text-[14px] text-slate-600 mt-1.5 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-slate-500">No reviews yet. Reviews appear after completed deliveries.</p>
              )}
            </section>
          </div>
        )}
      </Sheet>

      {showSheet && (
        <ReportBlockSheet
          userId={travelerId}
          userName={data?.name?.split(' ')[0] || 'this user'}
          isBlocked={isBlocked}
          onBlock={setIsBlocked}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  );
}
