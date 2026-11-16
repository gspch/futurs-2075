// Évaluation heuristique commune à tous les bots : « combien vaut cette position pour moi ? »
// Elle ne lit que ce que le joueur a le droit de voir (les cartes inconnues valent -1).
import type { Etat, SignalHorizon, Coup } from '../../moteur/src/types';
import type { Moteur } from '../../moteur/src/moteur';
import poidsJson from './poids.json';

export interface Poids {
  /** poids des trois sources de points */
  vision: number;
  heritage: number;
  anticipation: number;
  /** multiplicateur de l'espérance des paris sur signaux et des préparations aux ruptures */
  signal: number;
  rupture: number;
  /** valeur d'information accordée à l'action Veiller sur un signal inconnu */
  veille: number;
  /** valeur d'une carte jouable en main et d'un jeton d'attention libre */
  main: number;
  attention: number;
  /** confiance dans la projection tendancielle (0 = ne regarde que le présent, 1 = croit la projection) */
  amorti: number;
  /** poids du score estimé du meneur adverse (bloqueur) */
  blocage: number;
  /** axe de spécialisation (-1 = aucun) et bonus associé */
  axe: number;
  focus: number;
  /** amplitude du bruit ajouté aux évaluations */
  bruit: number;
}

/** Poids de référence (le « glouton »), calibrés par recherche évolutionnaire : voir `npm run sim -- calibrer`. */
export const POIDS_DEFAUT: Poids = poidsJson as Poids;

const PRIOR_SIGNAL = 0.28;

export interface Contexte {
  m: Moteur;
  centre: number;
}

/** Probabilité estimée qu'un pari (signal, lecture) soit gagnant. */
export function probaPari(m: Moteur, e: Etat, s: SignalHorizon, lecture: number, pas: number[]): number {
  if (s.carte < 0) return PRIOR_SIGNAL;
  const c = m.contenu.signaux[s.carte];
  if (c.condition === null) return 0;
  const l = lecture === 1 ? c.haut : c.bas;
  if (!l || e.fermees[l.axe * 2 + l.pole]) return 0;
  const bilans = s.zone === 1 ? 1 : 2;
  const pred = Math.max(0, Math.min(m.params.pisteMax, e.axes[c.condition] + pas[c.condition] * bilans));
  const marge = lecture === 1 ? pred - m.centre : m.centre - pred;
  if (bilans === 1) return marge >= 3 ? 0.95 : marge === 2 ? 0.88 : marge === 1 ? 0.7 : marge === 0 ? 0.12 : marge === -1 ? 0.08 : 0.02;
  return marge >= 4 ? 0.9 : marge === 3 ? 0.82 : marge === 2 ? 0.7 : marge === 1 ? 0.5 : marge === 0 ? 0.2 : marge === -1 ? 0.12 : 0.04;
}

function pasParAxe(m: Moteur, e: Etat): number[] {
  const P = m.params;
  const net = [0, 0, 0, 0];
  for (const t of e.tendances) net[t.axe] += t.pole === 1 ? t.force : -t.force;
  for (let a = 0; a < 4; a++) net[a] = Math.max(-P.pasMaxAxe, Math.min(P.pasMaxAxe, net[a]));
  return net;
}

/** Probabilité qu'une rupture latente se déclenche avant de se dissiper (ou avant la fin de la partie). */
export function probaRupture(m: Moteur, e: Etat, carte: number, age: number, pas: number[]): number {
  const P = m.params;
  const r = m.contenu.ruptures[carte];
  const jets = Math.min(2 - age, P.decennies - e.decennie);
  let rate = 1;
  for (let k = 1; k <= jets; k++) {
    const v = Math.max(0, Math.min(P.pisteMax, e.axes[r.terrain.axe] + pas[r.terrain.axe] * k));
    const t = Math.max(r.tensionMin, (r.terrain.pole === 1 ? v : P.pisteMax - v) - m.centre);
    rate *= 1 - Math.min(t, P.facesDe) / P.facesDe;
  }
  return 1 - rate;
}

