const test = require('node:test');
const assert = require('node:assert');
const { stub, load, dep, serve } = require('./helpers');

const day = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
let trip;
let parcels = [];
stub('src/models/Trip.js', { findOne: async () => trip });
stub('src/models/User.js', {});
stub('src/models/Report.js', {});
stub('src/models/Parcel.js', {
  find: () => { const q = { select: () => q, sort: () => q, lean: async () => parcels }; return q; },
});
stub('src/middleware/auth.js', {
  protect: (req, _res, next) => { req.user = { _id: 'owner' }; next(); },
  optionalAuth: (_req, _res, next) => next(),
});
stub('src/utils/blocks.js', { hiddenUserIds: async () => [] });
stub('src/utils/notifications.js', { sendToTopic: async () => {}, cityTopic: (c) => c, routeTopic: (a, b) => a + b });
stub('src/utils/serviceCities.js', { assertRouteAllowed: async () => {} });
stub('src/utils/routeAlerts.js', { notifyRouteAlerts: async () => 0 });

const express = dep('express');
const app = express();
app.use(express.json());
app.use('/trips', load('src/routes/trips.js'));
app.use('/users', load('src/routes/users.js'));

const verifiedTrip = () => ({
  _id: 't1', userId: 'owner', fromCity: 'Delhi', toCity: 'Patna', transportMode: 'train',
  pnrNumber: '1234567890', dates: [day(2)], availableWeight: 5,
  isVerified: true, verifiedAt: new Date(), async save() { return this; },
});

test('owners cannot verify their own trip; real changes clear the badge', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const patch = (body) => fetch(srv.url + '/trips/t1', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.status);

  trip = { ...verifiedTrip(), isVerified: false, verifiedAt: null };
  assert.equal(await patch({ isVerified: true, verifiedAt: new Date(), userId: 'someone' }), 200);
  assert.deepEqual([trip.isVerified, trip.userId], [false, 'owner'], 'self-verify and reassign ignored');

  trip = verifiedTrip();
  assert.equal(await patch({ availableWeight: 3, fromCity: 'delhi', dates: [day(2).toISOString()] }), 200);
  assert.equal(trip.isVerified, true, 'same route and dates keep the badge');

  await patch({ dates: [day(3).toISOString()] });
  assert.equal(trip.isVerified, false, 'new date clears the badge');

  trip = verifiedTrip();
  await patch({ pnrNumber: '9999999999' });
  assert.deepEqual([trip.isVerified, trip.verifiedAt], [false, null], 'new ticket clears the badge');
});

test('earnings count only priced, completed deliveries', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const lastYear = new Date(); lastYear.setFullYear(lastYear.getFullYear() - 1);
  parcels = [
    { _id: 'p1', fromCity: 'Delhi', toCity: 'Patna', weight: 2, offeredPrice: 300, completedAt: new Date() },
    { _id: 'p2', fromCity: 'Delhi', toCity: 'Patna', weight: 1, offeredPrice: 200, completedAt: lastYear },
    { _id: 'p3', fromCity: 'Delhi', toCity: 'Pune', weight: 1, offeredPrice: null, completedAt: new Date() },
  ];
  const body = await fetch(srv.url + '/users/me/earnings').then(r => r.json());
  assert.deepEqual([body.total, body.thisMonth, body.deliveries, body.unpriced], [500, 300, 3, 1]);
  assert.equal(body.items[2].amount, null);
});
