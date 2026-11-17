import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { MessageCircle, BadgeCheck } from "lucide-react";
import api from "../lib/api";
import { getSocket } from "../lib/socket";
import { useDesktopWeb } from "../hooks/useDesktopWeb";
import MessagesLayout from "../components/desktop/MessagesLayout";
import { Avatar, EmptyState } from "../components/desktop/ui";
import { ScreenHeader, ErrorState } from "../components/mobile/ui";
import { m } from "../components/mobile/styles";

const preview = (msg) => {
  if (!msg) return "";
  if (msg.type === "image") return "Photo";
  if (msg.type === "offer") return `Offer: ₹${msg.amount}`;
  return msg.text || "";
};

export default function ChatListPage() {
  const navigate = useNavigate();
  const isDesktopWeb = useDesktopWeb();
  const [conversations, setConversations] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error

  const load = useCallback(() => api.get("/chat/conversations")
    .then(r => { setConversations(r.data.conversations || []); setState("ready"); })
    .catch(() => setState("error")), []);

  useEffect(() => {
    if (isDesktopWeb) return undefined; // the desktop shell loads its own list
    load();
    const socket = getSocket();
    socket.on("receive_message", load);
    return () => socket.off("receive_message", load);
  }, [isDesktopWeb, load]);

  // Desktop browsers: two-pane messages view (the Android app never takes this branch)
  if (isDesktopWeb) return <MessagesLayout />;

  const list = conversations.filter(c => c.partner);

  return (
    <div className="px-4 pt-1 pb-4">
      <ScreenHeader title="Messages" />
      {state === "loading" ? (
        <div className={`${m.card} divide-y divide-slate-100`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-2"><div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" /><div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" /></div>
            </div>
          ))}
        </div>
      ) : state === "error" ? (
        <div className={m.card}><ErrorState onRetry={() => { setState("loading"); load(); }} /></div>
      ) : list.length === 0 ? (
        <div className={m.card}>
          <EmptyState icon={MessageCircle} title="No messages yet"
            body="Message a traveller or sender from a trip or parcel to start a conversation."
            actionLabel="Explore trips" onAction={() => navigate("/explore")} />
        </div>
      ) : (
        <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
          {list.map(({ partner, lastMessage, unreadCount }) => (
            <button key={partner._id} type="button" onClick={() => navigate(`/chat/${partner._id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${m.press}`}>
              <Avatar user={partner} size={48} />
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[15px] truncate ${unreadCount > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{partner.name}</span>
                    {partner.kycStatus === "verified" && <BadgeCheck size={15} className="text-emerald-600 shrink-0" aria-label="ID verified" />}
                  </span>
                  {lastMessage?.timestamp && (
                    <span className={`text-xs shrink-0 ${unreadCount > 0 ? "text-kb-600 font-semibold" : "text-slate-400"}`}>
                      {formatDistanceToNowStrict(new Date(lastMessage.timestamp))}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={`text-[14px] truncate ${unreadCount > 0 ? "text-slate-800" : "text-slate-500"}`}>{preview(lastMessage)}</span>
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-kb-500 text-white text-[11px] font-bold leading-5 text-center shrink-0">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
