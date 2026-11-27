const test = require('node:test');
const assert = require('node:assert');
const { stub, load, dep, serve } = require('./helpers');

const alerts = [];
const notified = [];
const matches = (a, q) => Object.entries(q).every(([k, v]) => String(a[k]) === String(v));
stub('src/models/RouteAlert.js', {
  find: (q) => {
    const res = alerts.filter(a => matches(a, q));
    return { sort: () => ({ lean: async () => res }), select: () => ({ lean: async () => res }) };
  },
  findOne: async (q) => alerts.find(a => matches(a, q)) || null,
  countDocuments: async (q) => alerts.filter(a => matches(a, q)).length,
  create: async (doc) => { const a = { _id: 'a' + alerts.length, ...doc }; alerts.push(a); return a; },
  deleteOne: async (q) => {
    const i = alerts.findIndex(a => matches(a, q));
    if (i < 0) return { deletedCount: 0 };
    alerts.splice(i, 1);
    return { deletedCount: 1 };
  },
});
stub('src/middleware/auth.js', { protect: (req, _res, next) => { req.user = { _id: req.headers['x-user'] }; next(); } });
stub('src/utils/notifications.js', { notify: async (userId, n) => { notified.push({ userId, ...n }); } });
const { notifyRouteAlerts } = load('src/utils/routeAlerts.js');

const express = dep('express');
const app = express();
app.use(express.json());
app.use('/ra', load('src/routes/routeAlerts.js'));

test('route alerts: create, de-duplicate, limit, delete', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const call = async (method, url, user, body) => {
    const r = await fetch(srv.url + '/ra' + url, { method, headers: { 'content-type': 'application/json', 'x-user': user }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json() };
  };
  assert.equal((await call('POST', '/', 'u1', { kind: 'bogus', fromCity: 'Delhi', toCity: 'Patna' })).status, 400);
  assert.equal((await call('POST', '/', 'u1', { kind: 'trips', fromCity: 'Delhi', toCity: ' delhi ' })).status, 400, 'same city rejected');
  assert.equal((await call('POST', '/', 'u1', { kind: 'trips', fromCity: 'Delhi', toCity: 'Patna' })).status, 201);
  assert.equal((await call('POST', '/', 'u1', { kind: 'trips', fromCity: 'DELHI', toCity: 'patna' })).status, 200, 'duplicate returns existing');
  assert.equal(alerts.length, 1);
  for (let i = 1; i < 10; i++) await call('POST', '/', 'u1', { kind: 'parcels', fromCity: 'Delhi', toCity: 'City' + i });
  assert.equal((await call('POST', '/', 'u1', { kind: 'parcels', fromCity: 'Delhi', toCity: 'Other' })).status, 400, 'max 10');
  assert.equal((await call('GET', '/', 'u1')).body.alerts.length, 10);
  assert.equal((await call('DELETE', '/a0', 'u2')).status, 404, 'cannot delete another user alert');
  assert.equal((await call('DELETE', '/a0', 'u1')).status, 200);
});

test('matching alerts notify everyone except the poster', async () => {
  alerts.length = 0;
  alerts.push(
    { userId: 'u1', kind: 'trips', fromKey: 'delhi', toKey: 'patna' },
    { userId: 'u2', kind: 'trips', fromKey: 'delhi', toKey: 'patna' },
    { userId: 'u3', kind: 'parcels', fromKey: 'delhi', toKey: 'patna' },
    { userId: 'u4', kind: 'trips', fromKey: 'delhi', toKey: 'mumbai' },
  );
  const count = await notifyRouteAlerts({ kind: 'trips', fromCity: ' Delhi', toCity: 'PATNA', excludeUserId: 'u2', title: 'New trip', body: 'x' });
  assert.equal(count, 1);
  assert.deepEqual(notified.map(x => [x.userId, x.type]), [['u1', 'route_alert']]);
});
