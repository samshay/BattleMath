# BattleMath — Thème spatial (habillage visuel)

Date : 2026-11-11. Demande de l'utilisateur.

## Objectif
Habiller l'application dans un univers « espace » sans changer une seule règle de jeu :
mêmes écrans, mêmes parcours, mêmes textes, mêmes routes, mêmes données. Seuls changent
les couleurs, les polices, les icônes et quelques illustrations décoratives.

Références visuelles (à ouvrir dans un navigateur, 390 × 844) :
`docs/design/maquettes/accueil.html`, `parcours.html`, `jeu.html`, `fin.html`.
Les styles y sont en ligne : tailles, rayons, bordures et couleurs font foi pour l'aspect.
Prénoms, scores et temps y sont des exemples. Les maquettes ne font **pas** foi pour le
comportement ni pour les textes : là, le code et les specs existantes restent l'autorité.

## Décisions
- **Thème unique sombre.** L'app ne suit plus `prefers-color-scheme`. Supprimer les deux
  blocs `@media (prefers-color-scheme: dark)` de `src/style.css` et garder un seul `:root`.
- **Variables CSS existantes conservées** (`--fond`, `--texte`, `--primaire`, `--surface`,
  `--succes`, `--erreur`, `--bord`) avec de nouvelles valeurs ; nouvelles variables ajoutées.
  Valeurs dans `docs/design/tokens.css`. Aucune couleur en dur ailleurs que dans `:root`
  et dans `COULEURS`.
- **Texte sur fond coloré** : `--primaire` et `--succes` sont maintenant clairs. Partout où
  le CSS pose `color: #fff` sur ces fonds (`.actif`, `.continuer`, `.principal`,
  `.touche-valider`), utiliser `var(--sur-accent)`.
- **Une couleur par opération**, toujours accompagnée du signe : `add` cyan, `sub` ambre,
  `mul` rose, `mix` violet (`--op-*`). La couleur ne porte jamais l'information seule.
- **Couleurs de profil** : mêmes 6 clés (aucune migration de données), valeurs éclaircies
  pour rester lisibles sur fond sombre. Dans `src/storage/schema.ts` :
  ```ts
  export const COULEURS = {
  bleu: '#6C8CFF',
  vert: '#5EE6A0',
  orange: '#FF9F45',
  violet: '#A78BFA',
  rose: '#FF6FB1',
  turquoise: '#4FD8EB',
  } as const
  ```
- **Polices auto-hébergées** (l'app doit rester utilisable hors ligne, aucun appel à
  Google Fonts) : paquets `@fontsource/fredoka` (600, 700) et `@fontsource/nunito`
  (700, 800), importés dans `src/main.ts`, sous-ensemble latin si le paquet le propose.
  Le service worker met déjà les `woff2` en cache (`globPatterns`).
  `--police-titre` pour titres, chiffres, calcul, réponse et pavé ; `--police-texte` ailleurs.
- **Mascottes décoratives seulement** (`aria-hidden="true"`), aucune mécanique de combat,
  de vies ou de chrono.
- **Fin de série** : « Niveau suivant » devient le bouton principal (`--primaire`) quand il
  est affiché ; « Rejouer » passe en bouton secondaire (surface + bordure). Sans niveau
  suivant, « Rejouer » reste principal.

## Fichiers livrés
- `src/assets/icones/*.svg` : 16 icônes, grille 24, `currentColor` (la couleur vient du CSS).
- `src/assets/personnages/*.svg` : `vaisseau`, `pilote`, `alien-add`, `alien-sub`,
  `alien-mul`, `boss-mix` (couleurs fixes).
- `src/assets/effets/*.svg` : `eclat` (niveau validé), `planete` (logo sans fond).
- `public/icons/*.png` : `icon-192`, `icon-512`, `maskable-512`, `apple-touch-icon`,
  mêmes noms que les fichiers actuels, qu'ils remplacent. Sources dans `docs/design/app/`.
- `docs/design/tokens.css` : valeurs des variables.
- `docs/design/maquettes/*.html` : les quatre écrans.

