# Cahier des Charges - Module de Parrainage "Ambassadeurs AfriGest"

(Version adaptée au processus manuel d'onboarding)

---

## 1. Contexte et Objectifs

### Contexte

AfriGest possède un processus d'onboarding manuel où les PDG doivent faire une demande de démo avant d'être validés. Le programme de parrainage doit s'intégrer parfaitement à ce flux existant.

### Objectifs

- Leveraging Trust : Utiliser la crédibilité des clients existants pour acquérir de nouveaux clients
- Tracking : Mesurer précisément l'impact des recommandations
- Rewarding : Récompenser les ambassadeurs sans compromettre la qualité de l'onboarding

---

## 2. Processus Revisité de Parrainage

```mermaid
flowchart TD
    A[PDG Existants<br>Génère son code] --> B[Partage code parrainage<br>via WhatsApp, email, etc.]
    B --> C[Nouveau Prospect<br>Remplit formulaire de démo]
    C --> D{Remplit champ<br>"Code Parrainage" ?}
    D -->|Oui| E[Demande de démo traitée<br>Code enregistré]
    D -->|Non| F[Processus normal]
    E --> G[Équipe AfriGest<br>Valide la demande]
    G --> H[Compte créé manuellement]
    H --> I[Système attribue automatiquement<br>le parrainage]
    I --> J[Parrain notifié et récompensé]
```

---

## 3. Fonctionnalités Clés

### 3.1 Gestion des Codes de Parrainage

- Génération automatique : Code unique de 8 caractères (ex: "AFG-MTX5B2") pour chaque PDG
- Accessibilité : Code visible dans l'espace PDG > Onglet "Devenez Ambassadeur"
- Partage simplifié :
  - Lien pré-rempli : `https://afrigest.com/demo?ref=AFG-MTX5B2`
  - QR Code téléchargeable
  - Boutons de partage directs (WhatsApp, Email, LinkedIn)

### 3.2 Intégration au Formulaire de Demande de Démo

- Champ optionnel : "Code Parrain (optionnel)" dans le formulaire de demande de démo
- Validation en temps réel : Vérification que le code existe au moment de la soumission
- Message d'encouragement : "Vous utilisez un code parrain ? Obtenez des avantages supplémentaires !"

### 3.3 Processus de Validation et Attribution

- Attribution manuelle : L'équipe AfriGest voit le code parrain lors du traitement de la demande
- Validation automatique : Une fois le compte créé manuellement, le système attribue automatiquement le parrainage
- Période de carence : La récompense n'est attribuée qu'après 30 jours d'activité du nouveau client

### 3.4 Système de Récompenses Adapté

Pour le Parrain :

- Crédit service : 10% du premier paiement du filleul
- Abonnement gratuit : 1 mois gratuit après 3 filleuls actifs
- Accès prioritaire : Support prioritaire et accès aux nouvelles features en beta

Pour le Filleul :

- Bonus de bienvenue : 15% de réduction sur les 3 premiers mois
- Support dédié : Onboarding personnalisé accéléré

### 3.5 Tableau de Bord de Suivi

- Statistiques en temps réel :
  - Nombre de demandes de démo générées
  - Taux de conversion des démos en clients
  - Revenus générés par les parrainages
- Classement des ambassadeurs : Top 10 des meilleurs ambassadeurs mensuels

### 3.6 Notifications Automatisées

- Pour le parrain :
  - Notification quand un prospect utilise son code
  - Notification quand un parrainage est validé
  - Notification quand une récompense est attribuée
- Pour l'équipe AfriGest :
  - Alertes des parrainages à valider
  - Rapport hebdomadaire des performances du programme

---

## 4. Règles Métier et Validation

### 4.1 Éligibilité

- Parrains : Doivent être clients actifs depuis au moins 3 mois
- Filleuls : Doivent être de nouvelles entreprises (non existantes dans la base)
- Validation : Le filleul doit rester client actif pendant 30 jours

### 4.2 Anti-Fraude

- Limites : Maximum 5 parrainages actifs par mois par PDG
- Vérification : Algorithme de détection des abus (multi-comptes, faux leads)
- Audit manuel : L'équpe AfriGest peut révoquer tout parrainage suspect

### 4.3 Paiement des Récompenses

- Délai : Les récompenses sont créditées après 30 jours d'activité du filleul
- Reporting : Reçu détaillé pour chaque récompense attribuée
- Plafonds : Limite de 100 000 XOF de récompenses par mois par PDG

---

## 5. Architecture Technique

### 5.1 Modèle de Données

```sql
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_requests (
    id UUID PRIMARY KEY,
    referral_code_id UUID REFERENCES referral_codes(id),
    prospect_email VARCHAR(255) NOT NULL,
    prospect_phone VARCHAR(50),
    company_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_user_id UUID NOT NULL REFERENCES users(id),
    reward_type VARCHAR(50) NOT NULL,
    reward_value DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 API Endpoints

```
GET    /api/referrals/code          # Récupérer son code
POST   /api/referrals/generate      # Régénérer un code
GET    /api/referrals/stats         # Statistiques de performance
GET    /api/referrals/requests      # Historique des demandes
POST   /api/referrals/validate/{id} # Valider un parrainage (admin)
```

### 5.3 Intégrations

- CRM : Synchronisation avec le système de gestion des leads
- Email : Intégration avec SendGrid/Mailjet pour les notifications
- Analytics : Tracking Google Analytics des conversions
- Admin : Interface de gestion pour le Super Admin

---

## 6. Design et Expérience Utilisateur

### 6.1 Espace PDG

- Carte de performance : Graphique des parrainages et récompenses
- Outils de partage : Boutons pré-formatés pour chaque canal
- Historique détaillé : Liste de tous les parrainages avec statut
- Simulateur : Calculateur de gains potentiels

### 6.2 Formulaire de Demande de Démo

- Champ discret : "Code parrain (optionnel)" en bas du formulaire
- Tooltip explicatif : "Obtenez 15% de réduction avec un code parrain"
- Validation visuelle : Message de confirmation quand le code est valide

### 6.3 Interface d'Administration

- Dashboard : Vue d'ensemble du programme de parrainage
- Validation manuelle : Interface simple pour valider/refuser les parrainages
- Reporting : Export CSV des performances détaillées

---

## 7. Métriques de Succès

- Taux de conversion : > 20% des demandes de démo avec code parrain
- Qualité des leads : Taux de conversion démo→client > 40% pour les parrainages
- ROI : Coût d'acquisition réduit de 35%
- Satisfaction : NPS > +45 parmi les ambassadeurs
- Engagement : > 30% des PDG actifs participent au programme

---

## 8. Calendrier de Déploiement

### Phase 1 (3 semaines)

- Modèle de données et API core
- Génération et gestion des codes
- Intégration au formulaire de demande de démo

### Phase 2 (2 semaines)

- Système de tracking et attribution
- Tableau de bord PDG
- Notifications automatiques

### Phase 3 (2 semaines)

- Système de récompenses
- Interface d'administration
- Intégrations CRM et email

### Phase 4 (1 semaine)

- Tests utilisateurs
- Formation de l'équipe
- Déploiement progressif

---

## 9. Risques et Atténuation

- Fraude : Système de vérification à deux niveaux (automatique + manuel)
- Complexité : Interface simplifiée pour les PDG
- Coûts : Modèle de récompenses calibré sur la valeur à vie du client
- Support : FAQ détaillée et formation de l'équipe support

---

Ce programme de parrainage s'intègre parfaitement au processus existant tout en offrant une expérience valorisante pour les PDG ambassadeurs.

---

## Signatures

[Responsable Acquisition Clients] | [Responsable Expérience Client]  
Date: _________________________ | Date : _________________________

[Responsable Technique] | [Chef de Produit]  
Date: _________________________ | Date : _________________________
