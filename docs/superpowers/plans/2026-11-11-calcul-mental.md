# BattleMath — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la PWA de calcul mental CE2 décrite dans la spec : 12 parcours × 8 niveaux, séries de 10 calculs, validation par score et médiane de temps, suivi parent, stockage local, hors ligne, déployée sur GitHub Pages.

**Architecture:** Un cœur pur et testé (`src/core`, `src/game`, `src/storage`) sans aucun accès au DOM : types de calcul déclaratifs, configuration des niveaux isolée, générateur à graine, machine à états de session, progression dérivée des séries. Trois écrans en TypeScript vanilla (`src/ui`) qui ne font que rendre l'état et appeler le cœur. Un seul objet JSON versionné en localStorage.

**Tech Stack:** Vite 6, TypeScript 5 (strict), vitest, happy-dom (tests UI), vite-plugin-pwa, SVG maison, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-11-calcul-mental-design.md`

## Global Constraints

- Node ≥ 20. Package manager : npm. Pas de framework UI, pas de librairie de graphiques.
- `base: '/BattleMath/'` dans Vite ; `start_url` et `scope` du manifest = `/BattleMath/`. Le dépôt GitHub doit s'appeler `BattleMath`.
- Toute la logique de `src/core`, `src/game`, `src/storage` est pure : aucun accès à `window`, `document`, `localStorage`, `Date.now`, `Math.random`. Les dépendances (rng, horloge, stockage) sont injectées.
- Identifiants de parcours : `add-1`, `add-2`, `add-3`, `sub-1`, `sub-2`, `sub-3`, `mul-1`, `mul-2`, `mul-3`, `mix-1`, `mix-2`, `mix-3`.
- Clé de fait : `op:a·b` (séparateur « · » U+00B7), a ≤ b pour add et mul, ordre réel pour sub.
- Temps en millisecondes partout dans le code et les données ; en secondes avec une décimale dans l'interface.
- Série = 10 calculs. Réussie = bonnes ≥ 9. Validée = réussie et médiane ≤ cible effective. Seuil de maîtrise d'un fait = 5000 ms, indépendant du réglage de vitesse.
- Vitesse : `tranquille` × 1,5, `normal` × 1, `rapide` × 0,75 (cible effective arrondie à la ms).
- Réponse : 1 à 4 chiffres, pas de zéro en tête (taper 0 sur une réponse vide ne fait rien).
- Textes en français, ton encourageant, phrases courtes. Touches ≥ 56 px. Mode sombre via `prefers-color-scheme`. `touch-action: manipulation`, `user-select: none` sur l'écran de jeu.
- Chaque commit se termine par la ligne `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Réponse avec zéro en tête ou vide** : « 07 » ne doit pas être saisissable, Valider sur réponse vide ne fait rien (test en tâche 10, pavé, et tâche 9, session).
2. **Double appui sur Valider pendant le retour visuel** : une seule réponse comptée, pas de saut de calcul (test en tâche 9 : `repondre` en phase `feedback` est ignoré).
3. **localStorage indisponible ou corrompu** (navigation privée, JSON tronqué, version inconnue) : l'app démarre avec des données vides en mémoire et le signale, elle n'écrase jamais silencieusement (tests en tâche 8).
4. **Perte de focus pendant la phase de correction** (recopie après erreur) : rien n'est annulé, la recopie n'est pas chronométrée (test en tâche 9 : `annulerCourant` hors phase `question` est sans effet).
5. **Médiane sur 10 valeurs** : nombre pair, la médiane est la moyenne des deux valeurs centrales ; égalité exacte avec la cible = validé (tests en tâche 6).

---

## Structure des fichiers

```
index.html
vite.config.ts            # base, plugin PWA, vitest config
package.json
tsconfig.json
.gitignore
.github/workflows/deploy.yml
public/icons/icon-192.png, icon-512.png, apple-touch-icon.png
src/main.ts               # bootstrap : charge données, démarre le routeur
src/style.css
src/core/types.ts         # Op, Taille, ParcoursId, Calcul, Fait, Serie…
src/core/rng.ts           # mulberry32 : createRng(seed)
src/core/format.ts        # formaterCalcul, formaterSecondes
src/core/faits.ts         # cleFait, reponseAttendue, majFait, estMaitrise
src/core/typesCalcul.ts   # TypeDef déclaratifs + genererCalcul + typeAccepte
src/core/levels.ts        # CONFIGURATION ISOLÉE : NIVEAUX par parcours, cibles
src/core/serie.ts         # genererSerie (unicité, mixte, pondération)
src/core/validation.ts    # mediane, cibleEffective, cibleNiveau, evaluerSerie
src/core/progression.ts   # etatNiveau, prochainNiveau, etoiles, synthese, aRevoir
src/game/session.ts       # machine à états d'une série (pure)
src/storage/schema.ts     # Donnees, VERSION, donneesVides, migrer
src/storage/store.ts      # charger/sauver (Storage injecté), enregistrerSerie, export/import
src/ui/router.ts          # routes hash : #/, #/jeu/<parcours>/<niveau>, #/parents
src/ui/dom.ts             # h() helper de création d'éléments
src/ui/accueil.ts
src/ui/pave.ts            # pavé numérique
src/ui/jeu.ts             # écran de jeu + fin de série
src/ui/parents.ts         # verrou, filtres, synthèse, réglages, export/import/reset
src/ui/graphiques.ts      # 2 graphiques SVG
src/ui/grilleFaits.ts     # grille de maîtrise
src/ui/installation.ts    # bannière d'installation PWA
tests/**/*.test.ts        # miroir de src/
```

---

### Task 1 : Squelette du projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces : commandes `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run test:watch`.

- [ ] **Step 1 : Initialiser git et Vite**

```bash
cd /Users/srenier/workspace/ClaudeWorkspace/BattleMath
git init -b main
npm create vite@latest . -- --template vanilla-ts
npm install
npm install -D vitest happy-dom
```
Si `npm create vite` refuse un dossier non vide (le dossier `docs/` existe), créer dans un dossier temporaire puis déplacer les fichiers à la racine.

