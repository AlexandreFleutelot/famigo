# Etat d'avancement mobile

## 1. Vue d'ensemble

L'application mobile n'est plus uniquement au stade "repositories + mocks".
Une couche applicative intermediaire a maintenant ete introduite pour preparer le remplacement progressif du mock state.

## 2. Ce qui existe maintenant

### 2.1 Domaine

Le domaine pur dans `packages/domain` continue de porter :

- les regles de points ;
- les achats boutique ;
- les votes et objectifs ;
- les erreurs domaine ;
- les projections de solde.

### 2.2 Infrastructure mobile

Les repositories Supabase dans `apps/mobile/src/data/repositories` couvrent deja :

- les membres ;
- les cadeaux ;
- les achats ;
- les objectifs ;
- les votes ;
- les mouvements de points ;
- les allocations quotidiennes ;
- l'audit.

### 2.3 Application mobile

La couche `apps/mobile/src/application` fournit maintenant :

- des use cases explicites ;
- un contexte de session minimal ;
- un contrat uniforme `ok` / `error` ;
- des use cases tests hors UI.

## 3. Slices couvertes

### 3.1 Shop

Etat :

- chargement des cadeaux et du ledger disponibles ;
- calcul du solde visible dans la couche applicative ;
- achat branche sur la RPC `purchase_reward` sans prevalidation locale redondante.

### 3.2 Goals

Etat :

- chargement des objectifs disponibles ;
- vote branche sur la RPC `cast_goal_vote` ;
- projection d'un etat de retour exploitable pour l'UI.

### 3.3 Session

Etat :

- use cases `getFamilies`, `selectFamily`, `getMembersForSelectedFamily`, `startMemberSession`, `restoreSession` et `clearSession` disponibles ;
- introduction d'un contexte applicatif minimal `selectedFamilyId + selectedMemberId` ;
- listing multi-famille prepare cote application ;
- adapter de session memoire disponible pour tests et branchement initial ;
- use case `loginWithPin` disponible ;
- verification PIN toujours delegatee a un `PinVerifier` abstrait ;
- flow UI reel branche pour `famille -> membre -> PIN -> ouverture de session` ;
- au redemarrage, si un membre etait deja selectionne, l'app revient a l'etape PIN ;
- la persistance simple du contexte mobile est maintenant branchee sur `AsyncStorage` ;
- cette persistance ne constitue toujours pas une session auth durable.

### 3.4 Daily points

Etat :

- chargement reel du draft quotidien du membre connecte ;
- chargement reel des membres utiles a la repartition ;
- edition reelle de la repartition du jour via la couche applicative ;
- calcul reel des points en attente du membre connecte a partir des drafts du jour ;
- finalisation reelle de la repartition du jour via la RPC `finalize_daily_point_allocation` ;
- affichage `solde reel / points en attente / deja alloues / restant a distribuer` branche sur des donnees coherentes pour le membre connecte ;
- mise a jour immediate apres finalisation du draft courant, du `pending points` et du ledger local ;
- `dayKey` et refresh encore a centraliser.

Regle d'affichage actuellement retenue :

- `solde reel` vient du ledger ;
- `points en attente` vient des allocations du jour encore en `draft` ;
- `restant a distribuer` vient de l'allocation du jour du membre connecte ;
- Home, Points, Profil et Boutique reutilisent maintenant la meme definition locale de ces metriques.

## 4. Tests actuellement poses

Des tests de couche applicative existent pour :

- `getFamilies` ;
- `selectFamily` ;
- `getMembersForSelectedFamily` ;
- `startMemberSession` ;
- `restoreSession` ;
- `clearSession` ;
- `loadDailyPoints` ;
- `saveDailyPoints` ;
- `loadPendingPoints` ;
- `finalizeDailyPoints` ;
- `loadShop` ;
- `buyReward` ;
- `loginWithPin` ;
- `castGoalVote`.

Ils couvrent l'orchestration et les contrats, pas encore l'integration UI.

## 5. Points d'attention ouverts

- mismatch temporaire entre `pin_hash` en base et `pin` dans une partie du domaine ;
- coexistence provisoire entre modelisation domaine TypeScript et executions atomiques SQL ;
- absence de strategie de cache mobile explicite ;
- absence d'un service unique pour le calcul de `dayKey` ;
- l'evenement `member_session_started` est bien produit par `loginWithPin`, mais n'est pas encore persiste en base depuis l'UI mobile ;
- la verification concrete du PIN repose provisoirement sur une RPC SQL simple `verify_member_pin`.
- `home`, `points`, `profile` et `shop` partagent maintenant une lecture coherente des metriques de points, meme si d'autres projections UI restent encore hybrides ;
- la sauvegarde du draft quotidien reste volontairement simple cote mobile et ne passe pas encore par une RPC dediee.
- la finalisation mobile fait confiance a la RPC puis recharge les projections utiles, sans systeme transactionnel mobile additionnel ;
- l'historique partage n'est pas repousse en temps reel apres finalisation : son cache est invalide puis recharge au prochain acces.

## 6. Prochaine etape recommandee

Maintenant que le flow d'entree, la boutique, les objectifs, la persistance simple de session et une premiere tranche `daily points` sont branches, la prochaine etape la plus rentable est de continuer la bascule de l'UI principale vers la couche `application`, en commencant par :

- chargement reel initial des donnees du membre connecte ;
- chargement reel de l'historique partage ;
- reduction du role de `mock-state` pour `home`, `history` et `profile` ;
- centralisation plus propre du refresh apres ecritures metier ;
- clarification ulterieure de la strategie definitive de verification PIN si besoin produit.
