// Configuration des tests de performance
module.exports = {
  // Seuils de performance
  thresholds: {
    // Temps de réponse des API
    api: {
      average: 500,      // 500ms en moyenne
      p95: 1000,         // 95% des requêtes < 1s
      p99: 2000          // 99% des requêtes < 2s
    },
    
    // Temps de création d'entités
    creation: {
      single: 100,       // 100ms pour une entité
      batch: 1000,       // 1s pour 100 entités
      bulk: 5000         // 5s pour 1000 entités
    },
    
    // Temps de requêtes de base de données
    database: {
      simple: 50,        // 50ms pour une requête simple
      complex: 200,      // 200ms pour une requête complexe
      aggregation: 500   // 500ms pour une agrégation
    },
    
    // Temps de tests de charge
    load: {
      companies: 10000,  // 10s pour 100 entreprises
      stores: 15000,     // 15s pour 500 boutiques
      users: 20000,      // 20s pour 1000 utilisateurs
      sales: 30000       // 30s pour 2000 ventes
    }
  },

  // Configuration des tests de charge
  loadTest: {
    // Nombre d'entités à créer
    entities: {
      companies: 100,
      stores: 500,
      users: 1000,
      sales: 2000,
      products: 100
    },
    
    // Configuration des requêtes concurrentes
    concurrency: {
      min: 1,
      max: 100,
      step: 10
    },
    
    // Durée des tests de charge
    duration: {
      short: 30000,      // 30 secondes
      medium: 60000,     // 1 minute
      long: 300000       // 5 minutes
    }
  },

  // Configuration des tests de stress
  stressTest: {
    // Limites de ressources
    resources: {
      memory: '512MB',   // Limite de mémoire
      cpu: 80,           // Limite d'utilisation CPU (%)
      connections: 1000  // Limite de connexions
    },
    
    // Scénarios de stress
    scenarios: [
      {
        name: 'Création massive',
        description: 'Créer un grand nombre d\'entités rapidement',
        entities: ['companies', 'stores', 'users'],
        count: 1000
      },
      {
        name: 'Requêtes concurrentes',
        description: 'Exécuter de nombreuses requêtes en parallèle',
        operations: ['read', 'update', 'delete'],
        concurrency: 100
      },
      {
        name: 'Agrégations complexes',
        description: 'Exécuter des requêtes d\'agrégation sur de gros volumes',
        operations: ['aggregate', 'group', 'sum'],
        dataSize: 10000
      }
    ]
  },

  // Configuration des tests de montée en charge
  scalability: {
    // Points de mesure
    measurementPoints: [10, 50, 100, 500, 1000, 5000],
    
    // Métriques à surveiller
    metrics: [
      'responseTime',
      'throughput',
      'errorRate',
      'memoryUsage',
      'cpuUsage'
    ],
    
    // Seuils de dégradation
    degradation: {
      responseTime: 2.0,  // 2x plus lent
      errorRate: 0.05,    // 5% d'erreurs
      memoryUsage: 0.8    // 80% de mémoire utilisée
    }
  },

  // Configuration des tests de récupération
  recovery: {
    // Scénarios de panne
    failureScenarios: [
      {
        name: 'Perte de connexion DB',
        description: 'Simuler une perte de connexion à la base de données',
        duration: 30000,  // 30 secondes
        recoveryTime: 5000 // 5 secondes pour récupérer
      },
      {
        name: 'Surcharge mémoire',
        description: 'Simuler une surcharge mémoire',
        memoryLimit: '256MB',
        recoveryTime: 10000
      },
      {
        name: 'Surcharge CPU',
        description: 'Simuler une surcharge CPU',
        cpuLimit: 90,
        recoveryTime: 15000
      }
    ]
  },

  // Configuration des rapports de performance
  reporting: {
    // Formats de sortie
    formats: ['json', 'html', 'csv'],
    
    // Métriques à inclure
    metrics: [
      'responseTime',
      'throughput',
      'errorRate',
      'memoryUsage',
      'cpuUsage',
      'databaseConnections',
      'cacheHitRate'
    ],
    
    // Seuils d'alerte
    alerts: {
      responseTime: 1000,    // > 1s
      errorRate: 0.01,       // > 1%
      memoryUsage: 0.8,      // > 80%
      cpuUsage: 0.8          // > 80%
    }
  }
};
