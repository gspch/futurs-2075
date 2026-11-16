// Commandes annexes du simulateur : garde-fou d'intégration continue, etc.
import fs from 'node:fs';
import { NON_EXPERTS } from '../../bots/src/bots';
import { PARAMETRES } from '../../contenu';
import { lotLocal } from './parallele';
import { fusionner, type Agregat } from './stats';
import { strategies } from './criteres';

const REF_CI = 'simulations/reference-ci.json';

interface MesuresCI { version: string; parties: number; graine: number; ratioMax: number; aleatoire: number; premier: number; typeMax: number; decisions: number }

function mesuresCI(parties: number, graine: number): MesuresCI {
  const tout: Agregat = {};
  let decisions = 0, premier = 0;
  const strat: Record<string, { v: number; att: number }> = {};
  for (const nb of [2, 3, 4, 5]) {
    const a = lotLocal({ type: 'melange', nb, parties, graine, vivier: NON_EXPERTS });
    fusionner(tout, a);
    decisions += a.coups / a.parties / 4;
    premier += (a['siege.0.victoires'] / a['siege.0.parties'] - 1 / nb) / 4;
    for (const s of strategies(a)) {
      strat[s] ??= { v: 0, att: 0 };
      strat[s].v += a[`strat.${s}.victoires`]; strat[s].att += a[`strat.${s}.parties`] / nb;
    }
  }
  let ratioMax = 0;
  for (const s in strat) if (s !== 'aleatoire') ratioMax = Math.max(ratioMax, strat[s].v / strat[s].att);
  let typeMax = 0;
  for (const k in tout) if (k.startsWith('type.')) typeMax = Math.max(typeMax, tout[k] / tout.parties);
  return { version: PARAMETRES.version, parties, graine, ratioMax, aleatoire: strat.aleatoire.v / strat.aleatoire.att, premier, typeMax, decisions };
}

export const COMMANDES: Record<string, (o: Record<string, string>, reste: string[]) => Promise<void>> = {
  /** Simulation courte : échoue si l'équilibre se dégrade nettement par rapport à la dernière version taguée. */
  async ci(o) {
    const parties = Number(o.parties ?? 50), graine = Number(o.graine ?? 7);
    const m = mesuresCI(parties, graine);
    console.log('Mesures : ' + JSON.stringify(m));
    if (o.reference) { fs.writeFileSync(REF_CI, JSON.stringify(m, null, 1) + '\n'); console.log('Référence écrite : ' + REF_CI); return; }
    const ref = JSON.parse(fs.readFileSync(REF_CI, 'utf8')) as MesuresCI;
    console.log('Référence (v' + ref.version + ') : ' + JSON.stringify(ref));
    const echecs: string[] = [];
    if (m.ratioMax > ref.ratioMax + 0.45) echecs.push(`une stratégie domine nettement plus : ratio ${m.ratioMax.toFixed(2)} contre ${ref.ratioMax.toFixed(2)}`);
    if (m.aleatoire > Math.max(0.35, ref.aleatoire + 0.25)) echecs.push(`le hasard gagne trop : ${m.aleatoire.toFixed(2)} fois sa part`);
    if (Math.abs(m.premier) > Math.abs(ref.premier) + 0.08) echecs.push(`avantage du premier joueur : ${(100 * m.premier).toFixed(1)} pts contre ${(100 * ref.premier).toFixed(1)}`);
    if (m.typeMax > ref.typeMax + 0.15) echecs.push(`un type de société écrase les autres : ${(100 * m.typeMax).toFixed(0)} % contre ${(100 * ref.typeMax).toFixed(0)} %`);
    if (Math.abs(m.decisions - ref.decisions) > 0.15 * ref.decisions) echecs.push(`durée : ${m.decisions.toFixed(1)} décisions contre ${ref.decisions.toFixed(1)}`);
    if (echecs.length) { console.error('✘ Équilibre dégradé :\n - ' + echecs.join('\n - ')); process.exit(1); }
    console.log('✔ Pas de dégradation nette de l’équilibre.');
  },
};
