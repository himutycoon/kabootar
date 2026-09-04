const express = require('express');
const router  = express.Router();
const ServiceCity = require('../models/ServiceCity');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

// GET /api/cities — public: the current allowed-cities list (empty = unrestricted)
router.get('/', async (req, res) => {
  try {
    const cities = await ServiceCity.find().sort({ state: 1, city: 1 });
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cities — admin: add a launch city
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { city, state } = req.body;
    if (!city?.trim() || !state?.trim())
      return res.status(400).json({ message: 'city and state required' });
    const existing = await ServiceCity.findOne({ city: city.trim() }).collation({ locale: 'en', strength: 2 });
    if (existing) return res.status(409).json({ message: `${city.trim()} is already on the list` });
    const created = await ServiceCity.create({ city: city.trim(), state: state.trim() });
    res.status(201).json({ city: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cities/:id — admin: remove a launch city
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await ServiceCity.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
