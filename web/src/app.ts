// Aiguillages — application web. Aucune règle ici : tout passe par le moteur (coupsLegaux / jouer).
import './style.css';
import { CONTENU as C, PARAMETRES as P } from '../../contenu';
import { creerMoteur, ID_SIGNAL } from '../../moteur/src/moteur';
import type { Coup, Etat, Evenement } from '../../moteur/src/types';
import { decrireEvenement, racconter, portrait, libelleDecennie, anneeDebut, titreTendance, nomPole, NOMS_AGE, FLECHE, effetTendance } from '../../recit/recit';
import { logo, pictoAxe, pictoType, COULEURS_JOUEURS, FORMES_JOUEURS, COULEURS_AXES } from '../../recit/visuel';
import { carteTendance, carteSignal, carteSignalCachee, carteRupture, carteVision, esc } from './cartes';
import { encoderPartie, decoderPartie, encoderCoup, decoderCoup, type TypeSiege } from './partage';
import { ETAPES_TUTO, type EtapeTuto } from './tutoriel';

const m = creerMoteur(C, P);
const DEPOT = 'https://github.com/gspch/futurs-2075';
const NIVEAUX: Record<TypeSiege, string> = { H: 'Humain', F: 'Bot facile', M: 'Bot moyen', D: 'Bot difficile' };

type Selection = { k: 'main' | 'tendance' | 'signal' | 'rupture' | 'vision'; id: number } | null;
interface UI {
  ecran: 'accueil' | 'jeu' | 'fin';
  sieges: TypeSiege[];
  noms: string[];
  graine: number;
  coups: Coup[];
  etat: Etat;
  journal: Evenement[];
  vue: number;
  passage: boolean;
  selection: Selection;
  bilan: Evenement[] | null;
  modale: 'journal' | 'partage' | 'aide' | null;
  revue: number | null;
  tuto: number | null;
  message: string;
  formulaire: { nb: number; sieges: TypeSiege[]; noms: string[]; graine: string };
}

const ui: UI = {
  ecran: 'accueil', sieges: [], noms: [], graine: 0, coups: [], etat: m.creerPartie({ nbJoueurs: 2, graine: 1 }), journal: [], vue: 0, passage: false,
  selection: null, bilan: null, modale: null, revue: null, tuto: null, message: '',
  formulaire: { nb: 3, sieges: ['H', 'M', 'M', 'M', 'M'], noms: ['Vous', 'Ada', 'Basile', 'Chloé', 'Diego'], graine: '' },
};
const racine = document.getElementById('app')!;

// ---------- Bots (Web Worker) ----------
const worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
let demandeBot = 0;
worker.onmessage = (ev: MessageEvent<{ id: number; coup: Coup }>) => {
  if (ev.data.id !== demandeBot || ui.ecran !== 'jeu' || ui.revue !== null) return;
  demandeBot = 0;
  appliquer(ev.data.coup);
};
function demanderBot(): void {
  if (demandeBot || ui.ecran !== 'jeu' || ui.revue !== null || ui.bilan || ui.etat.phase === 'fin') return;
  const jc = ui.etat.courant;
  const type = ui.sieges[jc];
  if (type === 'H') return;
  const id = (demandeBot = ui.coups.length + 1 + Math.floor(Math.random() * 1e6) * 1000);
  const msg = { id, obs: m.observer(ui.etat, jc), coups: m.coupsLegaux(ui.etat), moi: jc, niveau: 'FMD'.indexOf(type), graine: (ui.graine ^ Math.imul(ui.coups.length + 7, 0x9e3779b1)) | 0 };
  window.setTimeout(() => worker.postMessage(msg), ui.etat.phase === 'visions' ? 150 : 650);
}

// ---------- Déroulement ----------
const estHumain = (j: number) => ui.sieges[j] === 'H';
const nbHumains = () => ui.sieges.filter((s) => s === 'H').length;

function nouvellePartie(sieges: TypeSiege[], noms: string[], graine: number, tuto = false): void {
  ui.sieges = sieges; ui.noms = noms; ui.graine = graine; ui.coups = []; ui.journal = [];
  ui.etat = m.creerPartie({ nbJoueurs: sieges.length, graine });
  ui.ecran = 'jeu'; ui.selection = null; ui.bilan = null; ui.modale = null; ui.revue = null; ui.message = '';
  ui.tuto = tuto ? 0 : null;
  ui.vue = Math.max(0, sieges.indexOf('H'));
  ui.passage = nbHumains() > 1;
  demandeBot = 0;
  history.replaceState(null, '', location.pathname + location.search);
  suite();
}

function appliquer(c: Coup): void {
  const lot: Evenement[] = [];
  try { ui.etat = m.jouer(ui.etat, c, lot); } catch (e) { ui.message = String((e as Error).message); rendre(); return; }
  ui.coups.push(c);
  ui.journal.push(...lot);
  ui.selection = null; ui.message = '';
  const ib = lot.findIndex((x) => x.t === 'bilan');
  if (ib >= 0) ui.bilan = lot.slice(ib);
  if (ui.tuto !== null) avancerTuto(c, ib >= 0);
  suite();
}

function suite(): void {
  const e = ui.etat;
  if (e.phase === 'fin' && !ui.bilan) { ui.ecran = 'fin'; ui.revue = null; ui.selection = null; rendre(); return; }
  if (e.phase !== 'fin' && estHumain(e.courant)) {
    if (ui.vue !== e.courant) { if (nbHumains() > 1) ui.passage = true; ui.vue = e.courant; }
    if (e.phase === 'veille') { const u = e.joueurs[e.courant].connus[e.joueurs[e.courant].connus.length - 1]; if (ui.selection?.k !== 'signal') ui.selection = { k: 'signal', id: u }; }
  }
  rendre();
  demanderBot();
}

function avancerTuto(c: Coup, bilan: boolean): void {
  if (ui.tuto === null) return;
  if (coupEstHumain) {
    // les étapes purement explicatives sont considérées comme lues dès que le joueur agit
    while (ETAPES_TUTO[ui.tuto] && !ETAPES_TUTO[ui.tuto].attend && ETAPES_TUTO[ui.tuto].id !== 'bilan') ui.tuto++;
    const et = ETAPES_TUTO[ui.tuto];
    if (et?.attend && et.attend(c)) ui.tuto++;
  }
  if (bilan) { const i = ETAPES_TUTO.findIndex((x) => x.id === 'bilan'); if (i >= 0 && ui.tuto <= i) ui.tuto = i; }
  if (ui.tuto >= ETAPES_TUTO.length) ui.tuto = null;
}
let coupEstHumain = false;

