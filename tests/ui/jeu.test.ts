// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rendreJeu } from '../../src/ui/jeu'
import type { Visibilite } from '../../src/ui/jeu'
import type { ContexteApp } from '../../src/ui/accueil'
import { donneesVides, profilActif } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { avecProfil, deuxProfils } from '../aide/donnees'
import { createRng } from '../../src/core/rng'
import { calculCourant } from '../../src/game/session'
import { reponseAttendue } from '../../src/core/faits'
import { formaterCalcul } from '../../src/core/format'
import type { ParcoursId } from '../../src/core/types'

function ctxDe(donnees: Donnees = donneesVides()): ContexteApp {
  return { donnees, avertissement: null, sauver: vi.fn(() => true), naviguer: vi.fn(), selection: { op: 'add', taille: 1 } }
}

function monter(opts: { parcours?: ParcoursId; n?: number; donnees?: Donnees; pas?: number; seed?: number } = {}) {
  const ctx = ctxDe(opts.donnees)
  let t = 0
  const pas = opts.pas ?? 0
  let cache: () => void = () => {}
  let visible: () => void = () => {}
  const desabonner = vi.fn()
  const visibilite: Visibilite = {
    onCache: (cb) => { cache = cb; return desabonner },
    onVisible: (cb) => { visible = cb; return desabonner },
  }
  const ecran = rendreJeu(ctx, opts.parcours ?? 'mul-1', opts.n ?? 1, {
    horloge: { now: () => (t += pas), }, visibilite, rng: createRng(opts.seed ?? 1), delaiFeedbackMs: 0,
  })
  document.body.replaceChildren(ecran.element)
  const q = <T extends Element = HTMLElement>(sel: string) => ecran.element.querySelector<T>(sel)
  const taper = (nombre: number) => {
    for (const c of String(nombre)) q(`button.touche[data-touche="${c}"]`)!.click()
  }
  const valider = () => q('button.touche[data-touche="valider"]')!.click()
  const attendu = () => reponseAttendue(calculCourant(ecran.session()))
  const repondreJuste = () => { taper(attendu()); valider() }
  const repondreFaux = () => { taper(attendu() + 1); valider() }
  return { ctx, ecran, q, taper, valider, attendu, repondreJuste, repondreFaux, cache: () => cache(), visible: () => visible(), avancerHorloge: (ms: number) => { t += ms }, desabonner }
}

afterEach(() => { document.body.replaceChildren() })

