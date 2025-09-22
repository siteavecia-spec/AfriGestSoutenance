// Configuration pour les tests
require('dotenv').config({ path: '.env.test' });

const config = {
  // Base de données
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    expire: process.env.JWT_EXPIRE || '24h'
  },

  // Serveur
  server: {
    port: process.env.PORT || 5001,
    host: process.env.HOST || 'localhost'
  },

  // Tests
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
    dbCleanup: process.env.TEST_DB_CLEANUP === 'true',
    logLevel: process.env.LOG_LEVEL || 'error'
  },

  // Email (pour les tests)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || 'test@afrigest.com',
    pass: process.env.EMAIL_PASS || 'test-password'
  }
};

module.exports = config;
