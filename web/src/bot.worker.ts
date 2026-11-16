// Les bots tournent dans un Web Worker : l'interface ne se fige jamais pendant qu'ils réfléchissent.
// Le worker ne reçoit qu'une OBSERVATION (état masqué) : il ne peut pas tricher.
import { creerMoteur } from '../../moteur/src/moteur';
import type { Etat, Coup } from '../../moteur/src/types';
import { CONTENU, PARAMETRES } from '../../contenu';
import { creerBot, creerPondere, creerAleatoire, type Bot } from '../../bots/src/bots';
import { STRATEGIES } from '../../bots/src/bots';

const m = creerMoteur(CONTENU, PARAMETRES);
const cache = new Map<string, Bot>();
const MOYENS = ['glouton', 'chasseur', 'bloqueur', 'parieur'];

/** Trois niveaux issus des stratégies du simulateur. */
function botPour(niveau: number, siege: number): Bot {
  const cle = niveau + ':' + siege;
  let b = cache.get(cle);
  if (!b) {
    if (niveau === 0) {
      // Facile : un glouton distrait (évaluations très bruitées), qui joue au hasard une fois sur quatre.
      const g = creerPondere(m, 'facile', { ...STRATEGIES.glouton, bruit: 2.5 });
      const h = creerAleatoire();
      b = { nom: 'facile', choisir: (o, c, moi, r) => ((r.rng = (r.rng + 0x9e3779b9) | 0) >>> 0) % 4 === 0 && o.phase !== 'visions' ? h.choisir(o, c, moi, r) : g.choisir(o, c, moi, r) };
    } else if (niveau === 1) b = creerBot(m, MOYENS[siege % MOYENS.length]);
    else b = creerBot(m, 'expert', { iterations: 260, candidats: 7 });
    cache.set(cle, b);
  }
  return b;
}

self.onmessage = (ev: MessageEvent<{ id: number; obs: Etat; coups: Coup[]; moi: number; niveau: number; graine: number }>) => {
  const { id, obs, coups, moi, niveau, graine } = ev.data;
  const coup = botPour(niveau, moi).choisir(obs, coups, moi, { rng: graine });
  (self as unknown as Worker).postMessage({ id, coup });
};
