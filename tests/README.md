# 🧪 Tests AfriGest

Ce dossier contient tous les tests pour l'application AfriGest, organisés par type et fonctionnalité.

## 📁 Structure des tests

```
tests/
├── README.md                 # Ce fichier
├── setup.js                 # Configuration globale des tests
├── config.js                # Configuration des tests
├── coverage.config.js        # Configuration de la couverture
├── ci-test-runner.js         # Script pour CI/CD
├── helpers/                  # Utilitaires de test
│   └── testHelpers.js       # Fonctions d'aide pour les tests
├── fixtures/                 # Données de test
│   └── testData.js          # Données et fixtures
├── mocks/                    # Mocks et simulations
│   └── mockData.js          # Données simulées
├── unit/                     # Tests unitaires
│   └── models/              # Tests des modèles
│       ├── User.test.js     # Tests du modèle User
│       ├── Company.test.js  # Tests du modèle Company
│       └── Sale.test.js     # Tests du modèle Sale
├── e2e/                      # Tests end-to-end
│   ├── authFlow.test.js     # Tests du flux d'authentification
│   └── businessFlow.test.js # Tests des flux métier
├── api-tests.js             # Tests d'API existants
├── integration-tests.js     # Tests d'intégration existants
└── load-tests.js            # Tests de charge existants
```

## 🚀 Exécution des tests

### Scripts disponibles

```bash
# Tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests d'API uniquement
npm run test:api

# Tests d'intégration uniquement
npm run test:integration

# Tests end-to-end uniquement
npm run test:e2e

# Tests de charge uniquement
npm run test:load

# Tests avec couverture de code
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tous les tests (unit + api + integration)
npm run test:all

# Tests pour CI/CD
npm run test:ci
```

### Exécution manuelle

```bash
# Tests unitaires
jest tests/unit/

# Tests end-to-end
jest tests/e2e/

# Tests avec couverture
jest --coverage

# Tests spécifiques
jest tests/unit/models/User.test.js
```

## 📊 Couverture de code

### Seuils de couverture

- **Global** : 70% minimum
- **Modèles** : 80% minimum
- **Routes** : 75% minimum
- **Middleware** : 80% minimum

### Génération des rapports

```bash
# Générer le rapport de couverture
npm run test:coverage

# Voir le rapport HTML
open coverage/lcov-report/index.html
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.test` avec :

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/afrigest-test
JWT_SECRET=test-jwt-secret
PORT=5001
```

### Configuration Jest

La configuration Jest est dans `package.json` et `tests/coverage.config.js`.

## 🧪 Types de tests

### Tests unitaires

Testent les composants individuels (modèles, fonctions, classes) de manière isolée.

**Exemple :**
```javascript
test('Doit créer un utilisateur avec tous les champs requis', async () => {
  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    password: 'password123',
    role: 'employee'
  };

  const user = new User(userData);
  const savedUser = await user.save();

  expect(savedUser._id).toBeDefined();
  expect(savedUser.firstName).toBe(userData.firstName);
});
```

### Tests d'intégration

Testent l'interaction entre plusieurs composants.

**Exemple :**
```javascript
test('Doit créer une entreprise, une boutique et un utilisateur', async () => {
  const company = await createTestCompany();
  const store = await createTestStore({ company: company._id });
  const user = await createTestUser({ 
    company: company._id, 
    store: store._id 
  });

  expect(user.company.toString()).toBe(company._id.toString());
  expect(user.store.toString()).toBe(store._id.toString());
});
```

### Tests end-to-end

Testent les flux complets de l'application.

**Exemple :**
```javascript
test('Doit permettre la création complète d\'une vente', async () => {
  const { store, token } = await createTestContext();
  
  const saleData = {
    customer: { name: 'Client Test', email: 'client@test.com' },
    items: [{ name: 'Produit', quantity: 1, price: 1000, total: 1000 }],
    total: 1000,
    paymentMethod: 'cash',
    store: store._id
  };

  const response = await request(app)
    .post('/api/sales')
    .set('Authorization', `Bearer ${token}`)
    .send(saleData);

  expect(response.status).toBe(201);
  expect(response.body.total).toBe(saleData.total);
});
```

### Tests de charge

Testent les performances avec de gros volumes de données.

**Exemple :**
```javascript
test('Doit créer 100 entreprises rapidement', async () => {
  const startTime = Date.now();
  const companies = [];

  for (let i = 0; i < 100; i++) {
    companies.push({
      name: `LoadTest Company ${i}`,
      email: `loadtest${i}@company.com`
    });
  }

  const result = await Company.insertMany(companies);
  const duration = Date.now() - startTime;

  expect(result).toHaveLength(100);
  expect(duration).toBeLessThan(10000);
});
```

## 🛠️ Utilitaires de test

### Helpers disponibles

```javascript
// Créer des données de test
const user = await createTestUser();
const company = await createTestCompany();
const store = await createTestStore();
const product = await createTestProduct();
const sale = await createTestSale();

