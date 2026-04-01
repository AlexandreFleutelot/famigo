# Schema de donnees - Famigo v1

## 1. Objectif

Ce document decrit une premiere version du schema relationnel Supabase pour Famigo v1.
Le schema reste simple, multi-famille, sans logique SaaS ni dependance obligatoire a l'email.
Il suit le domaine existant dans `packages/domain` et garde `point_transactions` comme source de verite du solde.

## 2. Principes retenus

- Une famille est le tenant fonctionnel principal.
- Un membre appartient a une seule famille en v1.
- Le PIN est stocke sous forme de `pin_hash`, pas en clair.
- Les points depensables ne sont pas stockes dans un compteur opaque : ils se recalculent depuis `point_transactions`.
- Les allocations quotidiennes sont separees entre un en-tete (`daily_point_allocations`) et des lignes (`daily_point_allocation_lines`) pour garder des contraintes relationnelles simples.
- `audit_events` sert a la fois de trace d'audit minimale et de base pour l'historique partage visible dans l'app.

Note d'usage mobile actuelle :

- le `pending points` du membre connecte est maintenant derive en lisant les lignes de `daily_point_allocation_lines` rattachees a des allocations du jour encore en `draft` ;
- la finalisation du draft du membre connecte est maintenant declenchee cote mobile via la RPC `finalize_daily_point_allocation` ;
- le solde reel continue, lui, a rester fonde sur `point_transactions`.

## 3. Choix transverses

### 3.1 Identifiants

- Toutes les tables principales utilisent un `uuid` comme cle primaire.
- Les `uuid` sont generes en base avec `gen_random_uuid()`.

### 3.2 Timestamps

- Toutes les tables ont au minimum `created_at`.
- Les tables d'etat editables ont aussi `updated_at` maintenu par trigger.
- Les tables de faits append-only n'ont pas `updated_at` afin d'eviter de donner l'impression qu'elles sont modifiables.
- Les dates metier restent explicites quand elles ont un sens fonctionnel : `purchased_at`, `occurred_at`, `finalized_at`, `promised_at`.

### 3.3 `day_key`

- Le domaine parle d'un `dayKey` deja resolu.
- Le schema le stocke en `date` pour representer une journee produit deja calculee.
- La regle exacte de calcul de cette date reste hors schema et doit etre decidee une fois pour toute au niveau applicatif.

## 4. Tables principales

### 4.1 `families`

Espace principal partage par les membres.

Champs :

- `id`
- `name`
- `timezone`
- `created_at`
- `updated_at`

Contraintes :

- nom non vide ;
- timezone non vide.

Note :

`timezone` reste volontairement simple. Il prepare le calcul futur du `day_key` sans introduire de configuration complexe.

### 4.2 `members`

Representation d'un membre de famille.

Champs :

- `id`
- `family_id`
- `display_name`
- `role`
- `pin_hash`
- `avatar_url`
- `created_at`
- `updated_at`

Contraintes :

- FK vers `families` ;
- `role` limite a `parent` et `child` ;
- `display_name` non vide ;
- `pin_hash` non vide ;
- pas de champ email obligatoire.

### 4.3 `rewards`

Equivalent base de donnees de `ShopItem`.

Champs :

- `id`
- `family_id`
- `name`
- `image_url`
- `cost`
- `active`
- `created_at`
- `updated_at`

Contraintes :

- FK vers `families` ;
- `cost > 0` ;
- nom et image obligatoires.

### 4.4 `reward_purchases`

Equivalent base de donnees de `Purchase`.

Champs :

- `id`
- `family_id`
- `member_id`
- `reward_id`
- `cost_snapshot`
- `purchased_at`
- `created_at`

Contraintes :

- FK vers `members` et `rewards` dans la meme famille ;
- `cost_snapshot > 0` ;
- trigger qui refuse l'insertion si le reward n'est pas actif ;
- table append-only : pas de modification ni suppression metier.

Note :

