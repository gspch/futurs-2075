import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import cartes from '../../contenu/cartes.json';
import parametres from '../../contenu/parametres.json';
import schemaCartes from '../../contenu/schemas/cartes.schema.json';
import schemaParams from '../../contenu/schemas/parametres.schema.json';
import { moteur, moteurAvec, partieAleatoire, apresVisions } from './outils';
import { cloner, ID_SIGNAL } from '../src/moteur';
import type { Etat, Evenement } from '../src/types';
import { CONTENU, PARAMETRES } from '../../contenu';

const C = CONTENU, P = PARAMETRES;
const idx = (id: string) => C.tendances.findIndex((t) => t.id === id);

/** Termine la décennie en cours en ne faisant que prospecter / passer / veiller sans parier. */
function finirDecennie(e: Etat, m = moteur, journal?: Evenement[]): Etat {
  const d = e.decennie;
  while (e.phase !== 'fin' && e.decennie === d) {
    const l = m.coupsLegaux(e);
    const c = l.find((x) => x.t === 'renoncer') ?? l.find((x) => x.t === 'prospecter') ?? l.find((x) => x.t === 'veiller') ?? l.find((x) => x.t === 'passer') ?? l[0];
    e = m.jouer(e, c, journal);
  }
  return e;
}

describe('contenu', () => {
  const ajv = new Ajv({ allErrors: true });
  it('cartes.json respecte son schéma', () => {
    const ok = ajv.validate(schemaCartes, cartes);
    expect(ajv.errorsText()).toBe('No errors');
    expect(ok).toBe(true);
  });
  it('parametres.json respecte son schéma', () => {
    expect(ajv.validate(schemaParams, parametres)).toBe(true);
  });
  it('120 cartes au maximum, identifiants uniques', () => {
    const toutes = [...C.tendances, ...C.signaux, ...C.ruptures, ...C.visions];
    expect(toutes.length).toBeLessThanOrEqual(120);
    expect(new Set(toutes.map((c) => c.id)).size).toBe(toutes.length);
  });
  it('symétrie : 7 tendances par pôle dont 2 lourdes, 2 ruptures et 2 visions principales par pôle', () => {
    for (let a = 0; a < 4; a++) for (let p = 0; p < 2; p++) {
      const ts = C.tendances.filter((t) => t.axe === a && t.pole === p);
      expect(ts.length).toBe(7);
      expect(ts.filter((t) => t.force === 2 && t.prerequis).length).toBe(2);
      expect(ts.filter((t) => t.force === 1 && !t.prerequis).length).toBe(5);
      expect(C.ruptures.filter((r) => r.terrain.axe === a && r.terrain.pole === p).length).toBe(2);
      expect(C.visions.filter((v) => v.principal.axe === a && v.principal.pole === p).length).toBe(2);
      expect(C.visions.filter((v) => v.secondaire.axe === a && v.secondaire.pole === p).length).toBe(2);
    }
    for (const v of C.visions) expect(v.principal.axe).not.toBe(v.secondaire.axe);
    for (const t of C.tendances) if (t.prerequis) expect(t.prerequis.axe).not.toBe(t.axe);
  });
});

describe('mise en place', () => {
  it('distribue mains, visions, horizon et rupture', () => {
    for (const n of [2, 3, 4, 5]) {
      const e0 = moteur.creerPartie({ nbJoueurs: n, graine: 1 });
      expect(e0.phase).toBe('visions');
      expect(e0.joueurs.every((j) => j.main.length === P.tailleMain && j.choixVisions.length === 2)).toBe(true);
      const e = apresVisions(n, 1);
      expect(e.phase).toBe('actions');
      expect(e.horizon.filter((s) => s.zone === 1).length).toBe(P.signauxParDecennie);
      expect(e.horizon.filter((s) => s.zone === 0).length).toBe(P.signauxParDecennie);
      expect(e.ruptures.length).toBe(1);
      expect(e.axes).toEqual([5, 5, 5, 5]);
      expect(moteur.verifier(e)).toEqual([]);
    }
  });
  it('refuse un nombre de joueurs hors 2-5', () => {
    expect(() => moteur.creerPartie({ nbJoueurs: 1, graine: 1 })).toThrow();
    expect(() => moteur.creerPartie({ nbJoueurs: 6, graine: 1 })).toThrow();
  });
});

