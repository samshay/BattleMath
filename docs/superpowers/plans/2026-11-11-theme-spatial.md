# BattleMath — Thème spatial — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habiller les écrans existants dans l'univers « espace » des maquettes (thème sombre unique, polices Fredoka/Nunito auto-hébergées, icônes SVG, mascottes décoratives) sans changer une règle de jeu, une route, un texte ni un `data-test`.

**Architecture:** Les valeurs visuelles vivent dans `:root` de `src/style.css` (variables de `docs/design/tokens.css`) et dans `COULEURS`. Un module `src/ui/icones.ts` importe les SVG en chaîne (`?raw`) et renvoie des éléments `aria-hidden`. Les écrans gardent leur structure et leurs tests ; les glyphes `★ ✨ ⌫` deviennent des icônes, les libellés restent du texte (visible ou `.sr-only`). Les polices sont des paquets `@fontsource` importés dans `src/main.ts` et mises en cache par le service worker existant.

**Tech Stack:** inchangé (Vite + TypeScript, vitest, happy-dom) + `@fontsource/fredoka@5.3.0`, `@fontsource/nunito@5.3.0`.

**Spec:** `docs/superpowers/specs/2026-11-11-theme-spatial-design.md` (habillage) ; comportement et textes : `2026-11-11-calcul-mental-design.md`, `2026-11-11-profils-design.md`, `2026-11-11-accueil-pave-design.md`, `2026-11-11-record-design.md`. Maquettes : `docs/design/maquettes/*.html` (aspect seulement).

## Comparaison maquettes / écrans actuels

| Écran | Aujourd'hui | Maquette (ce qui change) |
| --- | --- | --- |
| Accueil | `header` (h1 + engrenage), h2, profils en colonne 64 px, bordure 3 px `--bord` | h1 34 px Fredoka, bouton Parents rond 56 px avec `parents.svg`, **illustration décorative** (planète, vaisseau, alien, étoiles), h2 28 px, profils 72 px / rayon 24 / pastille 32 px, actif = bordure 3 px `--primaire` |
| Parcours | `★ N` texte, lien « Changer de joueur », Continuer sur une ligne (fond plein), opérations `.actif` = fond plein, tuiles « Niveau N » + `★`/`★★` + « Record 38,2 s » | `etoile.svg` + N en `--etoile`, lien avec `joueur.svg`, Continuer **deux lignes** + `continuer.svg`, opérations avec **pastille ronde colorée** + `op-*.svg`, sélection = **bordure 3 px** de la couleur, tailles 56 px, tuiles 84 px : numéro en grand, cadenas pour verrouillé, étoiles SVG 14 px, record en `--texte-doux` |
| Jeu | `.entete` = pastilles, joueur, objectif, **bouton Retour en dessous** ; calcul 3 rem ; réponse texte nu ; pavé 64 px, `⌫` | **Ligne du haut** : Retour (icône + texte) à gauche, **mascotte** 52 px à droite ; pastilles 14 px (à venir = contour) ; calcul 68 px Fredoka ; réponse = carte `--surface` bordure 2 px `--primaire` 76 px ; pavé rayon 20, `effacer.svg`, Valider fond `--succes` |
| Fin | score, temps, temps série, verdict, record, Rejouer (principal), Niveau suivant (principal), Retour | **vaisseau** décoratif en haut, score 64 px, verdict en `--succes`, **deux étoiles SVG** (une si réussi sans le temps), temps, temps série, record = encadré bordure `--succes` + `etincelle.svg`, **Niveau suivant principal puis Rejouer secondaire**, Retour en lien discret |

Points où la maquette diverge du code et où **le code reste l'autorité** (pas de changement) : tuiles de niveau, Retour et Rejouer restent des `<button>` (la maquette utilise des `<a>`) ; le texte de Continuer reste « Continuer » + `${nomParcours} niveau ${n}` (sans virgule) ; les textes de fin sont inchangés.

**Décisions à valider par l'utilisateur avant d'implémenter** (non tranchées par la spec) :
1. **Ordre des boutons de fin** : la spec v1 (§ fin de série) dit « Rejouer, Niveau suivant, Accueil » et le code suit cet ordre ; la maquette place **Niveau suivant avant Rejouer**. Le plan suit la maquette (le principal en premier). Dire si l'ordre v1 doit être conservé.
2. **Ordre verdict / temps sur l'écran de fin** : le code affiche temps puis verdict ; la maquette affiche verdict, étoiles, puis temps. Le plan suit la maquette (textes identiques, seul l'ordre change).
3. **Thème unique** : la spec v1 (§ 263) prévoyait « Mode sombre géré (préférence système) » et la spec profils (§ 62) liste les anciennes valeurs de couleurs. La nouvelle spec les remplace explicitement ; les anciennes specs ne sont pas modifiées (documents datés).

## Global Constraints

