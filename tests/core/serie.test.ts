import { describe, expect, test } from 'vitest'
import { createRng } from '../../src/core/rng'
import { parcoursId, type Calcul, type Fait } from '../../src/core/types'
import { niveau, TYPES } from '../../src/core/levels'
import { typeAccepte } from '../../src/core/typesCalcul'
import { cleFait, faitVide } from '../../src/core/faits'
import { genererRemplacement, genererSerie, TAILLE_SERIE, MAX_FAITS_FAIBLES } from '../../src/core/serie'

const faible = (): Fait => ({
  tentatives: 2,
  erreurs: 2,
  tempsCumule: 16000,
  derniers: [
    { juste: false, temps: 8000 },
    { juste: false, temps: 8000 },
  ],
})
const maitrise = (): Fait => ({
  tentatives: 3,
  erreurs: 0,
  tempsCumule: 6000,
  derniers: [
    { juste: true, temps: 2000 },
    { juste: true, temps: 2000 },
    { juste: true, temps: 2000 },
  ],
})
const cleUnicite = (c: Calcul): string => (c.inconnue === 'b' ? `${cleFait(c)}?${c.a}` : cleFait(c))

const TOUS = (['add', 'sub', 'mul', 'mix'] as const).flatMap((op) =>
  ([1, 2, 3] as const).map((t) => parcoursId(op, t)),
)

test('constantes', () => {
  expect(TAILLE_SERIE).toBe(10)
  expect(MAX_FAITS_FAIBLES).toBe(3)
})

describe.each(TOUS)('parcours %s', (p) => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('niveau %i : 300 séries valides', (n) => {
    const defs = niveau(p, n).types.map((id) => TYPES[id]!)
    for (let s = 0; s < 300; s++) {
      const serie = genererSerie(p, n, createRng(s))
      expect(serie).toHaveLength(10)
      for (const c of serie) expect(defs.some((d) => typeAccepte(d, c))).toBe(true)
      const cles = serie.map(cleUnicite)
      if (p === 'add-1' && n === 3) {
        for (let i = 1; i < 10; i++) expect(cles[i]).not.toBe(cles[i - 1])
      } else {
        expect(new Set(cles).size).toBe(10)
      }
    }
  })
})

test('add-1 niveau 3 : tous les calculs sont des compléments à trou', () => {
  for (const c of genererSerie('add-1', 3, createRng(1))) {
    expect(c.inconnue).toBe('b')
    expect(c.resultat).toBe(10)
  }
})

test('add-1 niveau 6 contient parfois des compléments et parfois non', () => {
  let avec = 0
  let sans = 0
  for (let s = 0; s < 50; s++) {
    const serie = genererSerie('add-1', 6, createRng(s))
    if (serie.some((c) => c.inconnue === 'b')) avec++
    else sans++
  }
  expect(avec).toBeGreaterThan(0)
  expect(sans).toBeGreaterThan(0)
})

test('mixte : au moins 2 calculs par opération', () => {
  for (let s = 0; s < 200; s++) {
    const ops = genererSerie('mix-1', 3, createRng(s)).map((c) => c.op)
    for (const op of ['add', 'sub', 'mul']) expect(ops.filter((o) => o === op).length).toBeGreaterThanOrEqual(2)
  }
})

test('pondération : les faits faibles du niveau sont inclus, 3 max', () => {
  const faits = {
    'mul:6·7': faible(),
    'mul:6·8': faible(),
    'mul:7·7': faible(),
    'mul:6·9': faible(),
    'mul:2·3': faible(), // hors niveau 5
  }
  for (let s = 0; s < 100; s++) {
    const cles = genererSerie('mul-1', 5, createRng(s), faits).map(cleFait)
    // 3 faits forcés au minimum (max 3 forcés) ; d'autres peuvent sortir par hasard au tirage uniforme
    expect(cles.filter((k) => k in faits).length).toBeGreaterThanOrEqual(3)
    expect(cles).not.toContain('mul:2·3')
  }
})

test('pondération : fait maîtrisé non forcé, fait jamais tenté non forcé', () => {
  const faits = { 'mul:6·7': maitrise(), 'mul:6·8': faitVide() }
  let avec67 = 0
  let avec68 = 0
  for (let s = 0; s < 100; s++) {
    const cles = genererSerie('mul-1', 5, createRng(s), faits).map(cleFait)
    if (cles.includes('mul:6·7')) avec67++
    if (cles.includes('mul:6·8')) avec68++
  }
  expect(avec67).toBeLessThan(100)
  expect(avec68).toBeLessThan(100)
})

test('pondération ignorée en 2 et 3 chiffres', () => {
  const faits = { 'add:5·10': faible(), 'add:5·20': faible(), 'add:5·30': faible(), 'add:5·40': faible() }
  for (let s = 0; s < 100; s++) {
    const cles = genererSerie('add-2', 1, createRng(s), faits).map(cleFait)
    expect(cles.filter((k) => k in faits).length).toBeLessThan(3)
  }
})

test('pondération en mixte : faits faibles inclus et au moins 2 par opération', () => {
  const faits = { 'mul:6·7': faible(), 'mul:6·8': faible(), 'mul:7·7': faible() }
  for (let s = 0; s < 100; s++) {
    const serie = genererSerie('mix-1', 5, createRng(s), faits)
    const cles = serie.map(cleFait)
    expect(cles).toEqual(expect.arrayContaining(['mul:6·7', 'mul:6·8', 'mul:7·7']))
    for (const op of ['add', 'sub', 'mul']) expect(serie.filter((c) => c.op === op).length).toBeGreaterThanOrEqual(2)
  }
})

test('déterministe', () => {
  expect(genererSerie('add-2', 5, createRng(9))).toEqual(genererSerie('add-2', 5, createRng(9)))
})

test('mixte niveau « tout » : chaque opération pèse entre 28 % et 39 %', () => {
  const total = { add: 0, sub: 0, mul: 0 }
  for (let s = 0; s < 2000; s++) for (const c of genererSerie('mix-1', 6, createRng(s))) total[c.op]++
  const n = total.add + total.sub + total.mul
  for (const op of ['add', 'sub', 'mul'] as const) {
    expect(total[op] / n).toBeGreaterThan(0.28)
    expect(total[op] / n).toBeLessThan(0.39)
  }
})

test('genererRemplacement : jamais une clé exclue', () => {
  const rng = createRng(3)
  const serie = genererSerie('add-1', 2, rng)
  const exclues = new Set(serie.map(cleUnicite))
  for (let i = 0; i < 200; i++) expect(exclues.has(cleUnicite(genererRemplacement('add-1', 2, rng, exclues)))).toBe(false)
})
