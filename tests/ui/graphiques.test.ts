// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { graphiqueReussite, graphiqueTemps } from '../../src/ui/graphiques'
import type { Serie } from '../../src/core/types'

const serie = (niveau: number, bonnes: number, tempsMedian: number, tempsCible: number, validee: boolean): Serie => ({
  date: '2026-11-11T10:00:00.000Z', parcours: 'add-1', niveau, bonnes, tempsMedian, tempsCible, reussie: bonnes >= 9, validee,
})

describe('graphiques', () => {
  it('0 série : aucun point et un texte', () => {
    for (const g of [graphiqueReussite([]), graphiqueTemps([])]) {
      expect(g.querySelectorAll('circle.point')).toHaveLength(0)
      expect(g.querySelector('text')!.textContent).toBe('Pas encore de série')
    }
  })

  it('réussite : 1 point par série avec data-validee', () => {
    const g = graphiqueReussite([serie(1, 10, 3000, 4000, true), serie(2, 7, 5000, 4000, false), serie(2, 9, 3500, 4000, false)])
    const pts = [...g.querySelectorAll('circle.point')] as SVGElement[]
    expect(pts).toHaveLength(3)
    expect(pts.map((p) => p.getAttribute('data-validee'))).toEqual(['true', 'false', 'false'])
    expect(pts[0]!.getAttribute('data-niveau')).toBe('1')
    expect([...g.querySelectorAll('text.niveau')].map((t) => t.textContent)).toEqual(['N1', 'N2', 'N2'])
    expect(Number(pts[0]!.getAttribute('cy'))).toBeLessThan(Number(pts[1]!.getAttribute('cy')))
  })

  it('temps : 3 points et 3 segments cible à la hauteur de tempsCible', () => {
    const g = graphiqueTemps([serie(1, 10, 3000, 4000, true), serie(2, 7, 5000, 4000, false), serie(3, 9, 2000, 6000, false)])
    expect(g.querySelectorAll('circle.point')).toHaveLength(3)
    const cibles = [...g.querySelectorAll('line.cible')] as SVGElement[]
    expect(cibles).toHaveLength(3)
    const yDe = (ms: number) => {
      // axe de 0 à 6 s sur la hauteur utile 160-8-20
      return 8 + (1 - ms / 6000) * (160 - 8 - 20)
    }
    expect(Number(cibles[0]!.getAttribute('y1'))).toBeCloseTo(yDe(4000))
    expect(Number(cibles[0]!.getAttribute('y2'))).toBeCloseTo(yDe(4000))
    expect(Number(cibles[2]!.getAttribute('y1'))).toBeCloseTo(yDe(6000))
    const x1 = Number(cibles[0]!.getAttribute('x1')); const x2 = Number(cibles[0]!.getAttribute('x2'))
    expect(x2 - x1).toBe(10)
  })
})
