// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { creerVerrouSession, genererQuestionVerrou, rendreParents } from '../../src/ui/parents'
import type { Verrou } from '../../src/ui/parents'
import type { ContexteApp } from '../../src/ui/accueil'
import { donneesVides } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { avecProfil, deuxProfils, fixtureV1 } from '../aide/donnees'
import { exporterJson } from '../../src/storage/store'
import { createRng } from '../../src/core/rng'

function donneesAvecSeries(): Donnees {
  return avecProfil({
    series: [{ date: '2026-11-10T10:00:00.000Z', parcours: 'add-1', niveau: 1, bonnes: 10, tempsMedian: 3000, tempsCible: 4000, reussie: true, validee: true }],
    faits: { 'add:3·4': { tentatives: 5, erreurs: 3, tempsCumule: 31000, derniers: [] } },
  })
}

function monter(opts: { ouvert?: boolean; donnees?: Donnees; confirme?: boolean; partager?: (f: File) => Promise<'ok' | 'annule' | 'echec'> } = {}) {
  const ctx: ContexteApp = {
    donnees: opts.donnees ?? donneesAvecSeries(), avertissement: null, sauver: vi.fn((d: Donnees) => { ctx.donnees = d; return true }), naviguer: vi.fn(), selection: { op: 'add', taille: 1 },
  }
  let ouvert = opts.ouvert ?? true
  const verrou: Verrou = { estOuvert: vi.fn(() => ouvert), ouvrir: vi.fn(() => { ouvert = true }) }
  const telecharger = vi.fn()
  const confirmer = vi.fn(() => opts.confirme ?? true)
  const el = rendreParents(ctx, { verrou, rng: createRng(1), partager: opts.partager, telecharger, confirmer })
  document.body.replaceChildren(el)
  const q = <T extends Element = HTMLElement>(s: string) => el.querySelector<T>(s)
  return { ctx, verrou, telecharger, confirmer, el, q }
}

const attendre = () => new Promise((r) => setTimeout(r, 10))
afterEach(() => { document.body.replaceChildren() })

describe('genererQuestionVerrou / creerVerrouSession', () => {
  it('plages sur 200 tirages', () => {
    const rng = createRng(7)
    for (let i = 0; i < 200; i++) {
      const { question, reponse } = genererQuestionVerrou(rng)
      const m = /^Combien font (\d+) × (\d+) \?$/.exec(question)!
      const a = Number(m[1]); const b = Number(m[2])
      expect(a).toBeGreaterThanOrEqual(21); expect(a).toBeLessThanOrEqual(49)
      expect(b).toBeGreaterThanOrEqual(6); expect(b).toBeLessThanOrEqual(9)
      expect(reponse).toBe(a * b)
    }
  })
  it('verrou de session', () => {
    const m = new Map<string, string>()
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
    const v = creerVerrouSession(s)
    expect(v.estOuvert()).toBe(false)
    v.ouvrir()
    expect(m.get('battlemath.parent')).toBe('1')
    expect(creerVerrouSession(s).estOuvert()).toBe(true)
    expect(creerVerrouSession(null).estOuvert()).toBe(false)
  })
})

