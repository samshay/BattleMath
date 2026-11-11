import { decomposerParcours } from '../core/types'
import type { ParcoursOp, Taille } from '../core/types'
import type { Chargement } from '../storage/store'
import { profilActif } from '../storage/schema'
import type { Donnees, Profil } from '../storage/schema'
import { choisirProfil } from '../storage/profils'
import { h } from './dom'
import { rangeeProfils } from './profils'
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

/** Parcours affiché à l'ouverture d'un profil : son dernier parcours, sinon additions à 1 chiffre. */
export function selectionDepuisProfil(p: Profil): { op: ParcoursOp; taille: Taille } {
  const s = p.dernierParcours ? decomposerParcours(p.dernierParcours) : { op: 'add' as const, taille: 1 as const }
  return s.taille === 3 && !p.reglages.parcoursAvances ? { op: s.op, taille: 1 } : s
}

export function rendreAccueil(ctx: ContexteApp): HTMLElement {
  const racine = h('div', { class: 'accueil' })
  const { plateforme, dejaInstallee } = detecterPlateforme(navigator.userAgent, estStandalone())
  let fermee = banniereDejaFermee()
  const actif = profilActif(ctx.donnees)
  const enfants: (Node | null)[] = []

  if (ctx.avertissement) enfants.push(h('p', { class: 'avertissement' }, AVERTISSEMENTS[ctx.avertissement]))
  if (!fermee) enfants.push(bannierInstallation(dejaInstallee, plateforme, () => { fermee = true; memoriserFermeture() }))

  enfants.push(h('header', {}, h('h1', {}, 'BattleMath')))
  enfants.push(h('h2', {}, 'Qui joue ?'))
  const rangee = rangeeProfils(ctx.donnees.profils, actif.id, (id) => {
    if (id !== actif.id) ctx.sauver(choisirProfil(ctx.donnees, id))
    ctx.naviguer({ nom: 'parcours' })
  })
  rangee.classList.add('grand')
  enfants.push(rangee)
  enfants.push(h('a', { class: 'parents', href: '#/parents' }, 'Parents'))
  racine.replaceChildren(...enfants.filter((e): e is Node => e !== null))
  return racine
}
