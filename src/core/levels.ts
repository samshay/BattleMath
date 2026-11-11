// Configuration des niveaux : transcription de la section 2.3 de la spec.
// Seul fichier à modifier pour régler les temps cibles (en ms) et les plages.
import type { Op, ParcoursId, Taille } from './types'
import { decomposerParcours } from './types'
import { valeurs, type Plage, type TypeDef } from './typesCalcul'

export type ParcoursSimpleId = `${Op}-${Taille}`
export interface NiveauDef {
  cibleMs: number
  types: readonly string[]
}
type HuitNiveaux = readonly [NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef, NiveauDef]

// Chiffres : unités, dizaines, centaines.
const u = (x: number): number => x % 10
const d = (x: number): number => Math.floor(x / 10) % 10
const c = (x: number): number => Math.floor(x / 100) % 10

const dizaines: Plage = valeurs(10, 20, 30, 40, 50, 60, 70, 80, 90)
const centaines: Plage = valeurs(100, 200, 300, 400, 500, 600, 700, 800, 900)
const dizainesDe110a490: Plage = valeurs(
  ...Array.from({ length: 39 }, (_, i) => 110 + 10 * i),
)

const liste: TypeDef[] = [
  // ---- Additions 1 chiffre
  { id: 'add1.petits', op: 'add', a: [1, 5], b: [1, 5] },
  { id: 'add1.somme10', op: 'add', a: [1, 9], b: [1, 5], ok: (a, b) => a + b <= 10 },
  { id: 'add1.complement10', op: 'add', a: [1, 9], b: [1, 9], ok: (a, b) => a + b === 10, inconnue: 'b', repetitions: true },
  { id: 'add1.doubles', op: 'add', a: [1, 9], b: [1, 9], ok: (a, b) => b === a || (a <= 8 && b === a + 1) },
  { id: 'add1.sommeSup10', op: 'add', a: [2, 9], b: [2, 9], ok: (a, b) => a + b >= 11 },

  // ---- Soustractions 1 chiffre
  { id: 'sub1.a5', op: 'sub', a: [1, 5], b: [1, 5], ok: (a, b) => b <= a },
  { id: 'sub1.a9', op: 'sub', a: [1, 9], b: [1, 9], ok: (a, b) => b <= a },
  { id: 'sub1.passage10', op: 'sub', a: [10, 12], b: [1, 9], ok: (a, b) => a - b >= 0 && a - b <= 9 },
  { id: 'sub1.a13a16', op: 'sub', a: [13, 16], b: [4, 9], ok: (a, b) => a - b >= 0 && a - b <= 9 },
  { id: 'sub1.a11a18', op: 'sub', a: [11, 18], b: [2, 9], ok: (a, b) => a - b >= 0 && a - b <= 9 },

  // ---- Multiplications 1 chiffre (a dans les tables du niveau, b de 1 à 9)
  { id: 'mul1.t12', op: 'mul', a: valeurs(1, 2), b: [1, 9] },
  { id: 'mul1.t25', op: 'mul', a: valeurs(2, 5), b: [1, 9] },
  { id: 'mul1.t34', op: 'mul', a: valeurs(3, 4), b: [1, 9] },
  { id: 'mul1.t2a5', op: 'mul', a: valeurs(2, 3, 4, 5), b: [1, 9] },
  { id: 'mul1.t67', op: 'mul', a: valeurs(6, 7), b: [1, 9] },
  { id: 'mul1.t89', op: 'mul', a: valeurs(8, 9), b: [1, 9] },
  { id: 'mul1.t2a9', op: 'mul', a: valeurs(2, 3, 4, 5, 6, 7, 8, 9), b: [1, 9] },

  // ---- Additions 2 chiffres (somme <= 99 partout)
  { id: 'add2.plus1sans', op: 'add', a: [10, 99], b: [1, 9], ok: (a, b) => u(a) + b <= 9 && a + b <= 99 },
  { id: 'add2.plus1avec', op: 'add', a: [10, 99], b: [1, 9], ok: (a, b) => u(a) + b >= 10 && a + b <= 99 },
  { id: 'add2.dizaines', op: 'add', a: [11, 99], b: dizaines, ok: (a, b) => u(a) !== 0 && a + b <= 99 },
  { id: 'add2.plus2sans', op: 'add', a: [10, 99], b: [10, 99], ok: (a, b) => u(a) + u(b) <= 9 && a + b <= 99 },
  { id: 'add2.plus2avec', op: 'add', a: [10, 99], b: [10, 99], ok: (a, b) => u(a) + u(b) >= 10 && a + b <= 99 },

  // ---- Soustractions 2 chiffres (résultat >= 0)
  { id: 'sub2.plus1sans', op: 'sub', a: [10, 99], b: [1, 9], ok: (a, b) => u(a) >= b && a - b >= 0 },
  { id: 'sub2.plus1avec', op: 'sub', a: [10, 99], b: [1, 9], ok: (a, b) => u(a) < b && a - b >= 0 },
  { id: 'sub2.dizaines', op: 'sub', a: [11, 99], b: dizaines, ok: (a, b) => u(a) !== 0 && b < a },
  { id: 'sub2.plus2sans', op: 'sub', a: [10, 99], b: [10, 99], ok: (a, b) => u(a) >= u(b) && b <= a },
  { id: 'sub2.plus2avec', op: 'sub', a: [10, 99], b: [10, 99], ok: (a, b) => u(a) < u(b) && b < a },

  // ---- Multiplications 2 chiffres
  { id: 'mul2.fois10', op: 'mul', a: [2, 20], b: valeurs(10) },
  { id: 'mul2.dizaines2a5', op: 'mul', a: dizaines, b: [2, 5] },
  { id: 'mul2.doubles', op: 'mul', a: [11, 49], b: valeurs(2) },
  { id: 'mul2.sansRetenue', op: 'mul', a: [11, 49], b: [2, 4], ok: (a, b) => u(a) * b <= 9 && d(a) * b <= 9 },
  { id: 'mul2.n11a19', op: 'mul', a: [11, 19], b: [2, 5] },
  { id: 'mul2.n11a29', op: 'mul', a: [11, 29], b: [2, 6] },
  { id: 'mul2.n11a49', op: 'mul', a: [11, 49], b: [2, 9] },
  { id: 'mul2.n11a99', op: 'mul', a: [11, 99], b: [2, 9] },

  // ---- Additions 3 chiffres (somme <= 999 partout)
  { id: 'add3.centaines', op: 'add', a: centaines, b: centaines, ok: (a, b) => a + b <= 999 },
  { id: 'add3.plus1', op: 'add', a: [100, 999], b: [1, 9], ok: (a, b) => u(a) + b <= 9 && a + b <= 999 },
  { id: 'add3.dizaines', op: 'add', a: [100, 999], b: dizaines, ok: (a, b) => a + b <= 999 },
  { id: 'add3.plusCentaines', op: 'add', a: [100, 999], b: centaines, ok: (a, b) => a + b <= 999 },
  { id: 'add3.plus2sans', op: 'add', a: [100, 999], b: [10, 99], ok: (a, b) => u(a) + u(b) <= 9 && d(a) + d(b) <= 9 && a + b <= 999 },
  { id: 'add3.plus2avec', op: 'add', a: [100, 999], b: [10, 99], ok: (a, b) => (u(a) + u(b) >= 10 || d(a) + d(b) >= 10) && a + b <= 999 },
  { id: 'add3.plus3sans', op: 'add', a: [100, 999], b: [100, 999], ok: (a, b) => u(a) + u(b) <= 9 && d(a) + d(b) <= 9 && c(a) + c(b) <= 9 && a + b <= 999 },
  { id: 'add3.tout', op: 'add', a: [100, 999], b: [100, 999], ok: (a, b) => a + b <= 999 },

  // ---- Soustractions 3 chiffres (résultat >= 0)
  { id: 'sub3.centaines', op: 'sub', a: centaines, b: centaines, ok: (a, b) => b <= a },
  { id: 'sub3.plus1', op: 'sub', a: [100, 999], b: [1, 9], ok: (a, b) => u(a) >= b && a - b >= 0 },
  { id: 'sub3.dizaines', op: 'sub', a: [100, 999], b: dizaines, ok: (a, b) => b <= a },
  { id: 'sub3.plusCentaines', op: 'sub', a: [100, 999], b: centaines, ok: (a, b) => b <= a },
  { id: 'sub3.plus2sans', op: 'sub', a: [100, 999], b: [10, 99], ok: (a, b) => u(a) >= u(b) && d(a) >= d(b) && a - b >= 0 },
  { id: 'sub3.plus2avec', op: 'sub', a: [100, 999], b: [10, 99], ok: (a, b) => (u(a) < u(b) || d(a) < d(b)) && b <= a },
  { id: 'sub3.plus3sans', op: 'sub', a: [100, 999], b: [100, 999], ok: (a, b) => u(a) >= u(b) && d(a) >= d(b) && c(a) >= c(b) && b <= a },
  { id: 'sub3.tout', op: 'sub', a: [100, 999], b: [100, 999], ok: (a, b) => b <= a },

  // ---- Multiplications 3 chiffres
  { id: 'mul3.fois100', op: 'mul', a: [2, 20], b: valeurs(100) },
  { id: 'mul3.centaines2a5', op: 'mul', a: centaines, b: [2, 5] },
  { id: 'mul3.centaines2a9', op: 'mul', a: centaines, b: [2, 9] },
  { id: 'mul3.fois2sans', op: 'mul', a: [100, 999], b: valeurs(2), ok: (a) => c(a) <= 4 && d(a) <= 4 && u(a) <= 4 },
  { id: 'mul3.fois2', op: 'mul', a: [100, 999], b: valeurs(2) },
  { id: 'mul3.fois3sans', op: 'mul', a: [100, 999], b: valeurs(3), ok: (a) => c(a) <= 3 && d(a) <= 3 && u(a) <= 3 },
  { id: 'mul3.dizaines2a5', op: 'mul', a: dizainesDe110a490, b: [2, 5] },
  { id: 'mul3.n101a249', op: 'mul', a: [101, 249], b: [2, 5] },
]

