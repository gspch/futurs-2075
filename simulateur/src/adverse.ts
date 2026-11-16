// Test adverse : recherche évolutionnaire d'une stratégie dominante dans l'espace des poids des bots.
// Chaque variante est évaluée face au vivier des stratégies de référence, à 2, 3, 4 et 5 joueurs.
import { alea } from '../../moteur/src/moteur';
import type { Parametres } from '../../moteur/src/types';
import { POIDS_DEFAUT, type Poids } from '../../bots/src/evaluation';
import { NON_EXPERTS, STRATEGIES } from '../../bots/src/bots';
import type { Bassin } from './parallele';
import { wilson } from './stats';

export interface Variante { id: number; origine: string; poids: Partial<Poids>; ratio: number; bas: number; haut: number; parties: number; parNb: number[] }

const BORNES: Record<string, [number, number]> = {
  vision: [0.3, 2], heritage: [0, 3], anticipation: [0.3, 2], signal: [0, 5], rupture: [0, 6], veille: [0, 5],
  main: [0, 1.2], attention: [0, 1], amorti: [0.3, 1], blocage: [0, 1.2], focus: [0, 3],
};

function aleatoire(r: { rng: number }): Partial<Poids> {
  const p: Record<string, number> = {};
  for (const k in BORNES) p[k] = BORNES[k][0] + alea(r) * (BORNES[k][1] - BORNES[k][0]);
  p.axe = alea(r) < 0.5 ? -1 : Math.floor(alea(r) * 4);
  if (p.axe < 0) p.focus = 0;
  if (alea(r) < 0.6) p.blocage = 0;
  return p as Partial<Poids>;
}
function muter(base: Partial<Poids>, r: { rng: number }, force: number): Partial<Poids> {
  const p = { ...POIDS_DEFAUT, ...base } as unknown as Record<string, number>;
  for (const k in BORNES) {
    if (alea(r) < 0.45) {
      const [a, b] = BORNES[k];
      p[k] = Math.max(a, Math.min(b, p[k] + (alea(r) + alea(r) - 1) * force * (b - a)));
    }
  }
  if (alea(r) < 0.1) p.axe = alea(r) < 0.5 ? -1 : Math.floor(alea(r) * 4);
  if (p.axe < 0) p.focus = 0;
  return p as unknown as Partial<Poids>;
}
function croiser(a: Partial<Poids>, b: Partial<Poids>, r: { rng: number }): Partial<Poids> {
  const x = { ...POIDS_DEFAUT, ...a } as unknown as Record<string, number>;
  const y = { ...POIDS_DEFAUT, ...b } as unknown as Record<string, number>;
  const p: Record<string, number> = {};
  for (const k in x) p[k] = alea(r) < 0.5 ? x[k] : y[k];
  if (p.axe < 0) p.focus = 0;
  return p as unknown as Partial<Poids>;
}

export async function evaluerVariante(bassin: Bassin, poids: Partial<Poids>, parties: number, graine: number, params?: Partial<Parametres>, vivier: string[] = NON_EXPERTS): Promise<{ ratio: number; bas: number; haut: number; parties: number; parNb: number[] }> {
  const res = await Promise.all([2, 3, 4, 5].map((nb) => bassin.lot({ type: 'variante', nb, parties, graine, vivier, variante: poids, params }, Math.ceil(parties / 2))));
  let v = 0, att = 0, n = 0;
  const parNb: number[] = [];
  res.forEach((a, i) => {
    const nb = i + 2;
    const w = a['strat.variante.victoires'] ?? 0, p = a['strat.variante.parties'] ?? 0;
    v += w; att += p / nb; n += p; parNb.push(w / (p / nb));
  });
  // intervalle de confiance : approximation binomiale sur le taux de victoire agrégé, ramené en ratio
  const w = wilson(v, n);
  const k = n / att;
  return { ratio: v / att, bas: w.bas * k, haut: w.haut * k, parties: n, parNb };
}

