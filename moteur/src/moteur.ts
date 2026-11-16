// Moteur de règles d'Aiguillages : pur, déterministe, sans dépendance.
// Seule porte d'entrée des joueurs : coupsLegaux() puis jouer().
import type {
  Contenu, Parametres, Etat, Coup, Evenement, Joueur, Score, ConfigPartie, TendanceEnJeu, Gain, Lecture,
} from './types';

export const ID_SIGNAL = 100;

export function cloner(e: Etat): Etat {
  return {
    nbJoueurs: e.nbJoueurs, rng: e.rng, phase: e.phase, decennie: e.decennie, tour: e.tour, rang: e.rang,
    premier: e.premier, courant: e.courant,
    axes: e.axes.slice(),
    histoire: e.histoire.map((h) => h.slice()),
    fermees: e.fermees.slice(),
    tendances: e.tendances.map((t) => ({ id: t.id, axe: t.axe, pole: t.pole, force: t.force, proprio: t.proprio, age: t.age, pose: t.pose, lecture: t.lecture })),
    piocheT: e.piocheT.slice(), defausseT: e.defausseT.slice(), piocheS: e.piocheS.slice(), piocheR: e.piocheR.slice(), piocheV: e.piocheV.slice(),
    horizon: e.horizon.map((s) => ({ uid: s.uid, carte: s.carte, zone: s.zone, paris: s.paris.map((p) => ({ j: p.j, lecture: p.lecture, precoce: p.precoce })) })),
    ruptures: e.ruptures.map((r) => ({ carte: r.carte, age: r.age, prepares: r.prepares.slice() })),
    signauxResolus: e.signauxResolus.slice(), rupturesVues: e.rupturesVues.slice(),
    joueurs: e.joueurs.map((j) => ({ main: j.main.slice(), choixVisions: j.choixVisions.slice(), vision: j.vision, attention: j.attention, depense: j.depense, anticipation: j.anticipation, connus: j.connus.slice() })),
    prochainUid: e.prochainUid, nbCoups: e.nbCoups,
  };
}

