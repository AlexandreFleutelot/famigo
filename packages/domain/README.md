# @famigo/domain

Package de logique metier pure pour Famigo v1.

## Principes

- aucune dependance React ;
- aucune dependance Supabase ;
- fonctions pures et types metier explicites ;
- invariants critiques verifies au niveau du domaine ;
- historique produit a partir de faits metier.

## Ce que couvre ce package

- selection de membre et creation d'un contexte de session ;
- allocation quotidienne de points avec budget fixe de 5 ;
- reallocation pendant la journee ;
- calcul du restant a distribuer ;
- finalisation de fin de journee ;
- achats boutique avec verification du solde reel ;
- vote unique par jour sur un seul objectif ;
- passage d'un objectif en promesse quand la cible est atteinte ;
- creation d'evenements d'historique metier.

## Hypotheses restantes

- Le domaine utilise `dayKey` comme identifiant deja resolu d'une journee. Le calcul exact de cette cle reste hors du package.
- Le PIN est compare ici comme une valeur deja disponible. Le hashage et la verification securisee relevent d'une couche applicative ou d'infrastructure.
- L'historique des points est implemente sous forme d'evenements `points_given`, conformement a la specification fonctionnelle. Cela entre en tension avec une autre formulation des docs qui parle de points recus agregees et anonymes.
- Le vote est strictement unique et non modifiable dans la meme journee pour la v1.
- Les privileges parentaux sont limites ici a la creation d'objectif. Les autres actions d'administration restent a preciser.
