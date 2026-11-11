import { describe, expect, it } from 'vitest'
import type { Calcul } from '../../src/core/types'
import { cleFait } from '../../src/core/faits'
import {
  annulerCourant, avancer, bilan, calculCourant, corriger, creerSession,
  etatsPastilles, majFaits, repondre, versSerie,
} from '../../src/game/session'

const calculs: Calcul[] = Array.from({ length: 10 }, (_, i) => ({
  op: 'mul', a: 7, b: i, resultat: 7 * i, inconnue: 'resultat',
}))
const neuve = () => creerSession('mul-1', 3, 4000, calculs)
const juste = (i: number) => 7 * i

describe('session', () => {
  it('10 justes mènent à fini', () => {
    let s = neuve()
    for (let i = 0; i < 10; i++) {
      s = repondre(s, juste(i), 2000)
      expect(s.phase).toBe('feedback')
      s = avancer(s)
    }
    expect(s.phase).toBe('fini')
    expect(s.index).toBe(9)
    expect(bilan(s).bonnes).toBe(10)
    expect(etatsPastilles(s)).toEqual(Array(10).fill('juste'))
  })

  it('faux puis correction', () => {
    let s = repondre(neuve(), 1, 3333)
    expect(s.phase).toBe('correction')
    expect(s.derniereReponse).toBe(1)
    expect(corriger(s, 1)).toBe(s)
    expect(corriger(s, 99)).toBe(s)
    s = corriger(s, 0)
    expect(s.phase).toBe('question')
    expect(s.index).toBe(1)
    expect(s.derniereReponse).toBeNull()
    expect(s.reponses[0]).toMatchObject({ juste: false, tempsMs: 3333, reponse: 1 })
  })

  it('no-ops de phase', () => {
    const fb = repondre(neuve(), 0, 1000)
    expect(repondre(fb, 7, 1000)).toBe(fb)
    const co = repondre(neuve(), 1, 1000)
    expect(repondre(co, 0, 1000)).toBe(co)
    const q = neuve()
    expect(avancer(q)).toBe(q)
    expect(avancer(co)).toBe(co)
    expect(corriger(q, 0)).toBe(q)
  })

  it('annulerCourant', () => {
    const rempl: Calcul = { op: 'mul', a: 6, b: 6, resultat: 36, inconnue: 'resultat' }
    const s = neuve()
    const t = annulerCourant(s, rempl)
    expect(calculCourant(t)).toEqual(rempl)
    expect(t.reponses).toBe(s.reponses)
    expect(s.calculs[0]).toEqual(calculs[0])
    const co = repondre(neuve(), 1, 1000)
    expect(annulerCourant(co, rempl)).toBe(co)
    const fb = repondre(neuve(), 0, 1000)
    expect(annulerCourant(fb, rempl)).toBe(fb)
  })

  it('bilan avant la fin lève', () => {
    expect(() => bilan(neuve())).toThrow()
  })

  it('versSerie', () => {
    let s = neuve()
    for (let i = 0; i < 10; i++) s = avancer(repondre(s, juste(i), 1000 + i * 100))
    const serie = versSerie(s, '2026-11-11')
    expect(serie).toEqual({
      date: '2026-11-11', parcours: 'mul-1', niveau: 3, bonnes: 10,
      tempsMedian: 1450, tempsTotal: 14500, tempsCible: 4000, reussie: true, validee: true,
    })
  })

  it('majFaits', () => {
    let s = neuve()
    for (let i = 0; i < 10; i++) s = avancer(repondre(s, juste(i), 1500))
    const m = majFaits(s)
    expect(m).toHaveLength(10)
    expect(m[3]).toEqual({ cle: cleFait(calculs[3]!), essai: { juste: true, temps: 1500 } })
    const add = creerSession('add-2', 1, 4000, calculs)
    expect(majFaits(add)).toEqual([])
  })

  it('etatsPastilles à mi-parcours', () => {
    let s = neuve()
    s = avancer(repondre(s, 0, 1000))
    s = corriger(repondre(s, 1, 1000), 7)
    expect(etatsPastilles(s)).toEqual(['juste', 'faux', 'en_cours', ...Array(7).fill('vide')])
    const fb = repondre(s, 14, 1000)
    expect(etatsPastilles(fb)[2]).toBe('juste')
    expect(etatsPastilles(fb)[3]).toBe('vide')
  })
})
