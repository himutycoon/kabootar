// Runs the real generalLimiter block from src/index.js on a test app.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { dep, serve, ROOT } = require('./helpers');

process.env.JWT_SECRET = 'test-secret';
const src = fs.readFileSync(path.join(ROOT, 'src/index.js'), 'utf8');
const start = src.indexOf("const jwt = require('jsonwebtoken');");
const end = src.indexOf("app.use('/api/', generalLimiter);");
const block = src.slice(start, end).replace(/require\('([^']+)'\)/g, (_, m) => `__dep('${m}')`);
const generalLimiter = new Function('rateLimit', '__dep', `${block}; return generalLimiter;`)(dep('express-rate-limit'), dep);

test('fake tokens cannot bypass the rate limit; real logins get more room', async (t) => {
  assert.ok(start > 0 && end > start, 'limiter block found in index.js');
  const express = dep('express');
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api/', generalLimiter);
  app.get('/api/ping', (_req, res) => res.json({ ok: true }));
  const srv = await serve(app);
  t.after(srv.close);
  const hit = (headers) => fetch(srv.url + '/api/ping', { headers }).then(r => ({ status: r.status, limit: r.headers.get('ratelimit-limit') || r.headers.get('ratelimit-policy') }));

  let r = await hit({ Authorization: 'Bearer fake', 'X-Forwarded-For': '1.1.1.1' });
  assert.ok(String(r.limit).startsWith('300'));
  for (let i = 0; i < 299; i++) await hit({ Authorization: 'Bearer junk' + i, 'X-Forwarded-For': '1.1.1.1' });
  assert.equal((await hit({ Authorization: 'Bearer more', 'X-Forwarded-For': '1.1.1.1' })).status, 429);

  const good = dep('jsonwebtoken').sign({ id: 'user123' }, 'test-secret');
  r = await hit({ Authorization: `Bearer ${good}`, 'X-Forwarded-For': '1.1.1.1' });
  assert.equal(r.status, 200);
  assert.ok(String(r.limit).startsWith('1500'));
  assert.equal((await hit({ 'X-Forwarded-For': '2.2.2.2' })).status, 200);
});
