const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// POST /api/admin/promote
// Lets the current user become admin with ADMIN_SECRET. Disabled unless
// ADMIN_PROMOTE_ENABLED=true is set, so it can be switched on briefly to
// bootstrap an admin and then turned off. Existing admins should grant access
// with PATCH /users/:id/role instead.
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const promoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in an hour.' },
});
const secretMatches = (given) => {
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};
router.post('/promote', promoteLimiter, protect, async (req, res) => {
  try {
    if (process.env.ADMIN_PROMOTE_ENABLED !== 'true') {
      return res.status(403).json({ message: 'Self-promotion is turned off. Ask an existing admin to grant you access.' });
    }
    if (!secretMatches(req.body?.secret)) {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { role: 'admin' }, { new: true }).select('-reviews');
    res.json({ user, message: 'You are now an admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/stats — overview counts for the admin dashboard
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const Parcel = require('../models/Parcel');
    const Report = require('../models/Report');
    const ServiceCity = require('../models/ServiceCity');
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers, verifiedUsers, pendingKyc, rejectedKyc, bannedUsers, newUsers7d, adminCount,
      activeTrips, openParcels, pendingReports, launchCities,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ kycStatus: 'verified' }),
      User.countDocuments({ kycStatus: 'pending' }),
      User.countDocuments({ kycStatus: 'rejected' }),
      User.countDocuments({ banned: true }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: 'admin' }),
      Trip.countDocuments({ status: 'active', dates: { $gte: startOfToday } }),
      Parcel.countDocuments({ status: 'open' }),
      Report.countDocuments({ status: 'pending' }),
      ServiceCity.countDocuments({}),
    ]);

    // Funnel: how far people get, from sign-up to a completed delivery (from our own data)
    const Parcel_ = Parcel;
    const [profileComplete, kycSubmitted, postedTrip, postedParcel, completedDelivery, pendingTripChecks] = await Promise.all([
      User.countDocuments({ profileImage: { $nin: ['', null] }, city: { $nin: ['', null] } }),
      User.countDocuments({ kycStatus: { $in: ['pending', 'verified', 'rejected'] } }),
      Trip.distinct('userId').then(a => a.length),
      Parcel_.distinct('userId').then(a => a.length),
      Parcel_.distinct('userId', { status: 'completed' }).then(a => a.length),
      Trip.countDocuments({ isVerified: { $ne: true }, status: 'active',
        $or: [{ pnrNumber: { $ne: '' } }, { trainNumber: { $ne: '' } }, { flightNumber: { $ne: '' } }] }),
    ]);

    res.json({
      totalUsers, verifiedUsers, pendingKyc, rejectedKyc, bannedUsers, newUsers7d, adminCount,
      activeTrips, openParcels, pendingReports, launchCities, pendingTripChecks,
      funnel: { signedUp: totalUsers, profileComplete, kycSubmitted, kycVerified: verifiedUsers, postedTrip, postedParcel, completedDelivery },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/kyc — list users with pending KYC
router.get('/kyc', adminOnly, async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' })
      .select('name phone profileImage kycStatus kycDocumentUrl selfieUrl kycSubmittedAt createdAt')
      .sort({ kycSubmittedAt: 1 })
      .limit(100);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users — list all users (paginated, filterable, sortable)
const USER_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  rating: { rating: -1 },
  trips:  { tripsCompleted: -1 },
};
router.get('/users', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const { search = '', kycStatus, role, banned, sort } = req.query;

    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    if (kycStatus && kycStatus !== 'all') filter.kycStatus = kycStatus;
    if (role && role !== 'all') filter.role = role;
    if (banned === 'true')  filter.banned = true;
    if (banned === 'false') filter.banned = { $ne: true };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name phone profileImage role kycStatus kycDocumentUrl selfieUrl kycSubmittedAt kycApprovedAt kycRejectedReason rating totalRatings tripsCompleted city bio frequentRoute isPhoneVerified banned bannedReason bannedAt createdAt')
        .sort(USER_SORTS[sort] || USER_SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users/:id/activity — recent trips/parcels/reports for the detail view
router.get('/users/:id/activity', adminOnly, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const Parcel = require('../models/Parcel');
    const Report = require('../models/Report');
    const [trips, parcels, reportsAgainst] = await Promise.all([
      Trip.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(10),
      Parcel.find({ $or: [{ userId: req.params.id }, { travelerId: req.params.id }] }).sort({ createdAt: -1 }).limit(10),
      Report.find({ reportedUser: req.params.id }).sort({ createdAt: -1 }).limit(10).populate('reporter', 'name'),
    ]);
    res.json({ trips, parcels, reportsAgainst });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', adminOnly, async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ message: "You can't ban yourself" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ message: "Can't ban another admin" });

    target.banned = true;
    target.bannedReason = req.body.reason || '';
    target.bannedAt = new Date();
    await target.save();

    req.io.to(String(target._id)).emit('account_banned', { reason: target.bannedReason });
    res.json({ user: target, message: 'User banned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', adminOnly, async (req, res) => {
  try {
    const target = await User.findByIdAndUpdate(
      req.params.id,
      { banned: false, bannedReason: '', bannedAt: null },
      { new: true }
    );
    if (!target) return res.status(404).json({ message: 'User not found' });
    res.json({ user: target, message: 'User unbanned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/users/:id/role — promote/demote admin
router.patch('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (req.params.id === String(req.user._id) && role === 'user') {
      return res.status(400).json({ message: "You can't demote yourself" });
    }
    const target = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!target) return res.status(404).json({ message: 'User not found' });
    res.json({ user: target, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/kyc/:userId/approve
router.post('/kyc/:userId/approve', adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { kycStatus: 'verified', kycApprovedAt: new Date(), kycRejectedReason: '' },
      { new: true }
    ).select('-reviews');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Real-time: push updated user object directly to their socket room
    req.io.to(String(req.params.userId)).emit('kyc_approved', {
      kycStatus: 'verified',
      kycApprovedAt: user.kycApprovedAt,
    });

    // In-app notification + push (fire-and-forget)
    const { notify } = require('../utils/notifications');
    notify(req.params.userId, {
      title: '🎉 KYC Verified!',
      body: 'Your identity is verified. You can now post trips on Kabutar.',
      type: 'kyc',
      data: { screen: '/kyc', type: 'kyc' },
    }).catch(() => {});

    res.json({ user, message: 'KYC approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/kyc/:userId/reject
router.post('/kyc/:userId/reject', adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        kycStatus: 'rejected',
        kycRejectedAt: new Date(),
        kycRejectedReason: reason || 'Documents unclear or invalid',
      },
      { new: true }
    ).select('-reviews');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.io.to(String(req.params.userId)).emit('kyc_rejected', {
      kycStatus: 'rejected',
      kycRejectedReason: user.kycRejectedReason,
    });

    const { notify } = require('../utils/notifications');
    notify(req.params.userId, {
      title: '❌ KYC Not Approved',
      body: `Reason: ${user.kycRejectedReason}. Please re-upload valid documents.`,
      type: 'kyc',
      data: { screen: '/kyc', type: 'kyc' },
    }).catch(() => {});

    res.json({ user, message: 'KYC rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/reports — list user reports for review
router.get('/reports', adminOnly, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const { status = 'pending', page = 1 } = req.query;
    const limit = 20;
    const reports = await Report.find(status === 'all' ? {} : { status })
      .populate('reporter',     'name profileImage')
      .populate('reportedUser', 'name profileImage kycStatus')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Report.countDocuments(status === 'all' ? {} : { status });
    res.json({ reports, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/reports/:id — update report status
router.patch('/reports/:id', adminOnly, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/trips — moderation list, filterable by status
router.get('/trips', adminOnly, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const { status, verification } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    // Trips waiting for a ticket check: they shared PNR/train/flight details and aren't verified yet
    if (verification === 'pending') {
      filter.isVerified = { $ne: true };
      filter.$or = [{ pnrNumber: { $ne: '' } }, { trainNumber: { $ne: '' } }, { flightNumber: { $ne: '' } }];
    }
    const [trips, total] = await Promise.all([
      Trip.find(filter)
        .populate('userId', 'name phone kycStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Trip.countDocuments(filter),
    ]);
    res.json({ trips, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/trips/:id/verify — { verified: true|false } after checking ticket details
router.patch('/trips/:id/verify', adminOnly, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const verified = req.body?.verified === true;
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { isVerified: verified, verifiedAt: verified ? new Date() : null },
      { new: true }
    ).populate('userId', 'name phone kycStatus');
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (verified) {
      const { notify } = require('../utils/notifications');
      notify(trip.userId?._id, {
        title: 'Your trip is verified',
        body:  `${trip.fromCity} → ${trip.toCity} now shows a Verified trip badge to senders.`,
        type:  'trip',
        data:  { type: 'trip_verified', tripId: String(trip._id), screen: '/trips' },
      }).catch(() => {});
    }
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/trips/:id — remove a trip (spam/abuse moderation)
router.delete('/trips/:id', adminOnly, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/parcels — moderation list, filterable by status
router.get('/parcels', adminOnly, async (req, res) => {
  try {
    const Parcel = require('../models/Parcel');
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const [parcels, total] = await Promise.all([
      Parcel.find(filter)
        .populate('userId', 'name phone kycStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Parcel.countDocuments(filter),
    ]);
    res.json({ parcels, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/parcels/:id — remove a parcel request (spam/abuse moderation)
router.delete('/parcels/:id', adminOnly, async (req, res) => {
  try {
    const Parcel = require('../models/Parcel');
    const parcel = await Parcel.findByIdAndDelete(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/broadcast — push + in-app notification to a user segment
router.post('/broadcast', adminOnly, async (req, res) => {
  try {
    const { title, body, segment = 'all' } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: 'title and body required' });
    }

    const filter = segment === 'all' ? {} : { kycStatus: segment };
    const users = await User.find(filter).select('_id');
    const userIds = users.map((u) => u._id);

    if (userIds.length) {
      const AppNotification = require('../models/AppNotification');
      await AppNotification.insertMany(
        userIds.map((userId) => ({ userId, title, body, type: 'system', data: {} }))
      );
      const { sendToMany } = require('../utils/notifications');
      sendToMany(userIds, { title, body, data: { type: 'broadcast' } }).catch(() => {});
    }

    res.json({ ok: true, count: userIds.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