// ---------- Aides de rendu ----------
const jeton = (j: number, petit = false) => `<span class="jeton-j" style="background:${COULEURS_JOUEURS[j]}${petit ? ';font-size:.7em' : ''}" title="${esc(ui.noms[j])}">${FORMES_JOUEURS[j]}</span>`;
const enc = (c: Coup) => encoderCoup(c);

function etatAffiche(): { e: Etat; complet: boolean } {
  if (ui.revue !== null) return { e: etatsRevue()[ui.revue], complet: true };
  if (ui.etat.phase === 'fin') return { e: ui.etat, complet: true };
  return { e: m.observer(ui.etat, ui.vue), complet: false };
}
let cacheRevue: { n: number; etats: Etat[] } | null = null;
function etatsRevue(): Etat[] {
  if (cacheRevue && cacheRevue.n === ui.coups.length) return cacheRevue.etats;
  const etats = [m.creerPartie({ nbJoueurs: ui.sieges.length, graine: ui.graine })];
  for (const c of ui.coups) etats.push(m.jouer(etats[etats.length - 1], c));
  cacheRevue = { n: ui.coups.length, etats };
  return etats;
}
function legaux(): Coup[] {
  if (ui.revue !== null || ui.passage || ui.bilan || ui.etat.phase === 'fin' || !estHumain(ui.etat.courant) || ui.vue !== ui.etat.courant) return [];
  let l = m.coupsLegaux(ui.etat);
  if (ui.tuto !== null) { const et = ETAPES_TUTO[ui.tuto]; if (et?.attend) { const f = l.filter(et.attend); if (f.length) l = f; } }
  return l;
}
const aCoup = (l: Coup[], c: Coup) => l.some((x) => m.memeCoup(x, c));

function cibleVision(e: Etat, axe: number): { p: number | null; s: number | null } {
  const v = e.joueurs[ui.vue]?.vision;
  if (ui.revue !== null || v === undefined || v < 0) return { p: null, s: null };
  const vis = C.visions[v];
  return { p: vis.principal.axe === axe ? vis.principal.case : null, s: vis.secondaire.axe === axe ? vis.secondaire.case : null };
}

function rendreAxe(e: Etat, a: number, l: Coup[]): string {
  const ax = C.axes[a];
  const net = m.forceNette(e, a);
  const proj = m.projection(e)[a];
  const cv = cibleVision(e, a);
  const seuil = (P.seuilBascule as number) ?? m.centre;
  let cases = '';
  for (let i = 0; i <= P.pisteMax; i++) {
    const cls = ['case', i === m.centre ? 'centre' : '', Math.abs(i - m.centre) === seuil ? 'seuil' : ''].join(' ');
    let dedans = `${i}`;
    if (e.axes[a] === i) dedans += `<span class="pion" title="Position actuelle : ${i}">${i}</span>`;
    else if (proj === i && e.phase !== 'fin') dedans += `<span class="proj" title="Futur probable : case ${i} en 2075 si rien ne change">2075?</span>`;
    if (cv.p === i) dedans += `<span class="cible" title="Votre vision principale vise cette case">★</span>`;
    if (cv.s === i) dedans += `<span class="cible" title="Votre vision secondaire vise cette case">☆</span>`;
    cases += `<div class="${cls}">${dedans}</div>`;
  }
  const cote = (pole: number) => {
    const ts = e.tendances.filter((t) => t.axe === a && t.pole === pole);
    const somme = ts.reduce((s, t) => s + t.force, 0);
    const puces = ts.map((t) => {
      const sel = ui.selection?.k === 'tendance' && ui.selection.id === t.id;
      const titre = titreTendance(C, t.id, t.lecture);
      const infl = aCoup(l, { t: 'inflechir', id: t.id });
      return `<button type="button" class="puce age${t.age} ${sel ? 'sel' : ''}" data-a="sel" data-k="tendance" data-id="${t.id}" title="${esc(titre)} — ${NOMS_AGE[t.age]}, force ${t.force}${infl ? ' — peut être infléchie' : ''}">${t.proprio >= 0 ? jeton(t.proprio, true) : pictoType('signal', 'currentColor', 13)}<span class="titre">${esc(titre)}</span>${t.force > 1 ? `<span class="f2">×${t.force}</span>` : ''}<span aria-hidden="true">${['◌', '◐', '🔒'][t.age]}</span><span class="sr">${NOMS_AGE[t.age]}</span></button>`;
    }).join('');
    const titre = `${pole === 0 ? FLECHE[0] + ' ' : ''}${esc(ax.poles[pole])}${pole === 1 ? ' ' + FLECHE[1] : ''} <span title="force totale">(${somme})</span>${e.fermees[a * 2 + pole] ? ' <span class="fermee">voie fermée</span>' : ''}`;
    return `<div class="cote ${pole ? 'haut' : 'bas'}"><h3>${titre}</h3><div class="puces">${puces}</div></div>`;
  };
  const sens = net === 0 ? 'forces à l’équilibre' : `poussée vers ${ax.poles[net > 0 ? 1 : 0]} (force nette ${Math.abs(net)})`;
  return `<section class="axe a${a}" aria-label="Axe ${esc(ax.nom)}"><header>${pictoAxe(a, COULEURS_AXES[a], 20)} ${esc(ax.nom)} <span class="question">${esc(ax.question)}</span><span class="net">${sens}</span></header>
    <div class="piste" role="img" aria-label="${esc(ax.nom)} : case ${e.axes[a]} sur ${P.pisteMax}, futur probable ${proj}">${cases}</div>
    <div class="cotes">${cote(0)}${cote(1)}</div></section>`;
}

function rendreHorizon(e: Etat): string {
  const zone = (z: number, titre: string) => {
    const ss = e.horizon.map((s, i) => ({ s, i })).filter((x) => x.s.zone === z);
    if (!ss.length) return '';
    return `<div class="horizon-zone"><h3>${titre}</h3><div class="signaux">${ss.map(({ s, i }) => {
      const connu = s.carte >= 0;
      const sel = ui.selection?.k === 'signal' && ui.selection.id === s.uid;
      const paris = s.paris.map((p) => `<span class="pari" style="background:${COULEURS_JOUEURS[p.j]}" title="${esc(ui.noms[p.j])} parie ${p.lecture ? '▲ haut' : '▼ bas'}${p.precoce ? ' (précoce)' : ''}">${FORMES_JOUEURS[p.j]}${p.lecture ? '▲' : '▼'}${p.precoce ? '+' : ''}</span>`).join('');
      return `<button type="button" class="signal ${connu ? 'connu' : ''} ${sel ? 'sel' : ''}" data-a="sel" data-k="signal" data-id="${s.uid}" data-tuto="signal" title="${connu ? esc(C.signaux[s.carte].titre) : 'Signal face cachée'}"><span class="num">n° ${i + 1} ${connu ? '👁' : '?'}</span><span>${connu ? esc(C.signaux[s.carte].titre) : 'face cachée'}</span><span class="paris">${paris}</span></button>`;
    }).join('')}</div></div>`;
  };
  return `<section class="panneau" aria-label="Horizon"><h2>${pictoType('signal', 'currentColor', 18)} Horizon — signaux faibles</h2>${zone(1, 'Proches — résolus au bilan de cette décennie')}${zone(0, 'Lointains — résolus au bilan suivant (pari précoce)')}${e.horizon.length ? '' : '<p>Plus aucun signal à l’horizon.</p>'}</section>`;
}

