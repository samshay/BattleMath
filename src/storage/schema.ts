import type { Essai, Fait, ParcoursId, Serie, Vitesse } from '../core/types'

export const VERSION = 2
export const MAX_PROFILS = 4

export const COULEURS = {
  bleu: '#3b5bdb',
  vert: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
  rose: '#d6336c',
  turquoise: '#0c8599',
} as const
export type Couleur = keyof typeof COULEURS

export function estCouleur(x: unknown): x is Couleur {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(COULEURS, x)
}

export interface Reglages {
  parcoursAvances: boolean
  vitesse: Vitesse
}

export interface Profil {
  id: string
  prenom: string
  couleur: Couleur
  reglages: Reglages
  dernierParcours: ParcoursId | null
  series: Serie[]
  faits: Record<string, Fait>
}

export interface Donnees {
  version: 2
  profilActif: string
  profils: Profil[]
}

interface DonneesV1 {
  version: 1
  reglages: Reglages
  dernierParcours: ParcoursId | null
  series: Serie[]
  faits: Record<string, Fait>
}

const REGLAGES_DEFAUT: Reglages = { parcoursAvances: false, vitesse: 'normal' }

export function profilVide(id: string, prenom: string, couleur: Couleur): Profil {
  return { id, prenom, couleur, reglages: { ...REGLAGES_DEFAUT }, dernierParcours: null, series: [], faits: {} }
}

export function donneesVides(): Donnees {
  return { version: 2, profilActif: 'p1', profils: [profilVide('p1', 'Enfant', 'bleu')] }
}

export function prenomValide(s: string): boolean {
  const n = s.trim().length
  return n >= 1 && n <= 12
}

export function profilActif(d: Donnees): Profil {
  return d.profils.find((p) => p.id === d.profilActif) ?? d.profils[0]!
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
  const { date, parcours, niveau, bonnes, tempsMedian, tempsTotal, tempsCible, reussie, validee } = x
  if (typeof date !== 'string' || !estParcoursId(parcours)) return null
  if (!entierDans(niveau, 1, 8) || !entierDans(bonnes, 0, 10)) return null
  if (!nombre(tempsMedian) || tempsMedian < 0 || !nombre(tempsCible) || tempsCible <= 0) return null
  if (typeof reussie !== 'boolean' || typeof validee !== 'boolean') return null
  if (tempsTotal !== undefined && (!nombre(tempsTotal) || tempsTotal < 0)) return null
  return {
    date, parcours, niveau, bonnes, tempsMedian,
    ...(tempsTotal === undefined ? {} : { tempsTotal }),
    tempsCible, reussie, validee,
  }
}

function lireReglages(x: unknown): Reglages | null {
  const defaut = REGLAGES_DEFAUT
  if (x === undefined) return { ...defaut }
  if (!estObjet(x)) return null
  const parcoursAvances = x.parcoursAvances ?? defaut.parcoursAvances
  const vitesse = x.vitesse ?? defaut.vitesse
  if (typeof parcoursAvances !== 'boolean' || !VITESSES.includes(vitesse)) return null
  return { parcoursAvances, vitesse: vitesse as Vitesse }
}

function lireProfil(brut: Obj): Omit<DonneesV1, 'version'> | null {
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
  return { reglages, dernierParcours, series, faits }
}

function validerV1(brut: Obj): DonneesV1 | null {
  const p = lireProfil(brut)
  return p ? { version: 1, ...p } : null
}

function validerV2(brut: Obj): Donnees | null {
  if (!Array.isArray(brut.profils) || brut.profils.length < 1 || brut.profils.length > MAX_PROFILS) return null
  if (typeof brut.profilActif !== 'string') return null
  const profils: Profil[] = []
  const ids = new Set<string>()
  for (const x of brut.profils) {
    if (!estObjet(x)) return null
    const { id, prenom, couleur } = x
    if (typeof id !== 'string' || id === '' || ids.has(id)) return null
    if (typeof prenom !== 'string' || !prenomValide(prenom) || !estCouleur(couleur)) return null
    const p = lireProfil(x)
    if (!p) return null
    ids.add(id)
    profils.push({ id, prenom: prenom.trim(), couleur, ...p })
  }
  if (!ids.has(brut.profilActif)) return null
  return { version: 2, profilActif: brut.profilActif, profils }
}

export function migrer(brut: unknown): ResultatMigration {
  if (!estObjet(brut) || typeof brut.version !== 'number') return { ok: false, erreur: 'structure_invalide' }
  if (brut.version > VERSION) return { ok: false, erreur: 'version_inconnue' }
  let donnees: Donnees | null = null
  if (brut.version === 1) {
    const v1 = validerV1(brut)
    if (v1) {
      const { reglages, dernierParcours, series, faits } = v1
      donnees = { version: 2, profilActif: 'p1', profils: [{ ...profilVide('p1', 'Enfant', 'bleu'), reglages, dernierParcours, series, faits }] }
    }
  } else if (brut.version === 2) {
    donnees = validerV2(brut)
  }
  return donnees ? { ok: true, donnees } : { ok: false, erreur: 'structure_invalide' }
}
