require('dotenv').config();
const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
// express-mongo-sanitize tries to reassign req.query which is read-only in Node 22+
// Inline sanitizer that only touches req.body (safe on all Node versions)
const stripDollarKeys = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      stripDollarKeys(obj[key]);
    }
  }
};
const mongoSanitize = () => (req, _res, next) => {
  if (req.body && typeof req.body === 'object') stripDollarKeys(req.body);
  next();
};
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { setupSocket } = require('./config/socket');

// Routes
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const parcelRoutes = require('./routes/parcels');
const matchRoutes = require('./routes/match');
const chatRoutes = require('./routes/chat');
const otpRoutes = require('./routes/otp');
const kycRoutes = require('./routes/kyc');
const userRoutes = require('./routes/users');
const adminRoutes         = require('./routes/admin');
const announcementRoutes  = require('./routes/announcements');
const appNotifRoutes      = require('./routes/appNotifications');
const exploreRoutes       = require('./routes/explore');
const postRoutes          = require('./routes/posts');
const cityRoutes          = require('./routes/cities');
const routeAlertRoutes    = require('./routes/routeAlerts');
// Ensure Report model is registered for admin queries
require('./models/Report');

const app = express();
// Render puts one proxy in front of the app; trust it so rate limits see real client IPs
app.set('trust proxy', 1);
const httpServer = createServer(app);

// Origins that are always allowed regardless of FRONTEND_URL:
// - Capacitor Android WebView now uses https://app.kabutar.in (custom hostname)
// - Legacy: http://localhost (old Capacitor default before hostname config)
// - Capacitor iOS uses capacitor://localhost or ionic://localhost
// - No origin = native mobile HTTP clients (axios from inside WebView)
const CAPACITOR_ORIGINS = [
  'https://app.kabutar.in',
  'http://localhost',
  'http://localhost:5173',
  'capacitor://localhost',
  'ionic://localhost',
];

// Production web + Android WebView (Capacitor serves the app from https://kabutar.in)
const SITE_ORIGINS = ['https://kabutar.in', 'https://www.kabutar.in'];
const extraOrigins = (process.env.FRONTEND_URL || '')
  .split(',').map(o => o.trim()).filter(o => o && o !== '*');
const ALLOWED_ORIGINS = new Set([...SITE_ORIGINS, ...CAPACITOR_ORIGINS, ...extraOrigins]);

const corsOriginFn = (origin, callback) => {
  // No Origin header: native HTTP clients, server-to-server, health checks
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
  // Any other website: no CORS headers, so browsers block the response
  callback(null, false);
};

const io = new Server(httpServer, {
  cors: { origin: corsOriginFn, methods: ['GET', 'POST'] },
});

// Connect DB
connectDB();

// Permanently delete accounts whose 3-day deletion grace period has passed.
// Runs shortly after start-up and then every 6 hours (the keep-alive ping keeps
// the Render instance awake), so deletion doesn't depend on the user returning.
const { purgeDueAccounts } = require('./utils/accountDeletion');
const runPurge = () => purgeDueAccounts().catch(err => console.error('[accountDeletion]', err.message));
setTimeout(runPurge, 60 * 1000);
setInterval(runPurge, 6 * 60 * 60 * 1000);

// ── Simple in-memory cache for expensive read-only endpoints ──────────────────
// Prevents 100 users opening the app simultaneously from firing 100 MongoDB
// aggregations. Trending/stats/explore are recalculated at most once per minute.
const _cache = new Map();
const withCache = (key, ttlMs, fn) => async (req, res) => {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return res.json(hit.data);
  try {
    const data = await fn(req);
    _cache.set(key, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Export helper so route files can use it
app._withCache = withCache;

// Eagerly initialize Firebase Admin at startup (not lazily per-request)
// Without this, notifications sent before the first /auth/verify call would silently fail
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log('🔥 Firebase Admin initialized');
  } else if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
  }
} catch (e) {
  console.error('Firebase Admin init failed:', e.message);
}

// CORS must be first so OPTIONS preflight gets Allow-Origin before rate limiters
app.use(cors({ origin: corsOriginFn }));

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Body parsing BEFORE sanitization so req.body is a plain object when sanitizer runs
app.use(express.json({ limit: '1mb' }));

// NoSQL injection prevention (runs after json() so req.body is defined)
app.use(mongoSanitize());

// General rate limit. Signed-in users (a *valid* token) get more headroom and are
// counted per user; everyone else — including requests with a fake or expired
// token — is limited per IP. (It used to skip any request that merely had an
// Authorization header, so a made-up header bypassed the limit entirely.)
const jwt = require('jsonwebtoken');
const { ipKeyGenerator } = rateLimit;
const tokenUserId = (req) => {
  if (req._rlUid !== undefined) return req._rlUid;
  const h = req.headers.authorization;
  let uid = null;
  if (h && h.startsWith('Bearer ')) {
    try { uid = String(jwt.verify(h.slice(7), process.env.JWT_SECRET).id); } catch { uid = null; }
  }
  req._rlUid = uid;
  return uid;
};
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req) => (tokenUserId(req) ? 1500 : 300),
  keyGenerator: (req) => {
    const uid = tokenUserId(req);
    return uid ? `user:${uid}` : ipKeyGenerator(req.ip);
  },
  message: { message: 'Too many requests, please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Stricter limit for authenticated users only on write-heavy routes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Slow down — too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/parcels', writeLimiter);
app.use('/api/trips', writeLimiter);

// Auth: tight on login, generous on /me reads
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts — try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/verify', authLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach io to req
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
// Any successful change to trips or parcels refreshes the shared home feed straight away
app.use(['/api/trips', '/api/parcels'], (req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => { if (res.statusCode < 400) exploreRoutes.clearExploreCache(); });
  }
  next();
});
app.use('/api/trips', tripRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', appNotifRoutes);
app.use('/api/explore',       exploreRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/cities',        cityRoutes);
app.use('/api/route-alerts',  routeAlertRoutes);

// Health check — also used as a keep-alive ping endpoint
app.get('/health', (_req, res) => {
  const admin = require('firebase-admin');
  res.json({
    status: 'ok',
    app: 'kabootar',
    ts: Date.now(),
    firebase: admin.apps.length > 0 ? 'initialized' : 'NOT initialized — check FIREBASE_SERVICE_ACCOUNT env var',
  });
});

// Self-ping every 13 min to prevent Render free tier sleep (sleeps after 15 min idle).
// Uses built-in https module — no fetch() required, works on all Node.js versions.
if (process.env.RENDER) {
  const https = require('https');
  const SELF_HOST = process.env.RENDER_EXTERNAL_HOSTNAME || 'kabootar-1.onrender.com';

  const ping = () => {
    https.get(`https://${SELF_HOST}/health`, (res) => {
      res.resume(); // drain response
    }).on('error', () => {}); // ignore errors silently
  };

  setInterval(ping, 13 * 60 * 1000); // every 13 minutes
  console.log(`🔁 Keep-alive ping active → https://${SELF_HOST}/health`);
}

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Setup socket
setupSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🕊️  Kabootar backend running on port ${PORT}`);
});
