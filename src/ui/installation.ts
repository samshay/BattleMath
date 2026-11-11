import { h } from './dom'

export type Plateforme = 'ios' | 'android' | 'autre'

export function detecterPlateforme(ua: string, standalone: boolean): { plateforme: Plateforme; dejaInstallee: boolean } {
  const plateforme: Plateforme = /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'autre'
  return { plateforme, dejaInstallee: standalone }
}

/** Vrai si l'app est lancée depuis l'écran d'accueil (PWA installée). */
export function estStandalone(): boolean {
  return (
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

const TEXTES: Record<Plateforme, string> = {
  ios: 'Pour garder tes progrès, ajoute BattleMath à l\'écran d\'accueil : Partager puis Sur l\'écran d\'accueil.',
  android: 'Pour garder tes progrès, installe BattleMath : menu du navigateur puis Installer l\'application.',
  autre: 'Pour garder tes progrès, installe BattleMath : menu du navigateur puis Installer l\'application.',
}

export function bannierInstallation(dejaInstallee: boolean, plateforme: Plateforme, onFermer: () => void = () => {}): HTMLElement | null {
  if (dejaInstallee) return null
  const banniere: HTMLElement = h('div', { class: 'banniere' }, h('p', {}, TEXTES[plateforme]),
    h('button', { type: 'button', onclick: () => { banniere.remove(); onFermer() } }, 'Fermer'))
  return banniere
}
