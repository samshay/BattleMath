# BattleMath — Jeu de calcul mental CE2 — Document de conception

Date : 2026-11-11
Statut : validé le 2026-11-11

Ce document reprend le cahier des charges initial, corrigé après relecture.
Les choix marqués **[mon choix]** sont des décisions prises par le rédacteur
à défaut de consigne ; ils peuvent être renversés. Tout le reste vient du
cahier des charges d'origine.

---

## 1. Intention

Web app d'entraînement au calcul mental pour un enfant de CE2 (8-9 ans),
utilisée sur téléphone, avec un suivi de la progression (erreurs et
vitesse) consultable par le parent.

Pourquoi : automatiser les faits numériques et les techniques de calcul
mental par des séries courtes et répétées, avec un retour immédiat, sans
pression visible du temps, et donner au parent une vue honnête de ce qui
est acquis et de ce qui bloque.

### Objectifs
- L'enfant lance une série en deux appuis et la termine en 1 à 3 minutes.
- La progression est lisible par l'enfant (niveaux validés) et par le
  parent (erreurs, vitesse, calculs à revoir).
- Tout fonctionne hors ligne, sans compte ni serveur.

### Non-objectifs (v1)
Divisions, multi-profils, comptes et synchronisation, classements, sons.

### Anti-objectifs (ce qui ferait échouer le projet même s'il « marche »)
- Un enfant qui se sent chronométré ou puni par le temps.
- Un parent qui ne peut rien conclure des graphiques.
- Des niveaux impossibles à valider à cause d'un temps cible irréaliste ou
  d'un générateur incapable de produire une série correcte.
- Des données perdues (stockage effacé, changement de téléphone).

### Inspirations (ce qu'on reprend des jeux existants)
Tour d'horizon fait le 2026-11-11 : XtraMath, Rocket Math, Reflex,
Mathador Solo/Chrono, Calcul@TICE, Cap Maths. Ce qu'on reprend :
- **Mathador Solo, Calcul@TICE** : parcours de niveaux par compétence,
  chrono de plus en plus court. C'est déjà la structure du cahier des
  charges ; elle est confirmée.
- **XtraMath** : le seuil de rapidité est réglable (6 s / 3 s / 2 s) et
  l'éditeur recommande de commencer large. On adopte un **réglage de
  vitesse** côté parent (§ 4.4) plutôt que d'éditer la configuration.
- **XtraMath** : suivi fait par fait (chaque table) avec une grille des
  faits maîtrisés. On adopte un **état de maîtrise par fait** pour les
  parcours 1 chiffre et une grille dans l'écran Parents (§ 4.4, § 5.3).
- **XtraMath, Reflex** : les calculs proposés sont pondérés vers les
  faits faibles. On adopte une **pondération légère** : dans une série,
  jusqu'à 3 calculs sur 10 sont pris parmi les faits non maîtrisés du
  niveau, le reste au hasard (§ 2.2).
- **Rocket Math, XtraMath** : après une erreur, la bonne réponse est
  montrée et l'enfant la **retape** avant de continuer ; la correction
  est active, pas seulement lue. On adopte (§ 4.2).
- **Rocket Math** : progrès visible immédiatement (un dessin se dévoile
  à chaque palier). On reste sobre : étoiles par niveau et total
  d'étoiles sur l'accueil (§ 4.1).
- **Rocket Math, XtraMath** : sessions courtes (≤ 15 min), répétées
  chaque jour. Nos séries d'une à trois minutes vont dans ce sens ; on
  affiche les jours d'entraînement dans la synthèse parent.
- Un avertissement récurrent dans les avis : les exercices chronométrés
  renforcent l'anxiété de certains enfants. D'où : pas de chrono visible,
  réglage de vitesse, et l'état « réussi » qui reconnaît un 9/10 lent.

Ce qu'on ne reprend pas : le « compte est bon » de Mathador (autre
compétence), les récompenses lourdes de Reflex, les comptes en ligne.

---

## 2. Parcours et niveaux

### 2.1 Structure
- Opérations : additions, soustractions, multiplications, mixte.
- Tailles : 1 chiffre, 2 chiffres, 3 chiffres.
- Chaque couple (opération, taille) est un **parcours** indépendant
  (12 parcours) avec 8 niveaux numérotés 1 à 8.
- Seul le niveau 1 est ouvert au départ. Valider un niveau ouvre le
  suivant. Un niveau ouvert reste rejouable.
