import { describe, expect, it } from 'vitest'
import {
  ajouterProfil, choisirProfil, couleurLibre, majProfil, prochainNumero, profilParId, reinitialiserProfil, supprimerProfil,
} from '../../src/storage/profils'
import { donneesVides, profilVide } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'

const plein = (): Donnees => ajouterProfil(ajouterProfil(ajouterProfil(donneesVides())))

describe('ajouterProfil', () => {
  it('3 ajouts : p1..p4, prénoms par défaut, couleurs distinctes', () => {
    const d = plein()
    expect(d.profils.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(d.profils.slice(1).map((p) => p.prenom)).toEqual(['Enfant 2', 'Enfant 3', 'Enfant 4'])
    expect(new Set(d.profils.map((p) => p.couleur)).size).toBe(4)
    expect(d.profilActif).toBe('p1')
  })
  it('5e ajout : inchangé', () => {
    const d = plein()
    expect(ajouterProfil(d, 'Zoé')).toBe(d)
  })
  it('prénom fourni, trimé ; invalide → défaut', () => {
    expect(ajouterProfil(donneesVides(), ' Léa ').profils[1]!.prenom).toBe('Léa')
    expect(ajouterProfil(donneesVides(), '  ').profils[1]!.prenom).toBe('Enfant 2')
  })
  it('après suppression de p2, id p5 (pas de doublon)', () => {
    const d = ajouterProfil(supprimerProfil(plein(), 'p2'))
    expect(d.profils.map((p) => p.id)).toEqual(['p1', 'p3', 'p4', 'p5'])
  })
  it('ne mute pas', () => {
    const d = donneesVides()
    const copie = structuredClone(d)
    ajouterProfil(d, 'Léa')
    expect(d).toEqual(copie)
  })
})

describe('prochainNumero / couleurLibre / profilParId', () => {
  it('ignore les ids non conformes ; défaut 1', () => {
    const d = donneesVides()
    expect(prochainNumero({ ...d, profils: [profilVide('x', 'A', 'bleu')] })).toBe(1)
    expect(prochainNumero({ ...d, profils: [profilVide('x', 'A', 'bleu'), profilVide('p7', 'B', 'vert')] })).toBe(8)
  })
  it('couleur libre : première non utilisée, sinon bleu', () => {
    expect(couleurLibre(donneesVides())).toBe('vert')
    const six = { ...donneesVides(), profils: ['bleu', 'vert', 'orange', 'violet', 'rose', 'turquoise'].map((c, i) => profilVide('p' + (i + 1), 'A', c as 'bleu')) }
    expect(couleurLibre(six)).toBe('bleu')
  })
  it('profilParId', () => {
    const d = plein()
    expect(profilParId(d, 'p3')).toBe(d.profils[2])
    expect(profilParId(d, 'zz')).toBeUndefined()
  })
})

describe('supprimerProfil', () => {
  it('dernier profil ou id inconnu : inchangé', () => {
    const d = donneesVides()
    expect(supprimerProfil(d, 'p1')).toBe(d)
    const e = plein()
    expect(supprimerProfil(e, 'zz')).toBe(e)
  })
  it('supprime un profil non actif sans changer l\'actif', () => {
    const d = plein()
    const copie = structuredClone(d)
    const r = supprimerProfil(d, 'p3')
    expect(d).toEqual(copie)
    expect(r.profils.map((p) => p.id)).toEqual(['p1', 'p2', 'p4'])
    expect(r.profilActif).toBe('p1')
  })
  it('suppression de l\'actif : premier restant', () => {
    const d = choisirProfil(plein(), 'p3')
    const r = supprimerProfil(d, 'p3')
    expect(r.profilActif).toBe('p1')
    expect(supprimerProfil(r, 'p1').profilActif).toBe('p2')
  })
})

describe('majProfil', () => {
  it('prénom invalide : inchangé ; id inconnu : inchangé', () => {
    const d = plein()
    expect(majProfil(d, 'p2', { prenom: '' })).toBe(d)
    expect(majProfil(d, 'zz', { prenom: 'A' })).toBe(d)
  })
  it('prénom trimé', () => {
    const d = plein()
    const copie = structuredClone(d)
    expect(profilParId(majProfil(d, 'p2', { prenom: ' Léa ' }), 'p2')!.prenom).toBe('Léa')
    expect(d).toEqual(copie)
  })
  it('réglages : seul ce profil change', () => {
    const d = plein()
    const r = majProfil(d, 'p2', { reglages: { parcoursAvances: true, vitesse: 'rapide' } })
    expect(r.profils[1]!.reglages).toEqual({ parcoursAvances: true, vitesse: 'rapide' })
    for (const i of [0, 2, 3]) expect(r.profils[i]).toBe(d.profils[i])
  })
})

describe('reinitialiserProfil', () => {
  it('vide séries/faits/dernierParcours, garde le reste, autre profil intact', () => {
    let d = plein()
    d = {
      ...d,
      profils: d.profils.map((p) => ({
        ...p,
        dernierParcours: 'add-1' as const,
        reglages: { parcoursAvances: true, vitesse: 'rapide' as const },
        faits: { x: { tentatives: 1, erreurs: 0, tempsCumule: 1, derniers: [] } },
      })),
    }
    const r = reinitialiserProfil(d, 'p2')
    const p = r.profils[1]!
    expect(p.series).toEqual([])
    expect(p.faits).toEqual({})
    expect(p.dernierParcours).toBeNull()
    expect(p.prenom).toBe('Enfant 2')
    expect(p.couleur).toBe(d.profils[1]!.couleur)
    expect(p.reglages).toEqual(d.profils[1]!.reglages)
    expect(r.profils[0]).toBe(d.profils[0])
    expect(reinitialiserProfil(d, 'zz')).toBe(d)
  })
})

describe('choisirProfil', () => {
  it('id inconnu : inchangé ; connu : change l\'actif', () => {
    const d = plein()
    expect(choisirProfil(d, 'zz')).toBe(d)
    expect(choisirProfil(d, 'p3').profilActif).toBe('p3')
  })
})
