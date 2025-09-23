const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Configuration pour le proxy (nécessaire pour express-rate-limit)
app.set('trust proxy', 1);

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting (strict in production, relaxed/disabled in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 10000, // raise cap in prod; very high in dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development, disable rate limit globally to ease testing
    if (process.env.NODE_ENV !== 'production') return true;
    // Never rate-limit health checks or simple GETs in prod
    if (req.method === 'GET') return true;
    if (req.path === '/api/health') return true;
    return false;
  },
});
app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/products', require('./routes/products'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/demo-requests', require('./routes/demoRequests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/public', require('./routes/public'));
app.use('/api', require('./routes/ecommercePrivate'));
app.use('/api/public', require('./routes/ecommercePublic'));
app.use('/api/referrals', require('./routes/referrals'));

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'AfriGest API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
