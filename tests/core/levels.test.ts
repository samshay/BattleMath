import { describe, expect, test } from 'vitest'
import { NIVEAUX, PARCOURS_AVANCES, TYPES, niveau } from '../../src/core/levels'
import { genererCalcul } from '../../src/core/typesCalcul'
import { createRng } from '../../src/core/rng'
import { cleFait, reponseAttendue } from '../../src/core/faits'
import type { Calcul, ParcoursId } from '../../src/core/types'

// Restatement indépendant de la spec (section 2.3), sans réutiliser les `ok` des types.
const u = (x: number): number => x % 10
const d = (x: number): number => Math.floor(x / 10) % 10
const h = (x: number): number => Math.floor(x / 100)
const dans = (x: number, lo: number, hi: number): boolean => x >= lo && x <= hi
const dizaine = (x: number): boolean => dans(x, 10, 90) && x % 10 === 0
const centaine = (x: number): boolean => dans(x, 100, 900) && x % 100 === 0
const chiffresMax = (x: number, m: number): boolean => [...String(x)].every((ch) => Number(ch) <= m)

type Spec = (a: number, b: number) => boolean

// + et × : l'ordre d'affichage est aléatoire, la spec est vraie pour au moins un ordre.
const S =
  (f: Spec) =>
  (c: Calcul): void => {
    expect(f(c.a, c.b) || f(c.b, c.a)).toBe(true)
  }
// − : a est toujours le premier opérande.
const F =
  (f: Spec) =>
  (c: Calcul): void => {
    expect(f(c.a, c.b)).toBe(true)
  }

