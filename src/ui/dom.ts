type Attrs = Record<string, string | ((e: Event) => void)>

/** Création d'élément minimale : class, id, type, href, disabled, data-*, onXxx. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...enfants: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [cle, valeur] of Object.entries(attrs)) {
    if (typeof valeur === 'function') {
      if (cle.startsWith('on')) el.addEventListener(cle.slice(2), valeur)
    } else if (cle === 'class') el.className = valeur
    else if (cle === 'disabled') (el as unknown as HTMLButtonElement).disabled = valeur === 'true'
    else if (cle.startsWith('data-')) el.dataset[cle.slice(5).replace(/-(\w)/g, (_, c: string) => c.toUpperCase())] = valeur
    else el.setAttribute(cle, valeur)
  }
  for (const e of enfants) el.append(typeof e === 'string' ? document.createTextNode(e) : e)
  return el
}
