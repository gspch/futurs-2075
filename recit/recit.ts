// Mise en mots des coups et des événements : journal de partie, récit de la trajectoire 2025-2075.
// Partagé par le jeu web et les outils de documentation. Aucune règle ici : seulement des phrases.
import type { Contenu, Coup, Etat, Evenement, Score } from '../moteur/src/types';
import { ID_SIGNAL } from '../moteur/src/moteur';

export const ANNEE0 = 2025;
export const anneeDebut = (d: number) => ANNEE0 + 10 * d;
export const libelleDecennie = (d: number) => `${anneeDebut(d)}-${anneeDebut(d + 1)}`;
export const FLECHE = ['◀', '▶'];
export const NOMS_AGE = ['émergente', 'installée', 'verrouillée'];

export function nomPole(C: Contenu, axe: number, pole: number): string { return C.axes[axe].poles[pole]; }
export function ciblePole(C: Contenu, axe: number, pole: number): string { return `${C.axes[axe].nom} ${FLECHE[pole]} ${nomPole(C, axe, pole)}`; }

export function titreTendance(C: Contenu, id: number, lecture = -1): string {
  if (id >= ID_SIGNAL) {
    const s = C.signaux[id - ID_SIGNAL];
    return (lecture === 1 ? s.haut : s.bas)?.titre ?? s.titre;
  }
  return C.tendances[id].titre;
}

/** Description courte d'un coup, du point de vue de celui qui le joue (il voit ses propres cartes). */
export function decrireCoup(C: Contenu, e: Etat, c: Coup): string {
  switch (c.t) {
    case 'vision': return `Choisir la vision « ${C.visions[c.carte].titre} »`;
    case 'installer': { const t = C.tendances[c.carte]; return `Installer « ${t.titre} » (${ciblePole(C, t.axe, t.pole)}, force ${t.force})`; }
    case 'inflechir': { const t = e.tendances.find((x) => x.id === c.id); return `Infléchir « ${titreTendance(C, c.id, t?.lecture)} »`; }
    case 'veiller': { const i = e.horizon.findIndex((s) => s.uid === c.uid); return `Veiller le signal n° ${i + 1}`; }
    case 'parier': { const i = e.horizon.findIndex((s) => s.uid === c.uid); return `Parier sur la lecture ${c.lecture === 1 ? '▲ haute' : '▼ basse'} du signal n° ${i + 1}`; }
    case 'renoncer': return 'Ne pas parier';
    case 'preparer': return `Se préparer à « ${C.ruptures[c.carte].titre} »`;
    case 'prospecter': return 'Prospecter (piocher des tendances)';
    case 'passer': return 'Passer';
  }
}