export interface ReglagesAdverse { generations: number; population: number; elites: number; parties: number; partiesFinales: number; graine: number; params?: Partial<Parametres>; vivier?: string[]; log?: (s: string) => void }

export async function rechercheAdverse(bassin: Bassin, g: ReglagesAdverse): Promise<{ toutes: Variante[]; finalistes: Variante[] }> {
  const r = { rng: g.graine | 0 };
  const toutes: Variante[] = [];
  let seq = 0;
  const evalLot = async (cands: { origine: string; poids: Partial<Poids> }[], gen: number) => {
    const out: Variante[] = [];
    // évaluations séquentielles par petits groupes pour ne pas saturer la file
    for (let i = 0; i < cands.length; i += 4) {
      const lot = cands.slice(i, i + 4);
      const res = await Promise.all(lot.map((c) => evaluerVariante(bassin, c.poids, g.parties, g.graine + 31 * gen, g.params, g.vivier)));
      lot.forEach((c, k) => out.push({ id: ++seq, origine: c.origine, poids: c.poids, ...res[k] }));
    }
    toutes.push(...out);
    return out;
  };
  // Génération 0 : les archétypes connus + des variantes aléatoires.
  const init: { origine: string; poids: Partial<Poids> }[] = Object.entries(STRATEGIES).map(([nom, p]) => ({ origine: nom, poids: { ...POIDS_DEFAUT, ...p } }));
  while (init.length < g.population) init.push({ origine: 'aléatoire', poids: aleatoire(r) });
  let pop = await evalLot(init, 0);
  for (let gen = 1; gen <= g.generations; gen++) {
    pop.sort((a, b) => b.ratio - a.ratio);
    const elites = pop.slice(0, g.elites);
    g.log?.(`génération ${gen - 1} : meilleur ratio ${elites[0].ratio.toFixed(3)} (${elites[0].origine}), médiane ${pop[Math.floor(pop.length / 2)].ratio.toFixed(3)}, ${toutes.length} variantes évaluées`);
    const enfants: { origine: string; poids: Partial<Poids> }[] = [];
    while (enfants.length < g.population - g.elites) {
      const a = elites[Math.floor(alea(r) * elites.length)];
      const u = alea(r);
      if (u < 0.6) enfants.push({ origine: `mutation de #${a.id}`, poids: muter(a.poids, r, 0.25) });
      else if (u < 0.9) { const b = elites[Math.floor(alea(r) * elites.length)]; enfants.push({ origine: `croisement #${a.id}×#${b.id}`, poids: muter(croiser(a.poids, b.poids, r), r, 0.1) }); }
      else enfants.push({ origine: 'aléatoire', poids: aleatoire(r) });
    }
    // les élites sont réévaluées sur de nouvelles parties (évite de sélectionner la chance)
    const reeval = await evalLot(elites.map((e) => ({ origine: e.origine, poids: e.poids })), gen);
    toutes.splice(toutes.length - reeval.length, reeval.length); // ne pas compter deux fois les élites
    reeval.forEach((v, i) => { v.id = elites[i].id; v.ratio = (v.ratio + elites[i].ratio) / 2; });
    pop = [...reeval, ...(await evalLot(enfants, gen))];
  }
  pop.sort((a, b) => b.ratio - a.ratio);
  g.log?.(`génération ${g.generations} : meilleur ratio ${pop[0].ratio.toFixed(3)}, ${toutes.length} variantes évaluées`);
  // Finale : les meilleures variantes rejouées sur un grand nombre de parties indépendantes.
  const finalistes: Variante[] = [];
  for (const v of pop.slice(0, 5)) {
    const res = await evaluerVariante(bassin, v.poids, g.partiesFinales, g.graine + 99991, g.params, g.vivier);
    finalistes.push({ ...v, ...res });
  }
  finalistes.sort((a, b) => b.ratio - a.ratio);
  return { toutes, finalistes };
}