- Aucune modification dans `src/core/`, `src/game/`, ni dans `src/storage/` hors les valeurs de `COULEURS` (mêmes 6 clés).
- Écrans enfant : aucun `<input>`, aucun chrono visible, touches ≥ 56 px. Tous les `data-test` existants conservés.
- Thème unique : plus aucun `prefers-color-scheme` dans `src/style.css` ni `index.html`. Aucune couleur en dur hors `:root` et `COULEURS`.
- Variables (valeurs exactes de `docs/design/tokens.css`) : `--fond #0B1026`, `--texte #EEF1FF`, `--primaire #4FD8EB`, `--surface #161E44`, `--succes #5EE6A0`, `--erreur #FF7A7A`, `--bord #2A3570`, `--texte-doux #A9B4E0`, `--sur-accent #0B1026`, `--op-add #4FD8EB`, `--op-sub #FFB547`, `--op-mul #FF6FB1`, `--op-mix #A78BFA`, `--etoile #FFB547`, `--police-titre 'Fredoka', system-ui, sans-serif`, `--police-texte 'Nunito', system-ui, sans-serif`, `--rayon 20px`, `--rayon-grand 24px`.
- `COULEURS` : `bleu #6C8CFF`, `vert #5EE6A0`, `orange #FF9F45`, `violet #A78BFA`, `rose #FF6FB1`, `turquoise #4FD8EB`.
- Polices : `@fontsource/fredoka` (600, 700) et `@fontsource/nunito` (700, 800), sous-ensemble latin (`latin-600.css`…), importées dans `src/main.ts`. Aucun appel à Google Fonts.
- Plus aucun `★`, `✨`, `⌫` dans `src/ui/`. Les textes lus par les tests restent du texte (`.sr-only` si masqué).
- Icônes/mascottes : `aria-hidden="true"` ; l'accessibilité passe par le texte, `aria-label` ou `role="img"`.
- Commits sur la branche `theme-spatial` (jamais de push sur `main` avant relecture), message en français, terminé par `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Écran de 320 px de large** : 4 tuiles de 84 px + 3 espaces de 10 px = 366 px ne tiennent pas dans 320 − 32 px ; les tuiles doivent être en `minmax(0, 1fr)` avec `aspect-ratio` plutôt qu'en largeur fixe (tâche 5, vérification visuelle en tâche 10).
2. **Prénom de 12 caractères** à côté du total d'étoiles dans l'en-tête Parcours : pas de retour à la ligne cassé (`min-width: 0`, `overflow: hidden; text-overflow: ellipsis` sur le prénom ; tâche 5, visuel en tâche 10).
3. **Données existantes** : les clés de `COULEURS` ne bougent pas, sinon `migrer` rejette les profils enregistrés (test en tâche 3).
4. **Hors ligne** : les `woff2` doivent figurer dans le précache du service worker, sinon la police système apparaît après installation (vérification sur `dist/sw.js` en tâche 10).
5. **`prefers-reduced-motion: reduce`** : l'éclat et l'étincelle n'ont d'animation que dans le bloc `no-preference` existant (tâche 8).

---

## Structure des fichiers

```
src/style.css                 # Modifier : :root unique, polices, nouvelles classes par écran
src/main.ts                   # Modifier : imports @fontsource
index.html                    # Modifier : une seule balise theme-color
vite.config.ts                # Modifier : background_color / theme_color
package.json                  # Modifier : dependencies @fontsource/*
src/ui/icones.ts              # Créer : icone(nom, taille), illustration(nom, taille)
src/storage/schema.ts         # Modifier : valeurs de COULEURS
src/ui/accueil.ts             # Modifier : icône Parents, décor
src/ui/parcours.ts            # Modifier : en-tête, Continuer, opérations, tuiles
src/ui/pave.ts                # Modifier : touche Effacer
src/ui/jeu.ts                 # Modifier : barre du haut + mascotte, fin de série
tests/ui/theme.test.ts        # Créer : critères globaux lus dans les fichiers
tests/ui/icones.test.ts       # Créer
tests/storage/schema.test.ts  # Modifier : valeurs de COULEURS
tests/ui/accueil.test.ts, parcours.test.ts, pave.test.ts, jeu.test.ts  # Modifier
```

---

### Task 1 : Thème unique, variables, polices, PWA

**Files:**
- Modify: `src/style.css` (`:root` l. 1-20, bloc `@media (prefers-color-scheme: dark)` l. 123-126, couleurs en dur l. 66, 67, 91, 94, 101, 121-122)
- Modify: `src/main.ts:1`, `index.html:11-12`, `vite.config.ts:19-20`, `package.json`
- Test: `tests/ui/theme.test.ts`

**Interfaces:**
- Produces : les variables CSS listées dans Global Constraints, plus `--fait-en-cours: rgba(255, 181, 71, 0.35)` et `--fait-maitrise: rgba(94, 230, 160, 0.35)` (grille des faits). Classe utilitaire `.sr-only` inchangée.

- [ ] **Step 1 : écrire le test des critères globaux** (environnement node, lecture par `node:fs`)

```ts
// tests/ui/theme.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const lire = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

