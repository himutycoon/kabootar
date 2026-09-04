import { format, isSameMonth } from 'date-fns';

// A trip may carry `dates` (array, current shape) or a legacy single `date`.
// Always read through this helper so both shapes work everywhere.
export function getTripDates(trip) {
  const raw = Array.isArray(trip?.dates) && trip.dates.length
    ? trip.dates
    : (trip?.date ? [trip.date] : []);
  return raw
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d))
    .sort((a, b) => a - b);
}

export function hasUpcomingDate(trip, from = new Date()) {
  return getTripDates(trip).some((d) => d >= from);
}

// Short label for compact UI (cards, badges): "12 Sep" or "12 Sep +3"
export function formatTripDatesShort(trip) {
  const dates = getTripDates(trip);
  if (!dates.length) return '';
  if (dates.length === 1) return format(dates[0], 'dd MMM');
  return `${format(dates[0], 'dd MMM')} +${dates.length - 1}`;
}

// Fuller label: "12 Sep 2026", "12, 15, 18 Sep 2026", or "12 Sep +5 more"
export function formatTripDatesLong(trip) {
  const dates = getTripDates(trip);
  if (!dates.length) return '';
  if (dates.length === 1) return format(dates[0], 'dd MMM yyyy');
  if (dates.length <= 3 && dates.every((d) => isSameMonth(d, dates[0]))) {
    return `${dates.map((d) => format(d, 'd')).join(', ')} ${format(dates[0], 'MMM yyyy')}`;
  }
  if (dates.length <= 3) {
    return dates.map((d) => format(d, 'd MMM')).join(', ') + ` ${format(dates[0], 'yyyy')}`;
  }
  return `${format(dates[0], 'dd MMM yyyy')} +${dates.length - 1} more dates`;
}
