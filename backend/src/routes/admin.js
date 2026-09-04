const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// POST /api/admin/promote
// Current user promotes themselves to admin using the ADMIN_SECRET env var
router.post('/promote', protect, async (req, res) => {
  try {
    const { secret } = req.body;
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role: 'admin' },
      { new: true }
    ).select('-reviews');
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

    res.json({
      totalUsers, verifiedUsers, pendingKyc, rejectedKyc, bannedUsers, newUsers7d, adminCount,
      activeTrips, openParcels, pendingReports, launchCities,
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

// POST /api/admin/purge-test-data — delete all test data, keep admin accounts
router.post('/purge-test-data', adminOnly, async (req, res) => {
  try {
    const Trip    = require('../models/Trip');
    const Parcel  = require('../models/Parcel');
    const Message = require('../models/Message');
    const Post    = require('../models/Post');
    const Report  = require('../models/Report');
    const AppNotification = require('../models/AppNotification');

    const [trips, parcels, messages, posts, reports, notifs] = await Promise.all([
      Trip.deleteMany({}),
      Parcel.deleteMany({}),
      Message.deleteMany({}),
      Post.deleteMany({}),
      Report.deleteMany({}),
      AppNotification.deleteMany({}),
    ]);

    // Delete non-admin users
    const usersDeleted = await User.deleteMany({ role: { $ne: 'admin' } });

    res.json({
      ok: true,
      deleted: {
        trips:       trips.deletedCount,
        parcels:     parcels.deletedCount,
        messages:    messages.deletedCount,
        posts:       posts.deletedCount,
        reports:     reports.deletedCount,
        notifs:      notifs.deletedCount,
        users:       usersDeleted.deletedCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
