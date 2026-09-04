const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    // unique enforced via partial index below (excludes google_ placeholders)
    phone: { type: String, required: true },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalRatings: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    city: { type: String, default: '' },
    frequentRoute: {
      from: { type: String, default: '' },
      to: { type: String, default: '' },
    },
    profileImage: { type: String, default: '' },
    tripsCompleted: { type: Number, default: 0 },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    kycDocumentUrl:     { type: String, default: '' },
    kycDocumentBackUrl: { type: String, default: '' },
    kycSubmittedAt: { type: Date, default: null },
    selfieUrl: { type: String, default: '' },
    faceVerified: { type: Boolean, default: false },
    reviews: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isPhoneVerified:   { type: Boolean, default: false },
    role:              { type: String, enum: ['user', 'admin'], default: 'user' },
    kycRejectedReason: { type: String, default: '' },
    kycApprovedAt:     { type: Date },
    kycRejectedAt:     { type: Date },
    fcmToken:            { type: String, default: '' },
    blockedUsers:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingDeletion:     { type: Boolean, default: false },
    deletionRequestedAt: { type: Date, default: null },
    banned:       { type: Boolean, default: false },
    bannedReason: { type: String, default: '' },
    bannedAt:     { type: Date },
  },
  { timestamps: true }
);

// Sparse unique index — excludes google_ placeholder phones
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { phone: { $not: { $regex: '^google_' } } },
    name: 'phone_real_unique',
  }
);

// Virtual: profile is usable when name + real phone + photo all present
userSchema.virtual('isProfileComplete').get(function () {
  return !!(
    this.name?.trim() &&
    this.phone &&
    !this.phone.startsWith('google_') &&
    this.profileImage
  );
});

// Virtual: masked phone for public display e.g. +91XXXXX43210
userSchema.virtual('maskedPhone').get(function () {
  if (!this.phone || this.phone.startsWith('google_')) return null;
  return this.phone.slice(0, -5).replace(/\d/g, 'X') + this.phone.slice(-5);
});

userSchema.set('toJSON',   { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