/** Générateur pseudo-aléatoire (mulberry32) dont l'état vit dans l'Etat : la partie est rejouable à l'identique. */
export function alea(e: { rng: number }): number {
  let t = (e.rng = (e.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function melanger<T>(e: { rng: number }, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(alea(e) * (i + 1));
    const x = a[i]; a[i] = a[k]; a[k] = x;
  }
  return a;
}

export interface Moteur {
  contenu: Contenu;
  params: Parametres;
  centre: number;
  creerPartie(config: ConfigPartie): Etat;
  coupsLegaux(e: Etat): Coup[];
  /** Applique un coup et renvoie un NOUVEL état (l'ancien n'est pas modifié). Lève une erreur si le coup est illégal. */
  jouer(e: Etat, c: Coup, journal?: Evenement[]): Etat;
  /** Variante rapide qui modifie l'état fourni, sans vérifier la légalité (réservée aux simulations internes des bots). */
  jouerEnPlace(e: Etat, c: Coup, journal?: Evenement[]): void;
  scores(e: Etat): Score[];
  gagnants(e: Etat): number[];
  /** Force nette des tendances sur un axe (positive vers le pôle haut). */
  forceNette(e: Etat, axe: number): number;
  /** Futur probable : position de chaque axe en 2075 si rien ne change. */
  projection(e: Etat): number[];
  tension(e: Etat, carteRupture: number): number;
  typeSociete(axes: number[]): number;
  observer(e: Etat, j: number): Etat;
  verifier(e: Etat): string[];
  memeCoup(a: Coup, b: Coup): boolean;
  lectureSignal(carte: number, lecture: number): Lecture | null;
  titreTendance(t: { id: number; lecture: number }): string;
  actionsParDecennie(n: number): number;
}

export function creerMoteur(contenu: Contenu, params: Parametres): Moteur {
  const P = params;
  const C = contenu;
  const NA = C.axes.length;
  const centre = P.pisteMax / 2;
  const chocSignal = typeof P.chocSignal === 'number' ? (P.chocSignal as number) : 0;

  const actionsParDecennie = (n: number) => P.actionsParDecennie[String(n)];
  const penche = (e: Etat, axe: number, pole: number) => (pole === 1 ? e.axes[axe] > centre : e.axes[axe] < centre);
  const versPole = (v: number, pole: number) => (pole === 1 ? v : P.pisteMax - v);

  function piocherT(e: Etat): number {
    if (e.piocheT.length === 0 && e.defausseT.length > 0) {
      e.piocheT = melanger(e, e.defausseT);
      e.defausseT = [];
    }
    return e.piocheT.length > 0 ? (e.piocheT.pop() as number) : -1;
  }
  function completerMain(e: Etat, j: Joueur, jusqua: number): number {
    let n = 0;
    while (j.main.length < jusqua) {
      const c = piocherT(e);
      if (c < 0) break;
      j.main.push(c); n++;
    }
    return n;
  }

  function debutDecennie(e: Etat, journal?: Evenement[]): void {
    journal?.push({ t: 'decennie', d: e.decennie, premier: e.premier });
    if (e.piocheR.length > 0 && e.ruptures.length < P.rupturesLatentesMax) {
      const carte = e.piocheR.pop() as number;
      e.ruptures.push({ carte, age: 0, prepares: [] });
      e.rupturesVues.push(carte);
      journal?.push({ t: 'ruptureRevelee', carte });
    }
    const poser = (zone: number) => {
      let n = 0;
      for (let i = 0; i < P.signauxParDecennie && e.piocheS.length > 0; i++) {
        e.horizon.push({ uid: e.prochainUid++, carte: e.piocheS.pop() as number, zone, paris: [] });
        n++;
      }
      if (n > 0) journal?.push({ t: 'signauxPoses', n, zone });
    };
    if (e.decennie === 0) poser(1);
    if (e.decennie < P.decennies - 1) poser(0);
    for (let k = 0; k < e.nbJoueurs; k++) completerMain(e, e.joueurs[(e.premier + k) % e.nbJoueurs], P.tailleMain);
    e.tour = 0; e.rang = 0; e.courant = e.premier; e.phase = 'actions';
  }

  function creerPartie(config: ConfigPartie): Etat {
    const n = config.nbJoueurs;
    if (n < 2 || n > 5) throw new Error('2 à 5 joueurs');
    const e: Etat = {
      nbJoueurs: n, rng: config.graine | 0, phase: 'visions', decennie: 0, tour: 0, rang: 0, premier: 0, courant: 0,
      axes: C.axes.map(() => centre), histoire: [], fermees: new Array(NA * 2).fill(false),
      tendances: [], piocheT: [], defausseT: [], piocheS: [], piocheR: [], piocheV: [],
      horizon: [], ruptures: [], signauxResolus: [], rupturesVues: [], joueurs: [], prochainUid: 1, nbCoups: 0,
    };
    e.histoire.push(e.axes.slice());
    e.piocheT = melanger(e, C.tendances.map((_, i) => i));
    e.piocheS = melanger(e, C.signaux.map((_, i) => i));
    e.piocheR = melanger(e, C.ruptures.map((_, i) => i));
    e.piocheV = melanger(e, C.visions.map((_, i) => i));
    for (let j = 0; j < n; j++) {
      const main: number[] = [];
      for (let k = 0; k < P.tailleMain; k++) main.push(e.piocheT.pop() as number);
      e.joueurs.push({ main, choixVisions: [e.piocheV.pop() as number, e.piocheV.pop() as number], vision: -1, attention: P.jetonsAttention, depense: 0, anticipation: 0, connus: [] });
    }
    return e;
  }

  function installable(e: Etat, carte: number): boolean {
    const c = C.tendances[carte];
    if (e.fermees[c.axe * 2 + c.pole]) return false;
    if (c.prerequis && !penche(e, c.prerequis.axe, c.prerequis.pole)) return false;
    return true;
  }

  function coupsLegaux(e: Etat): Coup[] {
    const coups: Coup[] = [];
    if (e.phase === 'fin') return coups;
    const j = e.joueurs[e.courant];
    if (e.phase === 'visions') {
      for (const v of j.choixVisions) coups.push({ t: 'vision', carte: v });
      return coups;
    }
    if (e.phase === 'veille') {
      if (j.attention > 0) {
        for (const s of e.horizon) {
          let deja = false;
          for (const p of s.paris) if (p.j === e.courant) { deja = true; break; }
          if (!deja) { coups.push({ t: 'parier', uid: s.uid, lecture: 1 }); coups.push({ t: 'parier', uid: s.uid, lecture: 0 }); }
        }
      }
      coups.push({ t: 'renoncer' });
      return coups;
    }
    for (const carte of j.main) if (installable(e, carte)) coups.push({ t: 'installer', carte });
    for (const t of e.tendances) {
      if (t.proprio !== e.courant && t.age < P.ageVerrou && P.coutInflechir[t.age] <= j.attention) coups.push({ t: 'inflechir', id: t.id });
    }
    for (const s of e.horizon) coups.push({ t: 'veiller', uid: s.uid });
    if (j.attention > 0) {
      for (const r of e.ruptures) if (!r.prepares.includes(e.courant)) coups.push({ t: 'preparer', carte: r.carte });
    }
    if (j.main.length + P.piocheProspecter <= P.mainMax && e.piocheT.length + e.defausseT.length > 0) coups.push({ t: 'prospecter' });
    if (coups.length === 0) coups.push({ t: 'passer' });
    return coups;
  }

  function memeCoup(a: Coup, b: Coup): boolean {
    if (a.t !== b.t) return false;
    switch (a.t) {
      case 'vision': case 'installer': case 'preparer': return a.carte === (b as typeof a).carte;
      case 'inflechir': return a.id === (b as typeof a).id;
      case 'veiller': return a.uid === (b as typeof a).uid;
      case 'parier': return a.uid === (b as typeof a).uid && a.lecture === (b as typeof a).lecture;
      default: return true;
    }
  }

  function forceNette(e: Etat, axe: number): number {
    let net = 0;
    for (const t of e.tendances) if (t.axe === axe) net += t.pole === 1 ? t.force : -t.force;
    return net;
  }
  function projection(e: Etat): number[] {
    const reste = P.decennies - e.decennie;
    const out: number[] = [];
    for (let a = 0; a < NA; a++) {
      const pas = Math.max(-P.pasMaxAxe, Math.min(P.pasMaxAxe, forceNette(e, a)));
      out.push(Math.max(0, Math.min(P.pisteMax, e.axes[a] + pas * reste)));
    }
    return out;
  }
  function tension(e: Etat, carte: number): number {
    const r = C.ruptures[carte];
    return Math.max(r.tensionMin, versPole(e.axes[r.terrain.axe], r.terrain.pole) - centre);
  }
  function deplacer(e: Etat, axe: number, delta: number): void {
    e.axes[axe] = Math.max(0, Math.min(P.pisteMax, e.axes[axe] + delta));
  }
  function lectureSignal(carte: number, lecture: number): Lecture | null {
    const s = C.signaux[carte];
    return lecture === 1 ? s.haut : s.bas;
  }
  function titreTendance(t: { id: number; lecture: number }): string {
    if (t.id >= ID_SIGNAL) return lectureSignal(t.id - ID_SIGNAL, t.lecture)?.titre ?? '?';
    return C.tendances[t.id].titre;
  }

  function bilan(e: Etat, journal?: Evenement[]): void {
    journal?.push({ t: 'bilan', d: e.decennie });
    // 1. Mouvement : chaque axe avance de sa force nette, plafonnée.
    for (let a = 0; a < NA; a++) {
      const net = forceNette(e, a);
      const de = e.axes[a];
      deplacer(e, a, Math.max(-P.pasMaxAxe, Math.min(P.pasMaxAxe, net)));
      journal?.push({ t: 'mouvement', axe: a, de, a: e.axes[a], net });
    }
    // 2. Signaux proches : amplification ou extinction selon le contexte.
    const reste = [];
    for (const s of e.horizon) {
      if (s.zone !== 1) { reste.push(s); continue; }
      const carte = C.signaux[s.carte];
      let raison: 'bruit' | 'centre' | 'sansLecture' | 'voieFermee' | null = null;
      let lec = -1;
      if (carte.condition === null) raison = 'bruit';
      else {
        const v = e.axes[carte.condition];
        if (v === centre) raison = 'centre';
        else {
          lec = v > centre ? 1 : 0;
          const l = lec === 1 ? carte.haut : carte.bas;
          if (!l) raison = 'sansLecture';
          else if (e.fermees[l.axe * 2 + l.pole]) raison = 'voieFermee';
        }
      }
      for (const p of s.paris) e.joueurs[p.j].attention++;
      for (const j of e.joueurs) { const i = j.connus.indexOf(s.uid); if (i >= 0) j.connus.splice(i, 1); }
      e.signauxResolus.push(s.carte);
      if (raison) { journal?.push({ t: 'signalEteint', uid: s.uid, carte: s.carte, raison }); continue; }
      const l = (lec === 1 ? carte.haut : carte.bas) as Lecture;
      const gains: Gain[] = [];
      for (const p of s.paris) {
        if (p.lecture === lec) {
          const pts = p.precoce ? P.ptsSignalPrecoce : P.ptsSignalTardif;
          e.joueurs[p.j].anticipation += pts;
          gains.push({ j: p.j, pts });
        }
      }
      e.tendances.push({ id: ID_SIGNAL + s.carte, axe: l.axe, pole: l.pole, force: P.forceSignal, proprio: -1, age: 1, pose: e.decennie, lecture: lec });
      journal?.push({ t: 'signalAmplifie', uid: s.uid, carte: s.carte, lecture: lec, gains });
      if (chocSignal > 0) {
        const de = e.axes[l.axe];
        deplacer(e, l.axe, l.pole === 1 ? chocSignal : -chocSignal);
        journal?.push({ t: 'deplacement', axe: l.axe, de, a: e.axes[l.axe] });
      }
    }
    e.horizon = reste;
    // 3. Ruptures latentes : un dé contre la tension du terrain.
    const latentes = [];
    for (const r of e.ruptures) {
      const carte = C.ruptures[r.carte];
      const tens = tension(e, r.carte);
      const de = 1 + Math.floor(alea(e) * P.facesDe);
      const declenchee = de <= tens;
      journal?.push({ t: 'ruptureDe', carte: r.carte, tension: tens, de, declenchee });
      if (!declenchee) {
        r.age++;
        if (r.age >= 2) {
          for (const j of r.prepares) e.joueurs[j].attention++;
          journal?.push({ t: 'ruptureDissipee', carte: r.carte });
        } else latentes.push(r);
        continue;
      }
      const gains: Gain[] = [];
      for (const j of r.prepares) { e.joueurs[j].attention++; e.joueurs[j].anticipation += P.ptsRupture; gains.push({ j, pts: P.ptsRupture }); }
      journal?.push({ t: 'rupture', carte: r.carte, gains });
      for (const ef of carte.effets) {
        if (ef.type === 'deplacer') {
          const de2 = e.axes[ef.axe];
          deplacer(e, ef.axe, ef.pole === 1 ? ef.n : -ef.n);
          journal?.push({ t: 'deplacement', axe: ef.axe, de: de2, a: e.axes[ef.axe] });
        } else if (ef.type === 'purger') {
          const ids: number[] = [];
          for (let k = 0; k < ef.n; k++) {
            // la plus ancienne d'abord (ordre de pose)
            const i = e.tendances.findIndex((t) => t.axe === ef.axe && t.pole === ef.pole);
            if (i < 0) break;
            const t = e.tendances[i];
            e.tendances.splice(i, 1);
            if (t.id < ID_SIGNAL) e.defausseT.push(t.id);
            ids.push(t.id);
          }
          if (ids.length) journal?.push({ t: 'purge', ids });
        } else {
          for (const j of e.joueurs) {
            const n = j.main.length;
            for (const c of j.main) e.defausseT.push(c);
            j.main = [];
            completerMain(e, j, n);
          }
          journal?.push({ t: 'rebattre' });
        }
      }
    }
    e.ruptures = latentes;
    // 4. Bascules : un axe en bout de piste ferme pour de bon la voie opposée.
    for (let a = 0; a < NA; a++) {
      const v = e.axes[a];
      const ferme = v === P.pisteMax ? 0 : v === 0 ? 1 : -1;
      if (ferme >= 0 && !e.fermees[a * 2 + ferme]) {
        e.fermees[a * 2 + ferme] = true;
        const morte = (c: number) => C.tendances[c].axe === a && C.tendances[c].pole === ferme;
        e.piocheT = e.piocheT.filter((c) => !morte(c));
        e.defausseT = e.defausseT.filter((c) => !morte(c));
        for (const j of e.joueurs) j.main = j.main.filter((c) => !morte(c));
        journal?.push({ t: 'bascule', axe: a, poleFerme: ferme });
      }
    }
    // 5. Ancrage : les tendances vieillissent, les signaux lointains se rapprochent, l'attention dépensée revient.
    const verrous: number[] = [];
    for (const t of e.tendances) {
      if (t.age < P.ageVerrou) { t.age++; if (t.age === P.ageVerrou) verrous.push(t.id); }
    }
    if (verrous.length) journal?.push({ t: 'verrou', ids: verrous });
    for (const s of e.horizon) s.zone = 1;
    for (const j of e.joueurs) { j.attention += j.depense; j.depense = 0; }
    e.histoire.push(e.axes.slice());
    e.decennie++;
    if (e.decennie >= P.decennies) {
      e.phase = 'fin';
      journal?.push({ t: 'fin' });
    } else {
      e.premier = (e.premier + 1) % e.nbJoueurs;
      debutDecennie(e, journal);
    }
  }

  function avancer(e: Etat, journal?: Evenement[]): void {
    e.rang++;
    if (e.rang >= e.nbJoueurs) { e.rang = 0; e.tour++; }
    if (e.tour >= actionsParDecennie(e.nbJoueurs)) { bilan(e, journal); return; }
    e.courant = (e.premier + e.rang) % e.nbJoueurs;
    e.phase = 'actions';
  }

  function jouerEnPlace(e: Etat, c: Coup, journal?: Evenement[]): void {
    const jc = e.courant;
    const j = e.joueurs[jc];
    e.nbCoups++;
    switch (c.t) {
      case 'vision': {
        j.vision = c.carte;
        journal?.push({ t: 'vision', j: jc });
        if (jc + 1 < e.nbJoueurs) e.courant = jc + 1;
        else debutDecennie(e, journal);
        return;
      }
      case 'installer': {
        const carte = C.tendances[c.carte];
        j.main.splice(j.main.indexOf(c.carte), 1);
        e.tendances.push({ id: c.carte, axe: carte.axe, pole: carte.pole, force: carte.force, proprio: jc, age: 0, pose: e.decennie, lecture: -1 });
        journal?.push({ t: 'installer', j: jc, carte: c.carte });
        break;
      }
      case 'inflechir': {
        const i = e.tendances.findIndex((t) => t.id === c.id);
        const t = e.tendances[i];
        const cout = P.coutInflechir[t.age];
        j.attention -= cout; j.depense += cout;
        e.tendances.splice(i, 1);
        if (t.id < ID_SIGNAL) e.defausseT.push(t.id);
        journal?.push({ t: 'inflechir', j: jc, id: c.id, proprio: t.proprio });
        break;
      }
      case 'veiller': {
        if (!j.connus.includes(c.uid)) j.connus.push(c.uid);
        journal?.push({ t: 'veiller', j: jc, uid: c.uid });
        e.phase = 'veille';
        return;
      }
      case 'parier': {
        const s = e.horizon.find((x) => x.uid === c.uid)!;
        const precoce = s.zone === 0;
        s.paris.push({ j: jc, lecture: c.lecture, precoce });
        j.attention--;
        journal?.push({ t: 'parier', j: jc, uid: c.uid, lecture: c.lecture, precoce });
        break;
      }
      case 'renoncer':
        journal?.push({ t: 'renoncer', j: jc });
        break;
      case 'preparer': {
        const r = e.ruptures.find((x) => x.carte === c.carte)!;
        r.prepares.push(jc);
        j.attention--;
        journal?.push({ t: 'preparer', j: jc, carte: c.carte });
        break;
      }
      case 'prospecter': {
        const n = completerMain(e, j, j.main.length + P.piocheProspecter);
        journal?.push({ t: 'prospecter', j: jc, n });
        break;
      }
      case 'passer':
        journal?.push({ t: 'passer', j: jc });
        break;
    }
    avancer(e, journal);
  }

  function jouer(e: Etat, c: Coup, journal?: Evenement[]): Etat {
    const legaux = coupsLegaux(e);
    if (!legaux.some((l) => memeCoup(l, c))) throw new Error('Coup illégal : ' + JSON.stringify(c));
    const s = cloner(e);
    jouerEnPlace(s, c, journal);
    return s;
  }

  function scores(e: Etat): Score[] {
    const out: Score[] = [];
    for (let jc = 0; jc < e.nbJoueurs; jc++) {
      const j = e.joueurs[jc];
      let vision = 0;
      if (j.vision >= 0) {
        const v = C.visions[j.vision];
        vision += P.ptsVisionPrincipal * Math.max(0, versPole(e.axes[v.principal.axe], v.principal.pole) - centre);
        vision += P.ptsVisionSecondaire * Math.max(0, versPole(e.axes[v.secondaire.axe], v.secondaire.pole) - centre);
      }
      let heritage = 0;
      for (const t of e.tendances) if (t.proprio === jc && penche(e, t.axe, t.pole)) heritage += P.ptsHeritage;
      out.push({ vision, heritage, anticipation: j.anticipation, total: vision + heritage + j.anticipation });
    }
    return out;
  }
  function gagnants(e: Etat): number[] {
    const sc = scores(e);
    let best: number[] = [];
    let bt = -1, ba = -1;
    for (let j = 0; j < sc.length; j++) {
      const s = sc[j];
      if (s.total > bt || (s.total === bt && s.anticipation > ba)) { best = [j]; bt = s.total; ba = s.anticipation; }
      else if (s.total === bt && s.anticipation === ba) best.push(j);
    }
    return best;
  }

  function typeSociete(axes: number[]): number {
    let best = 0, bd = 1; // en deçà de 2 cases d'écart : équilibre
    for (let a = 0; a < NA; a++) {
      const d = Math.abs(axes[a] - centre);
      if (d > bd) { bd = d; best = 1 + a * 2 + (axes[a] > centre ? 1 : 0); }
    }
    return best;
  }

  function observer(e: Etat, moi: number): Etat {
    const o = cloner(e);
    o.rng = 0;
    o.piocheT = o.piocheT.map(() => -1);
    o.piocheS = o.piocheS.map(() => -1);
    o.piocheR = o.piocheR.map(() => -1);
    o.piocheV = o.piocheV.map(() => -1);
    const connus = e.joueurs[moi].connus;
    for (const s of o.horizon) if (!connus.includes(s.uid)) s.carte = -1;
    if (e.phase !== 'fin') {
      for (let j = 0; j < o.nbJoueurs; j++) {
        if (j === moi) continue;
        const x = o.joueurs[j];
        x.main = x.main.map(() => -1);
        x.choixVisions = x.choixVisions.map(() => -1);
        x.vision = x.vision >= 0 ? -2 : -1; // -2 : choisie mais secrète
        x.connus = [];
      }
    }
    return o;
  }

  function verifier(e: Etat): string[] {
    const err: string[] = [];
    for (let a = 0; a < NA; a++) if (!(e.axes[a] >= 0 && e.axes[a] <= P.pisteMax) || !Number.isInteger(e.axes[a])) err.push('axe hors piste ' + a);
    const vu = new Map<number, number>();
    const voir = (c: number) => vu.set(c, (vu.get(c) ?? 0) + 1);
    e.piocheT.forEach(voir); e.defausseT.forEach(voir);
    for (const j of e.joueurs) j.main.forEach(voir);
    for (const t of e.tendances) if (t.id < ID_SIGNAL) voir(t.id);
    for (let c = 0; c < C.tendances.length; c++) {
      const n = vu.get(c) ?? 0;
      const ferme = e.fermees[C.tendances[c].axe * 2 + C.tendances[c].pole];
      if (n > 1) err.push('carte tendance dupliquée ' + c);
      if (n === 0 && !ferme) err.push('carte tendance perdue ' + c);
    }
    for (let jc = 0; jc < e.nbJoueurs; jc++) {
      const j = e.joueurs[jc];
      let n = j.attention + j.depense;
      for (const s of e.horizon) for (const p of s.paris) if (p.j === jc) n++;
      for (const r of e.ruptures) if (r.prepares.includes(jc)) n++;
      if (n !== P.jetonsAttention) err.push(`attention joueur ${jc} : ${n}`);
      if (j.attention < 0) err.push('attention négative');
      if (j.main.length > P.mainMax) err.push('main trop grande');
      if (j.anticipation < 0) err.push('anticipation négative');
    }
    if (e.ruptures.length > P.rupturesLatentesMax) err.push('trop de ruptures latentes');
    const ids = new Set<number>();
    for (const t of e.tendances) { if (ids.has(t.id)) err.push('tendance en double ' + t.id); ids.add(t.id); }
    if (e.phase !== 'fin' && coupsLegaux(e).length === 0) err.push('aucun coup légal');
    if (e.phase === 'fin' && e.histoire.length !== P.decennies + 1) err.push('histoire incomplète');
    return err;
  }

  return { contenu: C, params: P, centre, creerPartie, coupsLegaux, jouer, jouerEnPlace, scores, gagnants, forceNette, projection, tension, typeSociete, observer, verifier, memeCoup, lectureSignal, titreTendance, actionsParDecennie };
}
