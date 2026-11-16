import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Bell, CheckCheck, Trash2, Package, Send, MessageCircle, Shield, Megaphone } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, EmptyState } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';

const TYPE_META = {
  parcel:  { icon: Package,     color: 'bg-orange-100 text-orange-500' },
  trip:    { icon: Send,        color: 'bg-blue-100   text-blue-500'   },
  message: { icon: MessageCircle, color: 'bg-emerald-100 text-emerald-500' },
  kyc:     { icon: Shield,      color: 'bg-purple-100 text-purple-500' },
  system:  { icon: Bell,        color: 'bg-stone-100  text-stone-500'  },
};

const ANNOUNCE_COLOR = {
  info:    'border-blue-100   bg-blue-50',
  warning: 'border-amber-100  bg-amber-50',
  alert:   'border-red-100    bg-red-50',
  feature: 'border-orange-100 bg-orange-50',
};

function timeLabel(date) {
  const d = new Date(date);
  if (isToday(d))     return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'dd MMM · h:mm a');
}

function groupByDay(items) {
  const groups = {};
  items.forEach(item => {
    const d = new Date(item.createdAt);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'dd MMM yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [notifications,  setNotifications]  = useState([]);
  const [announcements,  setAnnouncements]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [unread,         setUnread]         = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, aRes] = await Promise.all([
        user ? api.get('/notifications/me') : Promise.resolve({ data: { notifications: [], unread: 0 } }),
        api.get('/announcements'),
      ]);
      setNotifications(nRes.data.notifications || []);
      setUnread(nRes.data.unread || 0);
      setAnnouncements(aRes.data.announcements || []);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const clearRead = async () => {
    await api.delete('/notifications/clear').catch(() => {});
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const handleNotifTap = (notif) => {
    if (!notif.read) markRead(notif._id);
    const screen = notif.data?.screen;
    if (screen) navigate(screen);
  };

  const groups = groupByDay(notifications);
  const isDesktopWeb = useDesktopWeb();

  // ── Desktop browser layout (never used by the Android app) ──
  if (isDesktopWeb) {
    const DESK_TYPE = {
      parcel:  [Package,       'bg-kb-50 text-kb-600'],
      trip:    [Send,          'bg-sky-50 text-sky-600'],
      message: [MessageCircle, 'bg-emerald-50 text-emerald-600'],
      kyc:     [Shield,        'bg-violet-50 text-violet-600'],
      system:  [Bell,          'bg-slate-100 text-slate-600'],
    };
    const pinned = announcements.filter(a => a.pinned);
    const updates = announcements.filter(a => !a.pinned);
    const AnnouncementRow = ({ a }) => (
      <li className="flex gap-3 px-5 py-4">
        <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Megaphone size={16} /></span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{a.title}</span>
          <span className="block text-[13px] text-slate-600 mt-0.5 leading-relaxed">{a.body}</span>
          {a.createdAt && <span className="block text-xs text-slate-400 mt-1">{timeLabel(a.createdAt)}</span>}
        </span>
      </li>
    );
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" sub="Activity on your trips, parcels and account, plus updates from Kabutar."
          actions={<>
            {notifications.some(n => n.read) && (
              <button type="button" onClick={clearRead} className={`${btn.secondary} ${btn.md}`}><Trash2 size={15} /> Clear read</button>
            )}
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className={`${btn.primary} ${btn.md}`}><CheckCheck size={16} /> Mark all as read</button>
            )}
          </>} />

        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          <section className="min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-3 flex items-center gap-2">
              Your activity {unread > 0 && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-kb-50 text-kb-700">{unread} unread</span>}
            </h2>
            {loading ? (
              <Card className="divide-y divide-slate-100">{[0, 1, 2].map(i => <div key={i} className="h-[72px] px-5 py-4"><div className="h-full bg-slate-100 rounded-lg animate-pulse" /></div>)}</Card>
            ) : !user ? (
              <Card><EmptyState icon={Bell} title="Log in to see your notifications"
                body="Trip requests, parcel updates and messages show up here." actionLabel="Log in" onAction={() => navigate('/login', { state: { from: '/notifications' } })} /></Card>
            ) : notifications.length === 0 ? (
              <Card><EmptyState icon={Bell} title="You're all caught up" body="New activity on your trips and parcels will appear here." /></Card>
            ) : (
              <div className="space-y-5">
                {Object.entries(groups).map(([day, items]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{day}</p>
                    <Card className="divide-y divide-slate-100 overflow-hidden">
                      {items.map(notif => {
                        const [Icon, cls] = DESK_TYPE[notif.type] || DESK_TYPE.system;
                        return (
                          <button key={notif._id} type="button" onClick={() => handleNotifTap(notif)}
                            className={`w-full text-left flex gap-4 px-5 py-4 transition-colors ${notif.read ? 'hover:bg-slate-50' : 'bg-kb-50/40 hover:bg-kb-50'}`}>
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}><Icon size={17} /></span>
                            <span className="flex-1 min-w-0">
                              <span className={`block text-sm ${notif.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notif.title}</span>
                              {notif.body && <span className="block text-[13px] text-slate-500 mt-0.5 leading-relaxed">{notif.body}</span>}
                            </span>
                            <span className="flex flex-col items-end gap-2 shrink-0">
                              <span className="text-xs text-slate-400 whitespace-nowrap">{timeLabel(notif.createdAt)}</span>
                              {!notif.read && <span className="w-2 h-2 rounded-full bg-kb-500" aria-label="Unread" />}
                            </span>
                          </button>
                        );
                      })}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5 sticky top-24">
            {pinned.length > 0 && (
              <Card>
                <h3 className="px-5 pt-4 text-sm font-semibold text-slate-900">Pinned</h3>
                <ul className="divide-y divide-slate-100">{pinned.map(a => <AnnouncementRow key={a._id} a={a} />)}</ul>
              </Card>
            )}
            <Card>
              <h3 className="px-5 pt-4 text-sm font-semibold text-slate-900">Updates from Kabutar</h3>
              {loading ? <div className="p-5"><div className="h-12 bg-slate-100 rounded-lg animate-pulse" /></div> :
               updates.length === 0 ? <p className="px-5 py-4 text-[13px] text-slate-500">No updates right now.</p> :
               <ul className="divide-y divide-slate-100">{updates.map(a => <AnnouncementRow key={a._id} a={a} />)}</ul>}
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Notifications
            {unread > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">Alerts, updates &amp; activity</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
              <CheckCheck size={13} /> Read all
            </button>
          )}
          {notifications.some(n => n.read) && (
            <button onClick={clearRead}
              className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-xl active:scale-90 transition-all">
              <Trash2 size={14} className="text-stone-400" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex gap-3 p-4 bg-white rounded-2xl border border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-stone-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-stone-100 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-stone-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">

          {/* Announcements (pinned at top) */}
          {announcements.filter(a => a.pinned).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Megaphone size={13} className="text-orange-500" />
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pinned</span>
              </div>
              <div className="space-y-2">
                {announcements.filter(a => a.pinned).map(a => (
                  <div key={a._id}
                    className={`border rounded-2xl px-4 py-3 flex gap-3 items-start ${ANNOUNCE_COLOR[a.type] || 'bg-stone-50 border-stone-100'}`}>
                    <span className="text-xl shrink-0 mt-0.5">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900">{a.title}</p>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{a.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* User notifications grouped by day */}
          {user && Object.keys(groups).length > 0 && Object.entries(groups).map(([day, items]) => (
            <section key={day}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{day}</span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>
              <div className="space-y-1.5">
                {items.map(notif => {
                  const meta = TYPE_META[notif.type] || TYPE_META.system;
                  const Icon = meta.icon;
                  return (
                    <button key={notif._id}
                      onClick={() => handleNotifTap(notif)}
                      className={`w-full text-left flex gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.99] ${
                        notif.read
                          ? 'bg-white border-stone-100'
                          : 'bg-orange-50 border-orange-100'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${notif.read ? 'text-stone-700 font-medium' : 'text-stone-900 font-bold'}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-[10px] text-stone-400 mt-1">{timeLabel(notif.createdAt)}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Non-pinned announcements */}
          {announcements.filter(a => !a.pinned).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Megaphone size={13} className="text-stone-400" />
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Updates</span>
              </div>
              <div className="space-y-2">
                {announcements.filter(a => !a.pinned).map(a => (
                  <div key={a._id}
                    className={`border rounded-2xl px-4 py-3 flex gap-3 items-start ${ANNOUNCE_COLOR[a.type] || 'bg-stone-50 border-stone-100'}`}>
                    <span className="text-xl shrink-0 mt-0.5">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900">{a.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{a.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {notifications.length === 0 && announcements.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔔</div>
              <p className="font-bold text-stone-700">All caught up!</p>
              <p className="text-stone-400 text-sm mt-1">Notifications will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
