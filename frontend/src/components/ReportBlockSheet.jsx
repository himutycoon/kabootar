import { useState } from 'react';
import { Flag, UserX, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Sheet, ListRow } from './mobile/ui';
import { m } from './mobile/styles';

const REPORT_REASONS = [
  { value: 'spam',                 label: 'Spam or fake listings' },
  { value: 'harassment',           label: 'Harassment or abuse' },
  { value: 'fake_account',         label: 'Fake account or impersonation' },
  { value: 'fraud',                label: 'Fraud or scam attempt' },
  { value: 'inappropriate_content',label: 'Inappropriate content' },
  { value: 'other',                label: 'Other' },
];

export default function ReportBlockSheet({ userId, userName, isBlocked, onBlock, onClose }) {
  const [view,        setView]        = useState('menu');   // 'menu' | 'report' | 'block_confirm'
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleReport = async () => {
    if (!reason) { toast.error('Select a reason'); return; }
    setLoading(true);
    try {
      await api.post(`/users/${userId}/report`, { reason, description });
      toast.success('Report sent to the Kabutar team');
      onClose();
    } catch { toast.error('Failed to submit report'); }
    finally { setLoading(false); }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      if (isBlocked) {
        await api.delete(`/users/${userId}/block`);
        toast.success(`${userName} unblocked`);
      } else {
        await api.post(`/users/${userId}/block`);
        toast.success(`${userName} blocked. Their listings won't appear in your searches.`);
      }
      onBlock?.(!isBlocked);
      onClose();
    } catch { toast.error('Failed to update block status'); }
    finally { setLoading(false); }
  };

  const back = (
    <button type="button" onClick={() => setView('menu')} aria-label="Back"
      className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100 hover:bg-slate-100"><ArrowLeft size={20} /></button>
  );

  if (view === 'report') {
    return (
      <Sheet title={`Report ${userName}`} onClose={onClose} headerLeft={back}
        footer={<button type="button" onClick={handleReport} disabled={!reason || loading} className={`${m.btnPrimary} w-full`}>{loading ? 'Sending…' : 'Send report'}</button>}>
        <p className="text-[14px] text-slate-600">Why are you reporting {userName}? Reports go to the Kabutar team for review.</p>
        <div className="mt-4 space-y-2" role="radiogroup">
          {REPORT_REASONS.map(rr => (
            <button key={rr.value} type="button" role="radio" aria-checked={reason === rr.value} onClick={() => setReason(rr.value)}
              className={`w-full text-left px-4 h-12 rounded-xl border text-[15px] font-medium transition-colors ${reason === rr.value ? 'border-kb-500 bg-kb-50 text-kb-700' : 'border-slate-200 text-slate-700 active:bg-slate-50'}`}>
              {rr.label}
            </button>
          ))}
        </div>
        <label htmlFor="report-details" className="block mt-4 text-[13px] font-semibold text-slate-700 mb-1.5">Details (optional)</label>
        <textarea id="report-details" className={m.textarea} rows={3} maxLength={500} placeholder="What happened?"
          value={description} onChange={e => setDescription(e.target.value)} />
      </Sheet>
    );
  }

  if (view === 'block_confirm') {
    return (
      <Sheet title={`Block ${userName}?`} onClose={onClose} headerLeft={back}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={`${m.btnSecondary} flex-1`}>Cancel</button>
            <button type="button" onClick={handleBlock} disabled={loading} className="flex-1 inline-flex items-center justify-center h-12 rounded-xl bg-red-600 active:bg-red-700 text-white text-[15px] font-semibold disabled:opacity-50">
              {loading ? 'Blocking…' : 'Block'}
            </button>
          </div>
        }>
        <p className="text-[15px] text-slate-600 leading-relaxed">
          Their trips and parcel requests won't appear in your searches. You can unblock them any time from your profile.
        </p>
        <p className="mt-3 text-[13px] text-slate-500">If they're harassing or scamming you, please report them too.</p>
      </Sheet>
    );
  }

  return (
    <Sheet title={userName} onClose={onClose}>
      <div className="-mx-4 -my-2 divide-y divide-slate-100">
        <ListRow icon={Flag} title="Report" sub="Tell the Kabutar team about a problem" onClick={() => setView('report')} />
        <ListRow icon={UserX} title={isBlocked ? 'Unblock' : 'Block'} danger={!isBlocked}
          sub={isBlocked ? 'Show their listings in your searches again' : 'Hide their listings from your searches'}
          onClick={() => (isBlocked ? handleBlock() : setView('block_confirm'))} />
      </div>
    </Sheet>
  );
}