- [ ] **Step 2 : Configurer Vite et vitest** dans `vite.config.ts`

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  base: '/BattleMath/',
  test: { include: ['tests/**/*.test.ts'] },
})
```
Scripts package.json : `"test": "vitest run"`, `"test:watch": "vitest"`. `tsconfig.json` : `"strict": true`, `"noUncheckedIndexedAccess": true`, `"include": ["src", "tests"]`.

- [ ] **Step 3 : Écrire un test de fumée** `tests/smoke.test.ts`

```ts
import { expect, test } from 'vitest'
test('vitest fonctionne', () => { expect(1 + 1).toBe(2) })
```

- [ ] **Step 4 : Vérifier** `npm test` → 1 passed ; `npm run build` → dossier `dist/` créé sans erreur TypeScript.

- [ ] **Step 5 : Vider `src/main.ts`** (supprimer le compteur de démo, garder `import './style.css'`), supprimer `src/counter.ts`, `src/typescript.svg`, `public/vite.svg`. `index.html` : `<html lang="fr">`, `<title>BattleMath</title>`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<div id="app"></div>`.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "chore: squelette Vite + TypeScript + vitest"
```

---

### Task 2 : Types, RNG, clés de faits, formatage

**Files:**
- Create: `src/core/types.ts`, `src/core/rng.ts`, `src/core/faits.ts`, `src/core/format.ts`
- Test: `tests/core/rng.test.ts`, `tests/core/faits.test.ts`, `tests/core/format.test.ts`

**Interfaces:**
- Produces :
```ts
// types.ts
export type Op = 'add' | 'sub' | 'mul'
export type Taille = 1 | 2 | 3
export type ParcoursOp = Op | 'mix'
export type ParcoursId = `${ParcoursOp}-${Taille}`
export type Vitesse = 'tranquille' | 'normal' | 'rapide'
export interface Calcul { op: Op; a: number; b: number; resultat: number; inconnue: 'resultat' | 'b' }
export interface Essai { juste: boolean; temps: number }
export interface Fait { tentatives: number; erreurs: number; tempsCumule: number; derniers: Essai[] }
export interface Serie { date: string; parcours: ParcoursId; niveau: number; bonnes: number; tempsMedian: number; tempsCible: number; reussie: boolean; validee: boolean }
export function parcoursId(op: ParcoursOp, taille: Taille): ParcoursId
export function decomposerParcours(id: ParcoursId): { op: ParcoursOp; taille: Taille }
// rng.ts
export interface Rng { next(): number; int(min: number, max: number): number; pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[] }
export function createRng(seed: number): Rng       // mulberry32
// faits.ts
export const SEUIL_MAITRISE_MS = 5000
export function cleFait(c: Calcul): string          // 'mul:7·8'
export function reponseAttendue(c: Calcul): number  // resultat ou b selon inconnue
export function majFait(f: Fait | undefined, essai: Essai): Fait   // derniers limité à 3 (les plus récents)
export function estMaitrise(f: Fait | undefined, seuilMs?: number): boolean
export function faitVide(): Fait
// format.ts
export function formaterCalcul(c: Calcul): string   // '7 × 8', '12 − 5', '3 + ▢ = 10'
export function formaterSecondes(ms: number): string // '6,2 s'
```

- [ ] **Step 1 : Tests**

`tests/core/rng.test.ts` :
```ts
test('même graine, même suite', () => { expect(seq(createRng(42), 5)).toEqual(seq(createRng(42), 5)) })
test('graines différentes, suites différentes', () => { expect(seq(createRng(1), 5)).not.toEqual(seq(createRng(2), 5)) })
test('int est borné inclusif', () => { const r = createRng(7); for (let i = 0; i < 1000; i++) { const v = r.int(3, 5); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(5) } })
test('int atteint les deux bornes', () => { const r = createRng(9); const vus = new Set(Array.from({ length: 500 }, () => r.int(1, 3))); expect(vus).toEqual(new Set([1, 2, 3])) })
```
`tests/core/faits.test.ts` :
```ts
test('clé add/mul triée', () => { expect(cleFait({ op: 'mul', a: 8, b: 7, resultat: 56, inconnue: 'resultat' })).toBe('mul:7·8') })
test('clé sub non triée', () => { expect(cleFait({ op: 'sub', a: 12, b: 5, resultat: 7, inconnue: 'resultat' })).toBe('sub:12·5') })
test('clé du complément = addition sous-jacente', () => { expect(cleFait({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'b' })).toBe('add:3·7') })
test('réponse attendue selon inconnue', () => { expect(reponseAttendue({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'b' })).toBe(7); expect(reponseAttendue({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'resultat' })).toBe(10) })
test('majFait cumule et garde 3 derniers', () => { let f = majFait(undefined, { juste: false, temps: 8000 }); f = majFait(f, { juste: true, temps: 3000 }); f = majFait(f, { juste: true, temps: 2000 }); f = majFait(f, { juste: true, temps: 4000 }); expect(f).toEqual({ tentatives: 4, erreurs: 1, tempsCumule: 17000, derniers: [{ juste: true, temps: 3000 }, { juste: true, temps: 2000 }, { juste: true, temps: 4000 }] }) })
test('maîtrisé : 3 derniers justes et < 5000', () => { expect(estMaitrise({ tentatives: 3, erreurs: 0, tempsCumule: 9000, derniers: [{ juste: true, temps: 4999 }, { juste: true, temps: 3000 }, { juste: true, temps: 1000 }] })).toBe(true) })
test('pas maîtrisé : moins de 3 essais, ou un essai lent, ou faux, ou undefined', () => { /* 4 assertions toBe(false), dont un essai à exactement 5000 ms */ })
```
`tests/core/format.test.ts` : `'7 × 8'`, `'12 − 5'` (U+2212), `'3 + ▢ = 10'`, `formaterSecondes(6200) === '6,2 s'`, `formaterSecondes(3000) === '3,0 s'`.

- [ ] **Step 2 : Lancer** `npm test` → échecs « cannot find module ».
- [ ] **Step 3 : Implémenter** les quatre fichiers selon les signatures. `estMaitrise` : `derniers.length === 3 && derniers.every(e => e.juste && e.temps < seuilMs)`.
- [ ] **Step 4 : Lancer** `npm test` → tout vert.
- [ ] **Step 5 : Commit** `feat(core): types, rng à graine, clés de faits, formatage`

---

### Task 3 : Types de calcul déclaratifs

**Files:**
- Create: `src/core/typesCalcul.ts`
- Test: `tests/core/typesCalcul.test.ts`

**Interfaces:**
- Consumes : `Rng`, `Calcul`, `Op` (tâche 2).
- Produces :
```ts
export type Plage = readonly [number, number] | readonly number[]   // intervalle inclusif ou liste
export interface TypeDef { id: string; op: Op; a: Plage; b: Plage; ok?: (a: number, b: number) => boolean; inconnue?: 'b'; repetitions?: true }
export function genererCalcul(def: TypeDef, rng: Rng): Calcul
  // tire a et b dans les plages (rejet tant que ok(a,b) est faux, 10 000 essais max puis throw),
  // resultat = a+b | a-b | a*b, puis pour add/mul échange a et b une fois sur deux (affichage).
  // inconnue = def.inconnue ?? 'resultat'.
export function typeAccepte(def: TypeDef, c: Calcul): boolean
  // vrai si (a,b) ou, pour add/mul, (b,a) est dans les plages et passe ok ; même op ; même inconnue.
