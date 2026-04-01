# Specification fonctionnelle - Famigo v1

## 1. Perimetre

Cette specification couvre les comportements fonctionnels du MVP mobile Famigo.
Elle ne couvre pas l'administration web, la monetisation ni les fonctionnalites explicitement hors scope.

## 2. Acteurs

### 2.1 Parent

- peut se connecter avec son profil et son PIN ;
- peut attribuer ses 5 points quotidiens comme n'importe quel autre membre ;
- peut voter pour un objectif ;
- peut acheter dans la boutique ;
- peut consulter l'historique ;
- peut creer, modifier et supprimer les objectifs famille ;
- peut creer, modifier et supprimer des objets dans la boutique.

### 2.2 Child

- peut se connecter avec son profil et son PIN ;
- peut attribuer ses 5 points quotidiens comme n'importe quel autre membre ;
- peut voter pour un objectif ;
- peut acheter dans la boutique ;
- peut consulter l'historique.

## 3. Regles fonctionnelles globales

- Une famille regroupe plusieurs membres.
- Un membre appartient a une seule famille dans le cadre de la v1.
- Un membre peut se connecter depuis n'importe quel appareil associe a sa famille.
- L'application repose sur des journees de jeu successives.
- Les regles metier doivent etre identiques pour tous les membres, sauf les droits d'administration des objectifs.

## 4. Authentification

### 4.1 Parcours

1. L'utilisateur ouvre l'application.
2. Il choisit une famille parmi les familles disponibles pour l'appareil ou le contexte courant.
3. Il choisit un profil dans un carousel de membres de cette famille.
4. Il saisit le PIN a 4 chiffres associe a ce profil.
5. Si le PIN est valide, la session du membre est ouverte.

### 4.2 Regles

- Le login n'exige pas d'email.
- Le login n'exige pas de mot de passe alphanumerique.
- Le choix de la famille precede toujours le choix du membre.
- Le PIN contient exactement 4 chiffres.
- Le choix du membre precede toujours la saisie du PIN.
- La verification concrete du PIN doit se faire a partir d'un secret derive ou hash cote infrastructure, pas d'un PIN stocke en clair.

### 4.3 Cas limites

- Si le PIN est invalide, l'acces est refuse.
- Si le profil n'appartient pas a la famille de l'appareil ou du contexte courant, l'acces est refuse.
- Si aucune famille n'est encore selectionnee, l'application doit rester sur l'etape de choix de famille.

## 5. Attribution de points

### 5.1 Intention

Chaque membre dispose chaque jour de 5 points a distribuer aux autres membres de sa famille.

### 5.2 Regles

- Le quota quotidien d'un membre est de 5 points.
- Un membre ne peut pas s'attribuer de points.
- Un membre peut attribuer plusieurs points au meme autre membre.
- Un membre peut modifier la repartition de ses 5 points pendant la journee.
- La somme des points alloues par un membre sur une journee ne peut jamais depasser 5.
- Les points non alloues a la fin de la journee sont perdus.
- Les points recus ne sont credites au solde reel qu'en fin de journee.
- Les parents n'ont pas de privilege supplementaire sur cette mecanique.

### 5.3 Effets fonctionnels

- Pendant la journee, l'application doit permettre de visualiser une repartition en cours.
- En fin de journee, la repartition finale devient definitive pour la journee concernee.
- La cloture quotidienne genere les gains de points des receveurs.
- L'historique doit conserver la trace des points donnes.

### 5.4 Cas limites

- Si un membre n'alloue aucun point, il perd ses 5 points de la journee.
- Si un membre n'alloue qu'une partie de ses points, le reliquat est perdu.
- Si un membre modifie plusieurs fois sa repartition dans la journee, seule la repartition finale avant cloture fait foi.

## 6. Boutique

### 6.1 Intention

La boutique permet aux membres d'echanger leurs points disponibles contre des cadeaux.

### 6.2 Regles

- Un cadeau de boutique contient au minimum un nom, une image et un cout.
- Les cadeaux sont disponibles en quantite illimitee.
- Un achat est autorise seulement si le membre dispose d'un solde suffisant au moment de l'achat.
- Un achat decremente immediatement le solde du membre.
- Les achats sont visibles dans l'historique.

### 6.3 Cas limites

- Si le solde est insuffisant, l'achat est refuse.
- Un achat n'attend pas la fin de journee pour etre pris en compte.
- Si l'etat visible du solde est calcule cote mobile, il doit rester aligne sur la source de verite `point_transactions`.

## 7. Objectifs famille

### 7.1 Intention

Les objectifs famille permettent de faire emerger une activite ou une promesse collective via un vote quotidien.

### 7.2 Regles de gestion

- Les parents peuvent creer, modifier et supprimer les objectifs.
- Les enfants ne peuvent pas gerer les objectifs.
- Un objectif possede une cible a atteindre.
- Lorsqu'un objectif atteint sa cible, il passe en statut de promesse a realiser.
- Lorsqu'un objectif atteint sa cible, il est historise.

### 7.3 Regles de vote

- Chaque membre peut voter une fois par jour.
- Chaque membre ne peut voter que pour un seul objectif total par jour.
- Un membre peut changer de vote dans la journee uniquement si cette possibilite est explicitement retenue par la conception finale.

### 7.4 Hypothese fonctionnelle retenue pour v1

En l'absence de precision contraire, la v1 retient une interpretation stricte :

- un seul vote enregistre par membre et par jour ;
- pas de multi-vote ;
- pas de repartition de vote sur plusieurs objectifs ;
- le changement de vote dans la meme journee n'est pas garanti et doit etre confirme avant implementation.

### 7.5 Cas limites

- Un vote supplementaire dans la meme journee est refuse.
- Un vote sur un objectif supprime ou inactif est refuse.
- Si un vote fait atteindre la cible, le changement de statut et l'evenement d'historique doivent etre produits atomiquement.

## 8. Historique

### 8.1 Contenu

L'historique commun contient au minimum :

- les points donnes ;
- les achats ;
- les objectifs atteints.

### 8.2 Visibilite

- Tous les membres peuvent consulter l'historique.
- L'historique est partage a l'echelle de la famille.

## 9. Profil

### 9.1 Objet

Le profil sert a representer le membre connecte dans l'application.

### 9.2 Contenu minimum attendu

- identite affichable du membre ;
- role du membre ;
- informations utiles a la comprehension de son usage dans Famigo.

### 9.3 Hors specification detaillee

Les champs exacts du profil ne sont pas entierement definis dans ce document.

## 10. Evenements majeurs a tracer

- connexion d'un membre ;
- vote enregistre ;
- achat effectue ;
- attribution finale de points en fin de journee ;
- objectif atteint.

## 11. Hypotheses residuelles

- La definition exacte de "fin de journee" dependra du fuseau horaire ou du parametre de famille retenu en implementation.
- Le comportement de reallocation apres un achat le meme jour devra etre verifie techniquement si le solde visible inclut ou non les gains en attente.
- Le mode de gestion initiale des profils membres n'est pas specifie dans la v1.
- En premiere iteration UI, la session mobile peut etre limitee a un contexte simple `selectedFamilyId + selectedMemberId` avant branchement complet de l'auth PIN.
- Le remplacement complet du mock state par des flux applicatifs reels est encore progressif.
