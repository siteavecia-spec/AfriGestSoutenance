# AfriGest Deployment Guide

This document summarizes the environment setup and pre-deployment checklist for both server and client.

## Server (Node/Express) setup

- Environment file: create `.env` at the project root (same level as `/server` and `/client`). Use `server/.env.example` as reference.

Required variables:
- MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
- MONGODB_DBNAME=afrigest
- PORT=5000
- CLIENT_URL=https://app.yourdomain.com
- NODE_ENV=production

Health check:
- GET http://<server-host>:5000/api/health should return JSON with message, timestamp, version.

## Client (React) setup

- In development, CRA proxy sends /api requests to http://localhost:5000 automatically.
- In production, set `REACT_APP_API_URL` so axios targets the API host.

Client environment examples:
- `client/.env.production`:
  - REACT_APP_API_URL=https://api.yourdomain.com

Global axios behavior (configured in `client/src/api/axiosConfig.ts`):
- Base URL: uses REACT_APP_API_URL in production, relative URLs in development.
- Request interceptor: attaches Authorization Bearer token from localStorage.
- Response interceptor:
  - 401/403: clears token, shows a warning toast, redirects to /login
  - others: shows error toast with backend message where available

## Pre-deployment checklist

- Server
  - .env created with MONGODB_URI, CLIENT_URL, NODE_ENV=production
  - Server logs show "Connected to MongoDB" and the running port
  - /api/health returns 200

- Client
  - .env.production has REACT_APP_API_URL
  - Build completes: `npm run build`
  - App uses global NotifyProvider for toast notifications

- CORS
  - In `server/app.js`, CORS origin must be your deployed client URL (from CLIENT_URL). Avoid wildcard in production.

## Post-deployment verification

- Visit the app and login
- Navigate to `/dashboard/status` to run quick checks
  - API Health (GET /api/health)
  - Auth Me (GET /api/auth/me)
  - Companies List (GET /api/companies)

If you want to expand the Status page, add more checks using `UsersApi`, `StoresApi`, and `SalesApi`.

## Notes

- All feature modules were migrated to a centralized API client (`client/src/api/client.ts`) for consistency and easier maintenance.
- If you add new endpoints, prefer using `apiGet/apiPost/apiPut/apiDelete` helpers and export typed domain APIs.

---

# Fonctionnalités disponibles et guide de test

Cette section documente les principales fonctionnalités livrées dans AfriGest, ainsi que des checklists pour les tester rapidement en local ou en environnement de démo.

## 1) Authentification et contexte utilisateur

- Endpoints: `/api/auth/*` (login, me)
- Client: `client/src/contexts/AuthContext.tsx`

Comment tester:
- Lancer le serveur (`server/index.js`) et le client (React).
- Se connecter avec un compte valide (ex: super admin).
- Vérifier que le menu latéral s’adapte au rôle (super_admin, company_admin, etc.).

## 2) Gestion des Entreprises (Super Admin)

- Écran: `Dashboard > Entreprises` (route: `/dashboard/companies`)
- Composants: `client/src/components/companies/CompanyManagement.tsx`, `CompanyDetails.tsx`
- Points clés:
  - Liste des entreprises, stats agrégées, filtres (recherche, statut).
  - Détails entreprise: infos, abonnements/limites, stats, adresses.
  - Responsive mobile: colonnes secondaires masquées sur petits écrans, scroll horizontal des tableaux.

Comment tester:
- Naviguer vers `/dashboard/companies` (super admin).
- Vérifier la liste, les stats (total boutiques/utilisateurs), les chips de statut/plan.
- Ouvrir un détail (icône oeil) et valider les infos affichées.

## 3) Gestion des Boutiques (Stores)

- Endpoints: `/api/stores/*` (voir `server/routes/stores.js`)
- Accès: super_admin (toutes), company_admin (de son entreprise), store_manager/employee (leur boutique).

Comment tester:
- En tant que super_admin, appeler `GET /api/stores` (via page Statut ou Postman) -> réponse 200, liste paginée.
- Créer une boutique (si disponible dans l’UI ou via POST) et vérifier la mise à jour des stats entreprise.

## 4) Gestion des Utilisateurs

- Endpoints: `/api/users/*`
- Rôles supportés: `super_admin`, `company_admin` (PDG), `store_manager` (DG), `employee`.

Comment tester:
- Créer un PDG pour une entreprise (company_admin) et un DG pour une boutique (store_manager).
- Lister `/api/users?company=<id>` et valider les rôles.

