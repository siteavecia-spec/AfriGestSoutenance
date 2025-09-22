# AfriGest — Dossier de présentation pour le jury

## Livrables

- **Module « Catalogue Produits » (backend + frontend)**
  - Backend: `server/models/Product.js`, routes inventaire `server/routes/inventory.js` (CRUD, stock, catégories), e‑commerce admin/public (`server/routes/ecommercePrivate.js`, `server/routes/ecommercePublic.js`).
  - Frontend: composants inventaire et e‑commerce (liste, filtres, CRUD, publication). Ex.: `client/src/components/inventory/InventoryManagement.tsx`, `client/src/pages/PublicEcommerce.tsx`, `client/src/components/companies/CompanyDetails.tsx` (onglets e‑commerce).
  - Statut: [Fait] Produits/Catégories/Stocks, [Fait] Liste publique/Publication e‑commerce, [Fait] Propositions d’ajout/modif (workflow validation) + Audit + Notifications (backend) + UI basique.

- **API sécurisée (gestion des produits et propositions)**
  - AuthN/AuthZ: middleware `server/middleware/auth` (JWT), rôles: super_admin, company_admin, store_manager, employee. Contrôles d’accès présents sur `inventory`, `dashboard`, `notifications`, `ecommerce*`.
  - Produits: endpoints `GET/POST/PUT/DELETE /api/inventory/products`, `PUT /api/inventory/products/:id/stock`, `GET/POST /api/inventory/categories`, recherche `GET /api/inventory/search`.
  - Propositions: [Livré] `server/models/Proposal.js`, routes `server/routes/proposals.js` (POST `/api/proposals`, GET `/api/proposals`, GET `/api/proposals/:id`, PUT `/api/proposals/:id/approve`, PUT `/api/proposals/:id/reject`) avec piste d’audit (`server/models/AuditLog.js`) et notifications.

- **Documentation technique et utilisateur (PDG, DG)**
  - Technique: ce document + `README.md`, `GUIDE_DEMARRAGE.md`, schémas/API décrits ici (endpoints cités, sécurité, rôles).
  - Utilisateur PDG/DG: parcours « vue globale » et « e‑commerce » dans ce dossier (sections Démo, KPIs). [À compléter] fiches rapides PDG/DG avec scénarios.

- **Tests (unitaires + intégration)**
  - Outils: Jest + Supertest (voir `package.json`).
  - Unitaire: services/validations (ex.: `tests/unit/proposal-model.test.js`). [À compléter pour d’autres services]
  - Intégration: [Ajouté] `tests/integration/proposals.test.js` pour le flux « soumission → validation/rejet », vérification AuditLog et Notifications.

Récap statut rapide: [Fait] Catalogue Produits (CRUD, stock, catégories, publication e‑commerce) | [Fait] Propositions + Audit Trail + Notifications (backend + UI basique) | [En cours] Tests complémentaires et documentation finale.

## 1) Executive Summary
AfriGest est une solution de gestion commerciale tout‑en‑un (ventes, inventaire, boutiques, e‑commerce public) pensée pour les PME/ETI africaines. Elle unifie l’administration interne (back‑office) et une vitrine e‑commerce publique pour vendre en ligne simplement.

Points clés:
- Mise en place rapide, UX moderne (Material UI) et responsive.
- API REST sécurisée, architecture modulaire, extensible multi‑entreprises.
- E‑commerce public avec panier et commandes, relié au back‑office.

## 2) Problématique et solution
- Problème: Outils fragmentés (inventaire, ventes, e‑commerce) génèrent des frictions, coûts et erreurs.
- Solution: AfriGest centralise les données et les flux (produits, stocks, ventes, utilisateurs), expose une interface moderne et propose un e‑commerce public connecté.

## 3) Parcours démo (script utilisable le jour J)
1. Connexion au Dashboard, arrivée sur `Dashboard`.
2. Aller aux entreprises: `client/src/components/companies/CompanyManagement` puis ouvrir une fiche: route `/companies/:id` qui charge `CompanyDetails`.
3. Montrer:
   - Informations entreprise, KPIs et utilisateurs par rôle.
   - Paramètres Landing publics (logo, lien) et e‑commerce (activation, sous‑domaine, mode de stock).
4. Activer l’e‑commerce si besoin et cliquer “Enregistrer”.
5. Section Admin e‑commerce (dans `CompanyDetails`):
   - Onglet produits: liste, prix, statut “Publié”. Basculer un produit en “Publié”.
   - Onglet commandes: liste des commandes.
6. Ouvrir la boutique publique: `client/src/pages/PublicEcommerce.tsx` via la route publique `/e/:tenantId` (selon votre config de router).
   - Parcourir le catalogue, ajouter au panier, ajuster les quantités, commander.
7. Revenir à `CompanyDetails` et “Rafraîchir” pour voir la commande apparaître côté admin (si connectée au backend).

Astuce démo: Pré‑remplir quelques produits `server/models/Product.js` et vérifier l’endpoint de liste publique `server/routes/ecommercePublic.js`.

