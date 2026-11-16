// Une tâche = un lot de parties d'une même configuration. Exécutable dans un ouvrier ou dans le processus principal.
import { creerMoteur } from '../../moteur/src/moteur';
import type { Parametres } from '../../moteur/src/types';
import { CONTENU, PARAMETRES } from '../../contenu';
import { creerBot, creerPondere, type Bot } from '../../bots/src/bots';
import type { Poids } from '../../bots/src/evaluation';
import type { ReglagesExpert } from '../../bots/src/expert';
import { jouerPartie, graineDe, tirerTable } from './partie';
import { enregistrer, type Agregat } from './stats';

export interface Tache {
  /** melange : table tirée dans le vivier ; duel : bots fixes, sièges tournants ; variante : un candidat face au vivier */
  type: 'melange' | 'duel' | 'variante';
  nb: number;
  parties: number;
  graine: number;
  /** premier indice de partie (pour découper un lot entre ouvriers) */
  debut: number;
  vivier?: string[];
  bots?: string[];
  variante?: Partial<Poids>;
  params?: Partial<Parametres>;
  expert?: Partial<ReglagesExpert>;
}

export function executer(t: Tache): Agregat {
  const m = creerMoteur(CONTENU, { ...PARAMETRES, ...(t.params ?? {}) } as Parametres);
  const a: Agregat = {};
  const cache = new Map<string, Bot>();
  const bot = (nom: string): Bot => {
    let b = cache.get(nom);
    if (!b) {
      b = nom === 'variante' ? creerPondere(m, 'variante', t.variante ?? {}) : creerBot(m, nom, nom === 'expert' ? t.expert : undefined);
      cache.set(nom, b);
    }
    return b;
  };
  for (let i = t.debut; i < t.debut + t.parties; i++) {
    const g = graineDe(t.graine + t.nb * 1000003, i);
    const r = { rng: g ^ 0x1234567 };
    let noms: string[];
    if (t.type === 'melange') noms = tirerTable(t.vivier!, t.nb, r);
    else if (t.type === 'variante') {
      noms = tirerTable(t.vivier!, t.nb - 1, r);
      noms.splice(i % t.nb, 0, 'variante');
    } else {
      const base = t.bots!;
      noms = base.map((_, k) => base[(k + i) % base.length]);
    }
    const res = jouerPartie(m, noms.map(bot), g);
    enregistrer(a, res);
  }
  return a;
}
