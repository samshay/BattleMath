import { describe, expect, it, vi } from 'vitest'
import {
  CLE_STOCKAGE, charger, sauver, enregistrerSerie, exporterJson, nomFichierExport, importerJson, reinitialiser,
} from '../../src/storage/store'
import type { StockageLike } from '../../src/storage/store'
import { donneesVides, profilActif, profilVide } from '../../src/storage/schema'
import { fixtureV1 } from '../aide/donnees'
import type { Donnees } from '../../src/storage/schema'
import type { Serie } from '../../src/core/types'

function faux(init?: string): StockageLike & { m: Map<string, string> } {
  const m = new Map<string, string>()
  if (init !== undefined) m.set(CLE_STOCKAGE, init)
  return {
    m,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v) },
    removeItem: (k) => { m.delete(k) },
  }
}
const quiThrow = (): StockageLike => ({
  getItem: () => { throw new Error('boom') },
  setItem: () => { throw new Error('quota') },
  removeItem: () => { throw new Error('boom') },
})

const serie: Serie = { date: '2026-11-11', parcours: 'mul-2', niveau: 3, bonnes: 9, tempsMedian: 2000, tempsCible: 4000, reussie: true, validee: false }

describe('charger / sauver', () => {
  it('stockage vide : données vides, pas d\'avertissement', () => {
    expect(charger(faux())).toEqual({ donnees: donneesVides(), avertissement: null })
  })
  it('sauver puis charger redonne les mêmes données', () => {
    const s = faux()
    const d = enregistrerSerie(donneesVides(), serie, [{ cle: 'a', essai: { juste: true, temps: 1000 } }])
    expect(sauver(s, d)).toBe(true)
    expect(charger(s)).toEqual({ donnees: d, avertissement: null })
  })
  it('stockage null : indisponible', () => {
    expect(charger(null)).toEqual({ donnees: donneesVides(), avertissement: 'stockage_indisponible' })
    expect(sauver(null, donneesVides())).toBe(false)
  })
  it('getItem qui throw : indisponible', () => {
    expect(charger(quiThrow())).toEqual({ donnees: donneesVides(), avertissement: 'stockage_indisponible' })
  })
  it('setItem qui throw : sauver renvoie false', () => {
    expect(sauver(quiThrow(), donneesVides())).toBe(false)
  })
  it('JSON tronqué : corrompu, valeur conservée', () => {
    const s = faux('{"version":')
    const set = vi.spyOn(s, 'setItem')
    const rem = vi.spyOn(s, 'removeItem')
    expect(charger(s)).toEqual({ donnees: donneesVides(), avertissement: 'donnees_corrompues' })
    expect(s.getItem(CLE_STOCKAGE)).toBe('{"version":')
    expect(set).not.toHaveBeenCalled()
    expect(rem).not.toHaveBeenCalled()
  })
  it('version inconnue : corrompu, valeur conservée', () => {
    const s = faux('{"version":9}')
    expect(charger(s)).toEqual({ donnees: donneesVides(), avertissement: 'donnees_corrompues' })
    expect(s.getItem(CLE_STOCKAGE)).toBe('{"version":9}')
  })
})

describe('enregistrerSerie', () => {
  it('ajoute la série, met à jour faits et dernierParcours sans muter', () => {
    const base: Donnees = enregistrerSerie(donneesVides(), { ...serie, parcours: 'add-1' }, [{ cle: 'x', essai: { juste: false, temps: 3000 } }])
    const copie = structuredClone(base)
    const r = enregistrerSerie(base, serie, [
      { cle: 'x', essai: { juste: true, temps: 1000 } },
      { cle: 'nouveau', essai: { juste: true, temps: 500 } },
    ])
    expect(r).not.toBe(base)
    expect(base).toEqual(copie)
    const p = profilActif(r)
    expect(p.series).toHaveLength(2)
    expect(p.series[1]).toEqual(serie)
    expect(p.dernierParcours).toBe('mul-2')
    expect(p.faits['x']!.tentatives).toBe(2)
    expect(p.faits['nouveau']!.tentatives).toBe(1)
    expect(p.reglages).toEqual(profilActif(base).reglages)
    expect(r.version).toBe(2)
  })
  it('n\'écrit que dans le profil actif', () => {
    const d: Donnees = { ...donneesVides(), profilActif: 'p2', profils: [profilVide('p1', 'A', 'bleu'), profilVide('p2', 'B', 'vert')] }
    const copie = structuredClone(d)
    const r = enregistrerSerie(d, serie, [{ cle: 'x', essai: { juste: true, temps: 1000 } }])
    expect(d).toEqual(copie)
    expect(r.profils[0]).toEqual(copie.profils[0])
    expect(r.profils[1]!.series).toEqual([serie])
    expect(r.profils[1]!.faits['x']!.tentatives).toBe(1)
    expect(r.profils[1]!.dernierParcours).toBe('mul-2')
  })
})

describe('export / import', () => {
  it('json invalide', () => {
    expect(importerJson('pas du json')).toEqual({ ok: false, erreur: 'json_invalide' })
  })
  it('aller-retour', () => {
    const d = enregistrerSerie(donneesVides(), serie, [{ cle: 'a', essai: { juste: true, temps: 1000 } }])
    const r = importerJson(exporterJson(d))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.donnees).toEqual(d)
  })
  it('import d\'une v1 : migrée en v2', () => {
    const r = importerJson(JSON.stringify(fixtureV1()))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.donnees.version).toBe(2)
  })
  it('nom de fichier', () => {
    expect(nomFichierExport(new Date(2026, 10, 11))).toBe('battlemath-2026-11-11.json')
    expect(nomFichierExport(new Date(2026, 0, 5))).toBe('battlemath-2026-01-05.json')
  })
})

describe('reinitialiser', () => {
  it('appelle removeItem et renvoie des données vides', () => {
    const s = faux('{"version":1}')
    const rem = vi.spyOn(s, 'removeItem')
    expect(reinitialiser(s)).toEqual(donneesVides())
    expect(rem).toHaveBeenCalledWith(CLE_STOCKAGE)
    expect(s.m.has(CLE_STOCKAGE)).toBe(false)
  })
  it('tolère un stockage null ou qui throw', () => {
    expect(reinitialiser(null)).toEqual(donneesVides())
    expect(reinitialiser(quiThrow())).toEqual(donneesVides())
  })
})