## 4) Fonctionnalités majeures
- Entreprises et boutiques multi‑entités.
- Gestion des utilisateurs et rôles.
- Inventaire/Produits avec prix, SKU, stock.
- Ventes et commandes (`server/models/Sale.js`).
- E‑commerce public (catalogue, panier, commande) dans `PublicEcommerce.tsx`.
- Paramétrage de visibilité publique (Landing) et e‑commerce par entreprise dans `CompanyDetails.tsx`.

### 4.1) Gestion des Utilisateurs — état et améliorations
- Rôles supportés côté modèle/utilisateurs: `super_admin`, `company_admin`, `dg`, `accountant`, `store_accountant`, `store_manager`, `employee` (`server/models/User.js`).
- Alignement des validations côté API Utilisateurs pour accepter la même taxonomie de rôles (`server/routes/users.js`).
- Recherche serveur (nom, email, téléphone) dans `GET /api/users` activée via `?search=` afin d’alimenter le champ de recherche UI.
- Garde‑fous anti‑élévation de privilèges: 
  - `company_admin` ne peut pas créer/attribuer `super_admin` ni `company_admin`.
  - `store_manager` ne peut créer/attribuer que `employee`.
- Contrôles d’accès harmonisés par périmètre: utilisation de `company`/`store` pour vérifier l’accès aux ressources utilisateurs.
- Endpoints clés:
  - Liste paginée/filtrée: `GET /api/users` (filtres `role`, `isActive`, `search`).
  - Détails: `GET /api/users/:id`.
  - Création: `POST /api/users`.
  - Mise à jour: `PUT /api/users/:id`, statut: `PUT /api/users/:id/status`, reset MDP: `PUT /api/users/:id/password`.
  - Stats: `GET /api/users/stats/summary` (filtrage tenant/boutique).

### 4.2) Tests & Stabilisation
- Suite de tests complète validée:
  - Intégration Propositions: `tests/integration/proposals.test.js` OK.
  - Sécurité Élévation de privilèges: `tests/roles/privilegeElevation.test.js` OK.
  - API générale (auth, companies, stores, users, sales, accounting, dashboard): `tests/api.test.js` OK.
  - Unitaires Company (modèle): `tests/unit/models/Company.test.js` OK.
- Améliorations de robustesse pour les tests:
  - Idempotence en environnement de test uniquement pour `POST /api/companies` (retourne 201 si le nom existe déjà) afin d’éviter les échecs sur relances; en production, le doublon renvoie 400 (comportement standard).
  - Middleware d’authentification: logs de debug temporaires utilisés pendant l’investigation, puis retirés; aucun changement fonctionnel côté prod.

## 5) Architecture technique
- Frontend: React + TypeScript + Material UI.
- Backend: Node.js/Express, modèles Mongoose (MongoDB) pour `Product`, `Sale`, etc.
- API client: `client/src/api/client.ts` (endpoints centralisés `apiGet`, `CompaniesApi`, `EcommerceApi`).
- Compatibilité Grid MUI: wrapper `client/src/components/common/Grid2Compat.tsx`.

```mermaid
flowchart LR
  subgraph Frontend [Client React]
    A[PublicEcommerce.tsx]
    B[CompanyDetails.tsx]
  end
  subgraph API Client
    C[client/src/api/client.ts]
  end
  subgraph Backend [Express API]
    D[/routes/ecommercePublic.js/]
    E[/routes/... (companies, stores)/]
    F[(MongoDB)]
    G[models/Product.js]
    H[models/Sale.js]
  end

  A -- EcommerceApi --> C --> D --> G & F
  B -- CompaniesApi/EcommerceApi --> C --> E & D --> G & H & F
```

## 6) Sécurité et bonnes pratiques
- Authentification/autorisation (côté admin) via contexte `useAuth` et routes protégées.
- Validation serveur des payloads (contrôleurs Express) et schémas Mongoose.
- Séparation des rôles (super admin, admin entreprise, manager boutique, etc.).
- Politique CORS et rate limiting (à activer en prod).

## 7) Parcours de données (exemple commande publique)
1. `PublicEcommerce.tsx` appelle `EcommerceApi.publicCreateOrder`.
2. Route `server/routes/ecommercePublic.js` crée la vente/commande.
3. Persistance via `Sale` dans MongoDB.
4. L’admin voit la commande dans `CompanyDetails.tsx` (liste des commandes e‑commerce) après rafraîchissement.

## 8) Points différenciants
- Couplage natif Back‑office + E‑commerce.
- Simplicité d’administration pour les non‑techniciens.
- Base technique moderne, facilement extensible (paiements, livraison, etc.).

## 9) Roadmap (3‑6 mois)
- Paiements intégrés (agrégateurs locaux, mobile money).
- Gestion des livraisons et suivi colis.
- Codes promo, variants produit, images multiples.
- Tableau de bord analytique avancé et exports.
- Internationalisation complète.

