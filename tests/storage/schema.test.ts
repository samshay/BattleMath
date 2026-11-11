import { describe, expect, test } from 'vitest'
import { COULEURS, donneesVides, estParcoursId, migrer, prenomValide, profilActif, profilVide, VERSION } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { fixtureV1 } from '../aide/donnees'

const serie = (o: object = {}) => ({
  date: '2026-11-11', parcours: 'add-1', niveau: 3, bonnes: 9, tempsMedian: 4000, tempsCible: 6000, reussie: true, validee: true, ...o,
})
const fait = (o: object = {}) => ({ tentatives: 3, erreurs: 1, tempsCumule: 9000, derniers: [{ juste: true, temps: 3000 }], ...o })
const err = (e: string) => ({ ok: false, erreur: e })
/** v2 avec un profil p1 modifié. */
const v2 = (patch: object = {}) => {
  const d = donneesVides()
  return { ...d, profils: [{ ...d.profils[0]!, ...patch }] }
}
const deux = () => ({
  version: 2,
  profilActif: 'p2',
  profils: [profilVide('p1', 'Léa', 'rose'), { ...profilVide('p2', 'Tom', 'vert'), series: [serie()], faits: { '2+3': fait() }, dernierParcours: 'mul-2' }],
})

describe('migrer v2', () => {
  test('COULEURS : mêmes 6 clés, valeurs du thème spatial', () => {
    expect(COULEURS).toEqual({ bleu: '#6C8CFF', vert: '#5EE6A0', orange: '#FF9F45', violet: '#A78BFA', rose: '#FF6FB1', turquoise: '#4FD8EB' })
  })
  test('prénom importé trimé', () => {
    const d = v2({ prenom: ' Léa ' })
    const r = migrer(d)
    expect(r.ok && r.donnees.profils[0]!.prenom).toBe('Léa')
  })
  test('profilActif : repli sur profils[0] si id inconnu', () => {
    const d = { ...deux(), profilActif: 'zz' } as unknown as Donnees
    expect(profilActif(d).id).toBe('p1')
  })
  test('VERSION et estParcoursId', () => {
    expect(VERSION).toBe(2)
    expect(estParcoursId('mix-3')).toBe(true)
    expect(estParcoursId('div-1')).toBe(false)
    expect(estParcoursId('add-4')).toBe(false)
    expect(estParcoursId(3)).toBe(false)
  })
  test('données vides ok, copie fraîche', () => {
    const d = donneesVides()
    expect(d.profilActif).toBe('p1')
    expect(d.profils).toHaveLength(1)
    expect(d.profils[0]).toMatchObject({ id: 'p1', prenom: 'Enfant', couleur: 'bleu' })
    const r = migrer(d)
    expect(r).toEqual({ ok: true, donnees: d })
    if (r.ok) expect(r.donnees).not.toBe(d)
  })
  test('v2 à 2 profils rendue intacte', () => {
    expect(migrer(deux())).toEqual({ ok: true, donnees: deux() })
  })
  test('rejets de structure', () => {
    expect(migrer('x')).toEqual(err('structure_invalide'))
    expect(migrer(null)).toEqual(err('structure_invalide'))
    expect(migrer({})).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), version: 0 })).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), version: 'x' })).toEqual(err('structure_invalide'))
  })
  test('version future', () => {
    expect(migrer({ ...donneesVides(), version: 3 })).toEqual(err('version_inconnue'))
  })
  test('profilActif orphelin, ids dupliqués, nombre de profils', () => {
    expect(migrer({ ...deux(), profilActif: 'zz' })).toEqual(err('structure_invalide'))
    const d = deux()
    expect(migrer({ ...d, profils: [d.profils[0], { ...d.profils[1]!, id: 'p1' }] })).toEqual(err('structure_invalide'))
    const cinq = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => profilVide(id, 'X', 'bleu'))
    expect(migrer({ ...donneesVides(), profils: cinq })).toEqual(err('structure_invalide'))
    expect(migrer({ ...donneesVides(), profils: cinq.slice(0, 4) }).ok).toBe(true)
    expect(migrer({ ...donneesVides(), profils: [] })).toEqual(err('structure_invalide'))
  })
  test('couleur et prénom invalides', () => {
    expect(migrer(v2({ couleur: 'noir' }))).toEqual(err('structure_invalide'))
    expect(migrer(v2({ prenom: '' }))).toEqual(err('structure_invalide'))
    expect(migrer(v2({ prenom: 'A'.repeat(13) }))).toEqual(err('structure_invalide'))
    expect(migrer(v2({ id: '' }))).toEqual(err('structure_invalide'))
  })
  test('prenomValide', () => {
    expect(prenomValide('  Léa ')).toBe(true)
    expect(prenomValide('')).toBe(false)
    expect(prenomValide('   ')).toBe(false)
    expect(prenomValide('A'.repeat(13))).toBe(false)
  })
  test('séries invalides', () => {
    for (const o of [{ niveau: 9 }, { niveau: 0 }, { bonnes: 11 }, { parcours: 'x' }, { tempsCible: 0 }, { reussie: 'oui' }]) {
      expect(migrer(v2({ series: [serie(o)] }))).toEqual(err('structure_invalide'))
    }
  })
  test('série avec tempsTotal : acceptée et conservée', () => {
    const r = migrer(v2({ series: [serie({ tempsTotal: 38200 })] }))
    expect(r.ok && r.donnees.profils[0]!.series[0]!.tempsTotal).toBe(38200)
  })
  test('série sans tempsTotal (anciennes données) : acceptée, champ absent', () => {
    const r = migrer(v2({ series: [serie()] }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.donnees.profils[0]!.series[0]!.tempsTotal).toBeUndefined()
  })
  test('tempsTotal négatif ou non numérique : invalide', () => {
    for (const t of [-1, 'x', null, Infinity]) {
      expect(migrer(v2({ series: [serie({ tempsTotal: t })] }))).toEqual(err('structure_invalide'))
    }
  })
  test('reglages complétés par défaut', () => {
    expect(migrer(v2({ reglages: {} }))).toEqual({ ok: true, donnees: donneesVides() })
  })
  test('vitesse et dernierParcours invalides', () => {
    expect(migrer(v2({ reglages: { vitesse: 'lent' } }))).toEqual(err('structure_invalide'))
    expect(migrer(v2({ dernierParcours: 'zzz' }))).toEqual(err('structure_invalide'))
  })
  test('fait avec 4 derniers → invalide', () => {
    const d = Array.from({ length: 4 }, () => ({ juste: true, temps: 1 }))
    expect(migrer(v2({ faits: { '2+3': fait({ derniers: d }) } }))).toEqual(err('structure_invalide'))
  })
})

describe('migrer v1 → v2', () => {
  test('fixture complète enveloppée dans p1', () => {
    const v1 = fixtureV1()
    const r = migrer(v1)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.donnees.version).toBe(2)
    expect(r.donnees.profilActif).toBe('p1')
    expect(r.donnees.profils).toHaveLength(1)
    const p = r.donnees.profils[0]!
    expect(p.id).toBe('p1')
    expect(p.prenom).toBe('Enfant')
    expect(p.couleur).toBe('bleu')
    expect(p.series).toEqual(v1.series)
    expect(p.faits).toEqual(v1.faits)
    expect(p.reglages).toEqual(v1.reglages)
    expect(p.dernierParcours).toBe('mul-1')
  })
  test('v1 invalide rejetée, reglages manquants complétés', () => {
    expect(migrer({ ...fixtureV1(), series: [serie({ niveau: 9 })] })).toEqual(err('structure_invalide'))
    const { reglages: _r, ...sans } = fixtureV1()
    const r = migrer(sans)
    expect(r.ok && r.donnees.profils[0]!.reglages).toEqual({ parcoursAvances: false, vitesse: 'normal' })
  })
})