function rendreRuptures(e: Etat): string {
  const rs = e.ruptures.map((r) => {
    const c = C.ruptures[r.carte];
    const t = m.tension(e, r.carte);
    const sel = ui.selection?.k === 'rupture' && ui.selection.id === r.carte;
    const des = Array.from({ length: P.facesDe }, (_, i) => `<i class="${i < t ? 'on' : ''}"></i>`).join('');
    return `<button type="button" class="rupt ${sel ? 'sel' : ''}" data-a="sel" data-k="rupture" data-id="${r.carte}" data-tuto="rupture"><span class="t">${pictoType('rupture', 'currentColor', 14)} ${esc(c.titre)}</span>
      <span>Terrain ${esc(C.axes[c.terrain.axe].nom)} ${FLECHE[c.terrain.pole]} · tension <span class="tension" aria-hidden="true">${des}</span> ${t}/${P.facesDe} · ${r.age === 0 ? 'encore 2 bilans' : 'dernier bilan'}</span>
      <span>${r.prepares.map((j) => jeton(j, true)).join(' ')}</span></button>`;
  }).join('');
  return `<section class="panneau" aria-label="Ruptures latentes"><h2>${pictoType('rupture', 'currentColor', 18)} Ruptures latentes</h2><div class="rupts">${rs || '<p>Aucune rupture en vue.</p>'}</div></section>`;
}

function rendreJoueurs(e: Etat, complet: boolean): string {
  const sc = m.scores(e);
  return `<section class="panneau" aria-label="Joueurs"><h2>Joueurs</h2><div class="joueurs">${e.joueurs.map((j, k) => {
    const herit = e.tendances.filter((t) => t.proprio === k && (t.pole === 1 ? e.axes[t.axe] > m.centre : e.axes[t.axe] < m.centre)).length;
    const libres = '●'.repeat(Math.max(0, j.attention)) + '○'.repeat(Math.max(0, P.jetonsAttention - j.attention));
    return `<div class="joueur ${e.phase !== 'fin' && e.courant === k ? 'courant' : ''}">${jeton(k)}<div><strong>${esc(ui.noms[k])}</strong> <span class="infos">${NIVEAUX[ui.sieges[k]]}${e.phase !== 'fin' && e.courant === k ? ' · joue' : ''}</span><br><span class="infos">attention <span class="att" title="${j.attention} jeton(s) libre(s) sur ${P.jetonsAttention}">${libres}</span> · ${j.main.length} cartes · héritage en cours ${herit}</span></div><div title="points d’anticipation"><strong>${j.anticipation}</strong> pts${complet ? `<br><span class="infos">total ${sc[k].total}</span>` : ''}</div></div>`;
  }).join('')}</div></section>`;
}

