// Tests spécifiques pour le rôle Employee (Employé)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestUser, createTestCompany, createTestStore } = require('../helpers/testHelpers');

describe('👷 Tests Employee - Permissions et fonctionnalités', () => {
  
  let authToken = '';
  let employeeUser = null;
  let testCompany = null;
  let testStore = null;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    
    // Créer une entreprise et un employé
    testCompany = await createTestCompany();
    testStore = await createTestStore(testCompany._id);
    
    employeeUser = new User({
      firstName: 'Employee',
      lastName: 'Test',
      email: 'employee@test.com',
      password: 'password123',
      role: 'employee',
      company: testCompany._id,
      store: testStore._id
    });
    await employeeUser.save();
    
    // Connexion pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: employeeUser.email,
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('💰 Gestion des ventes (permissions limitées)', () => {
    
    test('Doit pouvoir créer des ventes', async () => {
      const saleData = {
        customer: {
          name: 'Client Test Employee',
          phone: '+221701234573'
        },
        items: [
          {
            name: 'Produit Test',
            quantity: 1,
            price: 1000
          }
        ],
        paymentMethod: 'cash',
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.sale.customer.name).toBe(saleData.customer.name);
    });

    test('Doit pouvoir lister ses propres ventes', async () => {
      const response = await request(app)
        .get('/api/sales/my-sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.sales)).toBe(true);
    });

    test('Doit pouvoir voir les détails de ses ventes', async () => {
      // Créer une vente d'abord
      const saleData = {
        customer: {
          name: 'Client Test',
          phone: '+221701234574'
        },
        items: [
          {
            name: 'Produit Test',
            quantity: 1,
            price: 1000
          }
        ],
        paymentMethod: 'card',
        store: testStore._id
      };

      const createResponse = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleData);

      const saleId = createResponse.body.sale._id;

      // Voir les détails
      const response = await request(app)
        .get(`/api/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sale._id).toBe(saleId);
    });

    test('Ne doit PAS pouvoir voir les ventes d\'autres employés', async () => {
      // Créer un autre employé
      const otherEmployee = new User({
        firstName: 'Other',
        lastName: 'Employee',
        email: 'other.employee@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await otherEmployee.save();

      // Connexion de l'autre employé
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: otherEmployee.email,
          password: 'password123'
        });

      const otherToken = otherLoginResponse.body.token;

      // Créer une vente avec l'autre employé
      const saleData = {
        customer: {
          name: 'Client Autre Employé',
          phone: '+221701234575'
        },
        items: [
          {
            name: 'Produit Test',
            quantity: 1,
            price: 1000
          }
        ],
        paymentMethod: 'cash',
        store: testStore._id
      };

      const createResponse = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(saleData);

      const saleId = createResponse.body.sale._id;

      // Essayer de voir cette vente avec le premier employé
      const response = await request(app)
        .get(`/api/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('📦 Gestion de l\'inventaire (lecture seule)', () => {
    
    test('Doit pouvoir lister les produits de sa boutique', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    test('Doit pouvoir voir les détails d\'un produit', async () => {
      // Créer un produit d'abord (par un manager)
      const manager = new User({
        firstName: 'Manager',
        lastName: 'Test',
        email: 'manager@test.com',
        password: 'password123',
        role: 'store_manager',
        company: testCompany._id,
        store: testStore._id
      });
      await manager.save();

      const managerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: manager.email,
          password: 'password123'
        });

      const managerToken = managerLoginResponse.body.token;

      const productData = {
        name: 'Produit Test Employee',
        description: 'Produit de test',
        price: 1000,
        cost: 500,
        stock: 50,
        minStock: 10,
        store: testStore._id
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(productData);

      const productId = createResponse.body.product._id;

      // L'employé peut voir le produit
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.product._id).toBe(productId);
    });

    test('Ne doit PAS pouvoir créer de nouveaux produits', async () => {
      const productData = {
        name: 'Produit Non Autorisé',
        description: 'Produit créé par employé',
        price: 1000,
        cost: 500,
        stock: 50,
        minStock: 10,
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir modifier les produits', async () => {
      // Créer un produit d'abord (par un manager)
      const manager = new User({
        firstName: 'Manager',
        lastName: 'Test',
        email: 'manager2@test.com',
        password: 'password123',
        role: 'store_manager',
        company: testCompany._id,
        store: testStore._id
      });
      await manager.save();

      const managerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: manager.email,
          password: 'password123'
        });

      const managerToken = managerLoginResponse.body.token;

      const productData = {
        name: 'Produit Test',
        description: 'Produit de test',
        price: 1000,
        cost: 500,
        stock: 50,
        minStock: 10,
        store: testStore._id
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(productData);

      const productId = createResponse.body.product._id;

      // L'employé ne peut pas modifier
      const updateData = {
        price: 1200
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('👤 Gestion de son profil', () => {
    
    test('Doit pouvoir voir son propre profil', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(employeeUser.email);
    });

    test('Doit pouvoir modifier son propre profil', async () => {
      const updateData = {
        firstName: 'Employee Modifié',
        phone: '+221701234576'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe(updateData.firstName);
    });

    test('Ne doit PAS pouvoir modifier son rôle', async () => {
      const updateData = {
        role: 'manager'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('🔒 Limitations strictes de permissions', () => {
    
    test('Ne doit PAS pouvoir accéder aux informations de l\'entreprise', async () => {
      const response = await request(app)
        .get(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir voir les autres employés', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir accéder aux rapports', async () => {
      const response = await request(app)
        .get('/api/sales/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir accéder aux statistiques', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir créer des utilisateurs', async () => {
      const userData = {
        firstName: 'Nouvel',
        lastName: 'Utilisateur',
        email: 'nouvel.utilisateur@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir supprimer des données', async () => {
      // Créer une vente d'abord
      const saleData = {
        customer: {
          name: 'Client Test',
          phone: '+221701234577'
        },
        items: [
          {
            name: 'Produit Test',
            quantity: 1,
            price: 1000
          }
        ],
        paymentMethod: 'cash',
        store: testStore._id
      };

      const createResponse = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleData);

      const saleId = createResponse.body.sale._id;

      // Essayer de supprimer
      const response = await request(app)
        .delete(`/api/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('📱 Fonctionnalités de base autorisées', () => {
    
    test('Doit pouvoir voir les informations de sa boutique', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir voir les produits en rupture de stock', async () => {
      const response = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir rechercher des produits', async () => {
      const response = await request(app)
        .get('/api/products/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
