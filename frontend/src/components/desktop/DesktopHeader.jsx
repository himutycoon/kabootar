import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, Search, Plus, ChevronDown, Send, Package,
  User, ShieldCheck, Shield, LogOut, Boxes, Route,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import RouteSearch from './RouteSearch';

// Close a popover on outside click / Escape
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return [open, setOpen, ref];
}

const Count = ({ n }) => n > 0 ? (
  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-kb-500 text-white text-[10px] font-bold leading-[17px] text-center ring-2 ring-white">
    {n > 9 ? '9+' : n}
  </span>
) : null;

const navCls = ({ isActive }) =>
  `relative h-16 flex items-center px-3 text-sm font-medium transition-colors ${
    isActive
      ? 'text-slate-900 after:absolute after:left-3 after:right-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-kb-500'
      : 'text-slate-500 hover:text-slate-900'
  }`;

const MenuItem = ({ icon, title, sub, onClick, tone = 'default' }) => {
  const Icon = icon;
  return (
  <button type="button" onClick={onClick}
    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${tone === 'danger' ? 'hover:bg-red-50' : 'hover:bg-slate-50'}`}>
    <Icon size={17} className={`mt-0.5 shrink-0 ${tone === 'danger' ? 'text-red-500' : 'text-slate-500'}`} />
    <span className="min-w-0">
      <span className={`block text-sm font-medium ${tone === 'danger' ? 'text-red-600' : 'text-slate-900'}`}>{title}</span>
      {sub && <span className="block text-xs text-slate-500 mt-0.5">{sub}</span>}
    </span>
  </button>
  );
};

const KYC_LABEL = {
  verified: { text: 'Verified',      cls: 'text-emerald-700 bg-emerald-50' },
  pending:  { text: 'Under review',  cls: 'text-amber-700 bg-amber-50' },
  rejected: { text: 'Action needed', cls: 'text-red-700 bg-red-50' },
};

export default function DesktopHeader({ chatUnread, notifUnread, onOpenNotifications, onOpenMessages, onPost }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen,  setSearchOpen,  searchRef]  = usePopover();
  const [postOpen,    setPostOpen,    postRef]    = usePopover();
  const [profileOpen, setProfileOpen, profileRef] = usePopover();

  const isChat  = location.pathname === '/messages' || location.pathname.startsWith('/chat');
  const isNotif = location.pathname === '/notifications';
  const kyc = KYC_LABEL[user?.kycStatus] || { text: 'Not verified', cls: 'text-slate-600 bg-slate-100' };

  const iconBtn = (active) =>
    `relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-kb-50 text-kb-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-8 h-16 flex items-center gap-6">
        <BrandLogo to="/app" />

        <nav className="flex items-center" aria-label="Main">
          <NavLink to="/app" end className={navCls}>Home</NavLink>
          <NavLink to="/explore" className={navCls}>Explore</NavLink>
        </nav>

        {/* Route search trigger + popover */}
        <div className="relative flex-1 max-w-[380px]" ref={searchRef}>
          <button type="button" onClick={() => setSearchOpen(v => !v)} aria-expanded={searchOpen}
            className={`w-full h-10 flex items-center gap-2.5 px-3.5 rounded-lg border text-sm transition-colors ${searchOpen ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
            <Search size={16} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 truncate">Search routes and cities</span>
          </button>
          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-[400px] bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] animate-slide-down">
              <RouteSearch variant="compact" onDone={() => setSearchOpen(false)} />
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Post CTA */}
        <div className="relative" ref={postRef}>
          <button type="button" onClick={() => setPostOpen(v => !v)} aria-expanded={postOpen} aria-haspopup="menu"
            className="h-10 pl-3.5 pr-3 rounded-lg bg-kb-500 hover:bg-kb-600 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
            <Plus size={16} strokeWidth={2.4} /> Post <ChevronDown size={15} className={`transition-transform ${postOpen ? 'rotate-180' : ''}`} />
          </button>
          {postOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] animate-slide-down">
              <MenuItem icon={Send} title="I'm travelling" sub="Post a trip and carry parcels"
                onClick={() => { setPostOpen(false); onPost('trip'); }} />
              <MenuItem icon={Package} title="Send a parcel" sub="Find a traveller going your way"
                onClick={() => { setPostOpen(false); onPost('parcel'); }} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={onOpenNotifications} className={iconBtn(isNotif)} aria-label="Notifications">
            <Bell size={19} strokeWidth={1.9} /><Count n={notifUnread} />
          </button>
          <button type="button" onClick={onOpenMessages} className={iconBtn(isChat)} aria-label="Messages">
            <MessageCircle size={19} strokeWidth={1.9} /><Count n={chatUnread} />
          </button>
        </div>

        {user ? (
          <div className="relative" ref={profileRef}>
            <button type="button" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen} aria-haspopup="menu"
              className="flex items-center gap-1.5 p-1 pr-2 rounded-full border border-slate-200 hover:border-slate-300 transition-colors">
              <span className="w-8 h-8 rounded-full overflow-hidden bg-kb-100 flex items-center justify-center">
                {user.profileImage
                  ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                  : <span className="text-kb-700 font-semibold text-sm">{user.name?.[0]?.toUpperCase() || '?'}</span>}
              </span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>
            {profileOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] animate-slide-down overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name || 'Your account'}</p>
                  <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${kyc.cls}`}>
                    KYC · {kyc.text}
                  </span>
                </div>
                <div className="p-1.5">
                  <MenuItem icon={User}  title="Profile"        onClick={() => { setProfileOpen(false); navigate('/profile'); }} />
                  <MenuItem icon={Route} title="My trips"       onClick={() => { setProfileOpen(false); navigate('/trips', { state: { tab: 'mine' } }); }} />
                  <MenuItem icon={Boxes} title="My parcels"     onClick={() => { setProfileOpen(false); navigate('/my-parcels'); }} />
                  <MenuItem icon={ShieldCheck} title="Identity verification" onClick={() => { setProfileOpen(false); navigate('/kyc'); }} />
                  {user.role === 'admin' && (
                    <MenuItem icon={Shield} title="Admin panel" onClick={() => { setProfileOpen(false); navigate('/admin'); }} />
                  )}
                </div>
                <div className="p-1.5 border-t border-slate-100">
                  <MenuItem icon={LogOut} title="Log out" tone="danger"
                    onClick={async () => { setProfileOpen(false); await logout(); navigate('/'); }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/login', { state: { from: location.pathname } })}
              className="h-10 px-4 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
