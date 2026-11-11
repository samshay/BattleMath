import { cleFait, reponseAttendue } from '../core/faits'
import type { Calcul, ParcoursId, Serie } from '../core/types'
import { decomposerParcours } from '../core/types'
import type { Bilan, Reponse } from '../core/validation'
import { evaluerSerie } from '../core/validation'
import type { MajFaitEntree } from '../storage/store'

export type Phase = 'question' | 'feedback' | 'correction' | 'fini'

export interface Session {
  readonly parcours: ParcoursId
  readonly niveau: number
  readonly cibleMs: number
  readonly calculs: readonly Calcul[]
  readonly index: number
  readonly phase: Phase
  readonly reponses: readonly Reponse[]
  readonly derniereReponse: number | null
}

export function creerSession(
  parcours: ParcoursId,
  niveau: number,
  cibleMs: number,
  calculs: readonly Calcul[],
): Session {
  return { parcours, niveau, cibleMs, calculs, index: 0, phase: 'question', reponses: [], derniereReponse: null }
}

export function calculCourant(s: Session): Calcul {
  const c = s.calculs[s.index]
  if (!c) throw new Error('aucun calcul courant')
  return c
}

export function repondre(s: Session, reponse: number, tempsMs: number): Session {
  if (s.phase !== 'question') return s
  const calcul = calculCourant(s)
  const juste = reponse === reponseAttendue(calcul)
  return {
    ...s,
    reponses: [...s.reponses, { calcul, reponse, juste, tempsMs }],
    phase: juste ? 'feedback' : 'correction',
    derniereReponse: juste ? null : reponse,
  }
}

function suivant(s: Session): Session {
  if (s.index === s.calculs.length - 1) return { ...s, phase: 'fini', derniereReponse: null }
  return { ...s, index: s.index + 1, phase: 'question', derniereReponse: null }
}

export function avancer(s: Session): Session {
  return s.phase === 'feedback' ? suivant(s) : s
}

export function corriger(s: Session, recopie: number): Session {
  if (s.phase !== 'correction') return s
  return recopie === reponseAttendue(calculCourant(s)) ? suivant(s) : s
}

export function annulerCourant(s: Session, remplacement: Calcul): Session {
  if (s.phase !== 'question') return s
  const calculs = s.calculs.map((c, i) => (i === s.index ? remplacement : c))
  return { ...s, calculs }
}

export function bilan(s: Session): Bilan {
  if (s.phase !== 'fini') throw new Error('série non terminée')
  return evaluerSerie(s.reponses, s.cibleMs)
}

export function versSerie(s: Session, date: string): Serie {
  const b = bilan(s)
  return {
    date,
    parcours: s.parcours,
    niveau: s.niveau,
    bonnes: b.bonnes,
    tempsMedian: b.tempsMedian,
    tempsTotal: s.reponses.reduce((somme, r) => somme + r.tempsMs, 0),
    tempsCible: s.cibleMs,
    reussie: b.reussie,
    validee: b.validee,
  }
}

export function majFaits(s: Session): MajFaitEntree[] {
  if (decomposerParcours(s.parcours).taille !== 1) return []
  return s.reponses.map((r) => ({ cle: cleFait(r.calcul), essai: { juste: r.juste, temps: r.tempsMs } }))
}

export function etatsPastilles(s: Session): ('vide' | 'juste' | 'faux' | 'en_cours')[] {
  return s.calculs.map((_, i) => {
    const r = s.reponses[i]
    if (r) return r.juste ? 'juste' : 'faux'
    return i === s.index && s.phase === 'question' ? 'en_cours' : 'vide'
  })
}
