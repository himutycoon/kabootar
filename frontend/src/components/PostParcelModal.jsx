import { createElement, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Scale, FileText, Smartphone, Shirt, Package, Ban, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { shrinkImage } from '../lib/image';
import CityInput from './CityInput';
import StationSelect from './StationSelect';
import WeightCalculator from './WeightCalculator';
import { useServiceArea } from '../context/ServiceAreaContext';
import { Sheet, StepProgress, Field, PickerInput } from './mobile/ui';
import { m } from './mobile/styles';

const STEPS = ['Route', 'Parcel', 'Weight & price', 'Review'];
const ITEM_TYPES = [
  ['documents', 'Documents', FileText], ['electronics', 'Electronics', Smartphone],
  ['clothes', 'Clothes', Shirt], ['others', 'Other', Package],
];
const MAX_PHOTOS = 3;
const todayStr = () => format(new Date(), 'yyyy-MM-dd');
const PROHIBITED_ITEMS = [
  'Cash or currency',
  'Liquids & flammable goods',
  'Drugs or narcotics',
  'Weapons or ammunition',
  'Counterfeit goods',
  'Items banned under Indian law',
];

// Pass initialData + parcelId to enter edit mode (same pattern as PostTripModal)
export default function PostParcelModal({ onClose, onSuccess, initialData = null, parcelId = null }) {
  const isEdit = !!parcelId;
  const { cityNames, isRestricted } = useServiceArea();
  const restrictedCities = isRestricted ? cityNames : null;

  const [form, setForm] = useState({
    fromCity:     initialData?.fromCity      || '',
    fromStation:  initialData?.pickupStation || '',
    toCity:       initialData?.toCity        || '',
    toStation:    initialData?.dropStation   || '',
    weight:       initialData?.weight?.toString() || '',
    itemType:     initialData?.itemType      || 'documents',
    description:  initialData?.description   || '',
    offeredPrice: initialData?.offeredPrice ? String(initialData.offeredPrice) : '',
    neededBy:     initialData?.neededBy ? format(new Date(initialData.neededBy), 'yyyy-MM-dd') : '',
  });
  // Photos already saved (edit mode) and new ones picked in this session
  const [savedPhotos, setSavedPhotos] = useState(initialData?.photos || []);
  const [newPhotos,   setNewPhotos]   = useState([]); // [{ file, url }]
  const photoInput = useRef(null);
  const previewUrls = useRef(new Set());
  useEffect(() => () => previewUrls.current.forEach(u => URL.revokeObjectURL(u)), []);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [agreed,   setAgreed]   = useState(isEdit); // skip the checkbox when editing
  const [showCalc, setShowCalc] = useState(false);
  const [step,     setStep]     = useState(0);
  const [posted,   setPosted]   = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validators = [
    () => {
      const e = {};
      if (!form.fromCity.trim()) e.fromCity = 'Choose the pickup city';
      if (!form.toCity.trim())   e.toCity   = 'Choose the delivery city';
      setErrors(er => ({ ...er, ...e })); return !Object.keys(e).length;
    },
    () => {
      const e = {};
      if (!form.description.trim()) e.description = 'Describe what you are sending';
      if (form.neededBy && form.neededBy < todayStr()) e.neededBy = 'Choose today or a later date';
      setErrors(er => ({ ...er, ...e })); return !Object.keys(e).length;
    },
    () => {
      const e = {};
      if (!form.weight || +form.weight <= 0) e.weight = 'Enter an approximate weight (more than 0 kg)';
      if (form.offeredPrice !== '' && +form.offeredPrice < 0) e.offeredPrice = 'Price can’t be negative';
      setErrors(er => ({ ...er, ...e })); return !Object.keys(e).length;
    },
    () => true,
  ];
  const goNext = () => { if (validators[step]()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    if (!validators.slice(0, 3).every(v => v())) return;
    if (!agreed) { toast.error('Please confirm your parcel has no prohibited items'); return; }
    setLoading(true);
    try {
      const payload = {
        fromCity:      form.fromCity,
        toCity:        form.toCity,
        weight:        +form.weight,
        itemType:      form.itemType,
        description:   form.description,
        pickupStation: form.fromStation,
        dropStation:   form.toStation,
        neededBy:      form.neededBy || null,
      };
      const price = form.offeredPrice === '' ? null : +form.offeredPrice;
      let parcel;
      if (isEdit) {
        ({ data: { parcel } } = await api.patch(`/parcels/${parcelId}`, { ...payload, offeredPrice: price }));
      } else {
        ({ data: { parcel } } = await api.post('/parcels', payload));
        // Create doesn't take a price; set the optional offer with the existing edit endpoint
        if (price) {
          try { ({ data: { parcel } } = await api.patch(`/parcels/${parcel._id}`, { offeredPrice: price })); }
          catch { toast('Request posted, but your price wasn’t saved — you can add it by editing the request.'); }
        }
      }
      if (newPhotos.length) {
        try {
          const fd = new FormData();
          for (const p of newPhotos) fd.append('photos', await shrinkImage(p.file));
          const { data } = await api.post(`/parcels/${parcel._id}/photos`, fd);
          parcel = { ...parcel, photos: data.parcel.photos };
        } catch (err) {
          toast.error(err.response?.data?.message || 'Request saved, but the photos didn’t upload. Add them by editing the request.');
        }
      }
      if (isEdit) { toast.success('Parcel request updated'); onSuccess(parcel); }
      else setPosted(parcel);
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Failed to update' : 'Failed to post'));
    } finally { setLoading(false); }
  };

  const close = () => (posted ? onSuccess(posted) : onClose());

  const pickPhotos = (e) => {
    const room = MAX_PHOTOS - savedPhotos.length - newPhotos.length;
    const files = [...(e.target.files || [])].filter(f => f.type.startsWith('image/')).slice(0, room);
    e.target.value = '';
    if (!files.length) return;
    const added = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    added.forEach(p => previewUrls.current.add(p.url));
    setNewPhotos(prev => [...prev, ...added]);
  };
  const removeNew = (url) => {
    URL.revokeObjectURL(url); previewUrls.current.delete(url);
    setNewPhotos(prev => prev.filter(p => p.url !== url));
  };
  const removeSaved = async (url) => {
    try {
      await api.delete(`/parcels/${parcelId}/photos`, { data: { url } });
      setSavedPhotos(prev => prev.filter(u => u !== url));
    } catch { toast.error('Couldn’t remove the photo'); }
  };
  const photoCount = savedPhotos.length + newPhotos.length;
  const itemLabel = ITEM_TYPES.find(([k]) => k === form.itemType)?.[1];

  if (posted) {
    return (
      <Sheet title="Request posted" onClose={close}
        footer={<button type="button" onClick={close} className={`${m.btnPrimary} w-full`}>Done</button>}>
        <div className="text-center py-8">
          <span className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center justify-center"><CheckCircle2 size={32} /></span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">Your request is live</h3>
          <p className="mt-1.5 text-[15px] text-slate-500">{posted.fromCity} → {posted.toCity}</p>
          <p className="mt-4 text-[13px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            Travellers on this route can now see it and message you. Track it any time in My parcels.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet full onBack={step > 0 ? goBack : undefined} title={isEdit ? 'Edit parcel request' : 'Send a parcel'} onClose={onClose}
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
            : <button type="button" onClick={submit} disabled={loading || !agreed} className={`${m.btnPrimary} flex-[2]`}>
                {loading ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save changes' : 'Post request')}
              </button>}
        </div>
      }>
      <StepProgress steps={STEPS} current={step} />

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Where is it going?</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Travellers on this route will see your request.</p>
            </div>
            {isRestricted && (
              <p className="text-[13px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                Kabutar currently serves: <span className="font-semibold text-slate-800">{cityNames.join(', ')}</span>
              </p>
            )}
            <Field label="Pickup city and station" error={errors.fromCity}>
              <StationSelect cityValue={form.fromCity} stationValue={form.fromStation}
                onCityChange={v => set('fromCity', v)} onStationChange={v => set('fromStation', v)}
                cityPlaceholder="e.g. Delhi" stationPlaceholder="Pickup point (optional)" cityList={restrictedCities} />
            </Field>
            <Field label="Delivery city" error={errors.toCity}>
              <CityInput value={form.toCity} onChange={v => set('toCity', v)} placeholder="e.g. Patna" cityList={restrictedCities} />
            </Field>
            <Field label="Drop-off point (optional)" hint="A station or area where it can be handed over">
              <input className={m.input} placeholder="e.g. Patna Junction" value={form.toStation} onChange={e => set('toStation', e.target.value)} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">What are you sending?</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Clear details help travellers decide quickly.</p>
            </div>
            <Field label="Category">
              <div className="grid grid-cols-2 gap-2">
                {ITEM_TYPES.map(([k, label, icon]) => (
                  <button key={k} type="button" onClick={() => set('itemType', k)} aria-pressed={form.itemType === k}
                    className={`h-14 rounded-xl border flex items-center gap-2.5 px-3.5 text-[14px] font-semibold transition-colors ${form.itemType === k ? 'border-kb-500 bg-kb-50 text-kb-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                    {createElement(icon, { size: 19 })} {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Description" error={errors.description} hint="Size, how it’s packed, and whether it’s fragile">
              <textarea className={m.textarea} rows={4} placeholder="e.g. Sealed envelope with two documents, A4 size"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </Field>
            <Field label={`Photos (optional, up to ${MAX_PHOTOS})`} hint="Travellers trust requests with a clear photo of the packed parcel">
              <div className="flex gap-2 flex-wrap">
                {savedPhotos.map(url => (
                  <PhotoThumb key={url} url={url} onRemove={() => removeSaved(url)} />
                ))}
                {newPhotos.map(p => (
                  <PhotoThumb key={p.url} url={p.url} onRemove={() => removeNew(p.url)} />
                ))}
                {photoCount < MAX_PHOTOS && (
                  <button type="button" onClick={() => photoInput.current?.click()}
                    className="w-20 h-20 rounded-xl border border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold active:bg-slate-50 hover:bg-slate-50">
                    <ImagePlus size={20} /> Add photo
                  </button>
                )}
              </div>
              <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={pickPhotos} />
            </Field>
            <Field label="Needed by (optional)" error={errors.neededBy} hint="The latest date it should reach the delivery city">
              <PickerInput type="date" min={todayStr()} value={form.neededBy} placeholder="Any date"
                className={m.input} onChange={e => set('neededBy', e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Weight and price</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">An estimate is fine. You’ll agree the final price in chat.</p>
            </div>
            <Field label="Approximate weight" error={errors.weight}
              hint={form.weight && +form.weight > 0 ? (+form.weight <= 5 ? 'Light parcel' : +form.weight <= 15 ? 'Medium parcel' : 'Heavy — check the traveller can carry it') : undefined}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input className={`${m.input} pr-12`} placeholder="e.g. 2.5" type="number" inputMode="decimal" min="0.1" step="0.1"
                    value={form.weight} onChange={e => set('weight', e.target.value)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">kg</span>
                </div>
                <button type="button" onClick={() => setShowCalc(true)} className={`${m.btnSecondary} px-4`}><Scale size={16} /> Estimate</button>
              </div>
            </Field>
            {showCalc && <WeightCalculator onApply={kg => set('weight', String(kg))} onClose={() => setShowCalc(false)} />}
            <Field label="Your offer (optional)" error={errors.offeredPrice} hint="What you’re willing to pay the traveller in total">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">₹</span>
                <input className={`${m.input} pl-8`} placeholder="Leave blank to discuss" type="number" inputMode="numeric" min="0"
                  value={form.offeredPrice} onChange={e => set('offeredPrice', e.target.value)} />
              </div>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Review your request</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Tap a section to change it.</p>
            </div>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              <ReviewRow label="Route" onEdit={() => setStep(0)} value={`${form.fromCity} → ${form.toCity}`}
                sub={[form.fromStation && `Pickup: ${form.fromStation}`, form.toStation && `Drop-off: ${form.toStation}`].filter(Boolean).join(' · ') || undefined} />
              <ReviewRow label="Parcel" onEdit={() => setStep(1)} value={itemLabel}
                sub={[form.description, photoCount && `${photoCount} photo${photoCount === 1 ? '' : 's'}`, form.neededBy && `Needed by ${format(new Date(form.neededBy), 'd MMM yyyy')}`].filter(Boolean).join(' · ')} />
              <ReviewRow label="Weight & price" onEdit={() => setStep(2)}
                value={`${form.weight} kg`} sub={form.offeredPrice ? `You offer ₹${form.offeredPrice}` : 'Price to be agreed in chat'} />
            </div>

            {!isEdit && (
              <div className="border border-red-200 bg-red-50/60 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-red-700"><Ban size={16} /> Never send</p>
                <ul className="mt-2 grid grid-cols-1 gap-1 text-[13px] text-red-700/90">
                  {PROHIBITED_ITEMS.map(item => <li key={item}>• {item}</li>)}
                </ul>
                <label className="flex items-start gap-3 mt-3 pt-3 border-t border-red-200/70 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#FF6B0A] h-5 w-5 shrink-0" />
                  <span className="text-[13px] text-slate-700 leading-relaxed">I confirm this parcel contains none of these items</span>
                </label>
              </div>
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

function PhotoThumb({ url, onRemove }) {
  return (
    <span className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
      <img src={url} alt="Parcel" className="w-full h-full object-cover" />
      <button type="button" onClick={onRemove} aria-label="Remove photo"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center">
        <X size={13} />
      </button>
    </span>
  );
}
