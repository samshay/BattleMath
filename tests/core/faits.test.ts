import { expect, test } from 'vitest'
import { cleFait, estMaitrise, faitVide, majFait, reponseAttendue, SEUIL_MAITRISE_MS } from '../../src/core/faits'
import type { Fait } from '../../src/core/types'
import { decomposerParcours, parcoursId } from '../../src/core/types'

test('clé add/mul triée', () => {
  expect(cleFait({ op: 'mul', a: 8, b: 7, resultat: 56, inconnue: 'resultat' })).toBe('mul:7·8')
})
test('clé sub non triée', () => {
  expect(cleFait({ op: 'sub', a: 12, b: 5, resultat: 7, inconnue: 'resultat' })).toBe('sub:12·5')
})
test('clé du complément = addition sous-jacente', () => {
  expect(cleFait({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'b' })).toBe('add:3·7')
})
test('réponse attendue selon inconnue', () => {
  expect(reponseAttendue({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'b' })).toBe(7)
  expect(reponseAttendue({ op: 'add', a: 3, b: 7, resultat: 10, inconnue: 'resultat' })).toBe(10)
})
test('faitVide', () => {
  expect(faitVide()).toEqual({ tentatives: 0, erreurs: 0, tempsCumule: 0, derniers: [] })
})
test('majFait cumule et garde 3 derniers', () => {
  let f = majFait(undefined, { juste: false, temps: 8000 })
  f = majFait(f, { juste: true, temps: 3000 })
  f = majFait(f, { juste: true, temps: 2000 })
  f = majFait(f, { juste: true, temps: 4000 })
  expect(f).toEqual({
    tentatives: 4, erreurs: 1, tempsCumule: 17000,
    derniers: [{ juste: true, temps: 3000 }, { juste: true, temps: 2000 }, { juste: true, temps: 4000 }],
  })
})
test('majFait ne modifie pas son entrée', () => {
  const f: Fait = { tentatives: 1, erreurs: 0, tempsCumule: 1000, derniers: [{ juste: true, temps: 1000 }] }
  const copie = structuredClone(f)
  majFait(f, { juste: false, temps: 500 })
  expect(f).toEqual(copie)
})
test('maîtrisé : 3 derniers justes et < 5000', () => {
  expect(estMaitrise({ tentatives: 3, erreurs: 0, tempsCumule: 9000, derniers: [{ juste: true, temps: 4999 }, { juste: true, temps: 3000 }, { juste: true, temps: 1000 }] })).toBe(true)
})
test('pas maîtrisé : moins de 3 essais, ou un essai lent, ou faux, ou undefined', () => {
  expect(SEUIL_MAITRISE_MS).toBe(5000)
  expect(estMaitrise({ tentatives: 2, erreurs: 0, tempsCumule: 2000, derniers: [{ juste: true, temps: 1000 }, { juste: true, temps: 1000 }] })).toBe(false)
  expect(estMaitrise({ tentatives: 3, erreurs: 0, tempsCumule: 7000, derniers: [{ juste: true, temps: 5000 }, { juste: true, temps: 1000 }, { juste: true, temps: 1000 }] })).toBe(false)
  expect(estMaitrise({ tentatives: 3, erreurs: 1, tempsCumule: 3000, derniers: [{ juste: true, temps: 1000 }, { juste: false, temps: 1000 }, { juste: true, temps: 1000 }] })).toBe(false)
  expect(estMaitrise(undefined)).toBe(false)
})
test('parcoursId et decomposerParcours sont inverses', () => {
  expect(parcoursId('mul', 2)).toBe('mul-2')
  expect(decomposerParcours('mix-3')).toEqual({ op: 'mix', taille: 3 })
  expect(decomposerParcours('add-1')).toEqual({ op: 'add', taille: 1 })
})
