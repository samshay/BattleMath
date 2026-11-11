import { estMaitrise } from './faits'
import { formaterCalcul } from './format'
import { parcoursId } from './types'
import type { Calcul, Fait, Op, ParcoursId, ParcoursOp, Serie, Taille } from './types'
import { mediane } from './validation'

export type EtatNiveau = 'verrouille' | 'ouvert' | 'reussi' | 'valide'

const NB_NIVEAUX = 8

export function etatNiveau(series: readonly Serie[], parcours: ParcoursId, n: number): EtatNiveau {
  const du = series.filter((s) => s.parcours === parcours && s.niveau === n)
  if (du.some((s) => s.validee)) return 'valide'
  if (du.some((s) => s.reussie)) return 'reussi'
  if (n === 1 || etatNiveau(series, parcours, n - 1) === 'valide') return 'ouvert'
  return 'verrouille'
}

/** Plus petit temps médian parmi les séries réussies d'un niveau, null s'il n'y en a pas. */
export function record(series: readonly Serie[], parcours: ParcoursId, niveau: number): number | null {
  const temps = series.filter((s) => s.reussie && s.parcours === parcours && s.niveau === niveau).map((s) => s.tempsMedian)
  return temps.length === 0 ? null : Math.min(...temps)
}

export function etatsParcours(series: readonly Serie[], parcours: ParcoursId): EtatNiveau[] {
  return Array.from({ length: NB_NIVEAUX }, (_, i) => etatNiveau(series, parcours, i + 1))
}

export function niveauAtteint(series: readonly Serie[], parcours: ParcoursId): number {
  const etats = etatsParcours(series, parcours)
  for (let n = NB_NIVEAUX; n >= 1; n--) if (etats[n - 1] === 'valide') return n
  return 0
}

export function prochainNiveau(series: readonly Serie[], parcours: ParcoursId): number | null {
  const i = etatsParcours(series, parcours).findIndex((e) => e === 'ouvert' || e === 'reussi')
  return i === -1 ? null : i + 1
}

export function parcoursVisibles(parcoursAvances: boolean): ParcoursId[] {
  const ops: ParcoursOp[] = ['add', 'sub', 'mul', 'mix']
  const tailles: Taille[] = parcoursAvances ? [1, 2, 3] : [1, 2]
  return tailles.flatMap((t) => ops.map((op) => parcoursId(op, t)))
}

export function totalEtoiles(series: readonly Serie[]): number {
  let total = 0
  for (const p of parcoursVisibles(true)) {
    for (const e of etatsParcours(series, p)) total += e === 'valide' ? 2 : e === 'reussi' ? 1 : 0
  }
  return total
}

export interface Synthese {
  parcours: ParcoursId
  niveauAtteint: number
  nbSeries: number
  nbCalculs: number
}

export function synthese(series: readonly Serie[]): Synthese[] {
  return parcoursVisibles(true).flatMap((parcours) => {
    const nbSeries = series.filter((s) => s.parcours === parcours).length
    if (nbSeries === 0) return []
    return [{ parcours, niveauAtteint: niveauAtteint(series, parcours), nbSeries, nbCalculs: nbSeries * 10 }]
  })
}

function jourLocal(date: string): string {
  const d = new Date(date)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function joursEntrainement(series: readonly Serie[]): number {
  return new Set(series.map((s) => jourLocal(s.date))).size
}

export interface FaitARevoir {
  cle: string
  libelle: string
  tentatives: number
  erreurs: number
  tempsMoyen: number
}

function calculDepuisCle(cle: string): Calcul {
  const [op, reste = ''] = cle.split(':')
  const [a = 0, b = 0] = reste.split('·').map(Number)
  const o = op as Op
  const resultat = o === 'add' ? a + b : o === 'sub' ? a - b : a * b
  return { op: o, a, b, resultat, inconnue: 'resultat' }
}

export function calculsARevoir(faits: Record<string, Fait>, op: Op, limite = 10): FaitARevoir[] {
  return Object.entries(faits)
    .filter(([cle, f]) => cle.startsWith(`${op}:`) && f.tentatives >= 3)
    .map(([cle, f]) => ({
      cle,
      libelle: formaterCalcul(calculDepuisCle(cle)),
      tentatives: f.tentatives,
      erreurs: f.erreurs,
      tempsMoyen: f.tempsCumule / f.tentatives,
    }))
    .sort((x, y) => y.erreurs / y.tentatives - x.erreurs / x.tentatives || y.tempsMoyen - x.tempsMoyen)
    .slice(0, limite)
}

export interface NiveauARetravailler {
  niveau: number
  tauxErreur: number
  tempsMedian: number
  nbSeries: number
}

export function niveauxARetravailler(series: readonly Serie[], parcours: ParcoursId): NiveauARetravailler[] {
  const dernieres = series.filter((s) => s.parcours === parcours).slice(-10)
  const groupes = new Map<number, Serie[]>()
  for (const s of dernieres) groupes.set(s.niveau, [...(groupes.get(s.niveau) ?? []), s])
  return [...groupes.entries()]
    .map(([niveau, ss]) => ({
      niveau,
      tauxErreur: ss.reduce((acc, s) => acc + (10 - s.bonnes) / 10, 0) / ss.length,
      tempsMedian: mediane(ss.map((s) => s.tempsMedian)),
      nbSeries: ss.length,
    }))
    .sort((x, y) => y.tauxErreur - x.tauxErreur || y.tempsMedian - x.tempsMedian)
}

export type EtatFait = 'jamais_vu' | 'en_cours' | 'maitrise'

export function etatFait(faits: Record<string, Fait>, cle: string): EtatFait {
  const f = faits[cle]
  if (!f || f.tentatives === 0) return 'jamais_vu'
  return estMaitrise(f) ? 'maitrise' : 'en_cours'
}
