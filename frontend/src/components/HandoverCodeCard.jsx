import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, Eye, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

// Sender side of a handover: shows the code the traveller asked Kabutar to send.
// The code is hidden until the sender taps "Show code", so it isn't on screen
// while the phone is face-up during the meeting.
export default function HandoverCodeCard({ parcel, type }) {
  const [state, setState]   = useState('idle'); // idle | loading | none | shown | error
  const [code, setCode]     = useState(null);
  const [mins, setMins]     = useState(0); // minutes left, computed when fetched
  const revealed = useRef(false);          // sender has asked to see the code at least once

  const load = useCallback(() => {
    revealed.current = true;
    setState('loading');
    return api.get(`/otp/${type}/active/${parcel._id}`)
      .then(r => {
        if (r.data.active) { setCode(r.data.otp); setMins(Math.max(1, Math.ceil((new Date(r.data.expiresAt) - Date.now()) / 60000))); setState('shown'); }
        else { setCode(null); setState('none'); }
      })
      .catch(() => setState('error'));
  }, [parcel._id, type]);

  // When the traveller requests a new code, refresh it if the sender is already looking
  useEffect(() => {
    const socket = getSocket();
    const onCode = (e) => {
      if (e?.parcelId === String(parcel._id) && e?.type === type && revealed.current) load();
    };
    socket.on('handover_code', onCode);
    return () => socket.off('handover_code', onCode);
  }, [parcel._id, type, load]);

  const who = type === 'pickup' ? 'the traveller when you hand over the parcel' : 'the person receiving the parcel, so they can give it to the traveller';

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <p className="text-[14px] font-semibold text-slate-900 flex items-center gap-2"><KeyRound size={16} className="text-kb-600" /> {type === 'pickup' ? 'Pickup' : 'Delivery'} code</p>
      <p className="text-[13px] text-slate-500 mt-1">When the traveller requests a code, it's sent to you. Give it to {who}.</p>

      {state === 'shown' && code ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[28px] font-semibold tracking-[0.3em] font-mono text-slate-900">{code}</span>
          <span className="text-[13px] text-slate-500">valid ~{mins} min</span>
          <button type="button" onClick={load} aria-label="Refresh code" className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-100">
            <RefreshCw size={16} />
          </button>
        </div>
      ) : state === 'none' ? (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-[13px] text-slate-600 flex-1">No active code yet. The traveller creates one when you meet.</p>
          <button type="button" onClick={load} className="h-9 px-3 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Check again</button>
        </div>
      ) : (
        <button type="button" onClick={load} disabled={state === 'loading'}
          className="mt-3 h-10 px-4 rounded-lg border border-slate-200 text-[14px] font-semibold text-slate-800 hover:bg-slate-50 active:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-60">
          <Eye size={16} /> {state === 'loading' ? 'Loading…' : state === 'error' ? 'Try again' : 'Show code'}
        </button>
      )}
    </div>
  );
}
