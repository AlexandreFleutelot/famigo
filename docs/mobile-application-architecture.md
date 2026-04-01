# Architecture applicative mobile

## 1. Objectif

Ce document decrit la couche applicative introduite dans `apps/mobile/src/application`.
Son role est de faire le lien entre :

- les repositories Supabase du mobile ;
- le domaine pur dans `packages/domain` ;
- l'UI React Native.

L'objectif est d'eviter que les composants appellent l'infrastructure directement ou reimplementent des regles metier.

## 2. Structure actuelle

La couche est organisee en quatre blocs :

- `use-cases/` : orchestration orientee intention utilisateur ;
- `mappers/` : conversions entre records Supabase et types du domaine ;
- `adapters/` : branchement concret sur les repositories existants ;
- `ports.ts` : contrats attendus par les use cases.

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
- `adapters/supabase-gateways.ts`
- `mappers/member.mapper.ts`
- `mappers/family.mapper.ts`
- `mappers/shop.mapper.ts`
- `mappers/goals.mapper.ts`
- `errors.ts`
- `result.ts`
- `session.ts`

## 3. Responsabilites

### 3.1 Use cases

Chaque use case :

- recoit une intention claire venant de l'UI ;
- charge les donnees necessaires ;
- appelle le domaine si une validation ou une projection locale est utile ;
- delegue l'ecriture atomique a Supabase quand une RPC existe deja ;
- renvoie un resultat uniforme `ok` ou `error`.

### 3.2 Mappers

Les mappers absorbent la difference entre :

- les noms et formes de colonnes SQL ;
- les types du domaine ;
- les resultats JSON des RPC.

Cela evite que ces conversions soient dupliquees dans les ecrans ou les hooks.

### 3.3 Ports

Les ports definissent ce que la couche applicative attend de l'infrastructure.
Ils permettent de :

- tester les use cases sans Supabase ;
- remplacer une implementation concrete sans toucher l'orchestration ;
- rendre visibles les dependances fonctionnelles de chaque cas d'usage.

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
- la vraie auth PIN reste dans `loginWithPin` et sera rebranchee plus tard dans le flow complet.

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

### 4.8 `loadShop`

Responsabilites :

- charger les cadeaux de la famille ;
- charger les mouvements de points du membre ;
- recalculer le solde visible a partir du ledger.

### 4.9 `buyReward`

Responsabilites :

- charger le cadeau et le ledger du membre ;
- faire une prevalidation locale via le domaine ;
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
- ne pas disperser les mappers dans plusieurs couches ;
- ne pas faire dependre `packages/domain` de Supabase ;
- garder des use cases centres sur des intentions produit ;
- garder le contexte de navigation/session mobile dans une couche applicative simple, pas dans le domaine ;
- documenter explicitement les ecarts temporaires entre domaine TS et SQL.

## 6. Limites actuelles

- l'UI principale utilise encore largement le mock state ;
- la strategie de cache et de refresh n'est pas encore definie ;
- `dayKey` n'est pas encore fourni par un service unique partage ;
- `members + session` est maintenant prepare cote application, mais l'UI n'est pas encore refondue pour consommer tout le flow ;
- la persistance reelle du contexte mobile reste a brancher sur un storage adapte a React Native ;
- les slices `daily points` ne sont pas encore branches de bout en bout.

## 7. Etapes logiques suivantes

- brancher l'UI de selection famille puis membres sur ces nouveaux use cases ;
- reconnecter ensuite la veritable auth PIN sur le membre deja selectionne ;
- basculer ensuite `shop` vers les vrais use cases ;
- brancher `goals` ;
- poser la meme approche pour `daily points` avec un calcul unique de `dayKey`.
