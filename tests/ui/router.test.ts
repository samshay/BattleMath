// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { parserHash, versHash } from '../../src/ui/router'

describe('routeur', () => {
  it('parse une route de jeu valide', () => {
    expect(parserHash('#/jeu/add-2/5')).toEqual({ nom: 'jeu', parcours: 'add-2', niveau: 5 })
  })
  it('parse parents et accueil', () => {
    expect(parserHash('#/parents')).toEqual({ nom: 'parents' })
    expect(parserHash('')).toEqual({ nom: 'accueil' })
    expect(parserHash('#/')).toEqual({ nom: 'accueil' })
  })
  it.each(['#/jeu/add-9/5', '#/jeu/add-2/0', '#/jeu/add-2/9', '#/jeu/add-2/1.5', '#/jeu/add-2', '#/x'])(
    '%s retombe sur accueil',
    (hash) => {
      expect(parserHash(hash)).toEqual({ nom: 'accueil' })
    },
  )
  it('versHash est l\'inverse de parserHash', () => {
    for (const r of [{ nom: 'accueil' }, { nom: 'parents' }, { nom: 'jeu', parcours: 'mix-3', niveau: 8 }] as const) {
      expect(parserHash(versHash(r))).toEqual(r)
    }
    expect(versHash({ nom: 'jeu', parcours: 'add-2', niveau: 5 })).toBe('#/jeu/add-2/5')
  })
})
