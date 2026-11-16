const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendPush } = require('../utils/notifications');

// GET /api/chat/conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ timestamp: -1 });

    const partnerMap = new Map();
    for (const msg of messages) {
      const partnerId = msg.senderId.toString() === userId.toString()
        ? msg.receiverId.toString()
        : msg.senderId.toString();
      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, msg);
    }

    const conversations = await Promise.all(
      Array.from(partnerMap.entries()).map(async ([partnerId, lastMsg]) => {
        const partner = await User.findById(partnerId).select('name maskedPhone rating totalRatings profileImage kycStatus');
        const unreadCount = await Message.countDocuments({
          senderId: partnerId,
          receiverId: userId,
          read: false,
        });
        return { partner, lastMessage: lastMsg, unreadCount };
      })
    );

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    await Message.updateMany(
      { senderId: otherId, receiverId: myId, read: false },
      { read: true }
    );

    const partner = await User.findById(otherId).select('name maskedPhone rating totalRatings profileImage kycStatus');

    res.json({ messages: messages.reverse(), partner });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/:userId
router.post('/:userId', protect, async (req, res) => {
  try {
    const { text, type, amount, imageUrl } = req.body;

    // For image messages text is optional; for others it is required
    if (type !== 'image' && !text) {
      return res.status(400).json({ message: 'Text required' });
    }
    if (type === 'image' && !imageUrl) {
      return res.status(400).json({ message: 'imageUrl required for image messages' });
    }

    const message = await Message.create({
      senderId:  req.user._id,
      receiverId: req.params.userId,
      text:      text || '',
      type:      type || 'text',
      amount:    amount || null,
      imageUrl:  imageUrl || null,
    });

    if (req.io) {
      const roomId = [req.user._id.toString(), req.params.userId].sort().join('_');
      req.io.to(roomId).emit('receive_message', {
        _id:       message._id,
        senderId:  req.user._id,
        receiverId: req.params.userId,
        text:      message.text,
        type:      message.type,
        amount:    message.amount,
        imageUrl:  message.imageUrl,
        timestamp: message.timestamp,
      });
    }

    // Push notification to receiver (fire-and-forget)
    const notifBody =
      type === 'offer'  ? `💰 Offer: ₹${amount}` :
      type === 'image'  ? '📷 Sent you an image' :
      (text || '').slice(0, 80);
    sendPush(req.params.userId, {
      title: `💬 ${req.user.name}`,
      body:  notifBody,
      data:  { type: 'message', senderId: String(req.user._id) },
    });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
