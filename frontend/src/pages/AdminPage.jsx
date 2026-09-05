import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Shield, CheckCircle, XCircle, Users, ChevronLeft, Search, ExternalLink, Clock, Megaphone, Plus, Trash2, Pin, BookOpen, Star, Sparkles, Flag, Upload, MapPin, LayoutDashboard, Ban, ShieldCheck, Package, ArrowUpDown, UserPlus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CITIES_BY_STATE, INDIAN_STATES } from '../lib/cities';

// ── Admin guard ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  if (!user) { navigate('/login', { state: { from: '/admin' } }); return null; }
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <Shield size={40} className="text-stone-300 mx-auto mb-3" />
          <h2 className="font-bold text-stone-900 mb-1">Admin access required</h2>
          <p className="text-stone-500 text-sm mb-4">You don't have admin privileges.</p>
          <PromoteForm onPromoted={() => window.location.reload()} />
          <button onClick={() => navigate('/')} className="btn-secondary w-full mt-3">← Back to app</button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

// ── Promote self to admin ─────────────────────────────────────────────────────
function PromoteForm({ onPromoted }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const promote = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/admin/promote', { secret });
      // Write updated user (role:'admin') to localStorage before reloading
      // so the page guard reads the correct role on refresh
      localStorage.setItem('kabootar_user', JSON.stringify(data.user));
      toast.success('You are now an admin!');
      onPromoted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid secret');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-400">Enter ADMIN_SECRET to promote yourself:</p>
      <input
        type="password"
        className="input-field text-sm"
        placeholder="Admin secret"
        value={secret}
        onChange={e => setSecret(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && promote()}
      />
      <button onClick={promote} disabled={loading || !secret.trim()} className="btn-primary w-full text-sm">
        {loading ? 'Verifying…' : 'Become Admin'}
      </button>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate  = useNavigate();
  const [tab,     setTab]     = useState('overview');
  const [purging, setPurging] = useState(false);

  const purgeTestData = async () => {
    if (!window.confirm(
      '⚠️ This will permanently delete ALL trips, parcels, messages, posts, reports and non-admin users.\n\nThis cannot be undone. Continue?'
    )) return;
    if (!window.confirm('Are you absolutely sure? Type OK to confirm in the next dialog.')) return;
    const input = window.prompt('Type DELETE to confirm:');
    if (input !== 'DELETE') { toast.error('Cancelled'); return; }

    setPurging(true);
    try {
      const { data } = await api.post('/admin/purge-test-data');
      toast.success(
        `Cleaned! Trips:${data.deleted.trips} Parcels:${data.deleted.parcels} Users:${data.deleted.users} Messages:${data.deleted.messages}`,
        { duration: 8000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purge failed');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-ghost p-1.5 -ml-1.5">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Shield size={18} className="text-orange-500" />
          <span className="font-bold text-stone-900">Admin Panel</span>
        </div>
        <button onClick={purgeTestData} disabled={purging}
          className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-red-50 text-red-500 border border-red-200 active:scale-95 transition-all disabled:opacity-50">
          {purging ? 'Clearing…' : '🗑️ Clear Test Data'}
        </button>
      </div>

      {/* Tabs — horizontally scrollable so it holds up as more sections get added */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mx-4 mt-4 overflow-x-auto">
        {[
          { k: 'overview',      label: 'Overview', icon: LayoutDashboard },
          { k: 'kyc',           label: 'KYC',       icon: Clock },
          { k: 'users',         label: 'Users',     icon: Users },
          { k: 'listings',      label: 'Listings',  icon: Package },
          { k: 'reports',       label: 'Reports',   icon: Flag },
          { k: 'cities',        label: 'Cities',    icon: MapPin },
          { k: 'announcements', label: 'Alerts',    icon: Megaphone },
          { k: 'posts',         label: 'Posts',     icon: BookOpen },
        ].map(({ k, label, icon: TabIcon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
            {TabIcon && <TabIcon size={12} />} {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'overview'      && <Overview onNavigate={setTab} />}
        {tab === 'kyc'           && <KycQueue />}
        {tab === 'posts'         && <PostsManager />}
        {tab === 'announcements' && <AnnouncementsManager />}
        {tab === 'reports'       && <ReportsQueue />}
        {tab === 'users'         && <UserList />}
        {tab === 'listings'      && <ListingsManager />}
        {tab === 'cities'        && <CitiesManager />}
      </div>
    </div>
  );
}

// ── Overview dashboard ─────────────────────────────────────────────────────────
function Overview({ onNavigate }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-white border border-stone-200 rounded-2xl h-24 animate-pulse" />)}
    </div>
  );
  if (!stats) return null;

  const cards = [
    { label: 'Total Users',    value: stats.totalUsers,     icon: Users,       grad: 'from-blue-500 to-indigo-500',   tab: 'users' },
    { label: 'KYC Verified',   value: stats.verifiedUsers,  icon: ShieldCheck, grad: 'from-emerald-500 to-teal-500',  tab: 'users' },
    { label: 'Pending KYC',    value: stats.pendingKyc,     icon: Clock,       grad: 'from-amber-500 to-orange-500',  tab: 'kyc' },
    { label: 'Banned',         value: stats.bannedUsers,    icon: Ban,         grad: 'from-stone-500 to-stone-700',   tab: 'users' },
    { label: 'Active Trips',   value: stats.activeTrips,    icon: Sparkles,    grad: 'from-orange-500 to-amber-500',  tab: 'listings' },
    { label: 'Open Parcels',   value: stats.openParcels,    icon: Package,     grad: 'from-sky-500 to-blue-500',      tab: 'listings' },
    { label: 'Pending Reports',value: stats.pendingReports, icon: Flag,        grad: 'from-red-500 to-rose-500',      tab: 'reports' },
    { label: 'Launch Cities',  value: stats.launchCities,   icon: MapPin,      grad: 'from-teal-500 to-emerald-500',  tab: 'cities' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <button key={c.label} onClick={() => c.tab && onNavigate(c.tab)}
            disabled={!c.tab}
            className={`relative overflow-hidden rounded-2xl p-4 text-left text-white bg-gradient-to-br ${c.grad} ${c.tab ? 'active:scale-[0.97] cursor-pointer' : 'cursor-default'} transition-transform`}>
            <c.icon size={16} className="opacity-80 mb-2" />
            <p className="text-2xl font-black leading-none">{c.value}</p>
            <p className="text-[11px] font-semibold opacity-90 mt-1">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-stone-500">
        <span>👋 {stats.newUsers7d} new signup{stats.newUsers7d !== 1 ? 's' : ''} this week</span>
        <span>🛡️ {stats.adminCount} admin{stats.adminCount !== 1 ? 's' : ''} · ❌ {stats.rejectedKyc} rejected</span>
      </div>
    </div>
  );
}

// ── KYC review queue ──────────────────────────────────────────────────────────
function KycQueue() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/admin/kyc')
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const approve = async (userId) => {
    setActing(userId);
    try {
      await api.post(`/admin/kyc/${userId}/approve`);
      toast.success('KYC approved ✓');
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget);
    try {
      await api.post(`/admin/kyc/${rejectTarget}/reject`, { reason: rejectReason || 'Documents unclear or invalid' });
      toast.success('KYC rejected');
      setUsers(prev => prev.filter(u => u._id !== rejectTarget));
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-40" />)}</div>;

  if (!users.length) return (
    <div className="card p-10 text-center">
      <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
      <p className="font-semibold text-stone-700">All clear!</p>
      <p className="text-stone-400 text-sm mt-1">No pending KYC submissions.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500 font-semibold">{users.length} pending submission{users.length !== 1 ? 's' : ''}</p>

      {users.map(u => (
        <div key={u._id} className="card p-4 space-y-4">
          {/* User identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-50 border-2 border-orange-100 flex items-center justify-center font-bold text-orange-500 shrink-0">
              {u.profileImage
                ? <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                : u.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900">{u.name}</p>
              <p className="text-xs text-stone-500">{u.phone}</p>
              {u.kycSubmittedAt && (
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Submitted {formatDistanceToNow(new Date(u.kycSubmittedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="grid grid-cols-2 gap-3">
            <DocThumb label="ID Document" url={u.kycDocumentUrl} />
            <DocThumb label="Selfie" url={u.selfieUrl} />
          </div>

          {/* Actions */}
          {rejectTarget === u._id ? (
            <div className="space-y-2">
              <textarea
                className="input-field resize-none text-sm"
                rows={2}
                placeholder="Rejection reason (shown to user)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={reject}
                  disabled={acting === u._id}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {acting === u._id ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="btn-secondary px-4">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => approve(u._id)}
                disabled={!!acting}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} />
                {acting === u._id ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={() => setRejectTarget(u._id)}
                disabled={!!acting}
                className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DocThumb({ label, url }) {
  if (!url) return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center h-28 text-stone-300 text-xs text-center p-2">
      No {label}
    </div>
  );

  const isImage = !url.includes('.pdf');

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-stone-400 font-semibold">{label}</p>
      {isImage ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt={label}
            className="w-full h-28 object-cover rounded-xl border border-stone-100 hover:opacity-90 transition-opacity"
          />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 h-28 rounded-xl border border-stone-100 bg-stone-50 text-orange-500 text-xs font-semibold hover:bg-orange-50 transition-colors"
        >
          <ExternalLink size={14} /> View PDF
        </a>
      )}
    </div>
  );
}

// ── Posts Manager ─────────────────────────────────────────────────────────────
function PostsManager() {
  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const EMPTY = { title: '', content: '', emoji: '🕊️', image: '', stats: { route: '', time: '', saved: '' }, featured: false };
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/posts').catch(() => ({ data: { posts: [] } }));
    setPosts(r.data.posts || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content required'); return; }
    setSaving(true);
    try {
      await api.post('/posts', form);
      toast.success('Post published!');
      setForm(EMPTY);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id, active) => {
    await api.patch(`/posts/${id}`, { active }).catch(() => {});
    setPosts(prev => prev.map(p => p._id === id ? { ...p, active } : p));
  };

  const toggleFeatured = async (id, featured) => {
    await api.patch(`/posts/${id}`, { featured }).catch(() => {});
    setPosts(prev => prev.map(p => p._id === id ? { ...p, featured } : p));
  };

  const remove = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await api.post('/posts/seed');
      toast.success(r.data.message);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSeeding(false); }
  };

  const setStats = (key, val) => setForm(f => ({ ...f, stats: { ...f.stats, [key]: val } }));

  return (
    <div className="space-y-5">
      {/* Seed button */}
      <button onClick={seed} disabled={seeding}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-200 text-orange-500 text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all">
        <Sparkles size={14} /> {seeding ? 'Seeding…' : 'Seed 3 Sample Posts (first time only)'}
      </button>

      {/* Create form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2"><Plus size={14} /> New Post</h3>

        <div className="flex gap-2">
          <input className="input-field w-14 text-center text-xl" placeholder="🕊️" value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer bg-stone-50 border border-stone-200 rounded-xl px-3">
            <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
            <Star size={12} className="text-orange-400" /> Story
          </label>
        </div>

        <input className="input-field w-full text-sm" placeholder="Title (bold headline)" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <textarea className="input-field w-full text-sm resize-none" rows={4} placeholder="Story content — make it real and impactful…"
          value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
        {/* Image — upload directly OR paste URL */}
        <div className="space-y-1.5">
          <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl py-3 cursor-pointer transition-all ${uploadingImg ? 'border-stone-200 opacity-60' : 'border-orange-200 hover:border-orange-400'}`}>
            {uploadingImg ? (
              <span className="text-xs text-stone-400">Uploading…</span>
            ) : form.image ? (
              <div className="w-full px-2">
                <img src={form.image} alt="" className="w-full h-24 object-cover rounded-lg" />
                <p className="text-[10px] text-center text-emerald-500 mt-1 font-semibold">✓ Image ready</p>
              </div>
            ) : (
              <>
                <Upload size={18} className="text-orange-400" />
                <span className="text-xs text-stone-500">Upload image (optional)</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingImg(true);
                try {
                  const { uploadImageToStorage } = await import('../lib/firebase');
                  const url = await uploadImageToStorage(file, 'posts');
                  setForm(f => ({ ...f, image: url }));
                } catch { toast.error('Image upload failed'); }
                finally { setUploadingImg(false); }
              }} />
          </label>
          {form.image && (
            <button onClick={() => setForm(f => ({ ...f, image: '' }))}
              className="text-[10px] text-red-400 font-semibold w-full text-center">
              Remove image
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <input className="input-field text-xs" placeholder="📍 Route" value={form.stats.route}
            onChange={e => setStats('route', e.target.value)} />
          <input className="input-field text-xs" placeholder="⏱ Time" value={form.stats.time}
            onChange={e => setStats('time', e.target.value)} />
          <input className="input-field text-xs" placeholder="💰 Saved" value={form.stats.saved}
            onChange={e => setStats('saved', e.target.value)} />
        </div>

        <button onClick={create} disabled={saving} className="btn-primary w-full text-sm">
          {saving ? 'Publishing…' : 'Publish Post'}
        </button>
      </div>

      {/* Existing posts */}
      {loading ? (
        <div className="text-center text-stone-400 text-sm py-8">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">
          No posts yet — seed the samples or create one above
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(p => (
            <div key={p._id} className={`bg-white border rounded-2xl px-4 py-3 ${!p.active ? 'opacity-50 border-stone-100' : 'border-stone-200'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-stone-900 truncate">{p.title}</p>
                    {p.featured && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">STORY</span>}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {p.active ? 'Live' : 'Off'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    ❤️ {p.likes?.length || 0} · 💬 {p.comments?.length || 0}
                    {p.stats?.route && ` · ${p.stats.route}`}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => toggleFeatured(p._id, !p.featured)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg ${p.featured ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'}`}>
                    {p.featured ? '★ Story' : '☆ Story'}
                  </button>
                  <button onClick={() => toggleActive(p._id, !p.active)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg ${p.active ? 'bg-stone-200 text-stone-600' : 'bg-emerald-500 text-white'}`}>
                    {p.active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => remove(p._id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-500">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reports Queue ─────────────────────────────────────────────────────────────
const REASON_LABEL = {
  spam: 'Spam', harassment: 'Harassment', fake_account: 'Fake Account',
  fraud: 'Fraud', inappropriate_content: 'Inappropriate', other: 'Other',
};
const STATUS_COLOR = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

function ReportsQueue() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('pending');

  const load = async () => {
    setLoading(true);
    const r = await api.get(`/admin/reports?status=${filter}`).catch(() => ({ data: { reports: [] } }));
    setReports(r.data.reports || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/reports/${id}`, { status }).catch(() => {});
    setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {['pending', 'reviewed', 'resolved', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filter === s ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-stone-400 text-sm py-8">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">
          No {filter} reports
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-stone-800">
                      {r.reporter?.name} → {r.reportedUser?.name}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                      {REASON_LABEL[r.reason] || r.reason}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">{r.description}</p>
                  )}
                  <p className="text-[10px] text-stone-400 mt-1">{format(new Date(r.createdAt), 'dd MMM yyyy · h:mm a')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {r.status !== 'reviewed' && (
                  <button onClick={() => updateStatus(r._id, 'reviewed')}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">
                    Mark Reviewed
                  </button>
                )}
                {r.status !== 'resolved' && (
                  <button onClick={() => updateStatus(r._id, 'resolved')}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Announcements Manager ─────────────────────────────────────────────────────
const ANNOUNCE_TYPES = ['info', 'warning', 'alert', 'feature'];
const TYPE_COLOR = { info: 'bg-blue-50 border-blue-200', warning: 'bg-amber-50 border-amber-200', alert: 'bg-red-50 border-red-200', feature: 'bg-orange-50 border-orange-200' };

// ── Push broadcast — sends a real push + in-app notification, unlike a banner Announcement
function BroadcastTool() {
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState({ title: '', body: '', segment: 'all' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and message required'); return; }
    if (!confirm(`Send this push notification to ${form.segment === 'all' ? 'ALL users' : `${form.segment} users`}?`)) return;
    setSending(true);
    try {
      const { data } = await api.post('/admin/broadcast', form);
      toast.success(`Sent to ${data.count} user${data.count !== 1 ? 's' : ''}`);
      setForm({ title: '', body: '', segment: 'all' });
      setOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2"><Megaphone size={14} className="text-orange-500" /> Push Broadcast</h3>
        <span className="text-stone-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-[11px] text-stone-400">Sends a real push notification + in-app inbox message immediately — different from an Announcement banner.</p>
          <input className="input-field w-full text-sm" placeholder="Title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="input-field w-full text-sm resize-none" rows={2} placeholder="Message"
            value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <select className="input-field w-full text-sm" value={form.segment}
            onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}>
            <option value="all">All users</option>
            <option value="verified">KYC verified only</option>
            <option value="pending">KYC pending only</option>
            <option value="none">Unverified only</option>
          </select>
          <button onClick={send} disabled={sending} className="btn-primary w-full text-sm">
            {sending ? 'Sending…' : 'Send Broadcast'}
          </button>
        </div>
      )}
    </div>
  );
}

function AnnouncementsManager() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ title: '', body: '', icon: '📢', type: 'info', pinned: false, expiresAt: '' });
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/announcements/all').catch(() => ({ data: { announcements: [] } }));
    setItems(r.data.announcements || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body required'); return; }
    setSaving(true);
    try {
      await api.post('/announcements', { ...form, expiresAt: form.expiresAt || null });
      toast.success('Announcement published');
      setForm({ title: '', body: '', icon: '📢', type: 'info', pinned: false, expiresAt: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggle = async (id, active) => {
    await api.patch(`/announcements/${id}`, { active }).catch(() => {});
    setItems(prev => prev.map(a => a._id === id ? { ...a, active } : a));
  };

  const remove = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setItems(prev => prev.filter(a => a._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-5">
      <BroadcastTool />

      {/* Create form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2"><Plus size={14} /> New Announcement</h3>
        <div className="flex gap-2">
          <input className="input-field w-14 text-center text-lg" placeholder="📢" value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          <select className="input-field flex-1 text-sm" value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {ANNOUNCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input className="input-field w-full text-sm" placeholder="Title" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <textarea className="input-field w-full text-sm resize-none" rows={3} placeholder="Body text…"
          value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
            <Pin size={12} /> Pinned
          </label>
          <input type="date" className="input-field flex-1 text-xs" placeholder="Expires (optional)"
            value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
        </div>
        <button onClick={create} disabled={saving} className="btn-primary w-full text-sm">
          {saving ? 'Publishing…' : 'Publish Announcement'}
        </button>
      </div>

      {/* Existing announcements */}
      {loading ? (
        <div className="text-center text-stone-400 text-sm py-8">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">No announcements yet</div>
      ) : (
        <div className="space-y-2">
          {items.map(a => (
            <div key={a._id} className={`border rounded-2xl px-4 py-3 flex gap-3 items-start ${TYPE_COLOR[a.type] || 'bg-stone-50 border-stone-100'} ${!a.active ? 'opacity-50' : ''}`}>
              <span className="text-xl shrink-0">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-stone-900">{a.title}</p>
                  {a.pinned && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Pinned</span>}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                    {a.active ? 'Live' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{a.body}</p>
                <p className="text-[10px] text-stone-400 mt-1">{format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => toggle(a._id, !a.active)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.active ? 'bg-stone-200 text-stone-600' : 'bg-emerald-500 text-white'}`}>
                  {a.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => remove(a._id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-500">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Launch cities (allowed cities/states) ─────────────────────────────────────
function CitiesManager() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ state: '', city: '' });
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/cities').catch(() => ({ data: { cities: [] } }));
    setItems(r.data.cities || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addedCities = new Set(items.map(c => c.city.toLowerCase()));
  // Cities already on the list are removed from the picker so you can't add one twice
  const citiesForState = (CITIES_BY_STATE[form.state] || []).filter(c => !addedCities.has(c.toLowerCase()));

  const create = async () => {
    if (!form.city.trim() || !form.state.trim()) { toast.error('Pick a state and city'); return; }
    setSaving(true);
    try {
      await api.post('/cities', form);
      toast.success(`${form.city} added`);
      setForm(f => ({ ...f, city: '' }));
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id, city) => {
    if (!confirm(`Remove ${city}? Trips/parcels can no longer be posted for this city.`)) return;
    try {
      await api.delete(`/cities/${id}`);
      setItems(prev => prev.filter(c => c._id !== id));
      toast.success('Removed');
    } catch { toast.error('Failed to remove'); }
  };

  const byState = items.reduce((acc, c) => { (acc[c.state] ||= []).push(c); return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Create form — state → city dropdowns, sourced from the app's built-in city/state list */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2"><Plus size={14} /> Add Launch City</h3>
        <p className="text-xs text-stone-400">
          {items.length === 0
            ? 'No cities configured — the app is unrestricted, anyone can post between any city.'
            : 'Trip & parcel posting is restricted to routes where BOTH cities are on this list.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select className="input-field text-sm" value={form.state}
            onChange={e => setForm({ state: e.target.value, city: '' })}>
            <option value="">Select state…</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field text-sm" value={form.city} disabled={!form.state}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
            <option value="">{form.state ? 'Select city…' : 'Pick a state first'}</option>
            {citiesForState.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={create} disabled={saving || !form.city} className="btn-primary w-full text-sm">
          {saving ? 'Adding…' : 'Add City'}
        </button>
      </div>

      {/* Reference: the full city/state list built into the app (source for the dropdowns above) */}
      <details className="bg-white border border-stone-200 rounded-2xl p-4">
        <summary className="font-bold text-stone-900 text-sm cursor-pointer select-none">
          📖 Browse all {Object.values(CITIES_BY_STATE).flat().length} cities the app knows ({INDIAN_STATES.length} states)
        </summary>
        <div className="mt-3 space-y-3 max-h-72 overflow-y-auto pr-1">
          {INDIAN_STATES.map(state => (
            <div key={state}>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide mb-1">{state}</p>
              <div className="flex flex-wrap gap-1.5">
                {CITIES_BY_STATE[state].map(c => (
                  <span key={c} className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    addedCities.has(c.toLowerCase())
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                      : 'bg-stone-50 border-stone-100 text-stone-500'
                  }`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Existing cities, grouped by state */}
      {loading ? (
        <div className="text-center text-stone-400 text-sm py-8">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">
          No launch cities yet — app is open everywhere
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byState).map(([state, cities]) => (
            <div key={state}>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide mb-1.5">{state}</p>
              <div className="flex flex-wrap gap-2">
                {cities.map(c => (
                  <span key={c._id} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold text-stone-700">
                    {c.city}
                    <button onClick={() => remove(c._id, c.city)}
                      className="w-5 h-5 rounded-full hover:bg-red-100 text-red-400 flex items-center justify-center">
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Listings moderation (trips & parcels) ─────────────────────────────────────
const TRIP_STATUSES   = ['all', 'active', 'completed', 'cancelled'];
const PARCEL_STATUSES = ['all', 'open', 'matched', 'requested', 'accepted', 'picked', 'in_transit', 'delivered', 'completed', 'cancelled'];

function ListingsManager() {
  const [kind,    setKind]    = useState('trips'); // 'trips' | 'parcels'
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [meta,    setMeta]    = useState({ total: 0, pages: 1 });

  const load = (pg = 1) => {
    setLoading(true);
    api.get(`/admin/${kind}`, { params: { page: pg, status } })
      .then(r => { setItems(r.data[kind]); setMeta({ total: r.data.total, pages: r.data.pages }); setPage(pg); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, [kind, status]); // eslint-disable-line

  const remove = async (id) => {
    if (!confirm(`Remove this ${kind === 'trips' ? 'trip' : 'parcel'}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/${kind}/${id}`);
      setItems(prev => prev.filter(i => i._id !== id));
      toast.success('Removed');
    } catch { toast.error('Failed to remove'); }
  };

  const switchKind = (k) => { setKind(k); setStatus('all'); };
  const statuses = kind === 'trips' ? TRIP_STATUSES : PARCEL_STATUSES;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        <button onClick={() => switchKind('trips')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kind === 'trips' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          ✈️ Trips
        </button>
        <button onClick={() => switchKind('parcels')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kind === 'parcels' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          📦 Parcels
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${status === s ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-400">{meta.total} {kind}</p>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white border border-stone-200 rounded-2xl p-3 animate-pulse h-16" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">No {kind} match this filter</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item._id} className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-stone-900 truncate">{item.fromCity} → {item.toCity}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{item.status?.replace('_', ' ')}</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                  {item.userId?.name || 'Unknown'} · {item.userId?.phone || ''}
                  {kind === 'trips' ? ` · ${item.transportMode}` : ` · ${item.itemType}, ${item.weight}kg`}
                  {item.createdAt && ` · ${format(new Date(item.createdAt), 'dd MMM yy')}`}
                </p>
              </div>
              <button onClick={() => remove(item._id)}
                className="shrink-0 w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {meta.pages > 1 && (
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1 || loading} className="btn-secondary px-4 text-sm disabled:opacity-40">← Prev</button>
          <span className="flex items-center text-xs text-stone-500">Page {page} of {meta.pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= meta.pages || loading} className="btn-secondary px-4 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ── All users list ────────────────────────────────────────────────────────────
const KYC_BADGE = {
  none:     { cls: 'bg-stone-100 text-stone-500',   label: 'Unverified' },
  pending:  { cls: 'bg-amber-100 text-amber-700',   label: '⏳ Pending' },
  verified: { cls: 'bg-emerald-100 text-emerald-700', label: '✓ Verified' },
  rejected: { cls: 'bg-red-100 text-red-600',       label: '✗ Rejected' },
};

function UserCard({ u, currentUserId, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banning, setBanning] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const badge = KYC_BADGE[u.kycStatus] || KYC_BADGE.none;
  const isSelf = u._id === currentUserId;

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !activity && !activityLoading) {
      setActivityLoading(true);
      api.get(`/admin/users/${u._id}/activity`)
        .then(r => setActivity(r.data))
        .catch(() => {})
        .finally(() => setActivityLoading(false));
    }
  };

  const ban = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/users/${u._id}/ban`, { reason: banReason });
      toast.success('User banned');
      onUpdate(data.user);
      setBanning(false); setBanReason('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to ban'); }
    finally { setBusy(false); }
  };

  const unban = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/users/${u._id}/unban`);
      toast.success('User unbanned');
      onUpdate(data.user);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to unban'); }
    finally { setBusy(false); }
  };

  const setRole = async (role) => {
    if (!confirm(role === 'admin' ? `Make ${u.name} an admin?` : `Remove admin access from ${u.name}?`)) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/users/${u._id}/role`, { role });
      toast.success(`Now ${role}`);
      onUpdate(data.user);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update role'); }
    finally { setBusy(false); }
  };

  const revokeKyc = async () => {
    if (!confirm(`Revoke ${u.name}'s KYC verification? They won't be able to post trips until re-verified.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/kyc/${u._id}/reject`, { reason: 'KYC revoked by admin' });
      toast.success('KYC revoked');
      onUpdate(data.user);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to revoke'); }
    finally { setBusy(false); }
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${u.banned ? 'border-red-200' : 'border-stone-200'}`}>
      {/* Compact row — always visible */}
      <button onClick={toggleOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors">
        <div className={`w-10 h-10 rounded-full overflow-hidden bg-orange-50 flex items-center justify-center font-bold text-orange-500 shrink-0 border ${u.banned ? 'border-red-200 opacity-60' : 'border-stone-100'}`}>
          {u.profileImage
            ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm">{u.name?.[0]?.toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-stone-900 truncate">{u.name}</span>
            {u.role === 'admin' && <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">ADMIN</span>}
            {u.banned && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Ban size={9} /> BANNED</span>}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5 truncate">{u.phone} · {u.city || 'No city'}</p>
        </div>
        <div className="text-[10px] text-stone-400 shrink-0 text-right">
          <div>{u.createdAt ? format(new Date(u.createdAt), 'dd MMM yy') : ''}</div>
          <div className="text-stone-300">{open ? '▲' : '▼'}</div>
        </div>
      </button>

      {/* Expanded full profile */}
      {open && (
        <div className="border-t border-stone-100 px-4 py-4 space-y-4 animate-fade-in">

          {/* Admin controls */}
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Controls</p>
            {u.banned ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-red-600">{u.bannedReason ? `Banned: "${u.bannedReason}"` : 'Banned'}</p>
                <button onClick={unban} disabled={busy}
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-white disabled:opacity-50">
                  Unban
                </button>
              </div>
            ) : banning ? (
              <div className="space-y-2">
                <textarea className="input-field resize-none text-xs" rows={2}
                  placeholder="Ban reason (optional, shown to user)"
                  value={banReason} onChange={e => setBanReason(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={ban} disabled={busy}
                    className="flex-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-50">
                    {busy ? 'Banning…' : 'Confirm Ban'}
                  </button>
                  <button onClick={() => { setBanning(false); setBanReason(''); }} className="btn-secondary px-3 text-[11px]">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {!isSelf && u.role !== 'admin' && (
                  <button onClick={() => setBanning(true)} disabled={busy}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 flex items-center gap-1 disabled:opacity-50">
                    <Ban size={11} /> Ban User
                  </button>
                )}
                {!isSelf && (
                  u.role === 'admin' ? (
                    <button onClick={() => setRole('user')} disabled={busy}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-stone-200 text-stone-600 flex items-center gap-1 disabled:opacity-50">
                      Remove Admin
                    </button>
                  ) : (
                    <button onClick={() => setRole('admin')} disabled={busy}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1 disabled:opacity-50">
                      <UserPlus size={11} /> Make Admin
                    </button>
                  )
                )}
                {u.kycStatus === 'verified' && (
                  <button onClick={revokeKyc} disabled={busy}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 disabled:opacity-50">
                    <XCircle size={11} /> Revoke KYC
                  </button>
                )}
                {isSelf && <p className="text-[11px] text-stone-400">This is you — no self actions</p>}
              </div>
            )}
          </div>

          {/* Profile details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-stone-400 font-semibold">Phone</span><p className="text-stone-800 mt-0.5">{u.phone} {u.isPhoneVerified ? '✓' : '✗'}</p></div>
            <div><span className="text-stone-400 font-semibold">City</span><p className="text-stone-800 mt-0.5">{u.city || '—'}</p></div>
            <div><span className="text-stone-400 font-semibold">Rating</span><p className="text-stone-800 mt-0.5">⭐ {u.rating?.toFixed(1) || '5.0'} ({u.totalRatings || 0})</p></div>
            <div><span className="text-stone-400 font-semibold">Trips</span><p className="text-stone-800 mt-0.5">{u.tripsCompleted || 0} completed</p></div>
            {u.frequentRoute?.from && (
              <div className="col-span-2"><span className="text-stone-400 font-semibold">Frequent route</span>
                <p className="text-stone-800 mt-0.5">{u.frequentRoute.from} → {u.frequentRoute.to}</p></div>
            )}
            {u.bio && (
              <div className="col-span-2"><span className="text-stone-400 font-semibold">Bio</span>
                <p className="text-stone-800 mt-0.5 leading-relaxed">{u.bio}</p></div>
            )}
            <div className="col-span-2"><span className="text-stone-400 font-semibold">KYC status</span>
              <p className={`mt-0.5 font-bold capitalize ${KYC_BADGE[u.kycStatus]?.cls?.split(' ')[1] || 'text-stone-500'}`}>
                {badge.label}
                {u.kycSubmittedAt && ` · Submitted ${format(new Date(u.kycSubmittedAt), 'dd MMM yy')}`}
                {u.kycApprovedAt && ` · Approved ${format(new Date(u.kycApprovedAt), 'dd MMM yy')}`}
                {u.kycRejectedReason && ` · "${u.kycRejectedReason}"`}
              </p>
            </div>
          </div>

          {/* KYC Documents */}
          {(u.kycDocumentUrl || u.selfieUrl) && (
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">KYC Documents</p>
              <div className="flex gap-3">
                {u.kycDocumentUrl && (
                  <div className="flex-1">
                    <p className="text-[10px] text-stone-400 mb-1">ID Document</p>
                    {u.kycDocumentUrl.endsWith('.pdf') ? (
                      <a href={u.kycDocumentUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-2 rounded-xl">
                        <ExternalLink size={12} /> View PDF
                      </a>
                    ) : (
                      <a href={u.kycDocumentUrl} target="_blank" rel="noreferrer">
                        <img src={u.kycDocumentUrl} alt="ID" className="w-full h-28 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition-opacity" />
                      </a>
                    )}
                  </div>
                )}
                {u.selfieUrl && (
                  <div className="flex-1">
                    <p className="text-[10px] text-stone-400 mb-1">Selfie</p>
                    <a href={u.selfieUrl} target="_blank" rel="noreferrer">
                      <img src={u.selfieUrl} alt="Selfie" className="w-full h-28 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition-opacity" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile photo */}
          {u.profileImage && (
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">Profile Photo</p>
              <a href={u.profileImage} target="_blank" rel="noreferrer">
                <img src={u.profileImage} alt="Profile" className="w-20 h-20 object-cover rounded-2xl border border-stone-200" />
              </a>
            </div>
          )}

          {/* Activity — recent trips, parcels, reports filed against this user */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">Recent Activity</p>
            {activityLoading ? (
              <p className="text-xs text-stone-400">Loading…</p>
            ) : !activity ? (
              <p className="text-xs text-stone-400">—</p>
            ) : (
              <div className="space-y-3">
                {activity.trips.length === 0 && activity.parcels.length === 0 && activity.reportsAgainst.length === 0 ? (
                  <p className="text-xs text-stone-400">No trips, parcels, or reports yet</p>
                ) : (
                  <>
                    {activity.trips.length > 0 && (
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">Trips ({activity.trips.length})</p>
                        <div className="space-y-1">
                          {activity.trips.map(t => (
                            <p key={t._id} className="text-xs text-stone-700 bg-stone-50 rounded-lg px-2 py-1">
                              {t.fromCity} → {t.toCity} · <span className="text-stone-400">{t.status}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {activity.parcels.length > 0 && (
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">Parcels ({activity.parcels.length})</p>
                        <div className="space-y-1">
                          {activity.parcels.map(p => (
                            <p key={p._id} className="text-xs text-stone-700 bg-stone-50 rounded-lg px-2 py-1">
                              {p.fromCity} → {p.toCity} · <span className="text-stone-400">{p.status}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {activity.reportsAgainst.length > 0 && (
                      <div>
                        <p className="text-[10px] text-red-400 mb-1">Reports against this user ({activity.reportsAgainst.length})</p>
                        <div className="space-y-1">
                          {activity.reportsAgainst.map(r => (
                            <p key={r._id} className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                              {REASON_LABEL[r.reason] || r.reason} — by {r.reporter?.name || 'unknown'} · <span className="text-red-400">{r.status}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const KYC_FILTERS = [
  { k: 'all',      label: 'All' },
  { k: 'verified', label: '✓ Verified' },
  { k: 'pending',  label: '⏳ Pending' },
  { k: 'rejected', label: '✗ Rejected' },
  { k: 'none',     label: 'Unverified' },
];
const SORT_OPTIONS = [
  { k: 'newest', label: 'Newest first' },
  { k: 'oldest', label: 'Oldest first' },
  { k: 'rating', label: 'Top rated' },
  { k: 'trips',  label: 'Most trips' },
];

function UserList() {
  const { user: currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [meta,    setMeta]    = useState({ total: 0, pages: 1 });
  const [kycStatus, setKycStatus] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = (pg = 1, q = search) => {
    setLoading(true);
    api.get('/admin/users', { params: {
      page: pg, search: q, kycStatus, role: roleFilter, banned: bannedFilter, sort,
    } })
      .then(r => { setUsers(r.data.users); setMeta({ total: r.data.total, pages: r.data.pages }); setPage(pg); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, [kycStatus, roleFilter, bannedFilter, sort]); // eslint-disable-line

  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (!e.target.value.trim()) load(1, '');
  };
  const submitSearch = (e) => { e.preventDefault(); load(1, search); };

  const updateUserInList = (updated) => setUsers(prev => prev.map(u => u._id === updated._id ? updated : u));

  return (
    <div className="space-y-3">
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input-field pl-8 text-sm" placeholder="Search name or phone…"
            value={search} onChange={handleSearch} />
        </div>
        <button type="submit" className="btn-primary px-4 text-sm">Search</button>
      </form>

      {/* KYC status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {KYC_FILTERS.map(f => (
          <button key={f.k} onClick={() => setKycStatus(f.k)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${kycStatus === f.k ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Role / banned / sort */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <select className="input-field text-[11px] py-1.5 w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="user">Users only</option>
          <option value="admin">Admins only</option>
        </select>
        <select className="input-field text-[11px] py-1.5 w-auto" value={bannedFilter} onChange={e => setBannedFilter(e.target.value)}>
          <option value="all">All accounts</option>
          <option value="false">Active only</option>
          <option value="true">Banned only</option>
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown size={12} className="text-stone-400" />
          <select className="input-field text-[11px] py-1.5 w-auto" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(s => <option key={s.k} value={s.k}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs text-stone-400">{meta.total} user{meta.total !== 1 ? 's' : ''} · tap a row to expand full profile</p>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="bg-white border border-stone-200 rounded-2xl p-3 animate-pulse h-16" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-8 bg-white rounded-2xl border border-stone-100">No users match these filters</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <UserCard key={u._id} u={u} currentUserId={currentUser?._id} onUpdate={updateUserInList} />
          ))}
        </div>
      )}

      {meta.pages > 1 && (
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1 || loading} className="btn-secondary px-4 text-sm disabled:opacity-40">← Prev</button>
          <span className="flex items-center text-xs text-stone-500">Page {page} of {meta.pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= meta.pages || loading} className="btn-secondary px-4 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
