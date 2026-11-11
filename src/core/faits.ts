import type { Calcul, Essai, Fait } from './types'

export const SEUIL_MAITRISE_MS = 5000

export function cleFait(c: Calcul): string {
  const [x, y] = c.op === 'sub' ? [c.a, c.b] : [Math.min(c.a, c.b), Math.max(c.a, c.b)]
  return `${c.op}:${x}·${y}`
}

export function reponseAttendue(c: Calcul): number {
  return c.inconnue === 'b' ? c.b : c.resultat
}

export function faitVide(): Fait {
  return { tentatives: 0, erreurs: 0, tempsCumule: 0, derniers: [] }
}

export function majFait(f: Fait | undefined, essai: Essai): Fait {
  const base = f ?? faitVide()
  return {
    tentatives: base.tentatives + 1,
    erreurs: base.erreurs + (essai.juste ? 0 : 1),
    tempsCumule: base.tempsCumule + essai.temps,
    derniers: [...base.derniers, { ...essai }].slice(-3),
  }
}

export function estMaitrise(f: Fait | undefined, seuilMs: number = SEUIL_MAITRISE_MS): boolean {
  if (!f) return false
  return f.derniers.length === 3 && f.derniers.every((e) => e.juste && e.temps < seuilMs)
}