describe('thème spatial', () => {
  it('thème unique : plus de prefers-color-scheme', () => {
    expect(lire('src/style.css')).not.toContain('prefers-color-scheme')
    expect(lire('index.html')).not.toContain('prefers-color-scheme')
  })
  it('index.html : une seule theme-color, #0B1026', () => {
    const html = lire('index.html')
    expect(html.match(/name="theme-color"/g)).toHaveLength(1)
    expect(html).toContain('content="#0B1026"')
  })
  it('manifeste : fond et theme_color #0B1026', () => {
    const cfg = lire('vite.config.ts')
    expect(cfg).toContain("background_color: '#0B1026'")
    expect(cfg).toContain("theme_color: '#0B1026'")
  })
  it('aucune couleur en dur hors :root', () => {
    const css = lire('src/style.css')
    const horsRoot = css.replace(/:root\s*\{[^}]*\}/, '')
    expect(horsRoot).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(horsRoot).not.toMatch(/rgba?\(/)
  })
  it('polices auto-hébergées importées dans main.ts', () => {
    const main = lire('src/main.ts')
    for (const f of ['@fontsource/fredoka/latin-600.css', '@fontsource/fredoka/latin-700.css', '@fontsource/nunito/latin-700.css', '@fontsource/nunito/latin-800.css']) {
      expect(main).toContain(`import '${f}'`)
    }
    expect(lire('src/style.css')).not.toContain('fonts.googleapis')
  })
})
```

- [ ] **Step 2 : lancer, vérifier l'échec** — `npx vitest run tests/ui/theme.test.ts` : 5 échecs.

- [ ] **Step 3 : installer les polices** — `npm install @fontsource/fredoka@5.3.0 @fontsource/nunito@5.3.0` (dans `dependencies`). Ajouter les quatre imports en tête de `src/main.ts`, après `import './style.css'`.

- [ ] **Step 4 : réécrire `:root` et retirer les deux blocs `@media (prefers-color-scheme: dark)`** de `src/style.css` avec les valeurs de Global Constraints. Puis : `body { font-family: var(--police-texte); font-weight: 700 }` ; `h1, h2, .score, .calcul, .reponse, .touche, .profil, .numero, .continuer .titre, .principal, .secondaire, .etoiles { font-family: var(--police-titre) }` ; `button { border-radius: var(--rayon); border: 1.5px solid var(--bord) }` ; `color: #fff` → `var(--sur-accent)` dans `.continuer`, `.principal`, `.touche-valider` ; `.actif` devient bordure seule (`background: var(--surface); border: 3px solid var(--primaire); color: var(--texte)`) ; `.attendu { color: var(--texte-doux) }` ; `.objectif`, `.joueur`, `.discret`, `figcaption`, `.niveau .record`, `.fin .record.discret` : remplacer `opacity` par `color: var(--texte-doux)` ; grille des faits : `background: var(--fait-en-cours)` / `var(--fait-maitrise)` ; `.parents-ecran button.couleur.actif { border-color: var(--texte) }` conservé ; `.reglages { opacity: 1 }`.

- [ ] **Step 5 : `index.html`** : remplacer les deux `theme-color` par `<meta name="theme-color" content="#0B1026" />`. **`vite.config.ts`** : `background_color: '#0B1026'`, `theme_color: '#0B1026'`.

- [ ] **Step 6 : vérifier** — `npx vitest run tests/ui/theme.test.ts` : 5 PASS ; `npm test` vert ; `npm run build` vert et `ls dist/assets | grep -c woff2` ≥ 4.

- [ ] **Step 7 : commit** — `git add -A && git commit -m "feat(ui): thème spatial, variables, polices auto-hébergées"` (inclut `src/assets/`, `public/icons/`, `docs/design/`, la spec et ce plan).

---

### Task 2 : Module d'icônes

**Files:**
- Create: `src/ui/icones.ts`
- Test: `tests/ui/icones.test.ts`

**Interfaces:**
- Produces :
  ```ts
  export type NomIcone = 'continuer' | 'correct' | 'effacer' | 'erreur' | 'etincelle' | 'etoile-vide' | 'etoile' | 'joueur' | 'op-add' | 'op-sub' | 'op-mul' | 'op-mix' | 'parents' | 'record' | 'retour' | 'verrou'
  export type NomIllustration = 'vaisseau' | 'pilote' | 'alien-add' | 'alien-sub' | 'alien-mul' | 'boss-mix' | 'eclat' | 'planete'
  /** <span class="icone icone-<nom>" aria-hidden="true"> contenant le SVG (currentColor), width/height = taille. */
  export function icone(nom: NomIcone, taille = 24): HTMLElement
  /** <span class="illustration illustration-<nom>" aria-hidden="true"> contenant le SVG à couleurs fixes. */
  export function illustration(nom: NomIllustration, taille: number): HTMLElement
  ```
  Imports `?raw` de `../assets/icones/*.svg`, `../assets/personnages/*.svg`, `../assets/effets/*.svg` dans deux `Record` constants.

- [ ] **Step 1 : test**

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { icone, illustration } from '../../src/ui/icones'