- Une série = 10 calculs.
- **[mon choix]** Les 3 parcours « 3 chiffres » (CM1-CM2 en calcul
  mental) sont masqués par défaut et activables dans l'écran Parents
  (réglage « parcours avancés »).

### 2.2 Règles de génération (communes)
- Jamais de résultat négatif.
- Pas deux fois le même calcul dans une série. Deux calculs sont « les
  mêmes » si leur clé normalisée est identique (voir 5.3 : pour + et ×,
  l'ordre des opérandes ne compte pas).
- **[mon choix]** Si le nombre de calculs distincts possibles à un niveau
  est inférieur à 10, les répétitions sont autorisées mais jamais deux
  fois de suite. Seul concerné : niveau 3 des additions 1 chiffre
  (compléments à 10, 9 calculs). Tous les autres niveaux ont été
  vérifiés par script : minimum 15 calculs distincts.
- Format à trou : un calcul porte un champ `inconnue` valant `resultat`
  (cas général) ou `b` (compléments). À l'écran, l'inconnue est un carré
  vide ; le pavé et la validation sont identiques. En « tout » des
  additions 1 chiffre, le type « compléments » est tiré comme les autres.
- Ordre des opérandes aléatoire à l'affichage pour + et ×.
- Le générateur est déterministe à partir d'une graine (seed) pour les
  tests.
- Plafonds de résultat : additions 2 chiffres → somme ≤ 99 à tous les
  niveaux ; additions 3 chiffres → somme ≤ 999 à tous les niveaux.
  Les multiplications peuvent dépasser (99 × 9 = 891, 249 × 5 = 1245) ;
  l'affichage et le pavé doivent accepter des réponses jusqu'à 4 chiffres.
- « Tout » = tirage uniforme parmi les types de calcul des niveaux 1 à 5
  du même parcours (chaque calcul choisit d'abord un type, puis un calcul
  de ce type).
- **Pondération vers les faits faibles [mon choix]** (parcours 1 chiffre
  uniquement) : avant de tirer au hasard, le générateur prend jusqu'à
  3 calculs parmi les faits du niveau non maîtrisés (§ 5.3) qui ont déjà
  été tentés, choisis au hasard parmi eux. Les 7 autres (ou 10 s'il n'y
  a pas de fait faible) sont tirés uniformément. Les contraintes du
  niveau s'appliquent aux deux groupes.

### 2.3 Définition des niveaux (temps cible en secondes)

Cette table est le contenu du fichier de configuration isolé
(`src/levels.ts`). Les notations : a, b opérandes ; u(x) chiffre des
unités, d(x) chiffre des dizaines, c(x) chiffre des centaines.

**Additions 1 chiffre** (a, b ∈ 1-9)
1. a, b ∈ 1-5 — 7 s
2. a ∈ 1-9, b ∈ 1-5, **somme ≤ 10** (corrigé : le niveau 2 d'origine
   contenait déjà des sommes > 10) — 7 s
3. compléments à 10, **format à trou [mon choix]** : « a + ▢ = 10 »
   ou « ▢ + a = 10 », a ∈ 1-9, réponse attendue 10 − a (9 calculs
   distincts : répétitions autorisées). Le relecteur a montré que la
   définition « somme ≤ 10 » donnait exactement le même pool que le
   niveau 2 ; le format à trou est l'exercice CE2 classique — 6 s
4. doubles (a = b) et presque-doubles (b = a + 1, a ∈ 1-8) — 6 s
5. somme > 10 : a, b ∈ 2-9, somme ≥ 11 — 6 s
6. tout — 5 s
7. tout — 4 s
8. tout — 3 s

**Soustractions 1 chiffre** (a − b, résultat entre 0 et 9)
1. a ∈ 1-5, b ∈ 1-a — 7 s
2. a ∈ 1-9, b ∈ 1-a — 7 s
3. passer par 10 **[mon choix]** : a ∈ 10-12, b ∈ 1-9, résultat ≤ 9
   (24 calculs ; le cahier des charges disait « 10 − b », soit une série
   entière de 10 moins quelque chose avec 9 calculs possibles) — 6 s
4. a ∈ 13-16, b ∈ 4-9, résultat ≤ 9 (donc b ≥ a − 9) — 6 s
5. a ∈ 11-18, b ∈ 2-9, résultat ≤ 9 — 6 s
6. tout — 5 s
7. tout — 4 s
8. tout — 3 s

**Multiplications 1 chiffre** (a × b, a dans la ou les tables du niveau,
b ∈ 1-9)
1. tables 1 et 2 — 7 s
2. tables 2 et 5 — 7 s
3. tables 3 et 4 — 7 s
4. tables 2 à 5 — 6 s
5. tables 6 et 7 — 7 s
6. tables 8 et 9 — 7 s
7. tables 2 à 9 — 5 s
8. tables 2 à 9 — 4 s

**Additions 2 chiffres** (somme ≤ 99 partout)
1. a ∈ 10-99, b ∈ 1-9, sans retenue (u(a) + b ≤ 9) — 9 s
2. a ∈ 10-99, b ∈ 1-9, avec retenue (u(a) + b ≥ 10) — 9 s
3. a ∈ 11-99 non multiple de 10, b ∈ {10, 20, …, 90} — 9 s
4. a, b ∈ 10-99, sans retenue (u(a) + u(b) ≤ 9) — 11 s
5. a, b ∈ 10-99, avec retenue (u(a) + u(b) ≥ 10) — 13 s
6. tout — 13 s
7. tout — 10 s
8. tout — 8 s

**Soustractions 2 chiffres** (a − b, résultat ≥ 0)
1. a ∈ 10-99, b ∈ 1-9, sans retenue (u(a) ≥ b) — 9 s
2. a ∈ 10-99, b ∈ 1-9, avec retenue (u(a) < b) — 10 s
3. a ∈ 11-99 non multiple de 10, b ∈ {10, 20, …, 90}, b < a — 9 s
4. a, b ∈ 10-99, sans retenue (u(a) ≥ u(b)), b ≤ a — 11 s
5. a, b ∈ 10-99, avec retenue (u(a) < u(b)), b < a — 14 s
6. tout — 13 s
7. tout — 10 s
8. tout — 8 s

**Multiplications 2 chiffres**
1. a ∈ 2-20, × 10 (élargi : 1-9 × 10 ne donnait que 9 calculs) — 7 s
2. a ∈ {10, 20, …, 90}, b ∈ 2-5 — 9 s
3. a ∈ 11-49, × 2 — 10 s
4. a ∈ 11-49, b ∈ 2-4, sans retenue (u(a) × b ≤ 9 et d(a) × b ≤ 9) — 11 s
5. a ∈ 11-19, b ∈ 2-5 — 13 s
6. a ∈ 11-29, b ∈ 2-6 — 14 s
7. a ∈ 11-49, b ∈ 2-9 — 15 s
8. a ∈ 11-99, b ∈ 2-9 — 15 s

**Additions 3 chiffres** (somme ≤ 999 partout)
1. a, b ∈ {100, 200, …, 900} — 8 s
2. a ∈ 100-999, b ∈ 1-9, sans retenue (u(a) + b ≤ 9) — 9 s
3. a ∈ 100-999, b ∈ {10, 20, …, 90} (avec ou sans retenue) — 10 s
4. a ∈ 100-999, b ∈ {100, 200, …, 900} — 9 s
5. a ∈ 100-999, b ∈ 10-99, sans retenue (u(a) + u(b) ≤ 9 et
   d(a) + d(b) ≤ 9) — 12 s
6. a ∈ 100-999, b ∈ 10-99, avec au moins une retenue — 15 s
7. a, b ∈ 100-999, sans retenue sur aucun rang — 15 s
8. a, b ∈ 100-999, tout — 18 s

**Soustractions 3 chiffres** (a − b, résultat ≥ 0)
1. a, b ∈ {100, 200, …, 900}, b ≤ a — 8 s
2. a ∈ 100-999, b ∈ 1-9, sans retenue (u(a) ≥ b) — 9 s
3. a ∈ 100-999, b ∈ {10, 20, …, 90}, b ≤ a (avec ou sans retenue) — 10 s
4. a ∈ 100-999, b ∈ {100, 200, …, 900}, b ≤ a — 9 s
5. a ∈ 100-999, b ∈ 10-99, sans retenue (u(a) ≥ u(b) et d(a) ≥ d(b)) — 12 s
6. a ∈ 100-999, b ∈ 10-99, avec au moins une retenue, b ≤ a — 15 s
7. a, b ∈ 100-999, sans retenue sur aucun rang, b ≤ a — 15 s
8. a, b ∈ 100-999, tout, b ≤ a — 18 s

**Multiplications 3 chiffres**
1. a ∈ 2-20, × 100 — 7 s
2. a ∈ {100, 200, …, 900}, b ∈ 2-5 — 9 s
3. a ∈ {100, 200, …, 900}, b ∈ 2-9 — 9 s
4. a ∈ 100-999 dont tous les chiffres ≤ 4, × 2 (sans retenue) — 11 s
5. a ∈ 100-999, × 2 — 13 s
6. a ∈ 100-999 dont tous les chiffres ≤ 3, × 3 (sans retenue) — 12 s
7. a ∈ {110, 120, …, 490}, b ∈ 2-5 — 14 s
8. a ∈ 101-249, b ∈ 2-5 — 18 s

**Mixte** (une par taille)
- Au niveau N, chaque calcul est tiré parmi les trois opérations au
  niveau N de la même taille.
- **[mon choix]** Au moins 2 calculs de chaque opération par série, les
  4 restants tirés au hasard.
- Temps cible = le plus long des trois temps cibles du niveau N.
- Le mixte 3 chiffres suit le réglage « parcours avancés ».

---

## 3. Règle de validation

- Temps d'un calcul : de l'affichage du calcul à l'appui sur Valider.
- **Temps de série = médiane des 10 temps** (corrigé : la moyenne faisait
  échouer une série sur une seule hésitation longue). Les réponses fausses
  comptent dans la médiane.
- Série **réussie** : au moins 9 bonnes réponses sur 10.
- Série **validée** : réussie ET médiane ≤ temps cible du niveau.
- Un niveau est **validé** dès qu'une série validée existe pour ce niveau.
  Il est **réussi** si une série réussie existe mais aucune validée.
- Seule la validation débloque le niveau suivant. L'état « réussi » est
  affiché (une étoile sur deux) pour reconnaître le progrès.
- Les temps cibles sont des estimations. Ils seront calibrés après
  quelques sessions réelles à partir de l'écran Parents ; la configuration
  isolée rend l'ajustement trivial.

### Interruptions **[mon choix]**
- Si la page perd le focus pendant un calcul (verrouillage, notification,
  changement d'app), ce calcul est annulé : il n'est pas compté et un
  nouveau calcul du même type est tiré au retour. La pastille concernée
  reste en attente.
- Quitter l'écran de jeu avant la fin (bouton Accueil, retour navigateur)
  abandonne la série ; rien n'est enregistré.

---

## 4. Interface (tactile, téléphone en portrait)

Ton encourageant, textes courts, lisibles par un enfant de 8 ans.
Mode sombre géré (préférence système). Pas de zoom au double-tap, pas de
sélection de texte, pas de clavier système : le pavé est dans la page.

### 4.1 Accueil
- En haut : bouton **Continuer** **[mon choix]** qui ouvre directement
  le prochain niveau non validé du dernier parcours joué (masqué tant
  qu'aucune série n'a été jouée).
- Choix de l'opération (4 boutons) et de la taille (2 ou 3 boutons selon
  le réglage « parcours avancés »).
- Grille des 8 niveaux du parcours choisi. États : verrouillé, ouvert,
  réussi (1 étoile), validé (2 étoiles).
- Total d'étoiles gagnées, en haut, pour rendre le progrès visible
  (inspiré de Rocket Math, en plus sobre).
- Lien discret **Parents** en bas.

### 4.2 Écran de jeu
- Bandeau : 10 pastilles d'avancement (vide, juste, faux, en cours).
  Sous le bandeau, en petit : « Objectif : moins de 6 secondes par
  calcul » **[mon choix]**, pour que « trop lent » ne soit jamais une
  surprise. Aucun chrono visible.
- Calcul en très grand, réponse en grand dessous.
- Pavé : 0-9, Effacer, Valider, en grille 3 × 4, touches ≥ 56 px,
  utilisables au pouce. Valider inactif tant que la réponse est vide.
  Réponse limitée à 4 chiffres.
- Juste : court retour visuel (≈ 250 ms : réponse et bouton Valider en
  vert, bouton enfoncé) puis calcul suivant. Tous les boutons ont un état
  enfoncé immédiat (`:active`) pour que l'appui réponde sous le doigt.
- Faux : la réponse de l'enfant est barrée, la bonne réponse s'affiche
  en grisé dans la zone de réponse, et l'enfant doit la **retaper** puis
  Valider pour passer au suivant (inspiré de XtraMath et Rocket Math).
  Cette recopie n'est ni chronométrée ni comptée. Le calcul reste compté
  faux.
- Bouton Accueil discret (abandon de série, voir § 3).

### 4.3 Fin de série
- Score sur 10 et temps médian comparé au temps cible, en mots simples.
- Verdict et raison :
  - validé : « Niveau validé ! »
  - réussi mais lent : « Bravo, presque ! Un peu plus vite la prochaine
    fois (objectif 6 s, toi 7,5 s). »
  - trop d'erreurs : « Il faut 9 bonnes réponses. Encore un essai ? »
- Boutons : Rejouer, Niveau suivant (si débloqué), Accueil.

### 4.4 Écran Parents
- **Réglage de vitesse [mon choix, inspiré de XtraMath]** : Tranquille
  (temps cibles × 1,5), Normal (× 1), Rapide (× 0,75). Normal par défaut.
  Le temps cible effectif est copié dans chaque série ; changer le
  réglage ne réécrit pas l'historique.
- **Verrou parent** **[mon choix]** : un calcul tiré au hasard du type
  a ∈ 21-49 × b ∈ 6-9 à résoudre pour entrer (hors de portée d'un CE2 de
  tête, trivial pour un adulte). Le verrou reste ouvert le temps de la
  session.
- Filtre par parcours (par défaut : dernier joué).
- Graphique 1 : taux de réussite par série, ordre chronologique.
- Graphique 2 : temps médian par série, avec la ligne du temps cible du
  niveau joué.
- Chaque point indique le niveau joué et s'il a été validé (forme ou
  couleur distincte).
