// Expert : recherche Monte-Carlo sur mondes déterminisés (il ne connaît pas les cartes cachées).
// À chaque décision : on tire des mondes compatibles avec ce que le joueur a vu, on y joue chaque coup candidat,
// on déroule la suite avec une politique rapide jusqu'après le prochain bilan, puis on évalue la marge attendue.
// L'allocation des tirages entre candidats suit UCB1 (bandit à la racine).
import type { Etat, Coup } from '../../moteur/src/types';
import { cloner, alea, melanger, ID_SIGNAL } from '../../moteur/src/moteur';
import type { Moteur } from '../../moteur/src/moteur';
import { evaluer, bonusCoup, margeAttendue, POIDS_DEFAUT, probaPari, type Poids } from './evaluation';

export interface ReglagesExpert {
  /** nombre de déroulements par décision */
  iterations: number;
  /** nombre maximal de coups candidats explorés (les meilleurs selon l'évaluation à un coup) */
  candidats: number;
  /** nombre de bilans traversés avant d'évaluer (1 = jusqu'à la fin de la décennie en cours) */
  bilans: number;
  /** constante d'exploration UCB */
  exploration: number;
  /** poids de l'a priori glouton dans la valeur finale */
  apriori: number;
}
export const EXPERT_DEFAUT: ReglagesExpert = { iterations: 160, candidats: 6, bilans: 1, exploration: 1.2, apriori: 0.15 };

export interface AnalyseExpert {
  coup: Coup;
  /** coups candidats et leur valeur (score final attendu du joueur, en points) */
  candidats: { coup: Coup; valeur: number; marge: number; n: number }[];
  nbLegaux: number;
}

/** Construit un état complet plausible à partir d'une observation. */
export function determiniser(m: Moteur, obs: Etat, moi: number, r: { rng: number }): Etat {
  const C = m.contenu;
  const e = cloner(obs);
  e.rng = Math.floor(alea(r) * 4294967296) | 0;
  // Tendances inconnues : ni en jeu, ni défaussées, ni dans ma main, ni d'une voie fermée.
  const vues = new Uint8Array(C.tendances.length);
  for (const t of e.tendances) if (t.id < ID_SIGNAL) vues[t.id] = 1;
  for (const c of e.defausseT) if (c >= 0) vues[c] = 1;
  for (const j of e.joueurs) for (const c of j.main) if (c >= 0) vues[c] = 1;
  for (const c of e.piocheT) if (c >= 0) vues[c] = 1;
  const pool: number[] = [];
  for (let c = 0; c < C.tendances.length; c++) if (!vues[c] && !e.fermees[C.tendances[c].axe * 2 + C.tendances[c].pole]) pool.push(c);
  melanger(r, pool);
  for (const j of e.joueurs) for (let i = 0; i < j.main.length; i++) if (j.main[i] < 0) j.main[i] = pool.length ? (pool.pop() as number) : j.main[i];
  for (const j of e.joueurs) j.main = j.main.filter((c) => c >= 0);
  for (let i = 0; i < e.piocheT.length; i++) if (e.piocheT[i] < 0 && pool.length) e.piocheT[i] = pool.pop() as number;
  e.piocheT = e.piocheT.filter((c) => c >= 0);
  // Signaux
  const sv = new Uint8Array(C.signaux.length);
  for (const c of e.signauxResolus) sv[c] = 1;
  for (const s of e.horizon) if (s.carte >= 0) sv[s.carte] = 1;
  const ps: number[] = [];
  for (let c = 0; c < C.signaux.length; c++) if (!sv[c]) ps.push(c);
  melanger(r, ps);
  for (const s of e.horizon) if (s.carte < 0) s.carte = ps.pop() as number;
  e.piocheS = e.piocheS.map(() => ps.pop() as number).filter((c) => c !== undefined);
  // Ruptures
  const rv = new Uint8Array(C.ruptures.length);
  for (const c of e.rupturesVues) rv[c] = 1;
  const pr: number[] = [];
  for (let c = 0; c < C.ruptures.length; c++) if (!rv[c]) pr.push(c);
  melanger(r, pr);
  e.piocheR = e.piocheR.map(() => pr.pop() as number).filter((c) => c !== undefined);
  // Visions adverses : tirées en proportion de leur cohérence avec les tendances que l'adversaire a installées.
  const prises = new Uint8Array(C.visions.length);
  for (const v of e.joueurs[moi].choixVisions) if (v >= 0) prises[v] = 1;
  for (let j = 0; j < e.nbJoueurs; j++) {
    if (j === moi) continue;
    const x = e.joueurs[j];
    const n = new Array(8).fill(0);
    for (const t of e.tendances) if (t.proprio === j) n[t.axe * 2 + t.pole] += t.force;
    const poids: number[] = [];
    let total = 0;
    for (let v = 0; v < C.visions.length; v++) {
      if (prises[v]) { poids.push(0); continue; }
      const vi = C.visions[v];
      const a = vi.principal.axe * 2 + vi.principal.pole, b = vi.secondaire.axe * 2 + vi.secondaire.pole;
      const p = Math.exp(0.7 * (n[a] - n[a ^ 1]) + 0.4 * (n[b] - n[b ^ 1]));
      poids.push(p); total += p;
    }
    const tirer = () => {
      let u = alea(r) * total, v = 0;
      for (; v < poids.length - 1; v++) { u -= poids[v]; if (u <= 0) break; }
      while (poids[v] === 0) v = (v + 1) % poids.length;
      total -= poids[v]; poids[v] = 0; prises[v] = 1;
      return v;
    };
    if (x.vision === -2) { x.vision = tirer(); x.choixVisions = [x.vision, x.vision]; }
    else if (x.vision === -1) x.choixVisions = [tirer(), tirer()];
    // On suppose qu'un adversaire connaît les signaux sur lesquels il a parié.
    x.connus = [];
    for (const s of e.horizon) if (s.paris.some((p) => p.j === j)) x.connus.push(s.uid);
  }
  return e;
}

