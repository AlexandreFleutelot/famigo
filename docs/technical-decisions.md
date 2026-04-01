# Decisions techniques - cadrage v1

## 1. Portee du document

Ce document fixe les decisions techniques de cadrage necessaires pour lancer la v1 sans sur-concevoir.
Il ne remplace pas l'architecture detaillee de l'application.

## 2. Principes de construction

- application mobile en priorite ;
- logique metier pure isolee de l'UI ;
- modeles et regles du domaine centralises dans `packages/domain` ;
- interfaces mobiles dans `apps/mobile` ;
- partage UI dans `packages/ui` uniquement en cas de reutilisation reelle ;
- decisions simples et explicites plutot que systemes generiques.

## 3. Separation des responsabilites

### 3.1 Domaine

Le domaine porte :

- regles d'allocation quotidienne de points ;
- regles de cloture de journee ;
- regles de vote ;
- regles d'achat boutique ;
- transitions d'etat des objectifs ;
- invariants de solde et d'historique.

Le domaine ne doit pas dependre :

- de React Native ;
- de Supabase ;
- d'une base specifique ;
- d'un format d'API.

### 3.2 Application / orchestration

La couche applicative orchestre :

- l'authentification concrete ;
- l'acces aux donnees ;
- la synchronisation ;
- l'execution des taches planifiees de fin de journee ;
- la transformation des donnees domaine vers les vues.

Decision d'implementation en cours :

- une couche `apps/mobile/src/application` fait l'orchestration entre repositories Supabase, domaine et UI ;
- cette couche expose des use cases explicites plutot que de laisser l'UI appeler les repositories directement ;
- les conversions legeres `SQL -> types applicatifs` restent au plus pres des repositories pour eviter des couches intermediaires inutiles.

### 3.3 UI mobile

L'UI :

- affiche l'etat ;
- declenche des cas d'usage ;
- ne contient pas les regles metier critiques.

## 4. Decision sur les points

Decision :

- la repartition quotidienne est editable pendant la journee ;
- les gains de points ne sont materialises qu'a la cloture de la journee ;
- les achats debitent immediatement le solde reel.

Consequence technique :

- distinguer clairement les points en attente et le solde disponible ;
- prevoir un mecanisme fiable de cloture quotidienne idempotent.

## 5. Decision sur le modele de solde

Decision :

- le solde doit etre fonde sur des ecritures ou mouvements tracables, pas uniquement sur un compteur opaque.

Justification :

- les achats doivent debiter immediatement ;
- les gains quotidiens doivent etre appliques plus tard ;
- l'historique doit rester explicable ;
- les recalculs et controles seront plus fiables.

## 5 bis. Decision sur les metriques affichees

Decision :

- `solde reel` = somme des `point_transactions` du membre ;
- `points en attente` = somme des lignes d'allocations du jour encore en `draft` qui ciblent ce membre ;
- `restant a distribuer` = reliquat de l'allocation quotidienne du membre connecte pour le `dayKey` courant ;
- ces metriques doivent etre derivees une seule fois cote mobile puis reutilisees dans Home, Points et Profil ;
- aucun fallback mock divergent ne doit redefinir ces chiffres quand une projection reelle existe deja.

Consequence technique :

- l'UI mobile peut centraliser ces derivations directement dans `App.tsx` tant qu'aucune couche supplementaire n'apporte un gain clair ;
- la boutique continue de s'appuyer uniquement sur le `solde reel`, sans inclure les points en attente.

## 6. Decision sur la journee produit

Decision :

- toutes les regles quotidiennes doivent s'appuyer sur une cle de journee unique (`dayKey`).

Reste a confirmer :

- si `dayKey` est calcule selon le fuseau de la famille, du serveur ou d'une autre reference unique.

Contrainte :

- ce choix doit etre stable et partage partout pour eviter les incoherences de votes et de cloture.

## 7. Decision sur l'historique

Decision :

- l'historique utilisateur est une vue fonctionnelle commune a la famille ;
- il doit couvrir au minimum points donnes, achats et objectifs atteints.

Choix recommande :

- autoriser une projection historique dediee si cela simplifie la lecture, sans en faire la source primaire des regles metier.

## 8. Decision sur les autorisations

Decision :

- les roles v1 sont limites a `parent` et `child` ;
- tous les parents sont admins ;
- les privileges admin v1 portent sur la gestion des objectifs ;
- la mecanique de points reste identique pour tous les membres.

## 9. Decision sur l'authentification

Decision :

- le parcours d'entree v1 est "selection du profil puis PIN 4 chiffres" ;
- aucun email obligatoire ;
- un membre peut se connecter depuis n'importe quel appareil lie a sa famille.

Consequence technique :

- l'identification initiale repose sur la famille et les profils visibles ;
- la verification du PIN doit etre traitee comme un sujet de securite, meme si le parcours est simplifie.

Etat d'implementation :

- le schema base de donnees stocke `pin_hash` ;
- la couche applicative mobile introduit donc un composant de verification de PIN dedie ;
- le domaine ne doit pas rester durablement couple a l'hypothese d'un `pin` en clair.

Decision provisoirement retenue :

- pour la tranche mobile actuelle, la verification concrete du PIN passe par une RPC SQL dediee tres simple ;
- cette solution est suffisante pour brancher le flow v1 sans introduire de systeme d'auth plus large ;
- le durcissement eventuel pourra etre reconsidere plus tard si le produit en a besoin.

## 9 bis. Decision sur le placement des regles metier

Constat :

- certaines regles sont deja exprimees dans `packages/domain` ;
- certaines executions critiques sont atomiques en base via RPC SQL, notamment `purchase_reward`, `cast_goal_vote` et `finalize_daily_point_allocation`.

Decision provisoire :

- garder le domaine TypeScript comme reference de modelisation et de validation locale ;
- garder les RPC SQL pour les operations transactionnelles qui doivent etre atomiques ;
- ne pas dupliquer en TypeScript une validation complete deja portee par une RPC quand cela n'apporte pas de simplification concrete ;
- documenter explicitement toute divergence temporaire entre validation locale et execution SQL.

Consequence :

- la couche applicative mobile doit faire le pont entre les deux, sans dupliquer silencieusement les regles dans l'UI.

## 10. Decision sur la complexite a eviter

Ne pas introduire en v1 :

- moteur generique de recompenses ;
- systeme generique de permissions ;
- abstraction prematuree des catalogues ou workflows ;
- couplage direct des composants UI a la logique metier ;
- sur-modelisation de statuts si deux etats simples suffisent.

## 11. Hypotheses residuelles

- La solution technique concrete de persistance n'est pas tranchee dans ce document.
- Le mecanisme exact de planification de la cloture quotidienne reste a definir.
- Le mode de rattachement d'un appareil a une famille devra etre precise sans contredire le parcours simple de connexion.
- La strategie de cache et de refresh de la couche applicative mobile reste a definir.
- Le calcul unique de `dayKey` n'est pas encore centralise dans un service partage.
