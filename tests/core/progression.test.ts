import { describe, expect, it } from 'vitest'
import {
  calculsARevoir,
  etatFait,
  etatNiveau,
  etatsParcours,
  joursEntrainement,
  niveauAtteint,
  niveauxARetravailler,
  parcoursVisibles,
  prochainNiveau,
  record,
  synthese,
  totalEtoiles,
} from '../../src/core/progression'
import type { Fait, ParcoursId, Serie } from '../../src/core/types'

function serie(
  parcours: ParcoursId,
  niveau: number,
  bonnes: number,
  tempsMedian: number,
  cible: number,
  date = '2026-11-10T10:00:00',
  tempsTotal: number | null = tempsMedian * 10,
): Serie {
  const reussie = bonnes >= 9
  const s: Serie = { date, parcours, niveau, bonnes, tempsMedian, tempsCible: cible, reussie, validee: reussie && tempsMedian <= cible }
  if (tempsTotal !== null) s.tempsTotal = tempsTotal
  return s
}

const valide = (p: ParcoursId, n: number) => serie(p, n, 10, 3000, 5000)

function fait(tentatives: number, erreurs: number, tempsCumule: number, derniers: Fait['derniers'] = []): Fait {
  return { tentatives, erreurs, tempsCumule, derniers }
}

describe('états de niveaux', () => {
  it('sans série : niveau 1 ouvert, 2 à 8 verrouillés', () => {
    expect(etatsParcours([], 'add-1')).toEqual(['ouvert', ...Array(7).fill('verrouille')])
    expect(etatNiveau([], 'add-1', 1)).toBe('ouvert')
    expect(prochainNiveau([], 'add-1')).toBe(1)
    expect(niveauAtteint([], 'add-1')).toBe(0)
  })

  it('niveau 1 validé, 2 réussi non validé', () => {
    const s = [valide('add-1', 1), serie('add-1', 2, 9, 9000, 5000)]
    expect(etatsParcours(s, 'add-1')).toEqual(['valide', 'reussi', ...Array(6).fill('verrouille')])
    expect(prochainNiveau(s, 'add-1')).toBe(2)
    expect(totalEtoiles(s)).toBe(3)
  })

  it('8 validés', () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => valide('add-1', n))
    expect(prochainNiveau(s, 'add-1')).toBeNull()
    expect(niveauAtteint(s, 'add-1')).toBe(8)
  })

  it('réussie puis validée au même niveau : valide', () => {
    const s = [serie('add-1', 1, 9, 9000, 5000), valide('add-1', 1)]
    expect(etatNiveau(s, 'add-1', 1)).toBe('valide')
  })

  it('ignore les autres parcours', () => {
    expect(etatNiveau([valide('sub-1', 1)], 'add-1', 1)).toBe('ouvert')
  })
})

describe('parcoursVisibles', () => {
  it('sans avancés : aucun -3', () => {
    const v = parcoursVisibles(false)
    expect(v.some((p) => p.endsWith('-3'))).toBe(false)
    expect(v).toHaveLength(8)
  })
  it('avec avancés : 4 en -3, ordre attendu', () => {
    const v = parcoursVisibles(true)
    expect(v.filter((p) => p.endsWith('-3'))).toHaveLength(4)
    expect(v).toEqual([
      'add-1', 'sub-1', 'mul-1', 'mix-1',
      'add-2', 'sub-2', 'mul-2', 'mix-2',
      'add-3', 'sub-3', 'mul-3', 'mix-3',
    ])
  })
})

describe('synthese et jours', () => {
  it('une entrée par parcours ayant des séries', () => {
    const s = [valide('mul-1', 1), valide('add-1', 1), serie('add-1', 2, 5, 9000, 5000)]
    expect(synthese(s)).toEqual([
      { parcours: 'add-1', niveauAtteint: 1, nbSeries: 2, nbCalculs: 20 },
      { parcours: 'mul-1', niveauAtteint: 1, nbSeries: 1, nbCalculs: 10 },
    ])
  })
  it('3 séries sur 2 dates : 2 jours', () => {
    const s = [
      serie('add-1', 1, 10, 1, 2, '2026-11-09T08:00:00'),
      serie('add-1', 1, 10, 1, 2, '2026-11-09T18:00:00'),
      serie('add-1', 1, 10, 1, 2, '2026-11-10T08:00:00'),
    ]
    expect(joursEntrainement(s)).toBe(2)
  })
})

