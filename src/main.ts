import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { decomposerParcours } from './core/types'
import { createRng } from './core/rng'
import { charger, sauver } from './storage/store'
import type { StockageLike } from './storage/store'
import { profilActif } from './storage/schema'
import type { Donnees } from './storage/schema'
import { h } from './ui/dom'
import { rendreAccueil } from './ui/accueil'
import type { ContexteApp } from './ui/accueil'
import { rendreJeu } from './ui/jeu'
import { creerVerrouSession, rendreParents } from './ui/parents'
import { demarrerRouteur, versHash } from './ui/router'
import type { Route } from './ui/router'

function localStorageOuNull(): StockageLike | null {
  try {
    const s = window.localStorage
    s.setItem('battlemath.sonde', '1')
    s.removeItem('battlemath.sonde')
    return s
  } catch {
    return null
  }
}

function sessionStorageOuNull(): StockageLike | null {
  try { return window.sessionStorage } catch { return null }
}

function telecharger(nom: string, contenu: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }))
  const a = h('a', { href: url, download: nom })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stockage = localStorageOuNull()
function selectionInitiale(): ContexteApp['selection'] {
  const actif = profilActif(donnees)
  const s = actif.dernierParcours ? decomposerParcours(actif.dernierParcours) : { op: 'add' as const, taille: 1 as const }
  return s.taille === 3 && !actif.reglages.parcoursAvances ? { op: s.op, taille: 1 } : s
}
const { donnees, avertissement } = charger(stockage)

const ctx: ContexteApp = {
  donnees,
  avertissement,
  sauver(d: Donnees) {
    ctx.donnees = d
    const ok = sauver(stockage, d)
    if (!ok) ctx.avertissement = 'stockage_indisponible'
    else if (ctx.avertissement === 'donnees_corrompues') ctx.avertissement = null
    return ok
  },
  naviguer(r) {
    const hash = versHash(r)
    // Même route (ex. Rejouer) : pas de hashchange, on redessine directement.
    if (location.hash === hash) afficher(r)
    else location.hash = hash
  },
  selection: selectionInitiale(),
}

const app = document.getElementById('app')!

let detruireEcran: (() => void) | null = null

function afficher(route: Route): void {
  detruireEcran?.()
  detruireEcran = null
  let jeu: ReturnType<typeof rendreJeu> | null = null
  if (route.nom === 'jeu') { jeu = rendreJeu(ctx, route.parcours, route.niveau); detruireEcran = jeu.detruire }
  app.replaceChildren(
    route.nom === 'accueil' ? rendreAccueil(ctx)
      : jeu ? jeu.element
        : rendreParents(ctx, {
          verrou: creerVerrouSession(sessionStorageOuNull()),
          rng: createRng(Date.now()),
          partager: navigator.share
            ? async (f) => {
              try { await navigator.share({ files: [f] }); return 'ok' as const } catch (e) {
                return e instanceof DOMException && e.name === 'AbortError' ? 'annule' as const : 'echec' as const
              }
            }
            : undefined,
          telecharger,
          confirmer: (m) => window.confirm(m),
        }),
  )
}

demarrerRouteur(afficher)

registerSW({ immediate: true })