## Intégration des icônes
- Import Vite en chaîne (`import retour from '../assets/icones/retour.svg?raw'`) et injection
  dans le DOM, comme l'est déjà `ENGRENAGE` dans `src/ui/accueil.ts`. Prévoir un utilitaire
  unique (par exemple `icone(nom, taille)` dans `src/ui/icones.ts`) qui renvoie un élément
  `aria-hidden="true"` ; l'accessibilité passe par le texte ou l'`aria-label` du bouton.
- Remplacements :

| Aujourd'hui | Devient |
| --- | --- |
| `ENGRENAGE` (accueil) | `parents.svg` |
| `★` et `★★` (grille des niveaux, total d'étoiles) | `etoile.svg`, couleur `--etoile` |
| `✨` (record battu) | `etincelle.svg`, couleur `--succes` |
| `⌫` (pavé) | `effacer.svg` |
| bouton « Retour » du jeu | `retour.svg` + texte « Retour » |
| lien « Changer de joueur » | `joueur.svg` + texte |
| bouton « Continuer » | `continuer.svg` + texte |
| boutons d'opération | pastille ronde `--op-*` contenant `op-*.svg` en `--sur-accent`, + nom |
| niveau verrouillé | `verrou.svg` + numéro, en `--texte-doux` |

- Les libellés lus par les lecteurs d'écran et par les tests restent du texte. Quand un
  glyphe disparaît d'un `textContent` attendu par un test (par exemple `★ 2`), remplacer
  par un texte masqué (`.sr-only`, déjà dans le CSS) ou un `aria-label`, et adapter le test.
- `correct.svg`, `erreur.svg`, `etoile-vide.svg`, `record.svg` et `pilote.svg` sont fournis
  pour la suite ; ne les brancher que si un écran en a besoin.

## Écran par écran
### Accueil (`src/ui/accueil.ts`)
- En-tête : « BattleMath » en `--police-titre`, bouton rond Parents inchangé (56 px).
- Sous l'en-tête, une illustration décorative : planète, vaisseau, `alien-add`, quelques étoiles.
- « Qui joue ? » puis les profils en colonne : 72 px de haut, rayon 24, pastille 32 px,
  prénom en `--police-titre`. Profil actif : bordure 3 px `--primaire`.
- Bannière d'installation et avertissements : mêmes textes, couleurs du thème.

### Parcours (`src/ui/parcours.ts`)
- En-tête : pastille + prénom à gauche ; à droite `etoile.svg` + total, en `--etoile`.
- « Continuer » : fond `--succes`, texte `--sur-accent`, deux lignes (« Continuer » puis
  le parcours et le niveau).
- Opérations : grille 2 × 2, 64 px ; sélection = bordure 3 px de la couleur de l'opération
  (plus de fond plein). Tailles : même principe avec `--primaire`. Garder `aria-pressed`
  ou l'équivalent pour que la sélection ne repose pas sur la couleur seule.
- Grille des niveaux, 4 colonnes, tuiles de 84 px, numéro en `--police-titre` :
  - `verrouille` : fond `--fond`, bordure fine, `verrou.svg`, désactivé ;
  - `ouvert` : bordure 3 px `--primaire` ;
  - `reussi` : bordure 3 px `--primaire` + une étoile ;
  - `valide` : bordure 2 px `--succes` + deux étoiles + record.
- Le mot « Niveau » et le mot « Record » restent dans le DOM (masqués visuellement si la
  place manque) pour l'accessibilité.

### Jeu (`src/ui/jeu.ts`, `src/ui/pave.ts`)
- Première ligne : « Retour » à gauche, à droite la mascotte du parcours (52 px) :
  `alien-add`, `alien-sub`, `alien-mul`, ou `boss-mix` pour le mixte.
- Pastilles de série (14 px) : à venir = contour `--texte-doux`, en cours = `--primaire`,
  juste = `--succes`, faux = `--erreur`. Ordre et logique inchangés.
- Calcul en `--police-titre` (≈ 68 px) ; zone de réponse = carte `--surface`, bordure 2 px
  `--primaire`, 76 px de haut. États `juste` et `correction` : mêmes classes, couleurs du thème.
- Pavé : touches 64 px, rayon 20, chiffres en `--police-titre` ; « Valider » pleine largeur,
  fond `--succes`, texte `--sur-accent`. Disposition inchangée.
- Rappels : aucun `<input>`, aucun chrono visible, touches ≥ 56 px.

### Fin de série (`src/ui/jeu.ts`, `terminer`)
- En haut, `vaisseau.svg` et quelques étoiles (décor). Si la série est validée, `eclat.svg`
  peut accompagner le verdict ; respecter `prefers-reduced-motion` comme aujourd'hui.
- Score en `--police-titre` (≈ 64 px) ; verdict `validee` en `--succes`.
- Série validée : deux `etoile.svg` ; réussie sans le temps : une.
- Record battu : encadré `--surface` à bordure `--succes` avec `etincelle.svg`. Les trois
  cas de record et leurs textes ne changent pas.

### Parents (`src/ui/parents.ts`)
- Hérite du thème par les variables. Pas de refonte : vérifier seulement la lisibilité
  (tableaux, champs, graphiques, grille des faits, pastilles de couleur).

### PWA
- `index.html` : une seule balise `theme-color`, `#0B1026`.
- `vite.config.ts` : `background_color` et `theme_color` du manifeste à `#0B1026`.

## Hors périmètre
- Aucune modification dans `src/core/`, `src/game/`, ni dans le schéma de stockage
  (hors valeurs de `COULEURS`). Pas de nouvelle route, pas de nouveau réglage.
- Pas de sons, pas d'animations nouvelles en dehors de l'existant.

## Contrastes (vérifiés par calcul)
| Paire | Couleurs | Ratio | Minimum |
| --- | --- | --- | --- |
| texte/fond | `#EEF1FF` sur `#0B1026` | 16.7 | 4.5 |
| texte/surface | `#EEF1FF` sur `#161E44` | 14.3 | 4.5 |
| texte-doux/fond | `#A9B4E0` sur `#0B1026` | 9.2 | 4.5 |
| texte-doux/surface | `#A9B4E0` sur `#161E44` | 7.9 | 4.5 |
| primaire/fond | `#4FD8EB` sur `#0B1026` | 11.1 | 4.5 |
| succes/surface | `#5EE6A0` sur `#161E44` | 10.2 | 4.5 |
| erreur/fond | `#FF7A7A` sur `#0B1026` | 7.5 | 4.5 |
| erreur/surface | `#FF7A7A` sur `#161E44` | 6.4 | 4.5 |
| sur-accent/primaire | `#0B1026` sur `#4FD8EB` | 11.1 | 4.5 |
| sur-accent/succes | `#0B1026` sur `#5EE6A0` | 11.9 | 4.5 |
| sur-accent/op-sub | `#0B1026` sur `#FFB547` | 10.7 | 4.5 |
| sur-accent/op-mul | `#0B1026` sur `#FF6FB1` | 7.3 | 4.5 |
| sur-accent/op-mix | `#0B1026` sur `#A78BFA` | 6.9 | 4.5 |
| etoile/surface | `#FFB547` sur `#161E44` | 9.2 | 3 |
| profil bleu/surface | `#6C8CFF` sur `#161E44` | 5.2 | 3 |
| profil vert/surface | `#5EE6A0` sur `#161E44` | 10.2 | 3 |
| profil orange/surface | `#FF9F45` sur `#161E44` | 7.9 | 3 |
| profil violet/surface | `#A78BFA` sur `#161E44` | 5.9 | 3 |
| profil rose/surface | `#FF6FB1` sur `#161E44` | 6.3 | 3 |
| profil turquoise/surface | `#4FD8EB` sur `#161E44` | 9.5 | 3 |

## Tests et critères d'acceptation
- `npm test` et `npm run build` verts. Les `data-test` existants sont conservés.
- Tests à adapter ou ajouter (TDD, test d'abord) : total d'étoiles et marques de niveau
  sans glyphe `★`, touche Effacer sans `⌫` (l'`aria-label` « Effacer » reste), record battu
  sans `✨`, mascotte selon l'opération du parcours, bouton principal de fin de série.
- Plus aucun `★`, `✨` ni `⌫` dans `src/ui/`.
- Aucun appel réseau vers une police externe ; l'app s'affiche correctement hors ligne.
- Plus aucun `prefers-color-scheme` dans `src/style.css` ni dans `index.html`.
- Vérification visuelle sur téléphone en portrait des quatre écrans enfant, comparés aux
  maquettes, puis de l'écran Parents.
