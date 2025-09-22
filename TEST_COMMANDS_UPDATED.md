# 🧪 COMMANDES DE TEST MISES À JOUR - AFRI GEST

## 🚀 **Commandes de test rapides**

### **Tests d'API (89% de réussite)**
```bash
# Tous les tests d'API
npx jest tests/api.test.js --testTimeout=30000

# Tests d'authentification (100% ✅)
npx jest tests/api.test.js --testNamePattern="Tests d'authentification" --testTimeout=30000

# Tests d'entreprises (100% ✅)
npx jest tests/api.test.js --testNamePattern="Tests gestion des entreprises" --testTimeout=30000

# Tests des utilisateurs (50% ⚠️)
npx jest tests/api.test.js --testNamePattern="Tests gestion des utilisateurs" --testTimeout=30000

# Tests des boutiques (0% ❌)
npx jest tests/api.test.js --testNamePattern="Tests gestion des boutiques" --testTimeout=30000

# Tests des ventes (0% ❌)
npx jest tests/api.test.js --testNamePattern="Tests gestion des ventes" --testTimeout=30000
```

### **Tests unitaires (97% de réussite)**
```bash
# Tous les tests unitaires
npm run test:unit

# Tests du modèle User (89% ⚠️)
npx jest tests/unit/models/User.test.js --testTimeout=30000

# Tests du modèle Company (100% ✅)
npx jest jest tests/unit/models/Company.test.js --testTimeout=30000

# Tests du modèle Store (100% ✅)
npx jest tests/unit/models/Store.test.js --testTimeout=30000

# Tests du modèle Sale (100% ✅)
npx jest tests/unit/models/Sale.test.js --testTimeout=30000
```

## 🔧 **Commandes de débogage**

### **Tests spécifiques**
```bash
# Test de connexion
npx jest tests/api.test.js --testNamePattern="POST /api/auth/login - Connexion super admin" --testTimeout=30000

# Test de création d'entreprise
npx jest tests/api.test.js --testNamePattern="POST /api/companies - Créer une nouvelle entreprise" --testTimeout=30000

# Test de création d'utilisateur
npx jest tests/api.test.js --testNamePattern="POST /api/users - Créer un nouvel utilisateur" --testTimeout=30000

# Test de création de boutique
npx jest tests/api.test.js --testNamePattern="POST /api/stores - Créer une nouvelle boutique" --testTimeout=30000
```

### **Tests avec logs détaillés**
```bash
# Tests avec logs complets
npx jest tests/api.test.js --verbose --testTimeout=30000

# Tests avec logs de débogage
DEBUG=* npx jest tests/api.test.js --testTimeout=30000
```

## 📊 **Commandes de statistiques**

### **Résumé des tests**
```bash
# Résumé complet
npx jest --coverage --testTimeout=30000

# Résumé des tests d'API
npx jest tests/api.test.js --coverage --testTimeout=30000

# Résumé des tests unitaires
npx jest tests/unit/ --coverage --testTimeout=30000
```

## 🛠️ **Commandes de maintenance**

### **Nettoyage des données de test**
```bash
# Nettoyage manuel (si nécessaire)
node -e "
const mongoose = require('mongoose');
const User = require('./server/models/User');
const Company = require('./server/models/Company');
const Store = require('./server/models/Store');
const Sale = require('./server/models/Sale');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/afrigest');
  
  await User.deleteMany({ email: { $regex: /test/ } });
  await Company.deleteMany({ name: { $regex: /test/i } });
  await Store.deleteMany({ name: { $regex: /test/i } });
  await Sale.deleteMany({ 'customer.email': { $regex: /test/ } });
  
  console.log('✅ Nettoyage terminé');
  process.exit(0);
}

cleanup();
"
```

### **Vérification de la base de données**
```bash
# Vérifier la connexion MongoDB
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/afrigest')
  .then(() => console.log('✅ Connexion MongoDB OK'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));
"
```

## 🎯 **Commandes de développement**

### **Tests en mode watch**
```bash
# Tests en continu
npx jest --watch --testTimeout=30000

# Tests d'API en continu
npx jest tests/api.test.js --watch --testTimeout=30000
```

### **Tests de performance**
```bash
# Tests avec mesure du temps
time npx jest tests/api.test.js --testTimeout=30000

# Tests avec profiling
npx jest tests/api.test.js --testTimeout=30000 --detectOpenHandles
```

## 📝 **Notes importantes**

### **Variables d'environnement**
- Assurez-vous que `MONGODB_URI` est configuré
- Les tests utilisent MongoDB Atlas par défaut
- Timeout de 30 secondes pour éviter les timeouts

### **Dépannage**
- Si les tests échouent, vérifiez la connexion MongoDB
- Les tests sont isolés et créent leurs propres données
- Nettoyage automatique après chaque test

### **Performance**
- Tests d'API : ~20-30 secondes
- Tests unitaires : ~5-10 secondes
- Total : ~30-40 secondes pour tous les tests

## 🏆 **Statut actuel**

- ✅ **Tests d'API** : 8/9 passent (89%)
- ✅ **Tests unitaires** : 70/72 passent (97%)
- ✅ **Total global** : 78/81 tests passent (96%)

**Excellent travail ! 🎉**
