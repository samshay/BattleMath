import { decomposerParcours, parcoursId } from '../core/types'
import type { Op, ParcoursId, Vitesse } from '../core/types'
import { calculsARevoir, joursEntrainement, niveauxARetravailler, parcoursVisibles, synthese } from '../core/progression'
import { formaterSecondes, nomParcours } from '../core/format'
import type { Rng } from '../core/rng'
import { COULEURS, donneesVides, MAX_PROFILS, prenomValide, profilActif } from '../storage/schema'
import type { Couleur, Profil, Reglages } from '../storage/schema'
import { ajouterProfil, majProfil, profilParId, reinitialiserProfil, supprimerProfil } from '../storage/profils'
import { exporterJson, importerJson, nomFichierExport } from '../storage/store'
import type { StockageLike } from '../storage/store'
import { h } from './dom'
import { AVERTISSEMENTS, MSG_NON_ENREGISTRE } from './accueil'
import type { ContexteApp } from './accueil'
import { graphiqueReussite, graphiqueTemps, MAX_SERIES } from './graphiques'
import { grilleFaits } from './grilleFaits'
import { rangeeProfils } from './profils'

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
  partager?: (fichier: File) => Promise<'ok' | 'annule' | 'echec'>
  telecharger: (nom: string, contenu: string) => void
  confirmer: (msg: string) => boolean
}

const VITESSES: [Vitesse, string][] = [['tranquille', 'Tranquille'], ['normal', 'Normal'], ['rapide', 'Rapide']]
const ERREURS_IMPORT = { json_invalide: 'Fichier illisible', version_inconnue: 'Version inconnue', structure_invalide: 'Fichier invalide' }

const pct = (x: number): string => `${Math.round(x * 100)} %`