- Synthèse : niveau atteint par parcours, nombre de séries, nombre de
  calculs, jours d'entraînement distincts.
- Calculs à revoir :
  - parcours 1 chiffre : faits tentés au moins 3 fois, triés par taux
    d'erreur puis par temps moyen (ex. « 7 × 8 : 3 erreurs sur 5,
    6,2 s en moyenne »). 7 × 8 et 8 × 7 sont le même fait.
  - **Grille des faits [mon choix, inspiré de XtraMath]** : pour les
    parcours 1 chiffre, une grille colorée par état (jamais vu, en
    cours, maîtrisé). Additions et multiplications : 9 × 9 (a, b ∈ 1-9,
    moitié supérieure seulement puisque la clé est non ordonnée).
    Soustractions : les faits ont a ∈ 1-18, donc la grille est
    résultat (0-9) × b (1-9), soit 90 cases qui couvrent tous les faits.
  - parcours 2 et 3 chiffres **[mon choix]** : les calculs ne se
    répètent pas, on affiche les niveaux à retravailler (taux d'erreur et
    temps médian par niveau sur les 10 dernières séries).
- Réglages : parcours avancés (3 chiffres) ; export ; import ; remise à
  zéro avec confirmation.

---

## 5. Données

### 5.1 Stockage
- localStorage, aucun compte, aucun serveur.
- Un seul objet JSON versionné (`version: 1`). Toute évolution de schéma
  passe par une fonction de migration.

