# Déploiement AfriGest (Render + Vercel)

Ce guide décrit comment déployer l’API Node/Express sur Render et le Front React sur Vercel, avec une base MongoDB Atlas.

## Prérequis
- Un cluster MongoDB Atlas et une base accessible depuis Render.
- Un compte Render (API/backend) et un compte Vercel (front).
- Les domaines autorisés dans MongoDB Atlas (Network Access) pour les IPs/outils Render.

## 1) API (Render)

- Service: Web Service Node.js
- Commande de démarrage
  ```bash
  node server/index.js
  ```
- Variables d’environnement
  - `MONGODB_URI` — URI Atlas (mongodb+srv://...)
  - `JWT_SECRET` — clé secrète JWT
  - `CLIENT_URL` — URL du front Vercel (ex: https://afrigest.vercel.app)
  - `NODE_ENV` — production
- Ports
  - Render détecte le port fourni par Express (via process.env.PORT dans server/index.js si applicable). Sinon expose 5000.
- CORS
  - Dans `server/app.js`, CORS est configuré avec `origin: process.env.CLIENT_URL`. 
  - Si vous utilisez des previews Vercel, ajoutez-les aussi (ou élargissez la règle prudemment pour la phase de démo).

Après déploiement, valider:
- GET `https://<ton-api>.onrender.com/api/health` → 200

## 2) Frontend (Vercel)

- Projet: Import du repo, sélection du dossier `client/` si nécessaire.
- Build command
  - CRA par défaut: `npm run build`
- Variables d’environnement (Build & Runtime):
  - `REACT_APP_API_URL` — `https://<ton-api>.onrender.com`
- Assets
  - Placez vos logos dans `client/public/logos/`.

Après déploiement, valider:
- La page d’accueil se charge, les requêtes vont bien vers l’API Render (pas de CORS 403/401).

## 3) Configuration Axios

Dans `client/src/api/axiosConfig.ts`:
- `REACT_APP_API_URL` s’il est défini, est utilisé comme base (le code retire `"/api"` de fin au besoin).
- En local, si origin `localhost`, on utilise des URLs relatives (CRA proxy → `proxy` dans `client/package.json`).

## 4) Vérifications fin de déploiement

- `StatusPage` (`/dashboard/status`) → toutes les vérifications passent.
- `Companies`/`CompanyDetails` → chargement sans erreur, édition des réglages OK.
- `E‑commerce public` → publique accessible et opérationnelle.
- `Sales` → création d’une vente de test.

## 5) Tests automatiques (smoke)

Exécuter contre Render (ou en local):
```bash
API_URL=https://<ton-api>.onrender.com \
TOKEN=<JWT_SUPER_OU_ADMIN> \
TENANT_ID=<companyId> \
npm run smoke
```
Le script testera: santé, auth, entreprises, utilisateurs, boutiques, ventes (lecture + écriture), produits publics, commande publique.

## 6) Dépannage
- 401/403 → vérifier le token côté Front (localStorage) et l’intercepteur axios.
- 404 images → vérifier `client/public/logos/` et les chemins `/logos/*.png`.
- 500 API → regarder les logs Render; corriger la route concernée (pagination, IDs, populate, etc.).
- CORS → s’assurer que `CLIENT_URL` pointe vers l’URL Vercel finale.
