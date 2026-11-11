// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rendreAccueil } from '../../src/ui/accueil'
import type { ContexteApp } from '../../src/ui/accueil'
import { bannierInstallation, detecterPlateforme } from '../../src/ui/installation'
import { donneesVides, profilActif } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { deuxProfils } from '../aide/donnees'

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

beforeEach(() => {
  try { localStorage.clear() } catch { /* ignoré */ }
})

describe('rendreAccueil (page 1)', () => {
  it('bouton Parents : icône parents.svg, plus d\'engrenage', () => {
    const lien = rendreAccueil(ctxDe()).querySelector('header a[href="#/parents"]')!
    expect(lien.querySelector('.icone-parents svg')).not.toBeNull()
  })
  it('décor spatial entre l\'en-tête et « Qui joue ? », masqué aux lecteurs d\'écran', () => {
    const racine = rendreAccueil(ctxDe())
    const decor = racine.querySelector('.decor-accueil')!
    expect(decor.getAttribute('aria-hidden')).toBe('true')
    expect(decor.previousElementSibling!.tagName).toBe('HEADER')
    expect(decor.nextElementSibling!.tagName).toBe('H2')
    expect(decor.querySelectorAll('.illustration')).toHaveLength(3)
  })
  it('« Qui joue ? », une pastille par profil, lien Parents, pas de grille', () => {
    const racine = rendreAccueil(ctxDe(deuxProfils()))
    expect(racine.querySelector('h2')!.textContent).toBe('Qui joue ?')
    expect(racine.querySelectorAll('button.profil')).toHaveLength(2)
    expect(racine.querySelector('.profils')!.classList.contains('grand')).toBe(true)
    expect(racine.querySelector('a[href="#/parents"]')).not.toBeNull()
    expect(racine.querySelector('a.parents')).toBeNull()
    expect(racine.querySelector('button.niveau')).toBeNull()
    expect(racine.querySelector('.avertissement')).toBeNull()
  })

  it('bouton réglages : lien accessible vers l\'espace parents, dans l\'en-tête', () => {
    const lien = rendreAccueil(ctxDe()).querySelector('header a[href="#/parents"]')!
    expect(lien.classList.contains('reglages')).toBe(true)
    expect(lien.getAttribute('aria-label')).toBe('Espace parents')
    expect(lien.querySelector('[aria-hidden="true"] svg')).not.toBeNull()
    expect(lien.querySelector('.sr-only')!.textContent).toBe('Parents')
  })

  it('un seul profil : la page est quand même affichée', () => {
    expect(rendreAccueil(ctxDe()).querySelectorAll('button.profil')).toHaveLength(1)
  })

  it('clic sur l\'autre profil : sauver avec ce profil actif puis parcours', () => {
    const ctx = ctxDe(deuxProfils())
    rendreAccueil(ctx).querySelector<HTMLButtonElement>('button.profil[data-id="p2"]')!.click()
    expect(ctx.sauver).toHaveBeenCalledTimes(1)
    expect(profilActif(vi.mocked(ctx.sauver).mock.calls[0]![0]).id).toBe('p2')
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'parcours' })
  })

  it('clic sur une pastille : ctx.selection reprise du profil choisi', () => {
    const ctx = ctxDe(deuxProfils({}, { dernierParcours: 'mul-2' }))
    rendreAccueil(ctx).querySelector<HTMLButtonElement>('button.profil[data-id="p2"]')!.click()
    expect(ctx.selection).toEqual({ op: 'mul', taille: 2 })
  })

  it('pastille déjà active : navigue sans sauver', () => {
    const ctx = ctxDe(deuxProfils())
    rendreAccueil(ctx).querySelector<HTMLButtonElement>('button.profil[data-id="p1"]')!.click()
    expect(ctx.sauver).not.toHaveBeenCalled()
    expect(ctx.naviguer).toHaveBeenCalledWith({ nom: 'parcours' })
  })

  it('aria-pressed suit le profil actif', () => {
    const racine = rendreAccueil(ctxDe(deuxProfils({}, {}, 'p2')))
    expect(racine.querySelector('button.profil[data-id="p2"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(racine.querySelector('button.profil[data-id="p1"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('affiche les avertissements', () => {
    expect(rendreAccueil(ctxDe(donneesVides(), 'stockage_indisponible')).querySelector('.avertissement')!.textContent)
      .toBe('Les progrès ne pourront pas être enregistrés sur cet appareil.')
    expect(rendreAccueil(ctxDe(donneesVides(), 'donnees_corrompues')).querySelector('.avertissement')!.textContent)
      .toBe('Les données enregistrées sont illisibles, on repart de zéro.')
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
