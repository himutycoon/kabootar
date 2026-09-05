const express = require('express');
const router = express.Router();
const Parcel = require('../models/Parcel');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload, getFileUrl } = require('../utils/upload');
const { notify } = require('../utils/notifications');
const { assertRouteAllowed } = require('../utils/serviceCities');

// GET /api/parcels — search open parcels (requires from or to; returns empty otherwise)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { from, to, status } = req.query;

    // Require at least one search param — prevents public listing dumps
    if (!from && !to) return res.json({ parcels: [] });

    const filter = {};
    if (status) filter.status = status;
    else filter.status = 'open';

    // Hide parcels from blocked users
    if (req.user?.blockedUsers?.length) {
      filter.userId = { $nin: req.user.blockedUsers };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.createdAt = { $gte: thirtyDaysAgo };

    if (from) filter.fromCity = { $regex: new RegExp(from, 'i') };
    if (to)   filter.toCity   = { $regex: new RegExp(to,   'i') };

    const parcels = await Parcel.find(filter)
      .populate('userId', 'name profileImage maskedPhone rating totalRatings kycStatus')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ parcels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/parcels/my - My parcels (as sender OR traveler)
router.get('/my', protect, async (req, res) => {
  try {
    const parcels = await Parcel.find({
      $or: [{ userId: req.user._id }, { travelerId: req.user._id }],
    })
      .populate('userId', 'name maskedPhone rating kycStatus')
      .populate('travelerId', 'name maskedPhone rating kycStatus')
      .sort({ createdAt: -1 });
    res.json({ parcels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels - Create parcel request
router.post('/', protect, async (req, res) => {
  try {
    const { fromCity, toCity, weight, itemType, description, pickupStation, dropStation } = req.body;

    if (!fromCity || !toCity || !weight || !itemType || !description) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Anti-spam: max 5 open parcel requests per user
    const openCount = await Parcel.countDocuments({ userId: req.user._id, status: 'open' });
    if (openCount >= 5) {
      return res.status(429).json({ message: 'You already have 5 open parcel requests. Cancel one before posting another.' });
    }

    await assertRouteAllowed(fromCity, toCity);

    const parcel = await Parcel.create({
      userId: req.user._id,
      fromCity,
      toCity,
      weight,
      itemType,
      description,
      pickupStation: pickupStation || '',
      dropStation: dropStation || '',
    });

    await parcel.populate('userId', 'name profileImage maskedPhone rating kycStatus');

    // Notify travelers in fromCity that a new parcel needs carrying (topic broadcast)
    const { sendToTopic, cityTopic, routeTopic } = require('../utils/notifications');
    const itemEmoji = { documents: '📄', electronics: '📱', clothes: '👕', others: '📦' };
    setImmediate(() => {
      sendToTopic(cityTopic(fromCity), {
        title: `📦 Parcel needs a carrier: ${fromCity} → ${toCity}`,
        body:  `${itemEmoji[itemType] || '📦'} ${itemType} · ${weight}kg — earn by carrying this`,
        data:  { type: 'parcel_request', parcelId: String(parcel._id), fromCity, toCity },
      });
      sendToTopic(routeTopic(fromCity, toCity), {
        title: `📦 Parcel on your route: ${fromCity} → ${toCity}`,
        body:  `${itemEmoji[itemType] || '📦'} ${weight}kg ${itemType} needs carrying`,
        data:  { type: 'parcel_request', parcelId: String(parcel._id) },
      });
    });

    res.status(201).json({ parcel });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// GET /api/parcels/by-sender/:userId — active parcels posted by a given user (for offer linking)
router.get('/by-sender/:userId', protect, async (req, res) => {
  try {
    const parcels = await Parcel.find({
      userId: req.params.userId,
      status: { $nin: ['delivered', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ parcels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/accept — traveler accepts parcel against one of their own
// trips; optionally locks in offeredPrice. Requires tripId so we can enforce the
// trip's stated weight capacity instead of letting a traveler overbook.
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!tripId) return res.status(400).json({ message: 'Select which of your trips will carry this parcel' });

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.status !== 'open') return res.status(400).json({ message: 'Parcel is not available' });
    if (parcel.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot accept your own parcel' });
    }

    const Trip = require('../models/Trip');
    const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'active') return res.status(400).json({ message: 'That trip is no longer active' });
    if (trip.fromCity.toLowerCase() !== parcel.fromCity.toLowerCase() ||
        trip.toCity.toLowerCase()   !== parcel.toCity.toLowerCase()) {
      return res.status(400).json({ message: "That trip doesn't match this parcel's route" });
    }

    // Sum weight already committed to this trip (anything accepted-or-beyond, not cancelled)
    const [committed] = await Parcel.aggregate([
      { $match: { tripId: trip._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$weight' } } },
    ]);
    const alreadyCommitted = committed?.total || 0;
    if (alreadyCommitted + parcel.weight > trip.availableWeight) {
      const remaining = Math.max(0, trip.availableWeight - alreadyCommitted);
      return res.status(400).json({ message: `Not enough room on that trip — only ${remaining}kg left of ${trip.availableWeight}kg` });
    }

    parcel.travelerId = req.user._id;
    parcel.tripId = trip._id;
    parcel.status = 'accepted';
    parcel.acceptedAt = new Date();
    if (req.body.offeredPrice) parcel.offeredPrice = Number(req.body.offeredPrice);
    await parcel.save();
    await parcel.populate('userId', 'name maskedPhone rating');
    await parcel.populate('travelerId', 'name maskedPhone rating');

    const senderId = String(parcel.userId._id || parcel.userId);

    notify(senderId, {
      title: '🎉 Traveler accepted your parcel!',
      body:  `${req.user.name} will carry your parcel from ${parcel.fromCity} → ${parcel.toCity}`,
      type:  'parcel',
      data:  { type: 'parcel_accepted', parcelId: String(parcel._id), screen: '/my-parcels' },
    });

    // Real-time warning to sender — post is now hidden from public
    req.io.to(senderId).emit('parcel_in_progress', {
      parcelId:     String(parcel._id),
      travellerName: req.user.name,
      fromCity:     parcel.fromCity,
      toCity:       parcel.toCity,
    });

    res.json({ parcel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/cancel
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const isOwner = parcel.userId.toString() === req.user._id.toString();
    const isTraveler = parcel.travelerId?.toString() === req.user._id.toString();
    if (!isOwner && !isTraveler) return res.status(403).json({ message: 'Not authorized' });

    parcel.status = 'cancelled';
    await parcel.save();
    res.json({ parcel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/pickup-photo
router.post('/:id/pickup-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.travelerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the traveler can upload pickup photo' });
    }
    if (parcel.status !== 'accepted') {
      return res.status(400).json({ message: 'Parcel must be accepted before pickup photo' });
    }
    if (!req.file) return res.status(400).json({ message: 'Photo required' });

    parcel.pickupPhotoUrl = getFileUrl(req, req.file.filename);
    await parcel.save();
    res.json({ parcel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/delivery-photo
router.post('/:id/delivery-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.travelerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the traveler can upload delivery photo' });
    }
    if (parcel.status !== 'picked') {
      return res.status(400).json({ message: 'Parcel must be picked up before delivery photo' });
    }
    if (!req.file) return res.status(400).json({ message: 'Photo required' });

    parcel.deliveryPhotoUrl = getFileUrl(req, req.file.filename);
    await parcel.save();
    res.json({ parcel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/parcels/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    const isOwner    = parcel.userId.toString() === req.user._id.toString();
    const isTraveler = parcel.travelerId?.toString() === req.user._id.toString();
    if (!isOwner && !isTraveler) return res.status(403).json({ message: 'Not authorized' });

    if (isOwner && parcel.status === 'open') {
      // Owner can fully edit while parcel is still open (not yet accepted by anyone)
      if (req.body.fromCity || req.body.toCity) {
        await assertRouteAllowed(req.body.fromCity || parcel.fromCity, req.body.toCity || parcel.toCity);
      }
      const ownerFields = ['fromCity', 'toCity', 'weight', 'itemType', 'description', 'pickupStation', 'dropStation', 'offeredPrice'];
      for (const key of ownerFields) {
        if (req.body[key] !== undefined) parcel[key] = req.body[key];
      }
    } else {
      // Limited edits only (price negotiation, notes) when accepted or beyond
      const limitedFields = ['offeredPrice', 'description'];
      for (const key of limitedFields) {
        if (req.body[key] !== undefined) parcel[key] = req.body[key];
      }
    }
    await parcel.save();
    res.json({ parcel });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// DELETE /api/parcels/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!parcel) return res.status(404).json({ message: 'Parcel not found or not authorized' });
    res.json({ message: 'Parcel deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/parcels/:id/mark-delivered — sender directly marks delivered (no OTP needed)
router.patch('/:id/mark-delivered', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate('travelerId', 'name _id');
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the sender can mark as delivered' });
    if (['completed', 'cancelled'].includes(parcel.status))
      return res.status(400).json({ message: `Parcel is already ${parcel.status}` });

    parcel.status      = 'completed';
    parcel.deliveredAt = parcel.deliveredAt || new Date();
    parcel.completedAt = new Date();
    await parcel.save();

    const User = require('../models/User');
    await User.findByIdAndUpdate(parcel.travelerId._id, { $inc: { tripsCompleted: 1 } });

    notify(parcel.travelerId._id, {
      title: '🎊 Delivery confirmed by sender!',
      body:  `${req.user.name} confirmed delivery. Your delivery count is now updated!`,
      type:  'parcel',
      data:  { type: 'delivery_confirmed', parcelId: String(parcel._id), screen: '/my-parcels' },
    }).catch(() => {});

    req.io.to(String(parcel.travelerId._id)).emit('delivery_confirmed', {
      parcelId:   String(parcel._id),
      senderName: req.user.name,
      message:    '🎊 Sender confirmed your delivery! Count updated.',
    });

    res.json({ parcel, message: 'Marked as delivered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/confirm-receipt — sender confirms delivery → completes transaction
router.post('/:id/confirm-receipt', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate('userId',    'name')
      .populate('travelerId','name');
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });

    if (parcel.userId._id?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the sender can confirm receipt' });
    if (parcel.status !== 'delivered')
      return res.status(400).json({ message: 'Parcel must be in delivered state first' });

    parcel.status      = 'completed';
    parcel.completedAt = new Date();
    await parcel.save();

    const User = require('../models/User');
    await User.findByIdAndUpdate(parcel.travelerId._id, { $inc: { tripsCompleted: 1 } });

    // Notify traveller — their count went up
    notify(parcel.travelerId._id, {
      title: '🎊 Delivery confirmed by sender!',
      body:  `${req.user.name} confirmed receipt. Your delivery count is now updated!`,
      type:  'parcel',
      data:  { type: 'delivery_confirmed', parcelId: String(parcel._id), screen: '/my-parcels' },
    }).catch(() => {});

    // Real-time socket to traveller
    req.io.to(String(parcel.travelerId._id)).emit('delivery_confirmed', {
      parcelId:    String(parcel._id),
      senderName:  req.user.name,
      message:     '🎊 Sender confirmed your delivery! Delivery count updated.',
    });

    res.json({ parcel, message: 'Receipt confirmed. Thank you!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/parcels/:id/review — rate + review the other party, gated to a completed delivery
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (parcel.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review after the delivery is completed' });
    }

    const isSender   = parcel.userId.toString() === req.user._id.toString();
    const isTraveler = parcel.travelerId?.toString() === req.user._id.toString();
    if (!isSender && !isTraveler) return res.status(403).json({ message: 'Not part of this delivery' });
    if (isSender && parcel.senderReviewed)     return res.status(400).json({ message: 'You already reviewed this delivery' });
    if (isTraveler && parcel.travelerReviewed) return res.status(400).json({ message: 'You already reviewed this delivery' });

    const targetId = isSender ? parcel.travelerId : parcel.userId;
    if (!targetId) return res.status(400).json({ message: 'No one to review' });

    const User = require('../models/User');
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    target.reviews.push({
      from: req.user._id,
      parcelId: parcel._id,
      rating,
      comment: (comment || '').trim().slice(0, 500),
    });
    target.ratingSum += rating;
    target.totalRatings += 1;
    target.rating = parseFloat((target.ratingSum / target.totalRatings).toFixed(1));
    await target.save();

    if (isSender) parcel.senderReviewed = true; else parcel.travelerReviewed = true;
    await parcel.save();

    notify(targetId, {
      title: '⭐ New review received!',
      body:  `${req.user.name} rated you ${rating}★${comment ? ` — "${comment.slice(0, 60)}"` : ''}`,
      type:  'system',
      data:  { type: 'review', parcelId: String(parcel._id) },
    }).catch(() => {});

    res.json({ ok: true, rating: target.rating, totalRatings: target.totalRatings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
