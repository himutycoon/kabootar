const mongoose = require('mongoose');

// "Tell me when someone posts a trip (or parcel) on this route."
const routeAlertSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind:     { type: String, enum: ['trips', 'parcels'], required: true }, // what the user wants to hear about
    fromCity: { type: String, required: true, trim: true },
    toCity:   { type: String, required: true, trim: true },
    fromKey:  { type: String, required: true }, // lower-cased for matching
    toKey:    { type: String, required: true },
  },
  { timestamps: true }
);

routeAlertSchema.index({ kind: 1, fromKey: 1, toKey: 1 });
routeAlertSchema.index({ userId: 1, kind: 1, fromKey: 1, toKey: 1 }, { unique: true });

module.exports = mongoose.model('RouteAlert', routeAlertSchema);
