// Joue une partie complète entre bots et en extrait les mesures utiles à l'équilibrage.
import type { Etat, Coup, Evenement, Score } from '../../moteur/src/types';
import { alea, ID_SIGNAL } from '../../moteur/src/moteur';
import type { Moteur } from '../../moteur/src/moteur';
import type { Bot } from '../../bots/src/bots';

export interface ResultatPartie {
  nb: number;
  graine: number;
  bots: string[];
  scores: Score[];
  gagnants: number[];
  nbCoups: number;
  decisions: number[];
  /** scores totaux intermédiaires après chaque bilan */
  intermediaires: number[][];
  type: number;
  /** cartes associées à chaque joueur : tendances installées, signaux pariés, ruptures préparées, vision */
  cartes: string[][];
  compteCoups: Record<string, number>;
  evenements: Record<string, number>;
  axes: number[];
  /** mesures du critère 8 (remplies seulement par les experts) */
  c8: { decisions: number; proches: number; auMoins2: number; prochesMarge: number; auMoins2Marge: number; legaux: number };
  coups?: Coup[];
  journal?: Evenement[];
  etatFinal?: Etat;
}

export function graineDe(base: number, i: number): number {
  let x = (base ^ Math.imul(i + 1, 0x9e3779b1)) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) | 0;
}

export function jouerPartie(m: Moteur, bots: Bot[], graine: number, opts: { garder?: boolean } = {}): ResultatPartie {
  const C = m.contenu;
  const nb = bots.length;
  let e = m.creerPartie({ nbJoueurs: nb, graine });
  const r = { rng: graine ^ 0x5bd1e995 };
  const cartes: string[][] = bots.map(() => []);
  const compteCoups: Record<string, number> = {};
  const evenements: Record<string, number> = {};
  const intermediaires: number[][] = [];
  const decisions = bots.map(() => 0);
  const c8 = { decisions: 0, proches: 0, auMoins2: 0, prochesMarge: 0, auMoins2Marge: 0, legaux: 0 };
  const coups: Coup[] = [];
  const journalComplet: Evenement[] = [];
  let garde = 0;
  while (e.phase !== 'fin') {
    if (++garde > 2000) throw new Error('Partie sans fin');
    const jc = e.courant;
    const legaux = m.coupsLegaux(e);
    const bot = bots[jc];
    const c = bot.choisir(m.observer(e, jc), legaux, jc, r);
    decisions[jc]++;
    compteCoups[c.t] = (compteCoups[c.t] ?? 0) + 1;
    const an = bot.derniereAnalyse;
    if (an && an.candidats.length >= 1 && legaux.length >= 2) {
      let bv = -Infinity, bm = -Infinity;
      for (const x of an.candidats) { if (x.valeur > bv) bv = x.valeur; if (x.marge > bm) bm = x.marge; }
      let p = 0, pm = 0;
      for (const x of an.candidats) {
        if (x.n < 6) continue;
        if (x.valeur >= 0.9 * bv) p++;
        if (x.marge >= bm - 0.1 * Math.max(1, Math.abs(bv))) pm++;
      }
      c8.decisions++; c8.proches += p; c8.prochesMarge += pm; c8.legaux += legaux.length;
      if (p >= 2) c8.auMoins2++;
      if (pm >= 2) c8.auMoins2Marge++;
    }
    if (c.t === 'parier') { const s = e.horizon.find((x) => x.uid === c.uid)!; cartes[jc].push(C.signaux[s.carte].id); }
    const journal: Evenement[] = [];
    const avant = e.decennie;
    e = m.jouer(e, c, journal);
    if (opts.garder) { coups.push(c); journalComplet.push(...journal); }
    for (const ev of journal) {
      if (ev.t === 'installer') cartes[ev.j].push(C.tendances[ev.carte].id);
      else if (ev.t === 'preparer') cartes[ev.j].push(C.ruptures[ev.carte].id);
      else if (ev.t === 'rupture' || ev.t === 'signalAmplifie' || ev.t === 'signalEteint' || ev.t === 'bascule' || ev.t === 'ruptureDissipee') evenements[ev.t] = (evenements[ev.t] ?? 0) + 1;
      else if (ev.t === 'purge') evenements.purgees = (evenements.purgees ?? 0) + ev.ids.length;
    }
    if (e.decennie !== avant || e.phase === 'fin') {
      if (intermediaires.length < m.params.decennies) intermediaires.push(m.scores(e).map((s) => s.total));
    }
  }
  const err = m.verifier(e);
  if (err.length) throw new Error('État final illégal : ' + err.join(', '));
  for (let j = 0; j < nb; j++) cartes[j].push(C.visions[e.joueurs[j].vision].id);
  evenements.verrouillees = e.tendances.filter((t) => t.age >= m.params.ageVerrou).length;
  evenements.tendancesFinales = e.tendances.length;
  evenements.neesDeSignaux = e.tendances.filter((t) => t.id >= ID_SIGNAL).length;
  const res: ResultatPartie = {
    nb, graine, bots: bots.map((b) => b.nom), scores: m.scores(e), gagnants: m.gagnants(e), nbCoups: e.nbCoups, decisions,
    intermediaires, type: m.typeSociete(e.axes), cartes, compteCoups, evenements, axes: e.axes.slice(), c8,
  };
  if (opts.garder) { res.coups = coups; res.journal = journalComplet; res.etatFinal = e; }
  return res;
}

export function tirerTable(pool: string[], nb: number, r: { rng: number }): string[] {
  const p = pool.slice();
  const out: string[] = [];
  for (let i = 0; i < nb; i++) {
    if (p.length === 0) p.push(...pool);
    const k = Math.floor(alea(r) * p.length);
    out.push(p[k]); p.splice(k, 1);
  }
  return out;
}
