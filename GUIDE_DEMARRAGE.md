# 🚀 Guide de Démarrage Rapide - AfriGest

## 📋 Prérequis

- **Node.js** (v16 ou supérieur)
- **MongoDB** (local ou Atlas)
- **Git**

## ⚡ Démarrage Express (5 minutes)

### 1. Installation des dépendances
```bash
# Installer toutes les dépendances
npm run install-all
```

### 2. Configuration
```bash
# Les fichiers .env sont déjà créés avec les valeurs par défaut
# Vous pouvez les modifier si nécessaire
```

### 3. Créer un Super Admin
```bash
# Créer le premier utilisateur (Super Admin)
npm run create-admin
```

### 4. Démarrer l'application
```bash
# Option 1: Script automatique (Windows)
start-dev.bat

# Option 2: Commande manuelle
npm run dev
```

### 5. Accéder à l'application
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **Super Admin** : admin@afrigest.com / admin123

## 🎯 Première Utilisation

### 1. Connexion
- Ouvrez http://localhost:3000
- Cliquez sur "Se connecter"
- Utilisez : `admin@afrigest.com` / `admin123`

### 2. Créer une entreprise
- Allez dans "Entreprises" (menu Super Admin)
- Cliquez sur "Nouvelle Entreprise"
- Remplissez les informations

### 3. Créer une boutique
- Allez dans "Boutiques"
- Cliquez sur "Nouvelle Boutique"
- Sélectionnez l'entreprise créée

### 4. Créer des utilisateurs
- Allez dans "Utilisateurs"
- Créez des PDG/Admin, DG Boutique, Employés

### 5. Ajouter des produits
- Allez dans "Stocks"
- Créez des catégories et produits

### 6. Effectuer des ventes
- Allez dans "Ventes"
- Créez de nouvelles ventes

## 🔧 Configuration MongoDB

### Option 1: MongoDB Local
```bash
# Installer MongoDB Community Edition
# Démarrer le service MongoDB
# L'URI par défaut fonctionne : mongodb://localhost:27017/afrigest
```

### Option 2: MongoDB Atlas (Cloud)
```bash
# Créer un cluster sur https://cloud.mongodb.com
# Modifier .env :
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/afrigest
```

## 🎨 Personnalisation

### Changer les couleurs
Modifiez `client/src/App.tsx` :
```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1D4ED8' }, // Bleu principal
    secondary: { main: '#059669' }, // Vert secondaire
  },
});
```

### Ajouter des fonctionnalités
- **Backend** : Ajoutez des routes dans `server/routes/`
- **Frontend** : Créez des composants dans `client/src/components/`

## 🐛 Résolution de Problèmes

### Erreur de connexion MongoDB
```bash
# Vérifier que MongoDB est démarré
# Vérifier l'URI dans .env
# Tester la connexion
```

### Erreur de port déjà utilisé
```bash
# Changer le port dans .env
PORT=5001
CLIENT_URL=http://localhost:3001
```

### Erreur de dépendances
```bash
# Nettoyer et réinstaller
rm -rf node_modules client/node_modules
npm run install-all
```

## 📱 Test sur Mobile

L'application est responsive ! Testez sur :
- **Desktop** : http://localhost:3000
- **Mobile** : Utilisez l'IP de votre machine
- **Tablette** : Interface adaptée automatiquement

## 🚀 Déploiement

### Production
```bash
# Build du client
cd client && npm run build

# Démarrage en production
npm start
```

### Docker (optionnel)
```bash
# Créer un Dockerfile
# Build et run
```

## 📞 Support

- **Documentation** : README.md
- **Issues** : GitHub Issues
- **Email** : support@afrigest.com

---

**🎉 Félicitations !** Votre application AfriGest est prête à l'emploi !

**Prochaines étapes :**
1. Créer votre première entreprise
2. Configurer vos boutiques
3. Ajouter vos produits
4. Former vos utilisateurs
5. Commencer les ventes !

**AfriGest** - La gestion moderne, simple et accessible 🚀
