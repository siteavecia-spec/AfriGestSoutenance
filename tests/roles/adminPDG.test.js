// Tests spécifiques pour le rôle Admin/PDG
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestUser, createTestCompany, createTestStore } = require('../helpers/testHelpers');

describe('👔 Tests Admin/PDG - Permissions et fonctionnalités', () => {
  
  let authToken = '';
  let adminUser = null;
  let testCompany = null;
  let testStore = null;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    
    // Créer une entreprise et un admin/PDG
    testCompany = await createTestCompany();
    testStore = await createTestStore({ company: testCompany });
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    adminUser = new User({
      firstName: 'Admin',
      lastName: 'PDG',
      email: `admin.pdg.${timestamp}.${randomId}@test.com`,
      password: 'password123',
      role: 'super_admin'
      // Super admin n'a pas besoin de company ni store
    });
    await adminUser.save();
    console.log('✅ Utilisateur admin créé:', adminUser.email, 'Role:', adminUser.role);
    
    // Connexion pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'password123'
      });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', loginResponse.body);
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('🏢 Gestion de son entreprise', () => {
    
    test('Doit pouvoir modifier les informations de son entreprise', async () => {
      const updateData = {
        name: 'Updated Company Name by Admin',
        phone: '+221701234568',
        address: 'Nouvelle adresse, Dakar'
      };

      const response = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.company.name).toBe(updateData.name);
    });

    test('Doit pouvoir voir les informations de son entreprise', async () => {
      const response = await request(app)
        .get(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.company._id).toBe(testCompany._id.toString());
    });

    test('Ne doit PAS pouvoir modifier d\'autres entreprises', async () => {
      const otherCompany = await createTestCompany();
      
      const updateData = {
        name: 'Hacked Company Name'
      };

      const response = await request(app)
        .put(`/api/companies/${otherCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('🏪 Gestion des boutiques', () => {
    
    test('Doit pouvoir créer de nouvelles boutiques pour son entreprise', async () => {
      const storeData = {
        name: 'Nouvelle Boutique Admin',
        address: 'Nouvelle adresse boutique',
        phone: '+221701234569',
        company: testCompany._id
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.store.name).toBe(storeData.name);
    });

    test('Doit pouvoir lister toutes les boutiques de son entreprise', async () => {
      const response = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.stores)).toBe(true);
    });

    test('Doit pouvoir modifier les boutiques de son entreprise', async () => {
      const updateData = {
        name: 'Boutique Modifiée par Admin',
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
  });

  describe('👥 Gestion des utilisateurs de son entreprise', () => {
    
    test('Doit pouvoir créer des utilisateurs pour son entreprise', async () => {
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

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.company.toString()).toBe(testCompany._id.toString());
    });

    test('Doit pouvoir lister tous les utilisateurs de son entreprise', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('Doit pouvoir modifier les utilisateurs de son entreprise', async () => {
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

      const updateData = {
        role: 'store_manager',
        isActive: true
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('store_manager');
    });

    test('Ne doit PAS pouvoir voir les utilisateurs d\'autres entreprises', async () => {
      const otherCompany = await createTestCompany();
      const otherStore = await createTestStore(otherCompany._id);
      
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User',
        email: 'other.user@test.com',
        password: 'password123',
        role: 'employee',
        company: otherCompany._id,
        store: otherStore._id
      });
      await otherUser.save();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const userEmails = response.body.users.map(u => u.email);
      expect(userEmails).not.toContain('other.user@test.com');
    });
  });

  describe('📊 Accès aux rapports de son entreprise', () => {
    
    test('Doit pouvoir accéder au dashboard de son entreprise', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir accéder aux rapports comptables de son entreprise', async () => {
      const response = await request(app)
        .get('/api/accounting/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Doit pouvoir voir les statistiques de ses boutiques', async () => {
      const response = await request(app)
        .get(`/api/stores/${testStore._id}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('🔒 Limitations de permissions', () => {
    
    test('Ne doit PAS pouvoir créer d\'autres super admins', async () => {
      const superAdminData = {
        firstName: 'Fake',
        lastName: 'Super Admin',
        email: 'fake.superadmin@test.com',
        password: 'password123',
        role: 'super_admin',
        company: testCompany._id,
        store: testStore._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(superAdminData);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir accéder aux statistiques globales', async () => {
      const response = await request(app)
        .get('/api/dashboard/global-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    test('Ne doit PAS pouvoir supprimer son entreprise', async () => {
      const response = await request(app)
        .delete(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });
});
