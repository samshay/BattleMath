# Prompt à coller dans Claude Code

Lis `docs/superpowers/specs/2026-11-11-theme-spatial-design.md` : c'est la spec d'un habillage visuel « espace » pour BattleMath. Les assets, les valeurs de variables et quatre maquettes HTML sont déjà dans le dépôt (`src/assets/`, `public/icons/`, `docs/design/`).

Ce que j'attends :
1. Ouvre les quatre maquettes de `docs/design/maquettes/` et compare-les aux écrans actuels.
2. Écris le plan d'implémentation dans `docs/superpowers/plans/2026-11-11-theme-spatial.md`, découpé en petites étapes testables, et montre-le-moi avant de coder.
3. Implémente en TDD en respectant CLAUDE.md : aucune règle de jeu ne change, pas d'`<input>` ni de chrono sur les écrans enfant, touches ≥ 56 px, `data-test` conservés.
4. Termine par `npm test` et `npm run build`, puis dis-moi ce qui reste à vérifier à l'œil sur téléphone. Ne pousse pas sur `main` avant ma relecture.

Si un point de la spec contredit le code ou une spec existante, arrête-toi et demande-moi.
