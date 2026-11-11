// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { creerPave } from '../../src/ui/pave'

function monter(maxChiffres?: number) {
  const onValider = vi.fn()
  const onChange = vi.fn()
  const pave = creerPave({ onValider, onChange, ...(maxChiffres ? { maxChiffres } : {}) })
  const touche = (t: string) => pave.element.querySelector<HTMLButtonElement>(`button.touche[data-touche="${t}"]`)!
  const taper = (...ts: string[]) => ts.forEach((t) => touche(t).click())
  return { pave, onValider, onChange, touche, taper }
}

describe('creerPave', () => {
  it('12 touches dans l\'ordre 1-9, Effacer, 0, Valider', () => {
    const { pave } = monter()
    const touches = [...pave.element.querySelectorAll<HTMLButtonElement>('button.touche')].map((b) => b.dataset.touche)
    expect(touches).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'effacer', '0', 'valider'])
  })

  it('taper 1,2,3 donne 123 et notifie', () => {
    const { pave, taper, onChange } = monter()
    taper('1', '2', '3')
    expect(pave.valeur()).toBe('123')
    expect(onChange).toHaveBeenLastCalledWith('123')
  })

  it('Effacer retire le dernier chiffre', () => {
    const { pave, taper, touche } = monter()
    taper('1', '2', '3')
    touche('effacer').click()
    expect(pave.valeur()).toBe('12')
  })

  it('0 sur valeur vide donne 0, jamais de zéro non significatif', () => {
    const { pave, taper } = monter()
    taper('0')
    expect(pave.valeur()).toBe('0')
    taper('0')
    expect(pave.valeur()).toBe('0')
    taper('7')
    expect(pave.valeur()).toBe('7')
    taper('0')
    expect(pave.valeur()).toBe('70')
  })

  it('Valider avec 0 appelle onValider(0)', () => {
    const { taper, touche, onValider } = monter()
    taper('0')
    expect(touche('valider').disabled).toBe(false)
    touche('valider').click()
    expect(onValider).toHaveBeenCalledWith(0)
  })

  it('le 5e chiffre est ignoré', () => {
    const { pave, taper } = monter()
    taper('1', '2', '3', '4', '5')
    expect(pave.valeur()).toBe('1234')
  })

  it('Valider désactivé quand vide, sinon onValider(123)', () => {
    const { pave, taper, touche, onValider } = monter()
    expect(touche('valider').disabled).toBe(true)
    touche('valider').click()
    expect(onValider).not.toHaveBeenCalled()
    taper('1', '2', '3')
    expect(touche('valider').disabled).toBe(false)
    touche('valider').click()
    expect(onValider).toHaveBeenCalledWith(123)
    expect(pave.valeur()).toBe('123')
  })

  it('vider() remet à zéro et désactive Valider', () => {
    const { pave, taper, touche, onChange } = monter()
    taper('4', '2')
    pave.vider()
    expect(pave.valeur()).toBe('')
    expect(touche('valider').disabled).toBe(true)
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('setActif(false) désactive tout', () => {
    const { pave, taper, touche, onValider } = monter()
    taper('7')
    pave.setActif(false)
    expect(touche('valider').disabled).toBe(true)
    taper('8')
    expect(pave.valeur()).toBe('7')
    touche('valider').click()
    expect(onValider).not.toHaveBeenCalled()
    pave.setActif(true)
    expect(touche('valider').disabled).toBe(false)
  })
})
