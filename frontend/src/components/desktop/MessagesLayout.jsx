import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { MessageCircle, BadgeCheck } from 'lucide-react';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Avatar } from './ui';

const preview = (m) => {
  if (!m) return '';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'offer') return `Offer: ₹${m.amount}`;
  return m.text || '';
};

// Two-pane desktop messaging shell: conversation list on the left, `children` on the right.
export default function MessagesLayout({ activeId, children }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error

  const load = useCallback(() => api.get('/chat/conversations')
    .then(r => { setConversations(r.data.conversations || []); setState('ready'); })
    .catch(() => setState('error')), []);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('receive_message', load);
    return () => socket.off('receive_message', load);
  }, [load]);

  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] h-[calc(100vh-8rem)] min-h-[520px] bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <aside className="border-r border-slate-200 flex flex-col min-h-0">
        <div className="px-5 py-4 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {state === 'loading' ? (
            <div className="p-3 space-y-1">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : state === 'error' ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600">Couldn't load conversations.</p>
              <button type="button" onClick={() => { setState('loading'); load(); }} className="mt-2 text-sm font-semibold text-kb-600 hover:text-kb-700">Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 inline-flex items-center justify-center mb-3"><MessageCircle size={20} /></span>
              <p className="text-sm font-semibold text-slate-900">No conversations yet</p>
              <p className="text-[13px] text-slate-500 mt-1">Message a traveller or sender from a trip or parcel to start chatting.</p>
            </div>
          ) : (
            <ul className="p-2">
              {conversations.filter(c => c.partner).map(({ partner, lastMessage, unreadCount }) => {
                const active = String(partner._id) === String(activeId);
                return (
                  <li key={partner._id}>
                    <button type="button" onClick={() => navigate(`/chat/${partner._id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${active ? 'bg-kb-50' : 'hover:bg-slate-50'}`}>
                      <Avatar user={partner} size={44} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{partner.name}</span>
                            {partner.kycStatus === 'verified' && <BadgeCheck size={13} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
                          </span>
                          {lastMessage?.timestamp && (
                            <span className="text-[11px] text-slate-400 shrink-0">{formatDistanceToNowStrict(new Date(lastMessage.timestamp))}</span>
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-0.5">
                          <span className={`text-[13px] truncate ${unreadCount > 0 ? 'text-slate-800' : 'text-slate-500'}`}>{preview(lastMessage)}</span>
                          {unreadCount > 0 && !active && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-kb-500 text-white text-[10px] font-bold leading-[18px] text-center shrink-0">{unreadCount > 9 ? '9+' : unreadCount}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      <section className="min-w-0 min-h-0 flex flex-col">
        {children || (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <span className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 inline-flex items-center justify-center mb-3"><MessageCircle size={22} /></span>
            <p className="text-sm font-semibold text-slate-900">Select a conversation</p>
            <p className="text-[13px] text-slate-500 mt-1 max-w-xs">Keep handover details in Kabutar chat so there's a record of what you agreed.</p>
          </div>
        )}
      </section>
    </div>
  );
}
