import { donneesVides } from '../../src/storage/schema'
import type { Donnees, Profil } from '../../src/storage/schema'

/** Données v2 avec un seul profil `p1`, modifié par `patch`. */
export function avecProfil(patch: Partial<Profil> = {}): Donnees {
  const d = donneesVides()
  return { ...d, profils: [{ ...d.profils[0]!, ...patch }] }
}

/** Objet v1 complet : 2 séries, 1 fait, vitesse tranquille, dernier parcours mul-1. */
export function fixtureV1() {
  return {
    version: 1,
    reglages: { parcoursAvances: true, vitesse: 'tranquille' },
    dernierParcours: 'mul-1',
    series: [
      { date: '2026-11-10', parcours: 'add-1', niveau: 3, bonnes: 9, tempsMedian: 4000, tempsCible: 6000, reussie: true, validee: true },
      { date: '2026-11-11', parcours: 'mul-1', niveau: 8, bonnes: 10, tempsMedian: 2000, tempsCible: 4000, reussie: true, validee: false },
    ],
    faits: { '2+3': { tentatives: 3, erreurs: 1, tempsCumule: 9000, derniers: [{ juste: true, temps: 3000 }] } },
  }
}

/** Données v2 à deux profils `p1` (Joueur 1, bleu) et `p2` (Joueur 2), chacun modifié par son patch. */
export function deuxProfils(patch1: Partial<Profil> = {}, patch2: Partial<Profil> = {}, actif = 'p1'): Donnees {
  const d = donneesVides()
  const base = d.profils[0]!
  return {
    ...d,
    profilActif: actif,
    profils: [
      { ...base, ...patch1 },
      { ...base, id: 'p2', prenom: 'Joueur 2', couleur: 'vert', ...patch2 },
    ],
  }
}