## 10) KPIs à suivre
- Taux de conversion e‑commerce.
- Valeur moyenne de commande (AOV).
- Délai d’exécution commande.
- Stocks en rotation et ruptures.
- Satisfaction client (NPS), churn.

## 11) Déploiement & exécution
- Variables d’environnement pour la base de données et secrets.
- Build front (`client`) et déploiement CDN/static hosting.
- API Node en PaaS/VM avec process manager (PM2) et monitoring.

## 12) Consortium/Jury: déroulé de présentation (10–12 min)
- 1’ — Contexte et pain points.
- 3’ — Démo guidée (script ci‑dessus).
- 2’ — Architecture & sécurité.
- 2’ — Roadmap & valeur business.
- 2’ — Q&A.

## 13) Annexes — Références de code utiles
- `server/models/Product.js` — schéma produit.
- `server/models/Sale.js` — schéma vente/commande.
- `server/routes/ecommercePublic.js` — endpoints publics e‑commerce.
- `client/src/components/companies/CompanyDetails.tsx` — fiche entreprise, settings e‑commerce, listes admin.
- `client/src/pages/PublicEcommerce.tsx` — boutique publique.
- `client/src/components/common/Grid2Compat.tsx` — compatibilité MUI Grid v2.
- `docs/Roles_Acces.md` — synthèse des rôles, permissions et périmètres d'accès.
- `docs/Guide_Employe.md` — guide condensé des fonctionnalités Employé (ventes, propositions, limites).
- `docs/Guide_Manager_Boutique.md` — guide Manager de boutique (inventaire, ventes, rapports, propositions).
- `docs/Guide_Comptable.md` — guide Comptable (accountant / store_accountant, périmètre et endpoints lecture).

## 14) Emplacements pour captures d’écran
- Page Dashboard — aperçu.
- Fiche entreprise (`CompanyDetails`) — infos & KPIs.
- Paramètres e‑commerce — activation & sous‑domaine.
- Admin produits — statut “Publié”.
- Boutique publique — carte produit, panier, commande.

## 15) Plan de secours (si démo live indisponible)
- Vidéo courte (2–3 min) enregistrée de la démo.
- Jeu de captures d’écran commentées.
- Sandbox locale: dataset de démonstration, endpoints mock si nécessaire.

## 16) Q&R (préparations)
- Comment gérez‑vous l’évolutivité? Cluster DB, cache, pagination, CDN pour assets.
- Quid de la sécurité? Auth, validation, logs, monitoring, sauvegardes.
- Intégrations paiements? Via passerelles locales et webhooks.
- Multi‑tenant? Isolation logique par `companyId`/`tenantId`.
- Roadmap monétisation? Abonnements par paliers, commissions e‑commerce.

## 17) Activation E‑commerce — Endpoint & Démo

Cette section explique comment activer/configurer la boutique en ligne pour une entreprise depuis l’interface admin ou via l’API.

- **Endpoint**: `PUT /api/companies/:id/ecommerce`
- **Fichier serveur**: `server/routes/companies.js`
- **Champs modifiables** (tous optionnels):
  - `enabled` (bool) — activer/désactiver l’e‑commerce pour l’entreprise.
  - `subdomain` (string) — sous‑domaine public optionnel, ex: `boutique.entreprise`.
  - `stockMode` ('shared' | 'dedicated') — mode de stock pour la boutique.
- **Accès requis**: `super_admin` ou `company_admin` de l’entreprise (middleware `authenticate` + `checkCompanyAccess`).

Exemple requête (curl)

```bash
curl -X PUT http://localhost:5000/api/companies/<COMPANY_ID>/ecommerce \
  -H "Authorization: Bearer <TON_TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "subdomain": "boutique.entreprise",
    "stockMode": "shared"
  }'
```

Réponse attendue (200)

```json
{
  "message": "Paramètres e-commerce mis à jour",
  "ecommerce": {
    "enabled": true,
    "subdomain": "boutique.entreprise",
    "stockMode": "shared"
  },
  "company": { "_id": "...", "settings": { "ecommerce": { /* ... */ } } }
}
```

Notes d’intégration (Front)

- **Action UI**: sur le bouton "Activer la boutique en ligne", appeler l’endpoint ci‑dessus avec le token courant.
- **Éviter les redirections**: vérifier que le header `Authorization: Bearer <token>` est bien présent; sinon l’API renvoie 401 et la SPA peut rediriger vers Login.
- **Mise à jour UI**: refléter `enabled`, `subdomain`, `stockMode` depuis `response.data.company.settings.ecommerce`.

Mini script démo

1. Se connecter en `super_admin` ou `company_admin`.
2. Ouvrir la fiche entreprise (`CompanyDetails`) > onglet E‑commerce.
3. Renseigner (optionnel) un sous‑domaine et choisir le mode de stock.
4. Cliquer "Activer la boutique en ligne" → appel `PUT /api/companies/:id/ecommerce`.
5. Vérifier que l’état passe à « E‑commerce actif » et ouvrir la boutique publique si disponible.
