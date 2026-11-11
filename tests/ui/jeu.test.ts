// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rendreJeu } from '../../src/ui/jeu'
import type { Visibilite } from '../../src/ui/jeu'
import type { ContexteApp } from '../../src/ui/accueil'
import { donneesVides } from '../../src/storage/schema'
import type { Donnees } from '../../src/storage/schema'
import { createRng } from '../../src/core/rng'
import { calculCourant } from '../../src/game/session'
import { reponseAttendue } from '../../src/core/faits'
import { formaterCalcul } from '../../src/core/format'
import type { ParcoursId } from '../../src/core/types'

function ctxDe(donnees: Donnees = donneesVides()): ContexteApp {
  return { donnees, avertissement: null, sauver: vi.fn(), naviguer: vi.fn(), selection: { op: 'add', taille: 1 } }
}

function monter(opts: { parcours?: ParcoursId; n?: number; donnees?: Donnees; pas?: number } = {}) {
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
    horloge: { now: () => (t += pas), }, visibilite, rng: createRng(1), delaiFeedbackMs: 0,
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
    const cibleS = Math.ceil(j.ecran.session().cibleMs / 1000)
    expect(j.q('.objectif')!.textContent).toBe(`Objectif : moins de ${cibleS} secondes par calcul`)
    expect(j.ecran.element.querySelector('input')).toBeNull()
  })

  it('vitesse tranquille : l\'objectif suit la cible multipliée par 1,5', () => {
    const normal = monter()
    const d = donneesVides()
    d.reglages.vitesse = 'tranquille'
    const lent = monter({ donnees: d })
    expect(lent.ecran.session().cibleMs).toBe(normal.ecran.session().cibleMs * 1.5)
    expect(lent.q('.objectif')!.textContent).toContain(`moins de ${Math.ceil(lent.ecran.session().cibleMs / 1000)} secondes`)
  })

  it('tout juste : écran de fin, une seule sauvegarde, série validée et 10 faits', () => {
    const j = monter()
    for (let i = 0; i < 10; i++) j.repondreJuste()
    expect(j.ctx.sauver).toHaveBeenCalledTimes(1)
    const d = vi.mocked(j.ctx.sauver).mock.calls[0]![0]
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
    const serie = vi.mocked(j.ctx.sauver).mock.calls[0]![0].series[0]!
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

  it('Accueil à mi-série : rien sauvé, navigue, désabonne', () => {
    const j = monter()
    j.repondreJuste()
    j.q('[data-test="accueil"]')!.click()
    expect(j.ctx.sauver).not.toHaveBeenCalled()
    expect(j.ctx.naviguer).toHaveBeenCalledWith({ nom: 'accueil' })
    expect(j.desabonner).toHaveBeenCalled()
  })

  it('hashchange : désabonne sans sauver', () => {
    const j = monter()
    window.dispatchEvent(new Event('hashchange'))
    expect(j.desabonner).toHaveBeenCalled()
    expect(j.ctx.sauver).not.toHaveBeenCalled()
  })

  it('niveau verrouillé : retour accueil immédiat', () => {
    const j = monter({ n: 3 })
    expect(j.ctx.naviguer).toHaveBeenCalledWith({ nom: 'accueil' })
    expect(j.ecran.element.children).toHaveLength(0)
  })

  it('fin : Rejouer, Niveau suivant (débloqué) et Accueil', () => {
    const j = monter()
    for (let i = 0; i < 10; i++) j.repondreJuste()
    j.q('[data-test="rejouer"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 1 })
    j.q('[data-test="suivant"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'jeu', parcours: 'mul-1', niveau: 2 })
    j.q('[data-test="accueil"]')!.click()
    expect(j.ctx.naviguer).toHaveBeenLastCalledWith({ nom: 'accueil' })
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
})
