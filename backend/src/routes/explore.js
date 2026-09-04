const express = require('express');
const router  = express.Router();
const Trip    = require('../models/Trip');
const Parcel  = require('../models/Parcel');
const User    = require('../models/User');

// GET /api/explore — unified marketplace feed (no search params required)
router.get('/', async (req, res) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [trending, trips, parcels, users] = await Promise.all([
      // Trending routes
      Trip.aggregate([
        { $match: { status: 'active', dates: { $gte: startOfToday } } },
        { $group: { _id: { from: '$fromCity', to: '$toCity' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, from: '$_id.from', to: '$_id.to', count: 1 } },
      ]),
      // Recent active trips (curated feed — no search required)
      Trip.find({ status: 'active', dates: { $gte: startOfToday } })
        .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus tripsCompleted city')
        .sort({ createdAt: -1 })
        .limit(12),
      // Recent open parcels (curated feed)
      Parcel.find({ status: 'open', createdAt: { $gte: thirtyDaysAgo } })
        .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus')
        .sort({ createdAt: -1 })
        .limit(10),
      // Top verified members
      User.find({ kycStatus: 'verified', tripsCompleted: { $gt: 0 } })
        .select('name profileImage rating totalRatings tripsCompleted city')
        .sort({ rating: -1, tripsCompleted: -1 })
        .limit(8),
    ]);

    res.json({ trending, trips, parcels, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
