const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

// Uploads are held in memory and stored in Firebase Storage — never on the
// server's own disk, which Render wipes on every deploy/restart.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

// Same bucket the app's Firebase client uses (public project config, not a secret)
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'kabootar-9174c.firebasestorage.app';

// Store an uploaded file and return a Firebase download URL (same format the
// app's client-side uploads use, so the account-deletion job can remove it)
async function storeUpload(file, folder) {
  const admin = require('firebase-admin');
  if (!admin.apps.length) throw new Error('File storage is not configured');
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
  const objectPath = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const token = crypto.randomUUID();
  await admin.storage().bucket(BUCKET).file(objectPath).save(file.buffer, {
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

module.exports = { upload, storeUpload };