export function dansPlage(p: Plage, v: number): boolean
```

- [ ] **Step 1 : Tests**
```ts
const petits: TypeDef = { id: 't', op: 'add', a: [1, 5], b: [1, 5] }
test('génère dans les plages avec résultat correct', () => { const r = createRng(1); for (let i = 0; i < 500; i++) { const c = genererCalcul(petits, r); expect(c.a).toBeGreaterThanOrEqual(1); expect(c.a).toBeLessThanOrEqual(5); expect(c.resultat).toBe(c.a + c.b); expect(c.inconnue).toBe('resultat') } })
test('ok filtre', () => { const d: TypeDef = { id: 't', op: 'sub', a: [10, 12], b: [1, 9], ok: (a, b) => a - b <= 9 }; const r = createRng(3); for (let i = 0; i < 500; i++) { const c = genererCalcul(d, r); expect(c.resultat).toBeLessThanOrEqual(9); expect(c.resultat).toBeGreaterThanOrEqual(0) } })
test('liste comme plage', () => { const d: TypeDef = { id: 't', op: 'add', a: [11, 99], b: [10, 20, 30, 40, 50, 60, 70, 80, 90] as const }; /* 500 tirages : b % 10 === 0 */ })
test('add et mul échangent les opérandes à l affichage', () => { const d: TypeDef = { id: 't', op: 'mul', a: [2, 2], b: [7, 7] }; const r = createRng(5); const vus = new Set(Array.from({ length: 50 }, () => genererCalcul(d, r).a)); expect(vus).toEqual(new Set([2, 7])) })
test('sub n échange jamais', () => { /* op sub a:[9,9] b:[4,4] → a toujours 9 */ })
test('inconnue b', () => { const d: TypeDef = { id: 't', op: 'add', a: [1, 9], b: [1, 9], ok: (a, b) => a + b === 10, inconnue: 'b' }; const c = genererCalcul(d, createRng(2)); expect(c.inconnue).toBe('b'); expect(c.a + c.b).toBe(10) })
test('typeAccepte dans les deux sens pour mul', () => { const d: TypeDef = { id: 't', op: 'mul', a: [2, 2], b: [1, 9] }; expect(typeAccepte(d, { op: 'mul', a: 7, b: 2, resultat: 14, inconnue: 'resultat' })).toBe(true); expect(typeAccepte(d, { op: 'mul', a: 3, b: 7, resultat: 21, inconnue: 'resultat' })).toBe(false) })
test('typeAccepte respecte ok et inconnue', () => { /* complément accepté seulement si inconnue b ; sub (12,5) accepté mais (5,12) non */ })
test('contrainte impossible → throw', () => { expect(() => genererCalcul({ id: 't', op: 'add', a: [1, 1], b: [1, 1], ok: () => false }, createRng(1))).toThrow() })
```
- [ ] **Step 2 : Lancer** → échecs.
- [ ] **Step 3 : Implémenter** `src/core/typesCalcul.ts`.
- [ ] **Step 4 : Lancer** → vert.
- [ ] **Step 5 : Commit** `feat(core): types de calcul déclaratifs`

---

### Task 4 : Configuration des niveaux (fichier isolé) et tests exhaustifs

**Files:**
- Create: `src/core/levels.ts`
- Test: `tests/core/levels.test.ts`

**Interfaces:**
- Consumes : `TypeDef`, `genererCalcul` (tâche 3).
- Produces :
```ts
export type ParcoursSimpleId = `${Op}-${Taille}`
export interface NiveauDef { cibleMs: number; types: readonly string[] }   // ids de TypeDef
export const TYPES: Record<string, TypeDef>                                // tous les types, clé = id
export const NIVEAUX: Record<ParcoursSimpleId, readonly [NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef]>
export function niveau(parcours: ParcoursId, n: number): NiveauDef
  // n ∈ 1..8 ; pour mix-T : cibleMs = max des trois, types = union des trois (add-T, sub-T, mul-T) au niveau n
