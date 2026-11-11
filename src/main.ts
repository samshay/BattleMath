import './style.css'
import { decomposerParcours } from './core/types'
import { charger, sauver } from './storage/store'
import type { StockageLike } from './storage/store'
import type { Donnees } from './storage/schema'
import { h } from './ui/dom'
import { rendreAccueil } from './ui/accueil'
import type { ContexteApp } from './ui/accueil'
import { rendreJeu } from './ui/jeu'
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
        : h('div', {}, h('p', {}, 'Bientôt'), h('a', { href: '#/' }, 'Retour')),
  )
}

demarrerRouteur(afficher)
