// Les joueurs automatiques. Chaque bot reçoit une OBSERVATION (état masqué) et la liste des coups légaux.
import type { Etat, Coup } from '../../moteur/src/types';
import { cloner, alea } from '../../moteur/src/moteur';
import type { Moteur } from '../../moteur/src/moteur';
import { evaluer, bonusCoup, POIDS_DEFAUT, type Poids } from './evaluation';
import { choisirExpert, type ReglagesExpert, EXPERT_DEFAUT, type AnalyseExpert } from './expert';

export interface Alea { rng: number }
export interface Bot {
  nom: string;
  choisir(obs: Etat, coups: Coup[], moi: number, r: Alea): Coup;
  /** uniquement pour l'expert : valeurs estimées des coups de la dernière décision */
  derniereAnalyse?: AnalyseExpert | null;
}

function choisirVision(m: Moteur, obs: Etat, coups: Coup[], moi: number, w: Poids, r: Alea): Coup {
  let best = coups[0], bv = -Infinity;
  for (const c of coups) {
    if (c.t !== 'vision') continue;
    const v = m.contenu.visions[c.carte];
    let s = alea(r) * 0.5;
    for (const k of obs.joueurs[moi].main) {
      if (k < 0) continue;
      const t = m.contenu.tendances[k];
      if (t.axe === v.principal.axe) s += t.pole === v.principal.pole ? 1 : -0.3;
      if (t.axe === v.secondaire.axe) s += t.pole === v.secondaire.pole ? 0.6 : -0.2;
    }
    if (w.axe >= 0) { if (v.principal.axe === w.axe) s += 3; else if (v.secondaire.axe === w.axe) s += 1.5; }
    if (s > bv) { bv = s; best = c; }
  }
  return best;
}

/** Valeur à un coup de chaque coup légal, selon l'évaluation pondérée. */
export function valeursGloutonnes(m: Moteur, obs: Etat, coups: Coup[], moi: number, w: Poids, r?: Alea): number[] {
  const out: number[] = [];
  for (const c of coups) {
    const s = cloner(obs);
    m.effet(s, c);
    let v = evaluer(m, s, moi, w) + bonusCoup(m, obs, moi, c, w);
    if (r && w.bruit > 0) v += (alea(r) - 0.5) * 2 * w.bruit;
    out.push(v);
  }
  return out;
}

export function creerAleatoire(): Bot {
  return { nom: 'aleatoire', choisir: (_o, coups, _m, r) => coups[Math.floor(alea(r) * coups.length)] };
}

/** Bot à un coup d'anticipation : maximise l'évaluation pondérée après son coup. Toutes les stratégies simples en dérivent. */
export function creerPondere(m: Moteur, nom: string, poids: Partial<Poids> = {}): Bot {
  const w: Poids = { ...POIDS_DEFAUT, ...poids };
  return {
    nom,
    choisir(obs, coups, moi, r) {
      if (coups.length === 1) return coups[0];
      if (obs.phase === 'visions') return choisirVision(m, obs, coups, moi, w, r);
      const vals = valeursGloutonnes(m, obs, coups, moi, w, r);
      let bi = 0;
      for (let i = 1; i < vals.length; i++) if (vals[i] > vals[bi]) bi = i;
      return coups[bi];
    },
  };
}

export function creerExpert(m: Moteur, reglages: Partial<ReglagesExpert> = {}, nom = 'expert'): Bot {
  const g: ReglagesExpert = { ...EXPERT_DEFAUT, ...reglages };
  const bot: Bot = {
    nom,
    derniereAnalyse: null,
    choisir(obs, coups, moi, r) {
      bot.derniereAnalyse = null;
      if (coups.length === 1) return coups[0];
      if (obs.phase === 'visions') return choisirVision(m, obs, coups, moi, POIDS_DEFAUT, r);
      const a = choisirExpert(m, obs, coups, moi, r, g);
      bot.derniereAnalyse = a;
      return a.coup;
    },
  };
  return bot;
}

export const NOMS_AXES = ['matiere', 'technique', 'echelle', 'lien'];

/** Catalogue des stratégies. Chaque entrée est paramétrable par ses poids. */
export const STRATEGIES: Record<string, Partial<Poids>> = {
  glouton: {},
  'specialiste-matiere': { axe: 0, focus: 2.5 },
  'specialiste-technique': { axe: 1, focus: 2.5 },
  'specialiste-echelle': { axe: 2, focus: 2.5 },
  'specialiste-lien': { axe: 3, focus: 2.5 },
  chasseur: { veille: 2.2, signal: 1.5, attention: 0.05 },
  parieur: { rupture: 2.2, veille: 0.5 },
  bloqueur: { blocage: 0.6 },
};
export const NON_EXPERTS = ['aleatoire', ...Object.keys(STRATEGIES)];

export function creerBot(m: Moteur, nom: string, surcharge?: Partial<Poids> | Partial<ReglagesExpert>): Bot {
  if (nom === 'aleatoire') return creerAleatoire();
  if (nom === 'expert') return creerExpert(m, surcharge as Partial<ReglagesExpert>);
  if (nom in STRATEGIES) return creerPondere(m, nom, { ...STRATEGIES[nom], ...(surcharge as Partial<Poids>) });
  if (nom.startsWith('variante')) return creerPondere(m, nom, surcharge as Partial<Poids>);
  throw new Error('Bot inconnu : ' + nom);
}
