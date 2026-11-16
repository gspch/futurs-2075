// Calcul des huit critères d'équilibre à partir des agrégats de simulation.
import { CONTENU } from '../../contenu';
import { wilson, type Agregat } from './stats';

export interface Mesure { valeur: number; bas: number; haut: number; n: number }
export interface Critere { id: string; nom: string; seuil: string; atteint: boolean; valeur: string; detail?: string }

export interface Resume {
  version: string;
  commande: string;
  graine: number;
  parties: number;
  melange: Record<string, Agregat>;
  duels: Record<string, Agregat>;
}

const pct = (x: number, d = 1) => (100 * x).toFixed(d) + ' %';
const ic = (w: { bas: number; haut: number }, f = 100, d = 1) => `[${(f * w.bas).toFixed(d)} ; ${(f * w.haut).toFixed(d)}]`;

export function strategies(a: Agregat): string[] {
  return Object.keys(a).filter((k) => k.startsWith('strat.') && k.endsWith('.parties')).map((k) => k.slice(6, -8));
}
export function partStrategie(a: Agregat, nom: string, nb: number) {
  const n = a[`strat.${nom}.parties`] ?? 0;
  const w = wilson(a[`strat.${nom}.victoires`] ?? 0, n);
  return { nom, n, taux: w.p, ratio: w.p * nb, ratioBas: w.bas * nb, ratioHaut: w.haut * nb, score: (a[`strat.${nom}.score`] ?? 0) / Math.max(1, n) };
}
export function cartesStats(a: Agregat) {
  const ids = [...CONTENU.tendances, ...CONTENU.signaux, ...CONTENU.ruptures, ...CONTENU.visions].map((c) => c.id);
  return ids.map((id) => {
    const n = a[`carte.${id}.parties`] ?? 0;
    const v = a[`carte.${id}.victoires`] ?? 0;
    const att = a[`carte.${id}.attendu`] ?? 0;
    const w = wilson(v, n);
    const base = n ? att / n : 0;
    return { id, n, victoires: v, delta: n ? v / n - base : 0, bas: w.bas - base, haut: w.haut - base };
  });
}
export function typesStats(a: Agregat) {
  const n = a.parties ?? 0;
  return CONTENU.types.map((t, i) => ({ id: t.id, nom: t.nom, part: (a[`type.${i}`] ?? 0) / Math.max(1, n) }));
}
export function dureeStats(a: Agregat) {
  const n = a.parties ?? 1;
  const moy = a.coups / n;
  const sd = Math.sqrt(Math.max(0, a.coups2 / n - moy * moy));
  return { moy, sd };
}
/** Conversion des décisions simulées en minutes. Hypothèses détaillées dans docs/RAPPORT_EQUILIBRAGE.md. */
export function minutes(nb: number, decisions: number, decennies = 5) {
  const table = 6 + decisions * (38 / 60) + decennies * 2.5; // mise en place 6 min, 38 s par décision, 2 min 30 par bilan
  const humain = decisions / nb; // en ligne : seul l'humain réfléchit
  const ligne = 1 + humain * (40 / 60) + (decisions - humain) * (2.5 / 60) + decennies * 1.2;
  return { table, ligne };
}

