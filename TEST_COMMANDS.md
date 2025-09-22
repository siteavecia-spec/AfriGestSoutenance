# 🧪 Commandes de Test AfriGest

## 🚀 **Commandes de test rapides**

### ✅ **Tests qui fonctionnent parfaitement**

#### 🔐 **Tests d'authentification (100% de réussite)**
```bash
npx jest tests/api.test.js --testNamePattern="Tests d'authentification" --testTimeout=30000
```

#### 🏢 **Tests d'entreprises (100% de réussite)**
```bash
npx jest tests/api.test.js --testNamePattern="Tests gestion des entreprises" --testTimeout=30000
```

#### 👤 **Tests User (89% de réussite)**
```bash
npm run test:unit
```

### 🔧 **Tests de développement**

#### **Tous les tests d'API**
```bash
npx jest tests/api.test.js --testTimeout=30000
```

#### **Tous les tests unitaires**
```bash
npm run test:unit
```

#### **Tests spécifiques**
```bash
# Test d'un endpoint spécifique
npx jest tests/api.test.js --testNamePattern="POST /api/companies" --testTimeout=30000

# Test d'un modèle spécifique
npx jest tests/unit/models/User.test.js --testTimeout=30000
```

## 📊 **Résultats attendus**

### ✅ **Tests qui passent**
- **Authentification** : 3/3 tests ✅
- **Entreprises** : 4/4 tests ✅
- **Utilisateurs** : 16/18 tests ✅

### ❌ **Tests qui échouent (à corriger)**
- **Boutiques** : 0/2 tests ❌
- **Utilisateurs** : 2/18 tests ❌

## 🛠️ **Commandes de débogage**

### **Voir les logs détaillés**
```bash
npx jest tests/api.test.js --verbose --testTimeout=30000
```

### **Tests en mode watch**
```bash
npx jest tests/api.test.js --watch --testTimeout=30000
```

### **Tests avec couverture**
```bash
npx jest --coverage --testTimeout=30000
```

## 🔍 **Commandes de diagnostic**

### **Vérifier la connexion MongoDB**
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ MongoDB connecté')).catch(err => console.error('❌ Erreur MongoDB:', err))"
```

### **Vérifier l'application**
```bash
curl http://localhost:5000/api/health
```

## 📝 **Notes importantes**

1. **Timeout** : Utilisez toujours `--testTimeout=30000` pour éviter les timeouts
2. **MongoDB** : Les tests utilisent MongoDB Atlas (pas de serveur local)
3. **Tokens** : Chaque test d'API obtient son propre token d'authentification
4. **Nettoyage** : Les données de test sont automatiquement nettoyées

## 🎯 **Prochaines étapes**

1. **Corriger les boutiques** : Résoudre les erreurs 500
2. **Finaliser les User** : Corriger les 2 tests qui échouent
3. **Tester les utilisateurs** : Valider les routes /api/users
4. **Tester les ventes** : Valider les routes /api/sales