### 5.2 Modèle
```
{
  version: 1,
  reglages: { parcoursAvances: boolean, vitesse: "tranquille" | "normal" | "rapide" },
  dernierParcours: "add-2" | null,
  series: [
    {
      date: "2026-11-11T17:32:10Z",
      parcours: "mul-1",         // op-taille : add|sub|mul|mix, 1|2|3
      niveau: 4,
      bonnes: 9,                 // 0-10
      tempsMedian: 4800,         // ms
      tempsTotal: 48000,         // ms, somme des 10 temps (optionnel : absent des anciennes séries) ; sert au record
      tempsCible: 6000,          // ms, copié au moment de la série
      reussie: true,
      validee: true
    }
  ],
  faits: {
    "mul:7x8": {
      tentatives: 5, erreurs: 3, tempsCumule: 31000,
      derniers: [{ juste: true, temps: 3100 }, { juste: false, temps: 8200 }]
    }
  }
}
```
- L'état des niveaux (ouvert, réussi, validé) est dérivé des séries, pas
  stocké.
- Le temps cible est copié dans la série pour que le graphique reste juste
  si la configuration change ensuite.

### 5.3 Clé de fait
- `op:a·b` avec `op` ∈ add, sub, mul.
- Pour add et mul, a ≤ b (opérandes triés). Pour sub, ordre réel.
- Mise à jour à chaque réponse en mémoire : tentatives + 1, erreurs + 1
  si faux, tempsCumule + temps du calcul. **Écriture en localStorage
  uniquement en fin de série**, avec la série elle-même ; une série
  abandonnée ne modifie donc ni les séries ni les faits. Les calculs
  annulés (interruption) ne comptent pas.
