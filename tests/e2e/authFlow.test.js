// Tests end-to-end pour le flux d'authentification
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const { createTestUser, createTestSuperAdmin, cleanupTestData } = require('../helpers/testHelpers');

describe('🔄 Tests E2E - Flux d\'authentification', () => {
  
  beforeAll(async () => {
    // Connexion à la base de données de test
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('🔐 Flux complet de connexion', () => {
    
    test('Doit permettre la connexion d\'un super admin', async () => {
      // Créer un super admin
      const superAdmin = await createTestSuperAdmin();
      
      // Tentative de connexion
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: superAdmin.email,
          password: 'admin123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.email).toBe(superAdmin.email);
      expect(loginResponse.body.user.role).toBe('super_admin');
    });

    test('Doit échouer avec des identifiants incorrects', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.message).toContain('Identifiants');
    });

    test('Doit échouer avec un mot de passe incorrect', async () => {
      const user = await createTestUser();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.success).toBe(false);
    });

    test('Doit échouer sans email', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.body.success).toBe(false);
    });

    test('Doit échouer sans mot de passe', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
        });

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.body.success).toBe(false);
    });
  });

  describe('🔑 Vérification du token', () => {
    
    test('Doit permettre l\'accès avec un token valide', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe(user.email);
      expect(meResponse.body.user.role).toBe(user.role);
    });

    test('Doit échouer sans token', async () => {
      const meResponse = await request(app)
        .get('/api/auth/me');

      expect(meResponse.status).toBe(401);
      expect(meResponse.body.success).toBe(false);
    });

    test('Doit échouer avec un token invalide', async () => {
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(meResponse.status).toBe(401);
      expect(meResponse.body.success).toBe(false);
    });

    test('Doit échouer avec un token expiré', async () => {
      // Créer un token expiré (simulation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YjEyMzQ1Njc4OWFiY2RlZiIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTY4OTU2MDAwMCwiZXhwIjoxNjg5NTYwMDAwfQ.expired-signature';
      
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(meResponse.status).toBe(401);
      expect(meResponse.body.success).toBe(false);
    });
  });

  describe('🔄 Flux de déconnexion', () => {
    
    test('Doit permettre la déconnexion', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toContain('Déconnexion');
    });

    test('Doit échouer la déconnexion sans token', async () => {
      const logoutResponse = await request(app)
        .post('/api/auth/logout');

      expect(logoutResponse.status).toBe(401);
      expect(logoutResponse.body.success).toBe(false);
    });
  });

  describe('🔒 Protection des routes', () => {
    
    test('Doit protéger les routes nécessitant une authentification', async () => {
      // Tenter d'accéder à une route protégée sans token
      const protectedResponse = await request(app)
        .get('/api/companies');

      expect(protectedResponse.status).toBe(401);
      expect(protectedResponse.body.success).toBe(false);
    });

    test('Doit permettre l\'accès aux routes protégées avec un token valide', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const protectedResponse = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${token}`);

      expect(protectedResponse.status).toBe(200);
    });

    test('Doit protéger les routes admin', async () => {
      const user = await createTestUser({ role: 'employee' });
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      // Tenter d'accéder à une route admin avec un utilisateur non-admin
      const adminResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(adminResponse.status).toBe(403);
      expect(adminResponse.body.success).toBe(false);
    });

    test('Doit permettre l\'accès aux routes admin pour les super admins', async () => {
      const superAdmin = await createTestSuperAdmin();
      const { token } = await createAuthenticatedUser({ 
        email: superAdmin.email,
        role: 'super_admin'
      });
      
      const adminResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(adminResponse.status).toBe(200);
    });
  });

  describe('🔄 Flux de changement de mot de passe', () => {
    
    test('Doit permettre le changement de mot de passe', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.success).toBe(true);
    });

    test('Doit échouer avec l\'ancien mot de passe incorrect', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(changePasswordResponse.status).toBe(400);
      expect(changePasswordResponse.body.success).toBe(false);
    });

    test('Doit échouer sans l\'ancien mot de passe', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newPassword: 'newpassword123'
        });

      expect(changePasswordResponse.status).toBe(400);
      expect(changePasswordResponse.body.success).toBe(false);
    });

    test('Doit échouer sans le nouveau mot de passe', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123'
        });

      expect(changePasswordResponse.status).toBe(400);
      expect(changePasswordResponse.body.success).toBe(false);
    });
  });

  describe('🔄 Flux de réinitialisation de mot de passe', () => {
    
    test('Doit permettre la demande de réinitialisation de mot de passe', async () => {
      const user = await createTestUser();
      
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: user.email
        });

      expect(resetRequestResponse.status).toBe(200);
      expect(resetRequestResponse.body.success).toBe(true);
      expect(resetRequestResponse.body.message).toContain('réinitialisation');
    });

    test('Doit échouer avec un email inexistant', async () => {
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      expect(resetRequestResponse.status).toBe(404);
      expect(resetRequestResponse.body.success).toBe(false);
    });

    test('Doit échouer sans email', async () => {
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(resetRequestResponse.status).toBe(400);
      expect(resetRequestResponse.body.success).toBe(false);
    });
  });

  describe('🔄 Flux de session', () => {
    
    test('Doit maintenir la session active', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      // Première requête
      const firstRequest = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(firstRequest.status).toBe(200);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deuxième requête
      const secondRequest = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(secondRequest.status).toBe(200);
      expect(secondRequest.body.user.email).toBe(user.email);
    });

    test('Doit gérer les requêtes concurrentes', async () => {
      const user = await createTestUser();
      const { token } = await createAuthenticatedUser({ email: user.email });
      
      // Faire plusieurs requêtes en parallèle
      const promises = Array(5).fill().map(() => 
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(user.email);
      });
    });
  });
});