export const PARCOURS_AVANCES: readonly ParcoursId[] = ['add-3', 'sub-3', 'mul-3', 'mix-3']
```
Helpers internes : `u(x)`, `d(x)`, `c(x)`, `dizaines = [10..90]`, `centaines = [100..900]`, `tout(ids)` = les ids des niveaux 1 à 5.

- [ ] **Step 1 : Écrire `src/core/levels.ts`** en transcrivant § 2.3 de la spec, un `TypeDef` par ligne de niveau (ids suggérés : `add1.petits`, `add1.somme10`, `add1.complement10` (inconnue 'b', repetitions true), `add1.doubles`, `add1.sommeSup10`, `sub1.a5`, `sub1.a9`, `sub1.passage10`, `sub1.a13a16`, `sub1.a11a18`, `mul1.t12`, `mul1.t25`, `mul1.t34`, `mul1.t2a5`, `mul1.t67`, `mul1.t89`, `mul1.t2a9`, `add2.plus1sans`, `add2.plus1avec`, `add2.dizaines`, `add2.plus2sans`, `add2.plus2avec`, `sub2.*` idem, `mul2.fois10`, `mul2.dizaines2a5`, `mul2.doubles`, `mul2.sansRetenue`, `mul2.n11a19`, `mul2.n11a29`, `mul2.n11a49`, `mul2.n11a99`, `add3.centaines`, `add3.plus1`, `add3.dizaines`, `add3.plusCentaines`, `add3.plus2sans`, `add3.plus2avec`, `add3.plus3sans`, `add3.tout`, `sub3.*` idem, `mul3.fois100`, `mul3.centaines2a5`, `mul3.centaines2a9`, `mul3.fois2sans`, `mul3.fois2`, `mul3.fois3sans`, `mul3.dizaines2a5`, `mul3.n101a249`). Les niveaux « tout » référencent les ids des niveaux 1 à 5. Pour `mul-1`, les niveaux 7 et 8 référencent `mul1.t2a9` (pas « tout »). Cibles en ms (7 s → 7000).

- [ ] **Step 2 : Test exhaustif** `tests/core/levels.test.ts`. Une table `CONTRAINTES: Record<string, (c: Calcul) => void>` avec **une entrée par id de TYPES**, dont les assertions sont **recopiées de la spec § 2.3, pas du `ok` du type**. Trois exemples à reproduire pour tous :
```ts
'add2.plus1avec': (c) => { const [x, y] = c.a >= 10 ? [c.a, c.b] : [c.b, c.a]; expect(x).toBeGreaterThanOrEqual(10); expect(x).toBeLessThanOrEqual(99); expect(y).toBeGreaterThanOrEqual(1); expect(y).toBeLessThanOrEqual(9); expect(x % 10 + y).toBeGreaterThanOrEqual(10); expect(c.resultat).toBeLessThanOrEqual(99) },
'sub1.a13a16': (c) => { expect(c.a).toBeGreaterThanOrEqual(13); expect(c.a).toBeLessThanOrEqual(16); expect(c.b).toBeGreaterThanOrEqual(4); expect(c.b).toBeLessThanOrEqual(9); expect(c.resultat).toBeGreaterThanOrEqual(0); expect(c.resultat).toBeLessThanOrEqual(9) },
'mul3.fois2sans': (c) => { const [x, y] = c.a === 2 ? [c.b, c.a] : [c.a, c.b]; expect(y).toBe(2); expect(x).toBeGreaterThanOrEqual(100); expect(x).toBeLessThanOrEqual(999); for (const ch of String(x)) expect(Number(ch)).toBeLessThanOrEqual(4) },
```
Puis :
```ts
test('chaque type a une contrainte de test', () => { expect(Object.keys(CONTRAINTES).sort()).toEqual(Object.keys(TYPES).sort()) })
describe.each(Object.keys(TYPES))('type %s', (id) => {
  test('2000 tirages respectent la spec', () => { const r = createRng(hash(id)); for (let i = 0; i < 2000; i++) CONTRAINTES[id]!(genererCalcul(TYPES[id]!, r)) })
  test('résultat ≥ 0 et ≤ 4 chiffres', () => { /* 500 tirages */ })
})
test('tous les parcours ont 8 niveaux avec cible > 0 et types existants', () => { /* NIVEAUX : 9 parcours ; chaque types[i] ∈ TYPES */ })
test('niveau mixte : cible = max, types = union', () => { expect(niveau('mix-1', 6).cibleMs).toBe(5000); expect(niveau('mix-2', 5).cibleMs).toBe(14000); expect(niveau('mix-1', 1).types).toEqual(expect.arrayContaining([...niveau('add-1', 1).types, ...niveau('sub-1', 1).types, ...niveau('mul-1', 1).types])) })
test('cibles conformes à la spec (échantillon)', () => { expect(niveau('add-1', 8).cibleMs).toBe(3000); expect(niveau('sub-2', 5).cibleMs).toBe(14000); expect(niveau('mul-3', 8).cibleMs).toBe(18000); expect(niveau('add-3', 1).cibleMs).toBe(8000) })
test('pool ≥ 10 calculs distincts sauf complément à 10', () => { for (const id of Object.keys(TYPES)) { const r = createRng(1); const cles = new Set(Array.from({ length: 3000 }, () => cleFait(genererCalcul(TYPES[id]!, r)))); if (id === 'add1.complement10') { expect(cles.size).toBe(9); expect(TYPES[id]!.repetitions).toBe(true) } else expect(cles.size).toBeGreaterThanOrEqual(10) } })
```
- [ ] **Step 3 : Lancer** `npm test` → vert. Corriger `levels.ts` jusqu'à ce que chaque type passe sa contrainte de spec.
- [ ] **Step 4 : Commit** `feat(core): configuration des 12 parcours et tests de contraintes`

---

### Task 5 : Génération d'une série

**Files:**
- Create: `src/core/serie.ts`
- Test: `tests/core/serie.test.ts`

**Interfaces:**
- Consumes : `niveau`, `TYPES` (tâche 4), `genererCalcul`, `typeAccepte` (tâche 3), `cleFait`, `estMaitrise` (tâche 2).
- Produces :
```ts
export const TAILLE_SERIE = 10
export const MAX_FAITS_FAIBLES = 3
export function genererSerie(parcours: ParcoursId, n: number, rng: Rng, faits: Record<string, Fait> = {}): Calcul[]
```
Algorithme (ce que les tests ne fixent pas) :
1. `defs` = types du niveau. Si parcours mixte : grouper les defs par op, tirer 2 calculs par op (6), puis 4 parmi toutes les defs. Sinon : chaque calcul choisit une def uniformément puis `genererCalcul`.
2. Pondération (taille 1 seulement, parcours non mixte ou mixte) : faits faibles = clés de `faits` avec `tentatives > 0`, non maîtrisées, dont le calcul reconstruit (`cleFait` inversée : op, a, b) est accepté par au moins une def du niveau. En prendre `min(3, nb)` au hasard (`rng.shuffle`), les convertir en `Calcul` via la def qui les accepte (ordre d'affichage aléatoire), et les placer en premier. Puis compléter.
3. Unicité par `cleFait` : rejeter un tirage dont la clé est déjà présente (200 essais max), sauf si la def a `repetitions: true` : alors seulement interdire la même clé que le calcul précédent.
4. Mélanger la série finale (`rng.shuffle`) en préservant la règle « pas deux identiques de suite » (re-mélanger si violée, 20 fois max).

- [ ] **Step 1 : Tests**
```ts
const TOUS = (['add','sub','mul','mix'] as const).flatMap(op => ([1,2,3] as const).map(t => parcoursId(op, t)))
describe.each(TOUS)('parcours %s', (p) => {
  test.each([1,2,3,4,5,6,7,8])('niveau %i : 300 séries valides', (n) => { for (let s = 0; s < 300; s++) { const serie = genererSerie(p, n, createRng(s)); expect(serie).toHaveLength(10); const defs = niveau(p, n).types.map(id => TYPES[id]!); for (const c of serie) expect(defs.some(d => typeAccepte(d, c))).toBe(true); const cles = serie.map(cleFait); if (p === 'add-1' && n === 3) { for (let i = 1; i < 10; i++) expect(cles[i]).not.toBe(cles[i - 1]) } else expect(new Set(cles).size).toBe(10) } })
})
test('add-1 niveau 3 : tous les calculs sont des compléments à trou', () => { for (const c of genererSerie('add-1', 3, createRng(1))) { expect(c.inconnue).toBe('b'); expect(c.resultat).toBe(10) } })
test('add-1 niveau 6 contient parfois des compléments et parfois non', () => { /* sur 50 séries, au moins une avec inconnue b et une sans */ })
test('mixte : au moins 2 calculs par opération', () => { for (let s = 0; s < 200; s++) { const ops = genererSerie('mix-1', 3, createRng(s)).map(c => c.op); for (const op of ['add','sub','mul']) expect(ops.filter(o => o === op).length).toBeGreaterThanOrEqual(2) } })
test('pondération : les faits faibles du niveau sont inclus, 3 max', () => { const faits = { 'mul:6·7': faible(), 'mul:6·8': faible(), 'mul:7·7': faible(), 'mul:6·9': faible(), 'mul:2·3': faible() /* hors niveau 5 */ }; for (let s = 0; s < 100; s++) { const cles = genererSerie('mul-1', 5, createRng(s), faits).map(cleFait); const faibles = cles.filter(k => k in faits); expect(faibles.length).toBe(3); expect(cles).not.toContain('mul:2·3') } })
test('pondération : fait maîtrisé non forcé, fait jamais tenté non forcé', () => { /* faits = { 'mul:6·7': maitrise(), 'mul:6·8': faitVide() } ; sur 100 séries, 6·7 n'apparaît pas systématiquement (< 100 fois) */ })
test('pondération ignorée en 2 et 3 chiffres', () => { /* genererSerie('add-2', 1, rng, { 'add:3·4': faible() }) ne contient pas 3+4 */ })
test('déterministe', () => { expect(genererSerie('add-2', 5, createRng(9))).toEqual(genererSerie('add-2', 5, createRng(9))) })
```
`faible()` = `{ tentatives: 2, erreurs: 2, tempsCumule: 16000, derniers: [{ juste: false, temps: 8000 }, { juste: false, temps: 8000 }] }`.

- [ ] **Step 2 : Lancer** → échecs. **Step 3 : Implémenter.** **Step 4 : Lancer** → vert (ce test est long : viser < 20 s ; réduire à 100 séries par niveau si besoin).
- [ ] **Step 5 : Commit** `feat(core): génération de série avec unicité, mixte et pondération`

---

### Task 6 : Règle de validation

**Files:**
- Create: `src/core/validation.ts`
- Test: `tests/core/validation.test.ts`

**Interfaces:**
- Consumes : `niveau` (tâche 4), `Vitesse`.
- Produces :
```ts
export interface Reponse { calcul: Calcul; reponse: number; juste: boolean; tempsMs: number }
export interface Bilan { bonnes: number; tempsMedian: number; reussie: boolean; validee: boolean; raison: 'validee' | 'trop_lent' | 'trop_erreurs' }
export const FACTEUR_VITESSE: Record<Vitesse, number> = { tranquille: 1.5, normal: 1, rapide: 0.75 }
export function mediane(valeurs: readonly number[]): number     // throw si vide
export function cibleEffective(cibleMs: number, vitesse: Vitesse): number   // Math.round
export function evaluerSerie(reponses: readonly Reponse[], cibleEffectiveMs: number): Bilan
```
Règle : `reussie = bonnes >= 9` ; `validee = reussie && tempsMedian <= cible` ; `raison` : `validee` → `'validee'`, sinon `!reussie` → `'trop_erreurs'` (prioritaire), sinon `'trop_lent'`.

- [ ] **Step 1 : Tests**
```ts
test('médiane impaire et paire', () => { expect(mediane([3, 1, 2])).toBe(2); expect(mediane([4, 1, 3, 2])).toBe(2.5); expect(() => mediane([])).toThrow() })
test('une hésitation longue ne change pas la médiane', () => { expect(mediane([3000,3000,3000,3000,3000,3000,3000,3000,3000,60000])).toBe(3000) })
test('cible effective', () => { expect(cibleEffective(6000, 'tranquille')).toBe(9000); expect(cibleEffective(6000, 'normal')).toBe(6000); expect(cibleEffective(6000, 'rapide')).toBe(4500); expect(cibleEffective(7000, 'rapide')).toBe(5250) })
test('9/10 et médiane égale à la cible → validée', () => { expect(evaluerSerie(reps(9, 6000), 6000)).toMatchObject({ bonnes: 9, reussie: true, validee: true, raison: 'validee' }) })
test('10/10 trop lent → réussie non validée', () => { expect(evaluerSerie(reps(10, 6001), 6000)).toMatchObject({ reussie: true, validee: false, raison: 'trop_lent' }) })
test('8/10 rapide → trop d erreurs', () => { expect(evaluerSerie(reps(8, 1000), 6000)).toMatchObject({ reussie: false, validee: false, raison: 'trop_erreurs' }) })
test('8/10 et lent → raison trop_erreurs', () => { expect(evaluerSerie(reps(8, 9000), 6000).raison).toBe('trop_erreurs') })
test('les réponses fausses comptent dans la médiane', () => { /* 9 justes à 1000, 1 fausse à 100000 → médiane 1000 ; 9 justes à 1000 + 1 fausse à 1000 avec 5 justes à 9000 … construire pour montrer que le temps de la fausse entre dans le tri */ })
```
`reps(nbJustes, tempsMs)` construit 10 réponses.
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : Commit** `feat(core): règle de validation (médiane, vitesse)`

---

### Task 7 : Schéma de données et migration

**Files:**
- Create: `src/storage/schema.ts`
- Test: `tests/storage/schema.test.ts`

**Interfaces:**
- Produces :
```ts
export const VERSION = 1
export interface Reglages { parcoursAvances: boolean; vitesse: Vitesse }
export interface Donnees { version: 1; reglages: Reglages; dernierParcours: ParcoursId | null; series: Serie[]; faits: Record<string, Fait> }
export function donneesVides(): Donnees   // { version: 1, reglages: { parcoursAvances: false, vitesse: 'normal' }, dernierParcours: null, series: [], faits: {} }
export type ResultatMigration = { ok: true; donnees: Donnees } | { ok: false; erreur: 'json_invalide' | 'version_inconnue' | 'structure_invalide' }
export function migrer(brut: unknown): ResultatMigration
```
`migrer` : rejette tout ce qui n'est pas un objet avec `version` numérique ; `version > VERSION` → `version_inconnue` ; `version === 1` → valide la structure champ par champ (types, `niveau` 1-8, `bonnes` 0-10, `parcours` dans la liste, `vitesse` dans les 3 valeurs, chaque fait avec `derniers` de longueur ≤ 3) → sinon `structure_invalide`. Les champs manquants de `reglages` prennent la valeur par défaut (tolérance). Pas de version 0 : pas de migration ascendante à écrire aujourd'hui, mais la fonction est le point d'entrée unique.

- [ ] **Step 1 : Tests** : `migrer(donneesVides())` ok ; `migrer('x')`, `migrer(null)`, `migrer({})` → `structure_invalide` ; `migrer({ version: 2 })` → `version_inconnue` ; série avec `niveau: 9` → `structure_invalide` ; `reglages: {}` → complété par défaut ; fait avec `derniers` de 4 éléments → `structure_invalide` ; un objet complet valide avec 2 séries et 1 fait est rendu intact (`toEqual`).
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : Commit** `feat(storage): schéma versionné et validation`

---

### Task 8 : Store (localStorage injecté), enregistrement de série, export/import

**Files:**
- Create: `src/storage/store.ts`
- Test: `tests/storage/store.test.ts`

**Interfaces:**
- Consumes : `Donnees`, `donneesVides`, `migrer` (tâche 7), `majFait` (tâche 2).
- Produces :
```ts
export const CLE_STOCKAGE = 'battlemath.v1'
export interface StockageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export type Chargement = { donnees: Donnees; avertissement: null | 'stockage_indisponible' | 'donnees_corrompues' }
export function charger(stockage: StockageLike | null): Chargement
  // null ou getItem qui throw → vides + 'stockage_indisponible' ; JSON invalide ou migrer ko → vides + 'donnees_corrompues' (NE PAS écraser la valeur stockée)
