import { creerMoteur, alea } from '../src/moteur';
import type { Etat, Coup, Parametres, Evenement } from '../src/types';
import { CONTENU, PARAMETRES } from '../../contenu';

export const moteur = creerMoteur(CONTENU, PARAMETRES);
export function moteurAvec(p: Partial<Parametres>) { return creerMoteur(CONTENU, { ...PARAMETRES, ...p } as Parametres); }

/** Joue une partie entière au hasard (coups légaux tirés avec une graine) et renvoie l'état final et les coups. */
export function partieAleatoire(nb: number, graine: number, m = moteur, journal?: Evenement[]): { etat: Etat; coups: Coup[] } {
  let e = m.creerPartie({ nbJoueurs: nb, graine });
  const r = { rng: graine ^ 0x9e3779b9 };
  const coups: Coup[] = [];
  while (e.phase !== 'fin') {
    const l = m.coupsLegaux(e);
    const c = l[Math.floor(alea(r) * l.length)];
    coups.push(c);
    e = m.jouer(e, c, journal);
    const err = m.verifier(e);
    if (err.length) throw new Error(`État illégal (graine ${graine}, coup ${coups.length}) : ${err.join(', ')}`);
  }
  return { etat: e, coups };
}

/** Passe la phase des visions en choisissant la première proposée. */
export function apresVisions(nb: number, graine: number, m = moteur): Etat {
  let e = m.creerPartie({ nbJoueurs: nb, graine });
  while (e.phase === 'visions') e = m.jouer(e, m.coupsLegaux(e)[0]);
  return e;
}
