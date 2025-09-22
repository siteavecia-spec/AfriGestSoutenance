# AfriGest — Guide Utilisateur

Ce guide présente les fonctionnalités principales de l’application AfriGest et explique comment les utiliser et les tester. Il s’adresse aux rôles Super Admin, PDG (company_admin), DG (store_manager) et Employés.

---

## 1. Connexion et Rôles
- Ouvrez l’application et connectez-vous avec votre email/mot de passe.
- Le menu latéral s’adapte automatiquement à votre rôle:
  - Super Admin: Système, Entreprises, Super Admins, Demandes de Démo, Rapports Globaux, Statut
  - PDG (company_admin): Boutiques, Utilisateurs, Ventes, Stocks, Comptabilité
  - DG (store_manager): Ventes, Stocks, Employés, Comptabilité
  - Employé (employee): Ventes, Stocks

Astuce: Si vous êtes déconnecté (401/403), reconnectez-vous. Les erreurs API s’affichent via des notifications (cloche en haut à droite).

---

## 2. Entreprises (Super Admin)
Écrans: `Tableau de bord > Entreprises`

- Visualisez la liste des entreprises (nom, statut, plan, stats).
- Accédez aux détails d’une entreprise (infos, adresse, abonnement, statistiques, boutiques).
- Le tableau est lisible sur mobile (défilement horizontal, colonnes secondaires masquées).

Test rapide:
- Aller sur `Entreprises`, ouvrir une entreprise, vérifier ses boutiques et utilisateurs affichés.

---

## 3. Boutiques (Stores)
Écrans: `Boutiques`

- En fonction du rôle:
  - Super Admin: voit toutes les boutiques.
  - PDG: voit les boutiques de son entreprise.
  - DG/Employé: voit sa propre boutique.
- Créez une boutique (selon droits) et attribuez un DG.

Test rapide:
- Créer une boutique, vérifier qu’elle apparaît dans la liste et dans les stats de l’entreprise.

---

## 4. Utilisateurs
Écrans: `Utilisateurs`

- Créez des PDG (company_admin), DG (store_manager) et Employés.
- Assignez-les à une entreprise et une boutique (si applicable au rôle).

Test rapide:
- Créer un PDG et un DG, vérifier qu’ils apparaissent dans la liste et qu’ils peuvent se connecter.

---

## 5. Ventes
Écrans: `Ventes`

- Créez des ventes avec des articles (produit, quantité, prix unitaire, paiement).
- Les ventes décrémentent le stock et alimentent les statistiques.

Test rapide (depuis la page Statut):
- Voir section "Statut > Vente de test" ci-dessous pour un flux guidé.

---

## 6. Stocks (Inventaire)
Écrans: `Stocks`

- Consultez les produits, prix, marges, niveaux de stock, alertes de stock bas.
- Filtrez par boutique, catégorie, statut.

Test rapide:
- Lister les produits d’une boutique, vérifier les prix et le stock disponible.

---

## 7. Comptabilité
Écrans: `Comptabilité`

- Accédez aux données financières selon votre rôle (PDG/DG).
- Consultez des indicateurs et rapports.

---

## 8. Page Statut (Super Admin)
Écran: `Tableau de bord > Statut`

- Vérifications rapides:
  - API Health, Auth, Companies, Users, Stores, Sales.
- Vérification Entreprises: contrôle par entreprise qu’il y a 1 boutique, au moins 1 PDG et 1 DG.
- Informations de connexion (PDG / DG): emails des PDG et DG par entreprise, export CSV.
- Vente de test: crée une vente réelle pour vérifier l’écriture en base MongoDB Atlas.

Flux de test recommandé:
1) Cliquer "Relancer les tests" pour voir l’état général.
2) Dans "Vérification Entreprises", cliquer "Vérifier" pour voir Boutiques/PDG/DG.
3) Dans "Informations de connexion (PDG / DG)", cliquer "Charger" puis "Exporter CSV" si besoin.
4) Dans "Vente de test":
   - Sélectionner Entreprise > Boutique > Produit actif.
   - Cliquer "Créer une vente de test". Un message succès s’affiche avec l’ID.
   - Vérifier dans MongoDB Atlas la collection `sales` si nécessaire.

---

## 9. Notifications (cloche)
- Le badge indique le nombre de notifications non lues.
- Cliquez pour ouvrir la liste: vous pouvez marquer tout lu ou effacer.
- Les notifications sont persistées et rechargées au démarrage.

Test rapide:
- Dans la console du navigateur:
  ```js
  window.dispatchEvent(new CustomEvent('app:notify', {
    detail: { message: 'Notification de test', severity: 'success' }
  }));
  ```
- Ouvrez la cloche, vérifier l’apparition et la persistance.

---

## 10. Mobile-first
- Tables compactes et défilement horizontal sur mobile.
- Colonnes secondaires masquées automatiquement sur petit écran.

Test rapide:
- Réduire la fenêtre à ~375–414px et vérifier la lisibilité sur les pages Entreprises et Détails d’entreprise.

---

## Dépannage
- Si une liste (boutiques/utilisateurs) renvoie une erreur 500:
  - Assurez-vous que le serveur a été redémarré après mise à jour.
  - Vérifiez que votre session est valide (sinon reconnectez-vous).
- Base URL API:
  - En dev: http://localhost:5000
  - En prod: `REACT_APP_API_URL` sans suffixe `/api` (le client ajoute déjà `/api/...`).

---

Bon usage d’AfriGest !
