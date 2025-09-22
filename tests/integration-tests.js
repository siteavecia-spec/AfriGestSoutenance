const mongoose = require('mongoose');
const User = require('../server/models/User');
const Company = require('../server/models/Company');
const Store = require('../server/models/Store');
const Sale = require('../server/models/Sale');
const Product = require('../server/models/Product');

// Configuration des tests d'intégration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest';

describe('🔗 Tests d\'intégration AfriGest', () => {
  
  beforeAll(async () => {
    // Connexion à la base de données
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB pour les tests d\'intégration');
  });

  afterAll(async () => {
    // Nettoyage et fermeture
    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée');
  });

  beforeEach(async () => {
    // Nettoyage avant chaque test
    await User.deleteMany({ email: { $regex: /test/ } });
    await Company.deleteMany({ name: { $regex: /Test/ } });
    await Store.deleteMany({ name: { $regex: /Test/ } });
    await Sale.deleteMany({ 'customer.name': { $regex: /Test/ } });
    await Product.deleteMany({ name: { $regex: /Test/ } });
  });

  describe('🏢 Flux complet entreprise -> boutique -> utilisateur', () => {
    
    test('Créer une entreprise, une boutique et un utilisateur', async () => {
      // 1. Créer une entreprise
      const company = new Company({
        name: 'Test Company Integration',
        description: 'Entreprise pour test d\'intégration',
        address: '123 Rue Test',
        phone: '+221 77 123 45 67',
        email: 'test@integration.com'
      });
      await company.save();

      expect(company._id).toBeDefined();
      expect(company.name).toBe('Test Company Integration');
      console.log('✅ Entreprise créée:', company.name);

      // 2. Créer une boutique liée à l'entreprise
      const store = new Store({
        name: 'Boutique Test Integration',
        address: '456 Avenue Test',
        phone: '+221 77 987 65 43',
        company: company._id
      });
      await store.save();

      expect(store._id).toBeDefined();
      expect(store.company.toString()).toBe(company._id.toString());
      console.log('✅ Boutique créée:', store.name);

      // 3. Créer un utilisateur lié à l'entreprise et la boutique
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@integration.com',
        password: 'password123',
        role: 'store_manager',
        company: company._id,
        store: store._id
      });
      await user.save();

      expect(user._id).toBeDefined();
      expect(user.company.toString()).toBe(company._id.toString());
      expect(user.store.toString()).toBe(store._id.toString());
      console.log('✅ Utilisateur créé:', user.email);

      // 4. Vérifier les relations
      const populatedUser = await User.findById(user._id)
        .populate('company')
        .populate('store');

      expect(populatedUser.company.name).toBe('Test Company Integration');
      expect(populatedUser.store.name).toBe('Boutique Test Integration');
      console.log('✅ Relations vérifiées');
    });
  });

  describe('🛍️ Flux complet vente -> produit -> stock', () => {
    
    test('Créer des produits, une vente et mettre à jour le stock', async () => {
      // 1. Créer une entreprise et une boutique
      const company = new Company({
        name: 'Test Sales Company',
        description: 'Entreprise pour test des ventes',
        address: '123 Rue Sales',
        phone: '+221 77 111 11 11',
        email: 'sales@test.com'
      });
      await company.save();

      const store = new Store({
        name: 'Boutique Sales Test',
        address: '456 Avenue Sales',
        phone: '+221 77 222 22 22',
        company: company._id
      });
      await store.save();

      // 2. Créer des produits
      const product1 = new Product({
        name: 'Produit Test 1',
        description: 'Description produit 1',
        price: 1000,
        quantity: 10,
        minQuantity: 2,
        store: store._id
      });
      await product1.save();

      const product2 = new Product({
        name: 'Produit Test 2',
        description: 'Description produit 2',
        price: 2000,
        quantity: 5,
        minQuantity: 1,
        store: store._id
      });
      await product2.save();

      console.log('✅ Produits créés');

      // 3. Créer une vente
      const sale = new Sale({
        customer: {
          name: 'Client Test Integration',
          email: 'client@integration.com',
          phone: '+221 77 333 33 33'
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
      });
      await sale.save();

      expect(sale._id).toBeDefined();
      expect(sale.total).toBe(4000); // 2000 + 2000
      console.log('✅ Vente créée:', sale.total);

      // 4. Mettre à jour les stocks
      await Product.findByIdAndUpdate(product1._id, {
        $inc: { quantity: -2 }
      });
      await Product.findByIdAndUpdate(product2._id, {
        $inc: { quantity: -1 }
      });

      // 5. Vérifier les stocks mis à jour
      const updatedProduct1 = await Product.findById(product1._id);
      const updatedProduct2 = await Product.findById(product2._id);

      expect(updatedProduct1.quantity).toBe(8); // 10 - 2
      expect(updatedProduct2.quantity).toBe(4); // 5 - 1
      console.log('✅ Stocks mis à jour');
    });
  });

  describe('📊 Tests de cohérence des données', () => {
    
    test('Vérifier l\'isolation des données entre entreprises', async () => {
      // Créer deux entreprises
      const company1 = new Company({
        name: 'Entreprise 1',
        description: 'Première entreprise',
        address: '123 Rue 1',
        phone: '+221 77 111 11 11',
        email: 'company1@test.com'
      });
      await company1.save();

      const company2 = new Company({
        name: 'Entreprise 2',
        description: 'Deuxième entreprise',
        address: '456 Rue 2',
        phone: '+221 77 222 22 22',
        email: 'company2@test.com'
      });
      await company2.save();

      // Créer des boutiques pour chaque entreprise
      const store1 = new Store({
        name: 'Boutique 1',
        address: '123 Avenue 1',
        phone: '+221 77 111 11 11',
        company: company1._id
      });
      await store1.save();

      const store2 = new Store({
        name: 'Boutique 2',
        address: '456 Avenue 2',
        phone: '+221 77 222 22 22',
        company: company2._id
      });
      await store2.save();

      // Créer des utilisateurs pour chaque entreprise
      const user1 = new User({
        firstName: 'User',
        lastName: 'One',
        email: 'user1@test.com',
        password: 'password123',
        role: 'employee',
        company: company1._id,
        store: store1._id
      });
      await user1.save();

      const user2 = new User({
        firstName: 'User',
        lastName: 'Two',
        email: 'user2@test.com',
        password: 'password123',
        role: 'employee',
        company: company2._id,
        store: store2._id
      });
      await user2.save();

      // Vérifier l'isolation
      const usersCompany1 = await User.find({ company: company1._id });
      const usersCompany2 = await User.find({ company: company2._id });

      expect(usersCompany1).toHaveLength(1);
      expect(usersCompany2).toHaveLength(1);
      expect(usersCompany1[0].email).toBe('user1@test.com');
      expect(usersCompany2[0].email).toBe('user2@test.com');

      console.log('✅ Isolation des données vérifiée');
    });
  });

  describe('🔐 Tests de sécurité et permissions', () => {
    
    test('Vérifier le hachage des mots de passe', async () => {
      const user = new User({
        firstName: 'Security',
        lastName: 'Test',
        email: 'security@test.com',
        password: 'password123',
        role: 'employee'
      });
      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // Format bcrypt
      console.log('✅ Mot de passe haché correctement');
    });

    test('Vérifier la validation des rôles', async () => {
      const validRoles = ['super_admin', 'company_admin', 'store_manager', 'employee'];
      
      for (const role of validRoles) {
        const user = new User({
          firstName: 'Role',
          lastName: 'Test',
          email: `role.${role}@test.com`,
          password: 'password123',
          role: role
        });
        await user.save();
        expect(user.role).toBe(role);
      }
      console.log('✅ Validation des rôles vérifiée');
    });
  });

  describe('📈 Tests de performance', () => {
    
    test('Créer plusieurs entreprises et boutiques rapidement', async () => {
      const startTime = Date.now();
      
      // Créer 10 entreprises avec 2 boutiques chacune
      for (let i = 0; i < 10; i++) {
        const company = new Company({
          name: `Performance Company ${i}`,
          description: `Entreprise de performance ${i}`,
          address: `${i} Rue Performance`,
          phone: `+221 77 ${i.toString().padStart(3, '0')} 00 00`,
          email: `performance${i}@test.com`
        });
        await company.save();

        // Créer 2 boutiques pour chaque entreprise
        for (let j = 0; j < 2; j++) {
          const store = new Store({
            name: `Boutique ${i}-${j}`,
            address: `${i}-${j} Avenue Performance`,
            phone: `+221 77 ${i}${j} 00 00`,
            company: company._id
          });
          await store.save();
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Vérifier que tout a été créé
      const companies = await Company.find({ name: { $regex: /Performance Company/ } });
      const stores = await Store.find({ name: { $regex: /Boutique.*-/ } });

      expect(companies).toHaveLength(10);
      expect(stores).toHaveLength(20);
      expect(duration).toBeLessThan(5000); // Moins de 5 secondes

      console.log(`✅ Performance test: ${companies.length} entreprises, ${stores.length} boutiques en ${duration}ms`);
    });
  });
});

// Fonction utilitaire pour exécuter les tests d'intégration
async function runIntegrationTests() {
  try {
    console.log('🚀 Démarrage des tests d\'intégration AfriGest...\n');
    
    // Ici vous pouvez ajouter la logique pour exécuter les tests
    // ou utiliser Jest directement avec npm test
    
    console.log('✅ Tous les tests d\'intégration sont prêts à être exécutés !');
    console.log('📝 Utilisez: npm run test:integration pour exécuter ces tests');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests d\'intégration:', error);
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };
