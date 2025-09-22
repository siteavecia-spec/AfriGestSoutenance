# Guide Comptable — AfriGest

Ce guide couvre les rôles "Comptable" (accountant) et "Comptable de boutique" (store_accountant).

## Rôles et périmètres

- accountant (Entreprise)
  - Lecture seule sur la comptabilité et les rapports au niveau de l'entreprise.
  - Peut filtrer par boutique via `?storeId=`.
- store_accountant (Boutique)
  - Lecture seule sur la comptabilité et les rapports pour sa boutique uniquement.

Permissions (rappel)
- canViewAccounting: true
- canViewReports: true
- canManageInventory: false
- canProcessSales: false

## Endpoints Comptabilité (lecture)

- Revenus: `GET /api/accounting/revenue`
- Compte de résultat: `GET /api/accounting/profit-loss`
- Flux de trésorerie: `GET /api/accounting/cash-flow`
- Rapports: `GET /api/accounting/reports?type=sales|products|customers`

### Scoping appliqué côté serveur
- accountant: `matchStage.companyId = req.user.company?._id || req.user.company` (+ `storeId` facultatif)
- store_accountant: `matchStage.storeId = req.user.store?._id || req.user.store`

## Exemples cURL

- Revenus (Comptable d'entreprise):
```bash
curl -X GET "http://localhost:5000/api/accounting/revenue?period=month" \
  -H "Authorization: Bearer <TOKEN_ACCOUNTANT>"
```

- Revenus filtrés par boutique:
```bash
curl -X GET "http://localhost:5000/api/accounting/revenue?period=month&storeId=<STORE_ID>" \
  -H "Authorization: Bearer <TOKEN_ACCOUNTANT>"
```

- Compte de résultat (Comptable de boutique):
```bash
curl -X GET "http://localhost:5000/api/accounting/profit-loss?period=month" \
  -H "Authorization: Bearer <TOKEN_STORE_ACCOUNTANT>"
```

- Flux de trésorerie (30 derniers jours):
```bash
curl -X GET "http://localhost:5000/api/accounting/cash-flow?period=month" \
  -H "Authorization: Bearer <TOKEN_ACCOUNTANT>"
```

- Rapport ventes:
```bash
curl -X GET "http://localhost:5000/api/accounting/reports?type=sales&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer <TOKEN_ACCOUNTANT>"
```

## UI — Repères

- Page Rapports Comptables: `client/src/components/accounting/AccountingReports.tsx`
  - Un bandeau indique le périmètre: "niveau entreprise" (accountant) ou "niveau boutique" (store_accountant).
- Les boutons d'action (création/édition) n'apparaissent pas pour ces rôles.

## Dépannage

- 403 Accès refusé: vérifier que l'utilisateur a bien le rôle `accountant` ou `store_accountant` et que `canViewAccounting` / `canViewReports` sont actifs.
- Données vides: vérifier la période (`period` ou `startDate/endDate`) et l’existence de ventes.
- Filtre de boutique sans effet (accountant): s'assurer que le `storeId` appartient à l'entreprise.
