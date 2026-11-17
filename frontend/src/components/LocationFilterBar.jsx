import { useState } from 'react';
import { MapPin, Clock, Globe2, X, ChevronDown, Loader } from 'lucide-react';
import CityInput from './CityInput';

const CHIPS = [
  { id: 'all',    Icon: Globe2, label: 'All Routes' },
  { id: 'nearby', Icon: MapPin, label: 'Near Me' },
  { id: 'recent', Icon: Clock,  label: 'Recent' },
];

const RANGES = [25, 50, 100, 150]; // km options

export default function LocationFilterBar({
  activeFilter,
  onFilter,
  loc,
  onDetect,
  onCityChange,
  onRangeChange,
  onClear,
  resultCount,
}) {
  const [showCityPicker, setShowCityPicker] = useState(false);

  const handleNearMe = async () => {
    if (activeFilter === 'nearby') {
      onClear();
      onFilter('all');
      return;
    }
    if (!loc.city) {
      const city = await onDetect();
      if (city) onFilter('nearby');
    } else {
      onFilter('nearby');
    }
  };

  return (
    <div className="space-y-2">

      {/* ── Filter chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {CHIPS.map(({ id, Icon, label }) => {
          const active  = activeFilter === id;
          const loading = id === 'nearby' && loc.loading;
          return (
            <button key={id}
              onClick={() => id === 'nearby' ? handleNearMe() : onFilter(id)}
              className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-semibold shrink-0 transition-colors ${
                active
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-50'
              }`}
            >
              {loading
                ? <Loader size={14} className="animate-spin" />
                : <Icon size={14} />}
              {label}
              {active && id !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* ── Near Me expanded section ── */}
      {activeFilter === 'nearby' && (
        <div className="space-y-2 animate-slide-down">

          {/* Detecting… */}
          {loc.loading && (
            <div className="flex items-center gap-2 text-xs text-stone-500 py-1">
              <Loader size={12} className="animate-spin text-orange-400" />
              Detecting your location…
            </div>
          )}

          {/* Error */}
          {!loc.loading && !loc.city && loc.error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <X size={12} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-600 flex-1">{loc.error}</span>
              <button onClick={onDetect} className="text-xs font-semibold text-orange-500 hover:underline shrink-0">Retry</button>
            </div>
          )}

          {/* Detected city pill + range selector */}
          {!loc.loading && loc.city && (
            <>
              {/* City pill */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex-1 min-w-0">
                  <MapPin size={12} className="text-orange-500 shrink-0" />
                  <span className="text-sm font-semibold text-orange-700 flex-1 truncate">{loc.city}</span>
                  <button onClick={() => setShowCityPicker(v => !v)} title="Change city"
                    className="text-orange-400 hover:text-orange-600 transition-colors shrink-0">
                    <ChevronDown size={13} className={`transition-transform ${showCityPicker ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <button onClick={() => { onClear(); onFilter('all'); setShowCityPicker(false); }}
                  className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-red-50 hover:text-red-400 transition-colors shrink-0"
                  title="Clear location filter">
                  <X size={14} />
                </button>
                {typeof resultCount === 'number' && (
                  <span className="text-[11px] text-stone-400 shrink-0">{resultCount} found</span>
                )}
              </div>

              {/* Manual city picker */}
              {showCityPicker && (
                <div className="animate-slide-down">
                  <CityInput value="" onChange={city => { onCityChange(city); setShowCityPicker(false); }}
                    placeholder="Search another city…" />
                </div>
              )}

              {/* Range selector — only shown when we have GPS coords */}
              {loc.lat && loc.lng && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Search radius</span>
                  </div>
                  <div className="flex gap-1.5">
                    {RANGES.map(km => (
                      <button key={km}
                        onClick={() => onRangeChange(km)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          (loc.rangeKm || 100) === km
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby cities list */}
              {loc.nearbyCities?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-1.5">
                    Showing routes near · {loc.nearbyCities.length} cities within {loc.rangeKm || 100} km
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {loc.nearbyCities.slice(0, 8).map(({ city, dist }) => (
                      <span key={city}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-[11px] font-medium text-stone-600">
                        {city}
                        <span className="text-stone-400 font-normal">{dist}km</span>
                      </span>
                    ))}
                    {loc.nearbyCities.length > 8 && (
                      <span className="text-[11px] text-stone-400">+{loc.nearbyCities.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* No nearby cities in DB */}
              {loc.lat && loc.lng && loc.nearbyCities?.length === 0 && (
                <p className="text-xs text-stone-400">
                  No cities in our database within {loc.rangeKm || 100} km.
                  <button onClick={() => onRangeChange(200)} className="text-orange-500 font-semibold ml-1">Try 200 km</button>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
