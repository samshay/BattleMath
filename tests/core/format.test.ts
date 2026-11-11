import { expect, test } from 'vitest'
import { formaterCalcul, formaterSecondes } from '../../src/core/format'

test('multiplication', () => {
  expect(formaterCalcul({ op: 'mul', a: 7, b: 8, resultat: 56, inconnue: 'resultat' })).toBe('7 × 8')
})
test('soustraction avec le vrai signe moins U+2212', () => {
  expect(formaterCalcul({ op: 'sub', a: 12, b: 5, resultat: 7, inconnue: 'resultat' })).toBe('12 − 5')
})
test('complément', () => {
  expect(formaterCalcul({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'b' })).toBe('3 + ▢ = 10')
})
test('formaterSecondes', () => {
  expect(formaterSecondes(6200)).toBe('6,2 s')
  expect(formaterSecondes(3000)).toBe('3,0 s')
  expect(formaterSecondes(6249)).toBe('6,2 s')
  expect(formaterSecondes(6250)).toBe('6,3 s')
})
