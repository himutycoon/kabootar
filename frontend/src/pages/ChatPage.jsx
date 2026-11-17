import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket, getRoomId } from '../lib/socket';
import { ArrowLeft, Send, Star, IndianRupee, Check, X, ImageIcon, MoreVertical, Package, BadgeCheck, ChevronRight, ShieldCheck } from 'lucide-react';
import ReportBlockSheet from '../components/ReportBlockSheet';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import RatingModal from '../components/RatingModal';
import { getTripDates } from '../lib/tripDates';
import KabutarLoader from '../components/KabutarLoader';
import toast from 'react-hot-toast';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import MessagesLayout from '../components/desktop/MessagesLayout';

function activeLabel(isOnline, lastSeenAt) {
  if (isOnline) return null;
  if (!lastSeenAt) return 'Offline';
  const m = Math.floor((Date.now() - lastSeenAt) / 60000);
  if (m < 1)  return 'Active just now';
  if (m < 60) return `Active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Active ${h}h ago`;
  return `Active ${Math.floor(h / 24)}d ago`;
}

export default function ChatPage() {
  const { userId } = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const d          = useDesktopWeb(); // desktop browser → render inside the two-pane messages shell

  const [messages,       setMessages]       = useState([]);
  const [partner,        setPartner]        = useState(null);
  const [text,           setText]           = useState('');
  const [loading,        setLoading]        = useState(true);
  const [showRating,     setShowRating]     = useState(false);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [activeParcel,   setActiveParcel]   = useState(null);
  const [reviewableParcel, setReviewableParcel] = useState(null);
  const [parcelBannerOpen, setParcelBannerOpen] = useState(true);
  const [showOfferPanel, setShowOfferPanel] = useState(false);
  const [offerAmount,    setOfferAmount]    = useState('');
  const [sendingOffer,   setSendingOffer]   = useState(false);
  const [sendingImage,   setSendingImage]   = useState(false);
  const [isOnline,       setIsOnline]       = useState(false);
  const [lastSeenAt,     setLastSeenAt]     = useState(null);
  const [partnerTyping,  setPartnerTyping]  = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState(() => new Set());

  const bottomRef     = useRef(null);
  const typingTimer   = useRef(null);
  const isTypingRef   = useRef(false);
  const imageInputRef = useRef(null);
  const roomId = user?._id && userId ? getRoomId(user._id, userId) : null;

  useEffect(() => {
    api.get(`/chat/${userId}`)
      .then(r => { setMessages(r.data.messages); setPartner(r.data.partner); })
      .finally(() => setLoading(false));
    // Fetch active parcel between these two users
    api.get('/parcels/my').then(r => {
      const parcels = r.data.parcels || [];
      const between = (parcel) => {
        const s = String(parcel.userId?._id || parcel.userId || '');
        const t = String(parcel.travelerId?._id || parcel.travelerId || '');
        return (s === userId && t === user?._id) || (t === userId && s === user?._id);
      };

      setActiveParcel(parcels.find(p => between(p) && !['completed','cancelled'].includes(p.status)) || null);

      // A completed delivery between us that I haven't reviewed yet
      setReviewableParcel(parcels.find(p => {
        if (!between(p) || p.status !== 'completed') return false;
        const iAmSender = String(p.userId?._id || p.userId || '') === user?._id;
        return iAmSender ? !p.senderReviewed : !p.travelerReviewed;
      }) || null);
    }).catch(() => {});
  }, [userId, user?._id]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    socket.emit('join_room', roomId);
    socket.emit('check_online', userId);

    const onMsg = (msg) => setMessages(prev => {
      if (prev.find(m => m._id === msg._id)) return prev;
      const base = msg.type === 'image' ? prev.filter(m => !m.sending) : prev;
      return [...base, msg];
    });
    const onTyping    = () => setPartnerTyping(true);
    const onStop      = () => setPartnerTyping(false);
    const onStatus    = ({ isOnline: o, lastSeenAt: ls }) => { setIsOnline(o); setLastSeenAt(ls); };
    const onOnline    = ({ userId: uid }) => { if (uid === userId) setIsOnline(true); };
    const onOffline   = ({ userId: uid, lastSeenAt: ls }) => { if (uid === userId) { setIsOnline(false); setLastSeenAt(ls); } };

    socket.on('receive_message',        onMsg);
    socket.on('partner_typing',         onTyping);
    socket.on('partner_stopped_typing', onStop);
    socket.on('online_status',          onStatus);
    socket.on('user_online',            onOnline);
    socket.on('user_offline',           onOffline);

    return () => {
      socket.off('receive_message',        onMsg);
      socket.off('partner_typing',         onTyping);
      socket.off('partner_stopped_typing', onStop);
      socket.off('online_status',          onStatus);
      socket.off('user_online',            onOnline);
      socket.off('user_offline',           onOffline);
    };
  }, [roomId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const emitTyping = () => {
    if (!roomId) return;
    const s = getSocket();
    if (!isTypingRef.current) { isTypingRef.current = true; s.emit('typing', { roomId }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { isTypingRef.current = false; s.emit('stop_typing', { roomId }); }, 2000);
  };

  const sendMessage = async (payload = text.trim(), msgType = 'text', amount = null, imageUrl = null) => {
    if (msgType === 'text' && !payload) return;
    if (msgType === 'text') { setText(''); isTypingRef.current = false; }
    const s = getSocket();
    if (s.connected) {
      s.emit('send_message', { senderId: user._id, receiverId: userId, text: payload, type: msgType, amount, imageUrl, roomId });
    } else {
      const res = await api.post(`/chat/${userId}`, { text: payload, type: msgType, amount, imageUrl });
      setMessages(prev => [...prev, res.data.message]);
    }
  };

  const sendOffer = async () => {
    const amt = parseFloat(offerAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setSendingOffer(true);
    await sendMessage(`💰 Offer: ₹${amt}`, 'offer', amt);
    setShowOfferPanel(false); setOfferAmount(''); setSendingOffer(false);
  };

  const acceptOffer = async (amount, msgId) => {
    try {
      const myRes = await api.get('/parcels/my');
      let parcel = myRes.data.parcels.find(p => {
        const s = String(p.userId?._id || p.userId || '');
        const t = String(p.travelerId?._id || p.travelerId || '');
        return (s === String(userId) || t === String(userId)) && !['completed','cancelled'].includes(p.status);
      });
      if (!parcel) { const r = await api.get(`/parcels/by-sender/${userId}`); parcel = r.data.parcels?.[0]; }
      if (!parcel) { toast.error('No active parcel request found.'); return; }

      const iAmSender = String(parcel.userId?._id || parcel.userId) === String(user._id);

      if (iAmSender) {
        // Sender agreeing to traveller's counter-offer — just update price
        await api.patch(`/parcels/${parcel._id}`, { offeredPrice: amount });
        toast.success(`₹${amount} price agreed! 🤝 Traveller will confirm pickup.`);
      } else {
        // Traveller accepting sender's offer — formally accept the parcel carry
        if (parcel.status === 'open') {
          const tripsRes = await api.get('/trips/my');
          const myTrips = (tripsRes.data.trips || []).filter(t =>
            t.status === 'active' &&
            t.fromCity.toLowerCase() === parcel.fromCity.toLowerCase() &&
            t.toCity.toLowerCase()   === parcel.toCity.toLowerCase()
          );
          if (!myTrips.length) {
            toast.error(`Post a trip on ${parcel.fromCity} → ${parcel.toCity} before accepting this parcel`);
            return;
          }
          // Prefer the trip with the soonest upcoming date if more than one matches
          const trip = myTrips.sort((a, b) => getTripDates(a)[0] - getTripDates(b)[0])[0];
          await api.post(`/parcels/${parcel._id}/accept`, { offeredPrice: amount, tripId: trip._id });
          toast.success(`Accepted! ₹${amount} locked in 🤝 You're now carrying this parcel.`);
        } else {
          await api.patch(`/parcels/${parcel._id}`, { offeredPrice: amount });
          toast.success(`₹${amount} agreed! 🤝`);
        }
      }
      if (msgId != null) setAcceptedOffers(prev => new Set([...prev, msgId]));
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update — try again'); }
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4 MB'); return; }
    setSendingImage(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const tempId  = `temp_img_${Date.now()}`;
      setMessages(prev => [...prev, {
        _id: tempId, senderId: user._id, type: 'image',
        imageUrl: dataUrl, text: '[📷 Image]',
        timestamp: new Date().toISOString(), sending: true,
      }]);
      try { await sendMessage('[📷 Image]', 'image', null, dataUrl); }
      catch {
        toast.error('Failed to send image');
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
      finally { setSendingImage(false); e.target.value = ''; }
    };
    reader.readAsDataURL(file);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isMine = (msg) => msg.senderId === user?._id || msg.senderId?._id === user?._id;

  if (loading && d) return (
    <MessagesLayout activeId={userId}>
      <div className="flex-1 flex items-center justify-center"><KabutarLoader text="Opening chat…" /></div>
    </MessagesLayout>
  );
  if (loading) return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      <div className="h-14 border-b border-stone-100 animate-pulse bg-white" />
      <div className="flex-1 flex items-center justify-center bg-stone-50"><KabutarLoader text="Opening chat…" /></div>
    </div>
  );

  const activeStatus = activeLabel(isOnline, lastSeenAt);

  const pane = (
    // ── Mobile: fixed full-screen layout · Desktop: fills the right pane of the messages shell ──
    <div className={d ? 'flex-1 min-h-0 flex flex-col bg-[#FAF9F7]' : 'fixed inset-0 z-50 flex flex-col bg-[#FAF9F7] font-inter'}
         style={d ? undefined : { paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>

      {/* ── Header — always visible at top ── */}
      <div className={`bg-white border-b px-4 py-3 flex items-center gap-3 shrink-0 ${d ? 'border-slate-200 px-5' : 'border-slate-200'}`}
           style={d ? undefined : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {!d && (
          <button onClick={() => navigate(-1)} aria-label="Back" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100">
            <ArrowLeft size={21} />
          </button>
        )}

        {/* Avatar + online dot */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-semibold text-slate-600 text-sm">
            {partner?.profileImage
              ? <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover" />
              : partner?.name?.[0]?.toUpperCase()}
          </div>
          {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-900 text-[15px] truncate">{partner?.name}</span>
            {partner?.kycStatus === 'verified' && (
              <BadgeCheck size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />
            )}
          </div>
          <div className="text-xs mt-0.5 h-4">
            {partnerTyping ? (
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                typing
                <span className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1 h-1 bg-emerald-500 rounded-full inline-block"
                      style={{ animation: `bounce 0.9s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </span>
              </span>
            ) : isOnline ? (
              <span className="text-emerald-600 font-medium">Online</span>
            ) : activeStatus ? (
              <span className="text-slate-500">{activeStatus}</span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                {partner?.totalRatings > 0 ? <><Star size={11} className="text-amber-400 fill-amber-400" />{partner.rating?.toFixed(1)} ({partner.totalRatings})</> : 'No reviews yet'}
              </span>
            )}
          </div>
        </div>

        {reviewableParcel && (
          <button onClick={() => setShowRating(true)} className="h-9 px-3 rounded-lg text-[13px] text-kb-600 font-semibold shrink-0 active:bg-kb-50">Leave a review</button>
        )}
        <button onClick={() => setShowSafetyMenu(true)} aria-label="Report or block" className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100 shrink-0">
          <MoreVertical size={19} />
        </button>
      </div>

      {/* ── Active parcel banner ── */}
      {activeParcel && parcelBannerOpen && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-kb-50 text-kb-600 flex items-center justify-center shrink-0"><Package size={17} /></span>
          <button type="button" onClick={() => navigate('/my-parcels')} className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-slate-900 truncate">
              Parcel: {activeParcel.fromCity} → {activeParcel.toCity}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {activeParcel.weight} kg · {
                { open: 'Agreeing details', requested: 'Awaiting response', matched: 'Traveller found', accepted: 'Accepted, awaiting pickup', picked: 'Picked up',
                  in_transit: 'On the way', delivered: 'Delivered, confirm receipt', completed: 'Completed'
                }[activeParcel.status] || activeParcel.status
              }
              {activeParcel.offeredPrice ? ` · ₹${activeParcel.offeredPrice} agreed` : ''}
            </p>
          </button>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
          <button onClick={() => setParcelBannerOpen(false)} aria-label="Hide parcel details" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Messages — scrollable middle section ── */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-2 ${d ? 'px-6' : 'px-4'}`}>
        {messages.length === 0 && (
          <div className="text-center py-10 px-6">
            <span className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-500 inline-flex items-center justify-center"><ShieldCheck size={20} /></span>
            <p className="mt-3 text-[15px] font-semibold text-slate-900">Say hello</p>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">Agree the pickup point, timing and price here, so there’s a record of what you decided.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine    = isMine(msg);
          const msgDate = new Date(msg.timestamp);
          const prevDate= i > 0 ? new Date(messages[i-1].timestamp) : null;
          const isOffer = msg.type === 'offer';
          const isImg   = msg.type === 'image' && msg.imageUrl;
          const msgTime = format(msgDate, 'h:mm a');

          // Show date separator when day changes
          const showDateSep = i === 0 || !isSameDay(msgDate, prevDate);
          const dateSepLabel = isToday(msgDate) ? 'Today'
            : isYesterday(msgDate) ? 'Yesterday'
            : format(msgDate, 'dd MMM yyyy');

          // Show time bubble when gap > 5 min or different sender
          const prevMine = i > 0 ? isMine(messages[i-1]) : null;
          const showTimeBubble = i === 0
            || showDateSep
            || msgDate - prevDate > 5 * 60 * 1000
            || prevMine !== mine;

          return (
            <div key={msg._id || i} className="animate-fade-in">
              {/* Date separator */}
              {showDateSep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                    {dateSepLabel}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                {isOffer ? (
                  <div className={`max-w-[78%] rounded-2xl border border-kb-200 bg-kb-50 px-4 py-3 space-y-2 ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    <div className="flex items-center gap-1.5 font-semibold text-kb-700 text-[15px]">
                      <IndianRupee size={14} />Offer: ₹{msg.amount}
                    </div>
                    {!mine && (
                      acceptedOffers.has(msg._id) ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold pt-1">
                          <Check size={12} /> Accepted
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => acceptOffer(msg.amount, msg._id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 active:bg-emerald-700 text-white text-[13px] font-semibold h-9 rounded-lg">
                            <Check size={12} /> Accept
                          </button>
                          <button onClick={() => { setOfferAmount(String(msg.amount)); setShowOfferPanel(true); }}
                            className="flex-1 bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold h-9 rounded-lg">
                            Counter
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ) : isImg ? (
                  <div className={`max-w-[72%] rounded-2xl overflow-hidden relative ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    <img src={msg.imageUrl} alt="sent"
                      className={`w-full object-cover ${msg.sending ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                      style={{ maxHeight: 220 }}
                      onClick={() => !msg.sending && window.open(msg.imageUrl, '_blank')} />
                    {msg.sending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </div>
                    )}
                    {mine && !msg.sending && (
                      <div className="absolute bottom-1 right-2">
                        <Check size={10} className="text-white drop-shadow" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`${d ? 'max-w-[62%] whitespace-pre-wrap break-words' : 'max-w-[78%]'} px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed
                    ${mine ? 'bg-kb-500 text-white rounded-br-md' : 'bg-white text-slate-900 rounded-bl-md border border-slate-200'}`}>
                    {msg.text}
                  </div>
                )}
              </div>
              {/* Timestamp + read status under message */}
              {(showTimeBubble || i === messages.length - 1) && (
                <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                  <span className="text-[11px] text-slate-400">{msgTime}</span>
                  {mine && !msg.sending && (
                    <span className="text-[11px] text-slate-400">Sent</span>
                  )}
                  {mine && msg.sending && (
                    <span className="text-[11px] text-slate-300">Sending…</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Partner typing bubble */}
        {partnerTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-stone-400 rounded-full"
                  style={{ animation: `bounce 0.9s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Offer panel ── */}
      {showOfferPanel && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex gap-2 items-center shrink-0 animate-slide-up">
          <div className="flex items-center gap-1.5 flex-1 h-11 bg-white border border-slate-200 focus-within:border-kb-500 rounded-xl px-3">
            <span className="text-slate-400 text-[15px] font-semibold">₹</span>
            <input className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-slate-900"
              placeholder="Amount" type="number" min="1"
              value={offerAmount} onChange={e => setOfferAmount(e.target.value)} autoFocus />
          </div>
          <button onClick={sendOffer} disabled={sendingOffer} className="h-11 px-4 rounded-xl bg-kb-500 active:bg-kb-600 text-white text-[14px] font-semibold disabled:opacity-50">
            {sendingOffer ? 'Sending…' : 'Send offer'}
          </button>
          <button onClick={() => { setShowOfferPanel(false); setOfferAmount(''); }} aria-label="Cancel offer" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100">
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── Quick messages ── */}
      <div className="bg-white border-t border-slate-100 px-3 pt-2 pb-0 overflow-x-auto shrink-0"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-1.5 pb-2">
          {['Deal', 'When can you pick up?', 'Thank you', 'Please handle with care',
            'What\'s your ETA?', 'Meet at the station?', 'Is it fragile?', 'Payment on delivery?'
          ].map(msg => (
            <button key={msg} onMouseDown={e => e.preventDefault()}
              onClick={() => sendMessage(msg)}
              className="shrink-0 h-8 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-full text-[13px] font-medium transition-colors border border-slate-200 whitespace-nowrap">
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar — always pinned at bottom ── */}
      <div className="bg-white px-3 py-2.5 flex gap-2 items-end shrink-0">
        {/* Offer button */}
        <button onClick={() => setShowOfferPanel(v => !v)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            showOfferPanel ? 'bg-kb-500 text-white' : 'text-slate-500 active:bg-slate-100 hover:bg-slate-100'
          }`} title="Make an offer" aria-label="Make an offer">
          <IndianRupee size={15} />
        </button>

        {/* Image button */}
        <button onClick={() => imageInputRef.current?.click()}
          disabled={sendingImage}
          className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-50"
          title="Send photo" aria-label="Send photo">
          {sendingImage ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : <ImageIcon size={15} />}
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        {/* Text input */}
        <textarea
          className="flex-1 min-h-[44px] bg-slate-100 border border-transparent focus:bg-white focus:border-kb-500 rounded-3xl px-4 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-500 resize-none outline-none max-h-28 transition-colors"
          placeholder="Message"
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); emitTyping(); }}
          onKeyDown={handleKey}
        />

        {/* Send button */}
        <button onClick={() => sendMessage()} disabled={!text.trim()}
          aria-label="Send message"
          className="w-11 h-11 rounded-full bg-kb-500 hover:bg-kb-600 active:bg-kb-600 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shrink-0">
          <Send size={18} />
        </button>
      </div>

      {showRating && reviewableParcel && (
        <RatingModal
          partner={partner}
          parcelId={reviewableParcel._id}
          onClose={() => setShowRating(false)}
          onSubmitted={() => setReviewableParcel(null)}
        />
      )}
      {showSafetyMenu && (
        <ReportBlockSheet
          userId={userId}
          userName={partner?.name?.split(' ')[0] || 'this user'}
          isBlocked={false}
          onBlock={() => {}}
          onClose={() => setShowSafetyMenu(false)}
        />
      )}
    </div>
  );

  return d ? <MessagesLayout activeId={userId}>{pane}</MessagesLayout> : pane;
}
