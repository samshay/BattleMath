import { decomposerParcours } from './types'
import type { Calcul, Op, ParcoursId } from './types'

const SYMBOLES: Record<Op, string> = { add: '+', sub: '−', mul: '×' }

export function formaterCalcul(c: Calcul): string {
  const s = SYMBOLES[c.op]
  return c.inconnue === 'b' ? `${c.a} ${s} ▢ = ${c.resultat}` : `${c.a} ${s} ${c.b}`
}

export function formaterSecondes(ms: number): string {
  return `${(Math.round(ms / 100) / 10).toFixed(1).replace('.', ',')} s`
}

const NOMS_OP = { add: 'Additions', sub: 'Soustractions', mul: 'Multiplications', mix: 'Mixte' }

export function nomParcours(id: ParcoursId): string {
  const { op, taille } = decomposerParcours(id)
  return `${NOMS_OP[op]} ${taille} chiffre${taille > 1 ? 's' : ''}`
}
