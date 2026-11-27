const test = require('node:test');
const assert = require('node:assert');
const { stub, load, dep, serve } = require('./helpers');

const SENDER = 'sender1', TRAVELER = 'trav1', OTHER = 'other1';
let parcel;
const notifications = [];
const makeParcel = () => ({
  _id: 'p1', userId: SENDER, travelerId: TRAVELER, status: 'accepted', fromCity: 'Delhi', toCity: 'Patna',
  pickupOtp: null, pickupOtpExpiry: null, pickupOtpAttempts: 0,
  deliveryOtp: null, deliveryOtpExpiry: null, deliveryOtpAttempts: 0,
  async save() { return this; },
});
stub('src/models/Parcel.js', { findById: async (id) => (id === 'p1' ? parcel : null) });
stub('src/middleware/auth.js', { protect: (req, _res, next) => { req.user = { _id: req.headers['x-user'] }; next(); } });
stub('src/utils/notifications.js', { notify: async (userId, n) => { notifications.push({ userId, ...n }); } });

const express = dep('express');
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.io = { to: () => ({ emit: () => {} }) }; next(); });
app.use('/otp', load('src/routes/otp.js'));

test('handover codes go to the sender, never the traveller', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const call = async (method, url, user, body) => {
    const res = await fetch(srv.url + '/otp' + url, { method, headers: { 'content-type': 'application/json', 'x-user': user }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  };
  parcel = makeParcel();

  assert.equal((await call('POST', '/pickup/generate', OTHER, { parcelId: 'p1' })).status, 403, 'only the traveller can request');

  let x = await call('POST', '/pickup/generate', TRAVELER, { parcelId: 'p1' });
  assert.equal(x.status, 200);
  assert.equal(x.body.otp, undefined, 'code not returned to the traveller');
  const code = parcel.pickupOtp;
  assert.match(code, /^\d{6}$/);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, SENDER);
  assert.ok(notifications[0].body.includes(code));

  x = await call('GET', '/pickup/active/p1', SENDER);
  assert.deepEqual([x.body.active, x.body.otp], [true, code]);
  assert.equal((await call('GET', '/pickup/active/p1', TRAVELER)).status, 403, 'traveller cannot read the code');

  const wrong = code === '111111' ? '222222' : '111111';
  for (let i = 1; i <= 4; i++) {
    x = await call('POST', '/pickup/verify', TRAVELER, { parcelId: 'p1', otp: wrong });
    assert.equal(x.status, 400);
    assert.ok(x.body.message.includes(`${5 - i} attempt`));
  }
  assert.equal((await call('POST', '/pickup/verify', TRAVELER, { parcelId: 'p1', otp: wrong })).status, 429, 'locked after 5');
  assert.equal(parcel.pickupOtp, null, 'code cancelled');

  await call('POST', '/pickup/generate', TRAVELER, { parcelId: 'p1' });
  x = await call('POST', '/pickup/verify', TRAVELER, { parcelId: 'p1', otp: parcel.pickupOtp });
  assert.equal(x.status, 200);
  assert.equal(parcel.status, 'picked');

  notifications.length = 0;
  x = await call('POST', '/delivery/generate', TRAVELER, { parcelId: 'p1' });
  assert.equal(x.body.otp, undefined);
  assert.equal(notifications[0].userId, SENDER);
  x = await call('POST', '/delivery/verify', TRAVELER, { parcelId: 'p1', otp: parcel.deliveryOtp });
  assert.equal(parcel.status, 'delivered');

  parcel = makeParcel();
  await call('POST', '/pickup/generate', TRAVELER, { parcelId: 'p1' });
  parcel.pickupOtpExpiry = new Date(Date.now() - 1000);
  assert.equal((await call('POST', '/pickup/verify', TRAVELER, { parcelId: 'p1', otp: parcel.pickupOtp })).status, 400, 'expired rejected');
  assert.equal((await call('GET', '/pickup/active/p1', SENDER)).body.active, false);
});
