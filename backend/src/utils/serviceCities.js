const ServiceCity = require('../models/ServiceCity');

// If the admin hasn't configured any launch cities yet, posting is unrestricted.
// Once configured, both endpoints of a trip/parcel route must be on the list.
async function assertRouteAllowed(fromCity, toCity) {
  const allowed = await ServiceCity.find({}, 'city').lean();
  if (!allowed.length) return;

  const allowedSet = new Set(allowed.map((c) => c.city.toLowerCase()));
  const missing = [...new Set([fromCity, toCity])].filter((c) => !allowedSet.has((c || '').trim().toLowerCase()));
  if (missing.length) {
    const err = new Error(`Kabutar isn't live in ${missing.join(' / ')} yet — we're currently available in select cities. Check back soon!`);
    err.status = 403;
    throw err;
  }
}

module.exports = { assertRouteAllowed };
