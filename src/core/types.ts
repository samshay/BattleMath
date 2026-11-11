export type Op = 'add' | 'sub' | 'mul'
export type Taille = 1 | 2 | 3
export type ParcoursOp = Op | 'mix'
export type ParcoursId = `${ParcoursOp}-${Taille}`
export type Vitesse = 'tranquille' | 'normal' | 'rapide'

export interface Calcul {
  op: Op
  a: number
  b: number
  resultat: number
  inconnue: 'resultat' | 'b'
}

export interface Essai {
  juste: boolean
  temps: number
}

export interface Fait {
  tentatives: number
  erreurs: number
  tempsCumule: number
  derniers: Essai[]
}

export interface Serie {
  date: string
  parcours: ParcoursId
  niveau: number
  bonnes: number
  tempsMedian: number
  /** Somme des 10 temps de réponse (ms). Absent des séries antérieures à cette donnée. */
  tempsTotal?: number
  tempsCible: number
  reussie: boolean
  validee: boolean
}

export function parcoursId(op: ParcoursOp, taille: Taille): ParcoursId {
  return `${op}-${taille}`
}

export function decomposerParcours(id: ParcoursId): { op: ParcoursOp; taille: Taille } {
  const [op, taille] = id.split('-')
  return { op: op as ParcoursOp, taille: Number(taille) as Taille }
}