describe('rendreParents', () => {
  it('verrou fermé : pas de synthèse ; mauvaise réponse reste fermé', () => {
    const p = monter({ ouvert: false })
    expect(p.el.textContent).not.toContain('Synthèse')
    const input = p.q<HTMLInputElement>('[data-test="verrou-reponse"]')!
    input.value = '1'
    p.q('[data-test="verrou-valider"]')!.click()
    expect(p.verrou.ouvrir).not.toHaveBeenCalled()
    expect(p.el.textContent).toContain('Mauvaise réponse')
    expect(p.el.textContent).not.toContain('Synthèse')
  })

  it('verrou : lien Retour et validation par submit du formulaire', () => {
    const p = monter({ ouvert: false })
    expect(p.q('a[href="#/"]')).not.toBeNull()
    const m = /(\d+) × (\d+)/.exec(p.el.textContent!)!
    p.q<HTMLInputElement>('[data-test="verrou-reponse"]')!.value = String(Number(m[1]) * Number(m[2]))
    p.q('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(p.verrou.ouvrir).toHaveBeenCalled()
    expect(p.el.textContent).toContain('Synthèse')
  })

  it('plus de 30 séries : légende « (30 dernières séries) »', () => {
    const base = donneesAvecSeries()
    const d = avecProfil({ ...base.profils[0]!, series: Array.from({ length: 31 }, () => base.profils[0]!.series[0]!) })
    expect(monter({ donnees: d }).el.querySelector('figcaption')!.textContent).toContain('(30 dernières séries)')
    expect(monter().el.querySelector('figcaption')!.textContent).not.toContain('dernières')
  })

  it('avertissement de stockage affiché en tête', () => {
    const p = monter()
    expect(p.q('.avertissement')).toBeNull()
    p.ctx.avertissement = 'stockage_indisponible'
    const p2 = rendreParents(p.ctx, { verrou: { estOuvert: () => true, ouvrir: () => {} }, rng: createRng(1), telecharger: vi.fn(), confirmer: () => true })
    expect(p2.querySelector('.avertissement')!.textContent).toContain("n'a pas pu être enregistrée")
  })

  it('bonne réponse : ouvre et rend le contenu', () => {
    const p = monter({ ouvert: false })
    const m = /(\d+) × (\d+)/.exec(p.el.textContent!)!
    p.q<HTMLInputElement>('[data-test="verrou-reponse"]')!.value = String(Number(m[1]) * Number(m[2]))
    p.q('[data-test="verrou-valider"]')!.click()
    expect(p.verrou.ouvrir).toHaveBeenCalled()
    expect(p.el.textContent).toContain('Synthèse')
  })

  it('contenu : sections, graphiques, à revoir', () => {
    const p = monter()
    expect([...p.el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Progression', 'Synthèse', 'À revoir', 'Réglages', 'Profils'])
    expect(p.el.querySelectorAll('svg')).toHaveLength(2)
    expect(p.el.textContent).toContain('Jours d\'entraînement : 1')
    expect(p.q('li')!.textContent).toBe('3 + 4 : 3 erreurs sur 5, 6,2 s en moyenne')
    expect(p.q('table.grille-faits')).not.toBeNull()
  })

  it('vitesse tranquille -> sauver', () => {
    const p = monter()
    const r = p.q<HTMLInputElement>('input[name="vitesse"][value="tranquille"]')!
    r.checked = true
    r.dispatchEvent(new Event('change', { bubbles: true }))
    expect(p.ctx.sauver).toHaveBeenCalledWith(expect.objectContaining({ profils: [expect.objectContaining({ reglages: expect.objectContaining({ vitesse: 'tranquille' }) })] }))
  })

  it('export -> telecharger sans partager', async () => {
    const p = monter()
    p.q('[data-test="exporter"]')!.click()
    await attendre()
    expect(p.telecharger).toHaveBeenCalledWith(expect.stringMatching(/^battlemath-\d{4}-\d{2}-\d{2}\.json$/), exporterJson(p.ctx.donnees))
  })

  it.each([['annule', 0], ['echec', 1], ['ok', 0]] as const)('partage %s -> telecharger x%i', async (res, n) => {
    const partager = vi.fn(async () => res)
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    try {
      const p = monter({ partager })
      p.q('[data-test="exporter"]')!.click()
      await attendre()
      expect(partager).toHaveBeenCalled()
      expect(p.telecharger).toHaveBeenCalledTimes(n)
    } finally { delete (navigator as unknown as Record<string, unknown>).canShare }
  })

  it('le parcours courant absent des options : repli sur la première option', () => {
    const d = avecProfil({ dernierParcours: 'add-3' })
    const p = monter({ donnees: d })
    const sel = p.q<HTMLSelectElement>('select[data-test="parcours"]')!
    expect(sel.value).toBe(sel.options[0]!.value)
  })

  async function importer(p: ReturnType<typeof monter>, texte: string) {
    const input = p.q<HTMLInputElement>('[data-test="importer"]')!
    Object.defineProperty(input, 'files', { value: [new File([texte], 'x.json')] })
    input.dispatchEvent(new Event('change'))
    await attendre()
  }

  it('import invalide -> message, pas de sauver', async () => {
    const p = monter()
    await importer(p, 'pas du json')
    expect(p.q('.message')!.textContent).toBe('Fichier illisible')
    expect(p.ctx.sauver).not.toHaveBeenCalled()
  })

  it('import valide + confirmer -> sauver', async () => {
    const p = monter()
    const d = avecProfil({ reglages: { parcoursAvances: false, vitesse: 'rapide' } })
    await importer(p, JSON.stringify(d))
    expect(p.confirmer).toHaveBeenCalledWith('Remplacer tous les progrès par ce fichier ?')
    expect(p.ctx.sauver).toHaveBeenCalledWith(d)
    expect(p.q('.message')!.textContent).toBe('Progrès importés')
  })

  it('reset-tout + confirmer false -> rien ; true -> données vides', () => {
    const p = monter({ confirme: false })
    p.q('[data-test="reset-tout"]')!.click()
    expect(p.confirmer).toHaveBeenCalledWith('Effacer tous les profils et toute la progression ? Cette action est définitive.')
    expect(p.ctx.sauver).not.toHaveBeenCalled()
    const p2 = monter({ confirme: true })
    p2.q('[data-test="reset-tout"]')!.click()
    expect(p2.ctx.sauver).toHaveBeenCalledWith(donneesVides())
  })

  describe('profils', () => {
    const serie = (parcours: string, niveau: number) => ({ date: '2026-11-10T10:00:00.000Z', parcours, niveau, bonnes: 10, tempsMedian: 3000, tempsCible: 4000, reussie: true, validee: true }) as never
    const deux = (actif = 'p1') => deuxProfils({ series: [serie('add-1', 4)] }, { series: [serie('mul-1', 7)] }, actif)
    const change = (el: HTMLInputElement, v: string) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })) }

    it('rangée de profils avec .actif sur le profil actif', () => {
      const p = monter({ donnees: deux('p2') })
      expect(p.q('.profils button.actif')!.getAttribute('data-id')).toBe('p2')
    })

    it('clic sur l\'autre profil : ses stats, profilActif inchangé, sauver non appelé', () => {
      const p = monter({ donnees: deux() })
      expect(p.el.querySelector('tbody')!.textContent).toContain('4')
      p.q<HTMLElement>('.profils button[data-id="p2"]')!.click()
      expect(p.q('.profils button.actif')!.getAttribute('data-id')).toBe('p2')
      expect(p.el.querySelector('tbody')!.textContent).toContain('7')
      expect(p.ctx.sauver).not.toHaveBeenCalled()
      expect(p.ctx.donnees.profilActif).toBe('p1')
    })

    it('vitesse : sauver sur le profil consulté seulement', () => {
      const p = monter({ donnees: deux() })
      p.q<HTMLElement>('.profils button[data-id="p2"]')!.click()
      const r = p.q<HTMLInputElement>('input[name="vitesse"][value="tranquille"]')!
      r.checked = true
      r.dispatchEvent(new Event('change', { bubbles: true }))
      expect(p.ctx.donnees.profils[1]!.reglages.vitesse).toBe('tranquille')
      expect(p.ctx.donnees.profils[0]!.reglages.vitesse).not.toBe('tranquille')
    })

    it('reset-profil + confirmer true : séries vides pour ce profil seulement', () => {
      const p = monter({ donnees: deux(), confirme: true })
      p.q<HTMLElement>('.profils button[data-id="p2"]')!.click()
      expect(p.q('[data-test="reset-profil"]')!.textContent).toBe('Effacer la progression de Joueur 2')
      p.q('[data-test="reset-profil"]')!.click()
      expect(p.confirmer).toHaveBeenCalledWith('Effacer toute la progression de Joueur 2 ? Cette action est définitive.')
      expect(p.ctx.donnees.profils[1]!.series).toEqual([])
      expect(p.ctx.donnees.profils[0]!.series).toHaveLength(1)
    })

    it('reset-profil + confirmer false : rien', () => {
      const p = monter({ donnees: deux(), confirme: false })
      p.q('[data-test="reset-profil"]')!.click()
      expect(p.ctx.sauver).not.toHaveBeenCalled()
    })

    it('prénom valide au change -> sauver', () => {
      const p = monter({ donnees: deux() })
      change(p.q<HTMLInputElement>('[data-test="prenom-p2"]')!, 'Léa')
      expect(p.ctx.donnees.profils[1]!.prenom).toBe('Léa')
      expect(p.q<HTMLInputElement>('[data-test="prenom-p2"]')!.value).toBe('Léa')
    })

    it('prénom vide : refusé, champ rétabli, message (Review Focus 4)', () => {
      const p = monter({ donnees: deux() })
      change(p.q<HTMLInputElement>('[data-test="prenom-p2"]')!, '   ')
      expect(p.ctx.sauver).not.toHaveBeenCalled()
      expect(p.q<HTMLInputElement>('[data-test="prenom-p2"]')!.value).toBe('Joueur 2')
      expect(p.q('.message')!.textContent).toBe('Le prénom doit faire 1 à 12 caractères')
    })

    it('couleur -> sauver, .actif suit', () => {
      const p = monter({ donnees: deux() })
      p.q<HTMLElement>('.ligne-profil[data-id="p2"] button.couleur[data-couleur="rose"]')!.click()
      expect(p.ctx.donnees.profils[1]!.couleur).toBe('rose')
      expect(p.q('.ligne-profil[data-id="p2"] button.couleur.actif')!.getAttribute('data-couleur')).toBe('rose')
      expect(p.el.querySelectorAll('.ligne-profil[data-id="p1"] button.couleur')).toHaveLength(6)
    })

    it('ajouter-profil -> 3 profils ; désactivé à 4', () => {
      const p = monter({ donnees: deux() })
      p.q('[data-test="ajouter-profil"]')!.click()
      expect(p.ctx.donnees.profils).toHaveLength(3)
      expect(p.q<HTMLButtonElement>('[data-test="ajouter-profil"]')!.disabled).toBe(false)
      p.q('[data-test="ajouter-profil"]')!.click()
      expect(p.ctx.donnees.profils).toHaveLength(4)
      expect(p.q<HTMLButtonElement>('[data-test="ajouter-profil"]')!.disabled).toBe(true)
    })

    it('supprimer désactivé avec un seul profil', () => {
      const p = monter()
      expect(p.q<HTMLButtonElement>('[data-test="supprimer-p1"]')!.disabled).toBe(true)
    })

    it('supprimer le profil actif consulté : actif = premier restant, pas de plantage (Review Focus 2)', () => {
      const p = monter({ donnees: deux('p1'), confirme: true })
      p.q('[data-test="supprimer-p1"]')!.click()
      expect(p.confirmer).toHaveBeenCalledWith('Supprimer le profil Enfant et toute sa progression ?')
      expect(p.ctx.donnees.profilActif).toBe('p2')
      expect(p.ctx.donnees.profils).toHaveLength(1)
      expect(p.q('.profils button.actif')!.getAttribute('data-id')).toBe('p2')
      expect(p.q<HTMLButtonElement>('[data-test="supprimer-p2"]')!.disabled).toBe(true)
    })

    it('supprimer + confirmer false : rien', () => {
      const p = monter({ donnees: deux(), confirme: false })
      p.q('[data-test="supprimer-p2"]')!.click()
      expect(p.ctx.sauver).not.toHaveBeenCalled()
    })

    it('import d\'un fichier v1 + confirmer : v2 à 1 profil (Review Focus 3)', async () => {
      const p = monter({ donnees: deux() })
      await importer(p, JSON.stringify(fixtureV1()))
      expect(p.ctx.donnees.version).toBe(2)
      expect(p.ctx.donnees.profils).toHaveLength(1)
      expect(p.ctx.donnees.profils[0]!.series).toHaveLength(2)
      expect(p.q('.profils button.actif')!.getAttribute('data-id')).toBe(p.ctx.donnees.profilActif)
    })
  })
})
