# Tests de Rôles AfriGest

Ce dossier contient les tests spécifiques pour chaque rôle utilisateur dans l'application AfriGest.

## 🎭 Rôles Testés

### 1. 👑 Super Admin (`superAdmin.test.js`)
**Permissions maximales**
- ✅ Gestion complète de toutes les entreprises
- ✅ Création, modification, suppression d'entreprises
- ✅ Gestion de tous les utilisateurs (tous rôles)
- ✅ Accès aux rapports globaux
- ✅ Création d'autres super admins
- ✅ Accès à toutes les routes protégées

### 2. 👔 Admin/PDG (`adminPDG.test.js`)
**Gestion de son entreprise uniquement**
- ✅ Modification des informations de son entreprise
- ✅ Gestion des boutiques de son entreprise
- ✅ Création/modification des utilisateurs de son entreprise
- ✅ Accès aux rapports de son entreprise
- ❌ Ne peut pas modifier d'autres entreprises
- ❌ Ne peut pas créer de super admins
- ❌ Ne peut pas accéder aux statistiques globales

### 3. 🎯 Directeur Général (`directeurGeneral.test.js`)
**Accès en lecture seule aux rapports**
- ✅ Accès aux rapports et statistiques de son entreprise
- ✅ Consultation des utilisateurs et boutiques
- ✅ Accès aux analyses et rapports avancés
- ✅ Export des rapports (ventes, comptabilité, inventaire)
- ❌ Ne peut pas modifier les données
- ❌ Ne peut pas créer/supprimer des utilisateurs
- ❌ Ne peut pas modifier les informations de l'entreprise

### 4. 👨‍💼 Manager (`manager.test.js`)
**Gestion de sa boutique**
- ✅ Gestion complète de sa boutique
- ✅ Création/modification des employés de sa boutique
- ✅ Gestion de l'inventaire de sa boutique
- ✅ Création et gestion des ventes
- ✅ Accès aux rapports de sa boutique
- ❌ Ne peut pas gérer d'autres boutiques
- ❌ Ne peut pas créer des managers ou admins
- ❌ Ne peut pas accéder aux informations de l'entreprise

### 5. 👷 Employee (`employee.test.js`)
**Permissions limitées**
- ✅ Création de ventes
- ✅ Consultation de ses propres ventes
- ✅ Lecture de l'inventaire
- ✅ Gestion de son profil personnel
- ❌ Ne peut pas modifier les produits
- ❌ Ne peut pas voir les ventes d'autres employés
- ❌ Ne peut pas accéder aux rapports
- ❌ Ne peut pas créer des utilisateurs

## 🚀 Exécution des Tests

### Tous les tests de rôles
```bash
npm run test:roles
```

### Tests individuels par rôle
```bash
# Super Admin
npm run test:super-admin

# Admin/PDG
npm run test:admin-pdg

# Directeur Général
npm run test:dg

# Manager
npm run test:manager

# Employee
npm run test:employee
```

### Tests avec Jest directement
```bash
# Tous les tests de rôles
npx jest tests/roles/

# Test spécifique
npx jest tests/roles/superAdmin.test.js
```

## 📊 Couverture des Tests

Chaque fichier de test couvre :

### Tests d'Autorisation
- ✅ Vérification des permissions d'accès
- ✅ Test des restrictions de rôles
- ✅ Validation des tokens d'authentification

### Tests Fonctionnels
- ✅ CRUD operations selon le rôle
- ✅ Gestion des données autorisées
- ✅ Accès aux rapports et statistiques

### Tests de Sécurité
- ✅ Isolation des données entre entreprises
- ✅ Protection contre l'élévation de privilèges
- ✅ Validation des permissions sur les ressources

## 🔧 Configuration

Les tests utilisent :
- **Base de données de test** : `afrigest-test`
- **Timeout** : 30 secondes par test
- **Helpers** : `testHelpers.js` pour la création de données de test
- **Fixtures** : `testData.js` pour les données de référence

## 📝 Structure des Tests

```javascript
describe('🎭 Tests [Rôle] - Permissions et fonctionnalités', () => {
  
  // Configuration initiale
  beforeAll(async () => {
    // Connexion DB et création des données de test
  });

  // Tests par catégorie
  describe('📊 Accès aux rapports', () => {
    test('Doit pouvoir accéder aux statistiques', async () => {
      // Test d'autorisation
    });
  });

  // Tests de limitations
  describe('🔒 Limitations de permissions', () => {
    test('Ne doit PAS pouvoir accéder aux données d\'autres entreprises', async () => {
      // Test de restriction
    });
  });
});
```

## 🎯 Objectifs des Tests

1. **Sécurité** : Vérifier que chaque rôle ne peut accéder qu'aux données autorisées
2. **Fonctionnalité** : Tester que chaque rôle peut effectuer ses tâches assignées
3. **Isolation** : S'assurer que les données sont bien isolées entre entreprises
4. **Élévation de privilèges** : Empêcher les utilisateurs de modifier leur rôle
5. **Intégrité** : Vérifier que les restrictions sont respectées à tous les niveaux

## 🔍 Débogage

En cas d'échec de tests :

1. Vérifier la connexion à la base de données de test
2. S'assurer que les données de test sont correctement créées
3. Vérifier que les tokens d'authentification sont valides
4. Contrôler que les routes API existent et fonctionnent
5. Vérifier les permissions dans le middleware d'authentification

## 📈 Métriques

Les tests génèrent des rapports sur :
- Nombre de tests exécutés
- Taux de réussite par rôle
- Temps d'exécution
- Couverture des permissions
- Erreurs de sécurité détectées
