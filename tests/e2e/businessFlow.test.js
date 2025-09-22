// Tests end-to-end pour les flux métier complets
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const { createTestContext, createTestProduct, createTestSale, cleanupTestData } = require('../helpers/testHelpers');

describe('🔄 Tests E2E - Flux métier complets', () => {
  
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('🏢 Flux complet de gestion d\'entreprise', () => {
    
    test('Doit permettre la création complète d\'une entreprise', async () => {
      const { token } = await createTestContext();
      
      // 1. Créer une entreprise
      const companyData = {
        name: 'Nouvelle Entreprise',
        description: 'Description de la nouvelle entreprise',
        address: '123 Rue de la Paix',
        phone: '+221 77 123 45 67',
        email: 'nouvelle@entreprise.com'
      };

      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${token}`)
        .send(companyData);

      expect(createCompanyResponse.status).toBe(201);
      expect(createCompanyResponse.body.name).toBe(companyData.name);
      expect(createCompanyResponse.body._id).toBeDefined();

      const companyId = createCompanyResponse.body._id;

      // 2. Créer une boutique pour cette entreprise
      const storeData = {
        name: 'Boutique Principale',
        address: '456 Avenue de la Liberté',
        phone: '+221 77 234 56 78',
        company: companyId
      };

      const createStoreResponse = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${token}`)
        .send(storeData);

      expect(createStoreResponse.status).toBe(201);
      expect(createStoreResponse.body.name).toBe(storeData.name);
      expect(createStoreResponse.body.company).toBe(companyId);

      const storeId = createStoreResponse.body._id;

      // 3. Créer un utilisateur pour cette entreprise et boutique
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@entreprise.com',
        password: 'password123',
        role: 'store_manager',
        company: companyId,
        store: storeId
      };

      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(userData);

      expect(createUserResponse.status).toBe(201);
      expect(createUserResponse.body.email).toBe(userData.email);
      expect(createUserResponse.body.role).toBe(userData.role);

      // 4. Vérifier que tout est bien lié
      const getCompanyResponse = await request(app)
        .get(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getCompanyResponse.status).toBe(200);
      expect(getCompanyResponse.body.name).toBe(companyData.name);

      const getStoreResponse = await request(app)
        .get(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getStoreResponse.status).toBe(200);
      expect(getStoreResponse.body.name).toBe(storeData.name);
    });

    test('Doit permettre la modification d\'une entreprise', async () => {
      const { company, token } = await createTestContext();
      
      const updateData = {
        name: 'Entreprise Modifiée',
        description: 'Description mise à jour',
        address: '789 Nouvelle Adresse'
      };

      const updateResponse = await request(app)
        .put(`/api/companies/${company._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.description).toBe(updateData.description);
      expect(updateResponse.body.address).toBe(updateData.address);
    });

    test('Doit permettre la suppression d\'une entreprise', async () => {
      const { company, token } = await createTestContext();
      
      const deleteResponse = await request(app)
        .delete(`/api/companies/${company._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Vérifier que l'entreprise n'existe plus
      const getResponse = await request(app)
        .get(`/api/companies/${company._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('🛍️ Flux complet de gestion des ventes', () => {
    
    test('Doit permettre la création complète d\'une vente', async () => {
      const { store, token } = await createTestContext();
      
      // 1. Créer des produits
      const product1 = await createTestProduct({ 
        store: store._id,
        name: 'Produit 1',
        price: 1000,
        quantity: 10
      });
      
      const product2 = await createTestProduct({ 
        store: store._id,
        name: 'Produit 2',
        price: 2000,
        quantity: 5
      });

      // 2. Créer une vente
      const saleData = {
        customer: {
          name: 'Client Test',
          email: 'client@test.com',
          phone: '+221 77 111 22 33'
        },
        items: [
          {
            product: product1._id,
            name: product1.name,
            quantity: 2,
            price: product1.price,
            total: product1.price * 2
          },
          {
            product: product2._id,
            name: product2.name,
            quantity: 1,
            price: product2.price,
            total: product2.price * 1
          }
        ],
        total: (product1.price * 2) + (product2.price * 1),
        paymentMethod: 'cash',
        store: store._id
      };

      const createSaleResponse = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(saleData);

      expect(createSaleResponse.status).toBe(201);
      expect(createSaleResponse.body.total).toBe(saleData.total);
      expect(createSaleResponse.body.items).toHaveLength(2);
      expect(createSaleResponse.body.customer.name).toBe(saleData.customer.name);

      const saleId = createSaleResponse.body._id;

      // 3. Vérifier que la vente a été créée
      const getSaleResponse = await request(app)
        .get(`/api/sales/${saleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getSaleResponse.status).toBe(200);
      expect(getSaleResponse.body._id).toBe(saleId);
      expect(getSaleResponse.body.total).toBe(saleData.total);

      // 4. Vérifier que les stocks ont été mis à jour
      const getProduct1Response = await request(app)
        .get(`/api/inventory/products/${product1._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getProduct1Response.status).toBe(200);
      expect(getProduct1Response.body.quantity).toBe(8); // 10 - 2

      const getProduct2Response = await request(app)
        .get(`/api/inventory/products/${product2._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getProduct2Response.status).toBe(200);
      expect(getProduct2Response.body.quantity).toBe(4); // 5 - 1
    });

    test('Doit permettre la modification d\'une vente', async () => {
      const { store, token } = await createTestContext();
      const sale = await createTestSale({ store: store._id });
      
      const updateData = {
        customer: {
          name: 'Client Modifié',
          email: 'client.modifie@test.com',
          phone: '+221 77 999 99 99'
        },
        total: 3000
      };

      const updateResponse = await request(app)
        .put(`/api/sales/${sale._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.customer.name).toBe(updateData.customer.name);
      expect(updateResponse.body.total).toBe(updateData.total);
    });

    test('Doit permettre l\'annulation d\'une vente', async () => {
      const { store, token } = await createTestContext();
      const sale = await createTestSale({ store: store._id });
      
      const cancelResponse = await request(app)
        .put(`/api/sales/${sale._id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.status).toBe('cancelled');
    });
  });

  describe('📦 Flux complet de gestion des stocks', () => {
    
    test('Doit permettre la gestion complète des stocks', async () => {
      const { store, token } = await createTestContext();
      
      // 1. Créer un produit
      const productData = {
        name: 'Nouveau Produit',
        description: 'Description du nouveau produit',
        price: 1500,
        quantity: 20,
        minQuantity: 5,
        store: store._id
      };

      const createProductResponse = await request(app)
        .post('/api/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);

      expect(createProductResponse.status).toBe(201);
      expect(createProductResponse.body.name).toBe(productData.name);
      expect(createProductResponse.body.quantity).toBe(productData.quantity);

      const productId = createProductResponse.body._id;

      // 2. Ajouter du stock
      const addStockData = {
        quantity: 10,
        reason: 'Réapprovisionnement'
      };

      const addStockResponse = await request(app)
        .post(`/api/inventory/products/${productId}/add-stock`)
        .set('Authorization', `Bearer ${token}`)
        .send(addStockData);

      expect(addStockResponse.status).toBe(200);
      expect(addStockResponse.body.quantity).toBe(30); // 20 + 10

      // 3. Retirer du stock
      const removeStockData = {
        quantity: 5,
        reason: 'Vente'
      };

      const removeStockResponse = await request(app)
        .post(`/api/inventory/products/${productId}/remove-stock`)
        .set('Authorization', `Bearer ${token}`)
        .send(removeStockData);

      expect(removeStockResponse.status).toBe(200);
      expect(removeStockResponse.body.quantity).toBe(25); // 30 - 5

      // 4. Vérifier les alertes de stock bas
      const lowStockResponse = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${token}`);

      expect(lowStockResponse.status).toBe(200);
      expect(Array.isArray(lowStockResponse.body)).toBe(true);
    });

    test('Doit gérer les alertes de stock bas', async () => {
      const { store, token } = await createTestContext();
      
      // Créer un produit avec un stock bas
      const productData = {
        name: 'Produit Stock Bas',
        description: 'Produit avec stock bas',
        price: 1000,
        quantity: 2, // En dessous du minimum
        minQuantity: 5,
        store: store._id
      };

      const createProductResponse = await request(app)
        .post('/api/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData);

      expect(createProductResponse.status).toBe(201);

      // Vérifier les alertes
      const alertsResponse = await request(app)
        .get('/api/inventory/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(alertsResponse.status).toBe(200);
      expect(alertsResponse.body.lowStock).toHaveLength(1);
      expect(alertsResponse.body.lowStock[0].name).toBe(productData.name);
    });
  });

  describe('📊 Flux complet de rapports', () => {
    
    test('Doit générer des rapports complets', async () => {
      const { store, token } = await createTestContext();
      
      // Créer des ventes pour les rapports
      await createTestSale({ store: store._id, total: 1000, paymentMethod: 'cash' });
      await createTestSale({ store: store._id, total: 2000, paymentMethod: 'card' });
      await createTestSale({ store: store._id, total: 1500, paymentMethod: 'mobile' });

      // 1. Rapport des ventes
      const salesReportResponse = await request(app)
        .get('/api/accounting/sales-report')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'month' });

      expect(salesReportResponse.status).toBe(200);
      expect(salesReportResponse.body.totalSales).toBe(3);
      expect(salesReportResponse.body.totalAmount).toBe(4500);

      // 2. Rapport des revenus
      const revenueReportResponse = await request(app)
        .get('/api/accounting/revenue')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'month' });

      expect(revenueReportResponse.status).toBe(200);
      expect(revenueReportResponse.body.total).toBe(4500);
      expect(revenueReportResponse.body.period).toBe('month');

      // 3. Rapport des bénéfices
      const profitReportResponse = await request(app)
        .get('/api/accounting/profit')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'month' });

      expect(profitReportResponse.status).toBe(200);
      expect(profitReportResponse.body.revenue).toBe(4500);
      expect(profitReportResponse.body.profit).toBeDefined();

      // 4. Statistiques du tableau de bord
      const dashboardResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.totalSales).toBe(3);
      expect(dashboardResponse.body.totalRevenue).toBe(4500);
    });

    test('Doit générer des rapports par période', async () => {
      const { store, token } = await createTestContext();
      
      // Créer des ventes
      await createTestSale({ store: store._id, total: 1000 });
      await createTestSale({ store: store._id, total: 2000 });

      // Rapport journalier
      const dailyReportResponse = await request(app)
        .get('/api/accounting/sales-report')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'day' });

      expect(dailyReportResponse.status).toBe(200);
      expect(dailyReportResponse.body.period).toBe('day');

      // Rapport hebdomadaire
      const weeklyReportResponse = await request(app)
        .get('/api/accounting/sales-report')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'week' });

      expect(weeklyReportResponse.status).toBe(200);
      expect(weeklyReportResponse.body.period).toBe('week');

      // Rapport mensuel
      const monthlyReportResponse = await request(app)
        .get('/api/accounting/sales-report')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'month' });

      expect(monthlyReportResponse.status).toBe(200);
      expect(monthlyReportResponse.body.period).toBe('month');
    });
  });

  describe('🔄 Flux de synchronisation des données', () => {
    
    test('Doit synchroniser les données entre les entités', async () => {
      const { company, store, token } = await createTestContext();
      
      // 1. Créer un produit
      const product = await createTestProduct({ store: store._id });
      
      // 2. Créer une vente
      const sale = await createTestSale({ 
        store: store._id,
        items: [{
          product: product._id,
          name: product.name,
          quantity: 1,
          price: product.price,
          total: product.price
        }]
      });

      // 3. Vérifier la synchronisation
      const getProductResponse = await request(app)
        .get(`/api/inventory/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getProductResponse.status).toBe(200);
      expect(getProductResponse.body.quantity).toBe(product.quantity - 1);

      const getSaleResponse = await request(app)
        .get(`/api/sales/${sale._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getSaleResponse.status).toBe(200);
      expect(getSaleResponse.body.total).toBe(product.price);

      // 4. Vérifier les statistiques mises à jour
      const statsResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.totalSales).toBeGreaterThan(0);
      expect(statsResponse.body.totalRevenue).toBeGreaterThan(0);
    });
  });
});
