import type { ParcoursOp, Taille } from '../core/types'
import type { Chargement } from '../storage/store'
import { profilActif } from '../storage/schema'
import type { Donnees } from '../storage/schema'
import { choisirProfil } from '../storage/profils'
import { h } from './dom'
import { icone, illustration } from './icones'
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

function lienReglages(): HTMLElement {
  return h('a', { class: 'reglages', href: '#/parents', 'aria-label': 'Espace parents' }, icone('parents', 28), h('span', { class: 'sr-only' }, 'Parents'))
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
  enfants.push(h('div', { class: 'decor decor-accueil', 'aria-hidden': 'true' }, illustration('planete', 110), illustration('vaisseau', 120), illustration('alien-add', 72)))
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
