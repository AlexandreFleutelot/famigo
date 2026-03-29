# Famigo

Monorepo TypeScript pour l'application mobile Famigo.

Le projet est initialise avec un squelette technique minimal :

- une application mobile Expo / React Native dans `apps/mobile` ;
- un package de domaine pur dans `packages/domain` ;
- un package UI partageable dans `packages/ui` ;
- un package de configuration partagee dans `packages/config`.

Le repo ne contient pas encore de backend reel ni de fonctionnalites metier v1.
L'application mobile affiche simplement `Famigo`.

## Structure

```text
apps/
  mobile/
packages/
  config/
  domain/
  ui/
docs/
```

## Choix techniques

- Monorepo unique avec `npm workspaces` pour rester simple.
- Expo pour demarrer vite sur mobile sans infrastructure native personnalisee.
- TypeScript strict partage via `packages/config/tsconfig.base.json`.
- Biome pour le lint et le format afin de garder une configuration minimale.
- Vitest present uniquement pour disposer d'un point d'entree test simple des le debut.
- Aucun backend, aucune base de donnees, aucune integration Supabase a ce stade.

## Versions retenues

Le squelette mobile vise Expo SDK 55.
Par inference a partir de la documentation Expo officielle, cela correspond a React Native 0.83 et React 19.2.

Source :

- https://docs.expo.dev/versions/v55.0.0/

## Prerequis

- Node.js 20.19+ recommande par Expo SDK 55
- npm recent avec support workspaces

## Installation

```bash
npm install
```

## Commandes utiles

Lancer l'application mobile :

```bash
npm run start
```

Lancer sur iOS :

```bash
npm run ios
```

Lancer sur Android :

```bash
npm run android
```

Lancer sur le web :

```bash
npm run web
```

Verifier le format et le lint :

```bash
npm run lint
```

Reformater le repo :

```bash
npm run format
```

Verifier les types :

```bash
npm run typecheck
```

Executer les tests :

```bash
npm run test
```

## Etat actuel

- `apps/mobile` : app Expo minimale affichant `Famigo`
- `packages/domain` : package vide pour la logique metier future
- `packages/ui` : package vide pour les composants partageables futurs
- `packages/config` : configuration TypeScript partagee

## Hypotheses residuelles

- La resolution monorepo Expo pourra etre ajustee plus tard si l'application importe directement `packages/domain` ou `packages/ui`.
- Les outils de build publiee et de CI ne sont pas encore definis.
- Les futures dependances metier seront ajoutees au fil des besoins, pas en anticipation.
