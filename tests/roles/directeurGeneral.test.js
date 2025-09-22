// Tests spécifiques pour le rôle Directeur Général (DG)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestUser, createTestCompany, createTestStore } = require('../helpers/testHelpers');

describe('🎯 Tests Directeur Général (DG) - Permissions et fonctionnalités', () => {
  
  let authToken = '';
  let dgUser = null;
  let testCompany = null;
  let testStore = null;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    
    // Créer une entreprise et un DG
    testCompany = await createTestCompany();
    testStore = await createTestStore(testCompany._id);
    
    dgUser = new User({
      firstName: 'Directeur',
      lastName: 'Général',
      email: 'dg@test.com',
      password: 'password123',
      role: 'dg',
      company: testCompany._id,
      store: testStore._id
    });
    await dgUser.save();
    
    // Connexion pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: dgUser.email,
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('📊 Accès aux rapports et statistiques', () => {
    
    test('Doit pouvoir accéder au dashboard de son entreprise', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });

    test('Doit pouvoir accéder aux rapports comptables', async () => {
      const response = await request(app)
        .get('/api/accounting/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir voir les statistiques détaillées des ventes', async () => {
      const response = await request(app)
        .get('/api/sales/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux rapports de performance des boutiques', async () => {
      const response = await request(app)
        .get('/api/stores/performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('👥 Gestion des utilisateurs (lecture seule)', () => {
    
    test('Doit pouvoir lister les utilisateurs de son entreprise', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('Doit pouvoir voir les détails d\'un utilisateur', async () => {
      const user = new User({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await user.save();

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user._id).toBe(user._id.toString());
    });

    test('Ne doit PAS pouvoir créer de nouveaux utilisateurs', async () => {
      const userData = {
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
        .send(userData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir modifier les utilisateurs', async () => {
      const user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await user.save();

      const updateData = {
        role: 'store_manager'
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('🏪 Gestion des boutiques (lecture seule)', () => {
    
    test('Doit pouvoir lister les boutiques de son entreprise', async () => {
      const response = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.stores)).toBe(true);
    });

    test('Doit pouvoir voir les détails d\'une boutique', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store._id).toBe(testStore._id.toString());
    });

    test('Ne doit PAS pouvoir créer de nouvelles boutiques', async () => {
      const storeData = {
        name: 'Nouvelle Boutique DG',
        address: 'Nouvelle adresse',
        phone: '+221701234569',
        company: testCompany._id
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir modifier les boutiques', async () => {
      const updateData = {
        name: 'Boutique Modifiée par DG'
      };

      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('📈 Accès aux analyses et rapports avancés', () => {
    
    test('Doit pouvoir accéder aux analyses de tendances', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux rapports de rentabilité', async () => {
      const response = await request(app)
        .get('/api/analytics/profitability')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux comparaisons de performance', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('🔒 Limitations de permissions', () => {
    
    test('Ne doit PAS pouvoir modifier les informations de l\'entreprise', async () => {
      const updateData = {
        name: 'Entreprise Modifiée par DG'
      };

      const response = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir accéder aux statistiques globales', async () => {
      const response = await request(app)
        .get('/api/dashboard/global-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir supprimer des données', async () => {
      const user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@test.com',
        password: 'password123',
        role: 'employee',
        company: testCompany._id,
        store: testStore._id
      });
      await user.save();

      const response = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('📋 Accès aux rapports d\'export', () => {
    
    test('Doit pouvoir exporter les rapports de ventes', async () => {
      const response = await request(app)
        .get('/api/reports/export/sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir exporter les rapports comptables', async () => {
      const response = await request(app)
        .get('/api/reports/export/accounting')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir exporter les rapports d\'inventaire', async () => {
      const response = await request(app)
        .get('/api/reports/export/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
