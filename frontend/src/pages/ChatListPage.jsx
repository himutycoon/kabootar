import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Star } from "lucide-react";
import { useDesktopWeb } from "../hooks/useDesktopWeb";
import MessagesLayout from "../components/desktop/MessagesLayout";

export default function ChatListPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isDesktopWeb = useDesktopWeb();

  useEffect(() => {
    api.get("/chat/conversations")
      .then(r => setConversations(r.data.conversations))
      .finally(() => setLoading(false));
  }, []);

  // Desktop browsers: two-pane messages view (the Android app never takes this branch)
  if (isDesktopWeb) return <MessagesLayout />;

  if (loading) return (
    <div className="px-4 py-5 space-y-3">
      <div className="h-6 w-24 bg-stone-100 rounded animate-pulse mb-4" />
      {[1,2,3].map(i => (
        <div key={i} className="card p-4 flex gap-3 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-stone-100 rounded w-1/3" />
            <div className="h-3 bg-stone-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-stone-900 mb-4">Messages</h1>

      {conversations.length === 0 ? (
        <div className="card p-10 text-center">
          <MessageCircle size={32} className="text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No conversations yet.</p>
          <p className="text-stone-400 text-xs mt-1">Find a match to start chatting!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(({ partner, lastMessage, unreadCount }) => (
            <button
              key={partner._id}
              onClick={() => navigate(`/chat/${partner._id}`)}
              className="card w-full p-3 flex items-center gap-3 text-left hover:border-orange-100 active:scale-[0.99] transition-all"
            >
              <Avatar name={partner.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 text-sm">{partner.name}</span>
                  <span className="text-[11px] text-stone-400">
                    {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-stone-500 truncate max-w-[200px]">{lastMessage.text}</p>
                  {unreadCount > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0 ml-2">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="text-[11px] text-stone-400">{partner.rating?.toFixed(1)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ name }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors = ["bg-orange-100 text-orange-600", "bg-blue-100 text-blue-600", "bg-emerald-100 text-emerald-600", "bg-purple-100 text-purple-600"];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials}
    </div>
  );
}
