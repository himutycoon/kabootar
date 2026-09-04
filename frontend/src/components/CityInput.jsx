import { useState, useRef, useEffect } from "react";
import { MapPin, CheckCircle } from "lucide-react";
import { filterFromList, isValidCity, INDIAN_CITIES, POPULAR_CITIES_TOP } from "../lib/cities";

// Pass `cityList` to restrict suggestions/validation to a smaller set
// (e.g. an admin-configured allowed-cities list) — defaults to the full list.
export default function CityInput({ value, onChange, placeholder, className = "", cityList = null }) {
  const list = cityList && cityList.length ? cityList : INDIAN_CITIES;
  const popular = cityList && cityList.length ? cityList.slice(0, 10) : POPULAR_CITIES_TOP;
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [touched,     setTouched]     = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (val) => {
    onChange(val);
    setTouched(true);
    if (!val.trim()) {
      // Empty → show popular cities
      setSuggestions(popular);
      setOpen(true);
    } else {
      const results = filterFromList(val, list);
      setSuggestions(results);
      setOpen(results.length > 0);
    }
  };

  const handleFocus = () => {
    setTouched(true);
    if (!value) {
      setSuggestions(popular);
      setOpen(true);
    } else if (suggestions.length > 0) {
      setOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      setOpen(false);
      // If user typed something not in the list, clear it
      if (value && !isValidCity(value, list)) {
        onChange('');
        setTouched(false);
      }
    }, 180);
  };

  const pick = (city) => {
    onChange(city);
    setSuggestions([]);
    setOpen(false);
    setTouched(true);
  };

  const valid = value && isValidCity(value, list);
  const invalid = touched && value && !valid;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          className={`input-field pl-8 pr-8 transition-colors ${
            valid   ? 'border-emerald-400 bg-emerald-50/30' :
            invalid ? 'border-red-300' : ''
          }`}
          placeholder={placeholder || "Select city"}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
        />
        {valid && (
          <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
        )}
      </div>

      {invalid && (
        <p className="text-[11px] text-red-500 mt-0.5">Select a city from the list</p>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden animate-slide-down max-h-52 overflow-y-auto">
          {!value && (
            <li className="px-4 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wide bg-stone-50">
              Popular cities
            </li>
          )}
          {suggestions.map(city => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={() => pick(city)}
                className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 transition-colors"
              >
                <MapPin size={12} className="text-stone-400 shrink-0" />
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