describe('icone', () => {
  it('span aria-hidden avec un svg à la taille demandée et la classe du nom', () => {
    const el = icone('etoile', 14)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.classList.contains('icone')).toBe(true)
    expect(el.classList.contains('icone-etoile')).toBe(true)
    const svg = el.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('14')
    expect(svg.getAttribute('height')).toBe('14')
    expect(el.textContent).toBe('')
  })
  it('taille 24 par défaut', () => {
    expect(icone('retour').querySelector('svg')!.getAttribute('width')).toBe('24')
  })
  it('illustration : mascotte avec sa classe', () => {
    const el = illustration('boss-mix', 52)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.classList.contains('illustration-boss-mix')).toBe(true)
    expect(el.querySelector('svg')!.getAttribute('height')).toBe('52')
  })
})
```

- [ ] **Step 2 : `npx vitest run tests/ui/icones.test.ts`** : échec « Cannot find module ».
- [ ] **Step 3 : implémenter** `src/ui/icones.ts` (injection par `innerHTML` du SVG puis `setAttribute('width'|'height')` sur le `svg`). CSS : `.icone, .illustration { display: inline-flex; flex: 0 0 auto; line-height: 0 } .icone svg { display: block }`.
- [ ] **Step 4 : `npx vitest run tests/ui/icones.test.ts`** : 3 PASS. `npx tsc --noEmit` vert (les imports `?raw` sont typés par `vite/client`).
- [ ] **Step 5 : commit** — `feat(ui): module d'icônes SVG`.

---

### Task 3 : Couleurs de profil

**Files:**
- Modify: `src/storage/schema.ts:6-13`
- Test: `tests/storage/schema.test.ts`

- [ ] **Step 1 : test** (à ajouter dans le `describe` existant)

```ts
test('COULEURS : mêmes 6 clés, valeurs du thème spatial', () => {
  expect(COULEURS).toEqual({ bleu: '#6C8CFF', vert: '#5EE6A0', orange: '#FF9F45', violet: '#A78BFA', rose: '#FF6FB1', turquoise: '#4FD8EB' })
})
```
- [ ] **Step 2 :** `npx vitest run tests/storage/schema.test.ts` : 1 échec.
- [ ] **Step 3 :** remplacer les valeurs dans `COULEURS`.
- [ ] **Step 4 :** `npm test` vert (migration et profils inchangés).
- [ ] **Step 5 : commit** — `feat(storage): couleurs de profil lisibles sur fond sombre`.

---

### Task 4 : Accueil

**Files:**
- Modify: `src/ui/accueil.ts` (`ENGRENAGE` l. 35-42, `rendreAccueil` l. 55-56)
- Modify: `src/style.css` (section Accueil)
- Test: `tests/ui/accueil.test.ts`

**Interfaces:**
- Consumes : `icone('parents', 28)`, `illustration('planete' | 'vaisseau' | 'alien-add', taille)`.
- Produces : `div.decor.decor-accueil[aria-hidden="true"]` entre `header` et `h2`.

- [ ] **Step 1 : tests** (ajouter dans `describe('rendreAccueil (page 1)')`)

```ts
it('bouton Parents : icône parents.svg, plus d\'engrenage', () => {
  const lien = rendreAccueil(ctxDe()).querySelector('header a[href="#/parents"]')!
  expect(lien.querySelector('.icone-parents svg')).not.toBeNull()
})
it('décor spatial entre l\'en-tête et « Qui joue ? », masqué aux lecteurs d\'écran', () => {
  const racine = rendreAccueil(ctxDe())
  const decor = racine.querySelector('.decor-accueil')!
  expect(decor.getAttribute('aria-hidden')).toBe('true')
  expect(decor.previousElementSibling!.tagName).toBe('HEADER')
  expect(decor.nextElementSibling!.tagName).toBe('H2')
  expect(decor.querySelectorAll('.illustration')).toHaveLength(3)
})
```
- [ ] **Step 2 :** `npx vitest run tests/ui/accueil.test.ts` : 2 échecs (le test existant « svg[aria-hidden] » doit encore passer après).
- [ ] **Step 3 : implémenter** : supprimer `ENGRENAGE` ; `lienReglages()` insère `icone('parents', 28)` avant le `.sr-only` ; ajouter `h('div', { class: 'decor decor-accueil', 'aria-hidden': 'true' }, illustration('planete', 110), illustration('vaisseau', 120), illustration('alien-add', 72))`. CSS : `.accueil h1 { font-size: 2.125rem }`, `.accueil h2 { font-size: 1.75rem }`, `.decor { display: flex; justify-content: space-between; align-items: center; min-height: 160px; padding: 0 8px; background-image: radial-gradient(circle, var(--texte) 1.5px, transparent 2px), radial-gradient(circle, var(--texte) 1px, transparent 1.5px); background-size: 120px 90px, 70px 110px; background-position: 10px 10px, 40px 50px }`, `.profils.grand .profil { min-height: 72px; border-radius: var(--rayon-grand); font-size: 1.5rem; padding: 0 20px; gap: 14px }`, `.profils.grand .pastille-couleur { width: 32px; height: 32px }`, `.profil.actif { border: 3px solid var(--primaire) }`.
- [ ] **Step 4 :** `npx vitest run tests/ui/accueil.test.ts` PASS, `npm test` vert.
- [ ] **Step 5 : commit** — `feat(ui): accueil spatial (icône parents, décor, profils)`.

