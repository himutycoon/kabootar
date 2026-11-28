/**
 * Kabutar Push Notification System
 *
 * Provides:
 *   sendPush(userId, payload)          — send to one user
 *   sendToMany(userIds, payload)       — send to multiple users (batched)
 *   sendToTopic(topic, payload)        — send to all subscribers of a city/route topic
 *   subscribeTokenToTopics(token, [])  — subscribe a device to topics
 *   unsubscribeTokenFromTopics(token, []) — remove topic subscriptions
 *   cityTopic(city)                    — normalize city → FCM topic name
 *
 * Topics used:
 *   city_{city}            — users interested in that city (subscribe on login)
 *   route_{from}_{to}      — users interested in a specific route
 */

const admin = require('firebase-admin');
const User  = require('../models/User');

// ── Helpers ───────────────────────────────────────────────────────────────────

function isReady() {
  return admin.apps.length > 0;
}

/** Normalize city name to a valid FCM topic: "New Delhi" → "city_new_delhi" */
function cityTopic(city) {
  return 'city_' + city.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Normalize route to topic: "Delhi", "Mumbai" → "route_delhi_mumbai" */
function routeTopic(from, to) {
  const f = from.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const t = to.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `route_${f}_${t}`;
}

// Notification text matches the app's design: no emoji in titles or bodies
function cleanText(s) {
  return String(s ?? '')
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Push-notification categories a user can switch off (Profile → Notifications).
// Security-critical notifications (KYC results, handover codes) always send.
const ESSENTIAL_TYPES = new Set(['kyc', 'pickup_code', 'delivery_code', 'account']);
function categoryFor(type) {
  if (!type || ESSENTIAL_TYPES.has(type)) return null;
  if (type === 'message') return 'messages';
  if (['route_alert', 'new_trip', 'parcel_request'].includes(type)) return 'routeAlerts';
  if (['broadcast', 'system', 'announcement'].includes(type)) return 'announcements';
  return 'parcelUpdates';
}
const allows = (user, type) => {
  const cat = categoryFor(type);
  return !cat || user?.notificationPrefs?.[cat] !== false;
};

/** Coerce all data values to strings (FCM requirement) */
function stringifyData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])
  );
}

/** Build the FCM message object with Android + web + iOS defaults */
function buildMessage({ token, topic, title, body, data = {}, screen = '/' }) {
  const msg = {
    notification: { title, body },
    data: stringifyData({ ...data, screen }),
    android: {
      priority: 'high',
      notification: {
        sound:       'default',
        channel_id:  channelId(data.type),
      },
    },
    webpush: {
      notification: {
        icon:    '/logo.png',
        badge:   '/logo.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
      },
      fcm_options: { link: `https://kabutar.in${screen}` },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };
  if (token) msg.token = token;
  if (topic) msg.topic = topic;
  return msg;
}

/** Map notification type to Android channel ID */
function channelId(type) {
  switch (type) {
    case 'message':          return 'kabutar_chat';
    case 'parcel_accepted':
    case 'parcel_request':
    case 'delivered':        return 'kabutar_parcels';
    case 'new_trip':
    case 'trip_update':      return 'kabutar_trips';
    default:                 return 'kabutar_default';
  }
}

/** Determine the deep-link screen from notification type */
function screenFor(type, data = {}) {
  switch (type) {
    case 'message':       return data.senderId ? `/chat/${data.senderId}` : '/messages';
    case 'parcel_accepted':
    case 'delivered':
    case 'parcel_request': return '/my-parcels';
    case 'new_trip':
    case 'trip_update':   return '/trips';
    default:              return '/';
  }
}

// ── Core send functions ────────────────────────────────────────────────────────

/**
 * Send a push notification to ONE user by MongoDB _id.
 */
async function sendPush(userId, { title, body, data = {} }) {
  if (!userId || !isReady()) return;
  try {
    const user = await User.findById(userId).select('fcmToken notificationPrefs');
    if (!user?.fcmToken || !allows(user, data.type)) return;

    const screen = data.screen || screenFor(data.type, data);
    await admin.messaging().send(buildMessage({ token: user.fcmToken, title: cleanText(title), body: cleanText(body), data, screen }));
  } catch (err) {
    if (isTokenError(err)) await clearToken(userId);
    // Never throw — push failures must not break request handlers
  }
}

/**
 * Send to MULTIPLE users efficiently using FCM's sendEachForMulticast (max 500/batch).
 */
async function sendToMany(userIds, { title, body, data = {} }) {
  if (!userIds?.length || !isReady()) return;
  title = cleanText(title); body = cleanText(body);
  try {
    const users = (await User.find({
      _id: { $in: userIds },
      fcmToken: { $ne: '' },
    }).select('_id fcmToken notificationPrefs')).filter(u => allows(u, data.type));

    if (!users.length) return;

    const screen  = screenFor(data.type, data);
    const tokens  = users.map(u => u.fcmToken);
    const BATCH   = 500;

    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch   = tokens.slice(i, i + BATCH);
      const message = {
        notification: { title, body },
        data:         stringifyData({ ...data, screen }),
        android:      buildMessage({ title, body, data, screen }).android,
        webpush:      buildMessage({ title, body, data, screen }).webpush,
        apns:         buildMessage({ title, body, data, screen }).apns,
        tokens:       batch,
      };
      const result = await admin.messaging().sendEachForMulticast(message);

      // Clear invalid tokens
      result.responses.forEach((r, idx) => {
        if (!r.success && isTokenError(r.error)) {
          const uid = users[i + idx]?._id;
          if (uid) clearToken(uid);
        }
      });
    }
  } catch (err) {
    console.error('[Push] sendToMany error:', err.message);
  }
}

