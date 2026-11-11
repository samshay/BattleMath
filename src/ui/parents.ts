import { decomposerParcours, parcoursId } from '../core/types'
import type { Op, ParcoursId, Vitesse } from '../core/types'
import { calculsARevoir, joursEntrainement, niveauxARetravailler, parcoursVisibles, synthese } from '../core/progression'
import { formaterSecondes } from '../core/format'
import type { Rng } from '../core/rng'
import { donneesVides } from '../storage/schema'
import { exporterJson, importerJson, nomFichierExport } from '../storage/store'
import type { StockageLike } from '../storage/store'
import { h } from './dom'
import type { ContexteApp } from './accueil'
import { graphiqueReussite, graphiqueTemps } from './graphiques'
import { grilleFaits } from './grilleFaits'

export interface Verrou { estOuvert(): boolean; ouvrir(): void }

const CLE_VERROU = 'battlemath.parent'

export function creerVerrouSession(stockage: StockageLike | null): Verrou {
  return {
    estOuvert() {
      try { return stockage?.getItem(CLE_VERROU) != null } catch { return false }
    },
    ouvrir() {
      try { stockage?.setItem(CLE_VERROU, '1') } catch { /* stockage bloqué : à redemander */ }
    },
  }
}

export function genererQuestionVerrou(rng: Rng): { question: string; reponse: number } {
  const a = rng.int(21, 49)
  const b = rng.int(6, 9)
  return { question: `Combien font ${a} × ${b} ?`, reponse: a * b }
}

export interface DepsParents {
  verrou: Verrou
  rng: Rng
  partager?: (fichier: File) => Promise<boolean>
  telecharger: (nom: string, contenu: string) => void
  confirmer: (msg: string) => boolean
}

const NOMS_OP = { add: 'Additions', sub: 'Soustractions', mul: 'Multiplications', mix: 'Mixte' }
const VITESSES: [Vitesse, string][] = [['tranquille', 'Tranquille'], ['normal', 'Normal'], ['rapide', 'Rapide']]
const ERREURS_IMPORT = { json_invalide: 'Fichier illisible', version_inconnue: 'Version inconnue', structure_invalide: 'Fichier invalide' }

function nomParcours(p: ParcoursId): string {
  const { op, taille } = decomposerParcours(p)
  return `${NOMS_OP[op]} ${taille} chiffre${taille > 1 ? 's' : ''}`
}

const pct = (x: number): string => `${Math.round(x * 100)} %`