---

### Task 5 : Parcours

**Files:**
- Modify: `src/ui/parcours.ts` (l. 10-11, 35-69)
- Modify: `src/style.css` (`.etoiles`, `.changer`, `.continuer`, `.choix`, `.grille`, `.niveau`, `.marque`, `.record`)
- Test: `tests/ui/parcours.test.ts`

**Interfaces:**
- Consumes : `icone('etoile' | 'joueur' | 'continuer' | 'op-add' | 'op-sub' | 'op-mul' | 'op-mix' | 'verrou', taille)`.
- Produces (DOM) :
  - `header span.etoiles[role="img"][aria-label="N étoile(s)"]` = `icone('etoile', 24)` + texte `N` ;
  - `a.changer` = `icone('joueur', 22)` + « Changer de joueur » ;
  - `button.continuer` = `icone('continuer', 28)` + `span.lignes` (`span.titre` « Continuer », `span.detail` `${nomParcours(cible)} niveau ${n}`) ;
  - `button.op[data-op][aria-pressed]` = `span.pastille-op` (contenant `icone('op-<op>', 22)`) + nom ; `button.taille[aria-pressed]` ;
  - `button.niveau` = [`icone('verrou', 20)` si verrouillé] + `span.numero` (`span.sr-only` « Niveau » + ` ${i+1}`) + [`span.marque[role="img"][aria-label="une étoile"|"deux étoiles"]` avec 1 ou 2 `icone('etoile', 14)`] + [`span.record` = `span.sr-only` « Record » + ` ${formaterSecondes(r)}`].

- [ ] **Step 1 : adapter et ajouter les tests**

Remplacer `expect(header.textContent).toContain('★ 2')` par :
```ts
const etoiles = header.querySelector('.etoiles')!
expect(etoiles.textContent!.trim()).toBe('2')
expect(etoiles.getAttribute('aria-label')).toBe('2 étoiles')
expect(etoiles.querySelector('.icone-etoile')).not.toBeNull()
expect(racine.querySelector('a[href="#/"] .icone-joueur')).not.toBeNull()
```
Ajouter :
```ts
it('continuer : icône, deux lignes, texte complet', () => {
  const d = avecProfil({ dernierParcours: 'mul-1', series: [serieValidee('mul-1', 1)] })
  const b = rendreParcours(ctxDe(d)).querySelector('[data-test="continuer"]')!
  expect(b.querySelector('.icone-continuer')).not.toBeNull()
  expect(b.querySelector('.titre')!.textContent).toBe('Continuer')
  expect(b.querySelector('.detail')!.textContent).toBe('Multiplications 1 chiffre niveau 2')
})
it('opérations : pastille avec le signe, sélection par aria-pressed', () => {
  const racine = rendreParcours(ctxDe())
  expect(racine.querySelector('button.op[data-op="sub"] .pastille-op .icone-op-sub')).not.toBeNull()
  expect(racine.querySelector('button.op[data-op="add"]')!.getAttribute('aria-pressed')).toBe('true')
  expect(racine.querySelector('button.op[data-op="sub"]')!.getAttribute('aria-pressed')).toBe('false')
  expect(racine.querySelector('button.taille[data-taille="1"]')!.getAttribute('aria-pressed')).toBe('true')
})
it('tuiles : cadenas si verrouillé, 1 ou 2 étoiles SVG, « Niveau N » conservé en texte', () => {
  const d = avecProfil({ series: [serieValidee('add-1', 1), { ...serieValidee('add-1', 2), tempsMedian: 9000, validee: false }] })
  const racine = rendreParcours(ctxDe(d))
  const t = (n: number) => racine.querySelector(`button.niveau[data-niveau="${n}"]`)!
  expect(t(1).querySelectorAll('.marque .icone-etoile')).toHaveLength(2)
  expect(t(1).querySelector('.marque')!.getAttribute('aria-label')).toBe('deux étoiles')
  expect(t(2).querySelectorAll('.marque .icone-etoile')).toHaveLength(1)
  expect(t(3).querySelector('.marque')).toBeNull()
  expect(t(4).querySelector('.icone-verrou')).not.toBeNull()
  expect(t(1).querySelector('.icone-verrou')).toBeNull()
  expect(t(1).querySelector('.numero')!.textContent).toBe('Niveau 1')
  expect(racine.textContent).not.toContain('★')
})
```
Le test record existant (`r.textContent` = `Record 38,2 s`) reste tel quel ; vérifier qu'il passe avec le `.sr-only`.