function fiche(e: Etat, l: Coup[]): string {
  const s = ui.selection;
  if (!s) return '';
  const monTour = l.length > 0;
  const bouton = (c: Coup, texte: string, cls = 'ambre') => `<button type="button" class="bouton ${cls}" data-a="jouer" data-coup="${enc(c)}" data-tuto="action">${texte}</button>`;
  let carte = '', texte = '', actions = '';
  if (s.k === 'main') {
    const t = C.tendances[s.id];
    carte = carteTendance(s.id, { grande: true, bouton: false });
    const c: Coup = { t: 'installer', carte: s.id };
    if (aCoup(l, c)) actions = bouton(c, `Installer cette tendance`);
    else if (e.fermees[t.axe * 2 + t.pole]) texte = 'La voie est fermée : cette carte ne peut plus être installée.';
    else if (t.prerequis && !m.installable(e, s.id)) texte = `Prérequis non rempli : ${C.axes[t.prerequis.axe].nom} doit pencher vers ${nomPole(C, t.prerequis.axe, t.prerequis.pole)}.`;
    else if (!monTour) texte = 'Ce n’est pas le moment d’installer.';
    texte = `<p>Installée, elle pousse l’axe d’une part de sa force à <em>chaque</em> bilan jusqu’en 2075. Elle rapporte 1 point d’héritage si le monde finit de son côté.</p><p>${texte}</p>`;
  } else if (s.k === 'tendance') {
    const t = e.tendances.find((x) => x.id === s.id);
    if (!t) return '';
    const titre = titreTendance(C, t.id, t.lecture);
    carte = t.id < ID_SIGNAL ? carteTendance(t.id, { grande: true, bouton: false }) : `<div class="texte"><h3>${esc(titre)}</h3><p>Tendance née du signal « ${esc(C.signaux[t.id - ID_SIGNAL].titre)} ». Pousse ${esc(C.axes[t.axe].nom)} vers ${esc(nomPole(C, t.axe, t.pole))} (force ${t.force}).</p></div>`;
    const c: Coup = { t: 'inflechir', id: t.id };
    const cout = P.coutInflechir[Math.min(t.age, P.coutInflechir.length - 1)];
    texte = `<p><strong>${NOMS_AGE[t.age]}</strong> — ${t.proprio >= 0 ? `installée par ${esc(ui.noms[t.proprio])}` : 'née d’un signal, sans propriétaire'} pendant ${libelleDecennie(t.pose)}.</p>` +
      (t.age >= P.ageVerrou ? '<p>🔒 Verrouillée : plus personne ne peut l’infléchir. Seule une rupture peut la balayer.</p>' : `<p>L’infléchir coûte ${cout} jeton${cout > 1 ? 's' : ''} d’attention (rendu${cout > 1 ? 's' : ''} au bilan) et la défausse.</p>`);
    if (aCoup(l, c)) actions = bouton(c, `Infléchir (${cout} jeton${cout > 1 ? 's' : ''})`);
    else if (t.proprio === ui.vue && monTour) texte += '<p>C’est votre propre tendance.</p>';
  } else if (s.k === 'signal') {
    const sh = e.horizon.find((x) => x.uid === s.id);
    if (!sh) return '';
    const num = e.horizon.indexOf(sh) + 1;
    carte = sh.carte >= 0 ? carteSignal(sh.carte, { grande: true, bouton: false }) : carteSignalCachee(num, { grande: true, bouton: false });
    const pts = sh.zone === 0 ? P.ptsSignalPrecoce : P.ptsSignalTardif;
    texte = `<p>Signal n° ${num}, ${sh.zone === 0 ? 'lointain : résolu au bilan de la décennie suivante' : 'proche : résolu au bilan de cette décennie'}. Un pari juste rapporte <strong>${pts} point${pts > 1 ? 's' : ''}</strong>${sh.zone === 0 ? ' (pari précoce)' : ''}. Une seule place par lecture.</p>`;
    if (sh.paris.length) texte += `<p>Paris en place : ${sh.paris.map((p) => `${esc(ui.noms[p.j])} ${p.lecture ? '▲' : '▼'}`).join(', ')}.</p>`;
    const cv: Coup = { t: 'veiller', uid: sh.uid };
    if (aCoup(l, cv)) actions += bouton(cv, sh.carte >= 0 ? 'Veiller de nouveau (1 jeton) pour parier' : 'Veiller : y poser un jeton et le regarder en secret');
    for (const lec of [1, 0]) { const cp: Coup = { t: 'parier', uid: sh.uid, lecture: lec }; if (aCoup(l, cp)) actions += bouton(cp, `Parier ${lec ? '▲ lecture haute' : '▼ lecture basse'}`); }
  } else if (s.k === 'rupture') {
    const r = e.ruptures.find((x) => x.carte === s.id);
    if (!r) return '';
    carte = carteRupture(s.id, { grande: true, bouton: false });
    const t = m.tension(e, s.id);
    texte = `<p>Au bilan, on lance un dé à ${P.facesDe} faces : la rupture se déclenche si le dé est inférieur ou égal à la tension. Aujourd’hui : tension <strong>${t}</strong>, soit ${t} chance${t > 1 ? 's' : ''} sur ${P.facesDe}. ${r.age === 0 ? 'Elle restera latente deux bilans.' : 'C’est son dernier bilan avant de se dissiper.'}</p><p>S’y préparer immobilise un jeton d’attention ; si elle éclate, chaque joueur préparé marque <strong>${P.ptsRupture} points</strong>.</p>`;
    const c: Coup = { t: 'preparer', carte: s.id };
    if (aCoup(l, c)) actions = bouton(c, 'Se préparer à cette rupture');
    else if (r.prepares.includes(ui.vue)) texte += '<p>Vous y êtes déjà préparé.</p>';
  } else if (s.k === 'vision') {
    carte = carteVision(s.id, { grande: true, bouton: false });
    const sc = m.scores(e)[ui.vue];
    texte = `<p>Votre futur souhaitable, secret jusqu’à la fin. Plus le monde de 2075 est proche des cases visées (★ et ☆ sur les pistes), plus vous marquez. Viser juste compte : dépasser la cible coûte autant que ne pas l’atteindre.</p><p>Si la partie s’arrêtait maintenant : vision ${sc.vision}, héritage ${sc.heritage}, anticipation ${sc.anticipation} = <strong>${sc.total} points</strong>.</p>`;
  }
  return `<aside class="fiche" aria-live="polite" aria-label="Détail de la sélection">${carte}<div class="texte">${texte}<div class="rangee">${actions}<button type="button" class="bouton second" data-a="fermer-fiche">Fermer</button></div></div></aside>`;
}

function consigne(e: Etat, l: Coup[]): string {
  if (ui.revue !== null) return `Revue de la partie : coup ${ui.revue} sur ${ui.coups.length}.`;
  if (e.phase === 'fin') return 'La partie est terminée.';
  const jc = ui.etat.courant;
  if (!estHumain(jc)) return `${esc(ui.noms[jc])} réfléchit…`;
  if (ui.etat.phase === 'veille') return `${esc(ui.noms[jc])} : votre jeton d’attention est sur le signal que vous venez de regarder. Orientez-le sur ▲ ou ▼ (pari), ou retirez-le (il reviendra au bilan).`;
  const reste = m.actionsParDecennie(e.nbJoueurs) - e.tour;
  return `${esc(ui.noms[jc])}, à vous : choisissez une carte de votre main, un signal, une rupture ou une tendance du plateau. Il vous reste ${reste} action${reste > 1 ? 's' : ''} cette décennie.${l.length ? '' : ''}`;
}