/** Une ligne de journal par événement. `noms` = noms des joueurs. Renvoie null pour les événements muets. */
export function decrireEvenement(C: Contenu, ev: Evenement, noms: string[]): string | null {
  const gains = (g: { j: number; pts: number }[]) => (g.length ? ' ' + g.map((x) => `${noms[x.j]} +${x.pts}`).join(', ') + '.' : '');
  switch (ev.t) {
    case 'decennie': return `— Décennie ${libelleDecennie(ev.d)} — ${noms[ev.premier]} ouvre le tour.`;
    case 'ruptureRevelee': return `Rupture latente révélée : « ${C.ruptures[ev.carte].titre} ».`;
    case 'signauxPoses': return `${ev.n} signaux faibles apparaissent ${ev.zone === 0 ? 'au lointain' : 'tout proches'}.`;
    case 'vision': return `${noms[ev.j]} choisit en secret sa vision du futur souhaitable.`;
    case 'installer': { const t = C.tendances[ev.carte]; return `${noms[ev.j]} installe « ${t.titre} » (${ciblePole(C, t.axe, t.pole)}${t.force > 1 ? ', force ' + t.force : ''}).`; }
    case 'inflechir': return `${noms[ev.j]} infléchit « ${titreTendance(C, ev.id, 0)} »${ev.proprio >= 0 ? `, installée par ${noms[ev.proprio]}` : ''} : la tendance est défaussée.`;
    case 'veiller': return `${noms[ev.j]} veille : un signal est regardé en secret.`;
    case 'parier': return `${noms[ev.j]} parie sur une lecture ${ev.lecture === 1 ? '▲ haute' : '▼ basse'}${ev.precoce ? ' (pari précoce)' : ''}.`;
    case 'renoncer': return `${noms[ev.j]} ne parie pas.`;
    case 'preparer': return `${noms[ev.j]} se prépare à « ${C.ruptures[ev.carte].titre} ».`;
    case 'prospecter': return `${noms[ev.j]} prospecte (${ev.n} carte${ev.n > 1 ? 's' : ''}).`;
    case 'passer': return `${noms[ev.j]} passe.`;
    case 'bilan': return `Bilan de la décennie ${libelleDecennie(ev.d)}.`;
    case 'mouvement': {
      if (ev.de === ev.a) return ev.net === 0 ? null : `${C.axes[ev.axe].nom} : poussée vers ${nomPole(C, ev.axe, ev.net > 0 ? 1 : 0)}, mais l’axe est en bout de piste.`;
      return `${C.axes[ev.axe].nom} : ${ev.de} → ${ev.a}, vers ${nomPole(C, ev.axe, ev.a > ev.de ? 1 : 0)} (force nette ${Math.abs(ev.net)}).`;
    }
    case 'signalAmplifie': {
      const s = C.signaux[ev.carte]; const l = (ev.lecture === 1 ? s.haut : s.bas)!;
      return `Le signal « ${s.titre} » s’amplifie (lecture ${ev.lecture === 1 ? '▲' : '▼'}) : naissance de la tendance « ${l.titre} » (${ciblePole(C, l.axe, l.pole)}).${gains(ev.gains)}`;
    }
    case 'signalEteint': {
      const s = C.signaux[ev.carte];
      const r = { bruit: 'ce n’était que du bruit', centre: 'le contexte est resté indécis', sansLecture: 'le contexte ne lui a pas été favorable', voieFermee: 'la voie qu’il ouvrait est fermée' }[ev.raison];
      return `Le signal « ${s.titre} » s’éteint : ${r}.`;
    }
    case 'ruptureDe': return `« ${C.ruptures[ev.carte].titre} » : tension ${ev.tension}, dé ${ev.de} → ${ev.declenchee ? 'RUPTURE' : 'rien ne se passe'}.`;
    case 'rupture': return `RUPTURE : « ${C.ruptures[ev.carte].titre} ». ${C.ruptures[ev.carte].texte}${gains(ev.gains)}`;
    case 'ruptureDissipee': return `La menace « ${C.ruptures[ev.carte].titre} » se dissipe.`;
    case 'deplacement': return ev.de === ev.a ? null : `${C.axes[ev.axe].nom} : ${ev.de} → ${ev.a} d’un coup.`;
    case 'purge': return `Tendances balayées : ${ev.ids.map((id) => `« ${titreTendance(C, id, 0)} »`).join(', ')}.`;
    case 'rebattre': return 'Toutes les mains sont défaussées et repiochées.';
    case 'bascule': return `BASCULE : ${C.axes[ev.axe].nom} a franchi le point de non-retour. La voie « ${nomPole(C, ev.axe, ev.poleFerme)} » est fermée pour de bon.`;
    case 'verrou': return `${ev.ids.length} tendance${ev.ids.length > 1 ? 's se verrouillent' : ' se verrouille'}.`;
    case 'fin': return 'Nous sommes en 2075. La partie est terminée.';
  }
}

export interface ChapitreRecit { titre: string; paragraphes: string[]; axes: number[] }

const liste = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1]);

