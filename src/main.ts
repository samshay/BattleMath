import './style.css'
import { decomposerParcours } from './core/types'
import { createRng } from './core/rng'
import { charger, sauver } from './storage/store'
import type { StockageLike } from './storage/store'
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
  URL.revokeObjectURL(url)
}

const stockage = localStorageOuNull()
const { donnees, avertissement } = charger(stockage)

const ctx: ContexteApp = {
  donnees,
  avertissement,
  sauver(d: Donnees) {
    ctx.donnees = d
    sauver(stockage, d)
  },
  naviguer(r) {
    const hash = versHash(r)
    // Même route (ex. Rejouer) : pas de hashchange, on redessine directement.
    if (location.hash === hash) afficher(r)
    else location.hash = hash
  },
  selection: donnees.dernierParcours ? decomposerParcours(donnees.dernierParcours) : { op: 'add', taille: 1 },
}

const app = document.getElementById('app')!

function afficher(route: Route): void {
  app.replaceChildren(
    route.nom === 'accueil' ? rendreAccueil(ctx)
      : route.nom === 'jeu' ? rendreJeu(ctx, route.parcours, route.niveau).element
        : rendreParents(ctx, {
          verrou: creerVerrouSession(sessionStorageOuNull()),
          rng: createRng(Date.now()),
          partager: navigator.share
            ? async (f) => { try { await navigator.share({ files: [f] }); return true } catch { return false } }
            : undefined,
          telecharger,
          confirmer: (m) => window.confirm(m),
        }),
  )
}

demarrerRouteur(afficher)
