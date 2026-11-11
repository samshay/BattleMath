import { COULEURS } from '../storage/schema'
import type { Profil } from '../storage/schema'
import { h } from './dom'

/** Rangée de pastilles de profil : un bouton (disque de couleur + prénom) par profil. */
export function rangeeProfils(profils: readonly Profil[], actifId: string, onChoix: (id: string) => void): HTMLElement {
  return h('div', { class: 'profils' }, ...profils.map((p) =>
    h('button', {
      type: 'button', class: p.id === actifId ? 'profil actif' : 'profil', 'data-id': p.id, 'aria-pressed': String(p.id === actifId),
      onclick: () => onChoix(p.id),
    }, h('span', { class: 'pastille-couleur', style: `background: ${COULEURS[p.couleur]}` }), p.prenom)))
}
