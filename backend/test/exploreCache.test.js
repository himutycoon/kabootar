const test = require('node:test');
const assert = require('node:assert');
const { stub, load, dep, serve } = require('./helpers');

let tripQueries = 0;
let hidden = [];
const trip = (id, owner) => ({ _id: id, userId: { _id: owner, name: owner }, toJSON() { return { _id: id, userId: { _id: owner, name: owner } }; } });
const chain = (rows) => { const c = { populate: () => c, sort: () => c, limit: () => c, select: () => c, then: (r, j) => Promise.resolve(rows).then(r, j) }; return c; };
let tripRows = [trip('t1', 'a'), trip('t2', 'blocked'), trip('t3', 'c')];
stub('src/models/Trip.js', { aggregate: async () => [], find: () => { tripQueries++; return chain(tripRows); } });
stub('src/models/Parcel.js', { find: () => chain([]) });
stub('src/models/User.js', { find: () => chain([]) });
stub('src/middleware/auth.js', { optionalAuth: (_req, _res, next) => next() });
stub('src/utils/blocks.js', { hiddenUserIds: async () => hidden });

const explore = load('src/routes/explore.js');
const app = dep('express')();
app.use('/explore', explore);

test('feed queries are shared, blocked users are hidden per viewer, edits refresh it', async (t) => {
  const srv = await serve(app);
  t.after(srv.close);
  const get = () => fetch(srv.url + '/explore').then(r => r.json());

  const results = await Promise.all([get(), get(), get(), get(), get()]);
  assert.equal(tripQueries, 1, 'five simultaneous opens, one database query');
  assert.equal(results[0].trips.length, 3);

  await get();
  assert.equal(tripQueries, 1, 'served from cache');

  hidden = ['blocked'];
  const filtered = await get();
  assert.deepEqual(filtered.trips.map(x => x._id), ['t1', 't3'], 'blocked user hidden');
  hidden = [];
  assert.equal((await get()).trips.length, 3, 'other viewers still see everything');

  tripRows = [trip('t9', 'z')];
  explore.clearExploreCache();
  assert.deepEqual((await get()).trips.map(x => x._id), ['t9'], 'fresh data after a change');
  assert.equal(tripQueries, 2);
});
