# AfriGest - Application de Gestion Multi-Boutiques

## 🚀 Description

AfriGest est une solution professionnelle centralisée et multi-entreprises, permettant :

- À un **Super Admin** de gérer plusieurs entreprises
- À chaque **Entreprise (PDG/Admin)** de gérer ses propres boutiques  
- À chaque **Boutique (DG)** de gérer ses ventes, stocks et employés
- Aux **Employés** d'effectuer les ventes et la gestion des stocks

## 🎯 Objectif

Fournir une plateforme scalable, sécurisée et réutilisable pour différents commerces, sans devoir tout recréer à chaque nouveau client.

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)
- **API REST** avec authentification JWT
- **Architecture multi-tenant** (chaque entreprise a ses données isolées)
- **Système de rôles** avec 4 niveaux de permissions
- **Base de données MongoDB** avec schémas optimisés

### Frontend (React + TypeScript + Material-UI)
- **Interface responsive** (desktop, tablette, mobile)
- **Design moderne** selon la charte graphique AfriGest
- **Tableaux de bord différenciés** selon le rôle utilisateur
- **Gestion d'état** avec Context API

## 🎨 Charte Graphique

- **Couleurs principales** : Bleu (#1D4ED8), Vert (#059669), Gris foncé (#111827), Blanc (#FFFFFF)
- **Typographie** : Inter/Poppins (moderne et lisible)
- **Style** : minimaliste, professionnel, épuré

## 👥 Rôles et Permissions

### 1. Super Admin (Niveau 0)
- Gestion centralisée de toute la plateforme
- Création des comptes PDG/Admin Entreprise
- Supervision de l'activité globale
- Accès au tableau de bord global

### 2. PDG/Admin Entreprise (Niveau 1)
- Création et gestion de ses boutiques
- Création des DG de ses boutiques
- Accès à la comptabilité consolidée
- Suivi des ventes, marges, bénéfices

### 3. DG de Boutique (Niveau 2)
- Gestion des ventes quotidiennes
- Suivi du stock et approvisionnements
- Rapports de fin de journée
- Gestion des caissiers/employés

### 4. Employés (Niveau 3)
- Encaissement des ventes
- Mise à jour de stock
- Pas d'accès aux finances globales

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (v16 ou supérieur)
- MongoDB (local ou Atlas)
- npm ou yarn

### 1. Installation des dépendances

```bash
# Installation des dépendances du serveur
npm install

# Installation des dépendances du client
cd client
npm install
cd ..
```

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp env.example .env

# Éditer le fichier .env avec vos configurations
# MONGODB_URI=mongodb://localhost:27017/afrigest
# JWT_SECRET=your_super_secret_jwt_key_here
# etc.
```

### 3. Démarrage

```bash
# Démarrer le serveur et le client en parallèle
npm run dev

# Ou démarrer séparément :
# Serveur (port 5000)
npm run server

# Client (port 3000)
npm run client
```

## 📁 Structure du Projet

```
AfriGest/
├── server/                 # Backend Node.js
│   ├── models/            # Modèles MongoDB
│   ├── routes/            # Routes API
│   ├── middleware/        # Middleware d'authentification
│   └── index.js          # Point d'entrée du serveur
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── contexts/      # Context API (Auth)
│   │   └── App.tsx       # Composant principal
│   └── public/           # Fichiers statiques
├── package.json          # Dépendances et scripts
└── README.md            # Documentation
```

## 🔧 Fonctionnalités Principales

### ✅ Implémentées
- [x] **Authentification** avec 4 niveaux de rôles
- [x] **Gestion des entreprises** (Super Admin)
- [x] **Gestion des boutiques** (Company Admin)
- [x] **Gestion des utilisateurs** avec permissions
- [x] **Gestion des ventes** avec facturation
- [x] **Gestion des stocks** avec alertes
- [x] **Comptabilité** consolidée et détaillée
- [x] **Tableaux de bord** différenciés par rôle
- [x] **Interface responsive** avec Material-UI
- [x] **Vitrine publique** avec branding AfriGest

### 🔄 En cours
- [ ] **Module de création de ventes** (interface de caisse)
- [ ] **Gestion des clients** avancée
- [ ] **Rapports d'export** (PDF, Excel)
- [ ] **Notifications** en temps réel

### 📋 À venir
- [ ] **Module e-commerce** intégré
- [ ] **Application mobile** (React Native)
- [ ] **Intégrations** (paiements, comptabilité)
- [ ] **Système d'abonnements** SaaS

## 🛡️ Sécurité

- **Authentification JWT** avec expiration
- **Chiffrement des mots de passe** (bcrypt)
- **Rate limiting** pour éviter les abus
- **Validation des données** côté serveur
- **CORS** configuré pour la sécurité
- **Helmet** pour les en-têtes de sécurité

## 📊 Base de Données

### Collections principales
- **Users** : Utilisateurs avec rôles et permissions
- **Companies** : Entreprises avec abonnements
- **Stores** : Boutiques avec statistiques
- **Products** : Produits avec gestion des stocks
- **Sales** : Ventes avec détails et paiements
- **Categories** : Catégories de produits
- **Customers** : Clients des boutiques

## 🌐 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `GET /api/auth/me` - Profil utilisateur

### Entreprises
- `GET /api/companies` - Liste des entreprises
- `POST /api/companies` - Créer une entreprise
- `GET /api/companies/:id` - Détails d'une entreprise

### Boutiques
- `GET /api/stores` - Liste des boutiques
- `POST /api/stores` - Créer une boutique
- `GET /api/stores/:id` - Détails d'une boutique

### Ventes
- `GET /api/sales` - Liste des ventes
- `POST /api/sales` - Créer une vente
- `GET /api/sales/:id` - Détails d'une vente

### Stocks
- `GET /api/inventory/products` - Liste des produits
- `POST /api/inventory/products` - Créer un produit
- `PUT /api/inventory/products/:id/stock` - Mettre à jour le stock

### Comptabilité
- `GET /api/accounting/revenue` - Revenus
- `GET /api/accounting/profit-loss` - Compte de résultat
- `GET /api/accounting/cash-flow` - Flux de trésorerie

## 🧪 Tests

```bash
# Tests du serveur
npm test

# Tests du client
cd client
npm test
```

## 📦 Déploiement

### Production
```bash
# Build du client
cd client
npm run build

# Démarrage du serveur en production
npm start
```

### Docker (optionnel)
```bash
# Build de l'image
docker build -t afrigest .

# Démarrage du conteneur
docker run -p 5000:5000 afrigest
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou support :
- Email : support@afrigest.com
- Documentation : [docs.afrigest.com](https://docs.afrigest.com)

---

**AfriGest** - La gestion moderne, simple et accessible 🚀
