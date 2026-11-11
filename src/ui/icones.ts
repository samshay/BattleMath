import { h } from './dom'
import continuer from '../assets/icones/continuer.svg?raw'
import correct from '../assets/icones/correct.svg?raw'
import effacer from '../assets/icones/effacer.svg?raw'
import erreur from '../assets/icones/erreur.svg?raw'
import etincelle from '../assets/icones/etincelle.svg?raw'
import etoileVide from '../assets/icones/etoile-vide.svg?raw'
import etoile from '../assets/icones/etoile.svg?raw'
import joueur from '../assets/icones/joueur.svg?raw'
import opAdd from '../assets/icones/op-add.svg?raw'
import opSub from '../assets/icones/op-sub.svg?raw'
import opMul from '../assets/icones/op-mul.svg?raw'
import opMix from '../assets/icones/op-mix.svg?raw'
import parents from '../assets/icones/parents.svg?raw'
import record from '../assets/icones/record.svg?raw'
import retour from '../assets/icones/retour.svg?raw'
import verrou from '../assets/icones/verrou.svg?raw'
import vaisseau from '../assets/personnages/vaisseau.svg?raw'
import pilote from '../assets/personnages/pilote.svg?raw'
import alienAdd from '../assets/personnages/alien-add.svg?raw'
import alienSub from '../assets/personnages/alien-sub.svg?raw'
import alienMul from '../assets/personnages/alien-mul.svg?raw'
import bossMix from '../assets/personnages/boss-mix.svg?raw'
import eclat from '../assets/effets/eclat.svg?raw'
import planete from '../assets/effets/planete.svg?raw'

export type NomIcone =
  | 'continuer' | 'correct' | 'effacer' | 'erreur' | 'etincelle' | 'etoile-vide' | 'etoile' | 'joueur'
  | 'op-add' | 'op-sub' | 'op-mul' | 'op-mix' | 'parents' | 'record' | 'retour' | 'verrou'
export type NomIllustration =
  | 'vaisseau' | 'pilote' | 'alien-add' | 'alien-sub' | 'alien-mul' | 'boss-mix' | 'eclat' | 'planete'

const ICONES: Record<NomIcone, string> = {
  continuer, correct, effacer, erreur, etincelle,
  'etoile-vide': etoileVide, etoile, joueur,
  'op-add': opAdd, 'op-sub': opSub, 'op-mul': opMul, 'op-mix': opMix,
  parents, record, retour, verrou,
}

const ILLUSTRATIONS: Record<NomIllustration, string> = {
  vaisseau, pilote,
  'alien-add': alienAdd, 'alien-sub': alienSub, 'alien-mul': alienMul, 'boss-mix': bossMix,
  eclat, planete,
}

function enveloppe(classe: string, svg: string, taille: number): HTMLElement {
  const el = h('span', { class: classe, 'aria-hidden': 'true' })
  el.innerHTML = svg.trim()
  const s = el.querySelector('svg')
  if (s) {
    s.setAttribute('width', String(taille))
    s.setAttribute('height', String(taille))
  }
  return el
}

/** <span class="icone icone-<nom>" aria-hidden="true"> contenant le SVG (currentColor), width/height = taille. */
export function icone(nom: NomIcone, taille = 24): HTMLElement {
  return enveloppe(`icone icone-${nom}`, ICONES[nom], taille)
}

/** <span class="illustration illustration-<nom>" aria-hidden="true"> contenant le SVG à couleurs fixes. */
export function illustration(nom: NomIllustration, taille: number): HTMLElement {
  return enveloppe(`illustration illustration-${nom}`, ILLUSTRATIONS[nom], taille)
}
