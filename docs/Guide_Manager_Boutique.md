# Guide Manager de Boutique — AfriGest

Ce guide explique les fonctionnalités disponibles pour un utilisateur "Store Manager" (Gérant de boutique).

## Fonctions principales

- Gestion d'inventaire (créer/modifier des produits) — périmètre: sa boutique
- Création de ventes — périmètre: sa boutique
- Accès aux rapports (ventes/comptabilité) — en lecture, périmètre: sa boutique
- Soumission de propositions (produits)

## Ce qui n’est pas autorisé

- Validation/Rejet des propositions (réservé à `company_admin` et `super_admin`)
- Gestion des utilisateurs
- Accès entreprise (hors périmètre boutique)

## Inventaire — Créer un produit

- Endpoint: `POST /api/products`
- Auth: `Authorization: Bearer <TOKEN_MANAGER>`
- Le serveur force `storeId = <STORE_DU_MANAGER>`
- Exemple cURL:
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <TOKEN_MANAGER>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produit Boutique",
    "sku": "SM-001",
    "pricing": { "costPrice": 10000, "sellingPrice": 15000 },
    "inventory": { "currentStock": 20, "minStock": 5 },
    "categoryId": null
  }'
```

## Ventes — Créer une vente

- Endpoint: `POST /api/sales`
- Exemple cURL:
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer <TOKEN_MANAGER>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [ { "productId": "<PRODUCT_ID>", "quantity": 1 } ],
    "paymentMethod": "cash"
  }'
```

## Rapports boutique

- Ventes (résumé): `GET /api/sales/stats/summary`
- Comptabilité (lecture): `GET /api/accounting/revenue`, `.../profit-loss`, `.../cash-flow`, `.../reports`
- Tous scoperont automatiquement sur `storeId = <STORE_DU_MANAGER>` si non précisé.

## Propositions (produits)

- Soumission: `POST /api/proposals` (tout utilisateur authentifié)
- Validation/Rejet: réservé à `company_admin` ou `super_admin` (les boutons sont désactivés pour manager côté UI)

## UI — Repères

- Stocks: `client/src/components/inventory/InventoryManagement.tsx` (bouton "Soumettre une proposition")
- Propositions en attente (lecture): `client/src/components/inventory/ProposalsReview.tsx` (actions désactivées)
- Ventes: écran dédié
- Comptabilité: `client/src/components/accounting/AccountingReports.tsx` avec bandeau "niveau boutique"

## Dépannage

- 403 validation proposition: normal (rôle non autorisé à valider)
- 401/redirect login: vérifier le token Authorization en front
- Produit non visible: vérifier boutique et statut actif