const CONTRAINTES: Record<string, (c: Calcul) => void> = {
  // Additions 1 chiffre
  'add1.petits': S((a, b) => dans(a, 1, 5) && dans(b, 1, 5)),
  'add1.somme10': S((a, b) => dans(a, 1, 9) && dans(b, 1, 5) && a + b <= 10),
  'add1.complement10': (c) => {
    expect(c.inconnue).toBe('b')
    expect(dans(c.a, 1, 9)).toBe(true)
    expect(c.resultat).toBe(10)
    expect(c.a + c.b).toBe(10)
  },
  'add1.doubles': S((a, b) => dans(a, 1, 9) && (b === a || (dans(a, 1, 8) && b === a + 1))),
  'add1.sommeSup10': S((a, b) => dans(a, 2, 9) && dans(b, 2, 9) && a + b >= 11),
  // Soustractions 1 chiffre
  'sub1.a5': F((a, b) => dans(a, 1, 5) && dans(b, 1, a)),
  'sub1.a9': F((a, b) => dans(a, 1, 9) && dans(b, 1, a)),
  'sub1.passage10': F((a, b) => dans(a, 10, 12) && dans(b, 1, 9) && dans(a - b, 0, 9)),
  'sub1.a13a16': F((a, b) => dans(a, 13, 16) && dans(b, 4, 9) && dans(a - b, 0, 9)),
  'sub1.a11a18': F((a, b) => dans(a, 11, 18) && dans(b, 2, 9) && dans(a - b, 0, 9)),
  // Multiplications 1 chiffre
  'mul1.t12': S((a, b) => [1, 2].includes(a) && dans(b, 1, 9)),
  'mul1.t25': S((a, b) => [2, 5].includes(a) && dans(b, 1, 9)),
  'mul1.t34': S((a, b) => [3, 4].includes(a) && dans(b, 1, 9)),
  'mul1.t2a5': S((a, b) => dans(a, 2, 5) && dans(b, 1, 9)),
  'mul1.t67': S((a, b) => [6, 7].includes(a) && dans(b, 1, 9)),
  'mul1.t89': S((a, b) => [8, 9].includes(a) && dans(b, 1, 9)),
  'mul1.t2a9': S((a, b) => dans(a, 2, 9) && dans(b, 1, 9)),
  // Additions 2 chiffres
  'add2.plus1sans': S((a, b) => dans(a, 10, 99) && dans(b, 1, 9) && u(a) + b <= 9 && a + b <= 99),
  'add2.plus1avec': S((a, b) => dans(a, 10, 99) && dans(b, 1, 9) && u(a) + b >= 10 && a + b <= 99),
  'add2.dizaines': S((a, b) => dans(a, 11, 99) && a % 10 !== 0 && dizaine(b) && a + b <= 99),
  'add2.plus2sans': S((a, b) => dans(a, 10, 99) && dans(b, 10, 99) && u(a) + u(b) <= 9 && a + b <= 99),
  'add2.plus2avec': S((a, b) => dans(a, 10, 99) && dans(b, 10, 99) && u(a) + u(b) >= 10 && a + b <= 99),
  // Soustractions 2 chiffres
  'sub2.plus1sans': F((a, b) => dans(a, 10, 99) && dans(b, 1, 9) && u(a) >= b && a - b >= 0),
  'sub2.plus1avec': F((a, b) => dans(a, 10, 99) && dans(b, 1, 9) && u(a) < b && a - b >= 0),
  'sub2.dizaines': F((a, b) => dans(a, 11, 99) && a % 10 !== 0 && dizaine(b) && b < a),
  'sub2.plus2sans': F((a, b) => dans(a, 10, 99) && dans(b, 10, 99) && u(a) >= u(b) && b <= a),
  'sub2.plus2avec': F((a, b) => dans(a, 10, 99) && dans(b, 10, 99) && u(a) < u(b) && b < a),
  // Multiplications 2 chiffres
  'mul2.fois10': S((a, b) => dans(a, 2, 20) && b === 10),
  'mul2.dizaines2a5': S((a, b) => dizaine(a) && dans(b, 2, 5)),
  'mul2.doubles': S((a, b) => dans(a, 11, 49) && b === 2),
  'mul2.sansRetenue': S((a, b) => dans(a, 11, 49) && dans(b, 2, 4) && u(a) * b <= 9 && d(a) * b <= 9),
  'mul2.n11a19': S((a, b) => dans(a, 11, 19) && dans(b, 2, 5)),
  'mul2.n11a29': S((a, b) => dans(a, 11, 29) && dans(b, 2, 6)),
  'mul2.n11a49': S((a, b) => dans(a, 11, 49) && dans(b, 2, 9)),
  'mul2.n11a99': S((a, b) => dans(a, 11, 99) && dans(b, 2, 9)),
  // Additions 3 chiffres
  'add3.centaines': S((a, b) => centaine(a) && centaine(b) && a + b <= 999),
  'add3.plus1': S((a, b) => dans(a, 100, 999) && dans(b, 1, 9) && u(a) + b <= 9 && a + b <= 999),
  'add3.dizaines': S((a, b) => dans(a, 100, 999) && dizaine(b) && a + b <= 999),
  'add3.plusCentaines': S((a, b) => dans(a, 100, 999) && centaine(b) && a + b <= 999),
  'add3.plus2sans': S(
    (a, b) => dans(a, 100, 999) && dans(b, 10, 99) && u(a) + u(b) <= 9 && d(a) + d(b) <= 9 && a + b <= 999,
  ),
  'add3.plus2avec': S(
    (a, b) => dans(a, 100, 999) && dans(b, 10, 99) && (u(a) + u(b) >= 10 || d(a) + d(b) >= 10) && a + b <= 999,
  ),
  'add3.plus3sans': S(
    (a, b) =>
      dans(a, 100, 999) && dans(b, 100, 999) && u(a) + u(b) <= 9 && d(a) + d(b) <= 9 && h(a) + h(b) <= 9 && a + b <= 999,
  ),
  'add3.tout': S((a, b) => dans(a, 100, 999) && dans(b, 100, 999) && a + b <= 999),
  // Soustractions 3 chiffres
  'sub3.centaines': F((a, b) => centaine(a) && centaine(b) && b <= a),
  'sub3.plus1': F((a, b) => dans(a, 100, 999) && dans(b, 1, 9) && u(a) >= b && a - b >= 0),
  'sub3.dizaines': F((a, b) => dans(a, 100, 999) && dizaine(b) && b <= a),
  'sub3.plusCentaines': F((a, b) => dans(a, 100, 999) && centaine(b) && b <= a),
  'sub3.plus2sans': F((a, b) => dans(a, 100, 999) && dans(b, 10, 99) && u(a) >= u(b) && d(a) >= d(b) && a - b >= 0),
  'sub3.plus2avec': F(
    (a, b) => dans(a, 100, 999) && dans(b, 10, 99) && (u(a) < u(b) || d(a) < d(b)) && b <= a,
  ),
  'sub3.plus3sans': F(
    (a, b) => dans(a, 100, 999) && dans(b, 100, 999) && u(a) >= u(b) && d(a) >= d(b) && h(a) >= h(b) && b <= a,
  ),
  'sub3.tout': F((a, b) => dans(a, 100, 999) && dans(b, 100, 999) && b <= a),
  // Multiplications 3 chiffres
  'mul3.fois100': S((a, b) => dans(a, 2, 20) && b === 100),
  'mul3.centaines2a5': S((a, b) => centaine(a) && dans(b, 2, 5)),
  'mul3.centaines2a9': S((a, b) => centaine(a) && dans(b, 2, 9)),
  'mul3.fois2sans': S((a, b) => dans(a, 100, 999) && chiffresMax(a, 4) && b === 2),
  'mul3.fois2': S((a, b) => dans(a, 100, 999) && b === 2),
  'mul3.fois3sans': S((a, b) => dans(a, 100, 999) && chiffresMax(a, 3) && b === 3),
  'mul3.dizaines2a5': S((a, b) => dans(a, 110, 490) && a % 10 === 0 && dans(b, 2, 5)),
  'mul3.n101a249': S((a, b) => dans(a, 101, 249) && dans(b, 2, 5)),
}

function hash(id: string): number {
  let s = 7
  for (let i = 0; i < id.length; i++) s += id.charCodeAt(i) * (i + 1)
  return s
}

