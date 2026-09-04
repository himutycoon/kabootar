// One-off migration: converts old single `date` field on Trip documents
// into the new `dates: [Date]` array (wrapping the existing value).
// Safe to re-run — only touches documents that still have the legacy field.
//
// Usage: node scripts/migrate-trip-dates.js
require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const trips = db.collection('trips');

  const cursor = trips.find({ date: { $exists: true }, dates: { $exists: false } });
  let migrated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    await trips.updateOne(
      { _id: doc._id },
      { $set: { dates: [doc.date] }, $unset: { date: '' } }
    );
    migrated++;
  }

  console.log(`Migrated ${migrated} trip document(s).`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
