import { createElement, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { X, Plus, ArrowLeft, TrainFront, Plane, Bus, Car, CheckCircle2, Clock } from 'lucide-react';
import CityInput from './CityInput';
import StationSelect from './StationSelect';
import { getTripDates } from '../lib/tripDates';
import { useServiceArea } from '../context/ServiceAreaContext';
import { Sheet, StepProgress, Field, Segmented } from './mobile/ui';
import { m } from './mobile/styles';

const STEPS = ['Route', 'Travel details', 'Capacity & price', 'Review'];
const TRANSPORT_MODES = [
  ['train', 'Train', TrainFront], ['flight', 'Flight', Plane], ['bus', 'Bus', Bus], ['car', 'Car', Car],
];
const today = new Date().toISOString().split('T')[0];
const toISO = (d) => d.toISOString().split('T')[0];
const fmtShort = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const WEEKDAYS = [
  { i: 1, label: 'Mon' }, { i: 2, label: 'Tue' }, { i: 3, label: 'Wed' },
  { i: 4, label: 'Thu' }, { i: 5, label: 'Fri' }, { i: 6, label: 'Sat' }, { i: 0, label: 'Sun' },
];
const DURATIONS = [
  { days: 7,  label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
];
const MAX_DATES = 60;

function addDaysISO(startISO, days) {
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + days - 1);
  return toISO(d);
}

function generateRecurringDates(start, end, weekdaySet) {
  if (!start || !end || !weekdaySet.size) return [];
  const out = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last && out.length < MAX_DATES) {
    if (weekdaySet.has(cur.getDay())) out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const fmtTime = (t) => {
  if (!t) return '';
  const [h, mi] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// Pass initialData + tripId to enter edit mode
export default function PostTripModal({ onClose, onSuccess, initialData = null, tripId = null }) {
  const isEdit = !!tripId;
  const initialDates = initialData ? getTripDates(initialData).map(toISO) : [];
  const { cityNames, isRestricted } = useServiceArea();
  const restrictedCities = isRestricted ? cityNames : null;

  const [dateMode, setDateMode] = useState(initialDates.length > 1 ? 'specific' : 'single');
  const [singleDate, setSingleDate] = useState(initialDates[0] || '');
  const [specificDates, setSpecificDates] = useState(initialDates.length > 1 ? initialDates : []);
  const [dateToAdd, setDateToAdd] = useState('');
  const [recurStart, setRecurStart] = useState(initialDates[0] || '');
  const [recurDuration, setRecurDuration] = useState(30);
  const [recurDays, setRecurDays] = useState(new Set());

  const [form, setForm] = useState({
    fromCity:        initialData?.fromCity        || '',
    fromStation:     initialData?.pickupStation   || '',
    toCity:          initialData?.toCity          || '',
    transportMode:   initialData?.transportMode   || 'train',
    departureTime:   initialData?.departureTime   || '',
    arrivalTime:     initialData?.arrivalTime     || '',
    availableWeight: initialData?.availableWeight?.toString() || '',
    pricePerKg:      initialData?.pricePerKg?.toString()      || '',
    notes:           initialData?.notes           || '',
    pnrNumber:    initialData?.pnrNumber    || '',
    flightNumber: initialData?.flightNumber || '',
    trainNumber:  initialData?.trainNumber  || '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(0);
  const [posted, setPosted]   = useState(null); // trip returned by the API after a new post

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const switchDateMode = (k) => {
    setDateMode(k);
    if (k === 'recurring' && !recurStart) setRecurStart(today);
    setErrors(e => ({ ...e, dates: undefined }));
  };

  const recurEnd = recurStart ? addDaysISO(recurStart, recurDuration) : '';
  const recurringDates = dateMode === 'recurring' ? generateRecurringDates(recurStart, recurEnd, recurDays) : [];

  const addSpecificDate = () => {
    if (!dateToAdd) return;
    if (specificDates.includes(dateToAdd)) { setDateToAdd(''); return; }
    if (specificDates.length >= MAX_DATES) { toast.error(`You can add up to ${MAX_DATES} dates`); return; }
    setSpecificDates(d => [...d, dateToAdd].sort());
    setDateToAdd('');
    setErrors(e => ({ ...e, dates: undefined }));
  };
  const removeSpecificDate = (d) => setSpecificDates(list => list.filter(x => x !== d));

  const toggleRecurDay = (i) => {
    setRecurDays(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
    setErrors(e => ({ ...e, dates: undefined }));
  };

  const resolveDates = () => {
    if (dateMode === 'single') return singleDate ? [singleDate] : [];
    if (dateMode === 'specific') return specificDates;
    return recurringDates;
  };

  const validateRoute = () => {
    const e = {};
    if (!form.fromCity.trim())  e.fromCity = 'Choose where you are starting from';
    if (!form.toCity.trim())    e.toCity   = 'Choose your destination';
    setErrors(er => ({ ...er, fromCity: e.fromCity, toCity: e.toCity }));
    return !e.fromCity && !e.toCity;
  };

  const validateWhen = () => {
    const dates = resolveDates();
    const err = dates.length ? undefined : (dateMode === 'recurring' ? 'Pick at least one day of the week' : 'Choose your travel date');
    setErrors(er => ({ ...er, dates: err }));
    return !err;
  };

  const validatePrice = () => {
    const e = {};
    if (!form.availableWeight || +form.availableWeight <= 0) e.availableWeight = 'Enter the space you can spare (more than 0 kg)';
    if (form.pricePerKg === '' || +form.pricePerKg < 0)      e.pricePerKg      = 'Enter your price per kg (0 if free)';
    setErrors(er => ({ ...er, availableWeight: e.availableWeight, pricePerKg: e.pricePerKg }));
    return !e.availableWeight && !e.pricePerKg;
  };

  const STEP_VALIDATORS = [validateRoute, validateWhen, validatePrice, () => true];
  const goNext = () => { if (STEP_VALIDATORS[step]()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    const ok = [validateRoute(), validateWhen(), validatePrice()].every(Boolean);
    if (!ok) return;
    setLoading(true);
    try {
      const payload = {
        fromCity:        form.fromCity,
        toCity:          form.toCity,
        dates:           resolveDates(),
        transportMode:   form.transportMode,
        availableWeight: +form.availableWeight,
        pricePerKg:      +form.pricePerKg,
        notes:           form.notes,
        pickupStation:   form.fromStation,
        departureTime:   form.departureTime,
        arrivalTime:     form.arrivalTime,
        pnrNumber:    form.pnrNumber.replace(/\s/g,'').toUpperCase(),
        flightNumber: form.flightNumber.replace(/\s/g,'').toUpperCase(),
        trainNumber:  form.trainNumber.replace(/\s/g,'').toUpperCase(),
      };
      const { data } = isEdit
        ? await api.patch(`/trips/${tripId}`, payload)
        : await api.post('/trips', payload);
      if (isEdit) { toast.success('Trip updated'); onSuccess(data.trip); }
      else setPosted(data.trip);
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Failed to update' : 'Failed to post'));
    } finally { setLoading(false); }
  };

  // Closing after a successful post still hands the new trip to the parent
  const close = () => (posted ? onSuccess(posted) : onClose());

  // ── Success screen ──
  if (posted) {
    return (
      <Sheet title="Trip posted" onClose={close}
        footer={<button type="button" onClick={close} className={`${m.btnPrimary} w-full`}>Done</button>}>
        <div className="text-center py-8">
          <span className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center justify-center"><CheckCircle2 size={32} /></span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">Your trip is live</h3>
          <p className="mt-1.5 text-[15px] text-slate-500">{posted.fromCity} → {posted.toCity}</p>
          <p className="mt-4 text-[13px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            Senders on this route can now find you and message you. You’ll get an alert when someone reaches out.
          </p>
        </div>
      </Sheet>
    );
  }

  const dates = resolveDates();
  const modeLabel = TRANSPORT_MODES.find(([k]) => k === form.transportMode)?.[1];

  return (
    <Sheet full title={isEdit ? 'Edit trip' : 'Post a trip'} onClose={onClose}
      headerLeft={step > 0 ? (
        <button type="button" onClick={goBack} aria-label="Previous step"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
      ) : null}
      footer={
        <div className="flex gap-3">
          {step > 0 && <button type="button" onClick={goBack} className={`${m.btnSecondary} flex-1`}>Back</button>}
          {step < STEPS.length - 1
            ? <button type="button" onClick={goNext} className={`${m.btnPrimary} flex-[2]`}>Continue</button>
            : <button type="button" onClick={submit} disabled={loading} className={`${m.btnPrimary} flex-[2]`}>
                {loading ? (isEdit ? 'Saving…' : 'Publishing…') : (isEdit ? 'Save changes' : 'Publish trip')}
              </button>}
        </div>
      }>
      <StepProgress steps={STEPS} current={step} />

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Where are you travelling?</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Senders search by these cities.</p>
            </div>
            {isRestricted && (
              <p className="text-[13px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                Kabutar currently serves: <span className="font-semibold text-slate-800">{cityNames.join(', ')}</span>
              </p>
            )}
            <Field label="Starting city and station" error={errors.fromCity}>
              <StationSelect cityValue={form.fromCity} stationValue={form.fromStation}
                onCityChange={v => set('fromCity', v)} onStationChange={v => set('fromStation', v)}
                cityPlaceholder="e.g. Delhi" stationPlaceholder="Station or area (optional)" cityList={restrictedCities} />
            </Field>
            <Field label="Destination city" error={errors.toCity}>
              <CityInput value={form.toCity} onChange={v => set('toCity', v)} placeholder="e.g. Patna" cityList={restrictedCities} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">When and how?</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Travel regularly? Add several dates in one post.</p>
            </div>
            <Segmented value={dateMode} onChange={switchDateMode}
              items={[['single', 'One date'], ['specific', 'A few dates'], ['recurring', 'Regular']]} />

            {dateMode === 'single' && (
              <Field label="Travel date" error={errors.dates}>
                <input type="date" className={m.input} min={today} value={singleDate}
                  onChange={e => { setSingleDate(e.target.value); setErrors(er => ({ ...er, dates: undefined })); }} />
              </Field>
            )}

            {dateMode === 'specific' && (
              <Field label="Travel dates" error={errors.dates} hint={`${specificDates.length} of up to ${MAX_DATES} dates added`}>
                <div className="flex gap-2">
                  <input type="date" className={`${m.input} flex-1`} min={today} value={dateToAdd} onChange={e => setDateToAdd(e.target.value)} />
                  <button type="button" onClick={addSpecificDate} className={`${m.btnSecondary} px-4`}><Plus size={16} /> Add</button>
                </div>
                {specificDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {specificDates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-kb-50 text-kb-700 text-[13px] font-semibold">
                        {fmtShort(d)}
                        <button type="button" onClick={() => removeSpecificDate(d)} aria-label={`Remove ${fmtShort(d)}`}
                          className="w-6 h-6 rounded-full flex items-center justify-center active:bg-kb-100"><X size={13} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            )}

            {dateMode === 'recurring' && (
              <div className="space-y-4 border border-slate-200 rounded-2xl p-4">
                <Field label="Starting from">
                  <input type="date" className={m.input} min={today} value={recurStart}
                    onChange={e => { setRecurStart(e.target.value); setErrors(er => ({ ...er, dates: undefined })); }} />
                </Field>
                <Field label="Repeat for">
                  <div className="flex gap-2 flex-wrap">
                    {DURATIONS.map(({ days, label }) => (
                      <button key={days} type="button" onClick={() => setRecurDuration(days)} className={m.chip(recurDuration === days)}>{label}</button>
                    ))}
                  </div>
                </Field>
                <Field label="On these days" error={errors.dates}>
                  <div className="grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map(({ i, label }) => (
                      <button key={i} type="button" onClick={() => toggleRecurDay(i)} aria-pressed={recurDays.has(i)}
                        className={`h-10 rounded-lg border text-[12px] font-semibold ${recurDays.has(i) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                {recurringDates.length > 0 && (
                  <p className="text-[13px] text-slate-600">
                    <span className="font-semibold text-slate-900">{recurringDates.length} date{recurringDates.length === 1 ? '' : 's'}</span> will be posted
                    {recurringDates.length >= MAX_DATES && ' (maximum)'}, from {fmtShort(recurringDates[0])} to {fmtShort(recurringDates[recurringDates.length - 1])}.
                  </p>
                )}
              </div>
            )}

            <Field label="How are you travelling?">
              <div className="grid grid-cols-4 gap-2">
                {TRANSPORT_MODES.map(([k, label, icon]) => (
                  <button key={k} type="button" onClick={() => set('transportMode', k)} aria-pressed={form.transportMode === k}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors ${form.transportMode === k ? 'border-kb-500 bg-kb-50 text-kb-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {createElement(icon, { size: 20 })} {label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Departs (optional)">
                <input type="time" className={m.input} value={form.departureTime} onChange={e => set('departureTime', e.target.value)} />
              </Field>
              <Field label="Arrives (optional)">
                <input type="time" className={m.input} value={form.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} />
              </Field>
            </div>

            {form.transportMode === 'train' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="PNR (optional)" hint="Helps senders trust your trip">
                  <input className={`${m.input} font-mono tracking-wider`} placeholder="10 digits" maxLength={10} inputMode="numeric"
                    value={form.pnrNumber} onChange={e => set('pnrNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </Field>
                <Field label="Train no. (optional)">
                  <input className={`${m.input} font-mono`} placeholder="e.g. 12301" maxLength={6} inputMode="numeric"
                    value={form.trainNumber} onChange={e => set('trainNumber', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </Field>
              </div>
            )}
            {form.transportMode === 'flight' && (
              <Field label="Flight number (optional)" hint="Helps senders trust your trip">
                <input className={`${m.input} font-mono uppercase`} placeholder="e.g. AI302" maxLength={7}
                  value={form.flightNumber} onChange={e => set('flightNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))} />
              </Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Space and price</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Only offer space you’re comfortable carrying.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Space available" error={errors.availableWeight}>
                <div className="relative">
                  <input className={`${m.input} pr-12`} placeholder="10" type="number" inputMode="decimal" min="0.1" step="0.1"
                    value={form.availableWeight} onChange={e => set('availableWeight', e.target.value)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">kg</span>
                </div>
              </Field>
              <Field label="Price per kg" error={errors.pricePerKg}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">₹</span>
                  <input className={`${m.input} pl-8`} placeholder="50" type="number" inputMode="numeric" min="0"
                    value={form.pricePerKg} onChange={e => set('pricePerKg', e.target.value)} />
                </div>
              </Field>
            </div>
            <Field label="Notes for senders (optional)" hint="e.g. what you can or can't carry, where you can meet">
              <textarea className={m.textarea} rows={3} placeholder="Anything senders should know"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Review your trip</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Tap a section to change it.</p>
            </div>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              <ReviewRow label="Route" onEdit={() => setStep(0)}
                value={`${form.fromCity} → ${form.toCity}`} sub={form.fromStation || undefined} />
              <ReviewRow label="Dates" onEdit={() => setStep(1)}
                value={dates.length === 1 ? fmtShort(dates[0]) : `${dates.length} dates`}
                sub={dates.length > 1 ? `${fmtShort(dates[0])} – ${fmtShort(dates[dates.length - 1])}` : undefined} />
              <ReviewRow label="Travel" onEdit={() => setStep(1)}
                value={modeLabel}
                sub={[form.departureTime && `Departs ${fmtTime(form.departureTime)}`, form.arrivalTime && `Arrives ${fmtTime(form.arrivalTime)}`,
                  form.pnrNumber && 'PNR added', form.trainNumber && `Train ${form.trainNumber}`, form.flightNumber && `Flight ${form.flightNumber}`]
                  .filter(Boolean).join(' · ') || undefined} />
              <ReviewRow label="Space & price" onEdit={() => setStep(2)}
                value={`${form.availableWeight} kg at ₹${form.pricePerKg}/kg`} sub={form.notes || undefined} />
            </div>
            {!isEdit && (
              <p className="text-[13px] text-slate-500 flex gap-2">
                <Clock size={15} className="shrink-0 mt-0.5 text-slate-400" />
                Your trip will be visible to senders searching this route until your last travel date.
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function ReviewRow({ label, value, sub, onEdit }) {
  return (
    <button type="button" onClick={onEdit} className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-slate-50 hover:bg-slate-50">
      <span className="w-24 shrink-0 text-[13px] text-slate-500 pt-0.5">{label}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-slate-900">{value}</span>
        {sub && <span className="block text-[13px] text-slate-500 mt-0.5 break-words">{sub}</span>}
      </span>
      <span className="text-[13px] font-semibold text-kb-600 pt-0.5">Edit</span>
    </button>
  );
}
