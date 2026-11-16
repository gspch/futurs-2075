// Commandes annexes du simulateur : garde-fou d'intégration continue, etc.
import fs from 'node:fs';
import { NON_EXPERTS } from '../../bots/src/bots';
import { PARAMETRES } from '../../contenu';
import { lotLocal } from './parallele';
import { fusionner, type Agregat } from './stats';
import { strategies } from './criteres';
import { Bassin } from './parallele';
import { rechercheAdverse } from './adverse';
import type { Parametres } from '../../moteur/src/types';
import { creerMoteur } from '../../moteur/src/moteur';
import { CONTENU } from '../../contenu';
import { creerBot } from '../../bots/src/bots';
import { jouerPartie } from './partie';
import { wilson } from './stats';
import { decrireEvenement, libelleDecennie } from '../../recit/recit';
import { encoderPartie } from '../../web/src/partage';

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
  /** Duel ou table fixe : `--bots expert,glouton --parties 1000 --graine 42` (sièges tournants). */
  async duel(o) {
    const bots = (o.bots ?? 'expert,glouton').split(',');
    const bassin = new Bassin();
    const a = await bassin.lot({ type: 'duel', nb: bots.length, parties: Number(o.parties ?? 1000), graine: Number(o.graine ?? 42), bots });
    bassin.fermer();
    for (const b of new Set(bots)) { const w = wilson(a[`strat.${b}.victoires`], a[`strat.${b}.parties`]); console.log(`${b} : ${(100 * w.p).toFixed(1)} % de victoires [${(100 * w.bas).toFixed(1)} ; ${(100 * w.haut).toFixed(1)}] sur ${a[`strat.${b}.parties`]} parties, score moyen ${(a[`strat.${b}.score`] / a[`strat.${b}.parties`]).toFixed(1)}`); }
  },
  /** Joue une partie et l'écrit : journal complet, scores, lien de rejeu. `--bots a,b,c,d --graine 7 [--sortie fichier.json]` */
  async partie(o) {
    const m = creerMoteur(CONTENU, PARAMETRES);
    const noms = (o.bots ?? 'expert,glouton,chasseur,parieur').split(',');
    const r = jouerPartie(m, noms.map((n) => creerBot(m, n)), Number(o.graine ?? 7), { garder: true });
    const affiches = (o.noms ?? noms.join(',')).split(',');
    const lien = encoderPartie({ version: PARAMETRES.version, graine: r.graine, sieges: noms.map((n) => (n === 'expert' ? 'D' : n === 'aleatoire' ? 'F' : 'M')) as never, coups: r.coups! });
    if (o.sortie) fs.writeFileSync(o.sortie, JSON.stringify({ graine: r.graine, bots: noms, noms: affiches, coups: r.coups, journal: r.journal, scores: r.scores, gagnants: r.gagnants, histoire: r.etatFinal!.histoire, visions: r.etatFinal!.joueurs.map((j) => j.vision), type: r.type, lien }, null, 1));
    for (const ev of r.journal!) { const s = decrireEvenement(CONTENU, ev, affiches); if (s) console.log(s); }
    console.log('Scores : ' + r.scores.map((s, j) => `${affiches[j]} ${s.total} (vision ${s.vision}, héritage ${s.heritage}, anticipation ${s.anticipation})`).join(' ; '));
    console.log('Lien de rejeu : #' + lien);
    void libelleDecennie;
  },
  /** Test adverse : recherche évolutionnaire d'une stratégie dominante (au moins 200 variantes). */
  async adverse(o) {
    const bassin = new Bassin();
    const params = o.params ? (JSON.parse(o.params) as Partial<Parametres>) : undefined;
    const g = { generations: Number(o.generations ?? 12), population: Number(o.population ?? 24), elites: Number(o.elites ?? 6), parties: Number(o.parties ?? 150), partiesFinales: Number(o.finales ?? 2500), graine: Number(o.graine ?? 4242), params, log: (s: string) => console.error('  ' + s) };
    const { toutes, finalistes } = await rechercheAdverse(bassin, g);
    bassin.fermer();
    console.log(`${toutes.length} variantes évaluées. Finalistes (rejoués sur ${g.partiesFinales} parties par nombre de joueurs) :`);
    for (const f of finalistes) console.log(`  ratio ${f.ratio.toFixed(3)} [${f.bas.toFixed(3)} ; ${f.haut.toFixed(3)}] (2j ${f.parNb[0].toFixed(2)}, 3j ${f.parNb[1].toFixed(2)}, 4j ${f.parNb[2].toFixed(2)}, 5j ${f.parNb[3].toFixed(2)}) — ${f.origine} — ${JSON.stringify(Object.fromEntries(Object.entries(f.poids).map(([k, v]) => [k, Math.round((v as number) * 100) / 100])))}`);
    if (o.adopter && finalistes[0]) {
      const p = { ...finalistes[0].poids } as Record<string, number>;
      for (const k in p) p[k] = Math.round(p[k] * 100) / 100;
      p.axe = -1; p.focus = 0; p.bruit = 0.05;
      fs.writeFileSync('bots/src/poids.json', JSON.stringify(p, null, 1) + '\n');
      console.log('Poids de référence adoptés dans bots/src/poids.json');
    }
    if (o.sortie) {
      const ratios = toutes.map((v) => v.ratio).sort((a, b) => a - b);
      fs.writeFileSync(o.sortie, JSON.stringify({ commande: 'npm run adverse -- ' + Object.entries(o).map(([k, v]) => `--${k} ${v}`).join(' '), reglages: { ...g, log: undefined }, nbVariantes: toutes.length, ratios, finalistes }, null, 1));
      console.log('Résumé écrit dans ' + o.sortie);
    }
  },
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