export function rendreParents(ctx: ContexteApp, deps: DepsParents): HTMLElement {
  const racine = h('div', { class: 'parents-ecran parents' })
  let question = genererQuestionVerrou(deps.rng)
  let echecs = 0
  let messageGate = ''
  let message = ''
  let parcours: ParcoursId | null = null

  function dessinerVerrou(): void {
    const champ = h('input', { type: 'number', inputmode: 'numeric', 'data-test': 'verrou-reponse', 'aria-label': 'Réponse' })
    const valider = (): void => {
      if (Number(champ.value) === question.reponse && champ.value !== '') {
        deps.verrou.ouvrir()
        dessiner()
        return
      }
      echecs += 1
      messageGate = 'Mauvaise réponse'
      if (echecs >= 3) { question = genererQuestionVerrou(deps.rng); echecs = 0 }
      dessiner()
    }
    racine.replaceChildren(
      h('h1', {}, 'Espace parents'),
      h('p', {}, 'Pour entrer, répondez à cette question.'),
      h('p', { class: 'question' }, question.question),
      champ,
      h('button', { type: 'button', class: 'principal', 'data-test': 'verrou-valider', onclick: valider }, 'Entrer'),
      h('p', { class: 'message' }, messageGate),
    )
  }

  function revoirListe(op: 'add' | 'sub' | 'mul' | 'mix'): HTMLElement[] {
    const { faits } = ctx.donnees
    const ops: Op[] = op === 'mix' ? ['add', 'sub', 'mul'] : [op]
    const items = ops.flatMap((o) => calculsARevoir(faits, o))
      .sort((x, y) => y.erreurs / y.tentatives - x.erreurs / x.tentatives || y.tempsMoyen - x.tempsMoyen)
      .slice(0, 10)
    const liste = items.length === 0
      ? h('p', {}, 'Rien à signaler pour le moment.')
      : h('ul', {}, ...items.map((i) =>
        h('li', {}, `${i.libelle} : ${i.erreurs} erreur${i.erreurs > 1 ? 's' : ''} sur ${i.tentatives}, ${formaterSecondes(i.tempsMoyen)} en moyenne`)))
    return [liste, ...ops.map((o) => grilleFaits(faits, o))]
  }

  function niveauxTable(p: ParcoursId): HTMLElement[] {
    const lignes = niveauxARetravailler(ctx.donnees.series, p)
    if (lignes.length === 0) return [h('p', {}, 'Rien à signaler pour le moment.')]
    return [
      h('h3', {}, 'Niveaux à retravailler'),
      h('table', {},
        h('thead', {}, h('tr', {}, ...['Niveau', 'Erreurs', 'Temps médian', 'Séries'].map((t) => h('th', {}, t)))),
        h('tbody', {}, ...lignes.map((l) => h('tr', {},
          h('td', {}, String(l.niveau)), h('td', {}, pct(l.tauxErreur)), h('td', {}, formaterSecondes(l.tempsMedian)), h('td', {}, String(l.nbSeries)))))),
    ]
  }

  function sauverReglages(r: Partial<typeof ctx.donnees.reglages>): void {
    ctx.sauver({ ...ctx.donnees, reglages: { ...ctx.donnees.reglages, ...r } })
    dessiner()
  }

  async function exporter(): Promise<void> {
    const json = exporterJson(ctx.donnees)
    const nom = nomFichierExport(new Date())
    const fichier = new File([json], nom, { type: 'application/json' })
    let partage = false
    if (deps.partager && navigator.canShare?.({ files: [fichier] })) partage = await deps.partager(fichier)
    if (!partage) deps.telecharger(nom, json)
  }

  async function importer(input: HTMLInputElement): Promise<void> {
    const fichier = input.files?.[0]
    if (!fichier) return
    let texte: string
    try { texte = await fichier.text() } catch { message = 'Fichier illisible'; dessiner(); return }
    const r = importerJson(texte)
    if (!r.ok) { message = ERREURS_IMPORT[r.erreur]; dessiner(); return }
    if (!deps.confirmer('Remplacer tous les progrès par ce fichier ?')) return
    ctx.sauver(r.donnees)
    message = 'Progrès importés'
    dessiner()
  }

  function dessiner(): void {
    if (!deps.verrou.estOuvert()) { dessinerVerrou(); return }
    const { donnees } = ctx
    const visibles = parcoursVisibles(donnees.reglages.parcoursAvances)
    const avecSeries = [...new Set(donnees.series.map((s) => s.parcours))]
    const choix = [...new Set<ParcoursId>([...visibles, ...avecSeries])]
    if (parcours === null || !choix.includes(parcours)) parcours = donnees.dernierParcours ?? parcoursId('add', 1)
    const courant = parcours
    const { op, taille } = decomposerParcours(courant)
    const seriesParcours = donnees.series.filter((s) => s.parcours === courant)

    const select = h('select', {
      'data-test': 'parcours', 'aria-label': 'Parcours',
      onchange: (e) => { parcours = (e.target as HTMLSelectElement).value as ParcoursId; dessiner() },
    }, ...choix.map((p) => h('option', { value: p }, nomParcours(p))))
    select.value = courant

    const synth = synthese(donnees.series)
    const importerInput = h('input', {
      type: 'file', accept: '.json,application/json', 'data-test': 'importer', 'aria-label': 'Importer',
      onchange: (e) => { void importer(e.target as HTMLInputElement) },
    })
    const radios = VITESSES.map(([v, nom]) => {
      const r = h('input', { type: 'radio', name: 'vitesse', value: v, onchange: () => sauverReglages({ vitesse: v }) })
      r.checked = donnees.reglages.vitesse === v
      return h('label', { class: 'option' }, r, ` ${nom}`)
    })
    const avances = h('input', {
      type: 'checkbox', 'data-test': 'avances',
      onchange: (e) => sauverReglages({ parcoursAvances: (e.target as HTMLInputElement).checked }),
    })
    avances.checked = donnees.reglages.parcoursAvances

    racine.replaceChildren(
      h('a', { href: '#/' }, 'Retour'),
      h('h1', {}, 'Espace parents'),
      h('h2', {}, 'Progression'),
      select,
      h('figure', {}, graphiqueReussite(seriesParcours), h('figcaption', {}, 'Réussite par série')),
      h('figure', {}, graphiqueTemps(seriesParcours), h('figcaption', {}, 'Temps par calcul (trait = objectif)')),
      h('h2', {}, 'Synthèse'),
      synth.length === 0
        ? h('p', {}, 'Aucune série jouée pour le moment.')
        : h('table', {},
          h('thead', {}, h('tr', {}, ...['Parcours', 'Niveau atteint', 'Séries', 'Calculs'].map((t) => h('th', {}, t)))),
          h('tbody', {}, ...synth.map((s) => h('tr', {},
            h('td', {}, nomParcours(s.parcours)), h('td', {}, String(s.niveauAtteint)), h('td', {}, String(s.nbSeries)), h('td', {}, String(s.nbCalculs)))))),
      h('p', {}, `Jours d'entraînement : ${joursEntrainement(donnees.series)}`),
      h('h2', {}, 'À revoir'),
      ...(taille === 1 ? revoirListe(op) : niveauxTable(courant)),
      h('h2', {}, 'Réglages'),
      h('fieldset', {}, h('legend', {}, 'Vitesse'), ...radios),
      h('label', { class: 'option' }, avances, ' Parcours avancés (3 chiffres)'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', 'data-test': 'exporter', onclick: () => { void exporter() } }, 'Exporter'),
        h('label', { class: 'importer' }, 'Importer ', importerInput),
        h('button', {
          type: 'button', class: 'danger', 'data-test': 'reset',
          onclick: () => {
            if (!deps.confirmer('Effacer toute la progression ? Cette action est définitive.')) return
            ctx.sauver(donneesVides())
            message = 'Progression effacée'
            dessiner()
          },
        }, 'Remise à zéro')),
      h('p', { class: 'message' }, message),
    )
  }

  dessiner()
  return racine
}