/** Récit de la trajectoire, décennie par décennie, à partir du journal complet d'une partie. */
export function racconter(C: Contenu, journal: Evenement[], noms: string[], histoire: number[][]): ChapitreRecit[] {
  const chapitres: ChapitreRecit[] = [];
  let d = -1;
  let installees: { j: number; carte: number }[] = [];
  let inflechies = 0;
  let courant: string[] = [];
  const clore = () => {
    if (d < 0) return;
    chapitres.push({ titre: libelleDecennie(d), paragraphes: courant, axes: histoire[d + 1] ?? histoire[histoire.length - 1] });
  };
  for (const ev of journal) {
    if (ev.t === 'decennie') { clore(); d = ev.d; installees = []; inflechies = 0; courant = []; continue; }
    if (d < 0) continue;
    if (ev.t === 'installer') installees.push({ j: ev.j, carte: ev.carte });
    else if (ev.t === 'inflechir') inflechies++;
    else if (ev.t === 'bilan') {
      if (installees.length) {
        const parPole = new Map<number, string[]>();
        for (const x of installees) { const t = C.tendances[x.carte]; const k = t.axe * 2 + t.pole; parPole.set(k, [...(parPole.get(k) ?? []), t.titre.toLowerCase()]); }
        const morceaux = [...parPole.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([k, ts]) => `${liste(ts.slice(0, 3))} du côté ${nomPole(C, k >> 1, k & 1)}`);
        courant.push(`Les forces lourdes s’installent : ${morceaux.join(' ; ')}.` + (inflechies ? ` ${inflechies} tendance${inflechies > 1 ? 's sont' : ' est'} infléchie${inflechies > 1 ? 's' : ''} avant d’avoir pris racine.` : ''));
      } else courant.push('Décennie d’attente : personne n’engage de force nouvelle.');
    } else if (ev.t === 'mouvement' && ev.de !== ev.a) {
      // regroupé plus bas via l'histoire
    } else if (ev.t === 'signalAmplifie') {
      const s = C.signaux[ev.carte]; const l = (ev.lecture === 1 ? s.haut : s.bas)!;
      const qui = ev.gains.length ? ` ${liste(ev.gains.map((g) => noms[g.j]))} l’avai${ev.gains.length > 1 ? 'en' : ''}t vu venir.` : ' Personne ne l’avait vu venir.';
      courant.push(`Un signal faible devient une force : « ${s.titre} » débouche sur « ${l.titre} », qui pousse vers ${nomPole(C, l.axe, l.pole)}.${qui}`);
    } else if (ev.t === 'rupture') {
      const r = C.ruptures[ev.carte];
      const qui = ev.gains.length ? ` ${liste(ev.gains.map((g) => noms[g.j]))} s’y étai${ev.gains.length > 1 ? 'en' : ''}t préparé${ev.gains.length > 1 ? 's' : ''}.` : ' Nul ne s’y était préparé.';
      courant.push(`RUPTURE — ${r.titre}. ${r.texte}${qui}`);
    } else if (ev.t === 'bascule') {
      courant.push(`Point de non-retour : la voie « ${nomPole(C, ev.axe, ev.poleFerme)} » se ferme pour de bon. Le monde a choisi ${nomPole(C, ev.axe, 1 - ev.poleFerme)}.`);
    }
  }
  clore();
  // phrase de mouvement par chapitre, d'après l'histoire des axes
  chapitres.forEach((ch, i) => {
    const avant = histoire[i], apres = histoire[i + 1];
    if (!avant || !apres) return;
    const mv: string[] = [];
    for (let a = 0; a < C.axes.length; a++) if (apres[a] !== avant[a]) mv.push(`${C.axes[a].nom.toLowerCase()} glisse vers ${nomPole(C, a, apres[a] > avant[a] ? 1 : 0)}`);
    ch.paragraphes.splice(1, 0, mv.length ? `En ${anneeDebut(i + 1)}, ${liste(mv)}.` : `En ${anneeDebut(i + 1)}, rien n’a vraiment bougé : les forces se neutralisent.`);
  });
  return chapitres;
}

