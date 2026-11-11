import type { Calcul, Vitesse } from './types'

export interface Reponse {
  calcul: Calcul
  reponse: number
  juste: boolean
  tempsMs: number
}

export interface Bilan {
  bonnes: number
  tempsMedian: number
  reussie: boolean
  validee: boolean
  raison: 'validee' | 'trop_lent' | 'trop_erreurs'
}

export const FACTEUR_VITESSE: Record<Vitesse, number> = { tranquille: 1.5, normal: 1, rapide: 0.75 }

export function mediane(valeurs: readonly number[]): number {
  if (valeurs.length === 0) throw new Error('médiane d’une liste vide')
  const tri = [...valeurs].sort((x, y) => x - y)
  const m = tri.length >> 1
  return tri.length % 2 === 1 ? tri[m]! : (tri[m - 1]! + tri[m]!) / 2
}

export function cibleEffective(cibleMs: number, vitesse: Vitesse): number {
  return Math.round(cibleMs * FACTEUR_VITESSE[vitesse])
}

export function evaluerSerie(reponses: readonly Reponse[], cibleEffectiveMs: number): Bilan {
  const bonnes = reponses.filter((r) => r.juste).length
  const tempsMedian = mediane(reponses.map((r) => r.tempsMs))
  const reussie = bonnes >= 9
  const validee = reussie && tempsMedian <= cibleEffectiveMs
  const raison = validee ? 'validee' : !reussie ? 'trop_erreurs' : 'trop_lent'
  return { bonnes, tempsMedian, reussie, validee, raison }
}
