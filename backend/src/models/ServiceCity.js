const mongoose = require('mongoose');

// Admin-managed launch cities — when this collection is non-empty, trip/parcel
// posting is restricted to routes between these cities (see utils/serviceCities).
const schema = new mongoose.Schema({
  city:  { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
}, { timestamps: true });

schema.index({ city: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('ServiceCity', schema);
