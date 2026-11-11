import { COULEURS, MAX_PROFILS, prenomValide, profilVide } from './schema'
import type { Couleur, Donnees, Profil } from './schema'

export function profilParId(d: Donnees, id: string): Profil | undefined {
  return d.profils.find((p) => p.id === id)
}

export function choisirProfil(d: Donnees, id: string): Donnees {
  return profilParId(d, id) ? { ...d, profilActif: id } : d
}

export function prochainNumero(d: Donnees): number {
  let max = 0
  for (const p of d.profils) {
    const m = /^p(\d+)$/.exec(p.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

export function couleurLibre(d: Donnees): Couleur {
  const prises = new Set<Couleur>(d.profils.map((p) => p.couleur))
  const libre = (Object.keys(COULEURS) as Couleur[]).find((c) => !prises.has(c))
  return libre ?? 'bleu'
}

export function ajouterProfil(d: Donnees, prenom?: string): Donnees {
  if (d.profils.length >= MAX_PROFILS) return d
  const n = prochainNumero(d)
  const nom = prenom !== undefined && prenomValide(prenom) ? prenom.trim() : `Enfant ${n}`
  return { ...d, profils: [...d.profils, profilVide('p' + n, nom, couleurLibre(d))] }
}

export function supprimerProfil(d: Donnees, id: string): Donnees {
  if (!profilParId(d, id) || d.profils.length === 1) return d
  const profils = d.profils.filter((p) => p.id !== id)
  const profilActif = d.profilActif === id ? profils[0]!.id : d.profilActif
  return { ...d, profilActif, profils }
}

export function majProfil(
  d: Donnees,
  id: string,
  patch: Partial<Pick<Profil, 'prenom' | 'couleur' | 'reglages' | 'dernierParcours'>>,
): Donnees {
  if (!profilParId(d, id)) return d
  if (patch.prenom !== undefined && !prenomValide(patch.prenom)) return d
  const nettoye = patch.prenom !== undefined ? { ...patch, prenom: patch.prenom.trim() } : patch
  return { ...d, profils: d.profils.map((p) => (p.id === id ? { ...p, ...nettoye } : p)) }
}

export function reinitialiserProfil(d: Donnees, id: string): Donnees {
  if (!profilParId(d, id)) return d
  return { ...d, profils: d.profils.map((p) => (p.id === id ? { ...p, series: [], faits: {}, dernierParcours: null } : p)) }
}