export function rendreParents(ctx: ContexteApp, deps: DepsParents): HTMLElement {
  const racine = h('div', { class: 'parents-ecran' })
  let question = genererQuestionVerrou(deps.rng)
  let echecs = 0
  let messageGate = ''
  let message = ''
  let cibleMessage: 'reglages' | 'profils' = 'reglages'
  let parcours: ParcoursId | null = null
  let consulteId = ctx.donnees.profilActif

  function dire(texte: string, cible: 'reglages' | 'profils'): void {
    message = texte
    cibleMessage = cible
  }

  function consulte(): Profil {
    const p = profilParId(ctx.donnees, consulteId)
    if (p) return p
    const repli = profilActif(ctx.donnees)
    consulteId = repli.id
    return repli
  }

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
      h('a', { href: '#/' }, 'Retour'),
      h('h1', {}, 'Espace parents'),
      h('p', {}, 'Pour entrer, répondez à cette question.'),
      h('form', { 'data-test': 'verrou-form', onsubmit: (e) => { e.preventDefault(); valider() } },
        h('p', { class: 'question' }, question.question),
        champ,
        h('button', { type: 'button', class: 'principal', 'data-test': 'verrou-valider', onclick: valider }, 'Entrer')),
      h('p', { class: 'message' }, messageGate),
    )
  }

  function revoirListe(op: 'add' | 'sub' | 'mul' | 'mix'): HTMLElement[] {
    const { faits } = consulte()
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
    const lignes = niveauxARetravailler(consulte().series, p)
    if (lignes.length === 0) return [h('p', {}, 'Rien à signaler pour le moment.')]
    return [
      h('h3', {}, 'Niveaux à retravailler'),
      h('table', {},
        h('thead', {}, h('tr', {}, ...['Niveau', 'Erreurs', 'Temps médian', 'Séries'].map((t) => h('th', {}, t)))),
        h('tbody', {}, ...lignes.map((l) => h('tr', {},
          h('td', {}, String(l.niveau)), h('td', {}, pct(l.tauxErreur)), h('td', {}, formaterSecondes(l.tempsMedian)), h('td', {}, String(l.nbSeries)))))),
    ]
  }

  function sauverReglages(r: Partial<Reglages>): void {
    dire('', 'reglages')
    ctx.sauver(majProfil(ctx.donnees, consulteId, { reglages: { ...consulte().reglages, ...r } }))
    dessiner()
  }

  async function exporter(): Promise<void> {
    const json = exporterJson(ctx.donnees)
    const nom = nomFichierExport(new Date())
    const fichier = new File([json], nom, { type: 'application/json' })
    let resultat: 'ok' | 'annule' | 'echec' = 'echec'
    if (deps.partager && navigator.canShare?.({ files: [fichier] })) resultat = await deps.partager(fichier)
    if (resultat === 'echec') deps.telecharger(nom, json)
  }

  async function importer(input: HTMLInputElement): Promise<void> {
    const fichier = input.files?.[0]
    if (!fichier) return
    try { await importerFichier(fichier) } finally { try { input.value = '' } catch { /* ignoré */ } }
  }

  async function importerFichier(fichier: File): Promise<void> {
    let texte: string
    try { texte = await fichier.text() } catch { dire('Fichier illisible', 'reglages'); dessiner(); return }
    const r = importerJson(texte)
    if (!r.ok) { dire(ERREURS_IMPORT[r.erreur], 'reglages'); dessiner(); return }
    const n = ctx.donnees.profils.length
    const m = r.donnees.profils.length
    const prenoms = r.donnees.profils.map((p) => p.prenom).join(', ')
    const actuels = n === 1 ? 'le profil actuel et toute sa progression' : `les ${n} profils actuels et toute leur progression`
    if (!deps.confirmer(`Remplacer ${actuels} par ce fichier (${m} profil(s) : ${prenoms}) ? Cette action est définitive.`)) return
    ctx.sauver(r.donnees)
    consulteId = ctx.donnees.profilActif
    parcours = null
    dire('Progrès importés', 'reglages')
    dessiner()
  }

  function ligneProfil(p: Profil): HTMLElement {
    const champ = h('input', {
      type: 'text', maxlength: '12', autocapitalize: 'words', autocomplete: 'off', enterkeyhint: 'done', 'data-test': `prenom-${p.id}`, 'aria-label': `Prénom de ${p.prenom}`,
      onchange: () => {
        const v = champ.value
        if (!prenomValide(v)) {
          dire('Le prénom doit faire 1 à 12 caractères', 'profils')
          dessiner()
          return
        }
        dire('', 'profils')
        ctx.sauver(majProfil(ctx.donnees, p.id, { prenom: v }))
        dessiner()
      },
    })
    champ.value = p.prenom
    const couleurs = (Object.keys(COULEURS) as Couleur[]).map((c) => h('button', {
      type: 'button', class: c === p.couleur ? 'couleur actif' : 'couleur', 'data-couleur': c, 'aria-label': c, 'aria-pressed': String(c === p.couleur),
      style: `background: ${COULEURS[c]}`,
      onclick: () => { dire('', 'profils'); ctx.sauver(majProfil(ctx.donnees, p.id, { couleur: c })); dessiner() },
    }))
    return h('div', { class: 'ligne-profil', 'data-id': p.id },
      champ,
      h('div', { class: 'couleurs' }, ...couleurs),
      h('button', {
        type: 'button', class: 'danger', 'data-test': `supprimer-${p.id}`, disabled: String(ctx.donnees.profils.length === 1),
        onclick: () => {
          if (!deps.confirmer(`Supprimer le profil ${p.prenom} et toute sa progression ?`)) return
          ctx.sauver(supprimerProfil(ctx.donnees, p.id))
          if (p.id === consulteId) parcours = null
          dire('', 'profils')
          dessiner()
        },
      }, 'Supprimer'))
  }

  function dessiner(): void {
    if (!deps.verrou.estOuvert()) { dessinerVerrou(); return }
    const donnees = consulte()
    const visibles = parcoursVisibles(donnees.reglages.parcoursAvances)
    const avecSeries = [...new Set(donnees.series.map((s) => s.parcours))]
    const choix = [...new Set<ParcoursId>([...visibles, ...avecSeries])]
    if (parcours === null || !choix.includes(parcours)) {
      const defaut = donnees.dernierParcours ?? parcoursId('add', 1)
      parcours = choix.includes(defaut) ? defaut : choix[0]!
    }
    const courant = parcours
    const { op, taille } = decomposerParcours(courant)
    const seriesParcours = donnees.series.filter((s) => s.parcours === courant)

    const select = h('select', {
      'data-test': 'parcours', 'aria-label': 'Parcours',
      onchange: (e) => { parcours = (e.target as HTMLSelectElement).value as ParcoursId; dire('', 'reglages'); dessiner() },
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

    const tronque = seriesParcours.length > MAX_SERIES ? ` (${MAX_SERIES} dernières séries)` : ''
    racine.replaceChildren(
      h('a', { href: '#/' }, 'Retour'),
      h('h1', {}, 'Espace parents'),
      rangeeProfils(ctx.donnees.profils, consulteId, (id) => { consulteId = id; parcours = null; dire('', 'reglages'); dessiner() }),
      ...(ctx.avertissement ? [h('p', { class: 'avertissement', 'data-test': 'avertissement' }, ctx.avertissement === 'stockage_indisponible' ? MSG_NON_ENREGISTRE : AVERTISSEMENTS[ctx.avertissement])] : []),
      h('h2', {}, 'Progression'),
      select,
      h('figure', {}, graphiqueReussite(seriesParcours), h('figcaption', {}, `Réussite par série${tronque}`)),
      h('figure', {}, graphiqueTemps(seriesParcours), h('figcaption', {}, `Temps par calcul (trait = objectif)${tronque}`)),
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
        h('label', { class: 'importer' }, 'Importer ', importerInput)),
      h('button', {
        type: 'button', class: 'danger', 'data-test': 'reset-profil',
        onclick: () => {
          if (!deps.confirmer(`Effacer toute la progression de ${donnees.prenom} ? Cette action est définitive.`)) return
          ctx.sauver(reinitialiserProfil(ctx.donnees, consulteId))
          dire('Progression effacée', 'reglages')
          dessiner()
        },
      }, `Effacer la progression de ${donnees.prenom}`),
      h('p', { class: 'message', 'data-test': 'message-reglages' }, cibleMessage === 'reglages' ? message : ''),
      h('h2', {}, 'Profils'),
      ...ctx.donnees.profils.map(ligneProfil),
      h('button', {
        type: 'button', 'data-test': 'ajouter-profil', disabled: String(ctx.donnees.profils.length >= MAX_PROFILS),
        onclick: () => { ctx.sauver(ajouterProfil(ctx.donnees)); dire('', 'profils'); dessiner() },
      }, 'Ajouter un profil'),
      h('button', {
        type: 'button', class: 'danger', 'data-test': 'reset-tout',
        onclick: () => {
          if (!deps.confirmer('Effacer tous les profils et toute la progression ? Cette action est définitive.')) return
          ctx.sauver(donneesVides())
          consulteId = ctx.donnees.profilActif
          parcours = null
          dire('Progression effacée', 'profils')
          dessiner()
        },
      }, 'Tout effacer'),
      h('p', { class: 'message', 'data-test': 'message-profils' }, cibleMessage === 'profils' ? message : ''),
    )
    const el = racine.querySelector<HTMLElement>(`[data-test="message-${cibleMessage}"]`)
    if (el && message !== '' && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }

  dessiner()
  return racine
}