function rendreJeu(): string {
  const { e, complet } = etatAffiche();
  const l = legaux();
  const moi = e.joueurs[ui.vue];
  const frise = Array.from({ length: P.decennies }, (_, d) => `<span class="${d < e.decennie ? 'passee' : d === e.decennie && e.phase !== 'fin' ? 'courante' : ''}">${libelleDecennie(d)}</span>`).join('');
  let zoneMain = '';
  if (ui.revue !== null) {
    zoneMain = `<section class="panneau"><div class="rangee"><button class="bouton petit" data-a="revue" data-n="0">⏮ Début</button><button class="bouton petit" data-a="revue" data-n="${Math.max(0, ui.revue - 1)}">◀ Précédent</button><button class="bouton petit ambre" data-a="revue" data-n="${Math.min(ui.coups.length, ui.revue + 1)}">Suivant ▶</button><button class="bouton petit" data-a="revue" data-n="${ui.coups.length}">Fin ⏭</button><button class="bouton petit second" data-a="fin-revue">Retour au récit</button></div>
      <p>${ui.revue > 0 ? esc(dernieresLignes(ui.revue)) : 'Mise en place.'}</p></section>`;
  } else if (e.phase === 'visions' && l.length) {
    zoneMain = `<section class="panneau"><h2>${pictoType('vision', 'currentColor', 18)} ${esc(ui.noms[ui.vue])}, choisissez votre vision : votre futur souhaitable, gardé secret</h2><div class="main">${l.map((c) => (c.t === 'vision' ? carteVision(c.carte, { grande: true, attrs: `data-a="jouer" data-coup="${enc(c)}" data-tuto="vision"` }) : '')).join('')}</div>
      <p>Votre main de départ (pour choisir en connaissance de cause) :</p><div class="main">${moi.main.map((c) => carteTendance(c, { bouton: false })).join('')}</div></section>`;
  } else if (moi && estHumain(ui.vue)) {
    const cartes = moi.main.filter((c) => c >= 0).map((c) => carteTendance(c, { attrs: `data-a="sel" data-k="main" data-id="${c}" data-tuto="main"`, classes: `${m.installable(e, c) ? '' : 'injouable'} ${ui.selection?.k === 'main' && ui.selection.id === c ? 'sel' : ''}` })).join('');
    const vis = moi.vision >= 0 ? `<button type="button" class="bouton second petit" data-a="sel" data-k="vision" data-id="${moi.vision}">${pictoType('vision', 'currentColor', 14)} Ma vision : ${esc(C.visions[moi.vision].titre)}</button>` : '';
    const autres = [
      aCoup(l, { t: 'prospecter' }) ? `<button type="button" class="bouton petit" data-a="jouer" data-coup="d" title="Piocher ${P.piocheProspecter} cartes Tendance">Prospecter (+${P.piocheProspecter} cartes)</button>` : '',
      aCoup(l, { t: 'renoncer' }) ? `<button type="button" class="bouton petit" data-a="jouer" data-coup="n" data-tuto="action">Retirer mon jeton (ne pas parier)</button>` : '',
      aCoup(l, { t: 'passer' }) ? `<button type="button" class="bouton petit" data-a="jouer" data-coup="x">Passer</button>` : '',
    ].join('');
    zoneMain = `<section class="panneau" aria-label="Votre main"><div class="rangee"><h2 style="margin:0">${jeton(ui.vue)} Main de ${esc(ui.noms[ui.vue])}</h2>${vis}${autres}</div><div class="main">${cartes || '<p>Main vide.</p>'}</div></section>`;
  }
  return `${ui.bilan || ui.passage ? '' : tuto()}<div class="jeu">
    <div class="barre"><h1>${logo(28)} Aiguillages</h1><button class="bouton petit" data-a="modale" data-m="journal">Journal</button><button class="bouton petit" data-a="modale" data-m="aide">Aide</button><button class="bouton petit" data-a="modale" data-m="partage">Partager</button><button class="bouton petit" data-a="accueil">Quitter</button><div class="frise" aria-label="Décennies">${frise}</div></div>
    <main class="plateau"><div class="consigne" role="status" aria-live="polite">${consigne(e, l)}${ui.message ? ` <span style="color:var(--rupture)">${esc(ui.message)}</span>` : ''}</div>${C.axes.map((_, a) => rendreAxe(e, a, l)).join('')}</main>
    <div class="cote-droit">${rendreJoueurs(e, complet)}${rendreHorizon(e)}${rendreRuptures(e)}</div>
    <div class="zone-main">${zoneMain}${fiche(e, l)}</div>
  </div>${modales()}`;
}

function dernieresLignes(n: number): string {
  // événements produits par le coup n (pour la revue)
  const lot: Evenement[] = [];
  m.jouer(etatsRevue()[n - 1], ui.coups[n - 1], lot);
  return lot.map((ev) => decrireEvenement(C, ev, ui.noms)).filter(Boolean).join(' ');
}

function listeJournal(evs: Evenement[]): string {
  return `<ol class="journal">${evs.map((ev) => { const s = decrireEvenement(C, ev, ui.noms); return s ? `<li class="${ev.t === 'decennie' || ev.t === 'bilan' ? 'titre' : ev.t === 'rupture' || ev.t === 'bascule' ? 'fort' : ''}">${esc(s)}</li>` : ''; }).join('')}</ol>`;
}

function modales(): string {
  if (ui.passage && ui.etat.phase !== 'fin') {
    return `<div class="voile"><div class="modale" role="dialog" aria-modal="true" aria-label="Passage de l’appareil"><h2>${jeton(ui.etat.courant)} Au tour de ${esc(ui.noms[ui.etat.courant])}</h2><p>Passez l’appareil à ${esc(ui.noms[ui.etat.courant])}. Les autres joueurs détournent les yeux : sa main et sa vision sont secrètes.</p><button class="bouton ambre" data-a="passage-ok" autofocus>Je suis ${esc(ui.noms[ui.etat.courant])}, afficher mon jeu</button></div></div>`;
  }
  if (ui.bilan) {
    const d = (ui.bilan[0] as { d: number }).d;
    return `<div class="voile"><div class="modale" role="dialog" aria-modal="true" aria-label="Bilan de la décennie"><h2>Bilan ${libelleDecennie(d)}</h2><p>Les tendances poussent, les signaux proches se résolvent, les ruptures latentes sont mises à l’épreuve, les tendances s’ancrent.</p>${listeJournal(ui.bilan.filter((x) => x.t !== 'bilan' && x.t !== 'decennie' && x.t !== 'fin'))}${ui.tuto !== null && ETAPES_TUTO[ui.tuto]?.id === 'bilan' ? `<div class="tuto"><h3>Tutoriel — ${esc(ETAPES_TUTO[ui.tuto].titre)}</h3><p>${ETAPES_TUTO[ui.tuto].texte}</p></div>` : ''}<p><button class="bouton ambre" data-a="bilan-ok" data-tuto="bilan-ok" autofocus>${ui.etat.phase === 'fin' ? 'Découvrir le monde de 2075' : `Entrer dans la décennie ${libelleDecennie(d + 1)}`}</button></p></div></div>`;
  }
  if (ui.modale === 'journal') return `<div class="voile" data-a="fermer"><div class="modale" role="dialog" aria-modal="true" aria-label="Journal"><div class="rangee"><h2 style="flex:1">Journal de la partie</h2><button class="bouton petit" data-a="fermer" autofocus>Fermer</button></div>${listeJournal(ui.revue !== null ? [] : ui.journal)}</div></div>`;
  if (ui.modale === 'partage') {
    const url = lienPartage();
    return `<div class="voile" data-a="fermer"><div class="modale" role="dialog" aria-modal="true" aria-label="Partager"><h2>Partager cette partie</h2><p>Ce lien contient la graine et tous les coups joués : il permet de revoir la partie, ou de la reprendre là où elle en est.</p><input class="champ" style="width:100%" readonly value="${esc(url)}" id="lien" aria-label="Lien de la partie"><p class="rangee"><button class="bouton ambre" data-a="copier">Copier le lien</button><button class="bouton second" data-a="fermer">Fermer</button></p></div></div>`;
  }
  if (ui.modale === 'aide') return `<div class="voile" data-a="fermer"><div class="modale" role="dialog" aria-modal="true" aria-label="Aide"><div class="rangee"><h2 style="flex:1">Aide de jeu</h2><button class="bouton petit" data-a="fermer" autofocus>Fermer</button></div>${AIDE}</div></div>`;
  return '';
}