describe('pureté et déterminisme', () => {
  it('jouer() ne modifie pas l’état reçu', () => {
    const e = apresVisions(3, 5);
    const avant = JSON.stringify(e);
    moteur.jouer(e, moteur.coupsLegaux(e)[0]);
    expect(JSON.stringify(e)).toBe(avant);
  });
  it('même graine et mêmes coups donnent la même partie', () => {
    const a = partieAleatoire(4, 42);
    let e = moteur.creerPartie({ nbJoueurs: 4, graine: 42 });
    for (const c of a.coups) e = moteur.jouer(e, c);
    expect(JSON.stringify(e)).toBe(JSON.stringify(a.etat));
  });
  it('l’état survit à un aller-retour JSON', () => {
    const { etat, coups } = partieAleatoire(3, 9);
    let e = moteur.creerPartie({ nbJoueurs: 3, graine: 9 });
    for (const c of coups) e = moteur.jouer(JSON.parse(JSON.stringify(e)), JSON.parse(JSON.stringify(c)));
    expect(e).toEqual(etat);
  });
  it('refuse un coup illégal', () => {
    const e = apresVisions(2, 3);
    expect(() => moteur.jouer(e, { t: 'installer', carte: e.joueurs[1].main[0] })).toThrow(/illégal/);
    expect(() => moteur.jouer(e, { t: 'parier', uid: e.horizon[0].uid, lecture: 1 })).toThrow(/illégal/);
  });
});

