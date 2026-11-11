// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { icone, illustration } from '../../src/ui/icones'

describe('icone', () => {
  it('span aria-hidden avec un svg à la taille demandée et la classe du nom', () => {
    const el = icone('etoile', 14)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.classList.contains('icone')).toBe(true)
    expect(el.classList.contains('icone-etoile')).toBe(true)
    const svg = el.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('14')
    expect(svg.getAttribute('height')).toBe('14')
    expect(el.textContent).toBe('')
  })
  it('taille 24 par défaut', () => {
    expect(icone('retour').querySelector('svg')!.getAttribute('width')).toBe('24')
  })
  it('illustration : mascotte avec sa classe', () => {
    const el = illustration('boss-mix', 52)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.classList.contains('illustration-boss-mix')).toBe(true)
    expect(el.querySelector('svg')!.getAttribute('height')).toBe('52')
  })
  it.each(['continuer', 'correct', 'effacer', 'erreur', 'etincelle', 'etoile-vide', 'etoile', 'joueur', 'op-add', 'op-sub', 'op-mul', 'op-mix', 'parents', 'record', 'retour', 'verrou'] as const)(
    'icône %s : svg avec viewBox',
    (nom) => {
      const svg = icone(nom).querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg!.hasAttribute('viewBox')).toBe(true)
    },
  )
  it.each(['vaisseau', 'pilote', 'alien-add', 'alien-sub', 'alien-mul', 'boss-mix', 'eclat', 'planete'] as const)(
    'illustration %s : svg avec viewBox',
    (nom) => {
      const svg = illustration(nom, 24).querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg!.hasAttribute('viewBox')).toBe(true)
    },
  )
})
