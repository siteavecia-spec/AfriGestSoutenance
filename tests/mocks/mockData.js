// Mocks et données simulées pour les tests
const mock = require('jest-mock');

// Mock pour les services externes
const mockServices = {
  // Mock pour l'envoi d'emails
  emailService: {
    sendEmail: mock.fn().mockResolvedValue({ success: true, messageId: 'mock-message-id' }),
    sendWelcomeEmail: mock.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: mock.fn().mockResolvedValue({ success: true }),
    sendNotificationEmail: mock.fn().mockResolvedValue({ success: true })
  },

  // Mock pour les services de paiement
  paymentService: {
    processPayment: mock.fn().mockResolvedValue({ 
      success: true, 
      transactionId: 'mock-transaction-id',
      amount: 1000,
      currency: 'XOF'
    }),
    refundPayment: mock.fn().mockResolvedValue({ success: true }),
    validatePayment: mock.fn().mockResolvedValue({ valid: true })
  },

  // Mock pour les services de stockage
  storageService: {
    uploadFile: mock.fn().mockResolvedValue({ 
      success: true, 
      url: 'https://mock-storage.com/file.jpg',
      filename: 'mock-file.jpg'
    }),
    deleteFile: mock.fn().mockResolvedValue({ success: true }),
    getFileUrl: mock.fn().mockReturnValue('https://mock-storage.com/file.jpg')
  },

  // Mock pour les services de notification
  notificationService: {
    sendPushNotification: mock.fn().mockResolvedValue({ success: true }),
    sendSMS: mock.fn().mockResolvedValue({ success: true }),
    sendWhatsApp: mock.fn().mockResolvedValue({ success: true })
  }
};

// Mock pour les réponses HTTP
const mockHttpResponses = {
  success: (data = {}) => ({
    status: 200,
    success: true,
    data: data,
    message: 'Success'
  }),

  created: (data = {}) => ({
    status: 201,
    success: true,
    data: data,
    message: 'Created successfully'
  }),

  badRequest: (message = 'Bad Request') => ({
    status: 400,
    success: false,
    message: message
  }),

  unauthorized: (message = 'Unauthorized') => ({
    status: 401,
    success: false,
    message: message
  }),

  forbidden: (message = 'Forbidden') => ({
    status: 403,
    success: false,
    message: message
  }),

  notFound: (message = 'Not Found') => ({
    status: 404,
    success: false,
    message: message
  }),

  serverError: (message = 'Internal Server Error') => ({
    status: 500,
    success: false,
    message: message
  })
};

// Mock pour les données de base de données
const mockDatabaseData = {
  // Mock pour les utilisateurs
  users: [
    {
      _id: 'mock-user-id-1',
      firstName: 'Mock',
      lastName: 'User',
      email: 'mock@user.com',
      role: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'mock-user-id-2',
      firstName: 'Mock',
      lastName: 'Admin',
      email: 'mock@admin.com',
      role: 'company_admin',
      company: 'mock-company-id-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Mock pour les entreprises
  companies: [
    {
      _id: 'mock-company-id-1',
      name: 'Mock Company 1',
      description: 'Mock company description',
      address: '123 Mock Street',
      phone: '+221 77 000 00 00',
      email: 'mock@company1.com',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Mock pour les boutiques
  stores: [
    {
      _id: 'mock-store-id-1',
      name: 'Mock Store 1',
      address: '456 Mock Avenue',
      phone: '+221 77 111 11 11',
      company: 'mock-company-id-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Mock pour les produits
  products: [
    {
      _id: 'mock-product-id-1',
      name: 'Mock Product 1',
      description: 'Mock product description',
      price: 1000,
      quantity: 50,
      minQuantity: 5,
      store: 'mock-store-id-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],

  // Mock pour les ventes
  sales: [
    {
      _id: 'mock-sale-id-1',
      customer: {
        name: 'Mock Customer',
        email: 'mock@customer.com',
        phone: '+221 77 222 22 22'
      },
      items: [
        {
          name: 'Mock Product 1',
          quantity: 2,
          price: 1000,
          total: 2000
        }
      ],
      total: 2000,
      paymentMethod: 'cash',
      store: 'mock-store-id-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

// Mock pour les erreurs
const mockErrors = {
  validationError: {
    name: 'ValidationError',
    message: 'Validation failed',
    errors: {
      email: {
        message: 'Email is required',
        path: 'email',
        value: undefined
      }
    }
  },

  castError: {
    name: 'CastError',
    message: 'Cast to ObjectId failed',
    path: '_id',
    value: 'invalid-id'
  },

  duplicateKeyError: {
    name: 'MongoError',
    code: 11000,
    message: 'Duplicate key error',
    keyValue: {
      email: 'duplicate@email.com'
    }
  },

  networkError: {
    name: 'MongoNetworkError',
    message: 'Connection failed'
  }
};

// Mock pour les tokens JWT
const mockTokens = {
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stdXNlci1pZC0xIiwiZW1haWwiOiJtb2NrQHVzZXIuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDEwODE2MDB9.mock-signature',
  
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stdXNlci1pZC0xIiwiZW1haWwiOiJtb2NrQHVzZXIuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTUyMDB9.mock-signature',
  
  invalidToken: 'invalid-token-string'
};

// Mock pour les requêtes Express
const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides
});

const mockResponse = () => {
  const res = {};
  res.status = mock.fn().mockReturnValue(res);
  res.json = mock.fn().mockReturnValue(res);
  res.send = mock.fn().mockReturnValue(res);
  res.cookie = mock.fn().mockReturnValue(res);
  res.clearCookie = mock.fn().mockReturnValue(res);
  res.redirect = mock.fn().mockReturnValue(res);
  res.render = mock.fn().mockReturnValue(res);
  return res;
};

const mockNext = mock.fn();

// Mock pour les middlewares
const mockMiddlewares = {
  auth: mock.fn((req, res, next) => {
    req.user = mockDatabaseData.users[0];
    next();
  }),

  admin: mock.fn((req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
      next();
    } else {
      res.status(403).json(mockHttpResponses.forbidden());
    }
  }),

  rateLimit: mock.fn((req, res, next) => {
    next();
  })
};

// Fonction pour réinitialiser tous les mocks
const resetAllMocks = () => {
  Object.values(mockServices).forEach(service => {
    Object.values(service).forEach(mockFn => {
      if (typeof mockFn.mockReset === 'function') {
        mockFn.mockReset();
      }
    });
  });
  
  Object.values(mockMiddlewares).forEach(middleware => {
    if (typeof middleware.mockReset === 'function') {
      middleware.mockReset();
    }
  });
};

module.exports = {
  mockServices,
  mockHttpResponses,
  mockDatabaseData,
  mockErrors,
  mockTokens,
  mockRequest,
  mockResponse,
  mockNext,
  mockMiddlewares,
  resetAllMocks
};
