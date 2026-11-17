// Class recipes for the mobile app (Android / phone browsers).
// Touch targets are ≥44px; colours match the desktop system (kb orange, slate ink).
export const m = {
  input: 'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-kb-500 focus:ring-4 focus:ring-kb-100',
  textarea: 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-kb-500 focus:ring-4 focus:ring-kb-100 resize-none',
  btnPrimary: 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-kb-500 active:bg-kb-600 text-white text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  btnSecondary: 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl border border-slate-200 bg-white active:bg-slate-50 text-slate-800 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  btnDanger: 'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl border border-red-200 bg-white active:bg-red-50 text-red-600 text-[15px] font-semibold transition-colors disabled:opacity-50',
  btnSmall: 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50',
  chip: (active) => `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-semibold transition-colors ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 active:bg-slate-50'}`,
  card: 'bg-white border border-slate-200 rounded-2xl',
  press: 'active:bg-slate-50 transition-colors',
};
