// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rendreAccueil } from '../../src/ui/accueil'
import type { ContexteApp } from '../../src/ui/accueil'
import { bannierInstallation, detecterPlateforme } from '../../src/ui/installation'
import { donneesVides } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import type { Serie } from '../../src/core/types'

function ctxDe(donnees: Donnees = donneesVides(), avertissement: ContexteApp['avertissement'] = null): ContexteApp {
  return {
    donnees,
    avertissement,
    sauver: vi.fn(),
    naviguer: vi.fn(),
    selection: { op: 'add', taille: 1 },
  }
}

const serieValidee = (parcours: Serie['parcours'], niveau: number): Serie => ({
  date: '2026-11-11T10:00:00.000Z', parcours, niveau, bonnes: 10, tempsMedian: 2, tempsCible: 4, reussie: true, validee: true,
})

beforeEach(() => {
  try { localStorage.clear() } catch { /* ignoré */ }
})

describe('rendreAccueil', () => {
  it('sans série : pas de continuer, 8 niveaux, seul le 1 ouvert, 2 tailles', () => {
    const racine = rendreAccueil(ctxDe())
    expect(racine.querySelector('[data-test="continuer"]')).toBeNull()
    const niveaux = racine.querySelectorAll<HTMLButtonElement>('button.niveau')
    expect(niveaux).toHaveLength(8)
    expect(niveaux[0]!.dataset.etat).toBe('ouvert')
    expect(niveaux[0]!.disabled).toBe(false)
    expect(niveaux[1]!.disabled).toBe(true)
    expect(racine.querySelectorAll('button.taille')).toHaveLength(2)
    expect(racine.querySelectorAll('button.op')).toHaveLength(4)
    expect(racine.querySelector('a[href="#/parents"]')).not.toBeNull()
    expect(racine.querySelector('.avertissement')).toBeNull()
  })

  it('parcoursAvances : 3 tailles', () => {
    const d = donneesVides()
    d.reglages.parcoursAvances = true
    expect(rendreAccueil(ctxDe(d)).querySelectorAll('button.taille')).toHaveLength(3)
  })

  it('continuer mène au prochain niveau du dernier parcours', () => {
    const d = donneesVides()
    d.dernierParcours = 'mul-1'
    d.series = [serieValidee('mul-1', 1)]
    const ctx = ctxDe(d)
    const racine = rendreAccueil(ctx)
    const bouton = racine.querySelector<HTMLButtonElement>('[data-test="continuer"]')!
    expect(bouton.textContent).toContain('niveau 2')
    bouton.click()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 2 })
  })

  it('clic sur un niveau ouvert navigue vers le jeu', () => {
    const ctx = ctxDe()
    rendreAccueil(ctx).querySelector<HTMLButtonElement>('button.niveau[data-niveau="1"]')!.click()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'jeu', parcours: 'add-1', niveau: 1 })
  })

  it('clic sur une opération re-rend dans la même racine', () => {
    const ctx = ctxDe()
    const racine = rendreAccueil(ctx)
    racine.querySelector<HTMLButtonElement>('button.op[data-op="mul"]')!.click()
    expect(ctx.selection.op).toBe('mul')
    expect(racine.querySelector('button.op[data-op="mul"]')!.classList.contains('actif')).toBe(true)
    expect(racine.querySelector('button.op[data-op="add"]')!.classList.contains('actif')).toBe(false)
    racine.querySelector<HTMLButtonElement>('button.taille[data-taille="2"]')!.click()
    expect(ctx.selection.taille).toBe(2)
    expect(racine.querySelectorAll('button.niveau')).toHaveLength(8)
  })

  it('affiche les avertissements', () => {
    expect(rendreAccueil(ctxDe(donneesVides(), 'stockage_indisponible')).querySelector('.avertissement')!.textContent)
      .toBe('Les progrès ne pourront pas être enregistrés sur cet appareil.')
    expect(rendreAccueil(ctxDe(donneesVides(), 'donnees_corrompues')).querySelector('.avertissement')!.textContent)
      .toBe('Les données enregistrées sont illisibles, on repart de zéro.')
  })

  it('total d\'étoiles dans l\'en-tête', () => {
    const d = donneesVides()
    d.series = [serieValidee('add-1', 1)]
    expect(rendreAccueil(ctxDe(d)).querySelector('header')!.textContent).toContain('★ 2')
  })
})

describe('installation', () => {
  const uaIphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  it('détecte la plateforme', () => {
    expect(detecterPlateforme(uaIphone, false)).toEqual({ plateforme: 'ios', dejaInstallee: false })
    expect(detecterPlateforme('Mozilla/5.0 (Linux; Android 14)', false).plateforme).toBe('android')
    expect(detecterPlateforme('Mozilla/5.0 (X11; Linux)', false).plateforme).toBe('autre')
    expect(detecterPlateforme(uaIphone, true).dejaInstallee).toBe(true)
  })
  it('bannière : null si installée, textes par plateforme', () => {
    expect(bannierInstallation(true, 'ios')).toBeNull()
    expect(bannierInstallation(false, 'ios')!.textContent).toContain(
      'Pour garder tes progrès, ajoute BattleMath à l\'écran d\'accueil : Partager puis Sur l\'écran d\'accueil.')
    expect(bannierInstallation(false, 'android')!.textContent).toContain(
      'Pour garder tes progrès, installe BattleMath : menu du navigateur puis Installer l\'application.')
  })
  it('la bannière se ferme et reste fermée', () => {
    const racine = rendreAccueil(ctxDe())
    expect(racine.querySelector('.banniere')).not.toBeNull()
    racine.querySelector<HTMLButtonElement>('.banniere button')!.click()
    expect(racine.querySelector('.banniere')).toBeNull()
    expect(localStorage.getItem('battlemath.banniere')).not.toBeNull()
    expect(rendreAccueil(ctxDe()).querySelector('.banniere')).toBeNull()
  })
})
