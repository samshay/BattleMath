// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { grilleFaits } from '../../src/ui/grilleFaits'
import type { Fait } from '../../src/core/types'

const e = (juste: boolean, temps: number) => ({ juste, temps })
const maitrise: Fait = { tentatives: 3, erreurs: 0, tempsCumule: 6000, derniers: [e(true, 2000), e(true, 2000), e(true, 2000)] }
const enCours: Fait = { tentatives: 2, erreurs: 1, tempsCumule: 9000, derniers: [e(false, 5000), e(true, 4000)] }

describe('grilleFaits', () => {
  it('mul : 45 cases avec états', () => {
    const t = grilleFaits({ 'mul:7·8': maitrise, 'mul:3·4': enCours }, 'mul')
    expect(t.querySelectorAll('td[data-cle]')).toHaveLength(45)
    expect(t.querySelector('td[data-cle="mul:7·8"]')!.getAttribute('data-etat')).toBe('maitrise')
    expect(t.querySelector('td[data-cle="mul:3·4"]')!.getAttribute('data-etat')).toBe('en_cours')
    expect(t.querySelector('td[data-cle="mul:1·1"]')!.getAttribute('data-etat')).toBe('jamais_vu')
  })

  it('sub : 90 cases, (résultat 7, b 5) = sub:12·5', () => {
    const t = grilleFaits({}, 'sub')
    expect(t.querySelectorAll('td[data-cle]')).toHaveLength(90)
    expect(t.querySelector('td[data-cle="sub:12·5"]')).not.toBeNull()
  })
})
