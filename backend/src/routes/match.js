const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Parcel = require('../models/Parcel');
const { protect } = require('../middleware/auth');

// GET /api/match/parcel/:parcelId - Find matching trips for a parcel
router.get('/parcel/:parcelId', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const { fromCity, toCity, weight } = parcel;

    const now = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 30);

    const trips = await Trip.find({
      fromCity: { $regex: new RegExp(`^${fromCity}$`, 'i') },
      toCity: { $regex: new RegExp(`^${toCity}$`, 'i') },
      availableWeight: { $gte: weight },
      dates: { $gte: now, $lte: windowEnd },
      status: 'active',
    })
      .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus tripsCompleted createdAt')
      .sort({ dates: 1 })
      .limit(20);

    res.json({ trips, parcel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/match/trip/:tripId - Find matching parcels for a trip
router.get('/trip/:tripId', protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const { fromCity, toCity, availableWeight } = trip;

    // Only suggest parcels that would actually still fit — not the trip's full
    // declared capacity, which ignores parcels already accepted onto this trip
    const [committed] = await Parcel.aggregate([
      { $match: { tripId: trip._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$weight' } } },
    ]);
    const remainingWeight = Math.max(0, availableWeight - (committed?.total || 0));

    const parcels = await Parcel.find({
      fromCity: { $regex: new RegExp(`^${fromCity}$`, 'i') },
      toCity: { $regex: new RegExp(`^${toCity}$`, 'i') },
      weight: { $lte: remainingWeight },
      status: 'open',
    })
      .populate('userId', 'name maskedPhone rating totalRatings kycStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ parcels, trip, remainingWeight });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
