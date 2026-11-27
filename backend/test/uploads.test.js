const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { load, ROOT } = require('./helpers');

const saved = [];
const fa = require.resolve(path.join(ROOT, 'node_modules/firebase-admin'));
require.cache[fa] = { id: fa, filename: fa, loaded: true, exports: {
  apps: [1],
  storage: () => ({ bucket: (b) => ({ file: (p) => ({ save: async (buf, opts) => saved.push({ b, p, buf, opts }) }) }) }),
}};
const { storeUpload } = load('src/utils/upload.js');

test('uploads go to Firebase Storage, not the server disk', async () => {
  const url = await storeUpload({ buffer: Buffer.from('jpeg'), originalname: 'IMG 01.JPG', mimetype: 'image/jpeg' }, 'handover-photos/p1');
  assert.equal(saved[0].b, 'kabootar-9174c.firebasestorage.app');
  assert.match(saved[0].p, /^handover-photos\/p1\/\d+-[0-9a-f]{12}\.jpg$/);
  assert.equal(saved[0].opts.metadata.contentType, 'image/jpeg');
  const token = saved[0].opts.metadata.metadata.firebaseStorageDownloadTokens;
  assert.ok(url.endsWith(`token=${token}`));
  const m = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  assert.equal(decodeURIComponent(m[2]), saved[0].p, 'deletion job can resolve the file');
});