export function sauver(stockage: StockageLike | null, d: Donnees): boolean   // false si impossible
export interface MajFaitEntree { cle: string; essai: Essai }
export function enregistrerSerie(d: Donnees, serie: Serie, faits: readonly MajFaitEntree[]): Donnees
  // pur : nouvelle Donnees avec la série ajoutée en fin, faits mis à jour via majFait, dernierParcours = serie.parcours
export function exporterJson(d: Donnees): string               // JSON.stringify(d, null, 2)
export function nomFichierExport(date: Date): string          // 'battlemath-2026-11-11.json'
export function importerJson(texte: string): ResultatMigration // JSON.parse protégé + migrer
export function reinitialiser(stockage: StockageLike | null): Donnees   // removeItem + vides
```
- [ ] **Step 1 : Tests** avec un faux stockage en mémoire (`Map`) et un faux qui throw :
  - charger sur vide → vides, avertissement null ; après sauver puis charger → `toEqual` ; stockage null → `stockage_indisponible` ; getItem qui throw → `stockage_indisponible` ; valeur `'{"version":'` → `donnees_corrompues` et `getItem` renvoie toujours la valeur corrompue après ; valeur `{"version":9}` → `donnees_corrompues`.
  - `enregistrerSerie` : ajoute la série, met à jour `dernierParcours`, applique 2 maj de faits (dont une sur un fait inexistant), ne mute pas l'entrée (`toBe` différent, original `toEqual` à sa copie).
  - `importerJson('pas du json')` → `json_invalide` ; `importerJson(exporterJson(d))` → ok et `toEqual(d)`.
  - `nomFichierExport(new Date(2026, 10, 11))` → `'battlemath-2026-11-11.json'`.
  - `reinitialiser` → removeItem appelé, retourne vides.
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : Commit** `feat(storage): store, enregistrement de série, export/import`

---

### Task 9 : Machine à états d'une série

**Files:**
- Create: `src/game/session.ts`
- Test: `tests/game/session.test.ts`

**Interfaces:**
- Consumes : `Calcul`, `reponseAttendue`, `cleFait` (tâche 2), `Reponse`, `evaluerSerie`, `Bilan` (tâche 6), `MajFaitEntree` (tâche 8).
- Produces :
```ts
export type Phase = 'question' | 'feedback' | 'correction' | 'fini'
export interface Session { readonly parcours: ParcoursId; readonly niveau: number; readonly cibleMs: number /* effective */; readonly calculs: readonly Calcul[]; readonly index: number; readonly phase: Phase; readonly reponses: readonly Reponse[]; readonly derniereReponse: number | null }
export function creerSession(parcours: ParcoursId, niveau: number, cibleMs: number, calculs: readonly Calcul[]): Session
export function calculCourant(s: Session): Calcul
export function repondre(s: Session, reponse: number, tempsMs: number): Session
  // phase 'question' uniquement (sinon retourne s inchangée) ; ajoute la Reponse ; juste → 'feedback', faux → 'correction' (derniereReponse = reponse)
export function avancer(s: Session): Session
  // depuis 'feedback' : index+1 et 'question', ou 'fini' si c'était le 10e ; sinon s inchangée
export function corriger(s: Session, recopie: number): Session
  // phase 'correction' uniquement : si recopie === attendu → comme avancer, sinon s inchangée
export function annulerCourant(s: Session, remplacement: Calcul): Session
  // phase 'question' uniquement : remplace calculs[index], sinon s inchangée