Le prix est snapshotte a l'achat pour ne pas reecrire l'historique si le reward change ensuite.

### 4.5 `family_goals`

Equivalent base de donnees de `FamilyGoal`.

Champs :

- `id`
- `family_id`
- `title`
- `target_vote_count`
- `status`
- `created_by_member_id`
- `promised_at`
- `created_at`
- `updated_at`

Contraintes :

- FK vers `families` ;
- FK vers le membre createur dans la meme famille ;
- `target_vote_count > 0` ;
- `status` limite a `active`, `promised`, `archived` ;
- `promised_at` obligatoire uniquement quand `status = promised` ;
- trigger qui refuse un createur non parent.

Le schema suit ici le domaine code, qui n'utilise pas un statut `reached` distinct.

### 4.6 `goal_votes`

Equivalent base de donnees de `GoalVote`.

Champs :

- `id`
- `family_id`
- `day_key`
- `member_id`
- `family_goal_id`
- `created_at`

Contraintes :

- FK vers `members` et `family_goals` dans la meme famille ;
- unicite `(family_id, member_id, day_key)` pour garantir un seul vote par jour ;
- trigger qui refuse un vote sur un objectif non actif ;
- table append-only : un vote insere ne peut plus etre modifie ni supprime.

### 4.7 `daily_point_allocations`

En-tete d'une repartition quotidienne par donneur.

Champs :

- `id`
- `family_id`
- `day_key`
- `giver_member_id`
- `status`
- `finalized_at`
- `created_at`
- `updated_at`

Contraintes :

- FK vers le membre donneur dans la meme famille ;
- unicite `(family_id, day_key, giver_member_id)` ;
- `status` limite a `draft` ou `finalized` ;
- `finalized_at` obligatoire si et seulement si l'allocation est finalisee ;
- une allocation finalisee ne peut plus etre modifiee sur ses champs metier.

### 4.8 `daily_point_allocation_lines`

Table de support necessaire pour normaliser les lignes d'allocation.
Elle n'etait pas demandee explicitement, mais elle est utile pour eviter un `jsonb` difficile a contraindre.

Champs :

- `allocation_id`
- `family_id`
- `receiver_member_id`
- `points`
- `created_at`
- `updated_at`

Contraintes :

- cle primaire composee `(allocation_id, receiver_member_id)` pour ne garder qu'une ligne par receveur ;
- FK vers l'allocation ;
- FK vers le membre receveur ;
- `points > 0` ;
- trigger qui refuse l'auto-allocation ;
- trigger qui refuse toute modification si l'allocation est deja finalisee ;
- trigger qui refuse un total de points strictement superieur a 5.

Usage applicatif actuel :

- cette table sert maintenant aussi a calculer les points en attente reels du membre connecte ;
- tant qu'une allocation reste en `draft`, ses lignes representent des gains potentiels non encore materialises dans `point_transactions`.

### 4.9 `point_transactions`

Equivalent base de donnees de `PointLedgerEntry`.
C'est la source de verite du solde.

Champs :

- `id`
- `family_id`
- `member_id`
- `type`
- `points_delta`
- `day_key`
- `daily_point_allocation_id`
- `reward_purchase_id`
- `occurred_at`
- `created_at`

Contraintes :

- FK vers `members` ;
- FK optionnelle vers `daily_point_allocations` ;
- FK optionnelle vers `reward_purchases` ;
- `points_delta <> 0` ;
- coherence forte entre `type`, signe du delta et reference source :
  - `daily_points_received` => delta positif, `day_key` obligatoire, reference allocation obligatoire ;
  - `shop_purchase` => delta negatif, reference achat obligatoire.
- pour `daily_points_received`, trigger complementaire imposant :
  - une allocation referencee et finalisee ;
  - un `day_key` identique a celui de l'allocation ;
  - un `occurred_at` identique au `finalized_at` de l'allocation ;
  - un receveur reellement present dans les lignes finalisees ;
  - un `points_delta` identique aux points finalises pour ce receveur.
