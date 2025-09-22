// Setup léger pour les tests unitaires (aucune connexion Mongo par défaut)
require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Timeout plus court pour les tests unitaires
jest.setTimeout(10000);

// Conserver la visibilité des erreurs
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};
