# BattleMath — Record par niveau

Date : 2026-11-11. Demande de l'utilisateur.

## Règle
- Le **record** d'un niveau d'un parcours, pour un profil, est le plus petit
  `tempsMedian` parmi ses séries **réussies** (bonnes ≥ 9) de ce niveau.
  Une série à moins de 9/10 ne peut pas établir de record, quelle que soit
  sa vitesse.
- Aucune donnée nouvelle : le record est dérivé des séries (`src/core/progression.ts`).

## Affichage
- Page de parcours (`src/ui/parcours.ts`) : sous « Niveau n » et les étoiles,
  une ligne « Record 4,2 s » (`span.record`, via `formaterSecondes`) quand un
  record existe. Rien sinon.
- Fin de série (`src/ui/jeu.ts`), après le verdict, si la série est réussie :
  - premier record du niveau : « Premier record : 4,2 s » ;
  - record battu : « Nouveau record ! 4,2 s (avant : 5,1 s) » avec une
    animation courte (`.record-battu` : pulsation et étoiles ✨ qui
    apparaissent, CSS seulement, ≈ 1,2 s, désactivée sous
    `prefers-reduced-motion: reduce`) ;
  - pas battu : « Record : 5,1 s » en petit, sans animation.
  - L'ancien record est calculé sur les séries **avant** l'enregistrement de
    la série courante ; le nouveau après.
- Série non réussie : aucune mention de record.

## API
```ts
// src/core/progression.ts
export function record(series: readonly Serie[], parcours: ParcoursId, niveau: number): number | null
```

## Tests
- `record` : aucune série → null ; séries non réussies ignorées ; plus petit
  tempsMedian parmi les réussies ; filtre parcours et niveau.
- Parcours : « Record 4,2 s » affiché sur le bon niveau, absent sinon.
- Jeu : premier record, record battu (texte avec ancien et nouveau, classe
  `record-battu` présente), record non battu, série non réussie sans record.
