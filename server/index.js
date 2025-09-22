const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Load .env from project root regardless of where the process is started
const rootEnvPath = path.resolve(__dirname, '..', '.env');
const dotenv = require('dotenv');
const result = dotenv.config({ path: rootEnvPath });
// DEBUG: trace dotenv loading
try {
  const exists = fs.existsSync(rootEnvPath);
  console.log('[DEBUG] .env path:', rootEnvPath, '| exists:', exists);
  if (result && result.error) {
    console.log('[DEBUG] dotenv error for explicit path:', result.error.message || result.error);
  } else if (result && result.parsed) {
    console.log('[DEBUG] dotenv parsed keys:', Object.keys(result.parsed));
  }
} catch (e) {
  console.log('[DEBUG] Error checking .env existence:', e.message);
}
// Fallback: if root .env not found, try default lookup (current working dir)
if (result.error) {
  dotenv.config();
  console.log('[DEBUG] Fallback to default dotenv.config() without explicit path');
}

// Importer l'application Express
const app = require('./app');

// Connexion à MongoDB
// Normalize potential BOM-prefixed env keys (e.g., \ufeffMONGODB_URI)
(function ensureMongoUriKey() {
  if (process.env.MONGODB_URI) return;
  const bomKey = Object.keys(process.env).find(k => k.replace(/^\uFEFF/, '') === 'MONGODB_URI');
  if (bomKey && process.env[bomKey] && !process.env.MONGODB_URI) {
    process.env.MONGODB_URI = process.env[bomKey];
    console.log('[DEBUG] Normalized BOM-prefixed env key', bomKey, 'to MONGODB_URI');
  }
})();
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ Missing MONGODB_URI in environment. Please set it in your .env file.');
  // DEBUG: show available env keys containing MONGO
  const mongoLike = Object.keys(process.env).filter(k => k.toUpperCase().includes('MONGO'));
  console.error('[DEBUG] Env keys containing "MONGO":', mongoLike);
  if (mongoLike.length) {
    const preview = mongoLike.reduce((acc, k) => {
      acc[k] = process.env[k] ? '[present]' : '[empty]';
      return acc;
    }, {});
    console.error('[DEBUG] MONGO-like values presence:', preview);
  }
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    // These flags are safe with current Mongoose
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    // Ensure we connect to the intended application database (not 'admin')
    // Set MONGODB_DBNAME in your .env (e.g., 'afrigest'). If not set and your URI contains a path, MongoDB will use it.
    dbName: process.env.MONGODB_DBNAME || 'afrigest',
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('🗄️  Using database:', process.env.MONGODB_DBNAME || 'afrigest');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.error('ℹ️ Check that your IP is whitelisted in Atlas and the URI/credentials are correct.');
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AfriGest server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
