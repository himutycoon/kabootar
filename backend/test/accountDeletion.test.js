const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { stub, load, ROOT } = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;
const db = { users: [], trips: [], parcels: [], messages: [], notifs: [], alerts: [] };
const calls = { userDeletes: [], authDeletes: [], storageDeletes: [] };
const match = (doc, q) => Object.entries(q).every(([k, v]) => {
  if (k === '$or') return v.some(sub => match(doc, sub));
  if (k === 'reviews.from') return (doc.reviews || []).some(rv => String(rv.from) === String(v));
  if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(doc[k]);
  if (v && typeof v === 'object' && '$lte' in v) return doc[k] && doc[k] <= v.$lte;
  return String(doc[k]) === String(v);
});
const coll = (arr) => ({
  find: (q) => ({ select: () => ({ lean: async () => arr.filter(d => match(d, q)) }) }),
  deleteMany: async (q) => { for (let i = arr.length - 1; i >= 0; i--) if (match(arr[i], q)) arr.splice(i, 1); },
  updateMany: async (q, u) => { arr.filter(d => match(d, q)).forEach(d => Object.assign(d, u.$set)); },
});
stub('src/models/User.js', {
  findById: async (id) => db.users.find(u => u._id === String(id)) || null,
  find: (q) => {
    const res = db.users.filter(u => match(u, q)).map(u => ({ ...u, save: async function () { Object.assign(db.users.find(x => x._id === this._id), this); } }));
    const p = Promise.resolve(res); p.select = () => p; return p;
  },
  findByIdAndDelete: async (id) => { calls.userDeletes.push(String(id)); db.users = db.users.filter(u => u._id !== String(id)); },
});
stub('src/models/Trip.js', coll(db.trips));
stub('src/models/Parcel.js', coll(db.parcels));
stub('src/models/Message.js', coll(db.messages));
stub('src/models/AppNotification.js', coll(db.notifs));
stub('src/models/RouteAlert.js', coll(db.alerts));
const fa = require.resolve(path.join(ROOT, 'node_modules/firebase-admin'));
require.cache[fa] = { id: fa, filename: fa, loaded: true, exports: {
  apps: [1],
  auth: () => ({ deleteUser: async (uid) => calls.authDeletes.push(uid) }),
  storage: () => ({ bucket: () => ({ file: (p) => ({ delete: async () => calls.storageDeletes.push(p) }) }) }),
}};

const { purgeDueAccounts } = load('src/utils/accountDeletion.js');
const url = (p) => `https://firebasestorage.googleapis.com/v0/b/bkt/o/${encodeURIComponent(p)}?alt=media&token=t`;

test('accounts past the 3-day grace period are fully deleted', async () => {
  const now = Date.now();
  db.users.push(
    { _id: 'due', firebaseUid: 'fb-due', pendingDeletion: true, deletionRequestedAt: new Date(now - 4 * DAY), reviews: [], kycDocumentUrl: url('kyc-documents/due.jpg') },
    { _id: 'recent', firebaseUid: 'fb-recent', pendingDeletion: true, deletionRequestedAt: new Date(now - 1 * DAY), reviews: [] },
    { _id: 'normal', firebaseUid: 'fb-normal', pendingDeletion: false, reviews: [{ from: 'due', rating: 1 }, { from: 'x', rating: 5 }], rating: 3, ratingSum: 6, totalRatings: 2 },
  );
  db.trips.push({ userId: 'due' }, { userId: 'normal' });
  db.parcels.push(
    { userId: 'due', status: 'open', photos: [url('parcel-photos/p/a.jpg')] },
    { userId: 'normal', travelerId: 'due', status: 'accepted' },
    { userId: 'normal', travelerId: 'due', status: 'completed' },
  );
  db.messages.push({ senderId: 'due', receiverId: 'normal' }, { senderId: 'normal', receiverId: 'due' }, { senderId: 'normal', receiverId: 'x' });
  db.notifs.push({ userId: 'due' }, { userId: 'normal' });
  db.alerts.push({ userId: 'due' }, { userId: 'normal' });

  assert.equal(await purgeDueAccounts(), 1);
  assert.deepEqual(calls.userDeletes, ['due']);
  assert.ok(db.users.find(u => u._id === 'recent'), 'grace-period account kept');
  assert.deepEqual(calls.authDeletes, ['fb-due']);
  assert.equal(db.trips.length, 1);
  assert.equal(db.messages.length, 1);
  assert.equal(db.notifs.length, 1);
  assert.equal(db.alerts.length, 1, 'route alerts deleted');
  assert.ok(calls.storageDeletes.includes('kyc-documents/due.jpg'), 'KYC file deleted');
  assert.ok(calls.storageDeletes.includes('parcel-photos/p/a.jpg'), 'parcel photo deleted');
  const reopened = db.parcels.find(p => p.status === 'open' && p.userId === 'normal');
  assert.ok(reopened && reopened.travelerId === null, 'carried parcel re-opened');
  const normal = db.users.find(u => u._id === 'normal');
  assert.deepEqual([normal.reviews.length, normal.totalRatings, normal.rating], [1, 1, 5], 'review removed, rating recalculated');
});
