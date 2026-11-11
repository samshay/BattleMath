# BattleMath

PWA de calcul mental pour un enfant de CE2, utilisée sur téléphone en portrait. Vite + TypeScript sans framework, vitest, déployée sur GitHub Pages (`base: /BattleMath/`).

## Commandes
- `npm run dev` : serveur de développement (`--host` pour tester sur le téléphone).
- `npm test` : toute la suite (vitest). `npm run test:watch` en continu.
- `npm run build` : `tsc` + Vite + service worker. Doit rester vert avant tout commit.

## Documents de référence
- Spec v1 : `docs/superpowers/specs/2026-11-11-calcul-mental-design.md` (autorité fonctionnelle).
- Spec profils : `docs/superpowers/specs/2026-11-11-profils-design.md`.
- Accueil en deux pages et pavé : `docs/superpowers/specs/2026-11-11-accueil-pave-design.md`.
- Record par niveau : `docs/superpowers/specs/2026-11-11-record-design.md`.
- Plans d'implémentation : `docs/superpowers/plans/`.

## Déploiement
- Dépôt public `samshay/BattleMath` ; chaque push sur `main` déclenche le workflow `.github/workflows/deploy.yml` (tests, build, GitHub Pages). Site : `https://samshay.github.io/BattleMath/`.
- `gh` est installé et authentifié : `gh run list --workflow deploy.yml` pour suivre un déploiement.

## Architecture
- `src/core/` : logique pure (types, générateurs, `levels.ts` = configuration isolée des 12 parcours × 8 niveaux, validation, progression). Aucun accès à `window`, `document`, `localStorage`, `Date.now`, `Math.random` : le hasard passe par `createRng(seed)`.
- `src/game/session.ts` : machine à états d'une série, pure.
- `src/storage/` : schéma versionné (`version: 2`, profils), migration, store avec stockage injecté (`StockageLike`), opérations pures sur les profils.
- `src/ui/` : écrans en DOM vanilla via `h()` (`dom.ts`). Routes hash : `#/`, `#/parcours`, `#/jeu/<parcours>/<niveau>`, `#/parents`. Chaque écran se re-rend par `replaceChildren`.
- `src/main.ts` : câblage (localStorage, sessionStorage, partage, téléchargement, confirmation, service worker).

## Règles du projet
- Identifiants et textes en français. Ton encourageant, phrases courtes pour un enfant de 8 ans.
- Écrans enfant (accueil, jeu) : jamais d'`<input>` (le clavier du téléphone ne doit pas s'ouvrir), touches ≥ 56 px, pas de chrono visible. L'écran Parents est derrière un verrou et peut avoir des champs.
- Temps en millisecondes dans le code et les données ; cibles des niveaux en secondes dans `src/core/levels.ts`.
- Identifiants de parcours : `add|sub|mul|mix` + `-` + `1|2|3`. Clé de fait : `op:a·b` (a ≤ b pour add et mul).
- Seul l'accueil (page « Qui joue ? ») change le profil actif ; l'écran Parents consulte un profil sans le rendre actif. La sélection opération/taille est réinitialisée au choix du joueur, pas à chaque retour sur la page de parcours.
- Record d'un niveau = plus petit `tempsTotal` (somme des 10 réponses) parmi les séries **validées** ; la validation et les graphiques restent sur le temps médian. Les séries anciennes sans `tempsTotal` sont ignorées.
- Un niveau est validé si ≥ 9/10 et médiane ≤ cible effective (vitesse du profil) ; « réussi » = 9/10 sans le temps. Seule la validation débloque le niveau suivant.
- Les tests UI utilisent `// @vitest-environment happy-dom` en tête de fichier et les fixtures de `tests/aide/donnees.ts`. Les sélecteurs de test sont des attributs `data-test`.
- TDD : test d'abord, puis implémentation ; tout nouveau comportement a un test qui échouerait sans lui.
- Pousser sur `main` uniquement après tests et build verts et relecture ; ne jamais créer d'autre dépôt distant sans demande explicite.
