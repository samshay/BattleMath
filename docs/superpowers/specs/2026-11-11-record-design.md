# BattleMath — Record par niveau

Date : 2026-11-11. Demande de l'utilisateur.

## Règle
- Le **record** d'un niveau d'un parcours, pour un profil, est le plus petit
  `tempsTotal` (somme des 10 temps de réponse, en ms) parmi ses séries **validées** (réussie, bonnes ≥ 9, et médiane ≤ cible)
  de ce niveau. Une série à moins de 9/10, ou réussie mais trop lente (le
  niveau n'est pas fini), ne peut pas établir de record.
- La médiane (`tempsMedian`) garde son rôle pour la validation du niveau ; le
  record, lui, porte sur le temps total de la série.
- `Serie.tempsTotal?: number` est stocké (renseigné par `versSerie`). Les séries
  anciennes sans `tempsTotal` restent valides (pas de changement de version) mais
  sont ignorées par `record`.

## Affichage
- Page de parcours (`src/ui/parcours.ts`) : sous « Niveau n » et les étoiles,
  une ligne « Record 38,2 s » (`span.record`, via `formaterSecondes`) quand un
  record existe. Rien sinon.
- Fin de série (`src/ui/jeu.ts`) : une ligne « Temps de la série : 38,2 s »
  (`data-test="temps-total"`) sous la ligne de la médiane. Puis, après le verdict,
  si la série est validée (comparaison des temps totaux) :
  - premier record du niveau : « Premier record : 38,2 s » ;
  - record battu : « Nouveau record ! 35,0 s (avant : 38,2 s) » avec une
    animation courte (`.record-battu` : pulsation et étoiles ✨ qui
    apparaissent, CSS seulement, ≈ 1,2 s, désactivée sous
    `prefers-reduced-motion: reduce`) ;
  - pas battu : « Record : 35,0 s » en petit, sans animation.
  - L'ancien record est calculé sur les séries **avant** l'enregistrement de
    la série courante ; le nouveau après.
- Série non validée (non réussie, ou « Bravo, presque ! » trop lente) :
  aucune mention de record.

## API
```ts
// src/core/progression.ts
export function record(series: readonly Serie[], parcours: ParcoursId, niveau: number): number | null
```

## Tests
- `record` : aucune série → null ; séries non réussies et réussies-mais-non-validées ignorées ;
  plus petit tempsTotal parmi les validées, séries sans tempsTotal ignorées ; filtre parcours et niveau.
- Parcours : « Record 38,2 s » affiché sur le bon niveau, absent sinon.
- Jeu : premier record, record battu (texte avec ancien et nouveau, classe
  `record-battu` présente), record non battu, série non réussie et 10/10 trop lent sans record.
