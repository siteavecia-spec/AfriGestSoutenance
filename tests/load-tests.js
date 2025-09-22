const mongoose = require('mongoose');
const User = require('../server/models/User');
const Company = require('../server/models/Company');
const Store = require('../server/models/Store');
const Sale = require('../server/models/Sale');
const Product = require('../server/models/Product');

// Configuration des tests de charge
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest';

describe('⚡ Tests de charge AfriGest', () => {
  
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB pour les tests de charge');
  });

  afterAll(async () => {
    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée');
  });

  beforeEach(async () => {
    // Nettoyage avant chaque test
    await User.deleteMany({ email: { $regex: /loadtest/ } });
    await Company.deleteMany({ name: { $regex: /LoadTest/ } });
    await Store.deleteMany({ name: { $regex: /LoadTest/ } });
    await Sale.deleteMany({ 'customer.name': { $regex: /LoadTest/ } });
    await Product.deleteMany({ name: { $regex: /LoadTest/ } });
  });

  describe('🏢 Tests de charge - Création massive d\'entreprises', () => {
    
    test('Créer 100 entreprises rapidement', async () => {
      const startTime = Date.now();
      const companies = [];

      // Créer 100 entreprises en parallèle
      for (let i = 0; i < 100; i++) {
        companies.push({
          name: `LoadTest Company ${i}`,
          description: `Entreprise de test de charge ${i}`,
          address: `${i} Rue LoadTest`,
          phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`,
          email: `loadtest${i}@company.com`
        });
      }

      // Insérer toutes les entreprises en une seule opération
      const result = await Company.insertMany(companies);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Moins de 10 secondes

      console.log(`✅ 100 entreprises créées en ${duration}ms (${(1000000/duration).toFixed(0)} entreprises/seconde)`);
    });
  });

  describe('🏪 Tests de charge - Création massive de boutiques', () => {
    
    test('Créer 500 boutiques rapidement', async () => {
      // Créer d'abord une entreprise
      const company = new Company({
        name: 'LoadTest Company',
        description: 'Entreprise pour test de charge',
        address: '123 Rue LoadTest',
        phone: '+221 77 000 00 00',
        email: 'loadtest@company.com'
      });
      await company.save();

      const startTime = Date.now();
      const stores = [];

      // Créer 500 boutiques
      for (let i = 0; i < 500; i++) {
        stores.push({
          name: `LoadTest Boutique ${i}`,
          address: `${i} Avenue LoadTest`,
          phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`,
          company: company._id
        });
      }

      // Insérer toutes les boutiques en une seule opération
      const result = await Store.insertMany(stores);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveLength(500);
      expect(duration).toBeLessThan(15000); // Moins de 15 secondes

      console.log(`✅ 500 boutiques créées en ${duration}ms (${(500000/duration).toFixed(0)} boutiques/seconde)`);
    });
  });

  describe('👥 Tests de charge - Création massive d\'utilisateurs', () => {
    
    test('Créer 1000 utilisateurs rapidement', async () => {
      // Créer une entreprise et une boutique
      const company = new Company({
        name: 'LoadTest Company Users',
        description: 'Entreprise pour test utilisateurs',
        address: '123 Rue LoadTest',
        phone: '+221 77 000 00 00',
        email: 'loadtest@users.com'
      });
      await company.save();

      const store = new Store({
        name: 'LoadTest Boutique Users',
        address: '123 Avenue LoadTest',
        phone: '+221 77 000 00 00',
        company: company._id
      });
      await store.save();

      const startTime = Date.now();
      const users = [];

      // Créer 1000 utilisateurs
      for (let i = 0; i < 1000; i++) {
        users.push({
          firstName: `User${i}`,
          lastName: `LoadTest${i}`,
          email: `loadtest${i}@user.com`,
          password: 'password123',
          role: 'employee',
          company: company._id,
          store: store._id
        });
      }

      // Insérer tous les utilisateurs en une seule opération
      const result = await User.insertMany(users);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(20000); // Moins de 20 secondes

      console.log(`✅ 1000 utilisateurs créés en ${duration}ms (${(1000000/duration).toFixed(0)} utilisateurs/seconde)`);
    });
  });

  describe('🛍️ Tests de charge - Création massive de ventes', () => {
    
    test('Créer 2000 ventes rapidement', async () => {
      // Créer une entreprise, une boutique et des produits
      const company = new Company({
        name: 'LoadTest Company Sales',
        description: 'Entreprise pour test ventes',
        address: '123 Rue LoadTest',
        phone: '+221 77 000 00 00',
        email: 'loadtest@sales.com'
      });
      await company.save();

      const store = new Store({
        name: 'LoadTest Boutique Sales',
        address: '123 Avenue LoadTest',
        phone: '+221 77 000 00 00',
        company: company._id
      });
      await store.save();

      // Créer 10 produits
      const products = [];
      for (let i = 0; i < 10; i++) {
        const product = new Product({
          name: `LoadTest Product ${i}`,
          description: `Produit de test ${i}`,
          price: 1000 + (i * 100),
          quantity: 100,
          minQuantity: 5,
          store: store._id
        });
        await product.save();
        products.push(product);
      }

      const startTime = Date.now();
      const sales = [];

      // Créer 2000 ventes
      for (let i = 0; i < 2000; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        
        sales.push({
          customer: {
            name: `LoadTest Customer ${i}`,
            email: `loadtest${i}@customer.com`,
            phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`
          },
          items: [{
            product: randomProduct._id,
            name: randomProduct.name,
            quantity: quantity,
            price: randomProduct.price,
            total: randomProduct.price * quantity
          }],
          total: randomProduct.price * quantity,
          paymentMethod: ['cash', 'card', 'mobile'][Math.floor(Math.random() * 3)],
          store: store._id
        });
      }

      // Insérer toutes les ventes en une seule opération
      const result = await Sale.insertMany(sales);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toHaveLength(2000);
      expect(duration).toBeLessThan(30000); // Moins de 30 secondes

      console.log(`✅ 2000 ventes créées en ${duration}ms (${(2000000/duration).toFixed(0)} ventes/seconde)`);
    });
  });

  describe('📊 Tests de charge - Requêtes complexes', () => {
    
    test('Requêtes d\'agrégation sur 1000 ventes', async () => {
      // Créer des données de test
      const company = new Company({
        name: 'LoadTest Company Aggregation',
        description: 'Entreprise pour test agrégation',
        address: '123 Rue LoadTest',
        phone: '+221 77 000 00 00',
        email: 'loadtest@aggregation.com'
      });
      await company.save();

      const store = new Store({
        name: 'LoadTest Boutique Aggregation',
        address: '123 Avenue LoadTest',
        phone: '+221 77 000 00 00',
        company: company._id
      });
      await store.save();

      // Créer 1000 ventes avec des montants variés
      const sales = [];
      for (let i = 0; i < 1000; i++) {
        const amount = Math.floor(Math.random() * 10000) + 1000;
        sales.push({
          customer: {
            name: `LoadTest Customer ${i}`,
            email: `loadtest${i}@customer.com`,
            phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`
          },
          items: [{
            name: `LoadTest Product ${i}`,
            quantity: 1,
            price: amount,
            total: amount
          }],
          total: amount,
          paymentMethod: ['cash', 'card', 'mobile'][Math.floor(Math.random() * 3)],
          store: store._id
        });
      }
      await Sale.insertMany(sales);

      // Test des requêtes d'agrégation
      const startTime = Date.now();

      // 1. Total des ventes
      const totalSales = await Sale.aggregate([
        { $match: { store: store._id } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);

      // 2. Ventes par méthode de paiement
      const salesByPayment = await Sale.aggregate([
        { $match: { store: store._id } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }
      ]);

      // 3. Top 10 des ventes
      const topSales = await Sale.find({ store: store._id })
        .sort({ total: -1 })
        .limit(10)
        .select('total customer.name createdAt');

      // 4. Ventes par jour (derniers 30 jours)
      const salesByDay = await Sale.aggregate([
        { $match: { store: store._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            total: { $sum: '$total' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Vérifications
      expect(totalSales[0].total).toBeGreaterThan(0);
      expect(salesByPayment).toHaveLength(3); // cash, card, mobile
      expect(topSales).toHaveLength(10);
      expect(salesByDay.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Moins de 5 secondes

      console.log(`✅ Requêtes d'agrégation sur 1000 ventes en ${duration}ms`);
      console.log(`   - Total des ventes: ${totalSales[0].total.toLocaleString()} FCFA`);
      console.log(`   - Méthodes de paiement: ${salesByPayment.length}`);
      console.log(`   - Top ventes: ${topSales.length}`);
      console.log(`   - Ventes par jour: ${salesByDay.length}`);
    });
  });

  describe('🔄 Tests de charge - Opérations concurrentes', () => {
    
    test('Créer des ventes en parallèle', async () => {
      // Créer une entreprise et une boutique
      const company = new Company({
        name: 'LoadTest Company Concurrent',
        description: 'Entreprise pour test concurrent',
        address: '123 Rue LoadTest',
        phone: '+221 77 000 00 00',
        email: 'loadtest@concurrent.com'
      });
      await company.save();

      const store = new Store({
        name: 'LoadTest Boutique Concurrent',
        address: '123 Avenue LoadTest',
        phone: '+221 77 000 00 00',
        company: company._id
      });
      await store.save();

      const startTime = Date.now();

      // Créer 100 ventes en parallèle
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const sale = new Sale({
          customer: {
            name: `LoadTest Customer ${i}`,
            email: `loadtest${i}@customer.com`,
            phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`
          },
          items: [{
            name: `LoadTest Product ${i}`,
            quantity: 1,
            price: 1000 + i,
            total: 1000 + i
          }],
          total: 1000 + i,
          paymentMethod: 'cash',
          store: store._id
        });
        promises.push(sale.save());
      }

      // Attendre que toutes les ventes soient créées
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Moins de 10 secondes

      console.log(`✅ 100 ventes créées en parallèle en ${duration}ms (${(100000/duration).toFixed(0)} ventes/seconde)`);
    });
  });
});

// Fonction utilitaire pour exécuter les tests de charge
async function runLoadTests() {
  try {
    console.log('🚀 Démarrage des tests de charge AfriGest...\n');
    
    console.log('✅ Tous les tests de charge sont prêts à être exécutés !');
    console.log('📝 Utilisez: npm run test:load pour exécuter ces tests');
    console.log('⚠️  Attention: Ces tests peuvent prendre plusieurs minutes à s\'exécuter');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests de charge:', error);
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  runLoadTests();
}

module.exports = { runLoadTests };
