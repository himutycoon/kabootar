import CityInput from './CityInput';
import { STATIONS } from '../lib/stations';

export default function StationSelect({
  cityValue,
  stationValue,
  onCityChange,
  onStationChange,
  cityPlaceholder = 'City',
  stationPlaceholder = 'Station / Area',
  cityList = null,
}) {
  const stations = STATIONS[cityValue] || [];

  return (
    <div className="space-y-2">
      <CityInput value={cityValue} onChange={onCityChange} placeholder={cityPlaceholder} cityList={cityList} />
      {cityValue ? (
        stations.length > 0 ? (
          <select
            className="input-field"
            value={stationValue}
            onChange={e => onStationChange(e.target.value)}
          >
            <option value="">Select station…</option>
            {stations.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input
            className="input-field"
            placeholder={stationPlaceholder}
            value={stationValue}
            onChange={e => onStationChange(e.target.value)}
          />
        )
      ) : (
        <select className="input-field text-stone-400" disabled>
          <option>Select city first</option>
        </select>
      )}
    </div>
  );
}
