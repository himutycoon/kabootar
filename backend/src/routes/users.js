const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Parcel  = require('../models/Parcel');
const Report  = require('../models/Report');
const { protect } = require('../middleware/auth');

// GET /api/users/:id — public traveler profile
// GET /api/users/me/earnings — deliveries completed as a traveller, with agreed prices
router.get('/me/earnings', protect, async (req, res) => {
  try {
    const Parcel = require('../models/Parcel');
    const parcels = await Parcel.find({ travelerId: req.user._id, status: 'completed' })
      .select('fromCity toCity weight offeredPrice completedAt')
      .sort({ completedAt: -1 })
      .lean();
    const priced = parcels.filter(p => typeof p.offeredPrice === 'number' && p.offeredPrice > 0);
    const total = priced.reduce((sum, p) => sum + p.offeredPrice, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = priced.filter(p => p.completedAt && new Date(p.completedAt) >= startOfMonth)
      .reduce((sum, p) => sum + p.offeredPrice, 0);
    res.json({
      total, thisMonth,
      deliveries: parcels.length,
      unpriced: parcels.length - priced.length, // completed without a price agreed in Kabutar
      items: parcels.slice(0, 50).map(p => ({
        _id: p._id, fromCity: p.fromCity, toCity: p.toCity, weight: p.weight,
        amount: p.offeredPrice || null, completedAt: p.completedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name profileImage rating totalRatings kycStatus tripsCompleted createdAt reviews')
      .populate('reviews.from', 'name profileImage')
      .lean({ virtuals: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Completed, not just handed-off-but-unconfirmed
    const deliveredCount = await Parcel.countDocuments({
      travelerId: req.params.id,
      status: 'completed',
    });

    const reviews = (user.reviews || [])
      .filter((r) => r.comment?.trim())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    res.json({ user: { ...user, reviews, deliveredCount } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Block / Unblock ───────────────────────────────────────────────────────────

// POST /api/users/:id/block
router.post('/:id/block', protect, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id))
      return res.status(400).json({ message: 'Cannot block yourself' });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: req.params.id } });
    res.json({ ok: true, blocked: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id/block
router.delete('/:id/block', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.id } });
    res.json({ ok: true, blocked: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/blocked/list
router.get('/blocked/list', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select('blockedUsers')
      .populate('blockedUsers', 'name profileImage');
    res.json({ blocked: me?.blockedUsers || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Report ────────────────────────────────────────────────────────────────────

// POST /api/users/:id/report
router.post('/:id/report', protect, async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason required' });
    if (String(req.params.id) === String(req.user._id))
      return res.status(400).json({ message: 'Cannot report yourself' });

    await Report.findOneAndUpdate(
      { reporter: req.user._id, reportedUser: req.params.id },
      { reason, description: (description || '').trim().slice(0, 500), status: 'pending' },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.json({ ok: true });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
