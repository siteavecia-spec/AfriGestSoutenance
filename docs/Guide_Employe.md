# Guide Employé — AfriGest

Ce guide explique les fonctionnalités disponibles pour un utilisateur Employé, avec des exemples d’API et des repères UI.

## Fonctions principales

- Création de ventes
- Consultation de ses propres ventes
- Soumission de propositions (produits)

## Ce qui n’est pas autorisé

- Accès aux modules de comptabilité et rapports
- Gestion de l’inventaire (création/modification de produits)
- Validation/Rejet des propositions

## Parcours — Création d’une vente

- Endpoint: `POST /api/sales`
- Auth: `Authorization: Bearer <TOKEN_EMPLOYE>`
- Exemple cURL:
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer <TOKEN_EMPLOYE>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "<PRODUCT_ID>", "quantity": 2 }
    ],
    "paymentMethod": "cash"
  }'
```
- Remarques:
  - La vente est créée pour la boutique de l’employé (`storeId` forcé côté serveur).
  - Le stock est vérifié, les montants calculés, et la boutique mise à jour.

## Parcours — Voir ses ventes

- Endpoint: `GET /api/sales/my-sales`
- Exemple cURL:
```bash
curl -X GET http://localhost:5000/api/sales/my-sales \
  -H "Authorization: Bearer <TOKEN_EMPLOYE>"
```
- Le résultat contient uniquement les ventes où l’employé est `cashierId`.

## Parcours — Proposer un produit

- Endpoint: `POST /api/proposals`
- Exemple cURL:
```bash
curl -X POST http://localhost:5000/api/proposals \
  -H "Authorization: Bearer <TOKEN_EMPLOYE>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetEntityType": "product",
    "proposedChanges": {
      "name": "Produit Employé",
      "sku": "EMP-001",
      "pricing": { "costPrice": 10000, "sellingPrice": 15000 },
      "inventory": { "currentStock": 10, "minStock": 2, "unit": "piece" }
    }
  }'
```
- Validation/Rejet: réalisé par `company_admin` ou `super_admin`.

## UI — Repères

- Création vente: page Ventes (bouton Enregistrer/Valider la vente)
- Mes ventes: section "Mes ventes" si présente, sinon menu Ventes > Mes ventes
- Soumettre une proposition: page Stocks > bouton "Soumettre une proposition"
- Comptabilité: affichera "Accès refusé" pour un Employé

## Dépannage (quick check)

- 401 / redirection login: vérifier le header `Authorization` en front (token présent?)
- 403 sur reçus: l’employé ne peut voir que ses ventes; vérifier `cashierId`
- Stock insuffisant: ajuster la quantité ou recharger du stock via un rôle autorisé