const AIDE = `<p><strong>But.</strong> En 2075, être le joueur dont la <em>vision</em> (★ ☆) est la mieux réalisée, qui a laissé le plus d’<em>héritage</em> et qui a le mieux <em>anticipé</em>.</p>
<p><strong>À votre tour, une action :</strong></p><ul>
<li><strong>Installer</strong> une tendance de votre main : elle poussera son axe à chaque bilan. 1 point d’héritage si le monde finit de son côté.</li>
<li><strong>Veiller</strong> : poser un jeton d’attention sur un signal, le regarder en secret, puis orienter le jeton sur ▲ ou ▼ (<strong>pari</strong>, une seule place par lecture) ou le retirer (il revient au bilan). Pari précoce sur un signal lointain : ${P.ptsSignalPrecoce} points ; pari tardif : ${P.ptsSignalTardif}.</li>
<li><strong>Se préparer</strong> à une rupture latente (1 jeton) : ${P.ptsRupture} points si elle éclate.</li>
<li><strong>Infléchir</strong> une tendance adverse non verrouillée : ${P.coutInflechir[0]} jeton si elle est émergente ◌, ${P.coutInflechir[1]} si elle est installée ◐.</li>
<li><strong>Prospecter</strong> : piocher ${P.piocheProspecter} tendances.</li></ul>
<p><strong>Bilan de décennie.</strong> 1) Chaque axe avance d’une case vers le côté le plus lourd. 2) Les signaux proches s’amplifient ou s’éteignent selon leur contexte. 3) Un dé par rupture latente : elle éclate si dé ≤ tension. 4) Un axe à ${P.seuilBascule ?? 5} cases du centre ferme pour toujours la voie opposée. 5) Les tendances s’ancrent : ◌ émergente → ◐ installée → 🔒 verrouillée.</p>
<p>Le pion plein montre le présent ; le cercle pointillé « 2075? » le <em>futur probable</em> si rien ne change ; ★ et ☆ votre <em>futur souhaitable</em>.</p>
<p><a href="pdf/REGLES.pdf" target="_blank" rel="noopener">Règles complètes (PDF)</a> · <a href="pdf/AIDE_DE_JEU.pdf" target="_blank" rel="noopener">Aide de jeu (PDF)</a></p>`;

function tuto(): string {
  if (ui.tuto === null || ui.ecran !== 'jeu') return '';
  const et: EtapeTuto | undefined = ETAPES_TUTO[ui.tuto];
  if (!et) return '';
  return `<div class="tuto" role="region" aria-label="Tutoriel" aria-live="polite"><h3>Tutoriel ${ui.tuto + 1}/${ETAPES_TUTO.length} — ${esc(et.titre)}</h3><p>${et.texte}</p><div class="rangee">${et.attend ? '' : `<button class="bouton petit" data-a="tuto-suite">${ui.tuto + 1 < ETAPES_TUTO.length ? 'Compris' : 'Terminer le tutoriel'}</button>`}<button class="bouton petit second" style="color:#fff;border-color:#fff" data-a="tuto-fin">Quitter le tutoriel</button></div></div>`;
}

function lienPartage(): string {
  return location.origin + location.pathname + '#' + encoderPartie({ version: P.version, graine: ui.graine, sieges: ui.sieges, coups: ui.coups });
}

