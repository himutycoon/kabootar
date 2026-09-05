const MAX_DATES = 60;

// Dedupe (by exact timestamp) and sort ascending — same rule the Trip model's
// pre('validate') hook re-applies on save, kept here too so routes can
// validate (length, past-dates) before ever constructing/saving the document.
function normalizeDates(rawDates) {
  const unique = [...new Set(
    (rawDates || []).map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t))
  )];
  return unique.sort((a, b) => a - b).map((t) => new Date(t));
}

module.exports = { MAX_DATES, normalizeDates };
