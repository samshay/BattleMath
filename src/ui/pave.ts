import { h } from './dom'

export interface Pave {
  element: HTMLElement
  valeur(): string
  effacer(): void
  vider(): void
  setActif(actif: boolean): void
}

const DISPOSITION = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'effacer', '0', 'valider']

export function creerPave(opts: {
  onValider(valeur: number): void
  onChange(valeur: string): void
  maxChiffres?: number
}): Pave {
  const max = opts.maxChiffres ?? 4
  let valeur = ''
  let actif = true
  const boutons = new Map<string, HTMLButtonElement>()

  function maj(): void {
    for (const b of boutons.values()) b.disabled = !actif
    boutons.get('valider')!.disabled = !actif || valeur === ''
  }
  function changer(v: string): void {
    valeur = v
    maj()
    opts.onChange(valeur)
  }
  function taper(chiffre: string): void {
    if (!actif) return
    if (valeur === '0') {
      if (chiffre !== '0') changer(chiffre)
      return
    }
    if (valeur.length >= max) return
    changer(valeur + chiffre)
  }
  function effacer(): void {
    if (!actif || valeur === '') return
    changer(valeur.slice(0, -1))
  }

  for (const t of DISPOSITION) {
    const texte = t === 'effacer' ? '⌫' : t === 'valider' ? 'Valider' : t
    const onclick = t === 'effacer' ? effacer
      : t === 'valider' ? () => { if (actif && valeur !== '') opts.onValider(Number(valeur)) }
      : () => taper(t)
    const b = h('button', { type: 'button', class: `touche touche-${t}`, 'data-touche': t, onclick }, texte)
    if (t === 'effacer') b.setAttribute('aria-label', 'Effacer')
    boutons.set(t, b)
  }
  maj()

  return {
    element: h('div', { class: 'pave' }, ...boutons.values()),
    valeur: () => valeur,
    effacer,
    vider: () => changer(''),
    setActif(a) { actif = a; maj() },
  }
}
