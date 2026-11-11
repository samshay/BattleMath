# BattleMath — Profils (2 enfants) — Document de conception

Date : 2026-11-11
Statut : brouillon soumis à validation
Dépend de : `2026-11-11-calcul-mental-design.md` (v1, implémentée)

## 1. Intention

Permettre à deux enfants (ou plus) de jouer sur le même téléphone, chacun
avec sa progression, ses réglages et ses statistiques, sans compte ni
serveur. Demande de l'utilisateur le 2026-11-11, hors périmètre v1.

### Objectifs
- L'enfant choisit son profil en un appui sur l'accueil et joue.
- Le parent crée, renomme, colore et supprime les profils depuis l'écran
  Parents, et consulte les statistiques de chaque enfant.
- Les données existantes (v1) sont conservées dans un premier profil.

### Non-objectifs
- Comptes, synchronisation, mot de passe par profil, photos/avatars.
- Partage d'un seul profil entre téléphones (l'export reste global).

## 2. Comportement

### 2.1 Accueil (enfant)
- En haut, une rangée de **pastilles de profil** : prénom + couleur
  (`button.profil[data-id]`, la pastille active a la classe `actif`).
  Appuyer sur une pastille change le profil actif et re-rend l'accueil
  (étoiles, Continuer, états des niveaux sont ceux du profil actif).
- S'il n'y a qu'un profil, la rangée est quand même affichée (une
  pastille), pour que l'enfant voie qui joue.
- Aucune saisie de texte sur l'accueil : la création se fait côté parent.
- **[mon choix]** Au plus 4 profils.

### 2.2 Écran Parents
- Nouvelle section **Profils**, après « Réglages » : liste des profils
  avec prénom (champ texte, 1 à 12 caractères), couleur (6 couleurs au
  choix, `button.couleur[data-couleur]`), bouton « Supprimer » (confirmation
  « Supprimer le profil X et toute sa progression ? », impossible s'il ne
  reste qu'un profil), bouton « Ajouter un profil » (prénom par défaut
  « Enfant 2 », couleur suivante libre ; désactivé à 4 profils).
- Le sélecteur de parcours et toutes les statistiques (graphiques,
  synthèse, à revoir, grille) portent sur le **profil consulté** : une
  rangée de pastilles identique à l'accueil est affichée en tête de
  « Progression », initialisée sur le profil actif ; la changer ici ne
  change pas le profil actif de l'enfant **[mon choix]**.
- Les réglages (vitesse, parcours avancés) sont **par profil**
  **[mon choix]** : un enfant peut être en Tranquille et l'autre en Normal.
- Remise à zéro : efface la progression du profil consulté seulement
  (séries, faits, dernier parcours), garde le profil et ses réglages.
  Message : « Effacer toute la progression de X ? Cette action est
  définitive. »