- [ ] **Step 2 :** `npx vitest run tests/ui/parcours.test.ts` : 4 échecs.
- [ ] **Step 3 : implémenter** dans `parcours.ts` (supprimer `ETOILES`, ajouter `const MARQUES: Record<EtatNiveau, 0 | 1 | 2>` avec `reussi: 1, valide: 2`, `aria-pressed` sur `op` et `taille`). CSS : `.etoiles { display: flex; align-items: center; gap: 6px; color: var(--etoile); font-size: 1.5rem }`, `.changer { gap: 8px; min-height: 44px; font-weight: 800 }`, `.continuer { display: flex; align-items: center; gap: 14px; min-height: 72px; text-align: left; border-radius: var(--rayon-grand) } .continuer .lignes { display: flex; flex-direction: column } .continuer .titre { font-size: 1.375rem } .continuer .detail { font-size: 0.875rem; font-weight: 800 }`, `.choix { gap: 10px } .op { min-height: 64px; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 800; padding: 0 12px; text-align: left } .pastille-op { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--sur-accent); flex: 0 0 auto } .op[data-op="add"] .pastille-op { background: var(--op-add) }` (idem sub/mul/mix), `.op.actif[data-op="add"] { border-color: var(--op-add) }` (idem), `.taille { min-height: 56px; font-size: 1.06rem; font-weight: 800 }`, `.grille { gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)) } .niveau { aspect-ratio: 1 / 1.05; min-height: 84px; padding: 0; gap: 3px; border-radius: var(--rayon) } .niveau .numero { font-size: 1.5rem; line-height: 1 } .niveau[data-etat="verrouille"] { background: var(--fond); color: var(--texte-doux); opacity: 1 } .niveau[data-etat="verrouille"] .numero { font-size: 0.95rem } .niveau[data-etat="ouvert"], .niveau[data-etat="reussi"] { border: 3px solid var(--primaire) } .niveau[data-etat="valide"] { border: 2px solid var(--succes) } .marque { display: flex; gap: 2px; color: var(--etoile) } .niveau .record { font-size: 0.75rem; color: var(--texte-doux) }`, `.accueil .joueur { min-width: 0 } .accueil .joueur .prenom { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` (envelopper le prénom dans `span.prenom`).
- [ ] **Step 4 :** `npx vitest run tests/ui/parcours.test.ts` PASS ; `npm test` vert.
- [ ] **Step 5 : commit** — `feat(ui): parcours spatial (étoiles SVG, pastilles d'opération, tuiles)`.

---

### Task 6 : Pavé

**Files:**
- Modify: `src/ui/pave.ts:48-55`
- Modify: `src/style.css` (`.touche*`)
- Test: `tests/ui/pave.test.ts`

- [ ] **Step 1 : test**
```ts
it('Effacer : icône SVG, aria-label conservé, plus de glyphe', () => {
  const { touche } = monter()
  const b = touche('effacer')
  expect(b.getAttribute('aria-label')).toBe('Effacer')
  expect(b.querySelector('.icone-effacer svg')).not.toBeNull()
  expect(b.textContent).toBe('')
})
```
- [ ] **Step 2 :** `npx vitest run tests/ui/pave.test.ts` : 1 échec.
- [ ] **Step 3 : implémenter** : pour `effacer`, enfant = `icone('effacer', 30)` au lieu de `'⌫'`. CSS : `.pave { gap: 10px } .touche { min-height: 64px; font-size: 1.875rem; font-weight: 600; border-radius: var(--rayon) } .touche-valider { font-size: 1.5rem; font-weight: 700 }` ; supprimer `.touche-effacer { font-size }`.
- [ ] **Step 4 :** PASS, `npm test` vert.
- [ ] **Step 5 : commit** — `feat(ui): pavé spatial, touche Effacer en icône`.

---

### Task 7 : Jeu — barre du haut et mascotte

**Files:**
- Modify: `src/ui/jeu.ts` (`boutonRetour` l. 120-125, `dessiner` l. 127-134, montage l. 212)
- Modify: `src/style.css` (section Jeu)
- Test: `tests/ui/jeu.test.ts`

**Interfaces:**
- Consumes : `icone('retour', 22)`, `illustration(MASCOTTES[op], 52)` avec `const MASCOTTES: Record<ParcoursOp, NomIllustration> = { add: 'alien-add', sub: 'alien-sub', mul: 'alien-mul', mix: 'boss-mix' }` et `decomposerParcours(parcours).op`.
- Produces (DOM) : `div.barre` construit une seule fois, premier enfant de `.jeu` : `button.discret[data-test="retour"]` (icône + « Retour ») puis `span.mascotte[data-test="mascotte"][data-personnage="<nom>"]` contenant l'illustration. `.entete` ne contient plus le bouton Retour.

