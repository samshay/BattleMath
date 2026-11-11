import { createRng } from '../core/rng'
import type { Rng } from '../core/rng'
import { cleUnicite, genererRemplacement, genererSerie } from '../core/serie'
import { niveau } from '../core/levels'
import { cibleEffective } from '../core/validation'
import { etatNiveau } from '../core/progression'
import { formaterCalcul, formaterSecondes } from '../core/format'
import { reponseAttendue } from '../core/faits'
import type { ParcoursId } from '../core/types'
import { enregistrerSerie } from '../storage/store'
import {
  annulerCourant, avancer, bilan, calculCourant, corriger, creerSession, etatsPastilles, majFaits, repondre, versSerie,
} from '../game/session'
import type { Session } from '../game/session'
import { h } from './dom'
import { MSG_NON_ENREGISTRE } from './accueil'
import type { ContexteApp } from './accueil'
import { creerPave } from './pave'

export interface Horloge { now(): number }
export interface Visibilite { onCache(cb: () => void): () => void; onVisible(cb: () => void): () => void }
export interface EcranJeu { element: HTMLElement; session(): Session; detruire(): void }

const horlogeParDefaut: Horloge = { now: () => performance.now() }
function surVisibilite(cb: () => void, cache: boolean): () => void {
  const ecouteur = (): void => { if (document.hidden === cache) cb() }
  const direct = (): void => cb()
  // pagehide / pageshow : certains Safari iOS ne déclenchent que ceux-là au changement d'app.
  const evtPage = cache ? 'pagehide' : 'pageshow'
  document.addEventListener('visibilitychange', ecouteur)
  window.addEventListener(evtPage, direct)
  return () => {
    document.removeEventListener('visibilitychange', ecouteur)
    window.removeEventListener(evtPage, direct)
  }
}
const visibiliteParDefaut: Visibilite = {
  onCache: (cb) => surVisibilite(cb, true),
  onVisible: (cb) => surVisibilite(cb, false),
}

function formaterObjectif(ms: number): string {
  return ms % 1000 === 0 ? `${ms / 1000} s` : formaterSecondes(ms)
}

