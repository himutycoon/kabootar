// Blocking is two-way: if either person has blocked the other, they can't
// message each other and don't see each other's trips or parcel requests.
const User = require('../models/User');

// True if a and b may not interact (either has blocked the other)
async function isBlockedBetween(a, b) {
  if (!a || !b) return false;
  const hit = await User.exists({
    $or: [
      { _id: a, blockedUsers: b },
      { _id: b, blockedUsers: a },
    ],
  });
  return !!hit;
}

// User IDs whose listings `viewer` must not see: people they blocked + people who blocked them
async function hiddenUserIds(viewer) {
  if (!viewer?._id) return [];
  const blockedMe = await User.find({ blockedUsers: viewer._id }).select('_id').lean();
  return [...(viewer.blockedUsers || []), ...blockedMe.map(u => u._id)];
}

module.exports = { isBlockedBetween, hiddenUserIds };