export function bilan(s: Session): Bilan            // throw si phase !== 'fini'
export function versSerie(s: Session, date: string): Serie   // tempsCible = s.cibleMs
export function majFaits(s: Session): MajFaitEntree[]        // vide si taille ≠ 1 ; sinon une entrée par réponse (cle, {juste, temps})
export function etatsPastilles(s: Session): ('vide' | 'juste' | 'faux' | 'en_cours')[]   // 10 éléments
```
Toutes les fonctions sont pures (retournent une nouvelle Session).

- [ ] **Step 1 : Tests** (avec 10 calculs fixes `mul` 1 chiffre) :
  - déroulé 10 justes → phase `fini`, `bilan().bonnes === 10`, `etatsPastilles` tout `juste`.
  - faux → `correction`, `derniereReponse` = la mauvaise ; `corriger(mauvaise)` → inchangé ; `corriger(bonne)` → `question` index+1 ; la réponse enregistrée garde `juste: false` et le temps d'origine.
  - `repondre` en `feedback` → inchangé (**Review Focus 2**) ; `repondre` en `correction` → inchangé ; `avancer` en `question` → inchangé.
  - `annulerCourant` en `question` remplace le calcul et ne touche pas aux réponses ; en `correction` → inchangé (**Review Focus 4**).
  - `bilan` avant la fin → throw.
  - `versSerie` : `niveau`, `parcours`, `bonnes`, `tempsMedian`, `tempsCible` = cibleMs, `date` transmise.
  - `majFaits` : 10 entrées pour `mul-1`, clé normalisée ; 0 entrée pour une session `add-2`.
  - `etatsPastilles` à mi-parcours : `['juste','faux','en_cours','vide',…]`.
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : Commit** `feat(game): machine à états de série`

---

### Task 10 : Progression dérivée et statistiques parent

**Files:**
- Create: `src/core/progression.ts`
- Test: `tests/core/progression.test.ts`

**Interfaces:**
- Consumes : `Serie`, `Fait`, `estMaitrise`, `NIVEAUX`, `PARCOURS_AVANCES`.
- Produces :
```ts
export type EtatNiveau = 'verrouille' | 'ouvert' | 'reussi' | 'valide'
export function etatNiveau(series: readonly Serie[], parcours: ParcoursId, n: number): EtatNiveau
  // valide si une série validée ; sinon reussi si une série réussie ; sinon ouvert si n === 1 ou niveau n-1 validé ; sinon verrouille
export function etatsParcours(series, parcours): EtatNiveau[]          // 8
export function niveauAtteint(series, parcours): number                // plus haut niveau validé, 0 sinon
export function prochainNiveau(series, parcours): number | null        // plus petit niveau non validé et ouvert ; null si 8 validé
export function totalEtoiles(series): number                           // 2 par niveau validé, 1 par niveau réussi non validé, tous parcours
export function parcoursVisibles(parcoursAvances: boolean): ParcoursId[]
export interface Synthese { parcours: ParcoursId; niveauAtteint: number; nbSeries: number; nbCalculs: number }
export function synthese(series): Synthese[]                           // un par parcours ayant ≥ 1 série
export function joursEntrainement(series): number                      // dates distinctes (AAAA-MM-JJ, heure locale)
export interface FaitARevoir { cle: string; libelle: string; tentatives: number; erreurs: number; tempsMoyen: number }
export function calculsARevoir(faits: Record<string, Fait>, op: Op, limite?: number): FaitARevoir[]
  // tentatives ≥ 3, op donnée, tri : taux d'erreur desc puis tempsMoyen desc ; libelle via formaterCalcul ; limite 10 par défaut
export interface NiveauARetravailler { niveau: number; tauxErreur: number; tempsMedian: number; nbSeries: number }
export function niveauxARetravailler(series, parcours): NiveauARetravailler[]
  // sur les 10 dernières séries du parcours, groupées par niveau, tauxErreur = 1 − bonnes/10 moyen, tempsMedian = médiane des tempsMedian ; tri tauxErreur desc
export type EtatFait = 'jamais_vu' | 'en_cours' | 'maitrise'
export function etatFait(faits, cle): EtatFait
```
- [ ] **Step 1 : Tests** avec un jeu de séries construit à la main (helper `serie(parcours, niveau, bonnes, tempsMedian, cible)`) :
  - aucune série → niveau 1 `ouvert`, 2 à 8 `verrouille` ; `prochainNiveau` = 1 ; `niveauAtteint` = 0.
  - niveau 1 validé, 2 réussi non validé → états `['valide','reussi','verrouille',…]`, `prochainNiveau` = 2, `totalEtoiles` = 3.
  - 8 validés → `prochainNiveau` null, `niveauAtteint` 8.
  - une série réussie puis une validée au même niveau → `valide`.
  - `parcoursVisibles(false)` ne contient aucun `-3` ; `(true)` en contient 4 ; ordre : add, sub, mul, mix par taille croissante.
  - `joursEntrainement` : 3 séries sur 2 dates → 2.
  - `calculsARevoir` : trie 3 faits comme attendu, exclut un fait à 2 tentatives et un fait d'une autre op, `tempsMoyen` = tempsCumule / tentatives.
  - `niveauxARetravailler` : 12 séries, seules les 10 dernières comptent.
  - `etatFait` : les trois états.
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : Commit** `feat(core): progression dérivée et statistiques`

---

### Task 11 : Coquille UI, routeur, styles, écran d'accueil

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/router.ts`, `src/ui/accueil.ts`, `src/ui/installation.ts` ; Modify: `src/main.ts`, `src/style.css`, `index.html`
- Test: `tests/ui/accueil.test.ts` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes : `charger`, `sauver` (tâche 8), progression (tâche 10), `niveau`, `PARCOURS_AVANCES`.
- Produces :
```ts
// dom.ts
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string | ((e: Event) => void)>, ...enfants: (Node | string)[]): HTMLElementTagNameMap[K]
// router.ts
export type Route = { nom: 'accueil' } | { nom: 'jeu'; parcours: ParcoursId; niveau: number } | { nom: 'parents' }
export function parserHash(hash: string): Route        // inconnu ou invalide → accueil
export function versHash(r: Route): string
export function demarrerRouteur(rendre: (r: Route) => void): void   // écoute hashchange, rend immédiatement
// accueil.ts
export interface ContexteApp { donnees: Donnees; avertissement: Chargement['avertissement']; sauver(d: Donnees): void; naviguer(r: Route): void; selection: { op: ParcoursOp; taille: Taille } }
export function rendreAccueil(ctx: ContexteApp): HTMLElement
// installation.ts
export function bannierInstallation(dejaInstallee: boolean, plateforme: 'ios' | 'android' | 'autre'): HTMLElement | null
export function detecterPlateforme(ua: string, standalone: boolean): { plateforme: 'ios' | 'android' | 'autre'; dejaInstallee: boolean }
```
Contenu de l'accueil (spec § 4.1) : titre + total d'étoiles ; bouton **Continuer** (`data-test="continuer"`) visible seulement si `dernierParcours` non null et `prochainNiveau` non null, libellé « Continuer : <nom parcours> niveau N » ; 4 boutons opération (Additions, Soustractions, Multiplications, Mixte) et 2 ou 3 boutons taille (« 1 chiffre », « 2 chiffres », « 3 chiffres » si `parcoursAvances`) ; grille 8 niveaux (`button.niveau[data-niveau][data-etat]`, verrouillé → `disabled`, étoiles ★ / ★★) ; lien « Parents » vers `#/parents` ; avertissement en haut si `avertissement` non null (« Les progrès ne pourront pas être enregistrés sur cet appareil. » / « Les données enregistrées sont illisibles, on repart de zéro. »). Bannière d'installation si non installée (texte iOS : « Pour garder tes progrès, ajoute BattleMath à l'écran d'accueil : Partager puis Sur l'écran d'accueil. »), fermable, mémorisée fermée en localStorage clé `battlemath.banniere`.

Styles (`style.css`) : variables de couleur sur `:root` et `@media (prefers-color-scheme: dark)` ; `html { touch-action: manipulation; -webkit-text-size-adjust: 100% }` ; `body { user-select: none; -webkit-user-select: none; font-family: system-ui }` ; boutons ≥ 56 px de haut ; largeur max 480 px centrée.

