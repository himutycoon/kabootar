import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Shield, CheckCircle, XCircle, Users, ChevronLeft, Search, ExternalLink, Clock, Megaphone, Plus, Trash2, Pin, BookOpen, Star, Sparkles, Flag, Upload, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import CityInput from '../components/CityInput';

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
  const [tab,     setTab]     = useState('kyc');
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

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mx-4 mt-4">
        <button onClick={() => setTab('kyc')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'kyc' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <Clock size={12} /> KYC
        </button>
        <button onClick={() => setTab('posts')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'posts' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <BookOpen size={12} /> Posts
        </button>
        <button onClick={() => setTab('announcements')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'announcements' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <Megaphone size={12} /> Alerts
        </button>
        <button onClick={() => setTab('reports')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'reports' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <Flag size={12} /> Reports
        </button>
        <button onClick={() => setTab('users')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'users' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <Users size={12} /> Users
        </button>
        <button onClick={() => setTab('cities')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${tab === 'cities' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
          <MapPin size={12} /> Cities
        </button>
      </div>

      <div className="px-4 py-4">
        {tab === 'kyc'           && <KycQueue />}
        {tab === 'posts'         && <PostsManager />}
        {tab === 'announcements' && <AnnouncementsManager />}
        {tab === 'reports'       && <ReportsQueue />}
        {tab === 'users'         && <UserList />}
        {tab === 'cities'        && <CitiesManager />}
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
    await api.delete(`/posts/${id}`).catch(() => {});
    setPosts(prev => prev.filter(p => p._id !== id));
    toast.success('Deleted');
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
    await api.delete(`/announcements/${id}`).catch(() => {});
    setItems(prev => prev.filter(a => a._id !== id));
    toast.success('Deleted');
  };

  return (
    <div className="space-y-5">
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
  const [form,    setForm]    = useState({ city: '', state: '' });
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/cities').catch(() => ({ data: { cities: [] } }));
    setItems(r.data.cities || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.city.trim() || !form.state.trim()) { toast.error('City and state required'); return; }
    setSaving(true);
    try {
      await api.post('/cities', form);
      toast.success(`${form.city} added`);
      setForm({ city: '', state: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id, city) => {
    if (!confirm(`Remove ${city}? Trips/parcels can no longer be posted for this city.`)) return;
    await api.delete(`/cities/${id}`).catch(() => {});
    setItems(prev => prev.filter(c => c._id !== id));
    toast.success('Removed');
  };

  const byState = items.reduce((acc, c) => { (acc[c.state] ||= []).push(c); return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Create form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2"><Plus size={14} /> Add Launch City</h3>
        <p className="text-xs text-stone-400">
          {items.length === 0
            ? 'No cities configured — the app is unrestricted, anyone can post between any city.'
            : 'Trip & parcel posting is restricted to routes where BOTH cities are on this list.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <CityInput value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="City" />
          <input className="input-field" placeholder="State" value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
        </div>
        <button onClick={create} disabled={saving} className="btn-primary w-full text-sm">
          {saving ? 'Adding…' : 'Add City'}
        </button>
      </div>

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

// ── All users list ────────────────────────────────────────────────────────────
const KYC_BADGE = {
  none:     { cls: 'bg-stone-100 text-stone-500',   label: 'Unverified' },
  pending:  { cls: 'bg-amber-100 text-amber-700',   label: '⏳ Pending' },
  verified: { cls: 'bg-emerald-100 text-emerald-700', label: '✓ Verified' },
  rejected: { cls: 'bg-red-100 text-red-600',       label: '✗ Rejected' },
};

function UserCard({ u }) {
  const [open, setOpen] = useState(false);
  const badge = KYC_BADGE[u.kycStatus] || KYC_BADGE.none;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      {/* Compact row — always visible */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-50 flex items-center justify-center font-bold text-orange-500 shrink-0 border border-stone-100">
          {u.profileImage
            ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm">{u.name?.[0]?.toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-stone-900 truncate">{u.name}</span>
            {u.role === 'admin' && <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">ADMIN</span>}
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
        </div>
      )}
    </div>
  );
}

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const load = (pg = 1, q = search) => {
    setLoading(true);
    api.get('/admin/users', { params: { page: pg, search: q } })
      .then(r => { setUsers(r.data.users); setMeta({ total: r.data.total, pages: r.data.pages }); setPage(pg); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (!e.target.value.trim()) load(1, '');
  };
  const submitSearch = (e) => { e.preventDefault(); load(1, search); };

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

      <p className="text-xs text-stone-400">{meta.total} total users · tap a row to expand full profile</p>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="bg-white border border-stone-200 rounded-2xl p-3 animate-pulse h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => <UserCard key={u._id} u={u} />)}
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