- unicite `(daily_point_allocation_id, member_id)` pour eviter de crediter deux fois le meme receveur pour une meme cloture ;
- unicite `reward_purchase_id` pour eviter plusieurs debits pour un meme achat ;
- table append-only : aucune modification ni suppression apres insertion.

### 4.10 `audit_events`

Projection commune des evenements significatifs.

Champs :

- `id`
- `family_id`
- `type`
- `actor_member_id`
- `subject_member_id`
- `occurred_at`
- `metadata`
- `created_at`

Contraintes :

- FK vers la famille ;
- FK optionnelles vers acteur et sujet ;
- `metadata` doit rester un objet JSON ;
- table append-only : aucune modification ni suppression apres insertion.

Types d'evenement retenus :

- `member_session_started`
- `points_given`
- `shop_purchase_made`
- `goal_vote_recorded`
- `goal_reached`

## 5. Relations principales

- une `family` possede plusieurs `members` ;
- une `family` possede plusieurs `rewards` ;
- une `family` possede plusieurs `family_goals` ;
- un `member` peut creer plusieurs `family_goals` s'il est parent ;
- un `member` peut emettre une `daily_point_allocation` par jour ;
- une `daily_point_allocation` possede plusieurs `daily_point_allocation_lines` ;
- un `member` peut recevoir plusieurs `point_transactions` ;
- un `reward_purchase` genere exactement un `point_transaction` de type `shop_purchase` ;
- une cloture de `daily_point_allocation` genere un `point_transaction` par receveur ;
- les evenements fonctionnels majeurs sont traces dans `audit_events`.

## 6. Ce que le schema garantit en base

- appartenance famille coherente sur les relations critiques ;
- un vote maximum par membre et par jour ;
- une allocation maximum par donneur et par jour ;
- pas d'auto-allocation ;
- pas de depassement du budget de 5 points dans une allocation ;
- pas de modification de lignes une fois l'allocation finalisee ;
- pas de modification metier d'une allocation une fois finalisee ;
- coherence des types de transactions de points ;
- coherence fine des gains journaliers avec leur allocation finalisee ;
- seuls les parents peuvent creer ou modifier un objectif.

## 7. Ce que le schema ne garantit pas seul

Ces regles restent principalement du ressort du domaine et de l'orchestration applicative :

- verification du PIN ;
- calcul exact du `day_key` selon le fuseau retenu ;
- refus d'un achat si le solde recalcule est insuffisant ;
- atomicite complete des ecritures metier composees :
  - achat = achat + transaction de points + evenement d'audit ;
  - cloture = finalisation allocation + transactions de points + evenements d'audit ;
- idempotence complete du job de cloture de fin de journee ;
- politique exacte d'archivage ou de suppression logique des membres et objectifs.

## 8. RPC transactionnelles

Pour les ecritures critiques v1, la base expose trois fonctions RPC transactionnelles :

- `purchase_reward`
- `finalize_daily_point_allocation`
- `cast_goal_vote`

Leur role est de :

- lire les donnees necessaires en base ;
- effectuer les validations de coherence indispensables a la persistance ;
- ecrire tous les faits associes dans une seule transaction base de donnees ;
- retourner un resultat compact utile au mobile.

Limite volontaire :

- ces RPC re-dupliquent une petite partie des regles metier critiques en SQL pour garantir l'atomicite ;
- `packages/domain` reste la reference metier principale ;
- le calcul du `day_key` et l'orchestration produit globale restent hors SQL.

## 9. Hypotheses explicites

- Le produit reste mono-usage v1, mais le schema est multi-famille des le depart via `family_id`.
- Aucun champ de billing, d'abonnement ou d'organisation SaaS n'est introduit.
- Aucun email n'est impose au niveau du schema.
- Le terme base de donnees `rewards` correspond au concept domaine de boutique ; il evite d'ajouter une couche de catalogue plus generique inutile.
- `audit_events` couvre l'historique utilisateur minimal sans creer une seconde table `history_events` redondante.
