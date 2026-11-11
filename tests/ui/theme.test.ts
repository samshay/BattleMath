import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const lire = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

describe('thème spatial', () => {
  it('thème unique : plus de prefers-color-scheme', () => {
    expect(lire('src/style.css')).not.toContain('prefers-color-scheme')
    expect(lire('index.html')).not.toContain('prefers-color-scheme')
  })
  it('index.html : une seule theme-color, #0B1026', () => {
    const html = lire('index.html')
    expect(html.match(/name="theme-color"/g)).toHaveLength(1)
    expect(html).toContain('content="#0B1026"')
  })
  it('manifeste : fond et theme_color #0B1026', () => {
    const cfg = lire('vite.config.ts')
    expect(cfg).toContain("background_color: '#0B1026'")
    expect(cfg).toContain("theme_color: '#0B1026'")
  })
  it('aucune couleur en dur hors :root', () => {
    const css = lire('src/style.css')
    const horsRoot = css.replace(/:root\s*\{[^}]*\}/, '')
    expect(horsRoot).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(horsRoot).not.toMatch(/rgba?\(/)
  })
  it('état enfoncé : les boutons réagissent sous le doigt', () => {
    const css = lire('src/style.css')
    expect(css).toMatch(/button:active:not\(:disabled\)\s*\{[^}]*transform: scale\(/)
    expect(css).toMatch(/\.pave\.juste \.touche-valider\s*\{/)
  })
  it('grilles à deux colonnes : minmax(0, 1fr), jamais 1fr seul (le contenu ne doit pas élargir la grille)', () => {
    const css = lire('src/style.css')
    expect(css).toMatch(/\.choix \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css).toMatch(/\.choix\.tailles \{[^}]*grid-auto-columns: minmax\(0, 1fr\)/)
    expect(css).toMatch(/\.op \{[^}]*min-width: 0/)
    expect(css).not.toMatch(/repeat\(\d, 1fr\)/)
  })
  it('écrans enfant sans défilement : hauteurs fluides en dvh, plancher 56 px', () => {
    const css = lire('src/style.css')
    for (const sel of ['.jeu', '.touche', '.reponse', '.calcul', '.profils.grand .profil', '.principal, .secondaire']) {
      const regle = css.match(new RegExp(sel.replace(/[.,]/g, (c) => `\\${c}`) + ' \\{[^}]*\\}'))![0]
      expect(regle, sel).toContain('dvh')
    }
    for (const [, px] of css.matchAll(/min-height: clamp\((\d+)px/g)) expect(Number(px)).toBeGreaterThanOrEqual(56)
  })
  it('plus aucun glyphe ★ ✨ ⌫ dans src/ui', () => {
    for (const f of readdirSync(new URL('../../src/ui', import.meta.url))) {
      expect(lire(`src/ui/${f}`), f).not.toMatch(/[★✨⌫]/)
    }
  })
  it('polices auto-hébergées importées dans main.ts', () => {
    const main = lire('src/main.ts')
    for (const f of ['@fontsource/fredoka/latin-600.css', '@fontsource/fredoka/latin-700.css', '@fontsource/nunito/latin-700.css', '@fontsource/nunito/latin-800.css']) {
      expect(main).toContain(`import '${f}'`)
    }
    expect(lire('src/style.css')).not.toContain('fonts.googleapis')
  })
})
