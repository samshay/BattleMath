import type { Calcul, Fait, Op, ParcoursId } from './types'
import { decomposerParcours } from './types'
import type { Rng } from './rng'
import { genererCalcul, typeAccepte, type TypeDef } from './typesCalcul'
import { niveau, TYPES } from './levels'
import { cleFait, estMaitrise } from './faits'

export const TAILLE_SERIE = 10
export const MAX_FAITS_FAIBLES = 3

const MAX_ESSAIS = 200
const MAX_REMELANGES = 20

// Clé d'unicité : comme cleFait, mais distingue les compléments « a + ▢ = 10 ».
function cleUnicite(c: Calcul): string {
  return c.inconnue === 'b' ? `${cleFait(c)}?${c.a}` : cleFait(c)
}

function calculer(op: Op, a: number, b: number): number {
  if (op === 'add') return a + b
  if (op === 'sub') return a - b
  return a * b
}

// Reconstruit un calcul depuis une clé de fait « op:a·b » si une def du niveau l'accepte.
function reconstruire(cle: string, defs: readonly TypeDef[]): Calcul | null {
  const m = /^(add|sub|mul):(\d+)·(\d+)$/.exec(cle)
  if (!m) return null
  const op = m[1] as Op
  const a = Number(m[2])
  const b = Number(m[3])
  for (const def of defs) {
    if (def.op !== op) continue
    const inconnue = def.inconnue ?? 'resultat'
    const calcul: Calcul = { op, a, b, resultat: inconnue === 'b' ? a + b : calculer(op, a, b), inconnue }
    if (typeAccepte(def, calcul)) return calcul
  }
  return null
}

function sansDoublonConsecutif(serie: readonly Calcul[]): boolean {
  for (let i = 1; i < serie.length; i++) {
    if (cleUnicite(serie[i] as Calcul) === cleUnicite(serie[i - 1] as Calcul)) return false
  }
  return true
}

export function genererSerie(parcours: ParcoursId, n: number, rng: Rng, faits: Record<string, Fait> = {}): Calcul[] {
  const defs = niveau(parcours, n).types.map((id) => {
    const def = TYPES[id]
    if (!def) throw new Error(`genererSerie: type inconnu "${id}"`)
    return def
  })
  const { op, taille } = decomposerParcours(parcours)
  const serie: Calcul[] = []
  const utilises = new Set<string>()

  const ajouter = (c: Calcul): void => {
    serie.push(c)
    utilises.add(cleUnicite(c))
  }

  const tirer = (pool: readonly TypeDef[]): Calcul => {
    const precedent = serie[serie.length - 1]
    for (let essai = 0; essai < MAX_ESSAIS; essai++) {
      const def = rng.pick(pool)
      const c = genererCalcul(def, rng)
      const cle = cleUnicite(c)
      if (def.repetitions) {
        // Unicité préférée ; la répétition n'est tolérée (hors doublon consécutif) qu'en dernier recours.
        if (precedent && cleUnicite(precedent) === cle) continue
        if (essai < MAX_ESSAIS / 2 && utilises.has(cle)) continue
      } else if (utilises.has(cle)) {
        continue
      }
      return c
    }
    throw new Error(`genererSerie: impossible de tirer un calcul unique (parcours ${parcours}, niveau ${n})`)
  }

  // Pondération par les faits faibles (parcours à 1 chiffre uniquement).
  if (taille === 1) {
    const eligibles: { cle: string; calcul: Calcul }[] = []
    for (const [cle, fait] of Object.entries(faits)) {
      if (fait.tentatives <= 0 || estMaitrise(fait)) continue
      const calcul = reconstruire(cle, defs)
      if (calcul) eligibles.push({ cle, calcul })
    }
    // Au plus MAX_FAITS_FAIBLES faits forcés ; le reste est tiré uniformément (d'autres faits faibles peuvent sortir par hasard).
    for (const e of rng.shuffle(eligibles).slice(0, MAX_FAITS_FAIBLES)) {
      const c = e.calcul
      if (c.op !== 'sub' && rng.next() < 0.5) ajouter({ ...c, a: c.b, b: c.a })
      else ajouter(c)
    }
  }

  // Mixte : au moins 2 calculs par opération.
  if (op === 'mix') {
    for (const o of ['add', 'sub', 'mul'] as const) {
      const pool = defs.filter((d) => d.op === o)
      while (serie.filter((c) => c.op === o).length < 2) ajouter(tirer(pool))
    }
  }

  while (serie.length < TAILLE_SERIE) ajouter(tirer(defs))

  let resultat = rng.shuffle(serie)
  for (let i = 0; i < MAX_REMELANGES && !sansDoublonConsecutif(resultat); i++) resultat = rng.shuffle(serie)
  return resultat
}
