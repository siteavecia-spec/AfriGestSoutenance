// Tests spécifiques pour le rôle Super Admin
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestSuperAdmin, createTestCompany, createTestStore } = require('../helpers/testHelpers');

describe('👑 Tests Super Admin - Permissions et fonctionnalités', () => {
  
  let authToken = '';
  let superAdmin = null;

  beforeAll(async () => {
    // Ne pas se reconnecter si déjà connecté
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    }
    
    // Créer un super admin pour les tests
    superAdmin = await createTestSuperAdmin();
    
    // Connexion pour obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: superAdmin.email,
        password: 'admin123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('🏢 Gestion des entreprises', () => {
    
    test('Doit pouvoir créer une nouvelle entreprise', async () => {
      const companyData = {
        name: 'Test Company Super Admin',
        email: 'test@superadmin.com',
        phone: '+221701234567',
        address: 'Dakar, Sénégal',
        subscriptionPlan: 'premium',
        createdBy: superAdmin._id
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(companyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.company.name).toBe(companyData.name);
      expect(response.body.company.subscriptionPlan).toBe('premium');
    });

    test('Doit pouvoir lister toutes les entreprises', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.companies)).toBe(true);
    });

    test('Doit pouvoir modifier n\'importe quelle entreprise', async () => {
      const company = await createTestCompany({ createdBy: superAdmin._id });
      
      const updateData = {
        name: 'Updated Company Name',
        subscriptionPlan: 'enterprise'
      };

      const response = await request(app)
        .put(`/api/companies/${company._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.company.name).toBe(updateData.name);
      expect(response.body.company.subscriptionPlan).toBe('enterprise');
    });

    test('Doit pouvoir supprimer n\'importe quelle entreprise', async () => {
      const company = await createTestCompany({ createdBy: superAdmin._id });
      
      const response = await request(app)
        .delete(`/api/companies/${company._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('👥 Gestion des utilisateurs', () => {
    
    test('Doit pouvoir créer des utilisateurs pour n\'importe quelle entreprise', async () => {
      const company = await createTestCompany({ createdBy: superAdmin._id });
      const store = await createTestStore({ company: company._id });
      
      const userData = {
        firstName: 'Super Admin',
        lastName: 'User',
        email: 'superadmin.user@test.com',
        password: 'password123',
        role: 'admin',
        company: company._id,
        store: store._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('admin');
    });

    test('Doit pouvoir lister tous les utilisateurs de toutes les entreprises', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('Doit pouvoir modifier n\'importe quel utilisateur', async () => {
      const company = await createTestCompany({ createdBy: superAdmin._id });
      const store = await createTestStore({ company: company._id });
      
      const user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@test.com',
        password: 'password123',
        role: 'employee',
        company: company._id,
        store: store._id
      });
      await user.save();

      const updateData = {
        role: 'store_manager',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('store_manager');
      expect(response.body.user.isActive).toBe(false);
    });
  });

  describe('📊 Accès aux rapports globaux', () => {
    
    test('Doit pouvoir accéder aux statistiques globales', async () => {
      const response = await request(app)
        .get('/api/dashboard/global-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });

    test('Doit pouvoir accéder aux rapports comptables globaux', async () => {
      const response = await request(app)
        .get('/api/accounting/global-reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('🔒 Permissions spéciales', () => {
    
    test('Doit pouvoir accéder à toutes les routes protégées', async () => {
      const protectedRoutes = [
        '/api/companies',
        '/api/users',
        '/api/stores',
        '/api/dashboard/global-stats',
        '/api/accounting/global-reports'
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).not.toBe(403);
      }
    });

    test('Doit pouvoir créer d\'autres super admins', async () => {
      const newSuperAdminData = {
        firstName: 'New',
        lastName: 'Super Admin',
        email: 'new.superadmin@test.com',
        password: 'password123',
        role: 'super_admin'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSuperAdminData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('super_admin');
    });
  });
});
