const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { isTrustedImageUrl } = require('../utils/safeUrl');

// POST /api/kyc/upload — save Firebase Storage URLs for ID document (front + optional back)
router.post('/upload', protect, async (req, res) => {
  try {
    const { documentUrl, documentBackUrl } = req.body;
    if (!documentUrl && !documentBackUrl)
      return res.status(400).json({ message: 'documentUrl or documentBackUrl required' });
    if ((documentUrl && !isTrustedImageUrl(documentUrl)) || (documentBackUrl && !isTrustedImageUrl(documentBackUrl)))
      return res.status(400).json({ message: 'Invalid document link' });

    const updates = {};
    if (documentUrl)     { updates.kycDocumentUrl = documentUrl; updates.kycStatus = 'pending'; updates.kycSubmittedAt = new Date(); }
    if (documentBackUrl) { updates.kycDocumentBackUrl = documentBackUrl; }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-reviews');
    res.json({ user, message: 'Document uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/kyc/selfie — save Firebase Storage URL for selfie
router.post('/selfie', protect, async (req, res) => {
  try {
    const { selfieUrl } = req.body;
    if (!selfieUrl) return res.status(400).json({ message: 'selfieUrl required' });
    if (!isTrustedImageUrl(selfieUrl)) return res.status(400).json({ message: 'Invalid selfie link' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { selfieUrl },
      { new: true }
    ).select('-reviews');
    res.json({ user, message: 'Selfie uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/kyc/status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'kycStatus kycDocumentUrl kycSubmittedAt selfieUrl faceVerified'
    );
    res.json({
      kycStatus:      user.kycStatus,
      kycDocumentUrl: user.kycDocumentUrl,
      kycSubmittedAt: user.kycSubmittedAt,
      selfieUrl:      user.selfieUrl,
      faceVerified:   user.faceVerified,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
