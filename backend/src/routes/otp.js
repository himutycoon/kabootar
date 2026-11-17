const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Parcel = require('../models/Parcel');
const { protect } = require('../middleware/auth');
const { notify } = require('../utils/notifications');

// Handover codes
// ─────────────
// The traveller asks for a code; the code is delivered to the SENDER (in-app
// alert + push, and visible in their My Parcels). The traveller only gets it
// from the sender (or the recipient the sender shares it with) in person, and
// enters it to confirm the handover. The code is never returned to the
// traveller who requested it.

const CODE_TTL_MS  = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const FIELDS = {
  pickup:   { code: 'pickupOtp',   expiry: 'pickupOtpExpiry',   attempts: 'pickupOtpAttempts' },
  delivery: { code: 'deliveryOtp', expiry: 'deliveryOtpExpiry', attempts: 'deliveryOtpAttempts' },
};

const isTraveler = (parcel, user) => parcel.travelerId?.toString() === user._id.toString();
const isSender   = (parcel, user) => parcel.userId?.toString() === user._id.toString();

// Who receives the code and what they're told
const codeMessage = (type, parcel, code) => type === 'pickup'
  ? {
      title: 'Your pickup code',
      body:  `Code ${code} for your parcel ${parcel.fromCity} → ${parcel.toCity}. Give it to the traveller only when you hand the parcel over. Valid for 10 minutes.`,
    }
  : {
      title: 'Your delivery code',
      body:  `Code ${code} for your parcel ${parcel.fromCity} → ${parcel.toCity}. Share it with the person receiving the parcel, to give to the traveller on delivery. Valid for 10 minutes.`,
    };

// POST /api/otp/:type/generate — traveller requests a code; it is sent to the sender
router.post('/:type/generate', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const f = FIELDS[type];
    if (!f) return res.status(404).json({ message: 'Unknown code type' });

    const parcel = await Parcel.findById(req.body.parcelId);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (!isTraveler(parcel, req.user)) {
      return res.status(403).json({ message: `Only the traveller can request a ${type} code` });
    }
    if (type === 'pickup' && parcel.status !== 'accepted') {
      return res.status(400).json({ message: 'Parcel must be in accepted state' });
    }
    if (type === 'delivery' && !['picked', 'in_transit'].includes(parcel.status)) {
      return res.status(400).json({ message: 'Parcel must be picked up first' });
    }

    const code = generateOtp();
    parcel[f.code]     = code;
    parcel[f.expiry]   = new Date(Date.now() + CODE_TTL_MS);
    parcel[f.attempts] = 0;
    if (type === 'delivery') parcel.status = 'in_transit';
    await parcel.save();

    // Deliver the code to the sender only
    notify(parcel.userId, {
      ...codeMessage(type, parcel, code),
      type: 'parcel',
      data: { type: `${type}_code`, parcelId: String(parcel._id), screen: '/my-parcels' },
    }).catch(() => {});
    req.io?.to(String(parcel.userId)).emit('handover_code', { parcelId: String(parcel._id), type });

    res.json({ message: 'Code sent to the sender', expiresAt: parcel[f.expiry] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/otp/:type/active/:parcelId — sender views the currently valid code
router.get('/:type/active/:parcelId', protect, async (req, res) => {
  try {
    const f = FIELDS[req.params.type];
    if (!f) return res.status(404).json({ message: 'Unknown code type' });

    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (!isSender(parcel, req.user)) return res.status(403).json({ message: 'Only the sender can view this code' });

    const valid = parcel[f.code] && parcel[f.expiry] && parcel[f.expiry] > new Date();
    if (!valid) return res.json({ active: false });
    res.json({ active: true, otp: parcel[f.code], expiresAt: parcel[f.expiry] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/otp/:type/verify — traveller enters the code the sender gave them
router.post('/:type/verify', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const f = FIELDS[type];
    if (!f) return res.status(404).json({ message: 'Unknown code type' });

    const { parcelId, otp } = req.body;
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) return res.status(404).json({ message: 'Parcel not found' });
    if (!isTraveler(parcel, req.user)) return res.status(403).json({ message: 'Not authorized' });

    if (!parcel[f.code] || !parcel[f.expiry] || parcel[f.expiry] < new Date()) {
      return res.status(400).json({ message: 'This code has expired. Request a new one.' });
    }
    if (parcel[f.code] !== String(otp)) {
      parcel[f.attempts] = (parcel[f.attempts] || 0) + 1;
      if (parcel[f.attempts] >= MAX_ATTEMPTS) {
        parcel[f.code] = null;
        parcel[f.expiry] = null;
        parcel[f.attempts] = 0;
        await parcel.save();
        return res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
      }
      await parcel.save();
      const left = MAX_ATTEMPTS - parcel[f.attempts];
      return res.status(400).json({ message: `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` });
    }

    parcel[f.code] = null;
    parcel[f.expiry] = null;
    parcel[f.attempts] = 0;

    if (type === 'pickup') {
      parcel.status = 'picked';
      parcel.pickedAt = new Date();
      await parcel.save();
      return res.json({ parcel, message: 'Pickup confirmed' });
    }

    parcel.status = 'delivered';
    parcel.deliveredAt = new Date();
    await parcel.save();

    // Ask the sender to confirm receipt (button appears in their My Parcels)
    notify(parcel.userId, {
      title: 'Parcel delivered — please confirm receipt',
      body:  `Your parcel ${parcel.fromCity} → ${parcel.toCity} has been handed over. Confirm receipt to complete the delivery.`,
      type:  'parcel',
      data:  { type: 'awaiting_confirmation', parcelId: String(parcel._id), screen: '/my-parcels' },
    }).catch(() => {});
    req.io?.to(String(parcel.userId)).emit('parcel_awaiting_confirmation', {
      parcelId: String(parcel._id),
      message:  'Your parcel has arrived! Please confirm receipt.',
    });

    res.json({ parcel, message: 'Delivery confirmed — awaiting sender confirmation' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
