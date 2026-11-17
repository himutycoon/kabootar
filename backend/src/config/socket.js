const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { isBlockedBetween } = require('../utils/blocks');

// Chat rooms are named "<idA>_<idB>" with the two user IDs sorted
const roomMembers = (roomId) => {
  const parts = String(roomId || '').split('_');
  return parts.length === 2 && parts[0] && parts[1] ? parts : null;
};

const setupSocket = (io) => {
  const onlineUsers = new Map(); // userId → socketId
  const lastSeen    = new Map(); // userId → timestamp (ms)

  // Every connection must present a valid login token; the user ID comes from
  // the token, never from anything the client claims.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(id).select('_id banned').lean();
      if (!user || user.banned) return next(new Error('unauthorized'));
      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;

    // Personal room: the server pushes account events here (KYC result, bans,
    // delivery updates, handover codes) with io.to(userId)
    socket.join(uid);
    onlineUsers.set(uid, socket.id);
    socket.broadcast.emit('user_online', { userId: uid });

    // Older app builds still emit 'register'; identity now comes from the token
    socket.on('register', () => {});

    // Join a chat room — only rooms this user is a member of
    socket.on('join_room', (roomId) => {
      const members = roomMembers(roomId);
      if (members && members.includes(uid)) socket.join(roomId);
    });

    // Query online/last-seen status of another user
    socket.on('check_online', (targetUserId) => {
      socket.emit('online_status', {
        userId:      targetUserId,
        isOnline:    onlineUsers.has(String(targetUserId)),
        lastSeenAt:  lastSeen.get(String(targetUserId)) || null,
      });
    });

    // Typing indicator — only in rooms this socket has joined
    socket.on('typing', ({ roomId } = {}) => {
      if (socket.rooms.has(roomId)) socket.to(roomId).emit('partner_typing', { userId: uid });
    });
    socket.on('stop_typing', ({ roomId } = {}) => {
      if (socket.rooms.has(roomId)) socket.to(roomId).emit('partner_stopped_typing', { userId: uid });
    });

    // Send message — sender is the authenticated user; receiver must be the other room member
    socket.on('send_message', async (data = {}) => {
      const { receiverId, text, type, amount, imageUrl } = data;
      try {
        const roomId = [uid, String(receiverId)].sort().join('_');
        if (!receiverId || String(receiverId) === uid) {
          return socket.emit('message_error', { message: 'Invalid recipient' });
        }
        if (await isBlockedBetween(uid, receiverId)) {
          return socket.emit('message_error', { message: "You can't message this user." });
        }
        const message = await Message.create({
          senderId:   uid,
          receiverId,
          text:     text || '',
          type:     type || 'text',
          amount:   amount || null,
          imageUrl: imageUrl || null,
        });
        const payload = {
          _id:       message._id,
          senderId:  uid,
          receiverId,
          text:      message.text,
          type:      message.type,
          amount:    message.amount,
          imageUrl:  message.imageUrl,
          timestamp: message.timestamp,
        };
        socket.join(roomId);
        io.to(roomId).emit('receive_message', payload);
        // Also reach the receiver's other screens (chat list badges) via their personal room
        socket.to(String(receiverId)).except(roomId).emit('receive_message', payload);
      } catch {
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      lastSeen.set(uid, Date.now());
      if (onlineUsers.get(uid) === socket.id) onlineUsers.delete(uid);
      socket.broadcast.emit('user_offline', { userId: uid, lastSeenAt: Date.now() });
    });
  });
};

module.exports = { setupSocket };
