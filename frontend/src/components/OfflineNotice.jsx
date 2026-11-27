import { WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Shown when a screen falls back to the last results saved on this device
export default function OfflineNotice({ at, onRetry }) {
  if (!at) return null;
  return (
    <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5">
      <WifiOff size={16} className="text-slate-500 shrink-0" />
      <p className="flex-1 text-[13px] text-slate-700">
        You're offline. Showing results saved {formatDistanceToNow(new Date(at), { addSuffix: true })}.
      </p>
      {onRetry && <button type="button" onClick={onRetry} className="text-[13px] font-semibold text-kb-600 shrink-0">Retry</button>}
    </div>
  );
}
