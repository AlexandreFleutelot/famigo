# Architecture applicative mobile

## 1. Objectif

Ce document decrit la couche applicative introduite dans `apps/mobile/src/application`.
Son role est de faire le lien entre :

- les repositories Supabase du mobile ;
- le domaine pur dans `packages/domain` ;
- l'UI React Native.

L'objectif est d'eviter que les composants appellent l'infrastructure directement ou reimplementent des regles metier.

## 2. Structure actuelle

La couche est maintenant organisee en quatre blocs simples :

- `use-cases/` : orchestration orientee intention utilisateur ;
- `session.ts` : contexte applicatif minimal famille / membre ;
- `result.ts` : contrat uniforme `ok` / `error` ;
- `errors.ts` : erreurs applicatives exposees a l'UI.

Fichiers actuellement poses :

- `use-cases/get-families.ts`
- `use-cases/select-family.ts`
- `use-cases/get-members-for-selected-family.ts`
- `use-cases/start-member-session.ts`
- `use-cases/restore-session.ts`
- `use-cases/clear-session.ts`
- `use-cases/login-with-pin.ts`
- `use-cases/load-shop.ts`
- `use-cases/buy-reward.ts`
- `use-cases/load-goals.ts`
- `use-cases/cast-goal-vote.ts`
- `errors.ts`
- `result.ts`
- `session.ts`

## 3. Responsabilites

### 3.1 Use cases

Chaque use case :

- recoit une intention claire venant de l'UI ;
- charge les donnees necessaires ;
- appelle le domaine seulement quand une regle pure apporte une vraie valeur immediate ;
- delegue l'ecriture atomique a Supabase quand une RPC existe deja ;
- renvoie un resultat uniforme `ok` ou `error`.

### 3.2 Repositories

Les repositories Supabase restent simples et portent les conversions legeres necessaires entre :

- les noms et formes de colonnes SQL ;
- les types du domaine ;
- les resultats JSON des RPC.

Cela evite de disperser ces conversions dans l'UI sans reintroduire une couche intermediaire de ports ou de mappers triviaux.

## 4. Use cases actuellement disponibles

### 4.1 `getFamilies`

Responsabilites :

- lister les familles disponibles ;
- fournir a l'UI un premier point d'entree explicite multi-famille.

### 4.2 `selectFamily`

Responsabilites :

- verifier que la famille existe ;
- enregistrer un contexte applicatif minimal avec `selectedFamilyId` ;
- reinitialiser `selectedMemberId` tant qu'aucun membre n'est encore choisi.

### 4.3 `getMembersForSelectedFamily`

Responsabilites :

- relire la famille actuellement selectionnee ;
- charger uniquement les membres de cette famille ;
- eviter de demander a l'UI de repasser le `familyId` partout.

### 4.4 `startMemberSession`

Responsabilites :

- verifier qu'une famille est bien selectionnee ;
- verifier que le membre choisi appartient a cette famille ;
- enregistrer un contexte applicatif minimal avec `selectedFamilyId + selectedMemberId`.

Hypothese explicite :

- pour cette tranche, `startMemberSession` ne verifie pas encore le PIN ;
- le role de `startMemberSession` reste de memoriser le membre choisi dans le contexte minimal ;
- la vraie validation PIN est ensuite delegatee a `loginWithPin` dans le flow UI courant.

### 4.5 `restoreSession`

Responsabilites :

- relire le contexte applicatif stocke ;
- normaliser la session si la famille ou le membre n'existe plus ;
- permettre a l'UI de redemarrer sur le bon ecran sans logique de reconciliation locale.

### 4.6 `clearSession`

Responsabilites :

- vider le contexte applicatif minimal ;
- preparer une sortie de session simple cote UI.

### 4.7 `loginWithPin`

Responsabilites :

- verifier le format du PIN ;
- charger le snapshot d'authentification du membre ;
- verifier l'appartenance a la famille ;
- demander la verification via un `PinVerifier` ;
- produire l'objet de session et l'evenement d'historique.

Point d'attention :

- le schema stocke `pin_hash`, alors que le domaine historique manipule encore un `pin` clair dans certains mocks ;
- la couche applicative sert donc de pont temporaire et rend cette divergence explicite.

Etat de branchement actuel :

- l'UI mobile utilise maintenant `startMemberSession` puis `loginWithPin` dans un flow en deux temps ;
- une RPC SQL minimale `verify_member_pin` sert de support concret au `PinVerifier` pour comparer `pin` et `pin_hash` sans introduire de systeme d'auth plus large ;
- la session mobile reste volontairement limitee a un contexte simple, sans persistance auth forte.

### 4.8 `loadShop`

Responsabilites :

- charger les cadeaux de la famille ;
- charger les mouvements de points du membre ;
- recalculer le solde visible a partir du ledger.

### 4.9 `buyReward`

Responsabilites :

- verifier que le cadeau cible existe dans la famille chargee ;
- deleguer l'ecriture finale atomique a la RPC `purchase_reward` ;
- renvoyer un recu d'achat exploitable par l'UI.

### 4.10 `loadGoals`

Responsabilites :

- charger les objectifs actifs ou promis ;
- renvoyer des objets directement conformes au domaine.

### 4.11 `castGoalVote`

Responsabilites :

- verifier que l'objectif cible existe dans le contexte charge ;
- deleguer le vote atomique a la RPC `cast_goal_vote` ;
- reconstruire un etat de but coherent pour l'UI a partir du recu de la RPC.

## 5. Regles de conception a conserver

- ne pas remettre de logique metier critique dans l'UI ;
- garder des repositories simples sans ports ou mappers triviaux quand ils n'apportent rien ;
- ne pas faire dependre `packages/domain` de Supabase ;
- garder des use cases centres sur des intentions produit ;
- garder le contexte de navigation/session mobile dans une couche applicative simple, pas dans le domaine ;
- documenter explicitement les ecarts temporaires entre domaine TS et SQL.

## 6. Limites actuelles

- l'UI principale utilise encore largement le mock state ;
- la strategie de cache et de refresh n'est pas encore definie ;
- `dayKey` n'est pas encore fourni par un service unique partage ;
- le flow d'entree famille / membre / PIN, la boutique et les objectifs sont branches, mais le reste de l'UI principale consomme encore largement le mock state ;
- la persistance du contexte mobile est maintenant branchee simplement sur `AsyncStorage` ;
- les slices `daily points` ne sont pas encore branches de bout en bout.

## 7. Etapes logiques suivantes

- basculer `daily points` vers les vrais use cases ;
- brancher ensuite le chargement initial complet des donnees du membre connecte ;
- brancher un chargement reel de l'historique partage ;
- reduire la dependance de `home` et `profile` aux projections issues du mock state ;
- poser la meme approche pour `daily points` avec un calcul unique de `dayKey`.
