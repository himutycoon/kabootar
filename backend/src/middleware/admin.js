const { protect } = require('./auth');

// Runs `protect` first; if it rejects (401/403) it has already replied and never calls
// its next, so only continue to the role check from inside that callback.
const adminOnly = (req, res, next) => {
  protect(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

module.exports = { adminOnly };
