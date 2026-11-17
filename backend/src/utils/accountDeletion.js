// Permanent account deletion — what the Delete Account page promises:
// profile, trips, parcel requests, chat messages, reviews and KYC documents.
const User = require('../models/User');
const Trip = require('../models/Trip');
const Parcel = require('../models/Parcel');
const Message = require('../models/Message');
const AppNotification = require('../models/AppNotification');

const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // users can cancel by logging in within 3 days

// Delete a file stored in Firebase Storage, given its download URL (best effort)
async function deleteStorageFile(url) {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) return;
    const m = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (!m) return;
    await admin.storage().bucket(m[1]).file(decodeURIComponent(m[2])).delete({ ignoreNotFound: true });
  } catch (err) {
    console.warn('[accountDeletion] storage delete failed:', err.message);
  }
}

// Remove reviews this user wrote and recompute the affected users' ratings
async function removeReviewsBy(userId) {
  const affected = await User.find({ 'reviews.from': userId }).select('reviews');
  for (const u of affected) {
    u.reviews = u.reviews.filter(r => String(r.from) !== String(userId));
    const ratings = u.reviews.map(r => r.rating).filter(n => typeof n === 'number');
    u.totalRatings = ratings.length;
    u.ratingSum = ratings.reduce((a, b) => a + b, 0);
    u.rating = ratings.length ? parseFloat((u.ratingSum / ratings.length).toFixed(1)) : 5.0;
    await u.save();
  }
}

async function purgeUser(userId) {
  const user = await User.findById(userId);
  if (!user) return false;
  const id = user._id;

  await Promise.all([
    Trip.deleteMany({ userId: id }),
    Parcel.deleteMany({ userId: id }),
    Message.deleteMany({ $or: [{ senderId: id }, { receiverId: id }] }),
    AppNotification.deleteMany({ userId: id }),
    // Parcels this user was carrying for someone else go back to open so the sender isn't stuck
    Parcel.updateMany(
      { travelerId: id, status: { $in: ['requested', 'matched', 'accepted', 'picked', 'in_transit'] } },
      { $set: { status: 'open', travelerId: null, tripId: null, matchedTripId: null, acceptedAt: null, pickedAt: null,
                pickupOtp: null, pickupOtpExpiry: null, deliveryOtp: null, deliveryOtpExpiry: null } },
    ),
  ]);
  await removeReviewsBy(id);

  await Promise.all([
    deleteStorageFile(user.kycDocumentUrl),
    deleteStorageFile(user.kycDocumentBackUrl),
    deleteStorageFile(user.selfieUrl),
    deleteStorageFile(user.profileImage),
  ]);

  // Firebase Auth account (holds the phone number / Google identity)
  if (user.firebaseUid) {
    try {
      const admin = require('firebase-admin');
      if (admin.apps.length) await admin.auth().deleteUser(user.firebaseUid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') console.warn('[accountDeletion] auth delete failed:', err.message);
    }
  }

  await User.findByIdAndDelete(id);
  return true;
}

// Delete every account whose 3-day grace period has passed
async function purgeDueAccounts() {
  const cutoff = new Date(Date.now() - GRACE_MS);
  const due = await User.find({ pendingDeletion: true, deletionRequestedAt: { $lte: cutoff } }).select('_id');
  let n = 0;
  for (const u of due) {
    try { if (await purgeUser(u._id)) n += 1; }
    catch (err) { console.error('[accountDeletion] failed for', String(u._id), err.message); }
  }
  if (n) console.log(`[accountDeletion] permanently deleted ${n} account(s)`);
  return n;
}

module.exports = { purgeUser, purgeDueAccounts, GRACE_MS };
