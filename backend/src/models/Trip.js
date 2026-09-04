const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromCity: { type: String, required: true, trim: true },
    toCity: { type: String, required: true, trim: true },
    // One or more travel dates — lets a regular traveller (daily commuter, etc.)
    // cover several dates in a single post instead of posting once per date.
    dates: {
      type: [Date],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one travel date is required',
      },
    },
    transportMode: {
      type: String,
      enum: ['train', 'flight', 'bus', 'car'],
      required: true,
    },
    availableWeight: { type: Number, required: true, min: 0.1 },
    pricePerKg: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    notes:         { type: String, default: '' },
    departureTime: { type: String, default: '' }, // "HH:MM" 24-hour, optional
    arrivalTime:   { type: String, default: '' }, // expected arrival "HH:MM", optional
    pickupStation: { type: String, default: '' },
    dropStation: { type: String, default: '' },
    ticketUrl:    { type: String, default: '' },
    isVerified:   { type: Boolean, default: false },
    pnrNumber:    { type: String, default: '', trim: true },   // train PNR (10 digits)
    flightNumber: { type: String, default: '', trim: true },   // flight e.g. "AI302"
    trainNumber:  { type: String, default: '', trim: true },   // train number e.g. "12301"
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Backward-compat virtual: older frontend/app builds (and anywhere in this codebase
// that hasn't been updated) read a single `date` — expose the earliest travel date.
tripSchema.virtual('date').get(function () {
  return this.dates && this.dates[0];
});

// Keep dates deduped and sorted ascending regardless of how they were submitted.
tripSchema.pre('validate', function (next) {
  if (Array.isArray(this.dates) && this.dates.length) {
    const unique = [...new Set(this.dates.map((d) => new Date(d).getTime()))].filter((t) => !Number.isNaN(t));
    this.dates = unique.sort((a, b) => a - b).map((t) => new Date(t));
  }
  next();
});

tripSchema.index({ fromCity: 1, toCity: 1, dates: 1 });

module.exports = mongoose.model('Trip', tripSchema);