- [ ] **Step 1 : tests**
```ts
it('barre du haut : Retour avec icône à gauche, mascotte du parcours à droite', () => {
  const j = monter({ parcours: 'add-1' })
  const barre = j.ecran.element.firstElementChild!
  expect(barre.classList.contains('barre')).toBe(true)
  const retour = barre.querySelector('[data-test="retour"]')!
  expect(retour.textContent).toBe('Retour')
  expect(retour.querySelector('.icone-retour')).not.toBeNull()
  const m = barre.querySelector<HTMLElement>('[data-test="mascotte"]')!
  expect(m.dataset.personnage).toBe('alien-add')
  expect(m.querySelector('.illustration-alien-add svg')).not.toBeNull()
  expect(m.querySelector('[aria-hidden="true"]')).not.toBeNull()
  expect(j.q('.entete [data-test="retour"]')).toBeNull()
})
it.each([['sub-1', 'alien-sub'], ['mul-2', 'alien-mul'], ['mix-1', 'boss-mix']] as const)('mascotte de %s : %s', (parcours, nom) => {
  expect(monter({ parcours }).q<HTMLElement>('[data-test="mascotte"]')!.dataset.personnage).toBe(nom)
})
```
(`mix-1` niveau 1 et `mul-2` niveau 1 sont ouverts sans série : vérifier avec `etatNiveau` si un test échoue pour « verrouillé ».)
- [ ] **Step 2 :** `npx vitest run tests/ui/jeu.test.ts -t "barre|mascotte"` : échecs. Le test existant « Retour » (clic sur `[data-test="retour"]` en cours de jeu, s'il existe) doit encore passer.
- [ ] **Step 3 : implémenter** : `const barre = h('div', { class: 'barre' }, boutonRetour(), h('span', { class: 'mascotte', 'data-test': 'mascotte', 'data-personnage': nom }, illustration(nom, 52)))` ; `racine.append(barre, entete, calculEl, reponseEl, pave.element)` ; retirer `boutonRetour()` de `dessiner()`. CSS : `.barre { display: flex; justify-content: space-between; align-items: center } .discret { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; font-size: 1rem; font-weight: 800; color: var(--texte-doux); padding: 0 }`, `.pastilles { gap: 7px } .pastille { width: 14px; height: 14px; box-sizing: border-box; background: transparent; border: 2px solid var(--texte-doux) } .pastille[data-etat="en_cours"], .pastille[data-etat="juste"], .pastille[data-etat="faux"] { border: 0 }` (fonds existants), `.calcul { font-size: 4.25rem; font-weight: 700; line-height: 1; margin-top: 8px } .reponse { min-height: 76px; box-sizing: border-box; border-radius: 22px; background: var(--surface); border: 2px solid var(--primaire); display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 700; gap: 8px } .reponse.juste { border-color: var(--succes) } .reponse.correction { border-color: var(--erreur) }`.
- [ ] **Step 4 :** `npx vitest run tests/ui/jeu.test.ts` PASS ; `npm test` vert.
- [ ] **Step 5 : commit** — `feat(ui): écran de jeu spatial, mascotte du parcours`.

---

### Task 8 : Fin de série

**Files:**
- Modify: `src/ui/jeu.ts` (`rendreRecord` l. 47-55, `terminer` l. 193-209)
- Modify: `src/style.css` (`.fin*`, `.record*`, `.principal`, nouvelle `.secondaire`)
- Test: `tests/ui/jeu.test.ts`

**Interfaces:**
- Consumes : `illustration('vaisseau', 130)`, `illustration('eclat', 72)`, `icone('etoile', 44)`, `icone('etincelle', 24)`.
- Produces (DOM, dans l'ordre) : `div.decor.decor-fin[aria-hidden]` (vaisseau, + `.eclat` si `b.validee`), `p.score`, `p.verdict.<raison>`, `span.etoiles-fin[role="img"][aria-label]` (2 étoiles si validée, 1 si `raison === 'trop_lent'`, absent sinon), `p.temps`, `p.temps-total`, record, avertissement, puis les boutons : `[suivant .principal]`, `rejouer` (`.principal` sans suivant, sinon `.secondaire`), `retour .discret`.
- `rendreRecord` battu : `h('p', { class: 'record record-battu', ... }, h('span', { class: 'etincelles', 'aria-hidden': 'true' }, icone('etincelle', 24)), 'Nouveau record ! …')` — texte inchangé, plus de `✨` ni d'espace initial.

- [ ] **Step 1 : tests** (modifier le test « record battu » : ajouter `expect(el.querySelector('.etincelles .icone-etincelle')).not.toBeNull()` et `expect(el.textContent).not.toContain('✨')` ; ajouter :)
```ts
it('fin validée : décor, deux étoiles, éclat, Niveau suivant principal avant Rejouer secondaire', () => {
  const j = monter()
  for (let i = 0; i < 10; i++) j.repondreJuste()
  const fin = j.q('.fin')!
  expect(fin.firstElementChild!.classList.contains('decor-fin')).toBe(true)
  expect(fin.querySelector('.decor-fin .illustration-vaisseau')).not.toBeNull()
  expect(fin.querySelector('.decor-fin .illustration-eclat')).not.toBeNull()
  expect(fin.querySelectorAll('.etoiles-fin .icone-etoile')).toHaveLength(2)
  expect(fin.querySelector('.etoiles-fin')!.getAttribute('aria-label')).toBe('deux étoiles')
  const suivant = j.q('[data-test="suivant"]')!, rejouer = j.q('[data-test="rejouer"]')!
  expect(suivant.classList.contains('principal')).toBe(true)
  expect(rejouer.classList.contains('secondaire')).toBe(true)
  expect(rejouer.classList.contains('principal')).toBe(false)
  expect(suivant.compareDocumentPosition(rejouer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
it('fin réussie mais trop lente : une étoile, pas d\'éclat, Rejouer principal', () => {
  const j = monter({ pas: 99999 })
  for (let i = 0; i < 10; i++) j.repondreJuste()
  expect(j.ecran.element.querySelectorAll('.etoiles-fin .icone-etoile')).toHaveLength(1)
  expect(j.q('.illustration-eclat')).toBeNull()
  expect(j.q('[data-test="rejouer"]')!.classList.contains('principal')).toBe(true)
})
it('fin ratée : pas d\'étoile', () => {
  const j = monter()
  j.repondreFaux(); j.repondreFaux()
  for (let i = 0; i < 8; i++) j.repondreJuste()
  expect(j.q('.etoiles-fin')).toBeNull()
})
```
(Pour « trop lent », reprendre la façon dont le test existant « Bravo, presque ! » l. ~365 construit la lenteur ; pour « ratée », reprendre le test « trop d'erreurs » l. ~300.)
- [ ] **Step 2 :** `npx vitest run tests/ui/jeu.test.ts` : 4 échecs.
- [ ] **Step 3 : implémenter** `terminer()` et `rendreRecord` selon Interfaces. CSS : `.fin { gap: 12px; align-items: center } .decor-fin { min-height: 130px; justify-content: center; gap: 12px; position: relative } .decor-fin .eclat { position: absolute; right: 10%; top: 0 } .score { font-size: 4rem; line-height: 1 } .verdict { font-size: 1.75rem; font-family: var(--police-titre); font-weight: 600 } .verdict.validee { color: var(--succes) } .etoiles-fin { display: flex; gap: 8px; color: var(--etoile) } .temps { font-size: 1.06rem } .temps-total { margin: 0; color: var(--texte-doux) } .fin .record.record-battu { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--rayon); background: var(--surface); border: 1.5px solid var(--succes); text-align: left } .fin .actions { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: auto } .principal, .secondaire { min-height: 64px; border-radius: 22px; font-size: 1.375rem; font-weight: 700 } .secondaire { background: var(--surface); border: 1.5px solid var(--bord); color: var(--texte) }`. Les animations `record-pulse` / `etincelles-apparition` restent sous `@media (prefers-reduced-motion: no-preference)` ; y ajouter `.decor-fin .eclat { animation: etincelles-apparition 0.8s ease-out 1 }`. Les trois boutons sont regroupés dans `div.actions`.
- [ ] **Step 4 :** `npx vitest run tests/ui/jeu.test.ts` PASS ; `npm test` vert.
- [ ] **Step 5 : commit** — `feat(ui): fin de série spatiale, Niveau suivant en bouton principal`.

---

### Task 9 : Glyphes bannis et écran Parents

**Files:**
- Modify: `tests/ui/theme.test.ts`
- Modify: `src/style.css` (section Parents)

- [ ] **Step 1 : test** (ajouter dans `theme.test.ts`)
```ts
it('plus aucun glyphe ★ ✨ ⌫ dans src/ui', () => {
  for (const f of readdirSync(new URL('../../src/ui', import.meta.url))) {
    expect(lire(`src/ui/${f}`), f).not.toMatch(/[★✨⌫]/)
  }
})
```
- [ ] **Step 2 :** `npx vitest run tests/ui/theme.test.ts` : doit déjà passer après les tâches 5, 6, 8 (sinon corriger le fichier nommé).
- [ ] **Step 3 : Parents, CSS seulement** : `.parents-ecran select, input { border-radius: 12px }`, `.parents-ecran button.couleur.actif { border-color: var(--texte); box-shadow: 0 0 0 2px var(--surface) }` (inchangé), tableaux `th { color: var(--texte-doux) }`. Lancer `npm run dev`, ouvrir `#/parents`, vérifier la lisibilité des tableaux, champs, graphiques (les traits sont en `currentColor`), grille des faits, pastilles.
- [ ] **Step 4 :** `npm test` vert.
- [ ] **Step 5 : commit** — `style(ui): écran parents sur le thème sombre, test des glyphes`.

---

### Task 10 : Vérification finale

- [ ] **Step 1 :** `npm test` : tout vert, afficher le nombre de tests.
- [ ] **Step 2 :** `npm run build` vert. Vérifier : `grep -c woff2 dist/sw.js` ≥ 4 ; `grep -rl "fonts.googleapis" dist/ || echo "aucun appel externe"` ; `grep -c theme-color dist/index.html` = 1 ; `dist/manifest.webmanifest` contient `#0B1026`.
- [ ] **Step 3 :** `grep -rn "prefers-color-scheme\|#fff\b\|#868e96" src index.html` : aucun résultat.
- [ ] **Step 4 :** `npm run dev -- --host`, ouvrir les quatre écrans enfant en 390 × 844 et en 320 × 568 dans Chrome (émulation) ; comparer aux maquettes (`docs/design/maquettes/`). Puis `#/parents`.
- [ ] **Step 5 :** lister pour l'utilisateur ce qui reste à vérifier à l'œil sur téléphone (rendu des polices, mascottes, barre d'état `#0B1026`, icône PWA après réinstallation, hors ligne après rechargement, `prefers-reduced-motion`).
