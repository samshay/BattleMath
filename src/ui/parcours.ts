import { decomposerParcours, parcoursId } from '../core/types'
import type { ParcoursId, ParcoursOp, Taille } from '../core/types'
import { etatsParcours, parcoursVisibles, prochainNiveau, record, totalEtoiles } from '../core/progression'
import { COULEURS, profilActif } from '../storage/schema'
import type { Profil } from '../storage/schema'
import { formaterSecondes, nomParcours } from '../core/format'
import { h } from './dom'
import type { ContexteApp } from './accueil'

const OPERATIONS: [ParcoursOp, string][] = [['add', 'Additions'], ['sub', 'Soustractions'], ['mul', 'Multiplications'], ['mix', 'Mixte']]
const ETOILES = { verrouille: '', ouvert: '', reussi: '★', valide: '★★' }

/** Parcours affiché à l'ouverture d'un profil : son dernier parcours, sinon additions à 1 chiffre. */
export function selectionDepuisProfil(p: Profil): { op: ParcoursOp; taille: Taille } {
  const s = p.dernierParcours ? decomposerParcours(p.dernierParcours) : { op: 'add' as const, taille: 1 as const }
  return s.taille === 3 && !p.reglages.parcoursAvances ? { op: s.op, taille: 1 } : s
}

function recordNiveau(series: Profil['series'], parcours: ParcoursId, n: number): HTMLElement[] {
  const r = record(series, parcours, n)
  return r === null ? [] : [h('span', { class: 'record', 'data-test': `record-${n}` }, `Record ${formaterSecondes(r)}`)]
}

export function rendreParcours(ctx: ContexteApp): HTMLElement {
  const racine = h('div', { class: 'accueil parcours' })

  function dessiner(): void {
    const { selection } = ctx
    const donnees = profilActif(ctx.donnees)
    if (selection.taille === 3 && !donnees.reglages.parcoursAvances) selection.taille = 1
    const parcours = parcoursId(selection.op, selection.taille)
    const etats = etatsParcours(donnees.series, parcours)
    const enfants: Node[] = []

    enfants.push(h('header', {},
      h('span', { class: 'joueur' }, h('span', { class: 'pastille-couleur', style: `background: ${COULEURS[donnees.couleur]}` }), donnees.prenom),
      h('span', { class: 'etoiles' }, `★ ${totalEtoiles(donnees.series)}`)))
    enfants.push(h('a', { class: 'changer', href: '#/' }, 'Changer de joueur'))
    if (donnees.dernierParcours && parcoursVisibles(donnees.reglages.parcoursAvances).includes(donnees.dernierParcours)) {
      const n = prochainNiveau(donnees.series, donnees.dernierParcours)
      if (n !== null) {
        const cible = donnees.dernierParcours
        enfants.push(h('button', {
          type: 'button', class: 'continuer', 'data-test': 'continuer',
          onclick: () => ctx.naviguer({ nom: 'jeu', parcours: cible, niveau: n }),
        }, `Continuer : ${nomParcours(cible)} niveau ${n}`))
      }
    }

    enfants.push(h('div', { class: 'choix' }, ...OPERATIONS.map(([op, nom]) =>
      h('button', {
        type: 'button', class: op === selection.op ? 'op actif' : 'op', 'data-op': op,
        onclick: () => { selection.op = op; dessiner() },
      }, nom))))

    const tailles: Taille[] = donnees.reglages.parcoursAvances ? [1, 2, 3] : [1, 2]
    enfants.push(h('div', { class: 'choix tailles' }, ...tailles.map((t) =>
      h('button', {
        type: 'button', class: t === selection.taille ? 'taille actif' : 'taille', 'data-taille': String(t),
        onclick: () => { selection.taille = t; dessiner() },
      }, `${t} chiffre${t > 1 ? 's' : ''}`))))

    enfants.push(h('div', { class: 'grille' }, ...etats.map((etat, i) =>
      h('button', {
        type: 'button', class: 'niveau', 'data-niveau': String(i + 1), 'data-etat': etat,
        disabled: String(etat === 'verrouille'),
        onclick: () => ctx.naviguer({ nom: 'jeu', parcours, niveau: i + 1 }),
      }, `Niveau ${i + 1}`, ...(ETOILES[etat] ? [h('span', { class: 'marque' }, ETOILES[etat])] : []),
      ...recordNiveau(donnees.series, parcours, i + 1)))))

    racine.replaceChildren(...enfants)
  }

  dessiner()
  return racine
}
