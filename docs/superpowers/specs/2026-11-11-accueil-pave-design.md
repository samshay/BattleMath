# BattleMath — Accueil en deux pages et pavé avec Valider pleine largeur

Date : 2026-11-11. Demande de l'utilisateur pendant le test par son fils.

## 1. Accueil en deux pages

### Page 1 — choix du joueur (`#/`)
- Titre « BattleMath ».
- Question « Qui joue ? » puis les pastilles de profil (`rangeeProfils`), en grand :
  une pastille par ligne, pleine largeur, ≥ 64 px de haut, prénom en gros avec
  le disque de couleur. Appuyer choisit le profil actif (`choisirProfil` +
  `sauver`) et navigue vers `#/parcours`.
- Lien « Parents » en bas, inchangé.
- Avertissement de stockage et bannière d'installation restent ici.
- Avec un seul profil, la page s'affiche quand même (une pastille) : le
  chemin reste le même pour l'enfant.

### Page 2 — choix du parcours (`#/parcours`)
- En-tête : disque + prénom du profil actif, total d'étoiles du profil,
  lien « Changer de joueur » vers `#/`.
- Bouton Continuer, boutons d'opération, boutons de taille, grille des
  8 niveaux : exactement le contenu actuel de l'accueil, pour le profil actif.
- `ctx.selection` initialisée depuis le profil actif à l'arrivée sur la page
  (via `selectionDepuisProfil`).
- Si aucun profil actif n'est résoluble (impossible avec des données
  validées), retour à `#/`.

### Navigation
- Écran de jeu : le bouton discret « Accueil » et le bouton « Accueil » de
  fin de série deviennent « Retour » et mènent à `#/parcours`.
- Niveau verrouillé ouvert par l'adresse → `#/parcours`.
- Écran Parents : lien « Retour » → `#/` (inchangé).
- Route inconnue → `#/`.

## 2. Pavé numérique
- Grille 3 colonnes, 5 lignes :
  `1 2 3` / `4 5 6` / `7 8 9` / `0` (sur 2 colonnes) `⌫` / `Valider` (sur 3 colonnes).
- Valider garde son état `disabled` quand la réponse est vide ou le pavé
  inactif ; hauteur ≥ 64 px comme les autres touches.
- Les touches gardent leurs `data-touche` (`0`-`9`, `effacer`, `valider`).

## 3. Tests
- Routeur : `#/parcours` reconnu ; inconnu → accueil.
- Accueil (page 1) : pastilles présentes, clic → `sauver` avec le profil actif
  changé puis `naviguer({ nom: 'parcours' })` ; lien Parents ; avertissement.
- Parcours (page 2) : prénom et étoiles du profil actif, Continuer, grille,
  « Changer de joueur » → accueil ; tests existants de l'accueil (sélection,
  Continuer masqué, repli taille 1, clic niveau) migrés sur cette page.
- Jeu : « Retour » navigue vers `parcours` ; fin de série idem ; verrouillé →
  `parcours`.
- Pavé : ordre et nombre des touches (12), Valider en dernier avec
  `data-touche="valider"`, `0` et Valider portent une classe de largeur
  (`large`, `pleine`).
