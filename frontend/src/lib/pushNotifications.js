import { Capacitor } from '@capacitor/core';
import api from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Guard: prevent duplicate listener registration if called multiple times
let androidPushInitialised = false;

export async function initPushNotifications(userId) {
  if (!userId) return;
  try {
    if (Capacitor.isNativePlatform()) {
      await initAndroidPush();
    } else {
      await initWebPush();
    }
  } catch (err) {
    console.warn('[Push] init failed:', err.message);
  }
}

// ── Android ───────────────────────────────────────────────────────────────────

async function initAndroidPush() {
  if (androidPushInitialised) return; // prevent duplicate listeners
  androidPushInitialised = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    console.warn('[Push] Permission denied');
    androidPushInitialised = false; // allow retry if user grants later
    return;
  }

  // ── Add ALL listeners BEFORE calling register() ──────────────────────────
  // This prevents the race condition where the token arrives before the listener is set

  await PushNotifications.addListener('registration', async ({ value: token }) => {
    console.log('[Push] FCM token received, saving…');
    await saveFcmToken(token);
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err);
    androidPushInitialised = false; // allow retry
  });

  // App is OPEN — show as in-app toast
  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    showForegroundToast(
      notification.title,
      notification.body,
      notification.data || {}
    );
  });

  // User tapped notification (app in background/killed)
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    navigateFromData(notification.data || {});
  });

  // Now register — token event will fire to the already-attached listener
  await PushNotifications.register();
}

// ── Web ───────────────────────────────────────────────────────────────────────

async function initWebPush() {
  if (!VAPID_KEY) { console.warn('[Push] VITE_FIREBASE_VAPID_KEY not set'); return; }
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  const reg = await navigator.serviceWorker
    .register('/firebase-messaging-sw.js', { scope: '/' })
    .catch(() => null);
  if (!reg) return;

  const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
  const { default: firebaseApp }              = await import('./firebase');

  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: reg,
  }).catch(() => null);

  if (token) await saveFcmToken(token);

  // Foreground message (tab open)
  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    if (title) showForegroundToast(title, body, payload.data || {});
  });
}

// ── Topic helpers ─────────────────────────────────────────────────────────────

export async function subscribeToRoute(fromCity, toCity) {
  try {
    await api.post('/auth/me/fcm-subscribe', { topics: [routeTopic(fromCity, toCity)] });
  } catch {}
}

export async function unsubscribeFromRoute(fromCity, toCity) {
  try {
    await api.post('/auth/me/fcm-unsubscribe', { topics: [routeTopic(fromCity, toCity)] });
  } catch {}
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function saveFcmToken(token) {
  try {
    await api.patch('/auth/me/fcm-token', { token });
    console.log('[Push] Token saved to backend');
  } catch (err) {
    console.warn('[Push] Failed to save token:', err.message);
  }
}

function routeTopic(from, to) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `route_${clean(from)}_${clean(to)}`;
}

function showForegroundToast(title, body, data = {}) {
  const icon = notifIcon(data.type);
  const msg  = body ? `${icon} ${title}\n${body}` : `${icon} ${title}`;

  import('react-hot-toast').then(({ default: toast }) => {
    const id = toast(msg, {
      duration: 6000,
      style: { cursor: 'pointer', whiteSpace: 'pre-line' },
    });
    // Clicking dismisses and navigates — polyfill via pointer events on the toast container
    const el = document.querySelector(`[data-toast-id="${id}"]`);
    if (el) el.addEventListener('click', () => { toast.dismiss(id); navigateFromData(data); }, { once: true });
  });
}

function notifIcon(type) {
  const icons = {
    message:         '💬',
    parcel_accepted: '🎉',
    parcel_request:  '📦',
    new_trip:        '✈️',
    delivered:       '✅',
    kyc:             '🛡️',
    delivery_confirmed: '🎊',
    system:          '🕊️',
  };
  return icons[type] || '🕊️';
}

// The router registers itself here so a tapped notification opens the screen
// inside the running app instead of reloading the page.
let routerNavigate = null;
let pendingScreen = null;
export function setPushNavigator(fn) {
  routerNavigate = fn;
  if (fn && pendingScreen) { const s = pendingScreen; pendingScreen = null; fn(s); }
}

function navigateFromData(data = {}) {
  const screen = data.screen || screenFor(data.type, data);
  if (!screen) return;
  if (routerNavigate) routerNavigate(screen);
  else pendingScreen = screen; // cold start: opened as soon as the router is ready
}

function screenFor(type, data = {}) {
  switch (type) {
    case 'message':              return data.senderId ? `/chat/${data.senderId}` : '/messages';
    case 'parcel_accepted':
    case 'delivered':
    case 'parcel_request':
    case 'delivery_confirmed':
    case 'awaiting_confirmation': return '/my-parcels';
    case 'new_trip':             return '/trips';
    case 'kyc':                  return '/kyc';
    default:                     return '/notifications';
  }
}
