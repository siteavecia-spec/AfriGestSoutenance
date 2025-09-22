// Simple diagnostic script to verify .env.test loading and MongoDB Atlas connectivity
require('dotenv').config({ path: '.env.test', override: true });
const mongoose = require('mongoose');

(async () => {
  try {
    const uriPresent = !!process.env.MONGODB_URI;
    console.log('[DIAG] .env.test loaded -> MONGODB_URI:', uriPresent ? 'SET' : 'MISSING');
    if (!uriPresent) {
      console.error('[DIAG] Please create .env.test at project root and set MONGODB_URI');
      process.exit(2);
    }

    // Add a short timeout to fail fast on networking errors
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s

    console.log('[DIAG] Trying to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, // 15s
      connectTimeoutMS: 15000,
    });
    clearTimeout(timeout);

    console.log('✅ [DIAG] Connected OK to MongoDB');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ [DIAG] Connect FAILED');
    console.error(e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