## 5) Ventes (Sales)

- Endpoints: `POST /api/sales`, `GET /api/sales`, `GET /api/sales/receipt/:id`, `GET /api/sales/stats/summary`
- Serveur: `server/routes/sales.js`
- Client helper: `SalesApi.create` dans `client/src/api/client.ts`

Comment tester (Vente de test):
- Aller sur `/dashboard/status`.
- Dans « Vente de test »: sélectionner une Entreprise, une Boutique, un Produit actif (stock > 0), cliquer « Créer une vente de test ».
- Attendu: message succès avec l’ID de la vente, écriture directe dans MongoDB Atlas (collection `sales`).

## 6) Page Statut et Vérifications rapides

- Écran: `Dashboard > Statut` (route: `/dashboard/status`, visible pour `super_admin`)
- Fichier: `client/src/components/status/StatusPage.tsx`
- Vérifications incluses:
  - API Health (`GET /api/health`)
  - Auth Me (`GET /api/auth/me`)
  - Companies List (`GET /api/companies`)
  - Users List (`GET /api/users`)
  - Stores List (`GET /api/stores`)
  - Sales List (`GET /api/sales`)
- Outils Super Admin intégrés:
  - « Vérification Entreprises »: contrôle par entreprise qu’il existe 1 boutique, ≥1 PDG (company_admin), ≥1 DG (store_manager).
  - « Informations de connexion (PDG / DG) »: liste par entreprise les emails PDG et DG, export CSV.
  - « Vente de test »: création de vente persistée.

Comment tester:
- Naviguer `/dashboard/status` (menu « Statut » ajouté pour super_admin dans `Layout.tsx`).
- Cliquer « Relancer les tests » pour rafraîchir les checks.
- Utiliser « Vérifier » pour alimenter les compteurs Boutiques/PDG/DG par entreprise.
- Cliquer « Charger » puis « Exporter CSV » dans la section « Informations de connexion (PDG / DG) ».

## 7) Notifications (Menu cloche) + Persistance

- Client: `client/src/components/Layout.tsx` (menu cloche actif)
- Backend: modèle `server/models/Notification.js`, routes `server/routes/notifications.js`
- API client: `NotificationsApi` dans `client/src/api/client.ts`
- Fonctionnement:
  - Le client écoute les événements globaux `app:notify` (déclenchés depuis `axiosConfig.ts` ou manuellement) et affiche un badge « non lus ».
  - Les notifications locales sont persistées (POST `/api/notifications`).
  - Le menu charge les notifications persistées au démarrage (GET `/api/notifications`).
  - « Marquer tout lu » appelle `PUT /api/notifications/read-all`.
  - Le clic sur un item marque « lu » (PUT `/api/notifications/:id/read`) si id serveur.

Comment tester:
- Déclencher depuis la console:
  ```js
  window.dispatchEvent(new CustomEvent('app:notify', {
    detail: { message: 'Notification de test', severity: 'success' }
  }));
  ```
- Ouvrir le menu cloche: la notification apparaît et est persistée.
- Tester « Marquer tout lu » et recharger la page: l’état doit rester cohérent.

## 8) Mobile-first / Responsive

- Mises à jour principales sur:
  - `CompanyManagement.tsx`: table compacte, scroll horizontal sur mobile, colonnes secondaires masquées (Contact, Boutiques, Utilisateurs, Revenus) aux petits breakpoints.
  - `CompanyDetails.tsx`: header et section « Boutiques » reflow sur mobile, table scrollable, colonnes masquées selon la largeur.

Comment tester:
- Ouvrir les pages ci-dessus et réduire la fenêtre à 375–414 px (mobile), et 768 px (tablette).
- Vérifier que les informations critiques restent visibles et que le scroll horizontal est présent pour les tableaux.

---

# Dépannage rapide

- Base URL axios:
  - `REACT_APP_API_URL` doit pointer sur l’origine de l’API sans `/api` (ex: `http://localhost:5000`).
  - Les endpoints côté client incluent déjà `/api/...`.
- Erreurs 401/403: le token est supprimé et la redirection vers `/login` est automatique.
- Erreurs 500 Stores/Companies:
  - Vérifier que le serveur a bien redémarré après modification du middleware `auth.js`.
  - Les checks d’accès normalisent ObjectId vs objets peuplés pour éviter les 500.