- [ ] **Step 1 : Tests** (happy-dom) :
  - `parserHash('#/jeu/add-2/5')` → `{ nom: 'jeu', parcours: 'add-2', niveau: 5 }` ; `'#/jeu/add-9/5'`, `'#/jeu/add-2/0'`, `'#/x'` → accueil ; `versHash` inverse.
  - `rendreAccueil` sans série : pas de bouton continuer, 8 `button.niveau`, niveau 1 `data-etat="ouvert"` non disabled, niveau 2 disabled, 2 boutons taille.
  - avec `parcoursAvances: true` → 3 boutons taille ; avec `dernierParcours: 'mul-1'` et niveau 1 validé → bouton continuer dont le texte contient « niveau 2 », clic → `naviguer` appelé avec `{ nom: 'jeu', parcours: 'mul-1', niveau: 2 }`.
  - clic sur niveau ouvert → `naviguer` jeu ; `avertissement: 'stockage_indisponible'` → texte d'avertissement présent.
  - `detecterPlateforme(uaIphone, false)` → ios, non installée ; `(ua, true)` → dejaInstallee.
- [ ] **Step 2-4 : rouge, implémenter, vert.**
- [ ] **Step 5 : `src/main.ts`** : `charger(localStorageOuNull())`, construit `ctx`, `demarrerRouteur` qui vide `#app` et monte l'écran selon la route (jeu et parents : placeholder « bientôt » pour cette tâche). `localStorageOuNull()` : try `window.localStorage` catch → null.
- [ ] **Step 6 : Vérifier** `npm run dev`, ouvrir sur mobile ou en mode responsive : accueil lisible en portrait, mode sombre OK, aucun zoom au double-tap. `npm run build` sans erreur.
- [ ] **Step 7 : Commit** `feat(ui): coquille, routeur, accueil`

---

### Task 12 : Pavé numérique, écran de jeu, fin de série

**Files:**
- Create: `src/ui/pave.ts`, `src/ui/jeu.ts` ; Modify: `src/main.ts`, `src/style.css`
- Test: `tests/ui/pave.test.ts`, `tests/ui/jeu.test.ts` (happy-dom)

