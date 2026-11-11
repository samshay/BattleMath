import type { Essai, Fait, ParcoursId, Serie, Vitesse } from '../core/types'

export const VERSION = 1

export interface Reglages {
  parcoursAvances: boolean
  vitesse: Vitesse
}

export interface Donnees {
  version: 1
  reglages: Reglages
  dernierParcours: ParcoursId | null
  series: Serie[]
  faits: Record<string, Fait>
}

export function donneesVides(): Donnees {
  return { version: 1, reglages: { parcoursAvances: false, vitesse: 'normal' }, dernierParcours: null, series: [], faits: {} }
}

export type ResultatMigration =
  | { ok: true; donnees: Donnees }
  | { ok: false; erreur: 'json_invalide' | 'version_inconnue' | 'structure_invalide' }

const OPS = ['add', 'sub', 'mul', 'mix']
const TAILLES = ['1', '2', '3']
const VITESSES: readonly unknown[] = ['tranquille', 'normal', 'rapide']

export function estParcoursId(x: unknown): x is ParcoursId {
  if (typeof x !== 'string') return false
  const parts = x.split('-')
  return parts.length === 2 && OPS.includes(parts[0]!) && TAILLES.includes(parts[1]!)
}

type Obj = Record<string, unknown>
const estObjet = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const nombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const entierDans = (x: unknown, min: number, max: number): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max

function lireEssai(x: unknown): Essai | null {
  if (!estObjet(x) || typeof x.juste !== 'boolean' || !nombre(x.temps)) return null
  return { juste: x.juste, temps: x.temps }
}

function lireFait(x: unknown): Fait | null {
  if (!estObjet(x)) return null
  const { tentatives, erreurs, tempsCumule, derniers } = x
  if (!nombre(tentatives) || tentatives < 0 || !nombre(erreurs) || erreurs < 0 || !nombre(tempsCumule) || tempsCumule < 0) return null
  if (!Array.isArray(derniers) || derniers.length > 3) return null
  const essais: Essai[] = []
  for (const e of derniers) {
    const essai = lireEssai(e)
    if (!essai) return null
    essais.push(essai)
  }
  return { tentatives, erreurs, tempsCumule, derniers: essais }
}

function lireSerie(x: unknown): Serie | null {
  if (!estObjet(x)) return null
  const { date, parcours, niveau, bonnes, tempsMedian, tempsCible, reussie, validee } = x
  if (typeof date !== 'string' || !estParcoursId(parcours)) return null
  if (!entierDans(niveau, 1, 8) || !entierDans(bonnes, 0, 10)) return null
  if (!nombre(tempsMedian) || tempsMedian < 0 || !nombre(tempsCible) || tempsCible <= 0) return null
  if (typeof reussie !== 'boolean' || typeof validee !== 'boolean') return null
  return { date, parcours, niveau, bonnes, tempsMedian, tempsCible, reussie, validee }
}

function lireReglages(x: unknown): Reglages | null {
  if (x === undefined) return donneesVides().reglages
  if (!estObjet(x)) return null
  const defaut = donneesVides().reglages
  const parcoursAvances = x.parcoursAvances ?? defaut.parcoursAvances
  const vitesse = x.vitesse ?? defaut.vitesse
  if (typeof parcoursAvances !== 'boolean' || !VITESSES.includes(vitesse)) return null
  return { parcoursAvances, vitesse: vitesse as Vitesse }
}

function valider(brut: Obj): Donnees | null {
  const reglages = lireReglages(brut.reglages)
  if (!reglages) return null
  const dernierParcours = brut.dernierParcours ?? null
  if (dernierParcours !== null && !estParcoursId(dernierParcours)) return null
  if (!Array.isArray(brut.series) || !estObjet(brut.faits)) return null
  const series: Serie[] = []
  for (const s of brut.series) {
    const serie = lireSerie(s)
    if (!serie) return null
    series.push(serie)
  }
  const faits: Record<string, Fait> = {}
  for (const [cle, f] of Object.entries(brut.faits)) {
    const fait = lireFait(f)
    if (!fait) return null
    faits[cle] = fait
  }
  return { version: 1, reglages, dernierParcours, series, faits }
}

export function migrer(brut: unknown): ResultatMigration {
  if (!estObjet(brut) || typeof brut.version !== 'number') return { ok: false, erreur: 'structure_invalide' }
  if (brut.version > VERSION) return { ok: false, erreur: 'version_inconnue' }
  if (brut.version !== 1) return { ok: false, erreur: 'structure_invalide' }
  const donnees = valider(brut)
  return donnees ? { ok: true, donnees } : { ok: false, erreur: 'structure_invalide' }
}