export const TYPES: Record<string, TypeDef> = Object.fromEntries(liste.map((t) => [t.id, t]))

// « Tout » = les ids des niveaux 1 à 5 du parcours.
const tout = (ids: readonly string[]): readonly string[] => ids.slice(0, 5)

// 8 niveaux : une cible (en secondes) et les ids de types de chacun.
function huit(cibles: readonly number[], types: readonly (string | readonly string[])[]): HuitNiveaux {
  return cibles.map((s, n) => {
    const t = types[n] as string | readonly string[]
    return { cibleMs: s * 1000, types: typeof t === 'string' ? [t] : t }
  }) as unknown as HuitNiveaux
}

// Parcours dont les niveaux 6 à 8 sont « tout ».
function avecTout(cibles: readonly number[], ids5: readonly string[]): HuitNiveaux {
  return huit(cibles, [...ids5, tout(ids5), tout(ids5), tout(ids5)])
}

export const NIVEAUX: Record<ParcoursSimpleId, HuitNiveaux> = {
  'add-1': avecTout([7, 7, 6, 6, 6, 5, 4, 3], ['add1.petits', 'add1.somme10', 'add1.complement10', 'add1.doubles', 'add1.sommeSup10']),
  'sub-1': avecTout([7, 7, 6, 6, 6, 5, 4, 3], ['sub1.a5', 'sub1.a9', 'sub1.passage10', 'sub1.a13a16', 'sub1.a11a18']),
  'mul-1': huit(
    [7, 7, 7, 6, 7, 7, 5, 4],
    ['mul1.t12', 'mul1.t25', 'mul1.t34', 'mul1.t2a5', 'mul1.t67', 'mul1.t89', 'mul1.t2a9', 'mul1.t2a9'],
  ),
  'add-2': avecTout([9, 9, 9, 11, 13, 13, 10, 8], ['add2.plus1sans', 'add2.plus1avec', 'add2.dizaines', 'add2.plus2sans', 'add2.plus2avec']),
  'sub-2': avecTout([9, 10, 9, 11, 14, 13, 10, 8], ['sub2.plus1sans', 'sub2.plus1avec', 'sub2.dizaines', 'sub2.plus2sans', 'sub2.plus2avec']),
  'mul-2': huit(
    [7, 9, 10, 11, 13, 14, 15, 15],
    ['mul2.fois10', 'mul2.dizaines2a5', 'mul2.doubles', 'mul2.sansRetenue', 'mul2.n11a19', 'mul2.n11a29', 'mul2.n11a49', 'mul2.n11a99'],
  ),
  'add-3': huit(
    [8, 9, 10, 9, 12, 15, 15, 18],
    ['add3.centaines', 'add3.plus1', 'add3.dizaines', 'add3.plusCentaines', 'add3.plus2sans', 'add3.plus2avec', 'add3.plus3sans', 'add3.tout'],
  ),
  'sub-3': huit(
    [8, 9, 10, 9, 12, 15, 15, 18],
    ['sub3.centaines', 'sub3.plus1', 'sub3.dizaines', 'sub3.plusCentaines', 'sub3.plus2sans', 'sub3.plus2avec', 'sub3.plus3sans', 'sub3.tout'],
  ),
  'mul-3': huit(
    [7, 9, 9, 11, 13, 12, 14, 18],
    ['mul3.fois100', 'mul3.centaines2a5', 'mul3.centaines2a9', 'mul3.fois2sans', 'mul3.fois2', 'mul3.fois3sans', 'mul3.dizaines2a5', 'mul3.n101a249'],
  ),
}

export const PARCOURS_AVANCES: readonly ParcoursId[] = ['add-3', 'sub-3', 'mul-3', 'mix-3'] as const

export function niveau(parcours: ParcoursId, n: number): NiveauDef {
  if (!Number.isInteger(n) || n < 1 || n > 8) throw new Error(`niveau: n doit être entre 1 et 8 (reçu ${n})`)
  const { op, taille } = decomposerParcours(parcours)
  if (op !== 'mix') return NIVEAUX[`${op}-${taille}` as ParcoursSimpleId][n - 1] as NiveauDef
  const trois = (['add', 'sub', 'mul'] as const).map((o) => NIVEAUX[`${o}-${taille}`][n - 1] as NiveauDef)
  return {
    cibleMs: Math.max(...trois.map((t) => t.cibleMs)),
    types: [...new Set(trois.flatMap((t) => t.types))],
  }
}
