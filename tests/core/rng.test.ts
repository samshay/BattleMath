import { expect, test } from 'vitest'
import { createRng } from '../../src/core/rng'
import type { Rng } from '../../src/core/rng'

const seq = (r: Rng, n: number) => Array.from({ length: n }, () => r.next())

test('même graine, même suite', () => {
  expect(seq(createRng(42), 5)).toEqual(seq(createRng(42), 5))
})
test('graines différentes, suites différentes', () => {
  expect(seq(createRng(1), 5)).not.toEqual(seq(createRng(2), 5))
})
test('next est dans [0, 1)', () => {
  const r = createRng(3)
  for (let i = 0; i < 1000; i++) {
    const v = r.next()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  }
})
test('int est borné inclusif', () => {
  const r = createRng(7)
  for (let i = 0; i < 1000; i++) {
    const v = r.int(3, 5)
    expect(v).toBeGreaterThanOrEqual(3)
    expect(v).toBeLessThanOrEqual(5)
  }
})
test('int atteint les deux bornes', () => {
  const r = createRng(9)
  const vus = new Set(Array.from({ length: 500 }, () => r.int(1, 3)))
  expect(vus).toEqual(new Set([1, 2, 3]))
})
test('pick renvoie un élément et lève sur tableau vide', () => {
  const r = createRng(5)
  expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']))
  expect(() => r.pick([])).toThrow()
})
test('shuffle renvoie une copie permutée sans modifier l’entrée', () => {
  const r = createRng(11)
  const entree = [1, 2, 3, 4, 5, 6]
  const sortie = r.shuffle(entree)
  expect(entree).toEqual([1, 2, 3, 4, 5, 6])
  expect(sortie).not.toBe(entree)
  expect([...sortie].sort()).toEqual([1, 2, 3, 4, 5, 6])
})
