import { decomposerParcours, parcoursId } from '../core/types'
import type { ParcoursId, Serie, ParcoursOp, Taille } from '../core/types'
import type { EtatNiveau } from '../core/progression'
import { etatsParcours, parcoursVisibles, prochainNiveau, record, totalEtoiles } from '../core/progression'
import { COULEURS, profilActif } from '../storage/schema'
import type { Profil } from '../storage/schema'
import { formaterSecondes, nomParcours } from '../core/format'
import { h } from './dom'
import { icone } from './icones'
import type { ContexteApp } from './accueil'

const OPERATIONS: [ParcoursOp, string][] = [['add', 'Additions'], ['sub', 'Soustractions'], ['mul', 'Multiplications'], ['mix', 'Mixte']]
const MARQUES: Record<EtatNiveau, 0 | 1 | 2> = { verrouille: 0, ouvert: 0, reussi: 1, valide: 2 }

/** Parcours affiché à l'ouverture d'un profil : son dernier parcours, sinon additions à 1 chiffre. */
export function selectionDepuisProfil(p: Profil): { op: ParcoursOp; taille: Taille } {
  const s = p.dernierParcours ? decomposerParcours(p.dernierParcours) : { op: 'add' as const, taille: 1 as const }
  return s.taille === 3 && !p.reglages.parcoursAvances ? { op: s.op, taille: 1 } : s
}

function recordNiveau(series: readonly Serie[], parcours: ParcoursId, n: number): HTMLElement[] {
  const r = record(series, parcours, n)
  return r === null ? [] : [h('span', { class: 'record', 'data-test': `record-${n}` }, h('span', { class: 'sr-only' }, 'Record'), ` ${formaterSecondes(r)}`)]
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
    const total = totalEtoiles(donnees.series)

    enfants.push(h('header', {},
      h('span', { class: 'joueur' }, h('span', { class: 'pastille-couleur', style: `background: ${COULEURS[donnees.couleur]}` }), h('span', { class: 'prenom' }, donnees.prenom)),
      h('span', { class: 'etoiles', role: 'img', 'aria-label': `${total} étoile${total > 1 ? 's' : ''}` }, icone('etoile', 24), String(total))))
    enfants.push(h('a', { class: 'changer', href: '#/' }, icone('joueur', 22), 'Changer de joueur'))
    if (donnees.dernierParcours && parcoursVisibles(donnees.reglages.parcoursAvances).includes(donnees.dernierParcours)) {
      const n = prochainNiveau(donnees.series, donnees.dernierParcours)
      if (n !== null) {
        const cible = donnees.dernierParcours
        enfants.push(h('button', {
          type: 'button', class: 'continuer', 'data-test': 'continuer',
          onclick: () => ctx.naviguer({ nom: 'jeu', parcours: cible, niveau: n }),
        }, icone('continuer', 28), h('span', { class: 'lignes' },
          h('span', { class: 'titre' }, 'Continuer'),
          h('span', { class: 'detail' }, `${nomParcours(cible)} niveau ${n}`))))
      }
    }

    enfants.push(h('div', { class: 'choix' }, ...OPERATIONS.map(([op, nom]) =>
      h('button', {
        type: 'button', class: op === selection.op ? 'op actif' : 'op', 'data-op': op,
        'aria-pressed': String(op === selection.op),
        onclick: () => { selection.op = op; dessiner() },
      }, h('span', { class: 'pastille-op' }, icone(`op-${op}`, 22)), nom))))

    const tailles: Taille[] = donnees.reglages.parcoursAvances ? [1, 2, 3] : [1, 2]
    enfants.push(h('div', { class: 'choix tailles' }, ...tailles.map((t) =>
      h('button', {
        type: 'button', class: t === selection.taille ? 'taille actif' : 'taille', 'data-taille': String(t),
        'aria-pressed': String(t === selection.taille),
        onclick: () => { selection.taille = t; dessiner() },
      }, `${t} chiffre${t > 1 ? 's' : ''}`))))

    enfants.push(h('div', { class: 'grille' }, ...etats.map((etat, i) =>
      h('button', {
        type: 'button', class: 'niveau', 'data-niveau': String(i + 1), 'data-etat': etat,
        disabled: String(etat === 'verrouille'),
        onclick: () => ctx.naviguer({ nom: 'jeu', parcours, niveau: i + 1 }),
      },
      ...(etat === 'verrouille' ? [icone('verrou', 20)] : []),
      h('span', { class: 'numero' }, h('span', { class: 'sr-only' }, 'Niveau'), ` ${i + 1}`),
      ...(MARQUES[etat] > 0 ? [h('span', { class: 'marque', role: 'img', 'aria-label': MARQUES[etat] === 2 ? 'deux étoiles' : 'une étoile' },
        ...Array.from({ length: MARQUES[etat] }, () => icone('etoile', 14)))] : []),
      ...recordNiveau(donnees.series, parcours, i + 1)))))

    racine.replaceChildren(...enfants)
  }

  dessiner()
  return racine
}
