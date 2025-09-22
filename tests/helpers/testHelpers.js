// Utilitaires et helpers pour les tests
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const Product = require('../../server/models/Product');
const Sale = require('../../server/models/Sale');

/**
 * Génère un token JWT pour les tests
 */
const generateTestToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
};

/**
 * Crée un utilisateur de test
 */
const createTestUser = async (userData = {}) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test.${timestamp}.${randomId}@example.com`,
    password: 'password123',
    role: 'super_admin', // Par défaut super_admin pour éviter les champs requis
    ...userData
  };

  const user = new User(defaultUser);
  await user.save();
  return user;
};

/**
 * Crée une entreprise de test
 */
const createTestCompany = async (companyData = {}) => {
  // Créer un utilisateur créateur si pas fourni
  let createdBy = companyData.createdBy;
  if (!createdBy) {
    const creator = await createTestUser({ role: 'super_admin' });
    createdBy = creator._id;
  }

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const defaultCompany = {
    name: `Test Company ${timestamp} ${randomId}`,
    description: 'Entreprise de test',
    address: {
      street: '123 Rue Test',
      city: 'Conakry',
      state: 'Conakry',
      postalCode: '001',
      country: 'Guinée'
    },
    phone: '+221 77 123 45 67',
    email: `test.${timestamp}.${randomId}@company.com`,
    createdBy: createdBy,
    ...companyData
  };

  const company = new Company(defaultCompany);
  await company.save();
  return company;
};

/**
 * Crée une boutique de test
 */
const createTestStore = async (storeData = {}) => {
  const company = storeData.company || await createTestCompany();
  const createdBy = storeData.createdBy || await createTestUser({ role: 'super_admin' });
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const defaultStore = {
    name: `Test Store ${timestamp} ${randomId}`,
    code: `T${randomId.substring(0, 4)}`, // Code court de 5 caractères max
    description: 'Boutique de test',
    companyId: company._id,
    email: `store.${timestamp}.${randomId}@test.com`,
    phone: '+221 77 987 65 43',
    address: {
      street: '456 Avenue Test',
      city: 'Conakry',
      country: 'Guinée'
    },
    createdBy: createdBy._id,
    ...storeData
  };

  const store = new Store(defaultStore);
  await store.save();
  return store;
};

/**
 * Crée un produit de test
 */
const createTestProduct = async (productData = {}) => {
  const store = productData.store || await createTestStore();
  
  const defaultProduct = {
    name: 'Test Product',
    description: 'Produit de test',
    price: 1000,
    quantity: 10,
    minQuantity: 2,
    store: store._id,
    ...productData
  };

  const product = new Product(defaultProduct);
  await product.save();
  return product;
};

/**
 * Crée une vente de test
 */
const createTestSale = async (saleData = {}) => {
  const store = saleData.store || await createTestStore();
  
  const defaultSale = {
    customer: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+221 77 111 22 33'
    },
    items: [{
      name: 'Test Product',
      quantity: 1,
      price: 1000,
      total: 1000
    }],
    total: 1000,
    paymentMethod: 'cash',
    store: store._id,
    ...saleData
  };

  const sale = new Sale(defaultSale);
  await sale.save();
  return sale;
};

/**
 * Nettoie toutes les collections de test
 */
const cleanupTestData = async () => {
  const collections = mongoose.connection.collections;
  const testCollections = ['users', 'companies', 'stores', 'products', 'sales'];
  
  for (const collectionName of testCollections) {
    if (collections[collectionName]) {
      await collections[collectionName].deleteMany({});
    }
  }
};

/**
 * Crée un super admin de test
 */
const createTestSuperAdmin = async () => {
  const superAdmin = new User({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'super_admin'
  });
  await superAdmin.save();
  return superAdmin;
};

/**
 * Crée un utilisateur avec token pour les tests d'authentification
 */
const createAuthenticatedUser = async (userData = {}) => {
  const user = await createTestUser(userData);
  const token = generateTestToken(user);
  return { user, token };
};

/**
 * Crée un contexte complet de test (entreprise + boutique + utilisateur)
 */
const createTestContext = async () => {
  const company = await createTestCompany();
  const store = await createTestStore({ company: company._id });
  const user = await createTestUser({ 
    company: company._id, 
    store: store._id,
    role: 'store_manager'
  });
  const token = generateTestToken(user);
  
  return { company, store, user, token };
};

/**
 * Attend qu'une condition soit vraie
 */
const waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
};

/**
 * Génère des données de test aléatoires
 */
const generateRandomData = {
  email: () => `test${Math.random().toString(36).substr(2, 9)}@example.com`,
  phone: () => `+221 77 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
  name: () => `Test ${Math.random().toString(36).substr(2, 5)}`,
  price: () => Math.floor(Math.random() * 10000) + 1000,
  quantity: () => Math.floor(Math.random() * 100) + 1
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestCompany,
  createTestStore,
  createTestProduct,
  createTestSale,
  cleanupTestData,
  createTestSuperAdmin,
  createAuthenticatedUser,
  createTestContext,
  waitFor,
  generateRandomData
};