- Export / import : fichier global, tous profils (inchangé dans l'esprit ;
  l'import remplace tout après confirmation).

### 2.3 Jeu
- Inchangé. Les séries et faits sont enregistrés dans le profil actif.
- La reprise « Continuer » est celle du profil actif.

### 2.4 Couleurs
`bleu #3b5bdb`, `vert #2f9e44`, `orange #e8590c`, `violet #7048e8`,
`rose #d6336c`, `turquoise #0c8599`. Même valeur en clair et en sombre ;
la pastille affiche un disque de couleur plus le prénom en texte normal.

## 3. Données

### 3.1 Schéma version 2
```
{
  version: 2,
  profilActif: "p1",
  profils: [
    {
      id: "p1",                 // 'p' + compteur, unique dans le fichier
      prenom: "Léa",
      couleur: "bleu",
      reglages: { parcoursAvances: false, vitesse: "normal" },
      dernierParcours: "add-1" | null,
      series: [ … ],            // comme v1
      faits: { … }              // comme v1
    }
  ]
}
```
- `profils` contient 1 à 4 éléments ; `profilActif` référence un id existant.
- Clé localStorage inchangée (`battlemath.v1`), seule `version` change.

### 3.2 Migration v1 → v2
- `migrer` accepte `version: 1` et produit la v2 : un profil
  `{ id: 'p1', prenom: 'Enfant', couleur: 'bleu', reglages, dernierParcours,
  series, faits }` repris tels quels, `profilActif: 'p1'`.
- L'import d'un fichier v1 passe par la même migration.
- Validation v2 : chaque profil validé comme une v1 (séries, faits,
  réglages) plus `id` (string non vide, unique), `prenom` (1-12 caractères),
  `couleur` parmi les 6.

### 3.3 API du store (évolution)
- `profilActif(d): Profil` ; `donneesProfil(d, id)`.
- `enregistrerSerie(d, serie, faits)` écrit dans le profil actif.
- `majProfil(d, id, patch)`, `ajouterProfil(d, prenom)`, `supprimerProfil(d, id)`,
  `choisirProfil(d, id)`, `reinitialiserProfil(d, id)` : fonctions pures.
- L'ancien `Donnees` v1 disparaît ; `ContexteApp.donnees` est la v2 et
  les écrans lisent le profil via `profilActif(ctx.donnees)`.

## 4. Tests
- Migration v1 → v2 (données réelles d'une v1 avec séries et faits),
  fichiers v2 valides/invalides (id dupliqué, 5 profils, couleur inconnue,
  `profilActif` orphelin).
- Fonctions pures du store (ajout jusqu'à 4, suppression interdite du
  dernier, suppression du profil actif → l'actif devient le premier
  restant, reset d'un profil ne touche pas les autres).
- Accueil : pastilles, changement de profil, étoiles et niveaux du bon
  profil.
- Parents : section Profils (renommer, couleur, ajouter, supprimer avec
  confirmation), statistiques du profil consulté, reset ciblé.
- Jeu : la série est enregistrée dans le profil actif.

## 5. Laissé au constructeur
- Forme exacte des pastilles et de la section Profils.
- Libellés, dans le ton de la v1.

## 6. Décisions après relecture constructeur **[mes choix]**

- **`donneesVides()`** garde son nom et renvoie une v2 avec un profil
  `{ id: 'p1', prenom: 'Enfant', couleur: 'bleu', … vide }` et
  `profilActif: 'p1'`. C'est aussi ce que `charger` renvoie sur stockage
  indisponible ou corrompu (comportement v1 conservé).
- **Type `Donnees`** reste le nom du type courant (forme v2). Un type interne
  `DonneesV1` sert à la migration. `VERSION = 2` ; `migrer` accepte 1 et 2,
  rejette > 2 (`version_inconnue`), tout le reste `structure_invalide`.
  Les signatures de `charger`, `sauver`, `exporterJson`, `importerJson`,
  `reinitialiser` sont inchangées (elles manipulent la v2). Les tests
  existants qui construisent des v1 plates sont réécrits sur la v2.
- **Remise à zéro** : deux boutons dans Parents. « Effacer la progression
  de X » (profil consulté, garde le profil et ses réglages) et, en bas de
  la section Profils, « Tout effacer » (tous les profils, retour à
  `donneesVides()`, via `reinitialiser(stockage)` existant). Chacun avec sa
  confirmation.
- **Accueil, changement de profil** : `ctx.selection` est réinitialisée
  depuis le `dernierParcours` du nouveau profil (ou `add-1`) ; si la
  taille n'est pas visible pour ce profil (3 chiffres masqués), repli sur
  `{ op, taille: 1 }`. « Continuer » est masqué si le `dernierParcours`
  est un parcours avancé masqué.
- **Parents, profil consulté** : état local de l'écran, initialisé sur le
  profil actif. La rangée de pastilles est placée sous le titre, et TOUT
  le reste de l'écran (Progression, Synthèse, À revoir, Réglages, Effacer
  la progression) porte sur le profil consulté. La section « Profils »
  (gestion) vient en dernier. Après suppression du profil consulté ou
  après import, le profil consulté redevient le profil actif (ou le
  premier). La variable de parcours sélectionné est réinitialisée au
  changement de profil consulté.
- **Profil actif** : seul l'accueil appelle `choisirProfil`. Supprimer le
  profil actif depuis Parents est permis : l'actif devient le premier
  restant.
- **Jeu** : « inchangé » fonctionnellement, mais toutes les lectures de
  `ctx.donnees` (faits, reglages.vitesse, series pour `etatNiveau`,
  `enregistrerSerie`) passent par `profilActif(ctx.donnees)` ; le plan les
  liste.
- **Identifiants** : `'p' + (max des suffixes numériques existants + 1)`.
  Prénom par défaut « Enfant N » avec le même N. Les prénoms ne sont pas
  obligatoirement uniques.
- **Prénom** : validé après `trim`, 1 à 12 caractères ; `majProfil` avec
  un prénom invalide renvoie `d` inchangé, et le champ est rétabli à la
  perte du focus.
- **Sélecteur de parcours Parents** : règle v1 conservée (parcours visibles
  du profil consulté ∪ parcours ayant des séries).
