- accountant
  - canViewAccounting: true
  - canViewReports: true
  - canManageInventory: false
  - canProcessSales: false
  - canManageUsers: false
  - Périmètre: son entreprise (lecture)

- store_accountant
  - canViewAccounting: true
  - canViewReports: true
  - canManageInventory: false
  - canProcessSales: false
  - canManageUsers: false
  - Périmètre: sa boutique (lecture)
# Rôles et Accès — AfriGest

Ce document résume les rôles disponibles dans AfriGest, leurs permissions et le périmètre d'accès aux données, avec des références aux fichiers serveur pour une traçabilité technique.

## Rôles disponibles

- super_admin
- company_admin
- dg (Directeur Général)
- store_manager
- employee

Source: `server/models/User.js` → méthode `getPermissions()`.

## Permissions par rôle (synthèse)

- super_admin
  - canViewAccounting: true
  - canViewReports: true
  - canProcessSales: true
  - canManageCompanies: true
  - canManageSuperAdmins: true
  - canManageUsers: false
  - canManageInventory: true
  - Périmètre: global (toutes entreprises)

- company_admin
  - canManageUsers: true
  - canViewAccounting: true
  - canManageInventory: true
  - canProcessSales: true
  - canViewReports: true
  - Périmètre: son entreprise

- dg
  - canViewAccounting: true
  - canViewReports: true
  - canManageUsers: false
  - canManageInventory: false
  - canProcessSales: false
  - Périmètre: son entreprise (lecture)
  - Note: `server/routes/accounting.js` mis à jour pour traiter `dg` comme `company_admin` dans le scoping.

- store_manager
  - canViewAccounting: true (pour sa boutique)
  - canViewReports: true (pour sa boutique)
  - canManageInventory: true (pour sa boutique)
  - canProcessSales: true
  - canManageUsers: false
  - Périmètre: sa boutique

- employee
  - canProcessSales: true
  - canViewAccounting: false
  - canManageInventory: false
  - canViewReports: false
  - Périmètre: sa boutique (et ses propres ventes selon routes)

## Middlewares d'accès (serveur)

- `authenticate` (JWT, status compte + entreprise/boutique) — `server/middleware/auth.js`
- `checkPermission(permission)` — vérifie `req.user.getPermissions()`
- `checkCompanyAccess` — vérifie que l'utilisateur a accès à l'entreprise ciblée (sauf super_admin)
- `checkStoreAccess` — vérifie que l'utilisateur a accès à la boutique ciblée

## Scoping des données par rôle (exemples)

- Comptabilité — `server/routes/accounting.js`
  - company_admin, dg, accountant: `matchStage.companyId = req.user.company?._id || req.user.company`
  - store_manager, store_accountant, employee: `matchStage.storeId = req.user.store?._id || req.user.store`
  - Endpoints: `/revenue`, `/profit-loss`, `/cash-flow`, `/reports`

- Produits — `server/routes/products.js`
  - super_admin: accès filtrable par `companyId`/`storeId`
  - company_admin: limité à son entreprise
  - store_manager/employee: limité à leur boutique

- Ventes — `server/routes/sales.js`
  - company_admin: limité à son entreprise
  - store_manager/employee: limité à leur boutique; `employee` voit le détail de ses ventes uniquement (`/my-sales`)

## Création des utilisateurs et contraintes

- Route: `POST /api/auth/register` — `server/routes/auth.js`
  - super_admin → peut créer `super_admin` et `company_admin`
  - company_admin/super_admin → peuvent créer `store_manager` et `employee` avec vérification que `store` ∈ `company`

## Limites d'abonnement

- `Company.subscription.maxStores` — `server/models/Company.js`
- Enforcé lors de `POST /api/stores` — `server/routes/stores.js` (compte les boutiques actives et compare à `maxStores`)

## Activation E‑commerce (rappel)

- Endpoint dédié: `PUT /api/companies/:id/ecommerce` — `server/routes/companies.js`
- Champs: `enabled` (bool), `subdomain` (string), `stockMode` ('shared'|'dedicated')
- Accès: `super_admin` ou `company_admin` (via `checkCompanyAccess`)

## Validation des propositions (Stock)

- Soumission: `POST /api/proposals` — tout utilisateur authentifié peut soumettre, avec scoping par rôle (entreprise/boutique).
- Validation: `PUT /api/proposals/:id/approve` — nécessite `checkPermission('canManageInventory')`.
  - `super_admin`: autorisé (périmètre global).
  - `company_admin`: autorisé pour les propositions de son entreprise.
  - `store_manager` et `employee`: non autorisés (bloqués dans la route).
- Rejet: `PUT /api/proposals/:id/reject` — même règles que la validation.
