export interface Rng {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
}

// mulberry32
export function createRng(seed: number): Rng {
  let etat = seed >>> 0
  const next = (): number => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick: tableau vide')
    return items[int(0, items.length - 1)] as T
  }
  const shuffle = <T>(items: readonly T[]): T[] => {
    const copie = [...items]
    for (let i = copie.length - 1; i > 0; i--) {
      const j = int(0, i)
      const tmp = copie[i] as T
      copie[i] = copie[j] as T
      copie[j] = tmp
    }
    return copie
  }
  return { next, int, pick, shuffle }
}
