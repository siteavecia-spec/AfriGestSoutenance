// Configuration de la couverture de code pour Jest
module.exports = {
  // Répertoires à inclure dans la couverture
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/index.js', // Point d'entrée principal
    '!server/scripts/**', // Scripts utilitaires
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Seuils spécifiques par fichier
    './server/models/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './server/routes/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './server/middleware/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Répertoire de sortie de la couverture
  coverageDirectory: 'coverage',

  // Formats de rapport
  coverageReporters: [
    'text',           // Affichage dans la console
    'text-summary',   // Résumé dans la console
    'lcov',           // Format LCOV pour les outils CI
    'html',           // Rapport HTML
    'json',           // Rapport JSON
    'json-summary'    // Résumé JSON
  ],

  // Fichiers à exclure de la couverture
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.git/'
  ],

  // Variables d'environnement pour les tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout pour les tests
  testTimeout: 30000,

  // Mode verbeux
  verbose: true,

  // Configuration des reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Rapport de tests AfriGest'
      }
    ]
  ],

  // Configuration des transformations
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Modules à transformer
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-to-be-transformed)/)'
  ],

  // Configuration des mocks
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Configuration des tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Configuration des environnements de test
  testEnvironment: 'node',

  // Configuration des globals
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // Configuration des collecteurs de couverture
  collectCoverage: true,

  // Configuration des seuils de couverture par type de test
  coverageThresholdByTestType: {
    unit: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    integration: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    e2e: {
      global: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60
      }
    }
  }
};