- **Maîtrise [mon choix]** : on garde aussi les 3 derniers résultats du
  fait (`derniers: [{ juste: true, temps: 3100 }, …]`). Un fait est
  **maîtrisé** si ses 3 derniers essais sont justes et chacun sous le
  **seuil de maîtrise** du parcours : 5 s pour les additions et
  soustractions 1 chiffre, 5 s pour les multiplications (temps cible du
  premier niveau « tout », niveaux 6 et 7 respectivement). Les faits de
  la table de 1 utilisent le même seuil. Il est **en cours** sinon.
  Le seuil est **brut** : le réglage de vitesse (§ 4.4) ne le modifie
  pas, la maîtrise mesure une fluidité réelle. En réglage Tranquille, un
  niveau peut donc être validé avec des faits encore « en cours » ;
  c'est voulu, la pondération continue de les proposer.
  Cet état sert à la pondération (§ 2.2) et à la grille (§ 4.4).
- Les faits ne sont enregistrés que pour les parcours 1 chiffre (add-1,
  sub-1, mul-1, mix-1). Pour les compléments à trou, la clé est celle de
  l'addition sous-jacente (`add:3·7` pour « 3 + ▢ = 10 »).

### 5.4 Export / import
- Export : fichier JSON `battlemath-AAAA-MM-JJ.json`. Sur mobile,
  Web Share API avec le fichier (feuille de partage native) ; repli sur un
  téléchargement classique.
