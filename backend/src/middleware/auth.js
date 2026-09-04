const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-__v');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.banned) {
      return res.status(403).json({
        message: user.bannedReason
          ? `Your account has been suspended: ${user.bannedReason}`
          : 'Your account has been suspended. Contact support if you think this is a mistake.',
        banned: true,
      });
    }

    // 3-day soft delete — if user hasn't logged in within 3 days of requesting deletion, delete now
    if (user.pendingDeletion && user.deletionRequestedAt) {
      const daysSinceRequest = (Date.now() - new Date(user.deletionRequestedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceRequest >= 3) {
        await User.findByIdAndDelete(user._id);
        return res.status(401).json({ message: 'Account has been permanently deleted', deleted: true });
      }
      // User logged in within 3 days — cancel the deletion automatically
      await User.findByIdAndUpdate(user._id, { pendingDeletion: false, deletionRequestedAt: null });
      user.pendingDeletion = false;
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// Optional auth — sets req.user if valid token present, never fails
const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('blockedUsers');
      if (user) req.user = user;
    } catch {}
  }
  next();
};

module.exports = { protect, optionalAuth };
