// Tests unitaires pour le modèle Sale
const mongoose = require('mongoose');
const Sale = require('../../../server/models/Sale');
const User = require('../../../server/models/User');
const Company = require('../../../server/models/Company');
const Store = require('../../../server/models/Store');

describe('🧪 Tests unitaires - Modèle Sale', () => {
  let testUser, testCompany, testStore;
  
  beforeEach(async () => {
    // Nettoyer les collections avant chaque test
    await Sale.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await Store.deleteMany({});
    
    // Créer un utilisateur de test temporaire pour créer la company
    const tempUser = new User({
      firstName: 'Temp',
      lastName: 'User',
      email: `tempuser.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'password123',
      role: 'super_admin'
    });
    await tempUser.save();
    
    // Créer une company de test
    testCompany = new Company({
      name: `Test Company ${Date.now()}`,
      email: `testcompany.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
      address: {
        street: '123 Rue Test',
        city: 'Conakry',
        country: 'Guinée'
      },
      createdBy: tempUser._id
    });
    await testCompany.save();
    
    // Créer un store de test
    testStore = new Store({
      name: 'Test Store',
      code: `STORE_${Math.random().toString(36).substr(2, 9)}`,
      address: {
        street: '456 Avenue Test',
        city: 'Conakry',
        country: 'Guinée'
      },
      companyId: testCompany._id,
      createdBy: tempUser._id
    });
    await testStore.save();
    
    // Créer l'utilisateur de test avec company et store
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: `testuser.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'password123',
      role: 'employee',
      company: testCompany._id,
      store: testStore._id
    });
    await testUser.save();
  });

  // Fonction helper pour créer des données de vente complètes
  const createCompleteSaleData = (overrides = {}) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    return {
      saleNumber: `SALE_${timestamp}_${randomId}`,
      companyId: testCompany._id,
      storeId: testStore._id,
      cashierId: testUser._id,
      createdBy: testUser._id,
      items: [{
        productId: new mongoose.Types.ObjectId(),
        productName: 'Produit Test',
        productSku: `SKU_${randomId}`,
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
        total: 2000
      }],
      subtotal: 2000,
      totalAmount: 2000,
      payment: {
        method: 'cash',
        amount: 2000
      },
      customer: {
        name: 'Client Test',
        email: `client.${timestamp}@test.com`
      },
      ...overrides
    };
  };

  describe('✅ Validation des champs obligatoires', () => {
    
    test('Doit créer une vente avec tous les champs requis', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      const savedSale = await sale.save();

      expect(savedSale._id).toBeDefined();
      expect(savedSale.customer.name).toBe('Client Test');
      expect(savedSale.items).toHaveLength(1);
      expect(savedSale.totalAmount).toBe(2000);
      expect(savedSale.payment.method).toBe('cash');
    });

    test('Doit échouer sans customer', async () => {
      const saleData = createCompleteSaleData({ customer: null });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer sans items', async () => {
      const saleData = createCompleteSaleData({ items: [] });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer sans total', async () => {
      const saleData = createCompleteSaleData({ totalAmount: null });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer sans paymentMethod', async () => {
      const saleData = createCompleteSaleData({ payment: { method: null, amount: 2000 } });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer sans store', async () => {
      const saleData = createCompleteSaleData({ storeId: null });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });
  });

  describe('👤 Validation du customer', () => {
    
    test('Doit accepter un customer avec tous les champs', async () => {
      const saleData = createCompleteSaleData({
        customer: {
        name: 'John Doe',
          email: 'john@test.com',
        phone: '+221 77 123 45 67',
          address: '123 Rue Test'
        }
      });
      const sale = new Sale(saleData);
      const savedSale = await sale.save();
      expect(savedSale.customer.name).toBe('John Doe');
      expect(savedSale.customer.email).toBe('john@test.com');
    });

    test('Doit échouer sans customer.name', async () => {
      const saleData = createCompleteSaleData({
        customer: {
          email: 'john@test.com'
        }
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer avec un email invalide', async () => {
      const saleData = createCompleteSaleData({
        customer: {
          name: 'John Doe',
          email: 'email-invalide'
        }
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });
  });

  describe('🛍️ Validation des items', () => {
    
    test('Doit accepter plusieurs items', async () => {
      const saleData = createCompleteSaleData({
        items: [
        {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 1',
            productSku: 'SKU1',
          quantity: 2,
            unitPrice: 1000,
            subtotal: 2000,
          total: 2000
        },
        {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 2',
            productSku: 'SKU2',
          quantity: 1,
            unitPrice: 1500,
            subtotal: 1500,
          total: 1500
        }
        ],
        subtotal: 3500,
        totalAmount: 3500,
        payment: { method: 'cash', amount: 3500 }
      });
      const sale = new Sale(saleData);
      const savedSale = await sale.save();
      expect(savedSale.items).toHaveLength(2);
      expect(savedSale.totalAmount).toBe(3500);
    });

    test('Doit échouer avec un item sans name', async () => {
      const saleData = createCompleteSaleData({
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productSku: 'SKU1',
          quantity: 2,
          unitPrice: 1000,
          subtotal: 2000,
          total: 2000
        }]
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer avec un item sans quantity', async () => {
      const saleData = createCompleteSaleData({
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'Produit 1',
          productSku: 'SKU1',
          unitPrice: 1000,
          subtotal: 2000,
          total: 2000
        }]
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer avec un item sans price', async () => {
      const saleData = createCompleteSaleData({
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'Produit 1',
          productSku: 'SKU1',
          quantity: 2,
          subtotal: 2000,
          total: 2000
        }]
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });

    test('Doit échouer avec un item sans total', async () => {
      const saleData = createCompleteSaleData({
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'Produit 1',
          productSku: 'SKU1',
          quantity: 2,
          unitPrice: 1000,
          subtotal: 2000
        }]
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });
  });

  describe('💳 Validation des méthodes de paiement', () => {
    
    const paymentMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'];
    
    test.each(paymentMethods)('Doit accepter la méthode de paiement: %s', async (method) => {
      const saleData = createCompleteSaleData({
        payment: { method, amount: 2000 }
      });
      const sale = new Sale(saleData);
      const savedSale = await sale.save();
      expect(savedSale.payment.method).toBe(method);
    });

    test('Doit échouer avec une méthode de paiement invalide', async () => {
      const saleData = createCompleteSaleData({
        payment: { method: 'invalid_method', amount: 2000 }
      });
      const sale = new Sale(saleData);
      await expect(sale.save()).rejects.toThrow();
    });
  });

  describe('📅 Timestamps automatiques', () => {
    
    test('Doit créer createdAt et updatedAt automatiquement', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      const savedSale = await sale.save();

      expect(savedSale.createdAt).toBeDefined();
      expect(savedSale.updatedAt).toBeDefined();
    });

    test('Doit mettre à jour updatedAt lors de la modification', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      const savedSale = await sale.save();
      
      const originalUpdatedAt = savedSale.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      savedSale.customer.name = 'Client Modifié';
      await savedSale.save();
      
      expect(savedSale.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('🔍 Méthodes d\'instance', () => {
    
    test('Doit calculer le total des items avec calculateTotal', async () => {
      const saleData = createCompleteSaleData({
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 1',
            productSku: 'SKU1',
            quantity: 2,
            unitPrice: 1000,
            subtotal: 2000,
            total: 2000
          },
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 2',
            productSku: 'SKU2',
            quantity: 1,
            unitPrice: 1500,
            subtotal: 1500,
            total: 1500
          }
        ]
      });
      const sale = new Sale(saleData);
      const calculatedTotal = sale.items.reduce((sum, item) => sum + item.total, 0);
      expect(calculatedTotal).toBe(3500);
    });

    test('Doit retourner les informations publiques avec toPublicJSON', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      const savedSale = await sale.save();

      const publicData = savedSale.toJSON();
      expect(publicData._id).toBeDefined();
      expect(publicData.saleNumber).toBeDefined();
      expect(publicData.totalAmount).toBeDefined();
    });

    test('Doit retourner le nombre d\'items avec getItemCount', async () => {
      const saleData = createCompleteSaleData({
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 1',
            productSku: 'SKU1',
            quantity: 2,
            unitPrice: 1000,
            subtotal: 2000,
            total: 2000
          },
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Produit 2',
            productSku: 'SKU2',
            quantity: 1,
            unitPrice: 1500,
            subtotal: 1500,
            total: 1500
          }
        ]
      });
      const sale = new Sale(saleData);
      const itemCount = sale.items.length;
      expect(itemCount).toBe(2);
    });
  });

  describe('🔎 Méthodes statiques', () => {
    
    test('Doit trouver les ventes par boutique', async () => {
      const saleData1 = createCompleteSaleData();
      const sale1 = new Sale(saleData1);
      await sale1.save();
      
      const saleData2 = createCompleteSaleData();
      const sale2 = new Sale(saleData2);
      await sale2.save();

      const storeSales = await Sale.find({ storeId: testStore._id });
      expect(storeSales).toHaveLength(2);
    });

    test('Doit trouver les ventes par méthode de paiement', async () => {
      const saleData = createCompleteSaleData({ payment: { method: 'card', amount: 2000 } });
      const sale = new Sale(saleData);
      await sale.save();

      const cardSales = await Sale.find({ 'payment.method': 'card' });
      expect(cardSales).toHaveLength(1);
    });

    test('Doit calculer le total des ventes par période', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      await sale.save();

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const sales = await Sale.find({
        saleDate: { $gte: startOfDay, $lt: endOfDay }
      });
      
      const total = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      expect(total).toBe(2000);
    });

    test('Doit trouver les ventes par client', async () => {
      const saleData = createCompleteSaleData({
        customer: { name: 'Client Spécifique', email: 'client@test.com' }
      });
      const sale = new Sale(saleData);
      await sale.save();

      const clientSales = await Sale.find({ 'customer.name': 'Client Spécifique' });
      expect(clientSales).toHaveLength(1);
    });
  });

  describe('📊 Statistiques et agrégations', () => {
    
    test('Doit calculer les statistiques des ventes', async () => {
      const saleData1 = createCompleteSaleData({ totalAmount: 1000 });
      const sale1 = new Sale(saleData1);
      await sale1.save();
      
      const saleData2 = createCompleteSaleData({ totalAmount: 2000 });
      const sale2 = new Sale(saleData2);
      await sale2.save();

      const totalSales = await Sale.countDocuments();
      const totalAmount = await Sale.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      expect(totalSales).toBe(2);
      expect(totalAmount[0].total).toBe(3000);
    });

    test('Doit trouver les ventes les plus récentes', async () => {
      const saleData1 = createCompleteSaleData();
      const sale1 = new Sale(saleData1);
      await sale1.save();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const saleData2 = createCompleteSaleData();
      const sale2 = new Sale(saleData2);
      await sale2.save();

      const recentSales = await Sale.find().sort({ saleDate: -1 }).limit(1);
      expect(recentSales).toHaveLength(1);
      expect(recentSales[0]._id.toString()).toBe(sale2._id.toString());
    });

    test('Doit calculer les ventes par jour', async () => {
      const saleData = createCompleteSaleData();
      const sale = new Sale(saleData);
      await sale.save();

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const dailySales = await Sale.find({
        saleDate: { $gte: startOfDay, $lt: endOfDay }
      });

      expect(dailySales).toHaveLength(1);
    });
  });
});
