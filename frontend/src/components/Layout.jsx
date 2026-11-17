import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, Compass, MessageCircle, Bell, Plus, Send, Package, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import PostTripModal from './PostTripModal';
import PostParcelModal from './PostParcelModal';
import DesktopHeader from './desktop/DesktopHeader';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Sheet, ListRow } from './mobile/ui';

export default function Layout() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const authGate  = useAuthGate();

  const [chatUnread,      setChatUnread]      = useState(0);
  const [notifUnread,     setNotifUnread]     = useState(0);
  const [postSheet,       setPostSheet]       = useState(false);
  const [showTripModal,   setShowTripModal]   = useState(false);
  const [showParcelModal, setShowParcelModal] = useState(false);

  useEffect(() => {
    if (!user) { setChatUnread(0); return; }
    const load = () => api.get('/chat/conversations')
      .then(r => setChatUnread(r.data.conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)))
      .catch(() => {});
    load();
    const socket = getSocket();
    socket.on('receive_message', load);
    return () => socket.off('receive_message', load);
  }, [user]);

  useEffect(() => {
    const lastSeen = parseInt(localStorage.getItem('kabutar_alerts_seen') || '0', 10);
    const loadCounts = async () => {
      let total = 0;
      if (user) {
        const nr = await api.get('/notifications/me').catch(() => ({ data: { unread: 0 } }));
        total += nr.data.unread || 0;
      }
      const ar = await api.get('/announcements').catch(() => ({ data: { announcements: [] } }));
      total += (ar.data.announcements || []).filter(a => new Date(a.createdAt).getTime() > lastSeen).length;
      setNotifUnread(total);
    };
    loadCounts();
  }, [user]);

  const handleFab = (type) => {
    setPostSheet(false);
    authGate(() => {
      if (type === 'trip') {
        if (user?.kycStatus !== 'verified') {
          import('react-hot-toast').then(({ default: toast }) => toast.error('Verify your identity to post trips'));
          setTimeout(() => navigate('/kyc'), 600);
          return;
        }
        setShowTripModal(true);
      } else {
        setShowParcelModal(true);
      }
    });
  };

  // Landing-page CTAs ("I'm Travelling" / "Send a Parcel") arrive with an intent
  // in router state — open the matching post flow once, then clear the state.
  const intent = location.state?.intent;
  useEffect(() => {
    if (intent !== 'trip' && intent !== 'parcel') return;
    navigate(location.pathname, { replace: true, state: null });
    const t = setTimeout(() => handleFab(intent), 0);
    return () => clearTimeout(t);
  }, [intent]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDesktopWeb = useDesktopWeb();
  const openAlerts   = () => { localStorage.setItem('kabutar_alerts_seen', Date.now().toString()); setNotifUnread(0); navigate('/notifications'); };
  const openMessages = () => authGate(() => { setChatUnread(0); navigate('/messages'); });

  const postModals = (
    <>
      {showTripModal && (
        <PostTripModal onClose={() => setShowTripModal(false)} onSuccess={() => setShowTripModal(false)} />
      )}
      {showParcelModal && (
        <PostParcelModal onClose={() => setShowParcelModal(false)} onSuccess={() => setShowParcelModal(false)} />
      )}
    </>
  );

  // ── Desktop browser shell (the Capacitor app never takes this branch) ──
  if (isDesktopWeb) {
    return (
      <div className="min-h-screen bg-canvas font-inter text-slate-900 antialiased">
        <DesktopHeader chatUnread={chatUnread} notifUnread={notifUnread}
          onOpenNotifications={openAlerts} onOpenMessages={openMessages} onPost={handleFab} />
        <main className="max-w-[1280px] mx-auto px-8 py-8">
          <Outlet />
        </main>
        {postModals}
      </div>
    );
  }

  // ── Mobile app shell (Android app + phone browsers) ──
  const path    = location.pathname;
  const isChat  = path === '/messages' || path.startsWith('/chat');
  const isNotif = path === '/notifications';
  const isMe    = path === '/profile';

  const Count = ({ n }) => n > 0 ? (
    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-kb-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white">
      {n > 9 ? '9+' : n}
    </span>
  ) : null;

  const tab = (active) => `relative flex-1 flex flex-col items-center justify-center gap-1 h-full ${active ? 'text-kb-600' : 'text-slate-500'}`;
  const label = (active) => `text-[11px] ${active ? 'font-semibold' : 'font-medium'}`;

  return (
    <div className="min-h-screen bg-canvas font-inter text-slate-900 antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200"
        style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
        <div className="h-14 px-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/app')} className="flex items-center gap-2" aria-label="Kabutar home">
            <img src="/brand/logo-64.png" alt="" width={30} height={30} className="w-[30px] h-[30px] rounded-lg" />
            <span className="text-[18px] font-bold tracking-[-0.02em] text-slate-900">Kabutar</span>
          </button>
          {user ? (
            <button type="button" onClick={() => navigate('/profile')} aria-label="Your profile"
              className={`w-9 h-9 rounded-full overflow-hidden bg-kb-100 flex items-center justify-center ring-2 ${isMe ? 'ring-kb-500' : 'ring-transparent'}`}>
              {user.profileImage
                ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                : <span className="text-kb-700 font-semibold text-sm">{user.name?.[0]?.toUpperCase() || '?'}</span>}
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/login', { state: { from: path } })}
              className="h-9 px-3.5 rounded-lg bg-kb-500 active:bg-kb-600 text-white text-sm font-semibold flex items-center gap-1.5">
              <LogIn size={15} /> Log in
            </button>
          )}
        </div>
      </header>

      {/* Content — padded so nothing hides behind the bottom nav */}
      <main style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 84px)' }}>
        <div key={path} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }} aria-label="Main">
        <div className="h-16 max-w-lg mx-auto flex items-stretch">
          <NavLink to="/app" end className={({ isActive }) => tab(isActive)}>
            {({ isActive }) => <><Home size={22} strokeWidth={isActive ? 2.3 : 1.9} /><span className={label(isActive)}>Home</span></>}
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => tab(isActive)}>
            {({ isActive }) => <><Compass size={22} strokeWidth={isActive ? 2.3 : 1.9} /><span className={label(isActive)}>Explore</span></>}
          </NavLink>
          <button type="button" onClick={() => authGate(() => setPostSheet(true))} className="flex-1 flex flex-col items-center justify-center gap-1" aria-label="Post a trip or parcel">
            <span className="w-11 h-11 -mt-1 rounded-2xl bg-kb-500 active:bg-kb-600 text-white flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,107,10,0.45)]">
              <Plus size={24} strokeWidth={2.4} />
            </span>
            <span className="text-[11px] font-medium text-slate-500 -mt-0.5">Post</span>
          </button>
          <button type="button" onClick={openMessages} className={tab(isChat)}>
            <span className="relative"><MessageCircle size={22} strokeWidth={isChat ? 2.3 : 1.9} /><Count n={chatUnread} /></span>
            <span className={label(isChat)}>Chat</span>
          </button>
          <button type="button" onClick={openAlerts} className={tab(isNotif)}>
            <span className="relative"><Bell size={22} strokeWidth={isNotif ? 2.3 : 1.9} /><Count n={notifUnread} /></span>
            <span className={label(isNotif)}>Alerts</span>
          </button>
        </div>
      </nav>

      {postSheet && (
        <Sheet title="What would you like to do?" onClose={() => setPostSheet(false)}>
          <div className="-mx-4 -my-2 divide-y divide-slate-100">
            <ListRow icon={Send} title="I'm travelling" sub="Post a trip and earn on your journey" onClick={() => handleFab('trip')} />
            <ListRow icon={Package} title="Send a parcel" sub="Find a traveller going your way" onClick={() => handleFab('parcel')} />
          </div>
        </Sheet>
      )}
      {postModals}
    </div>
  );
}