describe('100 parties aléatoires', () => {
  it('se terminent sans erreur ni état illégal, à 2, 3, 4 et 5 joueurs', () => {
    for (let g = 1; g <= 100; g++) {
      const n = 2 + (g % 4);
      const { etat, coups } = partieAleatoire(n, g * 7919);
      expect(etat.phase).toBe('fin');
      expect(etat.decennie).toBe(P.decennies);
      expect(etat.histoire.length).toBe(P.decennies + 1);
      expect(moteur.coupsLegaux(etat)).toEqual([]);
      expect(coups.length).toBeGreaterThanOrEqual(n + n * moteur.actionsParDecennie(n) * P.decennies);
      const sc = moteur.scores(etat);
      for (const s of sc) expect(s.total).toBe(s.vision + s.heritage + s.anticipation);
      expect(moteur.gagnants(etat).length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('tendances', () => {
  it('une tendance installée pousse son axe à chaque bilan, de façon cumulative', () => {
    let e = apresVisions(2, 11);
    const c = idx('T08'); // Matière → Abondance, force 1
    e = cloner(e); e.joueurs[e.courant].main[0] = c;
    e.piocheT = e.piocheT.filter((x) => x !== c);
    for (const j of e.joueurs) j.main = j.main.filter((x, i) => x !== c || (j === e.joueurs[e.courant] && i === 0));
    e = moteur.jouer(e, { t: 'installer', carte: c });
    expect(e.tendances[0]).toMatchObject({ id: c, axe: 0, pole: 1, force: 1, age: 0 });
    expect(e.axes[0]).toBe(5); // rien ne bouge avant le bilan
    expect(moteur.projection(e)[0]).toBe(10);
    e = finirDecennie(e);
    expect(e.axes[0]).toBe(6);
    expect(e.tendances[0].age).toBe(1);
    e = finirDecennie(e);
    expect(e.axes[0]).toBe(7);
    expect(e.tendances[0].age).toBe(2);
  });
  it('le pas est plafonné', () => {
    let e = cloner(apresVisions(2, 11));
    for (let i = 0; i < 5; i++) e.tendances.push({ id: idx('T08') + i, axe: 0, pole: 1, force: 1, proprio: 0, age: 0, pose: 0, lecture: -1 });
    e = finirDecennie(e);
    expect(e.axes[0]).toBe(5 + P.pasMaxAxe);
  });
  it('une tendance lourde exige que son prérequis penche du bon côté', () => {
    const lourde = idx('T06'); // prérequis Échelle → Local
    let e = cloner(apresVisions(2, 11));
    e.joueurs[e.courant].main = [lourde];
    expect(moteur.coupsLegaux(e).some((c) => c.t === 'installer')).toBe(false);
    e.axes[2] = 4;
    expect(moteur.coupsLegaux(e).some((c) => c.t === 'installer' && c.carte === lourde)).toBe(true);
    e.axes[2] = 6;
    expect(moteur.coupsLegaux(e).some((c) => c.t === 'installer')).toBe(false);
  });
  it('infléchir coûte de l’attention selon l’ancrage, et une tendance verrouillée est intouchable', () => {
    let e = cloner(apresVisions(2, 11));
    const autre = 1 - e.courant;
    e.tendances.push({ id: 0, axe: 0, pole: 0, force: 1, proprio: autre, age: 0, pose: 0, lecture: -1 });
    e.tendances.push({ id: 1, axe: 0, pole: 0, force: 1, proprio: autre, age: 1, pose: 0, lecture: -1 });
    e.tendances.push({ id: 2, axe: 0, pole: 0, force: 1, proprio: autre, age: 2, pose: 0, lecture: -1 });
    e.tendances.push({ id: 3, axe: 0, pole: 0, force: 1, proprio: e.courant, age: 0, pose: 0, lecture: -1 });
    for (const j of e.joueurs) j.main = j.main.filter((c) => c > 3);
    e.piocheT = e.piocheT.filter((c) => c > 3);
    const cibles = moteur.coupsLegaux(e).filter((c) => c.t === 'inflechir').map((c) => (c as { id: number }).id);
    expect(cibles).toEqual([0, 1]); // ni la verrouillée, ni la sienne
    const moi = e.courant;
    const e2 = moteur.jouer(e, { t: 'inflechir', id: 1 });
    expect(e2.joueurs[moi].attention).toBe(P.jetonsAttention - P.coutInflechir[1]);
    expect(e2.tendances.some((t) => t.id === 1)).toBe(false);
    expect(e2.defausseT).toContain(1);
    expect(moteur.verifier(e2)).toEqual([]);
    const e3 = finirDecennie(e2);
    expect(e3.joueurs[moi].attention).toBe(P.jetonsAttention); // l'attention dépensée revient au bilan
    const pauvre = cloner(e); pauvre.joueurs[moi].attention = 1; pauvre.joueurs[moi].depense = P.jetonsAttention - 1;
    expect(moteur.coupsLegaux(pauvre).filter((c) => c.t === 'inflechir').map((c) => (c as { id: number }).id)).toEqual([0]);
  });
});

describe('bascule et irréversibilité', () => {
  it('un axe en bout de piste ferme la voie opposée pour toujours', () => {
    let e = cloner(apresVisions(3, 21));
    e.axes[1] = 9;
    e.tendances.push({ id: idx('T22'), axe: 1, pole: 1, force: 1, proprio: 0, age: 0, pose: 0, lecture: -1 });
    for (const j of e.joueurs) j.main = j.main.filter((c) => c !== idx('T22'));
    e.piocheT = e.piocheT.filter((c) => c !== idx('T22'));
    const journal: Evenement[] = [];
    e = finirDecennie(e, moteur, journal);
    expect(e.axes[1]).toBe(10);
    expect(e.fermees[1 * 2 + 0]).toBe(true);
    expect(journal.some((x) => x.t === 'bascule' && x.axe === 1 && x.poleFerme === 0)).toBe(true);
    const mortes = (c: number) => C.tendances[c].axe === 1 && C.tendances[c].pole === 0;
    expect(e.piocheT.some(mortes) || e.defausseT.some(mortes) || e.joueurs.some((j) => j.main.some(mortes))).toBe(false);
    expect(moteur.verifier(e)).toEqual([]);
    // même si l'axe redescend, la voie reste fermée
    e = cloner(e); e.axes[1] = 3;
    e = finirDecennie(e);
    expect(e.fermees[1 * 2 + 0]).toBe(true);
  });
});

describe('signaux', () => {
  const sig = (id: string) => C.signaux.findIndex((s) => s.id === id);
  function avecSignal(id: string, zone: number) {
    const e = cloner(apresVisions(2, 31));
    e.piocheS.push(...e.horizon.map((s) => s.carte));
    e.piocheS = e.piocheS.filter((c) => c !== sig(id));
    e.horizon = [{ uid: 900, carte: sig(id), zone, paris: [] }];
    return e;
  }
  it('veiller révèle le signal au seul joueur qui regarde', () => {
    let e = avecSignal('S01', 1);
    const moi = e.courant;
    expect(moteur.observer(e, moi).horizon[0].carte).toBe(-1);
    e = moteur.jouer(e, { t: 'veiller', uid: 900 });
    expect(e.phase).toBe('veille');
    expect(e.courant).toBe(moi);
    expect(moteur.observer(e, moi).horizon[0].carte).toBe(sig('S01'));
    expect(moteur.observer(e, 1 - moi).horizon[0].carte).toBe(-1);
    e = moteur.jouer(e, { t: 'renoncer' });
    expect(e.courant).toBe(1 - moi);
  });
  it('double lecture : le contexte décide de la tendance qui naît, et paie le bon pari', () => {
    // S01 : condition Technique ; haut → Lien/Commun ; bas → Lien/Autonomie
    for (const [valeur, lecture, pole] of [[7, 1, 1], [2, 0, 0]] as const) {
      let e = avecSignal('S01', 1);
      const moi = e.courant;
      e.axes[1] = valeur;
      e = moteur.jouer(e, { t: 'veiller', uid: 900 });
      e = moteur.jouer(e, { t: 'parier', uid: 900, lecture: 1 });
      expect(e.joueurs[moi].attention).toBe(P.jetonsAttention - 1);
      const journal: Evenement[] = [];
      e = finirDecennie(e, moteur, journal);
      const nee = e.tendances.find((t) => t.id === ID_SIGNAL + sig('S01'))!;
      expect(nee).toMatchObject({ axe: 3, pole, force: P.forceSignal, proprio: -1, lecture });
      expect(e.joueurs[moi].anticipation).toBe(lecture === 1 ? P.ptsSignalTardif : 0);
      expect(e.joueurs[moi].attention).toBe(P.jetonsAttention);
      expect(e.horizon.some((s) => s.uid === 900)).toBe(false);
    }
  });
  it('un pari précoce (signal lointain) rapporte davantage', () => {
    let e = avecSignal('S01', 0);
    const moi = e.courant;
    e.axes[1] = 8;
    e = moteur.jouer(e, { t: 'veiller', uid: 900 });
    e = moteur.jouer(e, { t: 'parier', uid: 900, lecture: 1 });
    e = finirDecennie(e);
    expect(e.horizon.find((s) => s.uid === 900)!.zone).toBe(1);
    expect(e.joueurs[moi].anticipation).toBe(0);
    e = finirDecennie(e);
    expect(e.joueurs[moi].anticipation).toBe(P.ptsSignalPrecoce);
  });
  it('s’éteint si l’axe de contexte est au centre, si la lecture manque, ou si c’est du bruit', () => {
    const cas: [string, number, number, string][] = [['S01', 1, 5, 'centre'], ['S15', 0, 8, 'sansLecture'], ['S25', 0, 5, 'bruit']];
    for (const [id, axe, valeur, raison] of cas) {
      let e = avecSignal(id, 1);
      e.axes[axe] = valeur;
      const journal: Evenement[] = [];
      e = finirDecennie(e, moteur, journal);
      expect(journal.find((x) => x.t === 'signalEteint')).toMatchObject({ raison });
      expect(e.tendances.length).toBe(0);
    }
  });
  it('un seul pari par joueur et par signal', () => {
    let e = avecSignal('S01', 1);
    e = moteur.jouer(e, { t: 'veiller', uid: 900 });
    e = moteur.jouer(e, { t: 'parier', uid: 900, lecture: 0 });
    e = moteur.jouer(e, { t: 'veiller', uid: 900 });
    e = moteur.jouer(e, { t: 'renoncer' });
    e = moteur.jouer(e, { t: 'veiller', uid: 900 });
    expect(moteur.coupsLegaux(e)).toEqual([{ t: 'renoncer' }]);
  });
});

describe('ruptures', () => {
  const rup = (id: string) => C.ruptures.findIndex((r) => r.id === id);
  function avecRupture(id: string, graine = 41) {
    const e = cloner(apresVisions(2, graine));
    e.piocheR.push(...e.ruptures.map((r) => r.carte));
    e.piocheR = e.piocheR.filter((c) => c !== rup(id));
    e.ruptures = [{ carte: rup(id), age: 0, prepares: [] }];
    return e;
  }
  it('la tension suit la position de l’axe du terrain', () => {
    const e = avecRupture('R07'); // terrain Technique → Automate
    expect(moteur.tension(e, rup('R07'))).toBe(0);
    e.axes[1] = 8; expect(moteur.tension(e, rup('R07'))).toBe(3);
    e.axes[1] = 2; expect(moteur.tension(e, rup('R07'))).toBe(0);
    expect(moteur.tension(e, rup('R08'))).toBe(1); // tension minimale 1
  });
  it('sans tension, jamais de rupture ; elle se dissipe après deux bilans et rend les jetons', () => {
    let e = avecRupture('R07');
    const moi = e.courant;
    e = moteur.jouer(e, { t: 'preparer', carte: rup('R07') });
    expect(e.joueurs[moi].attention).toBe(P.jetonsAttention - 1);
    expect(moteur.coupsLegaux(cloner({ ...e, courant: moi } as Etat)).some((c) => c.t === 'preparer' && c.carte === rup('R07'))).toBe(false);
    e = cloner(e); e.axes[1] = 5;
    e = finirDecennie(e);
    e = cloner(e); e.axes[1] = 5; e.tendances = e.tendances.filter((t) => t.axe !== 1);
    expect(e.ruptures.some((r) => r.carte === rup('R07'))).toBe(true);
    const journal: Evenement[] = [];
    e = finirDecennie(e, moteur, journal);
    expect(journal.some((x) => x.t === 'ruptureDissipee')).toBe(true);
    expect(e.joueurs[moi].anticipation).toBe(0);
    expect(moteur.verifier(e)).toEqual([]);
  });
  it('à tension maximale la rupture se déclenche presque toujours, paie les préparés et applique ses effets', () => {
    let vues = 0;
    for (let g = 1; g <= 30; g++) {
      let e = avecRupture('R07', g);
      const moi = e.courant;
      e.axes[1] = 10; e.fermees[2] = true;
      e.tendances = [0, 1, 2].map((k) => ({ id: idx('T22') + k, axe: 1, pole: 1, force: 1, proprio: 0, age: 2, pose: 0, lecture: -1 }));
      for (const j of e.joueurs) j.main = [];
      e.piocheT = e.piocheT.filter((c) => !(C.tendances[c].axe === 1));
      e = moteur.jouer(e, { t: 'preparer', carte: rup('R07') });
      const journal: Evenement[] = [];
      e = finirDecennie(e, moteur, journal);
      if (journal.some((x) => x.t === 'rupture')) {
        vues++;
        expect(e.joueurs[moi].anticipation).toBe(P.ptsRupture);
        expect(e.axes[1]).toBe(7); // recul de 3
        expect(e.tendances.filter((t) => t.axe === 1).length).toBe(1); // 2 tendances purgées, même verrouillées
        expect(e.ruptures.some((r) => r.carte === rup('R07'))).toBe(false);
      }
    }
    expect(vues).toBeGreaterThan(18); // attendu : 5/6
    expect(vues).toBeLessThanOrEqual(30);
  });
});

describe('scores et fin de partie', () => {
  it('vision, héritage et anticipation s’additionnent', () => {
    const e = cloner(apresVisions(2, 51));
    const v = C.visions.findIndex((x) => x.id === 'V01'); // principal Matière/Sobriété, secondaire Échelle/Local
    e.joueurs[0].vision = v;
    e.axes = [1, 5, 3, 9];
    e.tendances = [
      { id: 0, axe: 0, pole: 0, force: 1, proprio: 0, age: 2, pose: 0, lecture: -1 }, // du bon côté
      { id: 8, axe: 0, pole: 1, force: 1, proprio: 0, age: 2, pose: 0, lecture: -1 }, // du mauvais côté
      { id: 20, axe: 1, pole: 1, force: 1, proprio: 0, age: 2, pose: 0, lecture: -1 }, // axe au centre : rien
      { id: 50, axe: 3, pole: 1, force: 1, proprio: 1, age: 2, pose: 0, lecture: -1 }, // à l'autre joueur
    ];
    e.joueurs[0].anticipation = 4;
    const s = moteur.scores(e)[0];
    expect(s.vision).toBe(P.ptsVisionPrincipal * 4 + P.ptsVisionSecondaire * 2);
    expect(s.heritage).toBe(P.ptsHeritage);
    expect(s.anticipation).toBe(4);
    expect(s.total).toBe(s.vision + s.heritage + 4);
    expect(moteur.scores(e)[1].heritage).toBe(P.ptsHeritage);
  });
  it('la partie dure exactement cinq décennies et se termine en phase « fin »', () => {
    let e = apresVisions(4, 61);
    for (let d = 0; d < P.decennies; d++) { expect(e.decennie).toBe(d); expect(e.premier).toBe(d % 4); e = finirDecennie(e); }
    expect(e.phase).toBe('fin');
    expect(moteur.coupsLegaux(e)).toEqual([]);
  });
  it('égalité : départage à l’anticipation, sinon victoire partagée', () => {
    const e = cloner(apresVisions(3, 71));
    e.axes = [5, 5, 5, 5]; e.tendances = [];
    e.joueurs[0].anticipation = 3; e.joueurs[1].anticipation = 3; e.joueurs[2].anticipation = 1;
    expect(moteur.gagnants(e)).toEqual([0, 1]);
  });
  it('types de société', () => {
    expect(moteur.typeSociete([5, 5, 5, 5])).toBe(0);
    expect(moteur.typeSociete([6, 4, 5, 5])).toBe(0);
    expect(C.types[moteur.typeSociete([1, 5, 5, 6])].id).toBe('sobriete');
    expect(C.types[moteur.typeSociete([5, 5, 5, 9])].id).toBe('commun');
  });
});

describe('observation', () => {
  it('masque mains, visions, pioches et signaux non regardés des autres', () => {
    const e = apresVisions(3, 81);
    const o = moteur.observer(e, 0);
    expect(o.joueurs[0].main).toEqual(e.joueurs[0].main);
    expect(o.joueurs[1].main.every((c) => c === -1)).toBe(true);
    expect(o.joueurs[1].main.length).toBe(e.joueurs[1].main.length);
    expect(o.joueurs[1].vision).toBe(-2);
    expect(o.joueurs[0].vision).toBe(e.joueurs[0].vision);
    expect(o.piocheT.every((c) => c === -1) && o.piocheS.every((c) => c === -1) && o.piocheR.every((c) => c === -1)).toBe(true);
    expect(o.horizon.every((s) => s.carte === -1)).toBe(true);
    expect(o.rng).toBe(0);
  });
});

describe('paramètres', () => {
  it('le moteur lit ses réglages dans les paramètres', () => {
    const m = moteurAvec({ decennies: 3, pasMaxAxe: 1 });
    const { etat } = partieAleatoire(3, 5, m);
    expect(etat.decennie).toBe(3);
    for (let d = 1; d < etat.histoire.length; d++) for (let a = 0; a < 4; a++) {
      // hors ruptures, un axe ne bouge que d'un pas par décennie avec pasMaxAxe = 1 (les ruptures peuvent ajouter jusqu'à 3)
      expect(Math.abs(etat.histoire[d][a] - etat.histoire[d - 1][a])).toBeLessThanOrEqual(1 + 3 + 3);
    }
  });
});
