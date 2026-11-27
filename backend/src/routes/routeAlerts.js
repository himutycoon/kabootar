const express = require('express');
const router = express.Router();
const RouteAlert = require('../models/RouteAlert');
const { protect } = require('../middleware/auth');
const { routeKey } = require('../utils/routeAlerts');

const MAX_ALERTS = 10;

// GET /api/route-alerts — my alerts
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await RouteAlert.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/route-alerts — { kind: 'trips'|'parcels', fromCity, toCity }
router.post('/', protect, async (req, res) => {
  try {
    const { kind, fromCity, toCity } = req.body || {};
    if (!['trips', 'parcels'].includes(kind)) return res.status(400).json({ message: 'kind must be trips or parcels' });
    if (!String(fromCity || '').trim() || !String(toCity || '').trim()) {
      return res.status(400).json({ message: 'Both cities are required' });
    }
    if (routeKey(fromCity) === routeKey(toCity)) return res.status(400).json({ message: 'Choose two different cities' });

    const existing = await RouteAlert.findOne({ userId: req.user._id, kind, fromKey: routeKey(fromCity), toKey: routeKey(toCity) });
    if (existing) return res.json({ alert: existing });

    const count = await RouteAlert.countDocuments({ userId: req.user._id });
    if (count >= MAX_ALERTS) return res.status(400).json({ message: `You can have up to ${MAX_ALERTS} route alerts. Remove one first.` });

    const alert = await RouteAlert.create({
      userId: req.user._id, kind,
      fromCity: String(fromCity).trim(), toCity: String(toCity).trim(),
      fromKey: routeKey(fromCity), toKey: routeKey(toCity),
    });
    res.status(201).json({ alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/route-alerts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const r = await RouteAlert.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (!r.deletedCount) return res.status(404).json({ message: 'Alert not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
