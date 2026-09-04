const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        family: 4,        // force IPv4 — avoids IPv6 DNS issues on some ISPs
        maxPoolSize: 10,  // connection pool — handles concurrent requests efficiently
        minPoolSize: 2,   // keep 2 connections warm at all times
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected');

      // Ensure production indexes exist (safe to call repeatedly — no-op if exists)
      const mongoose2 = require('mongoose');
      mongoose2.connection.once('open', async () => {
        try {
          const db = mongoose2.connection.db;
          // Trips: most queried filters
          await db.collection('trips').createIndex({ status: 1, dates: 1, fromCity: 1, toCity: 1 });
          await db.collection('trips').createIndex({ userId: 1, status: 1 });
          // Parcels: most queried filters
          await db.collection('parcels').createIndex({ status: 1, createdAt: -1, fromCity: 1, toCity: 1 });
          await db.collection('parcels').createIndex({ userId: 1 });
          await db.collection('parcels').createIndex({ travelerId: 1 });
          // Messages: chat load
          await db.collection('messages').createIndex({ roomId: 1, timestamp: -1 });
          // Notifications: user inbox
          await db.collection('appnotifications').createIndex({ userId: 1, createdAt: -1 });
          console.log('📑 MongoDB indexes ensured');
        } catch (e) {
          console.warn('Index creation warning (non-fatal):', e.message);
        }
      });
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`   Retrying in ${delay / 1000}s…`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error('   All retries exhausted. Server running WITHOUT database.');
        // Don't exit — let the server start so you see the error clearly
        // API calls will fail with 500 until DB reconnects
      }
    }
  }
};

// Auto-reconnect on disconnect
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnect…');
  setTimeout(() => connectDB(3, 5000), 2000);
});

module.exports = connectDB;
