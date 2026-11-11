import type { ParcoursId } from '../core/types'
import { estParcoursId } from '../storage/schema'

export type Route =
  | { nom: 'accueil' }
  | { nom: 'jeu'; parcours: ParcoursId; niveau: number }
  | { nom: 'parents' }

export function parserHash(hash: string): Route {
  const [vide, nom, parcours, niveau, ...reste] = hash.replace(/^#/, '').split('/')
  if (vide !== '' || reste.length > 0) return { nom: 'accueil' }
  if (nom === 'parents' && parcours === undefined) return { nom: 'parents' }
  if (nom === 'jeu' && estParcoursId(parcours) && niveau !== undefined && /^[1-8]$/.test(niveau)) {
    return { nom: 'jeu', parcours, niveau: Number(niveau) }
  }
  return { nom: 'accueil' }
}

export function versHash(r: Route): string {
  if (r.nom === 'jeu') return `#/jeu/${r.parcours}/${r.niveau}`
  return r.nom === 'parents' ? '#/parents' : '#/'
}

export function demarrerRouteur(rendre: (r: Route) => void): void {
  window.addEventListener('hashchange', () => rendre(parserHash(location.hash)))
  rendre(parserHash(location.hash))
}