// Créer un contexte complet
const { company, store, user, token } = await createTestContext();

// Nettoyer les données de test
await cleanupTestData();

// Générer des données aléatoires
const randomEmail = generateRandomData.email();
const randomPhone = generateRandomData.phone();
```

### Mocks disponibles

```javascript
// Mocks de services
const { mockServices } = require('./mocks/mockData');

// Mocks de réponses HTTP
const { mockHttpResponses } = require('./mocks/mockData');

// Mocks de données de base
const { mockDatabaseData } = require('./mocks/mockData');
```

## 🔍 Débogage des tests

### Logs détaillés

```bash
# Activer les logs détaillés
DEBUG=* npm test

# Logs spécifiques
DEBUG=afrigest:* npm test
```

### Tests en mode debug

```bash
# Lancer un test spécifique en mode debug
node --inspect-brk node_modules/.bin/jest tests/unit/models/User.test.js
```

### Vérification de la base de données

```bash
# Se connecter à la base de test
mongo mongodb://localhost:27017/afrigest-test

# Vérifier les collections
show collections
db.users.find()
db.companies.find()
```

## 📈 Métriques et rapports

### Rapports générés

- **Couverture de code** : `coverage/lcov-report/index.html`
- **Rapport de tests** : `coverage/html-report/test-report.html`
- **Résultats JSON** : `test-results.json`

### Métriques importantes

- **Temps d'exécution** : < 30 secondes pour tous les tests
- **Couverture de code** : > 70% global
- **Tests de charge** : < 10 secondes pour 100 entités
- **Tests E2E** : < 5 secondes par flux

## 🚨 Dépannage

### Problèmes courants

1. **Timeout des tests**
   ```bash
   # Augmenter le timeout
   jest --testTimeout=60000
   ```

2. **Erreurs de base de données**
   ```bash
   # Vérifier la connexion
   npm run test:api
   ```

3. **Tests qui échouent aléatoirement**
   ```bash
   # Nettoyer la base de données
   await cleanupTestData();
   ```

4. **Problèmes de mémoire**
   ```bash
   # Augmenter la mémoire Node.js
   node --max-old-space-size=4096 node_modules/.bin/jest
   ```

### Support

Pour toute question sur les tests, consultez :
- La documentation Jest : https://jestjs.io/docs/getting-started
- Les tests existants comme exemples
- Les logs de test pour plus de détails

## 📝 Bonnes pratiques

1. **Nommage des tests** : Utilisez des descriptions claires
2. **Isolation** : Chaque test doit être indépendant
3. **Nettoyage** : Toujours nettoyer les données de test
4. **Assertions** : Une assertion par concept testé
5. **Données de test** : Utilisez les helpers et fixtures
6. **Performance** : Gardez les tests rapides
7. **Maintenance** : Mettez à jour les tests avec le code

## 🔄 Intégration continue

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
```

### Scripts de déploiement

```bash
# Tests avant déploiement
npm run test:ci

# Déploiement conditionnel
if [ $? -eq 0 ]; then
  npm run deploy
else
  echo "Tests échoués, déploiement annulé"
  exit 1
fi
```
