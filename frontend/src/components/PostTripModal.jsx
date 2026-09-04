import { useState, Fragment } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { X, Send, Clock, Edit2, Plus, CalendarDays, Repeat, Route, Package, Compass, Check, ChevronLeft } from 'lucide-react';
import CityInput from './CityInput';
import StationSelect from './StationSelect';
import { getTripDates } from '../lib/tripDates';
import { useServiceArea } from '../context/ServiceAreaContext';

const STEPS = [
  { key: 'route',     label: 'Route',     icon: Route },
  { key: 'when',      label: 'When',      icon: CalendarDays },
  { key: 'transport', label: 'Transport', icon: Compass },
  { key: 'price',     label: 'Price',     icon: Package },
];

const TRANSPORT_MODES = ['train', 'flight', 'bus', 'car'];
const MODE_EMOJI = { train: '🚂', flight: '✈️', bus: '🚌', car: '🚗' };
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

  const switchDateMode = (k) => {
    setDateMode(k);
    if (k === 'recurring' && !recurStart) setRecurStart(today);
    setErrors(e => ({ ...e, dates: undefined }));
  };

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

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

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
    if (!form.fromCity.trim())  e.fromCity = 'Required';
    if (!form.toCity.trim())    e.toCity   = 'Required';
    setErrors(er => ({ ...er, fromCity: e.fromCity, toCity: e.toCity }));
    return !e.fromCity && !e.toCity;
  };

  const validateWhen = () => {
    const dates = resolveDates();
    const err = dates.length ? undefined : (dateMode === 'recurring' ? 'Pick at least one day of the week' : 'Required');
    setErrors(er => ({ ...er, dates: err }));
    return !err;
  };

  const validatePrice = () => {
    const e = {};
    if (!form.availableWeight || +form.availableWeight <= 0) e.availableWeight = 'Must be > 0';
    if (form.pricePerKg === '' || +form.pricePerKg < 0)      e.pricePerKg      = 'Required';
    setErrors(er => ({ ...er, availableWeight: e.availableWeight, pricePerKg: e.pricePerKg }));
    return !e.availableWeight && !e.pricePerKg;
  };

  const STEP_VALIDATORS = [validateRoute, validateWhen, () => true, validatePrice];
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
      toast.success(isEdit ? 'Trip updated!' : 'Trip posted!');
      onSuccess(data.trip);
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Failed to update' : 'Failed to post'));
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            {isEdit
              ? <Edit2 size={18} className="text-violet-500" />
              : <Send size={18} className="text-orange-500" />}
            <h2 className="font-bold text-stone-900">{isEdit ? 'Edit Trip' : 'Post a Trip'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5"><X size={18} /></button>
        </div>

        {/* ── Step progress bar ── */}
        <div className="px-5 pt-4 pb-1 flex items-center">
          {STEPS.map((s, i) => (
            <Fragment key={s.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  i < step  ? 'bg-orange-500 border-orange-500 text-white'
                  : i === step ? 'bg-white border-orange-500 text-orange-600'
                  : 'bg-white border-stone-200 text-stone-300'
                }`}>
                  {i < step ? <Check size={13} /> : <s.icon size={13} />}
                </div>
                <span className={`text-[9px] font-semibold ${i <= step ? 'text-stone-600' : 'text-stone-300'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all ${i < step ? 'bg-orange-500' : 'bg-stone-200'}`} />
              )}
            </Fragment>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4">
          {step === 0 && (
          <div className="space-y-4">
            {isRestricted && (
              <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
                Currently serving: <span className="font-semibold text-stone-700">{cityNames.join(', ')}</span>
              </p>
            )}
            <Field label="Pickup City & Station" error={errors.fromCity}>
              <StationSelect
                cityValue={form.fromCity}   stationValue={form.fromStation}
                onCityChange={v => set('fromCity', v)}
                onStationChange={v => set('fromStation', v)}
                cityPlaceholder="Delhi"    stationPlaceholder="Which station?"
                cityList={restrictedCities}
              />
            </Field>

            <Field label="Destination City" error={errors.toCity}>
              <CityInput value={form.toCity} onChange={v => set('toCity', v)} placeholder="Mumbai" cityList={restrictedCities} />
            </Field>
          </div>
          )}

          {step === 1 && (
          <div className="space-y-3">
            <SectionHeader icon={CalendarDays} label="When are you travelling?" />

            <div className="flex gap-1.5 flex-wrap">
              {[
                { k: 'single',    label: 'One date',        icon: null },
                { k: 'specific',  label: 'Pick a few dates', icon: CalendarDays },
                { k: 'recurring', label: 'Regular traveller', icon: Repeat },
              ].map(({ k, label, icon: TabIcon }) => (
                <button key={k} type="button" onClick={() => switchDateMode(k)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    dateMode === k
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-stone-500 border-stone-200 hover:border-orange-300'
                  }`}>
                  {TabIcon && <TabIcon size={11} />} {label}
                </button>
              ))}
            </div>

            {dateMode === 'single' && (
              <Field error={errors.dates}>
                <input type="date" className="input-field" min={today} value={singleDate}
                  onChange={e => { setSingleDate(e.target.value); setErrors(er => ({ ...er, dates: undefined })); }} />
              </Field>
            )}

            {dateMode === 'specific' && (
              <Field error={errors.dates} hint="Add each date you plan to travel">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="date" className="input-field flex-1" min={today} value={dateToAdd}
                      onChange={e => setDateToAdd(e.target.value)} />
                    <button type="button" onClick={addSpecificDate}
                      className="btn-secondary px-3 flex items-center gap-1 shrink-0">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {specificDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {specificDates.map(d => (
                        <span key={d} className="flex items-center gap-1 text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-100 pl-2 pr-1 py-1 rounded-lg">
                          {fmtShort(d)}
                          <button type="button" onClick={() => removeSpecificDate(d)}
                            className="w-4 h-4 rounded-full hover:bg-orange-200 flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-stone-400">
                    {specificDates.length} of up to {MAX_DATES} dates selected
                  </p>
                </div>
              </Field>
            )}

            {dateMode === 'recurring' && (
              <Field error={errors.dates} hint="For commuters & regular travellers — post once, cover weeks">
                <div className="space-y-3 bg-stone-50 border border-stone-100 rounded-2xl p-3">
                  <div>
                    <p className="text-[10px] font-semibold text-stone-500 mb-1.5">Starting from</p>
                    <input type="date" className="input-field" min={today} value={recurStart}
                      onChange={e => { setRecurStart(e.target.value); setErrors(er => ({ ...er, dates: undefined })); }} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-stone-500 mb-1.5">Repeat for the next</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {DURATIONS.map(({ days, label }) => (
                        <button key={days} type="button" onClick={() => setRecurDuration(days)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            recurDuration === days
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-stone-500 border-stone-200 hover:border-orange-300'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-stone-500 mb-1.5">On these days</p>
                    <div className="flex gap-1 flex-wrap">
                      {WEEKDAYS.map(({ i, label }) => (
                        <button key={i} type="button" onClick={() => toggleRecurDay(i)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            recurDays.has(i)
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-stone-500 border-stone-200 hover:border-orange-300'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {recurringDates.length > 0 && (
                    <div className="bg-white border border-orange-100 rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-orange-700 mb-1.5">
                        {recurringDates.length} date{recurringDates.length === 1 ? '' : 's'} will be posted
                        {recurringDates.length >= MAX_DATES && ' (capped)'}
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {recurringDates.map(d => (
                          <span key={d} className="text-[10px] font-semibold bg-orange-50 border border-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md">
                            {fmtShort(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>
            )}
          </div>
          )}

          {step === 2 && (
          <div className="space-y-4">
            <SectionHeader icon={Compass} label="Transport details" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Departure time" hint="When you leave">
                <div className="relative">
                  <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input type="time" className="input-field pl-8" value={form.departureTime}
                    onChange={e => set('departureTime', e.target.value)} />
                </div>
              </Field>
              <Field label="Expected arrival" hint="At destination">
                <div className="relative">
                  <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input type="time" className="input-field pl-8" value={form.arrivalTime}
                    onChange={e => set('arrivalTime', e.target.value)} />
                </div>
              </Field>
            </div>

            <Field label="Transport Mode">
              <div className="flex gap-2 flex-wrap">
                {TRANSPORT_MODES.map(m => (
                  <button key={m} onClick={() => set('transportMode', m)} type="button"
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all capitalize flex items-center gap-1.5 ${
                      form.transportMode === m
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'
                    }`}>
                    <span>{MODE_EMOJI[m]}</span> {m}
                  </button>
                ))}
              </div>
            </Field>

            {/* PNR / Flight number — optional but builds trust */}
            {(form.transportMode === 'train') && (
              <div className="space-y-2">
                <Field label="🎫 PNR Number (optional — builds trust)"
                  hint="Senders can verify your ticket on the official NTES site">
                  <input className="input-field tracking-widest font-mono" placeholder="e.g. 4521637890"
                    maxLength={10} inputMode="numeric"
                    value={form.pnrNumber}
                    onChange={e => set('pnrNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </Field>
                <Field label="🚂 Train Number (optional)"
                  hint="e.g. 12301 for Howrah Rajdhani">
                  <input className="input-field font-mono" placeholder="e.g. 12301"
                    maxLength={6} inputMode="numeric"
                    value={form.trainNumber}
                    onChange={e => set('trainNumber', e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </Field>
                {form.pnrNumber.length === 10 && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <span className="text-emerald-500 text-sm">✓</span>
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      Senders will see a "Verify PNR" button — builds trust instantly!
                    </p>
                  </div>
                )}
              </div>
            )}

            {form.transportMode === 'flight' && (
              <Field label="✈️ Flight Number (optional — builds trust)"
                hint="e.g. AI302 or 6E456 · senders can track on Flightradar">
                <input className="input-field font-mono uppercase" placeholder="e.g. AI302"
                  maxLength={7}
                  value={form.flightNumber}
                  onChange={e => set('flightNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0, 7))} />
              </Field>
            )}
          </div>
          )}

          {step === 3 && (
          <div className="space-y-4">
            <SectionHeader icon={Package} label="Capacity & Price" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)" error={errors.availableWeight}>
                <input className="input-field" placeholder="10" type="number" min="0.1" step="0.1"
                  value={form.availableWeight} onChange={e => set('availableWeight', e.target.value)} />
              </Field>
              <Field label="Price/kg (₹)" error={errors.pricePerKg}>
                <input className="input-field" placeholder="50" type="number" min="0"
                  value={form.pricePerKg} onChange={e => set('pricePerKg', e.target.value)} />
              </Field>
            </div>

            <Field label="Notes (optional)">
              <textarea className="input-field resize-none" rows={2}
                placeholder="Train number, PNR, any extra info…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={step === 0 ? onClose : goBack} className="btn-secondary flex-1 flex items-center justify-center gap-1">
            {step > 0 && <ChevronLeft size={15} />} {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={goNext} type="button" className="flex-1 btn-primary">Next</button>
          ) : (
            <button onClick={submit} disabled={loading}
              className={`flex-1 btn-primary ${isEdit ? 'bg-violet-600 hover:bg-violet-700' : ''}`}>
              {loading ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save Changes' : 'Post Trip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      {(label || hint) && (
        <div className="flex items-baseline gap-1.5 mb-1.5">
          {label && <label className="block text-xs font-semibold text-stone-600">{label}</label>}
          {hint && <span className="text-[10px] text-stone-400">{hint}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-black text-stone-400 uppercase tracking-wide">
      {Icon && <Icon size={11} />} {label}
    </p>
  );
}
