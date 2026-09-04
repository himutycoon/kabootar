import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { X, Package, AlertTriangle, Edit2, Scale } from 'lucide-react';
import CityInput from './CityInput';
import StationSelect from './StationSelect';
import WeightCalculator from './WeightCalculator';
import { useServiceArea } from '../context/ServiceAreaContext';

const ITEM_TYPES = ['documents', 'electronics', 'clothes', 'others'];
const ITEM_EMOJI = { documents: '📄', electronics: '📱', clothes: '👕', others: '📦' };

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
    fromCity:    initialData?.fromCity    || '',
    fromStation: initialData?.pickupStation || '',
    toCity:      initialData?.toCity      || '',
    weight:      initialData?.weight?.toString() || '',
    itemType:    initialData?.itemType    || 'documents',
    description: initialData?.description || '',
  });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [agreed,   setAgreed]   = useState(isEdit);
  const [showCalc, setShowCalc] = useState(false); // skip checkbox in edit mode

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.fromCity.trim())    e.fromCity    = 'Required';
    if (!form.toCity.trim())      e.toCity      = 'Required';
    if (!form.weight || +form.weight <= 0) e.weight = 'Must be > 0';
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    if (!agreed) { toast.error('Please confirm the prohibited items checkbox'); return; }
    setLoading(true);
    try {
      const payload = {
        fromCity:      form.fromCity,
        toCity:        form.toCity,
        weight:        +form.weight,
        itemType:      form.itemType,
        description:   form.description,
        pickupStation: form.fromStation,
      };
      const { data } = isEdit
        ? await api.patch(`/parcels/${parcelId}`, payload)
        : await api.post('/parcels', payload);
      toast.success(isEdit ? 'Parcel request updated!' : 'Request posted!');
      onSuccess(isEdit ? data.parcel : data.parcel);
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
              : <Package size={18} className="text-blue-500" />}
            <h2 className="font-bold text-stone-900">
              {isEdit ? 'Edit Parcel Request' : 'Send a Parcel'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {isRestricted && (
            <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
              Currently serving: <span className="font-semibold text-stone-700">{cityNames.join(', ')}</span>
            </p>
          )}
          <Field label="Pickup City & Station" error={errors.fromCity}>
            <StationSelect
              cityValue={form.fromCity}    stationValue={form.fromStation}
              onCityChange={v => set('fromCity', v)}
              onStationChange={v => set('fromStation', v)}
              cityPlaceholder="Delhi"      stationPlaceholder="Which station?"
              cityList={restrictedCities}
            />
          </Field>

          <Field label="Destination City" error={errors.toCity}>
            <CityInput value={form.toCity} onChange={v => set('toCity', v)} placeholder="Mumbai" cityList={restrictedCities} />
          </Field>

          <Field label="Item Type">
            <div className="flex gap-2 flex-wrap">
              {ITEM_TYPES.map(t => (
                <button key={t} onClick={() => set('itemType', t)} type="button"
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all capitalize flex items-center gap-1.5 ${
                    form.itemType === t
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300'
                  }`}>
                  <span>{ITEM_EMOJI[t]}</span> {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Approx. Weight (kg)" error={errors.weight}>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input className="input-field flex-1" placeholder="e.g. 2.5" type="number" min="0.1" step="0.1"
                  value={form.weight} onChange={e => set('weight', e.target.value)} />
                <button type="button" onClick={() => setShowCalc(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-orange-100 whitespace-nowrap">
                  <Scale size={13} /> Estimate
                </button>
              </div>
              {form.weight && (
                <p className="text-[11px] text-stone-400 pl-1">
                  {+form.weight < 1 ? `${(+form.weight * 1000).toFixed(0)}g` : `${(+form.weight).toFixed(2)} kg`}
                  {+form.weight <= 5 ? ' · Light parcel ✓' : +form.weight <= 15 ? ' · Medium parcel' : ' · Heavy — confirm traveller can carry'}
                </p>
              )}
            </div>
          </Field>
          {showCalc && (
            <WeightCalculator
              onApply={kg => set('weight', String(kg))}
              onClose={() => setShowCalc(false)}
            />
          )}

          <Field label="Description" error={errors.description}>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Describe your item — size, fragility, any special handling…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>

          {/* Prohibited items — only shown when creating, not editing */}
          {!isEdit && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-red-600 font-semibold text-xs">
                <AlertTriangle size={14} />
                Do NOT send any of the following:
              </div>
              <ul className="space-y-0.5">
                {PROHIBITED_ITEMS.map(item => (
                  <li key={item} className="text-xs text-red-500 flex items-center gap-1.5">
                    <span>❌</span> {item}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2.5 mt-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-orange-500 h-4 w-4 shrink-0" />
                <span className="text-xs text-stone-600 leading-relaxed">
                  I confirm this parcel contains none of the above prohibited items
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={loading || !agreed}
            className={`flex-1 font-semibold px-5 py-2.5 rounded-xl transition-all text-sm text-white disabled:opacity-50 ${
              isEdit ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
            {loading ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save Changes' : 'Post Request')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