/** Axes attendus en 2075 : projection tendancielle amortie, corrigée des signaux connus et des ruptures latentes. */
export function axesAttendus(m: Moteur, e: Etat, w: Poids, pas: number[]): number[] {
  const P = m.params;
  const reste = P.decennies - e.decennie;
  const f: number[] = [];
  for (let a = 0; a < 4; a++) f.push(e.axes[a] + pas[a] * reste * w.amorti);
  for (const s of e.horizon) {
    if (s.carte < 0) continue;
    const c = m.contenu.signaux[s.carte];
    if (c.condition === null) continue;
    const apres = reste - (s.zone === 1 ? 1 : 2);
    for (const lec of [0, 1]) {
      const l = lec === 1 ? c.haut : c.bas;
      if (!l) continue;
      const p = probaPari(m, e, s, lec, pas);
      if (p > 0.05) f[l.axe] += (l.pole === 1 ? 1 : -1) * p * (0.5 * P.forceSignal * Math.max(0, apres) * w.amorti + ((P.chocSignal as number) || 0));
    }
  }
  for (const r of e.ruptures) {
    const p = probaRupture(m, e, r.carte, r.age, pas);
    if (p <= 0) continue;
    for (const ef of m.contenu.ruptures[r.carte].effets) {
      if (ef.type === 'deplacer') f[ef.axe] += (ef.pole === 1 ? 1 : -1) * p * ef.n;
      else if (ef.type === 'purger') f[ef.axe] += (ef.pole === 1 ? -1 : 1) * p * ef.n * 0.4 * Math.max(0, reste - 1);
    }
  }
  for (let a = 0; a < 4; a++) f[a] = Math.max(0, Math.min(P.pisteMax, f[a]));
  return f;
}

/** Vision présumée d'un adversaire d'après les tendances qu'il a installées : [pôle principal, pôle secondaire] (axe*2+pole, -1 si inconnu). */
export function visionPresumee(e: Etat, j: number): [number, number] {
  const n = new Array(8).fill(0);
  for (const t of e.tendances) if (t.proprio === j) n[t.axe * 2 + t.pole] += t.force;
  let a = -1, b = -1;
  for (let k = 0; k < 8; k++) if (n[k] > 0 && (a < 0 || n[k] > n[a])) a = k;
  for (let k = 0; k < 8; k++) if (n[k] > 0 && a >= 0 && (k >> 1) !== (a >> 1) && (b < 0 || n[k] > n[b])) b = k;
  return [a, b];
}

/** Score final attendu du joueur j (vision connue ou présumée). */
export function scoreAttendu(m: Moteur, e: Etat, j: number, w: Poids, pas: number[], f: number[]): number {
  const P = m.params, C = m.contenu, centre = m.centre;
  const joueur = e.joueurs[j];
  let v = 0;
  let p1 = -1, p2 = -1;
  if (joueur.vision >= 0) {
    const vis = C.visions[joueur.vision];
    p1 = vis.principal.axe * 2 + vis.principal.pole; p2 = vis.secondaire.axe * 2 + vis.secondaire.pole;
  } else if (joueur.vision === -2) [p1, p2] = visionPresumee(e, j);
  if (p1 >= 0) { const a = p1 >> 1; v += m.ptsVision(0, ((p1 & 1) === 1 ? f[a] : P.pisteMax - f[a]) - centre); }
  if (p2 >= 0) { const a = p2 >> 1; v += m.ptsVision(1, ((p2 & 1) === 1 ? f[a] : P.pisteMax - f[a]) - centre); }
  let h = 0;
  const hb = (P.heritageBonus as number) || 0;
  const parAxe = [0, 0, 0, 0];
  for (const t of e.tendances) {
    if (t.proprio !== j) continue;
    const d = (t.pole === 1 ? 1 : -1) * (f[t.axe] - centre);
    const p = d >= 2 ? 0.95 : d <= -2 ? 0.05 : 0.5 + 0.225 * d;
    h += p * P.ptsHeritage;
    if (hb > 0) { if (parAxe[t.axe] > 0) h += p * hb; parAxe[t.axe]++; }
  }
  let ant = joueur.anticipation;
  for (const s of e.horizon) for (const p of s.paris) {
    if (p.j === j) ant += w.signal * probaPari(m, e, s, p.lecture, pas) * (p.precoce ? P.ptsSignalPrecoce : P.ptsSignalTardif);
  }
  for (const r of e.ruptures) if (r.prepares.includes(j)) ant += w.rupture * probaRupture(m, e, r.carte, r.age, pas) * P.ptsRupture;
  return w.vision * v + w.heritage * h + w.anticipation * ant;
}

