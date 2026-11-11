import type { Serie } from '../core/types'

const NS = 'http://www.w3.org/2000/svg'
const L = 320
const H = 160
const MG = 28
const MD = 8
const MH = 8
const MB = 20

function el(tag: string, attrs: Record<string, string | number>, texte?: string): SVGElement {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (texte !== undefined) e.textContent = texte
  return e as SVGElement
}

function svgVide(label: string): SVGSVGElement {
  const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, width: '100%', role: 'img', 'aria-label': label }) as SVGSVGElement
  return svg
}

interface Config {
  label: string
  axeMax: number
  ticks: number[]
  formatTick: (v: number) => string
  valeur: (s: Serie) => number
  cibles: boolean
}

function dessiner(series: readonly Serie[], c: Config): SVGSVGElement {
  const svg = svgVide(c.label)
  if (series.length === 0) {
    svg.append(el('text', { x: L / 2, y: H / 2, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 12 }, 'Pas encore de série'))
    return svg
  }
  const haut = H - MH - MB
  const y = (v: number): number => MH + (1 - v / c.axeMax) * haut
  const x = (i: number): number => (series.length === 1 ? MG + (L - MG - MD) / 2 : MG + (i * (L - MG - MD)) / (series.length - 1))

  svg.append(el('line', { x1: MG, y1: MH, x2: MG, y2: H - MB, stroke: 'currentColor', 'stroke-opacity': 0.5 }))
  svg.append(el('line', { x1: MG, y1: H - MB, x2: L - MD, y2: H - MB, stroke: 'currentColor', 'stroke-opacity': 0.5 }))
  for (const t of c.ticks) {
    svg.append(el('line', { x1: MG, y1: y(t), x2: L - MD, y2: y(t), stroke: 'currentColor', 'stroke-opacity': 0.15 }))
    svg.append(el('text', { x: MG - 4, y: y(t) + 3, 'text-anchor': 'end', fill: 'currentColor', 'font-size': 9 }, c.formatTick(t)))
  }
  svg.append(el('polyline', {
    points: series.map((s, i) => `${x(i)},${y(c.valeur(s))}`).join(' '),
    fill: 'none', stroke: 'var(--primaire)', 'stroke-width': 2,
  }))
  series.forEach((s, i) => {
    if (c.cibles) {
      svg.append(el('line', { class: 'cible', x1: x(i) - 5, x2: x(i) + 5, y1: y(s.tempsCible), y2: y(s.tempsCible), stroke: 'var(--succes)', 'stroke-width': 2 }))
    }
    svg.append(el('circle', {
      class: s.validee ? 'point valide' : 'point', cx: x(i), cy: y(c.valeur(s)), r: 4,
      'data-niveau': s.niveau, 'data-validee': String(s.validee),
      fill: s.validee ? 'var(--primaire)' : 'var(--surface)', stroke: 'var(--primaire)', 'stroke-width': 2,
    }))
  })
  return svg
}

export function graphiqueReussite(series: readonly Serie[]): SVGSVGElement {
  return dessiner(series, {
    label: 'Réussite par série', axeMax: 100, ticks: [0, 50, 100], formatTick: (v) => `${v}`,
    valeur: (s) => s.bonnes * 10, cibles: false,
  })
}

export function graphiqueTemps(series: readonly Serie[]): SVGSVGElement {
  const maxMs = Math.max(1, ...series.map((s) => Math.max(s.tempsMedian, s.tempsCible)))
  const axeMax = maxMs
  return dessiner(series, {
    label: 'Temps par calcul', axeMax, ticks: [0, axeMax / 2, axeMax],
    formatTick: (v) => `${Math.round(v / 100) / 10}`.replace('.', ','),
    valeur: (s) => s.tempsMedian, cibles: true,
  })
}
