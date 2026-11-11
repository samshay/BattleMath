import { etatFait } from '../core/progression'
import type { Fait, Op } from '../core/types'
import { h } from './dom'

function cellule(faits: Record<string, Fait>, cle: string): HTMLElement {
  return h('td', { 'data-cle': cle, 'data-etat': etatFait(faits, cle) })
}

export function grilleFaits(faits: Record<string, Fait>, op: Op): HTMLElement {
  const chiffres = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const entete = h('tr', {}, h('th', {}, ''), ...chiffres.map((b) => h('th', {}, String(b))))
  let lignes: HTMLElement[]
  if (op === 'sub') {
    lignes = Array.from({ length: 10 }, (_, r) =>
      h('tr', {}, h('th', {}, String(r)), ...chiffres.map((b) => cellule(faits, `sub:${r + b}·${b}`))))
  } else {
    lignes = chiffres.map((a) =>
      h('tr', {}, h('th', {}, String(a)), ...chiffres.map((b) => (a <= b ? cellule(faits, `${op}:${a}·${b}`) : h('td', {})))))
  }
  return h('table', { class: 'grille-faits', 'data-op': op }, h('thead', {}, entete), h('tbody', {}, ...lignes))
}
