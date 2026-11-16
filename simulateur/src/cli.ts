// Ligne de commande du simulateur. Voir README : `npm run sim -- <commande> [options]`.
import fs from 'node:fs';
import path from 'node:path';
import { PARAMETRES } from '../../contenu';
import { NON_EXPERTS } from '../../bots/src/bots';
import { Bassin } from './parallele';
import { evaluerCriteres, strategies, partStrategie, typesStats, dureeStats, minutes, type Resume } from './criteres';
import type { Agregat } from './stats';
import type { Parametres } from '../../moteur/src/types';

function options(argv: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { o[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1'; }
  return o;
}

export async function simulerTout(bassin: Bassin, o: { parties: number; duels: number; graine: number; params?: Partial<Parametres>; joueurs?: number[]; iterations?: number; log?: boolean }): Promise<Resume> {
  const melange: Record<string, Agregat> = {};
  const duels: Record<string, Agregat> = {};
  const t0 = Date.now();
  const travaux: Promise<void>[] = [];
  for (const nb of o.joueurs ?? [2, 3, 4, 5]) {
    travaux.push(bassin.lot({ type: 'melange', nb, parties: o.parties, graine: o.graine, vivier: NON_EXPERTS, params: o.params }).then((a) => { melange[nb] = a; if (o.log) console.error(`  mélange ${nb} joueurs : ${a.parties} parties (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }));
  }
  if (o.duels > 0) {
    const expert = o.iterations ? { iterations: o.iterations } : undefined;
    for (const adv of ['aleatoire', 'glouton']) {
      travaux.push(bassin.lot({ type: 'duel', nb: 2, parties: o.duels, graine: o.graine + 17, bots: ['expert', adv], params: o.params, expert }).then((a) => { duels[`expert-${adv}`] = a; if (o.log) console.error(`  duel expert-${adv} : ${a.parties} parties (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }));
    }
  }
  await Promise.all(travaux);
  return { version: String(o.params?.version ?? PARAMETRES.version), commande: '', graine: o.graine, parties: o.parties, melange, duels };
}

export function afficher(r: Resume): string {
  const l: string[] = [];
  l.push(`Règles v${r.version} — ${r.parties} parties par configuration, graine ${r.graine}`);
  for (const c of evaluerCriteres(r)) l.push(`${c.atteint ? '✔' : '✘'} ${c.id.padEnd(4)} ${c.nom} (${c.seuil}) : ${c.valeur}${c.detail ? ' — ' + c.detail : ''}`);
  for (const nb of Object.keys(r.melange).map(Number)) {
    const a = r.melange[nb];
    const ps = strategies(a).map((s) => partStrategie(a, s, nb)).sort((x, y) => y.ratio - x.ratio);
    l.push(`— ${nb} joueurs : ` + ps.map((p) => `${p.nom} ${p.ratio.toFixed(2)}`).join(', '));
    const d = dureeStats(a);
    const n = a.parties * nb;
    l.push(`   sièges : ${Array.from({ length: nb }, (_, s) => (100 * a[`siege.${s}.victoires`] / a[`siege.${s}.parties`]).toFixed(1)).join(' / ')} % ; décisions ${d.moy.toFixed(1)} ; score moyen ${(a['score.total'] / n).toFixed(1)} (vision ${(a['score.vision'] / n).toFixed(1)}, héritage ${(a['score.heritage'] / n).toFixed(1)}, anticipation ${(a['score.anticipation'] / n).toFixed(1)}) ; gagnant : vision ${(a['gagnant.vision'] / a.parties).toFixed(1)}, héritage ${(a['gagnant.heritage'] / a.parties).toFixed(1)}, anticipation ${(a['gagnant.anticipation'] / a.parties).toFixed(1)}`);
    l.push(`   par partie : ruptures ${((a['evt.rupture'] ?? 0) / a.parties).toFixed(2)}, signaux amplifiés ${((a['evt.signalAmplifie'] ?? 0) / a.parties).toFixed(1)}, bascules ${((a['evt.bascule'] ?? 0) / a.parties).toFixed(2)}, tendances finales ${((a['evt.tendancesFinales'] ?? 0) / a.parties).toFixed(1)} ; égalités ${(100 * (a.egalites ?? 0) / a.parties).toFixed(1)} % ; dernier→gagne ${(100 * (a['mi3.dernier.victoires'] ?? 0) / (a['mi3.dernier.parties'] || 1)).toFixed(1)} %, premier→gagne ${(100 * (a['mi3.premier.victoires'] ?? 0) / (a['mi3.premier.parties'] || 1)).toFixed(1)} %`);
    l.push('   coups : ' + Object.keys(a).filter((k) => k.startsWith('coup.')).map((k) => `${k.slice(5)} ${(a[k] / a.parties).toFixed(1)}`).join(', '));
    l.push('   types : ' + typesStats(a).map((t) => `${t.id} ${(100 * t.part).toFixed(0)}`).join(', '));
    void minutes;
  }
  return l.join('\n');
}

async function main() {
  const [cmd, ...reste] = process.argv.slice(2);
  const o = options(reste);
  const graine = Number(o.graine ?? 2075);
  const parties = Number(o.parties ?? 1000);
  const params = o.params ? (JSON.parse(o.params) as Partial<Parametres>) : undefined;
  if (cmd === 'explorer' || cmd === 'rapport') {
    const bassin = new Bassin();
    const duels = Number(o.duels ?? (cmd === 'rapport' ? parties : 0));
    const r = await simulerTout(bassin, { parties, duels, graine, params, joueurs: o.joueurs ? o.joueurs.split(',').map(Number) : undefined, iterations: o.iterations ? Number(o.iterations) : undefined, log: true });
    bassin.fermer();
    r.commande = `npm run sim -- ${cmd} ${reste.join(' ')}`.trim();
    console.log(afficher(r));
    if (o.sortie || cmd === 'rapport') {
      const f = o.sortie ?? `simulations/resume-v${r.version}.json`;
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, JSON.stringify(r));
      console.log('Résumé écrit dans ' + f);
    }
    return;
  }
  const autres = await import('./commandes');
  if (cmd in autres.COMMANDES) { await autres.COMMANDES[cmd](o, reste); return; }
  console.log('Commandes : explorer, rapport, ' + Object.keys(autres.COMMANDES).join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
