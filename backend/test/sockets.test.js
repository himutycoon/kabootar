const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { stub, load, dep } = require('./helpers');

process.env.JWT_SECRET = 'test-secret';
const A = 'aaaaaaaaaaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbbbbbbbbbb', C = 'cccccccccccccccccccccccc', BANNED = 'dddddddddddddddddddddddd';
const blocks = new Set();
const created = [];
const pushes = [];
stub('src/models/User.js', {
  findById: (id) => ({ select: () => ({ lean: async () => ([A, B, C].includes(id) ? { _id: id, banned: false, name: 'User ' + id[0] } : id === BANNED ? { _id: id, banned: true } : null) }) }),
});
stub('src/utils/blocks.js', { isBlockedBetween: async (a, b) => blocks.has(`${a}>${b}`) || blocks.has(`${b}>${a}`) });
stub('src/models/Message.js', { create: async (doc) => { const m = { _id: 'm' + created.length, timestamp: new Date(), ...doc }; created.push(m); return m; } });
stub('src/utils/notifications.js', { sendPush: async (uid, p) => { pushes.push({ uid, ...p }); } });

const jwt = dep('jsonwebtoken');
const { Server } = dep('socket.io');
const { io: ioc } = dep('socket.io-client');
const { setupSocket } = load('src/config/socket.js');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

test('sockets require login, block eavesdropping and impersonation', async (t) => {
  const server = http.createServer();
  const io = new Server(server);
  setupSocket(io);
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  t.after(() => { clients.forEach(s => s.close()); io.close(); server.close(); });
  const connect = (token) => new Promise((resolve) => {
    const s = ioc(url, { transports: ['websocket'], auth: token === undefined ? undefined : { token }, reconnection: false, forceNew: true });
    clients.push(s);
    s.on('connect', () => resolve({ s, ok: true }));
    s.on('connect_error', () => resolve({ s, ok: false }));
  });
  const tok = (id) => jwt.sign({ id }, 'test-secret');

  assert.equal((await connect(undefined)).ok, false, 'no token refused');
  assert.equal((await connect('garbage')).ok, false, 'bad token refused');
  assert.equal((await connect(tok(BANNED))).ok, false, 'banned refused');
  const a = await connect(tok(A)), b = await connect(tok(B)), c = await connect(tok(C));
  assert.ok(a.ok && b.ok && c.ok);

  const roomAB = [A, B].sort().join('_');
  const got = { a: [], b: [], c: [] };
  a.s.on('receive_message', m => got.a.push(m));
  b.s.on('receive_message', m => got.b.push(m));
  c.s.on('receive_message', m => got.c.push(m));
  c.s.emit('join_room', roomAB); a.s.emit('join_room', roomAB); b.s.emit('join_room', roomAB);
  await wait(150);

  a.s.emit('send_message', { senderId: C, receiverId: B, text: 'hi' });
  await wait(250);
  assert.equal(created.at(-1).senderId, A, 'sender from token, not payload');
  assert.equal(got.b.length, 1);
  assert.equal(got.c.length, 0, 'eavesdropper got nothing');
  assert.equal(pushes.at(-1)?.uid, B, 'receiver gets a push for live messages');

  const evts = { a: 0, c: 0 };
  a.s.on('kyc_approved', () => evts.a++); c.s.on('kyc_approved', () => evts.c++);
  io.to(A).emit('kyc_approved', {});
  await wait(150);
  assert.deepEqual(evts, { a: 1, c: 0 }, 'personal events reach only that user');

  blocks.add(`${B}>${A}`);
  const errs = [];
  a.s.on('message_error', e => errs.push(e.message));
  const before = created.length;
  a.s.emit('send_message', { receiverId: B, text: 'still there?' });
  await wait(200);
  assert.equal(created.length, before, 'blocked message not stored');
  assert.ok(errs[0]?.includes("can't message"));

  a.s.emit('send_message', { receiverId: C, text: 'hello C' });
  await wait(200);
  assert.equal(got.c.length, 1, 'direct message via personal room');
});
