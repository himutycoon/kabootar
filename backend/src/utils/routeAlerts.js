const RouteAlert = require('../models/RouteAlert');
const { notify } = require('./notifications');

const key = (city) => String(city || '').trim().toLowerCase();

// Notify everyone with a matching route alert (except the poster).
// kind: 'trips' when a trip is posted, 'parcels' when a parcel request is posted.
async function notifyRouteAlerts({ kind, fromCity, toCity, excludeUserId, title, body, data = {} }) {
  const alerts = await RouteAlert.find({ kind, fromKey: key(fromCity), toKey: key(toCity) }).select('userId').lean();
  const users = [...new Set(alerts.map(a => String(a.userId)))].filter(u => u !== String(excludeUserId));
  await Promise.all(users.map(userId =>
    notify(userId, { title, body, type: 'route_alert', data: { type: 'route_alert', ...data } }).catch(() => {})
  ));
  return users.length;
}

module.exports = { notifyRouteAlerts, routeKey: key };
