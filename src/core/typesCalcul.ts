import type { Calcul, Op } from './types'
import type { Rng } from './rng'

// Intervalle inclusif [min, max] ou liste explicite de valeurs autorisées.
export type Plage = readonly [number, number] | { readonly valeurs: readonly number[] }

export function valeurs(...v: number[]): Plage {
  return { valeurs: v }
}

export interface TypeDef {
  id: string
  op: Op
  a: Plage
  b: Plage
  ok?: (a: number, b: number) => boolean
  inconnue?: 'b'
  repetitions?: true
}

const MAX_ESSAIS = 10_000

export function dansPlage(p: Plage, v: number): boolean {
  if ('valeurs' in p) return p.valeurs.includes(v)
  return v >= p[0] && v <= p[1]
}

function tirer(p: Plage, rng: Rng): number {
  return 'valeurs' in p ? rng.pick(p.valeurs) : rng.int(p[0], p[1])
}

export function calculer(op: Op, a: number, b: number): number {
  if (op === 'add') return a + b
  if (op === 'sub') return a - b
  return a * b
}

export function genererCalcul(def: TypeDef, rng: Rng): Calcul {
  for (let essai = 0; essai < MAX_ESSAIS; essai++) {
    let a = tirer(def.a, rng)
    let b = tirer(def.b, rng)
    if (def.ok && !def.ok(a, b)) continue
    const resultat = calculer(def.op, a, b)
    if (def.op !== 'sub' && rng.next() < 0.5) [a, b] = [b, a]
    return { op: def.op, a, b, resultat, inconnue: def.inconnue ?? 'resultat' }
  }
  throw new Error(`genererCalcul: aucune combinaison valide pour le type "${def.id}"`)
}

function accepte(def: TypeDef, a: number, b: number): boolean {
  return dansPlage(def.a, a) && dansPlage(def.b, b) && (def.ok ? def.ok(a, b) : true)
}

export function typeAccepte(def: TypeDef, c: Calcul): boolean {
  if (c.op !== def.op) return false
  if (c.inconnue !== (def.inconnue ?? 'resultat')) return false
  if (accepte(def, c.a, c.b)) return true
  return def.op !== 'sub' && accepte(def, c.b, c.a)
}
