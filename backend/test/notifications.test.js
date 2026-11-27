const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { stub, load, ROOT } = require('./helpers');

const sent = [];
let user;
const fa = require.resolve(path.join(ROOT, 'node_modules/firebase-admin'));
require.cache[fa] = { id: fa, filename: fa, loaded: true, exports: {
  apps: [1],
  messaging: () => ({
    send: async (m) => sent.push(m),
    sendEachForMulticast: async (m) => { sent.push(m); return { responses: m.tokens.map(() => ({ success: true })) }; },
  }),
}};
stub('src/models/User.js', {
  findById: () => ({ select: async () => user }),
  find: () => ({ select: async () => [user] }),
});
const n = load('src/utils/notifications.js');

test('notification text never carries emoji', () => {
  assert.equal(n.cleanText('📦 Parcel picked up 🚀'), 'Parcel picked up');
  assert.equal(n.cleanText('🇮🇳 Hello 👨‍👩‍👧 there ❤️'), 'Hello there');
  assert.equal(n.cleanText('Code 1️⃣ ready'), 'Code 1 ready');
  assert.equal(n.cleanText('₹250 · Delhi → Patna'), '₹250 · Delhi → Patna', 'symbols and arrows kept');
});

test('every notification type maps to a setting, except security ones', () => {
  assert.equal(n.categoryFor('message'), 'messages');
  assert.equal(n.categoryFor('route_alert'), 'routeAlerts');
  assert.equal(n.categoryFor('broadcast'), 'announcements');
  assert.equal(n.categoryFor('parcel_accepted'), 'parcelUpdates');
  for (const t of ['kyc', 'pickup_code', 'delivery_code', 'account']) assert.equal(n.categoryFor(t), null, t);
});

test('pushes respect notification settings', async () => {
  user = { _id: 'u1', fcmToken: 'tok', notificationPrefs: { messages: false, parcelUpdates: true, routeAlerts: true, announcements: true } };
  sent.length = 0;
  await n.sendPush('u1', { title: 'New message', body: 'hi', data: { type: 'message' } });
  assert.equal(sent.length, 0, 'messages switched off');
  await n.sendPush('u1', { title: 'Your code 🔐', body: 'Code 123456', data: { type: 'pickup_code' } });
  assert.equal(sent.length, 1, 'handover codes always send');
  assert.equal(sent[0].notification.title, 'Your code');
  await n.sendPush('u1', { title: 'Accepted', body: 'x', data: { type: 'parcel_accepted', screen: '/my-parcels' } });
  assert.equal(sent.at(-1).data.screen, '/my-parcels', 'explicit screen used');

  user.notificationPrefs.announcements = false;
  sent.length = 0;
  await n.sendToMany(['u1'], { title: 'News', body: 'x', data: { type: 'broadcast' } });
  assert.equal(sent.length, 0, 'announcements switched off');
});
