# Scope MVP - Famigo v1

## 1. Objectif du MVP

Le MVP doit valider qu'une famille peut utiliser Famigo au quotidien pour :

- se connecter facilement sans email ;
- attribuer des points de facon recurrente ;
- depenser des points dans une boutique ;
- participer a des objectifs communs ;
- consulter un historique partage.

Le MVP n'a pas pour objectif de couvrir tous les cas familiaux ni de proposer une plateforme parentale complete.

## 2. Fonctionnalites incluses

### 2.1 Authentification

Inclus :

- selection d'un membre via un carousel de profils ;
- saisie d'un PIN a 4 chiffres ;
- connexion possible depuis n'importe quel appareil lie a la famille ;
- roles v1 : `parent` et `child`.

Regles :

- aucun email n'est requis ;
- tous les parents sont admins pour la v1 ;
- l'authentification repose sur l'appartenance a une famille et sur le PIN du membre.

### 2.2 Attribution de points

Inclus :

- chaque membre dispose de 5 points par jour a repartir ;
- un membre peut donner plusieurs points au meme autre membre ;
- un membre ne peut pas se donner de points a lui-meme ;
- la repartition peut etre modifiee pendant la journee ;
- les points non alloues en fin de journee sont perdus ;
- les points ne sont reellement gagnes qu'en fin de journee.

Non inclus :

- bonus exceptionnels ;
- privileges parentaux sur la mecanique de points ;
- report des points non utilises ;
- missions ou streaks.

### 2.3 Objectifs famille

Inclus :

- liste d'objectifs familiaux ;
- creation, modification et suppression par les parents ;
- un vote par jour et par personne ;
- un seul objectif total par jour pour chaque membre ;
- progression de l'objectif jusqu'a sa cible ;
- passage en promesse a realiser lorsque la cible est atteinte ;
- historisation de l'objectif atteint.

Non inclus :

- votes multiples dans une meme journee ;
- ponderation des votes selon le role ;
- workflow complexe de cloture ou de validation.

### 2.4 Boutique

Inclus :

- cadeaux illimites avec nom, image et cout ;
- achat par un membre si son solde est suffisant ;
- decrementation immediate des points lors de l'achat ;
- visibilite des achats dans l'historique.

Non inclus :

- stock ;
- validation parentale ;
- panier ;
- variantes produit ou logistique reelle.

### 2.5 Historique

Inclus :

- historique visible par tous les membres ;
- trace des points reçus aggrégé par membre et par jour (les donneurs reste anonyme) ;
- trace des achats ;
- trace des objectifs atteints.

Non inclus :

- filtres avances ;
- export ;
- moderation d'evenements.

### 2.6 Profil

Inclus :

- consultation du profil du membre connecte ;
- informations minimales utiles a l'usage du produit.

Hors MVP detaille :

- edition avancee du profil ;
- preferences riches ;
- gestion fine de securite au-dela du PIN.

## 3. Hors scope explicite

- missions ;
- streaks ;
- email / invitation ;
- creation de famille par l'utilisateur ;
- micro-SaaS ;
- abonnement ;
- panneau d'administration web ;
- validation parentale des achats.

## 4. Regles transverses du MVP

- Les parents ont un role d'administration sur les objectifs, pas sur la mecanique quotidienne des points.
- Toutes les fonctionnalites v1 doivent etre pensees pour un usage mobile.
- La terminologie produit doit rester simple et familiale.
- Le MVP doit privilegier des parcours courts et comprehensibles plutot que des parametres nombreux.

## 5. Hypotheses residuelles

- Le catalogue boutique est gere par la famille ou par un administrateur interne, mais le mode exact de gestion n'est pas tranche ici.
- Le contenu exact de l'ecran profil reste minimal et devra etre precise par design produit.
- Le comportement en cas d'echec de cloture de fin de journee doit etre defini techniquement, sans changer la regle metier.