describe('calculsARevoir', () => {
  it('trie, filtre et calcule tempsMoyen', () => {
    const faits: Record<string, Fait> = {
      'add:3·4': fait(4, 1, 8000),
      'add:5·6': fait(4, 2, 4000),
      'add:7·8': fait(3, 2, 9000),
      'add:1·2': fait(2, 2, 1000),
      'mul:2·3': fait(5, 5, 5000),
    }
    const r = calculsARevoir(faits, 'add')
    expect(r.map((x) => x.cle)).toEqual(['add:7·8', 'add:5·6', 'add:3·4'])
    expect(r[0]!.tempsMoyen).toBe(3000)
    expect(r[0]!.libelle).toBe('7 + 8')
    expect(calculsARevoir(faits, 'add', 2)).toHaveLength(2)
  })
  it('libellé des soustractions et multiplications', () => {
    const r = calculsARevoir({ 'sub:12·5': fait(3, 1, 3000), 'mul:3·4': fait(3, 1, 3000) }, 'sub')
    expect(r[0]!.libelle).toBe('12 − 5')
    expect(calculsARevoir({ 'mul:3·4': fait(3, 1, 3000) }, 'mul')[0]!.libelle).toBe('3 × 4')
  })
})

describe('niveauxARetravailler', () => {
  it('ne retient que les 10 dernières séries', () => {
    const s = [
      serie('add-1', 3, 0, 9000, 5000),
      serie('add-1', 3, 0, 9000, 5000),
      ...Array.from({ length: 5 }, () => serie('add-1', 1, 10, 2000, 5000)),
      ...Array.from({ length: 5 }, () => serie('add-1', 2, 8, 4000, 5000)),
    ]
    const r = niveauxARetravailler(s, 'add-1')
    expect(r).toHaveLength(2)
    expect(r[0]!.niveau).toBe(2)
    expect(r[0]!.tauxErreur).toBeCloseTo(0.2)
    expect(r[0]!.tempsMedian).toBe(4000)
    expect(r[0]!.nbSeries).toBe(5)
    expect(r[1]!.tauxErreur).toBe(0)
  })
})

describe('etatFait', () => {
  it('trois états', () => {
    const bon = { juste: true, temps: 1000 }
    const f: Record<string, Fait> = {
      m: fait(3, 0, 3000, [bon, bon, bon]),
      c: fait(2, 1, 3000, [bon, { juste: false, temps: 1000 }]),
      z: fait(0, 0, 0),
    }
    expect(etatFait(f, 'absent')).toBe('jamais_vu')
    expect(etatFait(f, 'z')).toBe('jamais_vu')
    expect(etatFait(f, 'c')).toBe('en_cours')
    expect(etatFait(f, 'm')).toBe('maitrise')
  })
})

describe('record (temps total)', () => {
  it('aucune série : null', () => {
    expect(record([], 'add-1', 1)).toBeNull()
  })

  it('ignore les séries non réussies, même rapides', () => {
    expect(record([serie('add-1', 1, 8, 1000, 5000)], 'add-1', 1)).toBeNull()
  })

  it('ignore les séries réussies mais non validées (trop lentes)', () => {
    expect(record([serie('add-1', 1, 10, 6000, 5000)], 'add-1', 1)).toBeNull()
    const series = [serie('add-1', 1, 10, 1000, 500), serie('add-1', 1, 10, 4000, 5000)]
    expect(record(series, 'add-1', 1)).toBe(40000)
  })

  it('plus petit tempsTotal parmi les validées (pas la médiane)', () => {
    const series = [
      serie('add-1', 1, 10, 4000, 5000, undefined, 38200),
      serie('add-1', 1, 9, 3000, 5000, undefined, 41000),
      serie('add-1', 1, 7, 900, 5000, undefined, 5000),
    ]
    expect(record(series, 'add-1', 1)).toBe(38200)
  })

  it('ignore les séries validées sans tempsTotal', () => {
    const series = [serie('add-1', 1, 10, 1000, 5000, undefined, null), serie('add-1', 1, 10, 4000, 5000, undefined, 45000)]
    expect(record(series, 'add-1', 1)).toBe(45000)
    expect(record([series[0]!], 'add-1', 1)).toBeNull()
  })

  it('filtre par parcours et par niveau', () => {
    const series = [serie('add-1', 2, 10, 1000, 5000), serie('sub-1', 1, 10, 1000, 5000), serie('add-1', 1, 10, 4500, 5000)]
    expect(record(series, 'add-1', 1)).toBe(45000)
    expect(record(series, 'mul-1', 1)).toBeNull()
  })
})
