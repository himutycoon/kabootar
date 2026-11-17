import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Bell, CheckCheck, Trash2, Package, Send, MessageCircle, Shield, Megaphone } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useDesktopWeb } from '../hooks/useDesktopWeb';
import { Card, PageHeader, EmptyState } from '../components/desktop/ui';
import { btn } from '../components/desktop/styles';
import { ScreenHeader, CardSkeleton } from '../components/mobile/ui';
import { m } from '../components/mobile/styles';

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
    } catch { /* show whatever loaded */ } finally { setLoading(false); }
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

  // ── Mobile layout (Android app + phone browsers) ──
  const M_TYPE = {
    parcel:  [Package,       'bg-kb-50 text-kb-600'],
    trip:    [Send,          'bg-sky-50 text-sky-600'],
    message: [MessageCircle, 'bg-emerald-50 text-emerald-600'],
    kyc:     [Shield,        'bg-violet-50 text-violet-600'],
    system:  [Bell,          'bg-slate-100 text-slate-600'],
  };
  const pinnedAnn = announcements.filter(a => a.pinned);
  const otherAnn  = announcements.filter(a => !a.pinned);
  const annRow = (a) => (
    <div key={a._id} className="flex gap-3 px-4 py-3.5">
      <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Megaphone size={17} /></span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-slate-900">{a.title}</span>
        <span className="block text-[14px] text-slate-600 mt-0.5 leading-relaxed">{a.body}</span>
        {a.createdAt && <span className="block text-xs text-slate-400 mt-1">{timeLabel(a.createdAt)}</span>}
      </span>
    </div>
  );

  return (
    <div className="px-4 pt-1 pb-4">
      <ScreenHeader title="Alerts" sub={unread > 0 ? `${unread} unread` : undefined}
        right={<>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className={`${m.btnSmall} text-kb-600 active:bg-kb-50`}><CheckCheck size={16} /> Read all</button>
          )}
          {notifications.some(n => n.read) && (
            <button type="button" onClick={clearRead} aria-label="Clear read notifications"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100"><Trash2 size={18} /></button>
          )}
        </>} />

      {loading ? (
        <div className="space-y-3"><CardSkeleton lines={1} /><CardSkeleton lines={1} /><CardSkeleton lines={1} /></div>
      ) : (
        <div className="space-y-5">
          {pinnedAnn.length > 0 && (
            <section>
              <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Pinned</p>
              <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>{pinnedAnn.map(annRow)}</div>
            </section>
          )}

          {!user ? (
            <div className={m.card}>
              <EmptyState icon={Bell} title="Log in to see your alerts" body="Trip requests, parcel updates and messages show up here."
                actionLabel="Log in" onAction={() => navigate('/login', { state: { from: '/notifications' } })} />
            </div>
          ) : notifications.length === 0 ? (
            <div className={m.card}><EmptyState icon={Bell} title="You're all caught up" body="Activity on your trips, parcels and account will appear here." /></div>
          ) : Object.entries(groups).map(([day, items]) => (
            <section key={day}>
              <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">{day}</p>
              <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>
                {items.map(notif => {
                  const [Icon, cls] = M_TYPE[notif.type] || M_TYPE.system;
                  return (
                    <button key={notif._id} type="button" onClick={() => handleNotifTap(notif)}
                      className={`w-full flex gap-3 px-4 py-3.5 text-left transition-colors ${notif.read ? 'active:bg-slate-50' : 'bg-kb-50/50 active:bg-kb-50'}`}>
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}><Icon size={17} /></span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] leading-snug ${notif.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notif.title}</span>
                        {notif.body && <span className="block text-[14px] text-slate-500 mt-0.5 leading-relaxed">{notif.body}</span>}
                        <span className="block text-xs text-slate-400 mt-1">{timeLabel(notif.createdAt)}</span>
                      </span>
                      {!notif.read && <span className="w-2.5 h-2.5 rounded-full bg-kb-500 shrink-0 mt-1.5" aria-label="Unread" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {otherAnn.length > 0 && (
            <section>
              <p className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Updates from Kabutar</p>
              <div className={`${m.card} divide-y divide-slate-100 overflow-hidden`}>{otherAnn.map(annRow)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