/** Valeur d'une position pour le joueur j, du point de vue de ce qu'il sait. */
export function evaluer(m: Moteur, e: Etat, j: number, w: Poids): number {
  const pas = pasParAxe(m, e);
  const f = axesAttendus(m, e, w, pas);
  let val = scoreAttendu(m, e, j, w, pas, f);
  const joueur = e.joueurs[j];
  let jouables = 0;
  for (const c of joueur.main) { if (c < 0 || m.installable(e, c)) jouables++; }
  val += w.main * Math.min(jouables, 3) + w.attention * joueur.attention;
  if (w.blocage > 0) {
    let pire = -Infinity;
    for (let k = 0; k < e.nbJoueurs; k++) if (k !== j) pire = Math.max(pire, scoreAttendu(m, e, k, POIDS_DEFAUT, pas, f));
    val -= w.blocage * pire;
  }
  return val;
}

/** Marge attendue (mon score - meilleur score adverse) quand toutes les visions sont connues (états déterminisés). */
export function margeAttendue(m: Moteur, e: Etat, j: number, w: Poids): { moi: number; marge: number } {
  const pas = pasParAxe(m, e);
  const f = axesAttendus(m, e, w, pas);
  const moi = scoreAttendu(m, e, j, w, pas, f);
  let pire = -Infinity;
  for (let k = 0; k < e.nbJoueurs; k++) if (k !== j) pire = Math.max(pire, scoreAttendu(m, e, k, w, pas, f));
  return { moi, marge: moi - pire };
}

/** Bonus hors évaluation de position : information (veille) et spécialisation. */
export function bonusCoup(m: Moteur, e: Etat, j: number, c: Coup, w: Poids): number {
  const P = m.params;
  let b = 0;
  if (c.t === 'veiller') {
    const s = e.horizon.find((x) => x.uid === c.uid)!;
    const joueur = e.joueurs[j];
    const dejaParie = s.paris.some((p) => p.j === j);
    if (s.carte < 0) b += w.veille * (joueur.attention > 0 ? 1 : 0.25) * (s.zone === 0 ? 1.25 : 0.8);
    else if (!dejaParie && joueur.attention > 0) {
      // signal déjà connu : y revenir vaut l'espérance du meilleur pari
      const pas = pasParAxe(m, e);
      const pts = s.zone === 0 ? P.ptsSignalPrecoce : P.ptsSignalTardif;
      b += w.anticipation * w.signal * Math.max(probaPari(m, e, s, 0, pas), probaPari(m, e, s, 1, pas)) * pts - w.attention - 0.05;
    } else b -= 0.5;
  }
  if (w.axe >= 0 && w.focus > 0) {
    if (c.t === 'installer') b += m.contenu.tendances[c.carte].axe === w.axe ? w.focus : -w.focus * 0.5;
    else if (c.t === 'inflechir') { const t = e.tendances.find((x) => x.id === c.id); if (t && t.axe === w.axe) b += w.focus * 0.5; }
  }
  return b;
}
