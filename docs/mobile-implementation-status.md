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

- pas encore migre vers la nouvelle couche applicative ;
- repositories presents mais orchestration incomplete ;
- `dayKey` et refresh encore a centraliser.

## 4. Tests actuellement poses

Des tests de couche applicative existent pour :

- `getFamilies` ;
- `selectFamily` ;
- `getMembersForSelectedFamily` ;
- `startMemberSession` ;
- `restoreSession` ;
- `clearSession` ;
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

## 6. Prochaine etape recommandee

Maintenant que le flow d'entree, la boutique, les objectifs et la persistance simple de session sont branches, la prochaine etape la plus rentable est de continuer la bascule de l'UI principale vers la couche `application`, en commencant par :

- bascule de `daily points` hors de `mock-state` ;
- chargement reel initial des donnees du membre connecte ;
- chargement reel de l'historique partage ;
- reduction du role de `mock-state` pour `home`, `history` et `profile` ;
- clarification ulterieure de la strategie definitive de verification PIN si besoin produit.
