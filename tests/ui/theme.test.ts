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
