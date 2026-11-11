import { describe, expect, test } from 'vitest'
import { createRng } from '../../src/core/rng'
import { dansPlage, genererCalcul, typeAccepte, valeurs } from '../../src/core/typesCalcul'
import type { TypeDef } from '../../src/core/typesCalcul'

const petits: TypeDef = { id: 't', op: 'add', a: [1, 5], b: [1, 5] }

describe('typesCalcul', () => {
  test('génère dans les plages avec résultat correct', () => {
    const r = createRng(1)
    for (let i = 0; i < 500; i++) {
      const c = genererCalcul(petits, r)
      expect(c.a).toBeGreaterThanOrEqual(1)
      expect(c.a).toBeLessThanOrEqual(5)
      expect(c.b).toBeGreaterThanOrEqual(1)
      expect(c.b).toBeLessThanOrEqual(5)
      expect(c.resultat).toBe(c.a + c.b)
      expect(c.inconnue).toBe('resultat')
    }
  })

  test('ok filtre', () => {
    const d: TypeDef = { id: 't', op: 'sub', a: [10, 12], b: [1, 9], ok: (a, b) => a - b <= 9 }
    const r = createRng(3)
    for (let i = 0; i < 500; i++) {
      const c = genererCalcul(d, r)
      expect(c.resultat).toBe(c.a - c.b)
      expect(c.resultat).toBeLessThanOrEqual(9)
      expect(c.resultat).toBeGreaterThanOrEqual(0)
    }
  })

  test('liste comme plage', () => {
    const d: TypeDef = { id: 't', op: 'sub', a: [11, 99], b: valeurs(10, 20, 30, 40, 50, 60, 70, 80, 90) }
    const r = createRng(4)
    for (let i = 0; i < 500; i++) {
      const c = genererCalcul(d, r)
      expect(c.b % 10).toBe(0)
      expect(c.a).toBeGreaterThanOrEqual(11)
      expect(c.a).toBeLessThanOrEqual(99)
    }
  })

  test('liste de deux valeurs reste une liste', () => {
    const d: TypeDef = { id: 't', op: 'sub', a: valeurs(3, 9), b: [1, 1] }
    const r = createRng(6)
    const vus = new Set(Array.from({ length: 100 }, () => genererCalcul(d, r).a))
    expect(vus).toEqual(new Set([3, 9]))
  })

  test('add et mul échangent les opérandes à l affichage', () => {
    const d: TypeDef = { id: 't', op: 'mul', a: [2, 2], b: [7, 7] }
    const r = createRng(5)
    const vus = new Set(Array.from({ length: 50 }, () => genererCalcul(d, r).a))
    expect(vus).toEqual(new Set([2, 7]))
    const da: TypeDef = { id: 't', op: 'add', a: [2, 2], b: [7, 7] }
    const vusA = new Set(Array.from({ length: 50 }, () => genererCalcul(da, r).a))
    expect(vusA).toEqual(new Set([2, 7]))
  })

  test('sub n échange jamais', () => {
    const d: TypeDef = { id: 't', op: 'sub', a: [9, 9], b: [4, 4] }
    const r = createRng(7)
    for (let i = 0; i < 100; i++) {
      const c = genererCalcul(d, r)
      expect(c.a).toBe(9)
      expect(c.b).toBe(4)
      expect(c.resultat).toBe(5)
    }
  })

  test('inconnue b', () => {
    const d: TypeDef = { id: 't', op: 'add', a: [1, 9], b: [1, 9], ok: (a, b) => a + b === 10, inconnue: 'b' }
    const c = genererCalcul(d, createRng(2))
    expect(c.inconnue).toBe('b')
    expect(c.a + c.b).toBe(10)
    expect(c.resultat).toBe(10)
  })

  test('typeAccepte dans les deux sens pour mul', () => {
    const d: TypeDef = { id: 't', op: 'mul', a: [2, 2], b: [1, 9] }
    expect(typeAccepte(d, { op: 'mul', a: 7, b: 2, resultat: 14, inconnue: 'resultat' })).toBe(true)
    expect(typeAccepte(d, { op: 'mul', a: 2, b: 7, resultat: 14, inconnue: 'resultat' })).toBe(true)
    expect(typeAccepte(d, { op: 'mul', a: 3, b: 7, resultat: 21, inconnue: 'resultat' })).toBe(false)
  })

  test('typeAccepte respecte ok, op et inconnue', () => {
    const compl: TypeDef = { id: 't', op: 'add', a: [1, 9], b: [1, 9], ok: (a, b) => a + b === 10, inconnue: 'b' }
    expect(typeAccepte(compl, { op: 'add', a: 4, b: 6, resultat: 10, inconnue: 'b' })).toBe(true)
    expect(typeAccepte(compl, { op: 'add', a: 4, b: 6, resultat: 10, inconnue: 'resultat' })).toBe(false)
    expect(typeAccepte(compl, { op: 'add', a: 4, b: 5, resultat: 9, inconnue: 'b' })).toBe(false)
    expect(typeAccepte(compl, { op: 'mul', a: 4, b: 6, resultat: 24, inconnue: 'b' })).toBe(false)
    const sub: TypeDef = { id: 't', op: 'sub', a: [10, 20], b: [1, 9] }
    expect(typeAccepte(sub, { op: 'sub', a: 12, b: 5, resultat: 7, inconnue: 'resultat' })).toBe(true)
    expect(typeAccepte(sub, { op: 'sub', a: 5, b: 12, resultat: -7, inconnue: 'resultat' })).toBe(false)
  })

  test('contrainte impossible → throw', () => {
    expect(() => genererCalcul({ id: 'zz', op: 'add', a: [1, 1], b: [1, 1], ok: () => false }, createRng(1))).toThrow(/zz/)
  })

  test('dansPlage', () => {
    expect(dansPlage([1, 5], 1)).toBe(true)
    expect(dansPlage([1, 5], 5)).toBe(true)
    expect(dansPlage([1, 5], 6)).toBe(false)
    expect(dansPlage(valeurs(3, 9), 9)).toBe(true)
    expect(dansPlage(valeurs(3, 9), 5)).toBe(false)
  })
})