/** Portrait de la société de 2075. */
export function portrait(C: Contenu, type: number, axes: number[], centre: number): string {
  const t = C.types[type];
  const traits: string[] = [];
  for (let a = 0; a < C.axes.length; a++) {
    const d = axes[a] - centre;
    if (d === 0) continue;
    const force = Math.abs(d) >= 4 ? 'résolument' : Math.abs(d) >= 2 ? 'nettement' : 'légèrement';
    traits.push(`${force} du côté ${nomPole(C, a, d > 0 ? 1 : 0)}`);
  }
  return `${t.nom}. ${t.texte}` + (traits.length ? ` En 2075, le monde est ${liste(traits)}.` : ' En 2075, le monde n’a tranché sur rien.');
}

export function decrireScore(s: Score): string { return `${s.total} points (vision ${s.vision}, héritage ${s.heritage}, anticipation ${s.anticipation})`; }

// ---------- Texte de règle des cartes (généré depuis les données : identique sur le web et dans les PDF) ----------

export function effetTendance(C: Contenu, i: number): string {
  const t = C.tendances[i];
  let s = `À chaque bilan, pousse ${C.axes[t.axe].nom} vers ${nomPole(C, t.axe, t.pole)} (force ${t.force}).`;
  if (t.prerequis) s += ` Prérequis : ${C.axes[t.prerequis.axe].nom} penche déjà vers ${nomPole(C, t.prerequis.axe, t.prerequis.pole)}.`;
  return s;
}
export function effetSignal(C: Contenu, i: number): { contexte: string; haut: string; bas: string } {
  const s = C.signaux[i];
  if (s.condition === null) return { contexte: 'Bruit', haut: 'Ce signal ne s’amplifie jamais.', bas: 'Tout pari sur lui est perdu.' };
  const ax = C.axes[s.condition];
  const lec = (l: typeof s.haut) => (l ? `« ${l.titre} » → ${ciblePole(C, l.axe, l.pole)}` : 's’éteint');
  return { contexte: `Contexte : ${ax.nom}`, haut: `▲ si ${ax.nom} penche vers ${ax.poles[1]} : ${lec(s.haut)}`, bas: `▼ si ${ax.nom} penche vers ${ax.poles[0]} : ${lec(s.bas)}` };
}
export function effetRupture(C: Contenu, i: number): { terrain: string; effets: string[] } {
  const r = C.ruptures[i];
  const terrain = `Terrain : ${ciblePole(C, r.terrain.axe, r.terrain.pole)}. Tension = cases au-delà du centre vers ${nomPole(C, r.terrain.axe, r.terrain.pole)}${r.tensionMin > 0 ? ` (au minimum ${r.tensionMin})` : ''}.`;
  const effets = r.effets.map((ef) => {
    if (ef.type === 'deplacer') return `${C.axes[ef.axe].nom} recule de ${ef.n} case${ef.n > 1 ? 's' : ''} vers ${nomPole(C, ef.axe, ef.pole)}`;
    if (ef.type === 'purger') return `défaussez ${ef.n > 1 ? `les ${ef.n} plus anciennes tendances` : 'la plus ancienne tendance'} ${nomPole(C, ef.axe, ef.pole)}, même verrouillée${ef.n > 1 ? 's' : ''}`;
    return 'chacun défausse sa main et repioche autant de cartes';
  });
  return { terrain, effets };
}
export function effetVision(C: Contenu, i: number): { principal: string; secondaire: string } {
  const v = C.visions[i] as unknown as { principal: { axe: number; pole: number; case?: number }; secondaire: { axe: number; pole: number; case?: number } };
  const f = (x: { axe: number; pole: number; case?: number }) => (x.case === undefined ? ciblePole(C, x.axe, x.pole) : `${C.axes[x.axe].nom} en case ${x.case} (${nomPole(C, x.axe, x.pole)})`);
  return { principal: f(v.principal), secondaire: f(v.secondaire) };
}