- Import : sélection de fichier, vérification de `version`, migration si
  besoin, **remplacement** complet après confirmation.

### 5.5 Risque connu
Safari iOS peut effacer le stockage d'un site après 7 jours sans visite si
l'app n'est pas installée sur l'écran d'accueil. L'app affiche donc au
premier lancement une invitation à l'installer (instructions iOS :
Partager → Sur l'écran d'accueil ; Android : invite native).

---

## 6. Technique

- Site statique, mobile-first, PWA installable et hors ligne.
- Vite + TypeScript, sans framework. Routage interne minimal (3 écrans).
- PWA via `vite-plugin-pwa`, `registerType: 'autoUpdate'` pour que les
  ajustements de configuration arrivent sur le téléphone de l'enfant sans
  action.
- Graphiques en SVG maison.
- Générateur aléatoire à graine (ex. mulberry32) injecté dans les
  générateurs.
- Tests : vitest.
  - Pour chaque niveau de chaque parcours : générer plusieurs milliers de
    séries avec des graines variées et vérifier toutes les contraintes
    (plages, retenue, plafonds, résultat ≥ 0, unicité ou règle de
    répétition, présence des 3 opérations en mixte, format à trou au
    niveau 3 des additions 1 chiffre).
  - Règle de validation (médiane, seuils, cas limites 9/10 et égalité au
    temps cible).
  - Normalisation des clés de faits, règle de maîtrise, pondération
    (une série ne contient jamais plus de 3 calculs issus des faits
    faibles, et les contraintes du niveau restent respectées).
  - Migration de schéma et import de fichiers invalides.
- Hébergement (décidé) : GitHub Pages en page de projet
  (`https://<user>.github.io/BattleMath/`), déploiement automatique par
  GitHub Actions à chaque push sur `main`. Conséquences : `base` de Vite,
  `start_url` et `scope` du manifest et portée du service worker fixés
  sur `/BattleMath/`. Le dossier devient un dépôt git.

---

## 7. Laissé au constructeur
- Palette, typographie, animations de retour (dans les contraintes :
  lisibilité enfant, mode sombre, touches ≥ 56 px).
- Organisation du code au-delà de la séparation levels / générateurs /
  validation / stockage / écrans.
- Forme exacte des graphiques SVG, tant que les deux graphiques et leurs
  annotations décrites en 4.4 sont présents.
- Libellés précis des messages, dans le ton décrit.
