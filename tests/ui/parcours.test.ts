// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { rendreParcours, selectionDepuisProfil } from '../../src/ui/parcours'
import type { ContexteApp } from '../../src/ui/accueil'
import { donneesVides, profilActif } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { avecProfil, deuxProfils } from '../aide/donnees'
import type { Serie } from '../../src/core/types'

function ctxDe(donnees: Donnees = donneesVides(), avertissement: ContexteApp['avertissement'] = null): ContexteApp {
  const ctx: ContexteApp = {
    donnees,
    avertissement,
    sauver: vi.fn((d: Donnees) => { ctx.donnees = d; return true }),
    naviguer: vi.fn(),
    selection: { op: 'add', taille: 1 },
  }
  return ctx
}

const serieValidee = (parcours: Serie['parcours'], niveau: number): Serie => ({
  date: '2026-11-11T10:00:00.000Z', parcours, niveau, bonnes: 10, tempsMedian: 2, tempsCible: 4, reussie: true, validee: true,
})

describe('rendreParcours', () => {
  it('sans série : pas de continuer, 8 niveaux, seul le 1 ouvert, 2 tailles', () => {
    const racine = rendreParcours(ctxDe())
    expect(racine.querySelector('[data-test="continuer"]')).toBeNull()
    const niveaux = racine.querySelectorAll<HTMLButtonElement>('button.niveau')
    expect(niveaux).toHaveLength(8)
    expect(niveaux[0]!.dataset.etat).toBe('ouvert')
    expect(niveaux[0]!.disabled).toBe(false)
    expect(niveaux[1]!.disabled).toBe(true)
    expect(racine.querySelectorAll('button.taille')).toHaveLength(2)
    expect(racine.querySelectorAll('button.op')).toHaveLength(4)
  })

  it('en-tête : prénom, pastille, étoiles du profil actif, Changer de joueur', () => {
    const d = deuxProfils({}, { series: [serieValidee('add-1', 1)] }, 'p2')
    const racine = rendreParcours(ctxDe(d))
    const header = racine.querySelector('header')!
    expect(header.querySelector('.pastille-couleur')).not.toBeNull()
    expect(header.textContent).toContain(profilActif(d).prenom)
    expect(header.textContent).toContain('★ 2')
    expect(racine.querySelector('a[href="#/"]')!.textContent).toBe('Changer de joueur')
    expect(racine.querySelector('button.profil')).toBeNull()
  })

  it('parcoursAvances : 3 tailles', () => {
    const d = avecProfil({ reglages: { parcoursAvances: true, vitesse: 'normal' } })
    expect(rendreParcours(ctxDe(d)).querySelectorAll('button.taille')).toHaveLength(3)
  })

  it('dernier parcours en 3 chiffres sans avancés : pas de continuer, grille sur add-1', () => {
    const d = avecProfil({ dernierParcours: 'add-3', series: [serieValidee('add-3', 1)] })
    const ctx = ctxDe(d)
    ctx.selection = { op: 'add', taille: 3 }
    const racine = rendreParcours(ctx)
    expect(racine.querySelector('[data-test="continuer"]')).toBeNull()
    expect(ctx.selection.taille).toBe(1)
    racine.querySelector<HTMLButtonElement>('button.niveau[data-niveau="1"]')!.click()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'jeu', parcours: 'add-1', niveau: 1 })
  })

  it('continuer mène au prochain niveau du dernier parcours', () => {
    const d = avecProfil({ dernierParcours: 'mul-1', series: [serieValidee('mul-1', 1)] })
    const ctx = ctxDe(d)
    const racine = rendreParcours(ctx)
    const bouton = racine.querySelector<HTMLButtonElement>('[data-test="continuer"]')!
    expect(bouton.textContent).toContain('niveau 2')
    bouton.click()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 2 })
  })

  it('clic sur un niveau ouvert navigue vers le jeu', () => {
    const ctx = ctxDe()
    rendreParcours(ctx).querySelector<HTMLButtonElement>('button.niveau[data-niveau="1"]')!.click()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'jeu', parcours: 'add-1', niveau: 1 })
  })

  it('clic sur une opération re-rend dans la même racine', () => {
    const ctx = ctxDe()
    const racine = rendreParcours(ctx)
    racine.querySelector<HTMLButtonElement>('button.op[data-op="mul"]')!.click()
    expect(ctx.selection.op).toBe('mul')
    expect(racine.querySelector('button.op[data-op="mul"]')!.classList.contains('actif')).toBe(true)
    expect(racine.querySelector('button.op[data-op="add"]')!.classList.contains('actif')).toBe(false)
    racine.querySelector<HTMLButtonElement>('button.taille[data-taille="2"]')!.click()
    expect(ctx.selection.taille).toBe(2)
    expect(racine.querySelectorAll('button.niveau')).toHaveLength(8)
  })
})

describe('selectionDepuisProfil', () => {
  it('sans dernier parcours : additions à 1 chiffre', () => {
    expect(selectionDepuisProfil(profilActif(avecProfil({})))).toEqual({ op: 'add', taille: 1 })
  })
  it('avec dernier parcours : celui-ci', () => {
    expect(selectionDepuisProfil(profilActif(avecProfil({ dernierParcours: 'mul-2' })))).toEqual({ op: 'mul', taille: 2 })
  })
  it('3 chiffres sans parcours avancés : replié sur 1 chiffre', () => {
    const p = profilActif(avecProfil({ dernierParcours: 'add-3', reglages: { parcoursAvances: false, vitesse: 'normal' } }))
    expect(selectionDepuisProfil(p).taille).toBe(1)
  })
})

describe('rendreParcours et ctx.selection', () => {
  it('le rendu ne touche pas à la sélection (hors repli taille 3)', () => {
    const ctx = ctxDe(avecProfil({ dernierParcours: 'add-1' }))
    ctx.selection = { op: 'mul', taille: 2 }
    rendreParcours(ctx)
    expect(ctx.selection).toEqual({ op: 'mul', taille: 2 })
  })

  it('record : « Record 4,2 s » sur le bon niveau seulement', () => {
    const d = avecProfil({ series: [{ ...serieValidee('add-1', 1), tempsMedian: 4200 }] })
    const racine = rendreParcours(ctxDe(d))
    const r = racine.querySelector('button.niveau[data-niveau="1"] span.record')!
    expect(r.textContent).toBe('Record 4,2 s')
    expect(racine.querySelector('[data-test="record-1"]')).toBe(r)
    expect(racine.querySelector('[data-test="record-2"]')).toBeNull()
    expect(racine.querySelectorAll('span.record')).toHaveLength(1)
  })

  it('record : absent si la série n\'est pas réussie', () => {
    const d = avecProfil({ series: [{ ...serieValidee('add-1', 1), bonnes: 5, reussie: false, validee: false }] })
    expect(rendreParcours(ctxDe(d)).querySelector('span.record')).toBeNull()
  })
})
