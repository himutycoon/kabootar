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

const ownTrip = () => ({
  _id: 't1', userId: 'owner', fromCity: 'Delhi', toCity: 'Patna', transportMode: 'train',
  dates: [day(2)], availableWeight: 5, isVerified: false, async save() { return this; },
});

test('owners cannot set internal flags or reassign a trip', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const patch = (body) => fetch(srv.url + '/trips/t1', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.status);
  trip = ownTrip();
  assert.equal(await patch({ isVerified: true, userId: 'someone', availableWeight: 3 }), 200);
  assert.deepEqual([trip.isVerified, trip.userId, trip.availableWeight], [false, 'owner', 3]);
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
