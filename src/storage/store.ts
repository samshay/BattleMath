import type { Essai, Serie } from '../core/types'
import { majFait } from '../core/faits'
import { donneesVides, migrer, profilActif } from './schema'
import type { Donnees, ResultatMigration } from './schema'

export const CLE_STOCKAGE = 'battlemath.v1'

export interface StockageLike {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export type Chargement = {
  donnees: Donnees
  avertissement: null | 'stockage_indisponible' | 'donnees_corrompues'
}

/** Ne modifie jamais le stockage : une valeur corrompue est conservée. */
export function charger(stockage: StockageLike | null): Chargement {
  if (stockage === null) return { donnees: donneesVides(), avertissement: 'stockage_indisponible' }
  let brut: string | null
  try {
    brut = stockage.getItem(CLE_STOCKAGE)
  } catch {
    return { donnees: donneesVides(), avertissement: 'stockage_indisponible' }
  }
  if (brut === null) return { donnees: donneesVides(), avertissement: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(brut)
  } catch {
    return { donnees: donneesVides(), avertissement: 'donnees_corrompues' }
  }
  const r = migrer(parsed)
  if (!r.ok) return { donnees: donneesVides(), avertissement: 'donnees_corrompues' }
  return { donnees: r.donnees, avertissement: null }
}

export function sauver(stockage: StockageLike | null, d: Donnees): boolean {
  if (stockage === null) return false
  try {
    stockage.setItem(CLE_STOCKAGE, JSON.stringify(d))
    return true
  } catch {
    return false
  }
}

export interface MajFaitEntree {
  cle: string
  essai: Essai
}

export function enregistrerSerie(d: Donnees, serie: Serie, faits: readonly MajFaitEntree[]): Donnees {
  const actif = profilActif(d)
  const nouveauxFaits = { ...actif.faits }
  for (const { cle, essai } of faits) nouveauxFaits[cle] = majFait(nouveauxFaits[cle], essai)
  const maj = { ...actif, dernierParcours: serie.parcours, series: [...actif.series, serie], faits: nouveauxFaits }
  return { ...d, profils: d.profils.map((p) => (p === actif ? maj : p)) }
}

export function exporterJson(d: Donnees): string {
  return JSON.stringify(d, null, 2)
}

export function nomFichierExport(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `battlemath-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`
}

export function importerJson(texte: string): ResultatMigration {
  let parsed: unknown
  try {
    parsed = JSON.parse(texte)
  } catch {
    return { ok: false, erreur: 'json_invalide' }
  }
  return migrer(parsed)
}

export function reinitialiser(stockage: StockageLike | null): Donnees {
  try {
    stockage?.removeItem(CLE_STOCKAGE)
  } catch {
    // échec ignoré : les données en mémoire sont réinitialisées quoi qu'il arrive
  }
  return donneesVides()
}