// ---------- Accueil ----------
function rendreAccueil(): string {
  const f = ui.formulaire;
  const sieges = Array.from({ length: f.nb }, (_, i) => `<div class="siege">${`<span class="jeton-j" style="background:${COULEURS_JOUEURS[i]}">${FORMES_JOUEURS[i]}</span>`}<label class="sr" for="nom${i}">Nom du joueur ${i + 1}</label><input id="nom${i}" data-champ="nom" data-i="${i}" maxlength="14" value="${esc(f.noms[i])}" size="12"><label class="sr" for="type${i}">Type du joueur ${i + 1}</label><select id="type${i}" data-champ="type" data-i="${i}">${(Object.keys(NIVEAUX) as TypeSiege[]).map((t) => `<option value="${t}" ${f.sieges[i] === t ? 'selected' : ''}>${NIVEAUX[t]}</option>`).join('')}</select></div>`).join('');
  return `<div class="accueil"><header>${logo(84)}<div><h1>Aiguillages</h1><p class="soustitre">Un jeu sur les futurs possibles — 2025 → 2075 · 2 à 5 joueurs · 14 ans et plus</p></div></header>
  <p class="pitch">Cinq décennies, un seul monde, et autant de futurs souhaitables que de joueurs. Installez des <strong>tendances</strong> qui pèseront jusqu’en 2075, guettez les <strong>signaux faibles</strong> avant les autres, préparez-vous aux <strong>ruptures</strong> — et visez juste : le monde ne s’arrête pas où vous le vouliez.</p>
  <div class="bloc"><h2>Nouvelle partie</h2>
    <div class="rangee" style="margin-bottom:.6rem"><label for="nb">Nombre de joueurs</label><select id="nb" class="champ" data-champ="nb">${[2, 3, 4, 5].map((n) => `<option ${f.nb === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label for="graine">Graine (facultatif)</label><input id="graine" class="champ" data-champ="graine" inputmode="numeric" size="8" value="${esc(f.graine)}" placeholder="au hasard"></div>
    <div class="sieges">${sieges}</div>
    <p class="rangee" style="margin-top:.8rem"><button class="bouton ambre" data-a="nouvelle">Jouer</button><button class="bouton" data-a="tuto">Tutoriel guidé (5 minutes)</button></p>
    <p style="font-size:.9rem;color:var(--gris)">Plusieurs humains ? La partie se joue sur le même écran, avec un écran de passage entre les joueurs pour garder mains et visions secrètes. Les bots tournent dans votre navigateur : rien n’est envoyé nulle part.</p></div>
  <div class="bloc trois"><div><h3>${pictoType('tendance', 'currentColor', 18)} Tendances</h3><p>Lentes, cumulatives : elles poussent le monde à chaque décennie, s’ancrent, puis se verrouillent.</p></div><div><h3>${pictoType('signal', 'currentColor', 18)} Signaux faibles</h3><p>Face cachée, à double lecture : selon le contexte ils deviennent une tendance… ou s’éteignent.</p></div><div><h3>${pictoType('rupture', 'currentColor', 18)} Ruptures</h3><p>Visibles de loin, improbables, brutales : plus le monde va loin dans une direction, plus il s’y expose.</p></div></div>
  <div class="bloc"><h2>Version papier et coulisses</h2><p class="rangee"><a class="bouton second" href="pdf/REGLES.pdf" target="_blank" rel="noopener">Règles (PDF)</a><a class="bouton second" href="pdf/AIDE_DE_JEU.pdf" target="_blank" rel="noopener">Aide de jeu (PDF)</a><a class="bouton second" href="pdf/CARTES.pdf" target="_blank" rel="noopener">Cartes à imprimer (PDF)</a><a class="bouton second" href="pdf/RAPPORT_EQUILIBRAGE.pdf" target="_blank" rel="noopener">Rapport d’équilibrage (PDF)</a></p>
  <p>Jeu conçu et équilibré par simulation, développé en ouvert : <a href="${DEPOT}">${DEPOT.replace('https://', '')}</a>. Code sous licence MIT, contenu du jeu sous CC BY-SA 4.0. Règles v${esc(P.version)}.</p></div></div>`;
}

// ---------- Fin ----------
function graphe(histoire: number[][]): string {
  const W = 720, H = 300, mg = { g: 78, d: 86, h: 18, b: 34 };
  const x = (i: number) => mg.g + (i * (W - mg.g - mg.d)) / (histoire.length - 1);
  const y = (v: number) => mg.h + ((P.pisteMax - v) * (H - mg.h - mg.b)) / P.pisteMax;
  const tirets = ['', '8 4', '2 4', '10 3 2 3'];
  let s = '';
  for (let v = 0; v <= P.pisteMax; v += 1) s += `<line x1="${mg.g}" x2="${W - mg.d}" y1="${y(v)}" y2="${y(v)}" stroke="${v === m.centre ? '#14213d' : '#d9d2be'}" stroke-width="${v === m.centre ? 1.5 : 1}"/>`;
  histoire.forEach((_, i) => { s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="13" fill="#14213d">${anneeDebut(i)}</text><line x1="${x(i)}" x2="${x(i)}" y1="${mg.h}" y2="${H - mg.b}" stroke="#ebe4d2"/>`; });
  s += `<text x="${mg.g - 8}" y="${y(P.pisteMax) + 4}" text-anchor="end" font-size="11" fill="#5a6172">pôle haut ▶</text><text x="${mg.g - 8}" y="${y(0) + 4}" text-anchor="end" font-size="11" fill="#5a6172">◀ pôle bas</text><text x="${mg.g - 8}" y="${y(m.centre) + 4}" text-anchor="end" font-size="11" fill="#5a6172">centre</text>`;
  const fin = histoire[histoire.length - 1];
  // décalage vertical léger pour que les lignes superposées restent distinctes
  C.axes.forEach((ax, a) => {
    const dec = (a - 1.5) * 2.2;
    const pts = histoire.map((h, i) => `${x(i)},${y(h[a]) + dec}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${COULEURS_AXES[a]}" stroke-width="3.5" stroke-dasharray="${tirets[a]}" stroke-linejoin="round"/>`;
    histoire.forEach((h, i) => { s += `<g transform="translate(${x(i) - 7},${y(h[a]) + dec - 7}) scale(.58)">${pictoAxe(a, COULEURS_AXES[a], 24).replace(/<\/?svg[^>]*>/g, '')}</g>`; });
    void ax;
  });
  // étiquettes de fin de ligne, écartées d'au moins 15 px pour rester lisibles
  const ordre = C.axes.map((_, a) => a).sort((a, b) => fin[b] - fin[a]);
  const ys = ordre.map((a) => y(fin[a]) + 4);
  for (let k = 1; k < ys.length; k++) if (ys[k] < ys[k - 1] + 15) ys[k] = ys[k - 1] + 15;
  const trop = ys[ys.length - 1] - (H - mg.b + 4);
  if (trop > 0) for (let k = ys.length - 1; k >= 0; k--) { ys[k] -= trop; if (k > 0 && ys[k - 1] <= ys[k] - 15) break; else if (k > 0) ys[k - 1] = Math.min(ys[k - 1], ys[k] - 15 + trop); }
  ordre.forEach((a, k) => { s += `<text x="${W - mg.d + 12}" y="${ys[k]}" font-size="12" font-weight="700" fill="${COULEURS_AXES[a]}">${esc(fin[a] === m.centre ? 'centre' : nomPole(C, a, fin[a] > m.centre ? 1 : 0))}</text>`; });
  return `<svg class="graphe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trajectoire des quatre axes de 2025 à 2075">${s}</svg>`;
}

function rendreFin(): string {
  const e = ui.etat;
  const sc = m.scores(e);
  const gagnants = m.gagnants(e);
  const type = m.typeSociete(e.axes, e.histoire);
  const chapitres = racconter(C, ui.journal, ui.noms, e.histoire);
  const ordre = sc.map((_, j) => j).sort((a, b) => sc[b].total - sc[a].total || sc[b].anticipation - sc[a].anticipation);
  return `<div class="fin"><header class="rangee">${logo(56)}<div><p style="margin:0;color:var(--gris)">Nous sommes en 2075. Voici le monde que vous avez construit.</p><h1>${esc(C.types[type].nom)}</h1></div></header>
  <p class="pitch">${esc(portrait(C, type, e.axes, m.centre))}</p>
  ${graphe(e.histoire)}
  <p class="legende">${C.axes.map((ax, a) => `<span>${pictoAxe(a, COULEURS_AXES[a], 16)} <strong style="color:${COULEURS_AXES[a]}">${esc(ax.nom)}</strong> : ${esc(ax.poles[0])} ◀ ▶ ${esc(ax.poles[1])} — case ${e.axes[a]}</span>`).join('')}</p>
  <h2>La trajectoire, décennie par décennie</h2>
  ${chapitres.map((ch) => `<section class="chapitre"><h3>${esc(ch.titre)}</h3>${ch.paragraphes.map((p) => `<p class="${p.startsWith('RUPTURE') || p.startsWith('Point de non-retour') ? 'rupture' : ''}">${esc(p)}</p>`).join('')}</section>`).join('')}
  <h2>Qui voulait quoi — et qui l’a obtenu</h2>
  <p>${gagnants.length > 1 ? 'Victoire partagée : ' : 'Victoire : '}<strong>${gagnants.map((j) => esc(ui.noms[j])).join(' et ')}</strong>. Le futur probable n’était le futur souhaitable que de certains.</p>
  <div style="overflow-x:auto"><table class="podium"><thead><tr><th>Joueur</th><th>Vision (futur souhaitable)</th><th>Vision</th><th>Héritage</th><th>Anticipation</th><th>Total</th></tr></thead><tbody>
  ${ordre.map((j) => { const v = C.visions[e.joueurs[j].vision]; return `<tr class="${gagnants.includes(j) ? 'gagnant' : ''}"><td>${jeton(j)} ${esc(ui.noms[j])}</td><td><strong>${esc(v.titre)}</strong><br><span style="font-size:.85em">★ ${esc(C.axes[v.principal.axe].nom)} en ${v.principal.case} (réel : ${e.axes[v.principal.axe]}) · ☆ ${esc(C.axes[v.secondaire.axe].nom)} en ${v.secondaire.case} (réel : ${e.axes[v.secondaire.axe]})</span></td><td>${sc[j].vision}</td><td>${sc[j].heritage}</td><td>${sc[j].anticipation}</td><td><strong>${sc[j].total}</strong></td></tr>`; }).join('')}
  </tbody></table></div>
  <p class="rangee" style="margin-top:1rem"><button class="bouton ambre" data-a="revoir">Revoir la partie coup par coup</button><button class="bouton" data-a="modale" data-m="partage">Partager cette partie</button><button class="bouton" data-a="modale" data-m="journal">Journal complet</button><button class="bouton second" data-a="accueil">Nouvelle partie</button></p>
  </div>${modales()}`;
}