**Interfaces:**
- Consumes : session (tâche 9), `genererSerie` (tâche 5), `niveau`, `cibleEffective`, `enregistrerSerie`, `formaterCalcul`, `formaterSecondes`, `ContexteApp`.
- Produces :
```ts
// pave.ts
export interface Pave { element: HTMLElement; valeur(): string; effacer(): void; vider(): void; setActif(actif: boolean): void }
export function creerPave(opts: { onValider(valeur: number): void; onChange(valeur: string): void; maxChiffres?: number /* 4 */ }): Pave
  // 12 touches : 1-9, Effacer, 0, Valider ; Valider disabled si valeur vide ; '0' ignoré si valeur vide ; au-delà de maxChiffres ignoré
// jeu.ts
export interface Horloge { now(): number }
export interface Visibilite { onCache(cb: () => void): () => void }   // retourne un désabonnement
export interface EcranJeu { element: HTMLElement; session(): Session }   // session() sert aux tests
export function rendreJeu(ctx: ContexteApp, parcours: ParcoursId, n: number, deps?: { horloge?: Horloge; visibilite?: Visibilite; rng?: Rng; delaiFeedbackMs?: number }): EcranJeu
```
Comportement (spec § 4.2, § 4.3, § 3) :
- Si le niveau est `verrouille` → retour accueil.
- Série : `genererSerie(parcours, n, rng ?? createRng(Date.now()), donnees.faits)` ; cible effective = `cibleEffective(niveau(parcours, n).cibleMs, reglages.vitesse)`.
- En-tête : 10 pastilles (`.pastille[data-etat]`), ligne « Objectif : moins de X secondes par calcul » (X = cible effective arrondie à l'entier supérieur, en secondes), bouton Accueil discret (`data-test="accueil"`).
- `t0 = horloge.now()` à chaque affichage d'un calcul en phase question. Valider → `repondre(s, valeur, now − t0)`.
- Juste : classe `.juste` sur la réponse, après `delaiFeedbackMs` (400) → `avancer`.
- Faux : réponse barrée + bonne réponse en grisé (`.attendu`), pavé vidé, l'enfant retape ; `corriger` ; pas de chrono.
- Visibilité cachée en phase `question` → `annulerCourant(s, genererSerie(parcours, n, rng, faits)[0])` et `t0` réinitialisé à la prochaine visibilité ; en autre phase → rien.
- Fin : `bilan`, `enregistrerSerie(donnees, versSerie(s, new Date().toISOString()), majFaits(s))` → `ctx.sauver` ; écran de fin : score « 9 sur 10 », « Ton temps : 4,8 s par calcul (objectif 6 s) », verdict selon `raison` (textes de la spec § 4.3), boutons Rejouer (`#/jeu/p/n`), Niveau suivant (si `etatNiveau(…, n+1) !== 'verrouille'` et n < 8), Accueil.
- Quitter avant la fin (Accueil, hashchange) : rien n'est sauvé, désabonner visibilité.

- [ ] **Step 1 : Tests pavé** : taper 1,2,3 → `'123'` ; Effacer → `'12'` ; 0 initial ignoré (**Review Focus 1**) ; 5e chiffre ignoré ; Valider disabled quand vide, `onValider(123)` sinon ; `vider()`.
- [ ] **Step 2 : Tests jeu** avec horloge et visibilité factices, `rng = createRng(1)`, délais 0 :
  - 10 pastilles, texte « Objectif » présent avec la cible effective (reglages vitesse `tranquille` → 1,5 ×).
  - Répondre juste à tous les calculs (`reponseAttendue(calculCourant(ecran.session()))`, saisie via les touches du pavé puis Valider) → écran de fin, `ctx.sauver` appelé une fois avec 1 série `validee: true` et, pour `mul-1`, 10 faits.
  - Réponse fausse → `.attendu` visible, retaper la mauvaise → reste, retaper la bonne → calcul suivant ; série finale `bonnes: 9`.
  - `onCache` déclenché en phase question → le calcul affiché change, pas de réponse ajoutée ; en phase correction → inchangé.
  - Clic Accueil à mi-série → `ctx.sauver` jamais appelé, `naviguer(accueil)`.
  - Niveau verrouillé → `naviguer(accueil)` immédiat.
- [ ] **Step 3-4 : rouge, implémenter, vert.** Brancher la route `jeu` dans `main.ts` (visibilité = `document.visibilitychange` avec `document.hidden`).
- [ ] **Step 5 : Vérifier sur téléphone** (`npm run dev -- --host`) : clavier système jamais ouvert, touches au pouce, retour faux lisible, série complète enregistrée (accueil montre l'étoile).
- [ ] **Step 6 : Commit** `feat(ui): pavé, écran de jeu, fin de série`

---

### Task 13 : Écran Parents

**Files:**
- Create: `src/ui/parents.ts`, `src/ui/graphiques.ts`, `src/ui/grilleFaits.ts` ; Modify: `src/main.ts`
- Test: `tests/ui/graphiques.test.ts`, `tests/ui/grilleFaits.test.ts`, `tests/ui/parents.test.ts` (happy-dom)

**Interfaces:**
- Consumes : progression (tâche 10), store export/import/reinitialiser (tâche 8), `formaterSecondes`, `ContexteApp`.
- Produces :
```ts
// graphiques.ts
export function graphiqueReussite(series: readonly Serie[]): SVGSVGElement   // 1 point par série (circle.point[data-niveau][data-validee]), y = bonnes×10 %, axe 0-100
export function graphiqueTemps(series: readonly Serie[]): SVGSVGElement      // 1 point par série, + 1 segment line.cible par série (tempsCible), axe en secondes
// grilleFaits.ts
export function grilleFaits(faits: Record<string, Fait>, op: Op): HTMLElement
  // add/mul : 9×9, cases (a,b) avec a ≤ b seulement (td[data-cle][data-etat]) ; sub : lignes résultat 0-9 × colonnes b 1-9, clé sub:(r+b)·b
// parents.ts
export interface Verrou { estOuvert(): boolean; ouvrir(): void }
export function creerVerrouSession(stockage: StockageLike | null): Verrou   // sessionStorage clé 'battlemath.parent'
export function genererQuestionVerrou(rng: Rng): { question: string; reponse: number }   // a ∈ 21-49, b ∈ 6-9, 'Combien font 37 × 8 ?'
export function rendreParents(ctx: ContexteApp, deps: { verrou: Verrou; rng: Rng; partager?: (fichier: File) => Promise<boolean>; telecharger: (nom: string, contenu: string) => void; confirmer: (msg: string) => boolean }): HTMLElement
```
Contenu (spec § 4.4) : si verrou fermé → question + champ numérique + bouton (3 tentatives puis nouvelle question). Sinon : sélecteur de parcours (`select[data-test="parcours"]`, défaut `dernierParcours` ou `add-1`, seulement les parcours visibles + ceux ayant des séries) ; graphiques 1 et 2 du parcours ; synthèse (tableau : parcours, niveau atteint, séries, calculs) + « Jours d'entraînement : N » ; « Calculs à revoir » (liste `li` « 7 × 8 : 3 erreurs sur 5, 6,2 s en moyenne ») + grille pour taille 1, « Niveaux à retravailler » pour tailles 2-3 ; réglages : vitesse (3 boutons radio), parcours avancés (case à cocher), Exporter (`partager` si dispo et `navigator.canShare({files})`, sinon `telecharger`), Importer (`input[type=file]`, `importerJson`, `confirmer('Remplacer tous les progrès par ce fichier ?')`, erreur affichée sinon), Remise à zéro (`confirmer('Effacer toute la progression ? Cette action est définitive.')` → `reinitialiser`).

- [ ] **Step 1 : Tests graphiques** : 0 série → svg sans point et texte « Pas encore de série » ; 3 séries → 3 `circle.point`, `data-validee` correct, 3 `line.cible` avec y correspondant à `tempsCible`.
- [ ] **Step 2 : Tests grille** : mul → 45 cases ; `data-etat` maitrise / en_cours / jamais_vu selon `faits` ; sub → 90 cases, case (résultat 7, b 5) a `data-cle="sub:12·5"`.
- [ ] **Step 3 : Tests parents** : verrou fermé → la synthèse n'est pas rendue ; mauvaise réponse → toujours fermé ; bonne réponse → `verrou.ouvrir` appelé et contenu rendu ; `genererQuestionVerrou` dans les plages sur 200 tirages ; changement de vitesse → `ctx.sauver` avec `vitesse: 'tranquille'` ; export → `telecharger('battlemath-….json', json)` quand `partager` absent ; import d'un texte invalide → message d'erreur, `sauver` non appelé ; import valide + confirmer true → `sauver` avec les données importées ; reset + confirmer false → rien.
- [ ] **Step 4-5 : rouge, implémenter, vert.** Brancher dans `main.ts` (`partager` via `navigator.share`, `telecharger` via `Blob` + `<a download>`, `confirmer` = `window.confirm`).
- [ ] **Step 6 : Vérifier sur téléphone** : export ouvre la feuille de partage, import depuis Fichiers fonctionne.
- [ ] **Step 7 : Commit** `feat(ui): écran parents, graphiques SVG, grille de faits`

---

### Task 14 : PWA (manifest, service worker, icônes, hors ligne)

**Files:**
- Modify: `vite.config.ts`, `index.html`, `src/main.ts` ; Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png`, `public/icons/maskable-512.png`

- [ ] **Step 1 : Installer** `npm install -D vite-plugin-pwa`.
- [ ] **Step 2 : Configurer** dans `vite.config.ts` : `VitePWA({ registerType: 'autoUpdate', includeAssets: ['icons/*.png'], manifest: { name: 'BattleMath', short_name: 'BattleMath', lang: 'fr', start_url: '/BattleMath/', scope: '/BattleMath/', display: 'standalone', orientation: 'portrait', background_color: …, theme_color: …, icons: [192, 512, maskable 512] }, workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] } })`. Dans `index.html` : `<link rel="apple-touch-icon" href="/BattleMath/icons/apple-touch-icon.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="theme-color">` (clair et sombre).
- [ ] **Step 3 : Icônes** : générer un PNG simple (fond uni, « ×+ » ou « BM » en blanc) aux 4 tailles, par script Node avec un canvas minimal ou un SVG converti ; pas de dépendance d'exécution.
- [ ] **Step 4 : Enregistrer le SW** dans `main.ts` via `import { registerSW } from 'virtual:pwa-register'` ; `registerSW({ immediate: true })`.
- [ ] **Step 5 : Vérifier** `npm run build && npm run preview` : Lighthouse PWA installable ; couper le réseau dans les outils de dev → rechargement OK ; `dist/manifest.webmanifest` contient `start_url: '/BattleMath/'`.
- [ ] **Step 6 : Commit** `feat: PWA installable et hors ligne`

---

### Task 15 : Déploiement GitHub Pages et README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1 : Workflow** : déclencheur `push` sur `main` ; jobs : `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages` ; permissions `pages: write`, `id-token: write`. Pas de secret.
- [ ] **Step 2 : README** (français, court) : but, `npm run dev`, `npm test`, où ajuster les niveaux (`src/levels.ts`, temps en ms), comment déployer (push sur main, activer Pages → Source « GitHub Actions » une fois dans les réglages du dépôt), comment installer sur iPhone/Android.
- [ ] **Step 3 : Vérifier** `npm test` et `npm run build` verts en local.
- [ ] **Step 4 : Commit** `chore: déploiement GitHub Pages et README`
- [ ] **Step 5 : Mise en ligne** (hors plan automatique, à faire avec l'utilisateur) : créer le dépôt `BattleMath` sur GitHub, `git remote add origin …`, `git push -u origin main`, activer Pages (Source : GitHub Actions), ouvrir `https://<user>.github.io/BattleMath/` sur le téléphone, installer, jouer une série, vérifier le hors ligne.

---

## Auto-revue

- **Couverture spec** : § 2 → tâches 3-5 ; § 3 → 6, 9, 12 ; § 4.1 → 11 ; § 4.2-4.3 → 12 ; § 4.4 → 13 ; § 5 → 7, 8, 9 (`majFaits`), 10 ; § 5.5 → 11 (bannière) ; § 6 → 1, 14, 15. Réglage de vitesse → 6, 12, 13. Parcours avancés → 10, 11, 13.
- **Cohérence des noms** : `cleFait`, `reponseAttendue`, `genererCalcul`, `typeAccepte`, `niveau`, `TYPES`, `genererSerie`, `evaluerSerie`, `cibleEffective`, `enregistrerSerie`, `versSerie`, `majFaits`, `etatNiveau`, `prochainNiveau`, `rendreAccueil`, `rendreJeu`, `rendreParents` utilisés à l'identique entre tâches.
- **Review Focus** : 1 → tâches 12 (pavé) ; 2 et 4 → tâche 9 ; 3 → tâche 8 ; 5 → tâche 6. Tous ont un test nommé.
