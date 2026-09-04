const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { sendToTopic, cityTopic, routeTopic } = require('../utils/notifications');

// GET /api/trips/stats — live counts for the home hero
router.get('/stats', async (req, res) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [activeTrips, routes, verifiedUsers] = await Promise.all([
      Trip.countDocuments({ status: 'active', dates: { $gte: startOfToday } }),
      Trip.distinct('fromCity', { status: 'active', dates: { $gte: startOfToday } }),
      User.countDocuments({ kycStatus: 'verified' }),
    ]);
    res.json({ activeTrips, activeRoutes: routes.length, verifiedUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/trips/trending — top routes by active trip count (used on community home)
router.get('/trending', async (req, res) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const routes = await Trip.aggregate([
      { $match: { status: 'active', dates: { $gte: startOfToday } } },
      { $group: { _id: { from: '$fromCity', to: '$toCity' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, from: '$_id.from', to: '$_id.to', count: 1 } },
    ]);
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/trips — search active trips (requires from or to param; returns empty otherwise)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { from, to, date } = req.query;

    // Require at least one search param — prevents public listing dumps and spam
    if (!from && !to) return res.json({ trips: [] });

    const filter = { status: 'active' };
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    // Hide trips from users this viewer has blocked (and vice-versa)
    if (req.user?.blockedUsers?.length) {
      filter.userId = { $nin: req.user.blockedUsers };
    }

    if (from) filter.fromCity = { $regex: new RegExp(from, 'i') };
    if (to)   filter.toCity   = { $regex: new RegExp(to,   'i') };
    if (date) {
      const d    = new Date(date);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      // Matches if ANY of the trip's dates falls on the requested day
      filter.dates = { $gte: d < startOfToday ? startOfToday : d, $lt: next };
    } else {
      filter.dates = { $gte: startOfToday };
    }

    const trips = await Trip.find(filter)
      .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus tripsCompleted city createdAt')
      .sort({ dates: 1 })
      .limit(50);

    res.json({ trips });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/trips/my - My trips (all, including past — used for travel history)
router.get('/my', protect, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user._id }).sort({ dates: -1 });
    res.json({ trips });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/trips - Create trip (KYC required)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.kycStatus !== 'verified') {
      return res.status(403).json({
        message: 'KYC verification is required to post trips. Complete your KYC from Profile → KYC Verification.',
        requiresKyc: true,
      });
    }

    // Anti-spam: max 3 active future trips per user (a multi-date post still counts as 1)
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const activeCount = await Trip.countDocuments({
      userId: req.user._id, status: 'active', dates: { $gte: startOfToday },
    });
    if (activeCount >= 3) {
      return res.status(429).json({ message: 'You already have 3 upcoming trips. Complete or delete one before posting another.' });
    }

    const { fromCity, toCity, transportMode, availableWeight, pricePerKg, notes, pickupStation, dropStation, departureTime, arrivalTime, pnrNumber, flightNumber, trainNumber } = req.body;

    // Accept either a `dates` array (specific dates / generated from a recurring
    // pattern client-side) or a legacy single `date` string for older app builds.
    const rawDates = Array.isArray(req.body.dates) ? req.body.dates : (req.body.date ? [req.body.date] : []);
    const MAX_DATES = 60;
    const dates = [...new Set(
      rawDates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t))
    )].sort((a, b) => a - b).map((t) => new Date(t));

    if (!fromCity || !toCity || !dates.length || !transportMode || !availableWeight || pricePerKg === undefined) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    if (dates[0] < startOfToday) {
      return res.status(400).json({ message: 'Travel dates must be today or later' });
    }
    if (dates.length > MAX_DATES) {
      return res.status(400).json({ message: `You can add up to ${MAX_DATES} dates in a single trip post` });
    }

    const trip = await Trip.create({
      userId: req.user._id,
      fromCity,
      toCity,
      dates,
      transportMode,
      availableWeight,
      pricePerKg,
      notes,
      pickupStation:  pickupStation  || '',
      dropStation:    dropStation    || '',
      departureTime:  departureTime  || '',
      arrivalTime:    arrivalTime    || '',
      pnrNumber:    (pnrNumber    || '').replace(/\s/g, '').toUpperCase(),
      flightNumber: (flightNumber || '').replace(/\s/g, '').toUpperCase(),
      trainNumber:  (trainNumber  || '').replace(/\s/g, '').toUpperCase(),
    });

    await trip.populate('userId', 'name profileImage maskedPhone rating kycStatus tripsCompleted city');

    // Notify senders in fromCity that a new traveler is available (topic broadcast)
    const transportLabel = { train: '🚂 Train', flight: '✈️ Flight', bus: '🚌 Bus', car: '🚗 Car' };
    setImmediate(() => {
      // Notify city topic (all users interested in fromCity)
      sendToTopic(cityTopic(trip.fromCity), {
        title: `🕊️ New traveler: ${trip.fromCity} → ${trip.toCity}`,
        body:  `${req.user.name} · ${transportLabel[trip.transportMode] || ''} · ${trip.availableWeight}kg · ₹${trip.pricePerKg}/kg`,
        data:  { type: 'new_trip', tripId: String(trip._id), fromCity: trip.fromCity, toCity: trip.toCity },
      });
      // Also notify specific route topic if subscribed
      sendToTopic(routeTopic(trip.fromCity, trip.toCity), {
        title: `✈️ Traveler on your route: ${trip.fromCity} → ${trip.toCity}`,
        body:  `${req.user.name} · ${trip.availableWeight}kg available · ₹${trip.pricePerKg}/kg`,
        data:  { type: 'new_trip', tripId: String(trip._id) },
      });
    });

    res.status(201).json({ trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/trips/:id - Update trip
router.patch('/:id', protect, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Trip not found or not authorized' });

    if (Array.isArray(req.body.dates) && req.body.dates.length > 60) {
      return res.status(400).json({ message: 'You can add up to 60 dates in a single trip post' });
    }

    Object.assign(trip, req.body);
    await trip.save();
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Trip not found or not authorized' });
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
