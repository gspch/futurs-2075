// Agrégats additifs : un dictionnaire de compteurs que l'on peut sommer entre ouvriers.
import type { ResultatPartie } from './partie';

export type Agregat = Record<string, number>;

export function ajouter(a: Agregat, cle: string, v = 1): void { a[cle] = (a[cle] ?? 0) + v; }
export function fusionner(dans: Agregat, autre: Agregat): Agregat {
  for (const k in autre) dans[k] = (dans[k] ?? 0) + autre[k];
  return dans;
}

export function enregistrer(a: Agregat, r: ResultatPartie, premierSiege = 0): void {
  const n = r.nb;
  ajouter(a, 'parties');
  ajouter(a, 'coups', r.nbCoups); ajouter(a, 'coups2', r.nbCoups * r.nbCoups);
  ajouter(a, `histCoups.${r.nbCoups}`);
  ajouter(a, `type.${r.type}`);
  const part = 1 / r.gagnants.length;
  if (r.gagnants.length > 1) ajouter(a, 'egalites');
  for (let j = 0; j < n; j++) {
    const g = r.gagnants.includes(j) ? part : 0;
    const s = r.scores[j];
    const nom = r.bots[j];
    ajouter(a, `strat.${nom}.parties`); ajouter(a, `strat.${nom}.victoires`, g); ajouter(a, `strat.${nom}.score`, s.total);
    const siege = (j - premierSiege + n) % n;
    ajouter(a, `siege.${siege}.parties`); ajouter(a, `siege.${siege}.victoires`, g); ajouter(a, `siege.${siege}.score`, s.total);
    ajouter(a, `histScore.${Math.round(s.total)}`);
    if (g > 0) ajouter(a, `histGagnant.${Math.round(s.total)}`, g);
    ajouter(a, 'score.vision', s.vision); ajouter(a, 'score.heritage', s.heritage); ajouter(a, 'score.anticipation', s.anticipation); ajouter(a, 'score.total', s.total); ajouter(a, 'score.total2', s.total * s.total);
    if (g > 0) { ajouter(a, 'gagnant.vision', s.vision * g); ajouter(a, 'gagnant.heritage', s.heritage * g); ajouter(a, 'gagnant.anticipation', s.anticipation * g); }
    for (const c of new Set(r.cartes[j])) { ajouter(a, `carte.${c}.parties`); ajouter(a, `carte.${c}.victoires`, g); ajouter(a, `carte.${c}.attendu`, 1 / n); }
  }
  // Retour possible : le dernier à mi-partie (après le bilan de la 3e décennie, et de la 2e) gagne-t-il ?
  // (mesuré sur les tables sans bot aléatoire : un joueur qui joue au hasard n'est pas un candidat au retour)
  const sansAleatoire = !r.bots.includes('aleatoire');
  for (const [nom, d] of [['mi3', 2], ['mi2', 1]] as const) {
    const inter = r.intermediaires[d];
    if (!inter || !sansAleatoire) continue;
    const min = Math.min(...inter);
    const derniers = inter.map((v, j) => (v === min ? j : -1)).filter((j) => j >= 0);
    if (derniers.length === n) continue; // tous à égalité : pas de dernier
    for (const j of derniers) {
      ajouter(a, `${nom}.dernier.parties`, 1 / derniers.length);
      if (r.gagnants.includes(j)) ajouter(a, `${nom}.dernier.victoires`, part / derniers.length);
    }
    const max = Math.max(...inter);
    const premiers = inter.map((v, j) => (v === max ? j : -1)).filter((j) => j >= 0);
    for (const j of premiers) {
      ajouter(a, `${nom}.premier.parties`, 1 / premiers.length);
      if (r.gagnants.includes(j)) ajouter(a, `${nom}.premier.victoires`, part / premiers.length);
    }
  }
  for (const k in r.compteCoups) ajouter(a, `coup.${k}`, r.compteCoups[k]);
  for (const k in r.evenements) ajouter(a, `evt.${k}`, r.evenements[k]);
  for (const k in r.c8) ajouter(a, `c8.${k}`, (r.c8 as Record<string, number>)[k]);
  const sc = r.scores.map((s) => s.total).sort((x, y) => y - x);
  ajouter(a, 'ecartTete', sc[0] - sc[1]);
  if (sc[0] - sc[1] <= 2) ajouter(a, 'serrees');
}

/** Proportion et intervalle de confiance à 95 % (Wilson). */
export function wilson(succes: number, n: number): { p: number; bas: number; haut: number } {
  if (n <= 0) return { p: NaN, bas: NaN, haut: NaN };
  const z = 1.96, p = succes / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const e = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, bas: Math.max(0, (c - e) / d), haut: Math.min(1, (c + e) / d) };
}
