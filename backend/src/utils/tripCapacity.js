const Parcel = require('../models/Parcel');

// Weight already committed to a trip — every parcel tied to it except cancelled ones.
// Single source of truth for "how much room is actually left on this trip", used
// both to enforce capacity at accept-time and to filter match suggestions.
async function getCommittedWeight(tripId) {
  const [row] = await Parcel.aggregate([
    { $match: { tripId, status: { $ne: 'cancelled' } } },
    { $group: { _id: null, total: { $sum: '$weight' } } },
  ]);
  return row?.total || 0;
}

// Bulk variant for filtering a list of candidate trips at once — one aggregation
// instead of one per trip.
async function getCommittedWeightMany(tripIds) {
  const rows = await Parcel.aggregate([
    { $match: { tripId: { $in: tripIds }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$tripId', total: { $sum: '$weight' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.total]));
}

module.exports = { getCommittedWeight, getCommittedWeightMany };