// ---------- Rendu et événements ----------
function rendre(): void {
  const actif = document.activeElement as HTMLElement | null;
  const cle = actif?.dataset ? `${actif.dataset.a ?? ''}|${actif.dataset.k ?? ''}|${actif.dataset.id ?? ''}|${actif.dataset.coup ?? ''}|${actif.id}` : '';
  const defile = window.scrollY;
  racine.innerHTML = ui.ecran === 'accueil' ? rendreAccueil() : ui.ecran === 'fin' ? rendreFin() : rendreJeu();
  if (ui.ecran === 'jeu') window.scrollTo(0, defile);
  if (ui.tuto !== null) { const et = ETAPES_TUTO[ui.tuto]; if (et?.cible) racine.querySelectorAll(`[data-tuto="${et.cible}"]`).forEach((el) => el.classList.add('tuto-cible')); }
  const auto = racine.querySelector<HTMLElement>('[autofocus]');
  if (auto) auto.focus();
  else if (cle && cle !== '||||') {
    for (const el of racine.querySelectorAll<HTMLElement>('[data-a], input, select')) {
      if (`${el.dataset.a ?? ''}|${el.dataset.k ?? ''}|${el.dataset.id ?? ''}|${el.dataset.coup ?? ''}|${el.id}` === cle) { el.focus({ preventScroll: true }); break; }
    }
  }
}

racine.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-a]');
  if (!el) return;
  const a = el.dataset.a!;
  if (a === 'fermer' && el.classList.contains('voile') && ev.target !== el) return;
  switch (a) {
    case 'sel': {
      const k = el.dataset.k as NonNullable<Selection>['k'], id = Number(el.dataset.id);
      ui.selection = ui.selection && ui.selection.k === k && ui.selection.id === id ? null : { k, id };
      rendre(); break;
    }
    case 'fermer-fiche': ui.selection = null; rendre(); break;
    case 'jouer': { const c = decoderCoup(el.dataset.coup!); if (aCoup(legaux(), c)) { coupEstHumain = true; appliquer(c); coupEstHumain = false; } break; }
    case 'passage-ok': ui.passage = false; rendre(); break;
    case 'bilan-ok': ui.bilan = null; if (ui.tuto !== null && ETAPES_TUTO[ui.tuto]?.id === 'bilan') ui.tuto++; suite(); break;
    case 'modale': ui.modale = el.dataset.m as UI['modale']; rendre(); break;
    case 'fermer': ui.modale = null; rendre(); break;
    case 'copier': { const url = lienPartage(); void navigator.clipboard?.writeText(url).catch(() => undefined); (document.getElementById('lien') as HTMLInputElement | null)?.select(); el.textContent = 'Lien copié ✔'; break; }
    case 'accueil': ui.ecran = 'accueil'; ui.tuto = null; ui.revue = null; ui.modale = null; ui.bilan = null; demandeBot = 0; history.replaceState(null, '', location.pathname + location.search); rendre(); break;
    case 'nouvelle': {
      const f = ui.formulaire;
      const g = /^-?\d+$/.test(f.graine.trim()) ? Number(f.graine.trim()) | 0 : (Math.floor(Math.random() * 2 ** 31) | 0);
      nouvellePartie(f.sieges.slice(0, f.nb), f.noms.slice(0, f.nb).map((n, i) => n.trim() || `Joueur ${i + 1}`), g);
      break;
    }
    case 'tuto': nouvellePartie(['H', 'F'], ['Vous', 'Ada'], 20752025, true); break;
    case 'tuto-suite': if (ui.tuto !== null) { ui.tuto++; if (ui.tuto >= ETAPES_TUTO.length) ui.tuto = null; } rendre(); break;
    case 'tuto-fin': ui.tuto = null; rendre(); break;
    case 'revoir': ui.ecran = 'jeu'; ui.revue = 0; ui.selection = null; ui.modale = null; rendre(); break;
    case 'revue': ui.revue = Number(el.dataset.n); ui.selection = null; rendre(); break;
    case 'fin-revue': ui.revue = null; ui.ecran = ui.etat.phase === 'fin' ? 'fin' : 'jeu'; suite(); break;
  }
});
racine.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement | HTMLSelectElement;
  const f = ui.formulaire;
  const i = Number(el.dataset.i);
  if (el.dataset.champ === 'nb') { f.nb = Number(el.value); rendre(); }
  else if (el.dataset.champ === 'type') f.sieges[i] = el.value as TypeSiege;
  else if (el.dataset.champ === 'nom') f.noms[i] = el.value;
  else if (el.dataset.champ === 'graine') f.graine = el.value;
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { if (ui.modale) { ui.modale = null; rendre(); } else if (ui.selection) { ui.selection = null; rendre(); } }
});

// ---------- Démarrage : partie partagée dans l'URL ? ----------
function demarrer(): void {
  const p = decoderPartie(location.hash);
  if (p) {
    try {
      ui.sieges = p.sieges; ui.graine = p.graine; ui.coups = []; ui.journal = [];
      ui.noms = p.sieges.map((s, i) => (s === 'H' ? `Joueur ${i + 1}` : ['Ada', 'Basile', 'Chloé', 'Diego', 'Elsa'][i]));
      ui.etat = m.creerPartie({ nbJoueurs: p.sieges.length, graine: p.graine });
      for (const c of p.coups) { const lot: Evenement[] = []; ui.etat = m.jouer(ui.etat, c, lot); ui.coups.push(c); ui.journal.push(...lot); }
      ui.ecran = ui.etat.phase === 'fin' ? 'fin' : 'jeu';
      ui.vue = Math.max(0, p.sieges.indexOf('H'));
      ui.passage = nbHumains() > 1 && ui.etat.phase !== 'fin';
      if (p.version !== P.version) ui.message = `Partie enregistrée avec les règles v${p.version} (version actuelle : v${P.version}).`;
      suite();
      return;
    } catch (e) {
      ui.ecran = 'accueil'; ui.message = 'Lien de partie illisible : ' + (e as Error).message;
    }
  }
  rendre();
}
demarrer();
void effetTendance;
