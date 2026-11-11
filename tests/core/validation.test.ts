import { describe, expect, test } from 'vitest'
import { cibleEffective, evaluerSerie, mediane, type Reponse } from '../../src/core/validation'

function rep(juste: boolean, tempsMs: number): Reponse {
  return { calcul: { op: 'add', a: 1, b: 2, resultat: 3, inconnue: 'resultat' }, reponse: juste ? 3 : 4, juste, tempsMs }
}
function reps(nbJustes: number, tempsMs: number): Reponse[] {
  return Array.from({ length: 10 }, (_, i) => rep(i < nbJustes, tempsMs))
}

describe('validation', () => {
  test('médiane impaire et paire', () => {
    expect(mediane([3, 1, 2])).toBe(2)
    expect(mediane([4, 1, 3, 2])).toBe(2.5)
    expect(() => mediane([])).toThrow()
  })
  test('une hésitation longue ne change pas la médiane', () => {
    expect(mediane([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 60000])).toBe(3000)
  })
  test('cible effective', () => {
    expect(cibleEffective(6000, 'tranquille')).toBe(9000)
    expect(cibleEffective(6000, 'normal')).toBe(6000)
    expect(cibleEffective(6000, 'rapide')).toBe(4500)
    expect(cibleEffective(7000, 'rapide')).toBe(5250)
  })
  test('9/10 et médiane égale à la cible → validée', () => {
    expect(evaluerSerie(reps(9, 6000), 6000)).toMatchObject({ bonnes: 9, reussie: true, validee: true, raison: 'validee' })
  })
  test('10/10 trop lent → réussie non validée', () => {
    expect(evaluerSerie(reps(10, 6001), 6000)).toMatchObject({ reussie: true, validee: false, raison: 'trop_lent' })
  })
  test('8/10 rapide → trop d erreurs', () => {
    expect(evaluerSerie(reps(8, 1000), 6000)).toMatchObject({ reussie: false, validee: false, raison: 'trop_erreurs' })
  })
  test('8/10 et lent → raison trop_erreurs', () => {
    expect(evaluerSerie(reps(8, 9000), 6000).raison).toBe('trop_erreurs')
  })
  test('les réponses fausses comptent dans la médiane', () => {
    const a = [...Array.from({ length: 9 }, () => rep(true, 1000)), rep(false, 100000)]
    expect(evaluerSerie(a, 6000).tempsMedian).toBe(1000)
    const b = [
      ...Array.from({ length: 5 }, () => rep(true, 1000)),
      ...Array.from({ length: 4 }, () => rep(true, 9000)),
      rep(false, 9000),
    ]
    const bilan = evaluerSerie(b, 6000)
    expect(bilan.tempsMedian).toBe(5000)
    expect(bilan.bonnes).toBe(9)
    expect(evaluerSerie(b.slice(0, 9), 6000).tempsMedian).toBe(1000)
  })
})