export function evaluerCriteres(r: Resume): Critere[] {
  const out: Critere[] = [];
  const nbs = Object.keys(r.melange).map(Number).sort();
  // 1. Aucune stratégie non experte au-delà de 1,3 fois sa part.
  {
    let pire = { nom: '', nb: 0, ratio: 0, bas: 0, haut: 0 };
    for (const nb of nbs) for (const s of strategies(r.melange[nb])) {
      const p = partStrategie(r.melange[nb], s, nb);
      if (p.ratio > pire.ratio) pire = { nom: s, nb, ratio: p.ratio, bas: p.ratioBas, haut: p.ratioHaut };
    }
    out.push({ id: 'C1', nom: 'Aucune stratégie non experte dominante', seuil: '≤ 1,30 × la part attendue', atteint: pire.ratio <= 1.3, valeur: `${pire.ratio.toFixed(3)} ${ic({ bas: pire.bas, haut: pire.haut }, 1, 3)}`, detail: `pire cas : ${pire.nom} à ${pire.nb} joueurs` });
  }
  // 2. Avantage du premier joueur.
  {
    let pire = { nb: 0, d: 0, bas: 0, haut: 0 };
    for (const nb of nbs) {
      const a = r.melange[nb];
      for (let s = 0; s < nb; s++) {
        const w = wilson(a[`siege.${s}.victoires`] ?? 0, a[`siege.${s}.parties`] ?? 0);
        const d = w.p - 1 / nb;
        if (s === 0 && Math.abs(d) >= Math.abs(pire.d)) pire = { nb, d, bas: w.bas - 1 / nb, haut: w.haut - 1 / nb };
      }
    }
    out.push({ id: 'C2', nom: 'Avantage du premier joueur', seuil: '< 3 points', atteint: Math.abs(pire.d) < 0.03, valeur: `${(100 * pire.d).toFixed(2)} pts ${ic(pire, 100, 2)}`, detail: `pire cas : ${pire.nb} joueurs` });
  }
  // 3. Le talent compte.
  {
    const da = r.duels['expert-aleatoire'], dg = r.duels['expert-glouton'];
    const wa = da ? wilson(da['strat.expert.victoires'] ?? 0, da['strat.expert.parties'] ?? 0) : null;
    const wg = dg ? wilson(dg['strat.expert.victoires'] ?? 0, dg['strat.expert.parties'] ?? 0) : null;
    out.push({ id: 'C3a', nom: 'Expert contre aléatoire (2 joueurs)', seuil: '≥ 75 %', atteint: !!wa && wa.p >= 0.75, valeur: wa ? `${pct(wa.p)} ${ic(wa)}` : 'non mesuré', detail: wa ? `${da['strat.expert.parties']} parties` : '' });
    out.push({ id: 'C3b', nom: 'Expert contre glouton (2 joueurs)', seuil: '≥ 60 %', atteint: !!wg && wg.p >= 0.6, valeur: wg ? `${pct(wg.p)} ${ic(wg)}` : 'non mesuré', detail: wg ? `${dg['strat.expert.parties']} parties` : '' });
  }
  // 4. Retour possible.
  {
    let pire = { nb: 0, p: 1, bas: 0, haut: 0 };
    for (const nb of nbs) {
      const a = r.melange[nb];
      const w = wilson(a['mi3.dernier.victoires'] ?? 0, a['mi3.dernier.parties'] ?? 0);
      if (w.p < pire.p) pire = { nb, ...w };
    }
    out.push({ id: 'C4', nom: 'Le dernier à mi-partie (2055) gagne', seuil: '≥ 10 %', atteint: pire.p >= 0.1, valeur: `${pct(pire.p)} ${ic(pire)}`, detail: `pire cas : ${pire.nb} joueurs` });
  }
  // 5. Cartes.
  {
    const total: Agregat = {};
    for (const nb of nbs) for (const k in r.melange[nb]) if (k.startsWith('carte.')) total[k] = (total[k] ?? 0) + r.melange[nb][k];
    const cs = cartesStats(total);
    let pire = cs[0];
    for (const c of cs) if (Math.abs(c.delta) > Math.abs(pire.delta)) pire = c;
    const gagnantes = cs.filter((c) => c.victoires > 0).length / cs.length;
    out.push({ id: 'C5a', nom: 'Aucune carte ne déplace le taux de victoire', seuil: '≤ 8 points', atteint: Math.abs(pire.delta) <= 0.08, valeur: `${(100 * pire.delta).toFixed(2)} pts ${ic(pire, 100, 2)}`, detail: `pire cas : ${pire.id}` });
    out.push({ id: 'C5b', nom: 'Cartes présentes dans des parties gagnantes', seuil: '≥ 85 %', atteint: gagnantes >= 0.85, valeur: pct(gagnantes), detail: `${cs.filter((c) => c.victoires > 0).length} cartes sur ${cs.length}` });
  }
  // 6. Variété des sociétés finales.
  {
    let pire = { nb: 0, nom: '', part: 0, n: 0 };
    for (const nb of nbs) for (const t of typesStats(r.melange[nb])) if (t.part > pire.part) pire = { nb, nom: t.nom, part: t.part, n: r.melange[nb].parties };
    const w = wilson(pire.part * pire.n, pire.n);
    out.push({ id: 'C6', nom: 'Aucun type de société au-delà de 40 % des victoires', seuil: '≤ 40 %', atteint: pire.part <= 0.4, valeur: `${pct(pire.part)} ${ic(w)}`, detail: `pire cas : « ${pire.nom} » à ${pire.nb} joueurs` });
  }
  // 7. Durée.
  {
    const parts: string[] = [];
    let ok = true;
    for (const nb of nbs) {
      const d = dureeStats(r.melange[nb]);
      const mn = minutes(nb, d.moy);
      if (mn.table < 45 || mn.table > 75 || mn.ligne < 20 || mn.ligne > 40) ok = false;
      parts.push(`${nb}j : ${d.moy.toFixed(1)} décisions → ${mn.table.toFixed(0)} min à table, ${mn.ligne.toFixed(0)} min en ligne`);
    }
    out.push({ id: 'C7', nom: 'Durée cohérente avec la cible', seuil: '45-75 min à table, 20-40 min en ligne', atteint: ok, valeur: parts.join(' ; ') });
  }
  // 8. Au moins deux coups défendables.
  {
    const a: Agregat = {};
    for (const k in r.duels) for (const c in r.duels[k]) if (c.startsWith('c8.')) a[c] = (a[c] ?? 0) + r.duels[k][c];
    const n = a['c8.decisions'] ?? 0;
    const moy = n ? a['c8.proches'] / n : 0;
    const moyM = n ? a['c8.prochesMarge'] / n : 0;
    out.push({ id: 'C8', nom: 'Coups à moins de 10 % du meilleur (selon l’expert)', seuil: '≥ 2 en moyenne', atteint: moy >= 2, valeur: n ? `${moy.toFixed(2)} coups (mesure stricte sur la marge : ${moyM.toFixed(2)})` : 'non mesuré', detail: n ? `${n} décisions d’expert ; ${pct(a['c8.auMoins2'] / n)} des décisions ont ≥ 2 coups proches ; ${(a['c8.legaux'] / n).toFixed(1)} coups légaux en moyenne` : '' });
  }
  return out;
}
