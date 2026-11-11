import { decomposerParcours, parcoursId } from '../core/types'
import type { ParcoursOp, Taille } from '../core/types'
import { etatsParcours, prochainNiveau, totalEtoiles } from '../core/progression'
import type { Chargement } from '../storage/store'
import type { Donnees } from '../storage/schema'
import { h } from './dom'
import { bannierInstallation, detecterPlateforme, estStandalone } from './installation'
import type { Route } from './router'

export interface ContexteApp {
  donnees: Donnees
  avertissement: Chargement['avertissement']
  sauver(d: Donnees): void
  naviguer(r: Route): void
  selection: { op: ParcoursOp; taille: Taille }
}

const CLE_BANNIERE = 'battlemath.banniere'
const OPERATIONS: [ParcoursOp, string][] = [['add', 'Additions'], ['sub', 'Soustractions'], ['mul', 'Multiplications'], ['mix', 'Mixte']]
const NOMS_OP: Record<ParcoursOp, string> = { add: 'Additions', sub: 'Soustractions', mul: 'Multiplications', mix: 'Mixte' }
const AVERTISSEMENTS = {
  stockage_indisponible: 'Les progrès ne pourront pas être enregistrés sur cet appareil.',
  donnees_corrompues: 'Les données enregistrées sont illisibles, on repart de zéro.',
}
const ETOILES = { verrouille: '', ouvert: '', reussi: '★', valide: '★★' }

function banniereDejaFermee(): boolean {
  try { return window.localStorage.getItem(CLE_BANNIERE) !== null } catch { return false }
}
function memoriserFermeture(): void {
  try { window.localStorage.setItem(CLE_BANNIERE, '1') } catch { /* stockage bloqué : bannière réaffichée */ }
}

export function rendreAccueil(ctx: ContexteApp): HTMLElement {
  const racine = h('div', { class: 'accueil' })
  const { plateforme, dejaInstallee } = detecterPlateforme(navigator.userAgent, estStandalone())
  let fermee = banniereDejaFermee()

  function dessiner(): void {
    const { donnees, selection } = ctx
    const parcours = parcoursId(selection.op, selection.taille)
    const etats = etatsParcours(donnees.series, parcours)
    const enfants: (Node | null)[] = []

    if (ctx.avertissement) enfants.push(h('p', { class: 'avertissement' }, AVERTISSEMENTS[ctx.avertissement]))
    if (!fermee) enfants.push(bannierInstallation(dejaInstallee, plateforme, () => { fermee = true; memoriserFermeture() }))

    enfants.push(h('header', {}, h('h1', {}, 'BattleMath'), h('span', { class: 'etoiles' }, `★ ${totalEtoiles(donnees.series)}`)))

    if (donnees.dernierParcours) {
      const n = prochainNiveau(donnees.series, donnees.dernierParcours)
      if (n !== null) {
        const { op, taille } = decomposerParcours(donnees.dernierParcours)
        const cible = donnees.dernierParcours
        enfants.push(h('button', {
          type: 'button', class: 'continuer', 'data-test': 'continuer',
          onclick: () => ctx.naviguer({ nom: 'jeu', parcours: cible, niveau: n }),
        }, `Continuer : ${NOMS_OP[op]} ${taille} chiffre${taille > 1 ? 's' : ''} niveau ${n}`))
      }
    }

    enfants.push(h('div', { class: 'choix' }, ...OPERATIONS.map(([op, nom]) =>
      h('button', {
        type: 'button', class: op === selection.op ? 'op actif' : 'op', 'data-op': op,
        onclick: () => { selection.op = op; dessiner() },
      }, nom))))

    const tailles: Taille[] = donnees.reglages.parcoursAvances ? [1, 2, 3] : [1, 2]
    enfants.push(h('div', { class: 'choix' }, ...tailles.map((t) =>
      h('button', {
        type: 'button', class: t === selection.taille ? 'taille actif' : 'taille', 'data-taille': String(t),
        onclick: () => { selection.taille = t; dessiner() },
      }, `${t} chiffre${t > 1 ? 's' : ''}`))))

    enfants.push(h('div', { class: 'grille' }, ...etats.map((etat, i) =>
      h('button', {
        type: 'button', class: 'niveau', 'data-niveau': String(i + 1), 'data-etat': etat,
        disabled: String(etat === 'verrouille'),
        onclick: () => ctx.naviguer({ nom: 'jeu', parcours, niveau: i + 1 }),
      }, `Niveau ${i + 1}`, ...(ETOILES[etat] ? [h('span', { class: 'marque' }, ETOILES[etat])] : [])))))

    enfants.push(h('a', { class: 'parents', href: '#/parents' }, 'Parents'))
    racine.replaceChildren(...enfants.filter((e): e is Node => e !== null))
  }

  dessiner()
  return racine
}