export function rendreJeu(
  ctx: ContexteApp,
  parcours: ParcoursId,
  n: number,
  deps: { horloge?: Horloge; visibilite?: Visibilite; rng?: Rng; delaiFeedbackMs?: number } = {},
): EcranJeu {
  const racine = h('div', { class: 'jeu' })
  if (etatNiveau(ctx.donnees.series, parcours, n) === 'verrouille') {
    ctx.naviguer({ nom: 'accueil' })
    return { element: racine, session: () => { throw new Error('niveau verrouillé') }, detruire: () => {} }
  }

  const horloge = deps.horloge ?? horlogeParDefaut
  const visibilite = deps.visibilite ?? visibiliteParDefaut
  const rng = deps.rng ?? createRng(Date.now())
  const delai = deps.delaiFeedbackMs ?? 400

  const cibleMs = cibleEffective(niveau(parcours, n).cibleMs, ctx.donnees.reglages.vitesse)
  let s = creerSession(parcours, n, cibleMs, genererSerie(parcours, n, rng, ctx.donnees.faits))
  let t0: number | null = horloge.now()
  let quitte = false
  let interrompu = false
  let cache = false
  let minuteur: ReturnType<typeof setTimeout> | undefined

  const entete = h('div', { class: 'entete' })
  const calculEl = h('div', { class: 'calcul' })
  const reponseEl = h('div', { class: 'reponse' })
  const saisieEl = h('span', { class: 'saisie' })
  const pave = creerPave({
    onChange(v) {
      saisieEl.textContent = v
    },
    onValider: valider,
  })

  function quitter(): void {
    quitte = true
    if (minuteur !== undefined) clearTimeout(minuteur)
    desabonner()
    desabonnerVisible()
    window.removeEventListener('hashchange', quitter)
  }
  const desabonner = visibilite.onCache(() => {
    if (quitte) return
    cache = true
    if (s.phase !== 'question') return
    const exclues = new Set(s.calculs.map(cleUnicite))
    s = annulerCourant(s, genererRemplacement(parcours, n, rng, exclues, ctx.donnees.faits))
    t0 = null
    interrompu = true
    pave.vider()
    dessiner()
  })
  const desabonnerVisible = visibilite.onVisible(() => {
    cache = false
    if (quitte || !interrompu) return
    interrompu = false
    if (s.phase === 'question') { t0 = horloge.now(); dessiner() }
  })
  window.addEventListener('hashchange', quitter, { once: true })

  function boutonAccueil(): HTMLElement {
    return h('button', {
      type: 'button', class: 'discret', 'data-test': 'accueil',
      onclick: () => { quitter(); ctx.naviguer({ nom: 'accueil' }) },
    }, 'Accueil')
  }

  function dessiner(): void {
    entete.replaceChildren(
      h('div', { class: 'pastilles' }, ...etatsPastilles(s).map((e) => h('span', { class: 'pastille', 'data-etat': e }))),
      h('p', { class: 'objectif' }, `Objectif : moins de ${formaterObjectif(s.cibleMs).replace(/ s$/, ' secondes')} par calcul`),
      boutonAccueil(),
    )
    calculEl.textContent = formaterCalcul(calculCourant(s))
    const enfants: Node[] = []
    if (s.phase === 'correction' && s.derniereReponse !== null) {
      enfants.push(h('span', { class: 'barree' }, String(s.derniereReponse)))
      enfants.push(h('span', { class: 'attendu' }, ` ${reponseAttendue(calculCourant(s))}`))
    }
    enfants.push(saisieEl)
    reponseEl.replaceChildren(...enfants)
    reponseEl.classList.toggle('juste', s.phase === 'feedback')
    reponseEl.classList.toggle('correction', s.phase === 'correction')
  }

  function suite(): void {
    if (quitte) return
    if (s.phase === 'fini') return terminer()
    pave.vider()
    pave.setActif(true)
    if (s.phase === 'question') {
      t0 = cache ? null : horloge.now()
      interrompu = cache
    }
    dessiner()
  }

  function valider(valeur: number): void {
    if (quitte) return
    if (s.phase === 'question') {
      s = repondre(s, valeur, horloge.now() - (t0 ?? horloge.now()))
      if (s.phase === 'feedback') {
        pave.setActif(false)
        dessiner()
        if (delai === 0) { s = avancer(s); suite() } else {
          minuteur = setTimeout(() => { s = avancer(s); suite() }, delai)
        }
      } else {
        pave.vider()
        dessiner()
      }
    } else if (s.phase === 'correction') {
      s = corriger(s, valeur)
      suite()
    }
  }

  function terminer(): void {
    quitter()
    const serie = versSerie(s, new Date().toISOString())
    const donnees = enregistrerSerie(ctx.donnees, serie, majFaits(s))
    const enregistre = ctx.sauver(donnees)
    const b = bilan(s)
    const verdict = b.raison === 'validee' ? 'Niveau validé !'
      : b.raison === 'trop_lent'
        ? `Bravo, presque ! Un peu plus vite la prochaine fois (objectif ${formaterObjectif(s.cibleMs)}, toi ${formaterSecondes(b.tempsMedian)}).`
        : 'Il faut 9 bonnes réponses. Encore un essai ?'
    const suivantOuvert = n < 8 && etatNiveau(donnees.series, parcours, n + 1) !== 'verrouille'
    racine.replaceChildren(h('div', { class: 'fin' },
      h('p', { class: 'score' }, `${b.bonnes} sur 10`),
      h('p', { class: 'temps' }, `Ton temps : ${formaterSecondes(b.tempsMedian)} par calcul (objectif ${formaterObjectif(s.cibleMs)})`),
      h('p', { class: `verdict ${b.raison}` }, verdict),
      ...(enregistre ? [] : [h('p', { class: 'avertissement', 'data-test': 'non-enregistre' }, MSG_NON_ENREGISTRE)]),
      h('button', {
        type: 'button', class: 'principal', 'data-test': 'rejouer',
        onclick: () => ctx.naviguer({ nom: 'jeu', parcours, niveau: n }),
      }, 'Rejouer'),
      ...(suivantOuvert ? [h('button', {
        type: 'button', class: 'principal', 'data-test': 'suivant',
        onclick: () => ctx.naviguer({ nom: 'jeu', parcours, niveau: n + 1 }),
      }, 'Niveau suivant')] : []),
      h('button', { type: 'button', 'data-test': 'accueil', onclick: () => ctx.naviguer({ nom: 'accueil' }) }, 'Accueil'),
    ))
  }

  racine.append(entete, calculEl, reponseEl, pave.element)
  dessiner()
  return { element: racine, session: () => s, detruire: quitter }
}
