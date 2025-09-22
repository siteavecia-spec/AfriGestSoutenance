// Configuration des tests de sécurité
module.exports = {
  // Tests d'authentification
  authentication: {
    // Tests de force brute
    bruteForce: {
      maxAttempts: 5,
      lockoutDuration: 300000, // 5 minutes
      testAccounts: [
        'admin@test.com',
        'user@test.com',
        'test@test.com'
      ]
    },
    
    // Tests de session
    session: {
      timeout: 3600000,        // 1 heure
      maxSessions: 5,
      secureCookies: true,
      httpOnly: true
    },
    
    // Tests de token
    token: {
      expiration: 86400000,    // 24 heures
      refreshThreshold: 3600000, // 1 heure
      maxTokens: 10
    }
  },

  // Tests d'autorisation
  authorization: {
    // Rôles et permissions
    roles: {
      super_admin: ['*'],
      company_admin: ['company:read', 'company:write', 'store:read', 'store:write', 'user:read', 'user:write'],
      store_manager: ['store:read', 'store:write', 'user:read', 'sale:read', 'sale:write'],
      employee: ['sale:read', 'sale:write', 'product:read']
    },
    
    // Tests d'escalade de privilèges
    privilegeEscalation: {
      testScenarios: [
        {
          name: 'Employee to Admin',
          from: 'employee',
          to: 'company_admin',
          shouldFail: true
        },
        {
          name: 'Store Manager to Super Admin',
          from: 'store_manager',
          to: 'super_admin',
          shouldFail: true
        }
      ]
    }
  },

  // Tests d'injection
  injection: {
    // Tests SQL injection
    sqlInjection: {
      payloads: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --"
      ],
      endpoints: [
        '/api/auth/login',
        '/api/companies',
        '/api/stores',
        '/api/users',
        '/api/sales'
      ]
    },
    
    // Tests NoSQL injection
    nosqlInjection: {
      payloads: [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.password.length > 0"}',
        '{"$regex": ".*"}'
      ],
      endpoints: [
        '/api/auth/login',
        '/api/companies/search',
        '/api/stores/search',
        '/api/users/search'
      ]
    },
    
    // Tests XSS
    xss: {
      payloads: [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">'
      ],
      fields: [
        'name',
        'description',
        'address',
        'email'
      ]
    }
  },

  // Tests de validation d'entrée
  inputValidation: {
    // Tests de longueur
    length: {
      maxLengths: {
        name: 100,
        description: 500,
        address: 200,
        email: 254,
        phone: 20
      },
      minLengths: {
        name: 2,
        password: 8
      }
    },
    
    // Tests de format
    format: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[1-9]\d{1,14}$/,
      url: /^https?:\/\/.+/,
      date: /^\d{4}-\d{2}-\d{2}$/
    },
    
    // Tests de caractères spéciaux
    specialCharacters: {
      allowed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._-+',
      forbidden: '<>{}[]()&$#%!*|\\/:;"\'`~'
    }
  },

  // Tests de rate limiting
  rateLimiting: {
    // Limites par endpoint
    limits: {
      '/api/auth/login': {
        windowMs: 900000,    // 15 minutes
        max: 5,              // 5 tentatives
        message: 'Trop de tentatives de connexion'
      },
      '/api/auth/forgot-password': {
        windowMs: 3600000,   // 1 heure
        max: 3,              // 3 tentatives
        message: 'Trop de demandes de réinitialisation'
      },
      '/api/companies': {
        windowMs: 60000,     // 1 minute
        max: 100,            // 100 requêtes
        message: 'Trop de requêtes'
      }
    },
    
    // Tests de contournement
    bypass: {
      methods: [
        'headerManipulation',
        'ipSpoofing',
        'userAgentRotation',
        'proxyRotation'
      ]
    }
  },

  // Tests de CORS
  cors: {
    // Configuration attendue
    expected: {
      origin: ['http://localhost:3000', 'https://afrigest.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    
    // Tests de contournement
    bypass: {
      origins: [
        'http://malicious.com',
        'https://evil.com',
        'http://localhost:3001',
        'null'
      ]
    }
  },

  // Tests de headers de sécurité
  securityHeaders: {
    // Headers attendus
    expected: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },

  // Tests de gestion des erreurs
  errorHandling: {
    // Informations sensibles à ne pas exposer
    sensitiveInfo: [
      'password',
      'token',
      'secret',
      'key',
      'database',
      'connection',
      'stack trace'
    ],
    
    // Codes d'erreur attendus
    expectedCodes: {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error'
    }
  },

  // Tests de logs de sécurité
  securityLogging: {
    // Événements à logger
    events: [
      'login_attempt',
      'login_success',
      'login_failure',
      'password_change',
      'privilege_escalation',
      'suspicious_activity',
      'rate_limit_exceeded'
    ],
    
    // Informations à inclure
    information: [
      'timestamp',
      'ip_address',
      'user_agent',
      'user_id',
      'action',
      'result',
      'details'
    ]
  },

  // Tests de chiffrement
  encryption: {
    // Algorithmes attendus
    algorithms: {
      password: 'bcrypt',
      token: 'HS256',
      data: 'AES-256-GCM'
    },
    
    // Tests de force
    strength: {
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    }
  }
};
