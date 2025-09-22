// Tests spécifiques pour le rôle Manager
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestUser, createTestCompany, createTestStore } = require('../helpers/testHelpers');

describe('👨‍💼 Tests Manager - Permissions et fonctionnalités', () => {
  
  let authToken = '';
  let managerUser = null;
  let testCompany = null;
  let testStore = null;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    
    // Créer une entreprise et un manager
    testCompany = await createTestCompany();
    testStore = await createTestStore({ company: testCompany });
    
    managerUser = new User({
      firstName: 'Manager',
      lastName: 'Test',
      email: 'manager@test.com',
      password: 'password123',
      role: 'store_manager',
      company: testCompany._id,
      store: testStore._id
    });
    await managerUser.save();
    
    // Connexion pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: managerUser.email,
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('🏪 Gestion de sa boutique', () => {
    
    test('Doit pouvoir voir les informations de sa boutique', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store._id).toBe(testStore._id.toString());
    });

    test('Doit pouvoir modifier les informations de sa boutique', async () => {
      const updateData = {
        name: 'Boutique Modifiée par Manager',
        phone: '+221701234570'
      };

      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe(updateData.name);
    });

    test('Ne doit PAS pouvoir modifier d\'autres boutiques', async () => {
      const otherStore = await createTestStore(testCompany._id);
      
      const updateData = {
        name: 'Boutique Hackée'
      };

      const response = await request(app)
        .put(`/api/stores/${otherStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('👥 Gestion des employés de sa boutique', () => {
    
    test('Doit pouvoir créer des employés pour sa boutique', async () => {
      const employeeData = {
        firstName: 'Nouvel',
        lastName: 'Employé',
        email: 'nouvel.employe@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.store.toString()).toBe(testStore._id.toString());
    });

    test('Doit pouvoir lister les employés de sa boutique', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('Doit pouvoir modifier les employés de sa boutique', async () => {
      const employee = new User({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await employee.save();

      const updateData = {
        isActive: false
      };

      const response = await request(app)
        .put(`/api/users/${employee._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.isActive).toBe(false);
    });

    test('Ne doit PAS pouvoir créer des managers ou admins', async () => {
      const managerData = {
        firstName: 'Fake',
        lastName: 'Manager',
        email: 'fake.manager@test.com',
        password: 'password123',
        role: 'store_manager',
        company: testCompany._id,
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(managerData);

      expect(response.status).toBe(403);
    });
  });

  describe('📦 Gestion de l\'inventaire', () => {
    
    test('Doit pouvoir lister les produits de sa boutique', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    test('Doit pouvoir créer de nouveaux produits', async () => {
      const productData = {
        name: 'Nouveau Produit Manager',
        description: 'Produit créé par le manager',
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

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe(productData.name);
    });

    test('Doit pouvoir modifier les produits de sa boutique', async () => {
      // Créer un produit d'abord
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
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      const productId = createResponse.body.product._id;

      // Modifier le produit
      const updateData = {
        price: 1200,
        stock: 60
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.product.price).toBe(updateData.price);
    });
  });

  describe('💰 Gestion des ventes', () => {
    
    test('Doit pouvoir créer des ventes', async () => {
      const saleData = {
        customer: {
          name: 'Client Test Manager',
          phone: '+221701234571'
        },
        items: [
          {
            name: 'Produit Test',
            quantity: 2,
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

    test('Doit pouvoir lister les ventes de sa boutique', async () => {
      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.sales)).toBe(true);
    });

    test('Doit pouvoir voir les détails d\'une vente', async () => {
      // Créer une vente d'abord
      const saleData = {
        customer: {
          name: 'Client Test',
          phone: '+221701234572'
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
  });

  describe('📊 Accès aux rapports de sa boutique', () => {
    
    test('Doit pouvoir accéder aux statistiques de sa boutique', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux rapports de ventes de sa boutique', async () => {
      const response = await request(app)
        .get('/api/sales/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux rapports d\'inventaire de sa boutique', async () => {
      const response = await request(app)
        .get('/api/products/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('🔒 Limitations de permissions', () => {
    
    test('Ne doit PAS pouvoir accéder aux informations de l\'entreprise', async () => {
      const response = await request(app)
        .get(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir voir les autres boutiques', async () => {
      const otherStore = await createTestStore(testCompany._id);
      
      const response = await request(app)
        .get(`/api/stores/${otherStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir accéder aux rapports globaux', async () => {
      const response = await request(app)
        .get('/api/dashboard/global-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir supprimer des données importantes', async () => {
      const employee = new User({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await employee.save();

      const response = await request(app)
        .delete(`/api/users/${employee._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });
});
