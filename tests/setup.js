// Configuration globale pour les tests Jest
// 1) Charger .env.test si présent (prioritaire pour les overrides de tests)
require('dotenv').config({ path: '.env.test', override: true });
// 2) Si MONGODB_URI n'est pas défini par .env.test, retomber sur le .env racine
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env' });
}
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Augmenter le timeout pour les tests (le premier lancement peut télécharger le binaire MongoDB et prendre du temps sous Windows)
jest.setTimeout(180000);

// Configuration globale avant tous les tests
let mongoServer;
// Si une URI Atlas est fournie, on la privilégie; sinon on bascule sur MongoMemoryServer
// Normaliser l'URI MongoDB de test dès le chargement du module pour que tous les tests l'utilisent
let ATLAS_URI = process.env.MONGODB_URI;
if (ATLAS_URI) {
  try {
    const u = new URL(ATLAS_URI);
    u.pathname = '/afrigest-test';
    ATLAS_URI = u.toString();
  } catch {
    ATLAS_URI = ATLAS_URI.replace(/\/?$/, '/afrigest-test');
  }
  process.env.MONGODB_URI = ATLAS_URI;
}
// Pinner une version binaire MongoDB stable pour Windows (utilisé uniquement en fallback en mémoire)
const MONGO_BINARY_VERSION = process.env.MONGO_BINARY_VERSION || '6.0.14';
const MONGO_DOWNLOAD_DIR = process.env.MONGO_DOWNLOAD_DIR; // optionnel
beforeAll(async () => {
  try {
    if (ATLAS_URI) {
      console.error('[TEST-DB] Using MongoDB Atlas from MONGODB_URI');
      // S'assurer que l'URI contient un nom de base de données
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 60000,
      });
      console.error('✅ Connected to MongoDB Atlas for tests');
      console.error(`[TEST-DB] Effective DB: ${mongoose.connection.db.databaseName}`);

      // Démarrer sur une base propre pour un état prévisible
      try {
        await mongoose.connection.db.dropDatabase();
        console.error('[TEST-DB] Dropped test database to ensure clean state');
      } catch (e) {
        console.error('Drop database failed (non-blocking):', e.message || e);
      }

      // Purge d'initialisation: supprimer les utilisateurs de test pour éviter les doublons d'email
      try {
        // Hard drop users collection if exists, then recreate indexes lazily
        const cols = await mongoose.connection.db.listCollections({ name: 'users' }).toArray();
        if (cols.length) {
          await mongoose.connection.db.collection('users').drop();
          console.error('[TEST-DB] Dropped users collection');
        }
      } catch (e) {
        // ignore if not exists
      }
      try {
        await mongoose.connection.db.createCollection('users');
      } catch (e) {
        console.error('Init purge users failed (non-blocking):', e.message || e);
      }
    } else {
      // Fallback: environnement isolé en mémoire
      console.error(`[TEST-DB] Starting MongoMemoryServer (version ${MONGO_BINARY_VERSION})`);
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: MONGO_BINARY_VERSION,
          ...(MONGO_DOWNLOAD_DIR ? { downloadDir: MONGO_DOWNLOAD_DIR } : {}),
        },
      });
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.error('✅ MongoMemoryServer démarré pour les tests');

      // Base propre
      try {
        await mongoose.connection.db.dropDatabase();
        console.error('[TEST-DB] Dropped in-memory test database');
      } catch (e) {
        console.error('Drop database (memory) failed (non-blocking):', e.message || e);
      }

      // Purge d'initialisation (mémoire): supprimer les utilisateurs de test
      try {
        await mongoose.connection.db.collection('users').deleteMany({ email: { $regex: /@test\.com$/i } });
      } catch (e) {
        console.error('Init purge users (memory) failed (non-blocking):', e.message || e);
      }
    }
  } catch (error) {
    console.error('❌ Erreur d\'initialisation des tests MongoDB:', error);
  }
});

// Nettoyage après tous les tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
    console.error('✅ Connexions MongoDB fermées');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture:', error);
  }
});

// Nettoyage avant chaque test
beforeEach(async () => {
  // Nettoyer uniquement les données marquées 'test' pour préserver l'état partagé des tests d'intégration API
  const collections = mongoose.connection.collections;
  // Nettoyer les collections de test; ne pas toucher aux utilisateurs entre les tests
  const testCollections = ['products', 'sales'];

  for (const collectionName of testCollections) {
    if (!collections[collectionName]) continue;

    await collections[collectionName].deleteMany({
      $or: [
        { email: { $regex: /test.*@.*\.com/i } },
        { name: { $regex: /test.*company|test.*store/i } },
        { firstName: { $regex: /test|john|jane/i } },
        { lastName: { $regex: /test|doe|smith/i } }
      ]
    });
  }

  // Nettoyage ciblé des utilisateurs de test avec emails statiques utilisés dans la suite employee
  try {
    const usersCol = mongoose.connection.collections['users'];
    if (usersCol) {
      await usersCol.deleteMany({
        email: { $in: [
          'manager@test.com',
          'manager2@test.com',
          'other.employee@test.com',
          'nouvel.utilisateur@test.com'
        ] }
      });
    }
  } catch (e) {
    // non-bloquant
  }
});

// Configuration des mocks globaux
if (process.env.DEBUG_TESTS === '1') {
  // Ne pas mocker la console en mode debug
  global.console = console;
} else {
  global.console = {
    ...console,
    // Supprimer les logs pendant les tests pour un output plus propre
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Ne pas mocker console.error pour conserver la visibilité des erreurs
    // Cela aide à diagnostiquer les problèmes d'initialisation (ex: MongoMemoryServer)
    error: console.error,
  };
}

// Mock pour les erreurs non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock pour les exceptions non gérées
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
