import { describe, it, expect } from 'vitest';
import { creerMoteur, ID_SIGNAL } from '../../moteur/src/moteur';
import { CONTENU, PARAMETRES } from '../../contenu';
import { creerBot, NON_EXPERTS } from '../src/bots';
import { determiniser } from '../src/expert';
import { jouerPartie } from '../../simulateur/src/partie';
import { encoderPartie, decoderPartie } from '../../web/src/partage';

const m = creerMoteur(CONTENU, PARAMETRES);

describe('bots', () => {
  it('toutes les stratégies terminent des parties légales à 2, 3, 4 et 5 joueurs', () => {
    for (const nb of [2, 3, 4, 5]) {
      const noms = Array.from({ length: nb }, (_, i) => NON_EXPERTS[(i * 2 + nb) % NON_EXPERTS.length]);
      const r = jouerPartie(m, noms.map((n) => creerBot(m, n)), 1000 + nb);
      expect(r.gagnants.length).toBeGreaterThan(0);
      expect(r.scores.length).toBe(nb);
    }
  });
  it('une partie de bots est reproductible à l’identique avec la même graine', () => {
    const jouer = () => jouerPartie(m, ['glouton', 'chasseur', 'parieur'].map((n) => creerBot(m, n)), 77, { garder: true });
    const a = jouer(), b = jouer();
    expect(JSON.stringify(a.coups)).toBe(JSON.stringify(b.coups));
    expect(a.scores).toEqual(b.scores);
  });
  it('l’expert joue des coups légaux et bat nettement le hasard', () => {
    let v = 0;
    for (let g = 0; g < 12; g++) {
      const bots = g % 2 ? [creerBot(m, 'expert', { iterations: 40 }), creerBot(m, 'aleatoire')] : [creerBot(m, 'aleatoire'), creerBot(m, 'expert', { iterations: 40 })];
      const r = jouerPartie(m, bots, 500 + g);
      if (r.gagnants.includes(g % 2 ? 0 : 1)) v++;
    }
    expect(v).toBeGreaterThanOrEqual(9);
  });
  it('la déterminisation ne contredit jamais ce que le joueur a vu, et n’invente ni ne perd de carte', () => {
    const r = jouerPartie(m, ['glouton', 'chasseur', 'bloqueur', 'parieur'].map((n) => creerBot(m, n)), 4242, { garder: true });
    let e = m.creerPartie({ nbJoueurs: 4, graine: 4242 });
    const alea = { rng: 9 };
    for (let i = 0; i < r.coups!.length; i++) {
      if (i % 7 === 0) {
        const moi = e.courant;
        const obs = m.observer(e, moi);
        const d = determiniser(m, obs, moi, alea);
        expect(d.joueurs[moi].main).toEqual(e.joueurs[moi].main);
        expect(d.tendances).toEqual(e.tendances);
        expect(d.axes).toEqual(e.axes);
        for (let k = 0; k < e.horizon.length; k++) if (obs.horizon[k].carte >= 0) expect(d.horizon[k].carte).toBe(e.horizon[k].carte);
        for (let j = 0; j < 4; j++) expect(d.joueurs[j].main.length).toBe(e.joueurs[j].main.length);
        expect(d.piocheT.length).toBe(e.piocheT.length);
        const vues = [...d.piocheT, ...d.defausseT, ...d.joueurs.flatMap((j) => j.main), ...d.tendances.filter((t) => t.id < ID_SIGNAL).map((t) => t.id)];
        expect(new Set(vues).size).toBe(vues.length);
        expect(m.verifier(d)).toEqual([]);
      }
      e = m.jouer(e, r.coups![i]);
    }
  });
  it('une observation ne contient aucune carte cachée', () => {
    let e = m.creerPartie({ nbJoueurs: 3, graine: 5 });
    while (e.phase === 'visions') e = m.jouer(e, m.coupsLegaux(e)[0]);
    const texte = JSON.stringify(m.observer(e, 0));
    const o = JSON.parse(texte);
    expect(o.joueurs[1].main.every((c: number) => c === -1)).toBe(true);
    expect(o.joueurs[2].vision).toBe(-2);
    expect(o.piocheS.concat(o.piocheR, o.piocheT, o.piocheV).every((c: number) => c === -1)).toBe(true);
  });
});

describe('partage de partie', () => {
  it('le lien encode graine, table et coups, et rejoue la partie à l’identique', () => {
    const r = jouerPartie(m, ['glouton', 'parieur', 'chasseur'].map((n) => creerBot(m, n)), 31337, { garder: true });
    const lien = encoderPartie({ version: PARAMETRES.version, graine: 31337, sieges: ['H', 'M', 'D'], coups: r.coups! });
    expect(lien).toMatch(/^p=[\d.]+;31337;HMD;[a-z0-9.]+$/);
    const p = decoderPartie('#' + lien)!;
    expect(p.sieges).toEqual(['H', 'M', 'D']);
    let e = m.creerPartie({ nbJoueurs: 3, graine: p.graine });
    for (const c of p.coups) e = m.jouer(e, c);
    expect(e.phase).toBe('fin');
    expect(m.scores(e)).toEqual(r.scores);
  });
  it('refuse un lien mal formé', () => {
    expect(decoderPartie('#p=1.0;abc;HM;v1')).toBeNull();
    expect(decoderPartie('#rien')).toBeNull();
  });
});
