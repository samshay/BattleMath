// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { rangeeProfils } from '../../src/ui/profils'
import { COULEURS } from '../../src/storage/schema'
import { deuxProfils } from '../aide/donnees'

describe('rangeeProfils', () => {
  const profils = deuxProfils().profils

  it('un bouton par profil, avec prénom et pastille de couleur', () => {
    const rangee = rangeeProfils(profils, 'p1', () => {})
    const boutons = rangee.querySelectorAll<HTMLButtonElement>('button.profil')
    expect(rangee.classList.contains('profils')).toBe(true)
    expect(boutons).toHaveLength(2)
    expect(boutons[0]!.dataset.id).toBe('p1')
    expect(boutons[1]!.textContent).toContain(profils[1]!.prenom)
    expect(boutons[1]!.querySelector<HTMLElement>('.pastille-couleur')!.style.background).not.toBe('')
    expect(COULEURS[profils[1]!.couleur]).toBeTruthy()
  })

  it('la classe actif est sur le profil actif seulement', () => {
    const boutons = rangeeProfils(profils, 'p2', () => {}).querySelectorAll('button.profil')
    expect(boutons[0]!.classList.contains('actif')).toBe(false)
    expect(boutons[1]!.classList.contains('actif')).toBe(true)
  })

  it('un clic appelle le callback avec l\'id', () => {
    const onChoix = vi.fn()
    rangeeProfils(profils, 'p1', onChoix).querySelector<HTMLButtonElement>('button.profil[data-id="p2"]')!.click()
    expect(onChoix).toHaveBeenCalledWith('p2')
  })
})
