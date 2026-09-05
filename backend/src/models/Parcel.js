const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    travelerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    fromCity: { type: String, required: true, trim: true },
    toCity: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0.1 },
    itemType: {
      type: String,
      enum: ['documents', 'electronics', 'clothes', 'others'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'matched', 'requested', 'accepted', 'picked', 'in_transit', 'delivered', 'completed', 'cancelled'],
      default: 'open',
    },
    offeredPrice:  { type: Number, default: null },
    matchedTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    acceptedAt:    { type: Date, default: null },
    pickedAt:      { type: Date, default: null },
    deliveredAt:   { type: Date, default: null },
    completedAt:   { type: Date, default: null }, // set when sender confirms receipt
    pickupOtp: { type: String, default: null },
    pickupOtpExpiry: { type: Date, default: null },
    deliveryOtp: { type: String, default: null },
    deliveryOtpExpiry: { type: Date, default: null },
    pickupStation: { type: String, default: '' },
    dropStation: { type: String, default: '' },
    pickupPhotoUrl: { type: String, default: '' },
    deliveryPhotoUrl: { type: String, default: '' },
    senderReviewed:   { type: Boolean, default: false },
    travelerReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

parcelSchema.index({ fromCity: 1, toCity: 1, status: 1 });

module.exports = mongoose.model('Parcel', parcelSchema);