/** Politique de déroulement : rapide, biaisée vers les coups « naturels » de chaque joueur. */
export function politiqueRapide(m: Moteur, e: Etat, coups: Coup[], r: { rng: number }): Coup {
  if (coups.length === 1) return coups[0];
  const C = m.contenu, P = m.params, centre = m.centre;
  const jc = e.courant;
  const j = e.joueurs[jc];
  const vis = j.vision >= 0 ? C.visions[j.vision] : null;
  const p1 = vis ? vis.principal.axe * 2 + vis.principal.pole : -1;
  const p2 = vis ? vis.secondaire.axe * 2 + vis.secondaire.pole : -1;
  let total = 0;
  const sc: number[] = [];
  let jouable = false;
  for (const c of coups) {
    let s = 0.05;
    switch (c.t) {
      case 'vision': s = 1; break;
      case 'installer': {
        const t = C.tendances[c.carte];
        const k = t.axe * 2 + t.pole;
        const d = (t.pole === 1 ? 1 : -1) * (e.axes[t.axe] - centre);
        s = k === p1 ? 2.4 : k === p2 ? 1.6 : (k ^ 1) === p1 || (k ^ 1) === p2 ? 0.03 : d > 0 ? 0.8 : d === 0 ? 0.35 : 0.1;
        s *= t.force;
        jouable = true;
        break;
      }
      case 'inflechir': {
        const t = e.tendances.find((x) => x.id === c.id)!;
        const k = t.axe * 2 + t.pole;
        s = (k ^ 1) === p1 ? 1.3 * t.force : (k ^ 1) === p2 ? 0.7 * t.force : 0.03;
        if (t.age > 0) s *= 0.6;
        break;
      }
      case 'veiller': {
        const connu = j.connus.includes(c.uid);
        s = j.attention > 0 ? (connu ? 0.08 : 0.45) : 0.03;
        break;
      }
      case 'parier': {
        const sh = e.horizon.find((x) => x.uid === c.uid)!;
        if (!j.connus.includes(c.uid)) { s = 0.02; break; }
        const cs = C.signaux[sh.carte];
        if (cs.condition === null) { s = 0.001; break; }
        const l = c.lecture === 1 ? cs.haut : cs.bas;
        const d = (c.lecture === 1 ? 1 : -1) * (e.axes[cs.condition] - centre);
        s = !l || e.fermees[l.axe * 2 + l.pole] ? 0.001 : d > 0 ? 2.5 + d : d === 0 ? 0.3 : 0.02;
        break;
      }
      case 'renoncer': s = 0.5; break;
      case 'preparer': {
        const t = m.tension(e, c.carte);
        s = t <= 0 ? 0.03 : 0.25 * t * P.ptsRupture / 4;
        break;
      }
      case 'prospecter': s = 0.3; break;
      case 'passer': s = 1; break;
    }
    sc.push(s); total += s;
  }
  if (!jouable) { for (let i = 0; i < coups.length; i++) if (coups[i].t === 'prospecter') { total += 0.9; sc[i] += 0.9; } }
  let u = alea(r) * total;
  for (let i = 0; i < coups.length; i++) { u -= sc[i]; if (u <= 0) return coups[i]; }
  return coups[coups.length - 1];
}

