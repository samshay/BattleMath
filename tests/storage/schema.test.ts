import { describe, expect, test } from 'vitest'
import { donneesVides, estParcoursId, migrer, VERSION } from '../../src/storage/schema'

const serie = (o: object = {}) => ({
  date: '2026-11-11', parcours: 'add-1', niveau: 3, bonnes: 9, tempsMedian: 4000, tempsCible: 6000, reussie: true, validee: true, ...o,
})
const fait = (o: object = {}) => ({ tentatives: 3, erreurs: 1, tempsCumule: 9000, derniers: [{ juste: true, temps: 3000 }], ...o })
const err = (e: string) => ({ ok: false, erreur: e })

describe('migrer', () => {
  test('VERSION et estParcoursId', () => {
    expect(VERSION).toBe(1)
    expect(estParcoursId('mix-3')).toBe(true)
    expect(estParcoursId('div-1')).toBe(false)
    expect(estParcoursId('add-4')).toBe(false)
    expect(estParcoursId(3)).toBe(false)
  })
  test('données vides ok, copie fraîche', () => {
    const d = donneesVides()
    const r = migrer(d)
    expect(r).toEqual({ ok: true, donnees: d })
    if (r.ok) expect(r.donnees).not.toBe(d)
  })
  test('rejets de structure', () => {
    expect(migrer('x')).toEqual(err('structure_invalide'))
    expect(migrer(null)).toEqual(err('structure_invalide'))
    expect(migrer({})).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), version: 0 })).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), version: '1' })).toEqual(err('structure_invalide'))
  })
  test('version future', () => {
    expect(migrer({ version: 2 })).toEqual(err('version_inconnue'))
  })
  test('séries invalides', () => {
    for (const o of [{ niveau: 9 }, { niveau: 0 }, { bonnes: 11 }, { parcours: 'x' }, { tempsCible: 0 }, { reussie: 'oui' }]) {
      expect(migrer({ ...donneesVides(), series: [serie(o)] })).toEqual(err('structure_invalide'))
    }
  })
  test('reglages complétés par défaut', () => {
    const r = migrer({ ...donneesVides(), reglages: {} })
    expect(r).toEqual({ ok: true, donnees: donneesVides() })
  })
  test('vitesse et dernierParcours invalides', () => {
    expect(migrer({ ...donneesVides(), reglages: { vitesse: 'lent' } })).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), dernierParcours: 'zzz' })).toEqual(err('structure_invalide'))
  })
  test('fait avec 4 derniers → invalide', () => {
    const d = Array.from({ length: 4 }, () => ({ juste: true, temps: 1 }))
    expect(migrer({ ...donneesVides(), faits: { '2+3': fait({ derniers: d }) } })).toEqual(err('structure_invalide'))
  })
  test('objet complet rendu intact', () => {
    const complet = {
      version: 1,
      reglages: { parcoursAvances: true, vitesse: 'rapide' },
      dernierParcours: 'mul-2',
      series: [serie(), serie({ niveau: 8, bonnes: 10, validee: false })],
      faits: { '2+3': fait() },
    }
    expect(migrer(complet)).toEqual({ ok: true, donnees: complet })
  })
})
