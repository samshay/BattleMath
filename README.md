# BattleMath

Application de calcul mental (niveau CE2) pour enfant, installable sur téléphone (PWA) et utilisable hors ligne.

## Développement

```
npm install
npm run dev      # serveur de développement
npm test         # tests
npm run build    # build de production dans dist/
```

## Ajuster les niveaux

Les niveaux se règlent dans `src/core/levels.ts`. Les temps cibles sont exprimés en **secondes**, dans les tableaux propres à chaque parcours.

## Déploiement

Un push sur la branche `main` lance le workflow `.github/workflows/deploy.yml` (tests, build, publication sur GitHub Pages).
À faire une seule fois dans les réglages du dépôt : Pages, Source « GitHub Actions ».
Le dépôt doit s'appeler `BattleMath` (l'application est servie sous `/BattleMath/`).

## Installation sur téléphone

- iPhone : ouvrir l'adresse dans Safari, Partager, Sur l'écran d'accueil.
- Android : ouvrir l'adresse dans Chrome, menu, Installer l'application.

## Données

Tout reste sur le téléphone (aucun serveur, aucun compte).

- **Profils** : le choix du joueur se fait sur l'accueil, par pastilles (couleur + prénom). La gestion se fait dans l'écran Parents : prénom, couleur, ajout et suppression, jusqu'à 4 profils.
- **Réglages par profil** : vitesse et parcours avancés sont propres à chaque profil, tout comme la progression.
- **Migration** : les données existantes (version 1) sont migrées automatiquement dans un premier profil « Enfant ».
- **Export / import** : global, tous profils confondus, depuis l'écran Parents.
