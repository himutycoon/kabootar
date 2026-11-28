const express = require('express');
const router  = express.Router();
const Trip    = require('../models/Trip');
const Parcel  = require('../models/Parcel');
const User    = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { hiddenUserIds } = require('../utils/blocks');

// The feed is the same for everyone apart from blocked users, so the heavy part
// (4 database queries) is computed once and shared for a short time. Blocked
// users are filtered out per viewer afterwards. Concurrent requests share one
// in-flight query instead of each hitting the database.
const TTL_MS = 30 * 1000;
const TRIPS_SHOWN = 12;
const PARCELS_SHOWN = 10;
let cache = { at: 0, data: null, pending: null };

async function buildFeed() {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [trending, trips, parcels, users] = await Promise.all([
    Trip.aggregate([
      { $match: { status: 'active', dates: { $gte: startOfToday } } },
      { $group: { _id: { from: '$fromCity', to: '$toCity' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { _id: 0, from: '$_id.from', to: '$_id.to', count: 1 } },
    ]),
    // Fetch extra so there is still a full page after hiding a viewer's blocked users
    Trip.find({ status: 'active', dates: { $gte: startOfToday } })
      .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus tripsCompleted city')
      .sort({ createdAt: -1 })
      .limit(TRIPS_SHOWN * 3),
    Parcel.find({ status: 'open', createdAt: { $gte: thirtyDaysAgo } })
      .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus')
      .sort({ createdAt: -1 })
      .limit(PARCELS_SHOWN * 3),
    User.find({ kycStatus: 'verified', tripsCompleted: { $gt: 0 } })
      .select('name profileImage rating totalRatings tripsCompleted city')
      .sort({ rating: -1, tripsCompleted: -1 })
      .limit(8),
  ]);
  // Plain JSON now (applies the models' toJSON, e.g. masked phone), cheap to reuse
  return JSON.parse(JSON.stringify({ trending, trips, parcels, users }));
}

async function getFeed() {
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!cache.pending) {
    cache.pending = buildFeed()
      .then(data => { cache = { at: Date.now(), data, pending: null }; return data; })
      .catch(err => { cache.pending = null; throw err; });
  }
  return cache.pending;
}

// Call after a trip or parcel is created/removed so the poster sees it straight away
function clearExploreCache() { cache = { at: 0, data: null, pending: null }; }

// GET /api/explore — unified marketplace feed (no search params required)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const [feed, hidden] = await Promise.all([getFeed(), hiddenUserIds(req.user)]);
    if (!hidden.length) {
      return res.json({
        ...feed,
        trips: feed.trips.slice(0, TRIPS_SHOWN),
        parcels: feed.parcels.slice(0, PARCELS_SHOWN),
      });
    }
    const hide = new Set(hidden.map(String));
    const visible = (item) => !hide.has(String(item.userId?._id || item.userId));
    res.json({
      ...feed,
      trips: feed.trips.filter(visible).slice(0, TRIPS_SHOWN),
      parcels: feed.parcels.filter(visible).slice(0, PARCELS_SHOWN),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.clearExploreCache = clearExploreCache;