const attendu = (c: Calcul): number => (c.op === 'add' ? c.a + c.b : c.op === 'sub' ? c.a - c.b : c.a * c.b)

test('chaque type a une contrainte de test', () => {
  expect(Object.keys(CONTRAINTES).sort()).toEqual(Object.keys(TYPES).sort())
})

describe.each(Object.keys(TYPES))('type %s', (id) => {
  test('2000 tirages respectent la spec', () => {
    const r = createRng(hash(id))
    for (let i = 0; i < 2000; i++) {
      const calcul = genererCalcul(TYPES[id]!, r)
      expect(calcul.resultat).toBe(attendu(calcul))
      CONTRAINTES[id]!(calcul)
    }
  })

  test('résultat ≥ 0 et ≤ 4 chiffres', () => {
    const r = createRng(hash(id) + 1)
    for (let i = 0; i < 500; i++) {
      const { resultat } = genererCalcul(TYPES[id]!, r)
      expect(resultat).toBeGreaterThanOrEqual(0)
      expect(resultat).toBeLessThanOrEqual(9999)
    }
  })
})

test('tous les parcours ont 8 niveaux avec cible > 0 et types existants', () => {
  const ids = Object.keys(NIVEAUX)
  expect(ids).toHaveLength(9)
  for (const p of ids) {
    const niveaux = NIVEAUX[p as keyof typeof NIVEAUX]
    expect(niveaux).toHaveLength(8)
    for (const nv of niveaux) {
      expect(nv.cibleMs).toBeGreaterThan(0)
      expect(nv.types.length).toBeGreaterThan(0)
      for (const t of nv.types) expect(TYPES[t]).toBeDefined()
    }
  }
})

test('niveaux « tout » : types des niveaux 1 à 5', () => {
  for (const p of ['add-1', 'sub-1', 'add-2', 'sub-2'] as const) {
    const base = NIVEAUX[p].slice(0, 5).flatMap((nv) => nv.types)
    for (const n of [6, 7, 8]) expect(niveau(p, n).types).toEqual(base)
  }
  expect(niveau('mul-1', 7).types).toEqual(['mul1.t2a9'])
  expect(niveau('mul-1', 8).types).toEqual(['mul1.t2a9'])
})

test('niveau hors 1..8 refusé', () => {
  expect(() => niveau('add-1', 0)).toThrow()
  expect(() => niveau('add-1', 9)).toThrow()
})

test('niveau mixte : cible = max, types = union', () => {
  // mul-1 niveau 6 = 7 s (tables 8 et 9) donc max(5, 5, 7) = 7 s
  expect(niveau('mix-1', 6).cibleMs).toBe(7000)
  expect(niveau('mix-2', 5).cibleMs).toBe(14000)
  expect(niveau('mix-1', 1).types).toEqual(
    expect.arrayContaining([...niveau('add-1', 1).types, ...niveau('sub-1', 1).types, ...niveau('mul-1', 1).types]),
  )
  for (const t of [1, 2, 3] as const)
    for (let n = 1; n <= 8; n++) {
      const m = niveau(`mix-${t}` as ParcoursId, n)
      const trois = (['add', 'sub', 'mul'] as const).map((o) => niveau(`${o}-${t}` as ParcoursId, n))
      expect(m.cibleMs).toBe(Math.max(...trois.map((x) => x.cibleMs)))
      expect([...m.types].sort()).toEqual([...new Set(trois.flatMap((x) => x.types))].sort())
    }
})

test('cibles conformes à la spec (échantillon)', () => {
  expect(niveau('add-1', 8).cibleMs).toBe(3000)
  expect(niveau('sub-2', 5).cibleMs).toBe(14000)
  expect(niveau('mul-3', 8).cibleMs).toBe(18000)
  expect(niveau('add-3', 1).cibleMs).toBe(8000)
  expect(niveau('mul-1', 6).cibleMs).toBe(7000)
  expect(niveau('mul-2', 8).cibleMs).toBe(15000)
})

test('parcours avancés', () => {
  expect(PARCOURS_AVANCES).toEqual(['add-3', 'sub-3', 'mul-3', 'mix-3'])
})

test('pool ≥ 10 calculs distincts sauf complément à 10', () => {
  for (const id of Object.keys(TYPES)) {
    const r = createRng(1)
    const calculs = Array.from({ length: 3000 }, () => genererCalcul(TYPES[id]!, r))
    const cles = new Set(calculs.map(cleFait))
    if (id === 'add1.complement10') {
      // 9 calculs distincts (réponses 1..9) ; cleFait normalise l'ordre de l'addition
      // et regroupe donc a+b et b+a : seulement 5 clés.
      expect(new Set(calculs.map(reponseAttendue)).size).toBe(9)
      expect(cles.size).toBe(5)
      expect(TYPES[id]!.repetitions).toBe(true)
    } else {
      expect(cles.size).toBeGreaterThanOrEqual(10)
    }
  }
})
