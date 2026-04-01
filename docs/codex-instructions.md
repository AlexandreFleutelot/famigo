# Instructions Codex - projet Famigo

## 1. Objectif

Ces instructions servent de garde-fou pour toute intervention de Codex sur Famigo.
Elles completent `AGENTS.md` avec un cadrage produit v1 plus explicite.

## 2. Regles generales

- Ecrire en francais pour toute documentation produit du dossier `docs`.
- Ne pas inventer de fonctionnalites hors scope v1.
- Rester concret, structure et sobre.
- Documenter explicitement les hypotheses residuelles lorsqu'une decision n'est pas tranchee.
- Ne pas modifier les regles produit sans les signaler clairement.

## 3. Regles produit a respecter

### 3.1 Authentification

- Le flow v1 commence par le choix d'une famille, puis un carousel de profils, puis un PIN a 4 chiffres.
- Aucun email n'est obligatoire.
- Un membre peut se connecter depuis n'importe quel appareil lie a sa famille.

### 3.2 Roles

- Les seuls roles v1 sont `parent` et `child`.
- Tous les parents sont admins pour la v1.
- Les privileges admin des parents ne doivent pas etre etendus implicitement.

### 3.3 Points

- Chaque membre dispose de 5 points par jour a repartir au total.
- Un membre ne peut pas se donner des points a lui-meme.
- Un membre peut donner plusieurs points au meme membre.
- Les points non alloues en fin de journee sont perdus.
- Les points ne sont reellement gagnes qu'en fin de journee.
- Pendant la journee, chaque membre peut reallouer ses 5 points.
- Les parents n'ont pas de privilege special sur cette mecanique.

### 3.4 Boutique

- La boutique contient des cadeaux illimites.
- Un cadeau de v1 possede au minimum un nom, une image et un cout.
- Un achat decremente immediatement les points.
- Ne pas ajouter de validation parentale en v1.

### 3.5 Objectifs famille

- Chaque membre dispose d'un vote par jour.
- Chaque membre ne peut voter que pour un seul objectif total par jour.
- Les parents peuvent creer, modifier et supprimer les objectifs.
- Quand un objectif atteint sa cible, il passe en promesse a realiser et il est historise.

### 3.6 Historique

- L'historique est visible par tous les membres.
- Il contient au minimum achats, points donnes et objectifs atteints.

## 4. Contraintes d'implementation

- Garder la logique metier hors des composants UI.
- Favoriser `packages/domain` pour les regles pures.
- Ne pas coupler le domaine a Supabase ni a React Native.
- Pour la selection famille/membre mobile, preferer un contexte applicatif minimal plutot qu'un systeme de session generique.
- Preferer des slices verticales simples.
- Eviter les abstractions generiques inutiles.

## 5. Quand Codex modifie le projet

Pour tout changement significatif, fournir :

- un plan court ;
- la liste des fichiers touches ;
- les risques principaux ;
- les tests ajoutes ou manquants.

## 6. Ce que Codex doit refuser d'inventer

- missions ;
- streaks ;
- email / invitation ;
- creation de famille par l'utilisateur ;
- micro-SaaS ;
- abonnement ;
- panneau d'administration web ;
- validation parentale des achats.

## 7. Hypotheses residuelles a rendre visibles

Si un sujet n'est pas tranche, Codex doit l'indiquer explicitement.
Exemples attendus :

- definition exacte de la fin de journee ;
- gestion exacte des appareils lies a une famille ;
- detail du contenu editable du profil ;
- regle definitive sur le changement de vote dans la meme journee.
