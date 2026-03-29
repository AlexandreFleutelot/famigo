# Modele de domaine - Famigo v1

## 1. Principes

- Le domaine doit rester independant de React Native et de Supabase.
- Les regles de points, votes, achats et objectifs doivent vivre dans le domaine.
- Les ecrans et services techniques ne doivent que consommer des cas d'usage et des etats.

## 2. Agregats / entites principales

### 2.1 Family

Represente l'espace commun des membres.

Responsabilites :

- porter l'identite familiale ;
- regrouper les membres ;
- cadrer les objets partages : objectifs, boutique, historique.

### 2.2 Member

Represente une personne appartenant a une famille.

Attributs metier minimaux :

- identifiant ;
- familyId ;
- displayName ;
- role : `parent` ou `child` ;
- pinHash ou equivalent de verification ;
- avatar ou image de profil si necessaire pour le carousel.

Regles :

- appartient a une seule famille en v1 ;
- ne peut pas s'auto-attribuer des points ;
- dispose de 5 points a allouer par jour.

### 2.3 DailyPointAllocation

Represente la repartition quotidienne effectuee par un membre donneur.

Attributs metier minimaux :

- identifiant ;
- familyId ;
- dayKey ;
- giverMemberId ;
- allocations ;
- totalAllocated ;
- status : `draft` ou `finalized`.

`allocations` represente une collection de lignes `receiverMemberId + points`.

Regles :

- `giverMemberId` ne peut pas apparaitre comme receveur ;
- `totalAllocated` doit etre inferieur ou egal a 5 ;
- plusieurs lignes vers un meme receveur peuvent etre consolidees ou normalisees ;
- seule la version finalisee en fin de journee produit des gains reels.

### 2.4 PointLedgerEntry

Represente un mouvement de points materialise dans le solde.

Types possibles en v1 :

- `daily_points_received` ;
- `shop_purchase`.

Responsabilites :

- tracer l'impact sur le solde ;
- permettre le calcul d'un solde courant a partir d'ecritures.

### 2.5 ShopItem

Represente un cadeau disponible dans la boutique.

Attributs metier minimaux :

- identifiant ;
- familyId ou scope equivalent ;
- name ;
- imageUrl ou reference image ;
- cost ;
- active.

Regles :

- quantite illimitee ;
- cout strictement positif ;
- achetable seulement si actif et si le solde est suffisant.

### 2.6 Purchase

Represente un achat realise par un membre.

Attributs metier minimaux :

- identifiant ;
- familyId ;
- memberId ;
- shopItemId ;
- costSnapshot ;
- purchasedAt.

Regles :

- decremente immediatement le solde ;
- doit generer une ecriture de ledger ;
- doit apparaitre dans l'historique.

### 2.7 FamilyGoal

Represente un objectif collectif soumis au vote.

Attributs metier minimaux :

- identifiant ;
- familyId ;
- title ;
- targetVoteCount ;
- status : `active`, `reached`, `promised`, `archived` selon la simplification retenue ;
- createdByMemberId ;
- currentVoteCount.

Regles :

- gerable par les parents uniquement ;
- passe en promesse a realiser quand la cible est atteinte ;
- l'atteinte de cible doit etre historisee.

Note :

Le nombre exact de statuts pourra etre simplifie a l'implementation, mais la transition metier "objectif atteint -> promesse a realiser" est obligatoire.

### 2.8 GoalVote

Represente le vote quotidien d'un membre pour un objectif.

Attributs metier minimaux :

- identifiant ;
- familyId ;
- dayKey ;
- memberId ;
- familyGoalId ;
- createdAt.

Regles :

- unicite de `memberId + dayKey` ;
- un seul objectif vise par vote quotidien ;
- le vote contribue a la progression de l'objectif.

### 2.9 HistoryEvent

Represente un evenement visible dans l'historique partage.

Types minimaux :

- `points_given` ;
- `purchase_made` ;
- `goal_reached`.

Responsabilites :

- offrir une vue chronologique des evenements significatifs ;
- separer la projection historique des objets transactionnels si necessaire.

## 3. Valeurs / concepts transverses

### 3.1 Role

Enum :

- `parent`
- `child`

### 3.2 DayKey

Identifiant fonctionnel d'une journee produit.

Exemples possibles :

- date locale de la famille ;
- date locale serveur.

Le choix exact doit etre fixe techniquement une seule fois pour tout le systeme.

### 3.3 PointBalance

Concept derive, pas forcement stocke comme source unique.

Il represente le solde de points depensables d'un membre a un instant donne.

### 3.4 PendingPoints

Concept derive utile a l'experience.

Il represente les points alloues pendant la journee mais non encore credites reellement.

## 4. Regles d'invariants majeurs

- Un membre ne s'attribue jamais de points a lui-meme.
- Un membre ne depasse jamais 5 points alloues sur une journee.
- Un vote quotidien est unique par membre.
- Un achat ne peut pas rendre le solde negatif.
- Les points recus via la repartition quotidienne n'impactent le solde qu'apres cloture de la journee.
- Les points non alloues sont perdus en fin de journee.

## 5. Cas d'usage domaine principaux

- authentifier un membre par selection de profil et verification du PIN ;
- enregistrer ou modifier une repartition quotidienne de points ;
- cloturer une journee et materialiser les gains ;
- acheter un cadeau de boutique ;
- creer, modifier, supprimer un objectif famille ;
- enregistrer un vote quotidien ;
- marquer un objectif comme atteint puis promis ;
- produire l'historique partage.

## 6. Hypotheses residuelles

- Le modele exact de session d'authentification n'est pas decrit ici ; seul le comportement metier de connexion est fixe.
- Le statut final d'un objectif atteint peut etre modelise par un ou deux etats techniques, selon les besoins d'implementation.
- L'historique peut etre une projection dediee plutot qu'une source de verite transactionnelle.