describe('rendreJeu', () => {
  it('affiche 10 pastilles, le calcul et l\'objectif (cible effective arrondie)', () => {
    const j = monter()
    expect(j.ecran.element.querySelectorAll('.pastille')).toHaveLength(10)
    expect(j.q('.pastille')!.dataset.etat).toBe('en_cours')
    expect(j.q('.calcul')!.textContent).toBe(formaterCalcul(calculCourant(j.ecran.session())))
    const cibleMs = j.ecran.session().cibleMs
    const cibleS = cibleMs % 1000 === 0 ? `${cibleMs / 1000}` : (cibleMs / 1000).toFixed(1).replace('.', ',')
    expect(j.q('.objectif')!.textContent).toBe(`Objectif : moins de ${cibleS} secondes par calcul`)
    expect(j.ecran.element.querySelector('input')).toBeNull()
  })

  it('vitesse tranquille : l\'objectif suit la cible multipliée par 1,5', () => {
    const normal = monter()
    const d = avecProfil({ reglages: { parcoursAvances: false, vitesse: 'tranquille' } })
    const lent = monter({ donnees: d })
    expect(lent.ecran.session().cibleMs).toBe(normal.ecran.session().cibleMs * 1.5)
    expect(lent.q('.objectif')!.textContent).toContain(`moins de ${(lent.ecran.session().cibleMs / 1000).toFixed(1).replace('.', ',')} secondes`)
  })

  it('affiche le prénom du profil actif sous les pastilles', () => {
    const j = monter({ donnees: deuxProfils({}, {}, 'p2') })
    expect(j.q('[data-test="joueur"]')!.textContent).toBe('Joueur 2')
    expect(j.q('[data-test="joueur"] .pastille-couleur')).not.toBeNull()
  })

  it('la série est enregistrée dans le profil actif', () => {
    const j = monter({ donnees: deuxProfils({}, {}, 'p2') })
    for (let i = 0; i < 10; i++) j.repondreJuste()
    const d = vi.mocked(j.ctx.sauver).mock.calls[0]![0]
    expect(d.profils.find((p) => p.id === 'p2')!.series).toHaveLength(1)
    expect(d.profils.find((p) => p.id === 'p1')!.series).toHaveLength(0)
  })

  it('l\'objectif suit la vitesse du profil actif', () => {
    const tranquille = { parcoursAvances: false, vitesse: 'tranquille' as const }
    const normal = monter({ donnees: deuxProfils({}, { reglages: tranquille }, 'p1') })
    const lent = monter({ donnees: deuxProfils({}, { reglages: tranquille }, 'p2') })
    expect(lent.ecran.session().cibleMs).toBe(normal.ecran.session().cibleMs * 1.5)
  })

  it('tout juste : écran de fin, une seule sauvegarde, série validée et 10 faits', () => {
    const j = monter()
    for (let i = 0; i < 10; i++) j.repondreJuste()
    expect(j.ctx.sauver).toHaveBeenCalledTimes(1)
    const d = profilActif(vi.mocked(j.ctx.sauver).mock.calls[0]![0])
    expect(d.series).toHaveLength(1)
    expect(d.series[0]).toMatchObject({ parcours: 'mul-1', niveau: 1, bonnes: 10, validee: true })
    expect(Object.keys(d.faits)).toHaveLength(10)
    expect(j.ecran.element.textContent).toContain('10 sur 10')
    expect(j.ecran.element.textContent).toContain('Niveau validé !')
    expect(j.ecran.element.textContent).toContain('Ton temps : 0,0 s par calcul')
    expect(j.desabonner).toHaveBeenCalled()
  })

  it('réponse fausse : correction affichée, mauvaise recopie reste, bonne recopie avance', () => {
    const j = monter()
    j.repondreFaux()
    const calcul = j.q('.calcul')!.textContent
    expect(j.q('.attendu')!.textContent).toContain(String(j.attendu()))
    expect(j.q('.barree')).not.toBeNull()
    expect(j.q('.pastille')!.dataset.etat).toBe('faux')
    j.repondreFaux()
    expect(j.q('.calcul')!.textContent).toBe(calcul)
    expect(j.q('.attendu')).not.toBeNull()
    j.repondreJuste()
    expect(j.q('.calcul')!.textContent).not.toBe(calcul)
    expect(j.q('.attendu')).toBeNull()
    for (let i = 0; i < 9; i++) j.repondreJuste()
    const serie = profilActif(vi.mocked(j.ctx.sauver).mock.calls[0]![0]).series[0]!
    expect(serie.bonnes).toBe(9)
    expect(j.ecran.element.textContent).toContain('9 sur 10')
  })

  it('juste : classe juste sur la réponse, pavé vidé au calcul suivant', () => {
    const j = monter()
    j.taper(j.attendu())
    expect(j.q('.reponse')!.textContent).toBe(String(j.attendu()))
    j.valider()
    expect(j.ecran.session().index).toBe(1)
    expect(j.q('.reponse')!.textContent).toBe('')
    expect(j.q('.reponse')!.classList.contains('juste')).toBe(false)
  })

  it('délai de feedback : classe juste puis avance, un double Valider compte une fois', () => {
    vi.useFakeTimers()
    try {
      const ctx = ctxDe()
      const ecran = rendreJeu(ctx, 'mul-1', 1, {
        horloge: { now: () => 0 }, visibilite: { onCache: () => () => {}, onVisible: () => () => {} }, rng: createRng(1), delaiFeedbackMs: 400,
      })
      const touche = (c: string) => ecran.element.querySelector<HTMLButtonElement>(`button.touche[data-touche="${c}"]`)!
      for (const c of String(reponseAttendue(calculCourant(ecran.session())))) touche(c).click()
      touche('valider').click()
      touche('valider').click()
      expect(ecran.element.querySelector('.reponse')!.classList.contains('juste')).toBe(true)
      expect(ecran.session().index).toBe(0)
      expect(ecran.session().reponses).toHaveLength(1)
      vi.advanceTimersByTime(400)
      expect(ecran.session().index).toBe(1)
      expect(ecran.session().reponses).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('interruption pendant le feedback : le chrono du calcul suivant démarre au retour', () => {
    vi.useFakeTimers()
    try {
      const ctx = ctxDe()
      let t = 0
      let cache: () => void = () => {}
      let visible: () => void = () => {}
      const ecran = rendreJeu(ctx, 'mul-1', 1, {
        horloge: { now: () => t }, rng: createRng(1), delaiFeedbackMs: 400,
        visibilite: { onCache: (cb) => { cache = cb; return () => {} }, onVisible: (cb) => { visible = cb; return () => {} } },
      })
      const touche = (c: string) => ecran.element.querySelector<HTMLButtonElement>(`button.touche[data-touche="${c}"]`)!
      for (const c of String(reponseAttendue(calculCourant(ecran.session())))) touche(c).click()
      touche('valider').click()
      cache()
      vi.advanceTimersByTime(400)
      expect(ecran.session().index).toBe(1)
      t += 100000
      visible()
      t += 2000
      for (const c of String(reponseAttendue(calculCourant(ecran.session())))) touche(c).click()
      touche('valider').click()
      expect(ecran.session().reponses[1]!.tempsMs).toBe(2000)
    } finally {
      vi.useRealTimers()
    }
  })

  describe('réponse 0', () => {
    function avecZeroEnPremier() {
      for (let seed = 1; seed < 500; seed++) {
        const j = monter({ parcours: 'sub-1', n: 2, donnees: debloque(), seed })
        if (j.attendu() === 0) return j
        document.body.replaceChildren()
      }
      throw new Error('aucune graine avec un premier calcul de résultat 0')
    }
    function debloque(): Donnees {
      return avecProfil({ series: [{ date: '2026-11-11T10:00:00.000Z', parcours: 'sub-1', niveau: 1, bonnes: 10, tempsMedian: 1, tempsCible: 4, reussie: true, validee: true }] })
    }

    it('0 direct : compté juste', () => {
      const j = avecZeroEnPremier()
      j.repondreJuste()
      expect(j.ecran.session().reponses[0]).toMatchObject({ reponse: 0, juste: true })
      expect(j.ecran.session().index).toBe(1)
    })

    it('faux puis 0 recopié : on avance', () => {
      const j = avecZeroEnPremier()
      j.taper(3)
      j.valider()
      expect(j.q('.attendu')!.textContent).toContain('0')
      j.taper(0)
      j.valider()
      expect(j.ecran.session().index).toBe(1)
      expect(j.q('.attendu')).toBeNull()
    })
  })

  it('onCache en phase question : nouveau calcul, aucune réponse ajoutée', () => {
    const j = monter()
    const avant = j.q('.calcul')!.textContent
    j.taper(1)
    j.cache()
    expect(j.q('.calcul')!.textContent).not.toBe(avant)
    expect(j.ecran.session().reponses).toHaveLength(0)
    expect(j.ecran.session().index).toBe(0)
    expect(j.q('.reponse')!.textContent).toBe('')
  })

  it('onCache en phase correction : inchangé', () => {
    const j = monter()
    j.repondreFaux()
    const avant = j.q('.calcul')!.textContent
    j.cache()
    expect(j.q('.calcul')!.textContent).toBe(avant)
    expect(j.q('.attendu')).not.toBeNull()
    expect(j.ecran.session().reponses).toHaveLength(1)
  })

  it('le chrono repart au retour de visibilité, pas avant la mise en arrière-plan', () => {
    const j = monter()
    j.avancerHorloge(50000)
    j.cache()
    j.avancerHorloge(100000)
    j.visible()
    j.avancerHorloge(2000)
    j.repondreJuste()
    expect(j.ecran.session().reponses[0]!.tempsMs).toBe(2000)
  })

  it('Retour à mi-série : rien sauvé, navigue, désabonne', () => {
    const j = monter()
    j.repondreJuste()
    j.q('[data-test="retour"]')!.click()
    expect(j.ctx.sauver).not.toHaveBeenCalled()
    expect(j.ctx.naviguer).toHaveBeenCalledWith({ nom: 'parcours' })
    expect(j.desabonner).toHaveBeenCalled()
  })

  it('hashchange : désabonne sans sauver', () => {
    const j = monter()
    window.dispatchEvent(new Event('hashchange'))
    expect(j.desabonner).toHaveBeenCalled()
    expect(j.ctx.sauver).not.toHaveBeenCalled()
  })

  it('detruire : désabonne la visibilité, le callback n\'a plus d\'effet', () => {
    const j = monter()
    const avant = j.ecran.session()
    j.ecran.detruire()
    expect(j.desabonner).toHaveBeenCalled()
    j.cache()
    expect(j.ecran.session()).toBe(avant)
  })

  it('échec d\'enregistrement : avertissement sous le verdict', () => {
    const j = monter()
    ;(j.ctx.sauver as ReturnType<typeof vi.fn>).mockReturnValue(false)
    for (let i = 0; i < 10; i++) j.repondreJuste()
    expect(j.ecran.element.textContent).toContain("Attention : la progression n'a pas pu être enregistrée sur cet appareil.")
  })

  it('enregistrement réussi : pas d\'avertissement', () => {
    const j = monter()
    for (let i = 0; i < 10; i++) j.repondreJuste()
    expect(j.ecran.element.textContent).not.toContain('Attention')
  })

  it('niveau verrouillé : retour au parcours immédiat', () => {
    const j = monter({ n: 3 })
    expect(j.ctx.naviguer).toHaveBeenCalledWith({ nom: 'parcours' })
    expect(j.ecran.element.children).toHaveLength(0)
  })

  it('fin : Rejouer, Niveau suivant (débloqué) et Retour', () => {
    const j = monter()
    for (let i = 0; i < 10; i++) j.repondreJuste()
    j.q('[data-test="rejouer"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 1 })
    j.q('[data-test="suivant"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 2 })
    j.q('[data-test="retour"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'parcours' })
  })

  it('fin avec trop d\'erreurs : pas de Niveau suivant, message dédié', () => {
    const j = monter()
    for (let i = 0; i < 2; i++) { j.repondreFaux(); j.repondreJuste() }
    for (let i = 0; i < 8; i++) j.repondreJuste()
    expect(j.ecran.element.textContent).toContain('8 sur 10')
    expect(j.ecran.element.textContent).toContain('Il faut 9 bonnes réponses. Encore un essai ?')
    expect(j.q('[data-test="suivant"]')).toBeNull()
  })

  it('fin trop lente : message avec les vraies valeurs', () => {
    const j = monter({ pas: 20000 })
    for (let i = 0; i < 10; i++) j.repondreJuste()
    const txt = j.ecran.element.textContent!
    expect(txt).toContain('10 sur 10')
    const cible = j.ecran.session().cibleMs
    const objectif = cible % 1000 === 0 ? `${cible / 1000} s` : `${(cible / 1000).toFixed(1).replace('.', ',')} s`
    expect(txt).toContain(`Bravo, presque ! Un peu plus vite la prochaine fois (objectif ${objectif}, toi 20,0 s).`)
    expect(j.q('[data-test="suivant"]')).toBeNull()
  })

  describe('record', () => {
    const ancienne = (tempsMedian: number, reussie = true) => avecProfil({ series: [{
      date: '2026-11-10T10:00:00.000Z', parcours: 'mul-1', niveau: 1, bonnes: reussie ? 10 : 5, tempsMedian, tempsCible: 99999, reussie, validee: reussie,
    }] })

    it('premier record du niveau', () => {
      const j = monter({ pas: 2000 })
      for (let i = 0; i < 10; i++) j.repondreJuste()
      const el = j.q('[data-test="record"]')!
      expect(el.textContent).toBe('Premier record : 2,0 s')
      expect(el.classList.contains('record-battu')).toBe(false)
    })

    it('record battu : ancien et nouveau, classe record-battu, étincelles', () => {
      const j = monter({ pas: 2000, donnees: ancienne(5100) })
      for (let i = 0; i < 10; i++) j.repondreJuste()
      const el = j.q('[data-test="record"]')!
      expect(el.textContent).toContain('Nouveau record ! 2,0 s (avant : 5,1 s)')
      expect(el.classList.contains('record-battu')).toBe(true)
      expect(el.querySelector('.etincelles')).not.toBeNull()
    })

    it('record non battu : discret', () => {
      const j = monter({ pas: 6000, donnees: ancienne(5100) })
      for (let i = 0; i < 10; i++) j.repondreJuste()
      const el = j.q('[data-test="record"]')!
      expect(el.textContent).toBe('Record : 5,1 s')
      expect(el.classList.contains('discret')).toBe(true)
      expect(el.classList.contains('record-battu')).toBe(false)
    })

    it('record égalé : discret, pas de record battu', () => {
      const j = monter({ pas: 5100, donnees: ancienne(5100) })
      for (let i = 0; i < 10; i++) j.repondreJuste()
      const el = j.q('[data-test="record"]')!
      expect(el.textContent).toBe('Record : 5,1 s')
      expect(el.classList.contains('record-battu')).toBe(false)
    })

    it('10/10 trop lent : série réussie mais non validée, pas de record', () => {
      const j = monter({ pas: 20000 })
      for (let i = 0; i < 10; i++) j.repondreJuste()
      expect(j.ecran.element.textContent).toContain('Bravo, presque !')
      expect(j.q('[data-test="record"]')).toBeNull()
    })

    it('série non réussie : pas de record', () => {
      const j = monter({ pas: 1000, donnees: ancienne(5100) })
      j.repondreFaux(); j.repondreJuste()
      j.repondreFaux(); j.repondreJuste()
      for (let i = 0; i < 8; i++) j.repondreJuste()
      expect(j.ecran.element.textContent).toContain('8 sur 10')
      expect(j.q('[data-test="record"]')).toBeNull()
    })
  })
})