/**
 * Send to a FCM TOPIC (city, route, etc.).
 * Subscribers to the topic receive the notification without needing their individual token.
 */
async function sendToTopic(topic, { title, body, data = {} }) {
  if (!topic || !isReady()) return;
  try {
    const screen = screenFor(data.type, data);
    await admin.messaging().send(buildMessage({ topic, title: cleanText(title), body: cleanText(body), data, screen }));
  } catch (err) {
    console.error('[Push] sendToTopic error:', topic, err.message);
  }
}

/**
 * Subscribe an FCM token to one or more topics.
 * Call after saving the token to backend so the device receives city/route broadcasts.
 */
async function subscribeTokenToTopics(token, topics = []) {
  if (!token || !topics.length || !isReady()) return;
  await Promise.all(
    topics.map(t => admin.messaging().subscribeToTopic([token], t).catch(() => {}))
  );
}

/**
 * Unsubscribe a token from topics (e.g., when user changes city).
 */
async function unsubscribeTokenFromTopics(token, topics = []) {
  if (!token || !topics.length || !isReady()) return;
  await Promise.all(
    topics.map(t => admin.messaging().unsubscribeFromTopic([token], t).catch(() => {}))
  );
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function isTokenError(err) {
  const code = err?.code || err?.errorInfo?.code || '';
  return code.includes('registration-token-not-registered') ||
         code.includes('invalid-registration-token') ||
         code.includes('invalid-argument');
}

async function clearToken(userId) {
  await User.findByIdAndUpdate(userId, { fcmToken: '' }).catch(() => {});
}

// ── In-app notification storage ───────────────────────────────────────────────

/**
 * Save a notification to the AppNotification collection (in-app inbox).
 * Also sends a push if the user has an FCM token.
 * Never throws — call fire-and-forget.
 */
async function notify(userId, { title, body = '', type = 'system', data = {} }) {
  if (!userId) return;
  try {
    const AppNotification = require('../models/AppNotification');
    title = cleanText(title); body = cleanText(body);
    await AppNotification.create({ userId, title, body, type, data });
    // data.type (e.g. pickup_code) is the more specific kind; fall back to the inbox type
    await sendPush(userId, { title, body, data: { type, ...data } });
  } catch {}
}

module.exports = {
  sendPush,
  sendToMany,
  sendToTopic,
  subscribeTokenToTopics,
  unsubscribeTokenFromTopics,
  cityTopic,
  routeTopic,
  notify,
  cleanText,
  categoryFor,
};
