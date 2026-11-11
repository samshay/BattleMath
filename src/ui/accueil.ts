import type { ParcoursOp, Taille } from '../core/types'
import type { Chargement } from '../storage/store'
import { profilActif } from '../storage/schema'
import type { Donnees } from '../storage/schema'
import { choisirProfil } from '../storage/profils'
import { h } from './dom'
import { rangeeProfils } from './profils'
import { selectionDepuisProfil } from './parcours'
import { bannierInstallation, detecterPlateforme, estStandalone } from './installation'
import type { Route } from './router'

export interface ContexteApp {
  donnees: Donnees
  avertissement: Chargement['avertissement']
  /** Remplace ctx.donnees puis persiste ; renvoie false si l'écriture a échoué. */
  sauver(d: Donnees): boolean
  naviguer(r: Route): void
  selection: { op: ParcoursOp; taille: Taille }
}

const CLE_BANNIERE = 'battlemath.banniere'
export const MSG_NON_ENREGISTRE = "Attention : la progression n'a pas pu être enregistrée sur cet appareil."
export const AVERTISSEMENTS = {
  stockage_indisponible: 'Les progrès ne pourront pas être enregistrés sur cet appareil.',
  donnees_corrompues: 'Les données enregistrées sont illisibles, on repart de zéro.',
}

function banniereDejaFermee(): boolean {
  try { return window.localStorage.getItem(CLE_BANNIERE) !== null } catch { return false }
}
function memoriserFermeture(): void {
  try { window.localStorage.setItem(CLE_BANNIERE, '1') } catch { /* stockage bloqué : bannière réaffichée */ }
}

const ENGRENAGE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">'
  + '<path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.67 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.05.31-.08.63-.08.94s.03.63.08.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.12.22.37.29.61.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.49.42h3.84c.25 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>'

function lienReglages(): HTMLElement {
  const a = h('a', { class: 'reglages', href: '#/parents', 'aria-label': 'Espace parents' }, h('span', { class: 'sr-only' }, 'Parents'))
  a.insertAdjacentHTML('afterbegin', ENGRENAGE)
  return a
}

export function rendreAccueil(ctx: ContexteApp): HTMLElement {
  const racine = h('div', { class: 'accueil' })
  const { plateforme, dejaInstallee } = detecterPlateforme(navigator.userAgent, estStandalone())
  let fermee = banniereDejaFermee()
  const actif = profilActif(ctx.donnees)
  const enfants: Node[] = []

  if (ctx.avertissement) enfants.push(h('p', { class: 'avertissement' }, AVERTISSEMENTS[ctx.avertissement]))
  const banniere = fermee ? null : bannierInstallation(dejaInstallee, plateforme, () => { fermee = true; memoriserFermeture() })
  if (banniere) enfants.push(banniere)

  enfants.push(h('header', {}, h('h1', {}, 'BattleMath'), lienReglages()))
  enfants.push(h('h2', {}, 'Qui joue ?'))
  const rangee = rangeeProfils(ctx.donnees.profils, actif.id, (id) => {
    if (id !== actif.id) ctx.sauver(choisirProfil(ctx.donnees, id))
    Object.assign(ctx.selection, selectionDepuisProfil(profilActif(ctx.donnees)))
    ctx.naviguer({ nom: 'parcours' })
  })
  rangee.classList.add('grand')
  enfants.push(rangee)
  racine.replaceChildren(...enfants)
  return racine
}
