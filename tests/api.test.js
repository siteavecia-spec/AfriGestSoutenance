const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server/app'); // Utiliser directement l'app Express
const Product = require('../server/models/Product');
const User = require('../server/models/User');
const Company = require('../server/models/Company');
const Store = require('../server/models/Store');

// Configuration des tests
const API_BASE = 'http://localhost:5000/api';
let authToken = '';
let testCompanyId = '';
let testStoreId = '';

describe('🧪 Tests API AfriGest', () => {
  
  beforeAll(async () => {
    // Vérifier si déjà connecté
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest');
      console.log('✅ Connecté à MongoDB pour les tests');
    } else {
      console.log('✅ MongoDB déjà connecté pour les tests');
    }

    // Créer un utilisateur super admin pour les tests
    try {
      // Supprimer l'utilisateur admin s'il existe déjà
      await User.deleteOne({ email: 'admin@afrigest.com' });
      
      // Créer un utilisateur super admin
      const adminUser = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@afrigest.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true,
        isEmailVerified: true
      });
      
      await adminUser.save();
      console.log('✅ Utilisateur super admin créé pour les tests');
      console.log('User ID:', adminUser._id);
      console.log('User role:', adminUser.role);
      console.log('User isActive:', adminUser.isActive);
    } catch (error) {
      console.log('⚠️ Erreur lors de la création de l\'utilisateur admin:', error.message);
      console.log('Error details:', error);
    }
  });

  afterAll(async () => {
    // Nettoyage après les tests
    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée');
  });

  describe('🔐 Tests d\'authentification', () => {
    
    test('POST /api/auth/login - Connexion super admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@afrigest.com',
          password: 'admin123'
        });

      console.log('Response status:', response.status);
      console.log('Response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('super_admin');
      
      authToken = response.body.token;
      console.log('✅ Connexion super admin réussie');
    });

    test('POST /api/auth/login - Connexion avec mauvais mot de passe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@afrigest.com',
          password: 'mauvais_mot_de_passe'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Email ou mot de passe incorrect');
      console.log('✅ Test échec connexion réussi');
    });

    test('GET /api/auth/me - Vérification du token', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        // Créer un token de test si nécessaire
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('admin@afrigest.com');
      expect(response.body.user.role).toBe('super_admin');
      console.log('✅ Vérification token réussie');
    });
  });

  describe('🏢 Tests gestion des entreprises', () => {
    
    test('GET /api/companies - Lister les entreprises', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.companies)).toBe(true);
      console.log('✅ Liste des entreprises récupérée');
    });

    test('POST /api/companies - Créer une nouvelle entreprise', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      const newCompany = {
        name: 'Test Company',
        description: 'Entreprise de test',
        address: '123 Rue Test',
        phone: '+221 77 123 45 67',
        email: 'test@company.com'
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      // Log pour débogage
      if (response.status !== 201) {
        console.log('❌ Erreur dans POST /api/companies:');
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));
        console.log('Request data:', JSON.stringify(newCompany, null, 2));
        console.log('Auth token exists:', !!authToken);
        console.log('Auth token:', authToken);
      }

      expect(response.status).toBe(201);
      expect(response.body.company.name).toBe(newCompany.name);
      expect(response.body.company._id).toBeDefined();
      
      testCompanyId = response.body.company._id;
      console.log('✅ Nouvelle entreprise créée');
    });

    test('GET /api/companies/:id - Récupérer une entreprise', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      // Créer une entreprise pour ce test
      const newCompany = {
        name: 'Test Company for GET',
        description: 'Entreprise de test pour GET',
        address: '123 Rue Test GET',
        phone: '+221 77 123 45 68',
        email: 'testget@company.com'
      };

      const createResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      const companyId = createResponse.body.company._id;

      const response = await request(app)
        .get(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.company._id).toBe(companyId);
      expect(response.body.company.name).toBe(newCompany.name);
      console.log('✅ Entreprise récupérée par ID');
    });

    test('PUT /api/companies/:id - Modifier une entreprise', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      // Créer une entreprise pour ce test
      const newCompany = {
        name: 'Test Company for PUT',
        description: 'Entreprise de test pour PUT',
        address: '123 Rue Test PUT',
        phone: '+221 77 123 45 69',
        email: 'testput@company.com'
      };

      const createResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      const companyId = createResponse.body.company._id;

      const updateData = {
        name: 'Test Company Updated',
        description: 'Description mise à jour',
        email: 'testput@company.com'
      };

      const response = await request(app)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.company.name).toBe(updateData.name);
      console.log('✅ Entreprise modifiée');
    });
  });

  describe('🏪 Tests gestion des boutiques', () => {
    
    test('POST /api/stores - Créer une nouvelle boutique', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      // Créer une entreprise pour ce test
      const timestamp = Date.now();
      const newCompany = {
        name: `Test Company for Store ${timestamp}`,
        description: 'Entreprise de test pour boutique',
        address: '123 Rue Test Store',
        phone: '+221 77 123 45 70',
        email: `teststore${timestamp}@company.com`
      };

      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      const companyId = createCompanyResponse.body.company._id;

      const newStore = {
        name: `Boutique Test ${timestamp}`,
        address: {
          street: '456 Avenue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 987 65 43',
        companyId: companyId,
        code: `BT${timestamp}`,
        email: `boutique${timestamp}@test.com`
      };

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStore);

      // Log pour débogage
      if (response.status !== 201) {
        console.log('❌ Erreur dans POST /api/stores:');
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));
        console.log('Request data:', JSON.stringify(newStore, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body.store.name).toBe(newStore.name);
      expect(response.body.store.companyId).toBe(companyId);
      
      testStoreId = response.body.store._id;
      console.log('✅ Nouvelle boutique créée');
    });

    test('GET /api/stores - Lister les boutiques', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      const response = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.stores)).toBe(true);
      console.log('✅ Liste des boutiques récupérée');
    });
  });

  describe('👥 Tests gestion des utilisateurs', () => {
    
    test('POST /api/users - Créer un nouvel utilisateur', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      // Créer une entreprise pour ce test
      const timestamp = Date.now();
      const newCompany = {
        name: `Test Company for User ${timestamp}`,
        description: 'Entreprise de test pour utilisateur',
        address: '123 Rue Test User',
        phone: '+221 77 123 45 71',
        email: `testuser${timestamp}@company.com`
      };

      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      const companyId = createCompanyResponse.body.company._id;
      // Créer une boutique pour associer l'utilisateur employé
      const ts = Date.now();
      const storePayload = {
        name: `Boutique User ${ts}`,
        address: { street: 'Rue', city: 'Conakry', country: 'Guinée' },
        phone: '+224 620000000',
        companyId,
        code: `USR${ts}`,
        email: `usr${ts}@test.com`
      };
      const createStoreResp = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storePayload);
      const storeId = createStoreResp.body.store._id;

      const newUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        role: 'employee',
        company: companyId,
        store: storeId // Associer à une boutique valide
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser);

      // Log pour débogage
      if (response.status !== 201) {
        console.log('❌ Erreur dans POST /api/users:');
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));
        console.log('Request data:', JSON.stringify(newUser, null, 2));
        console.log('Auth token exists:', !!authToken);
        console.log('Company ID:', companyId);
      }

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user.role).toBe(newUser.role);
      console.log('✅ Nouvel utilisateur créé');
    });

    test('GET /api/users - Lister les utilisateurs', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.users)).toBe(true);
      console.log('✅ Liste des utilisateurs récupérée');
    });
  });

  describe('🛍️ Tests gestion des ventes', () => {
    
    test('POST /api/sales - Créer une nouvelle vente', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }

      // Créer une entreprise pour ce test
      const newCompany = {
        name: 'Test Company for Sale',
        description: 'Entreprise de test pour vente',
        address: '123 Rue Test Sale',
        phone: '+221 77 123 45 72',
        email: 'testsale@company.com'
      };

      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCompany);

      const companyId = createCompanyResponse.body.company._id;
      // Créer une boutique valide pour les ventes
      const ts = Date.now();
      const storePayload = {
        name: `Boutique Vente ${ts}`,
        address: { street: 'Avenue', city: 'Conakry', country: 'Guinée' },
        phone: '+224 621111111',
        companyId,
        code: `SAL${ts}`,
        email: `sale${ts}@test.com`
      };
      const createStoreResp = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storePayload);
      const storeId = createStoreResp.body.store._id;

      // Créer un produit actif dans cette boutique pour passer les validations
      const adminUser = await User.findOne({ email: 'admin@afrigest.com' });
      const product = await Product.create({
        name: 'Produit Test',
        sku: `SKU${ts}`,
        pricing: { costPrice: 500, sellingPrice: 1000 },
        inventory: { currentStock: 50, minStock: 1, unit: 'piece' },
        tax: { rate: 0, isInclusive: true },
        companyId,
        storeId,
        createdBy: adminUser._id
      });

      const newSale = {
        customer: {
          name: 'Client Test',
          email: 'client@test.com',
          phone: '+221 77 111 22 33'
        },
        items: [
          {
            productId: String(product._id),
            quantity: 2,
            unitPrice: 1000
          }
        ],
        payment: {
          method: 'cash',
          amount: 2000
        },
        storeId: storeId
      };

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSale);

      expect(response.status).toBe(201);
      expect(response.body.sale.totalAmount).toBe(2000);
      const returnedStoreId = response.body.sale.storeId && response.body.sale.storeId._id
        ? response.body.sale.storeId._id
        : response.body.sale.storeId;
      expect(String(returnedStoreId)).toBe(String(storeId));
      console.log('✅ Nouvelle vente créée');
    });

    test('GET /api/sales - Lister les ventes', async () => {
      // S'assurer que nous avons un token
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@afrigest.com',
            password: 'admin123'
          });
        authToken = loginResponse.body.token;
      }
      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sales)).toBe(true);
      console.log('✅ Liste des ventes récupérée');
    });
  });

  describe('📊 Tests rapports comptables', () => {
    test('GET /api/accounting/revenue - Revenus par période', async () => {
      const response = await request(app)
        .get('/api/accounting/revenue?period=month')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('byPaymentMethod');
      console.log('✅ Rapport revenus récupéré');
    });

    test('GET /api/accounting/profit-loss - Bénéfices par période', async () => {
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@afrigest.com', password: 'admin123' });
        authToken = loginResponse.body.token;
      }
      const response = await request(app)
        .get('/api/accounting/profit-loss?period=month')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('costs');
      expect(response.body).toHaveProperty('profit');
      console.log('✅ Rapport bénéfices récupéré');
    });
  });

  describe('📈 Tests tableau de bord', () => {
    test('GET /api/dashboard/overview - Statistiques générales', async () => {
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@afrigest.com', password: 'admin123' });
        authToken = loginResponse.body.token;
      }
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Vérifie les clés attendues selon l'implémentation serveur
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('topProducts');
      expect(response.body).toHaveProperty('recentSales');
      expect(response.body).toHaveProperty('salesTrend');
      expect(response.body).toHaveProperty('paymentMethods');

      // Détail des stats de summary
      expect(response.body.summary).toHaveProperty('totalStores');
      expect(response.body.summary).toHaveProperty('totalUsers');
      expect(response.body.summary).toHaveProperty('totalProducts');
      expect(response.body.summary).toHaveProperty('lowStockProducts');
      console.log('✅ Statistiques tableau de bord récupérées');
    });
  });

  describe('🧹 Nettoyage des tests', () => {
    
    test('DELETE /api/companies/:id - Supprimer l\'entreprise de test', async () => {
      const response = await request(app)
        .delete(`/api/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Accepter 200 (supprimée) ou 404 (déjà supprimée)
      expect([200, 404]).toContain(response.status);
      console.log(response.status === 200 ? '✅ Entreprise de test supprimée' : 'ℹ️ Entreprise déjà absente');
    });
  });
});

// Fonction utilitaire pour exécuter les tests
async function runTests() {
  try {
    console.log('🚀 Démarrage des tests API AfriGest...\n');
    
    // Ici vous pouvez ajouter la logique pour exécuter les tests
    // ou utiliser Jest directement avec npm test
    
    console.log('✅ Tous les tests sont prêts à être exécutés !');
    console.log('📝 Utilisez: npm run test:api pour exécuter ces tests');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