export function choisirExpert(m: Moteur, obs: Etat, coups: Coup[], moi: number, r: { rng: number }, g: ReglagesExpert, w: Poids = POIDS_DEFAUT): AnalyseExpert {
  // 1. Présélection par l'évaluation à un coup.
  const prior: number[] = [];
  for (const c of coups) {
    const s = cloner(obs);
    m.effet(s, c);
    prior.push(evaluer(m, s, moi, w) + bonusCoup(m, obs, moi, c, w));
  }
  const ordre = coups.map((_, i) => i).sort((a, b) => prior[b] - prior[a]).slice(0, g.candidats);
  const k = ordre.length;
  const n = new Array(k).fill(0), somme = new Array(k).fill(0), sommeMoi = new Array(k).fill(0);
  const P = m.params;
  const finDecennie = obs.decennie + g.bilans;
  for (let it = 0; it < g.iterations; it++) {
    // UCB1 : chaque candidat une fois, puis le plus prometteur.
    let a = it < k ? it : 0;
    if (it >= k) {
      let bu = -Infinity;
      for (let i = 0; i < k; i++) {
        const u = somme[i] / n[i] + g.exploration * Math.sqrt(Math.log(it) / n[i]);
        if (u > bu) { bu = u; a = i; }
      }
    }
    const e = determiniser(m, obs, moi, r);
    m.jouerEnPlace(e, coups[ordre[a]]);
    while (e.phase !== 'fin' && e.decennie < finDecennie) m.jouerEnPlace(e, politiqueRapide(m, e, m.coupsLegaux(e), r));
    let marge: number, moiPts: number;
    if (e.phase === 'fin') {
      const sc = m.scores(e);
      moiPts = sc[moi].total;
      let pire = -Infinity;
      for (let j = 0; j < sc.length; j++) if (j !== moi) pire = Math.max(pire, sc[j].total);
      marge = moiPts - pire;
    } else {
      const x = margeAttendue(m, e, moi, w);
      marge = x.marge; moiPts = x.moi;
    }
    n[a]++; somme[a] += marge / 10; sommeMoi[a] += moiPts;
  }
  // 2. Valeur finale : moyenne des déroulements + un léger a priori glouton (stabilise les candidats peu visités).
  let best = 0, bv = -Infinity;
  const p0 = prior[ordre[0]];
  const cands: AnalyseExpert['candidats'] = [];
  for (let i = 0; i < k; i++) {
    const marge = n[i] ? (somme[i] / n[i]) * 10 : -Infinity;
    const v = marge + g.apriori * (prior[ordre[i]] - p0) - 1.5 / Math.sqrt(n[i] || 1e-9);
    if (v > bv) { bv = v; best = i; }
    cands.push({ coup: coups[ordre[i]], valeur: n[i] ? sommeMoi[i] / n[i] : 0, marge, n: n[i] });
  }
  void P; void probaPari;
  return { coup: coups[ordre[best]], candidats: cands, nbLegaux: coups.length };
}
