// Données de test et fixtures
const { generateRandomData } = require('../helpers/testHelpers');

// Données d'entreprises de test
const testCompanies = [
  {
    name: 'Entreprise Test 1',
    description: 'Première entreprise de test',
    address: '123 Rue de la Paix',
    phone: '+221 77 123 45 67',
    email: 'entreprise1@test.com'
  },
  {
    name: 'Entreprise Test 2',
    description: 'Deuxième entreprise de test',
    address: '456 Avenue de la Liberté',
    phone: '+221 77 234 56 78',
    email: 'entreprise2@test.com'
  },
  {
    name: 'Entreprise Test 3',
    description: 'Troisième entreprise de test',
    address: '789 Boulevard de l\'Indépendance',
    phone: '+221 77 345 67 89',
    email: 'entreprise3@test.com'
  }
];

// Données de boutiques de test
const testStores = [
  {
    name: 'Boutique Centre',
    address: '123 Avenue du Centre',
    phone: '+221 77 111 11 11',
    description: 'Boutique principale du centre-ville'
  },
  {
    name: 'Boutique Banlieue',
    address: '456 Rue de la Banlieue',
    phone: '+221 77 222 22 22',
    description: 'Boutique de banlieue'
  },
  {
    name: 'Boutique Marché',
    address: '789 Place du Marché',
    phone: '+221 77 333 33 33',
    description: 'Boutique du marché central'
  }
];

// Données d'utilisateurs de test
const testUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    password: 'password123',
    role: 'super_admin'
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@test.com',
    password: 'password123',
    role: 'company_admin'
  },
  {
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@test.com',
    password: 'password123',
    role: 'store_manager'
  },
  {
    firstName: 'Alice',
    lastName: 'Brown',
    email: 'alice.brown@test.com',
    password: 'password123',
    role: 'employee'
  }
];

// Données de produits de test
const testProducts = [
  {
    name: 'Produit Test 1',
    description: 'Premier produit de test',
    price: 1000,
    quantity: 50,
    minQuantity: 5,
    category: 'Électronique'
  },
  {
    name: 'Produit Test 2',
    description: 'Deuxième produit de test',
    price: 2500,
    quantity: 30,
    minQuantity: 3,
    category: 'Vêtements'
  },
  {
    name: 'Produit Test 3',
    description: 'Troisième produit de test',
    price: 5000,
    quantity: 20,
    minQuantity: 2,
    category: 'Maison'
  },
  {
    name: 'Produit Test 4',
    description: 'Quatrième produit de test',
    price: 750,
    quantity: 100,
    minQuantity: 10,
    category: 'Alimentation'
  }
];

// Données de ventes de test
const testSales = [
  {
    customer: {
      name: 'Client Test 1',
      email: 'client1@test.com',
      phone: '+221 77 444 44 44'
    },
    items: [
      {
        name: 'Produit Test 1',
        quantity: 2,
        price: 1000,
        total: 2000
      }
    ],
    total: 2000,
    paymentMethod: 'cash'
  },
  {
    customer: {
      name: 'Client Test 2',
      email: 'client2@test.com',
      phone: '+221 77 555 55 55'
    },
    items: [
      {
        name: 'Produit Test 2',
        quantity: 1,
        price: 2500,
        total: 2500
      },
      {
        name: 'Produit Test 4',
        quantity: 3,
        price: 750,
        total: 2250
      }
    ],
    total: 4750,
    paymentMethod: 'card'
  },
  {
    customer: {
      name: 'Client Test 3',
      email: 'client3@test.com',
      phone: '+221 77 666 66 66'
    },
    items: [
      {
        name: 'Produit Test 3',
        quantity: 1,
        price: 5000,
        total: 5000
      }
    ],
    total: 5000,
    paymentMethod: 'mobile'
  }
];

// Données de catégories de test
const testCategories = [
  {
    name: 'Électronique',
    description: 'Appareils électroniques et gadgets'
  },
  {
    name: 'Vêtements',
    description: 'Vêtements et accessoires'
  },
  {
    name: 'Maison',
    description: 'Articles pour la maison'
  },
  {
    name: 'Alimentation',
    description: 'Produits alimentaires'
  },
  {
    name: 'Sport',
    description: 'Équipements sportifs'
  },
  {
    name: 'Livre',
    description: 'Livres et publications'
  }
];

// Données de clients de test
const testCustomers = [
  {
    name: 'Client Fidèle',
    email: 'client.fidele@test.com',
    phone: '+221 77 777 77 77',
    address: '123 Rue du Client',
    totalPurchases: 50000,
    lastPurchase: new Date()
  },
  {
    name: 'Client Occasionnel',
    email: 'client.occasionnel@test.com',
    phone: '+221 77 888 88 88',
    address: '456 Avenue du Client',
    totalPurchases: 15000,
    lastPurchase: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Il y a 7 jours
  },
  {
    name: 'Nouveau Client',
    email: 'nouveau.client@test.com',
    phone: '+221 77 999 99 99',
    address: '789 Boulevard du Client',
    totalPurchases: 0,
    lastPurchase: null
  }
];

// Génération de données aléatoires pour les tests de charge
const generateRandomTestData = {
  company: () => ({
    name: `Entreprise ${generateRandomData.name()}`,
    description: `Description de l'entreprise ${generateRandomData.name()}`,
    address: `${Math.floor(Math.random() * 999) + 1} Rue ${generateRandomData.name()}`,
    phone: generateRandomData.phone(),
    email: generateRandomData.email()
  }),

  store: (companyId) => ({
    name: `Boutique ${generateRandomData.name()}`,
    address: `${Math.floor(Math.random() * 999) + 1} Avenue ${generateRandomData.name()}`,
    phone: generateRandomData.phone(),
    company: companyId,
    description: `Description de la boutique ${generateRandomData.name()}`
  }),

  user: (companyId, storeId) => ({
    firstName: generateRandomData.name(),
    lastName: generateRandomData.name(),
    email: generateRandomData.email(),
    password: 'password123',
    role: ['employee', 'store_manager', 'company_admin'][Math.floor(Math.random() * 3)],
    company: companyId,
    store: storeId
  }),

  product: (storeId) => ({
    name: `Produit ${generateRandomData.name()}`,
    description: `Description du produit ${generateRandomData.name()}`,
    price: generateRandomData.price(),
    quantity: generateRandomData.quantity(),
    minQuantity: Math.floor(Math.random() * 5) + 1,
    store: storeId,
    category: testCategories[Math.floor(Math.random() * testCategories.length)].name
  }),

  sale: (storeId) => {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let i = 0; i < itemCount; i++) {
      const price = generateRandomData.price();
      const quantity = Math.floor(Math.random() * 5) + 1;
      const itemTotal = price * quantity;
      
      items.push({
        name: `Produit ${generateRandomData.name()}`,
        quantity: quantity,
        price: price,
        total: itemTotal
      });
      
      total += itemTotal;
    }

    return {
      customer: {
        name: `Client ${generateRandomData.name()}`,
        email: generateRandomData.email(),
        phone: generateRandomData.phone()
      },
      items: items,
      total: total,
      paymentMethod: ['cash', 'card', 'mobile'][Math.floor(Math.random() * 3)],
      store: storeId
    };
  }
};

module.exports = {
  testCompanies,
  testStores,
  testUsers,
  testProducts,
  testSales,
  testCategories,
  testCustomers,
  generateRandomTestData
};
