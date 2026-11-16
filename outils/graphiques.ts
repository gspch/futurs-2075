// Graphiques du rapport d'équilibrage, en SVG, à partir des résumés agrégés de simulations/.
// Usage : npm run graphiques -- [simulations/resume-final.json]
// Principes : un seul axe par graphique, petits multiples par nombre de joueurs (une seule teinte),
// seuils tracés et nommés, texte toujours à l'encre, valeurs lisibles sans la couleur.
import fs from 'node:fs';
import path from 'node:path';
import { strategies, partStrategie, cartesStats, typesStats, type Resume } from '../simulateur/src/criteres';
import { wilson, type Agregat } from '../simulateur/src/stats';

const ENCRE = '#14213d', GRIS = '#5a6172', GRILLE = '#e3ddcc', TEINTE = '#1a5f8f', SEUIL = '#8c1c13', DOUX = '#9db8cc';
const svg = (w: number, h: number, corps: string, titre: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${titre}" font-family="DejaVu Sans, Arial, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/><text x="10" y="18" font-size="13" font-weight="700" fill="${ENCRE}">${titre}</text>${corps}</svg>`;
const t = (x: number, y: number, s: string, o: { a?: string; s?: number; c?: string; g?: boolean } = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.s ?? 10}" text-anchor="${o.a ?? 'start'}" fill="${o.c ?? ENCRE}"${o.g ? ' font-weight="700"' : ''}>${s}</text>`;
const barreH = (x: number, y: number, w: number, h: number, c = TEINTE) => `<path d="M${x} ${y} h${Math.max(0, w - 3).toFixed(1)} a3 3 0 0 1 3 3 v${(h - 6).toFixed(1)} a3 3 0 0 1 -3 3 h${(-Math.max(0, w - 3)).toFixed(1)} Z" fill="${c}"/>`;

/** Barres horizontales triées, avec intervalle de confiance et seuil. */
function barres(titre: string, lignes: { nom: string; v: number; bas?: number; haut?: number; fort?: boolean }[], o: { max: number; seuils?: { v: number; nom: string }[]; fmt: (v: number) => string; ref?: number; larg?: number; sousTitre?: string }): string {
  const W = o.larg ?? 360, g = 150, d = 52, h = 17, y0 = 44;
  const H = y0 + lignes.length * h + 26;
  const x = (v: number) => g + (Math.max(0, Math.min(o.max, v)) / o.max) * (W - g - d);
  let s = o.sousTitre ? t(10, 32, o.sousTitre, { s: 9, c: GRIS }) : '';
  for (let k = 0; k <= 4; k++) { const v = (o.max * k) / 4; s += `<line x1="${x(v)}" x2="${x(v)}" y1="${y0 - 4}" y2="${H - 22}" stroke="${GRILLE}"/>` + t(x(v), H - 10, o.fmt(v), { a: 'middle', s: 8.5, c: GRIS }); }
  lignes.forEach((l, i) => {
    const y = y0 + i * h;
    s += t(g - 6, y + 10.5, l.nom, { a: 'end', s: 9.5, g: l.fort }) + barreH(g, y + 2, x(l.v) - g, h - 5, l.fort ? TEINTE : DOUX);
    if (l.bas !== undefined && l.haut !== undefined) s += `<line x1="${x(l.bas)}" x2="${x(l.haut)}" y1="${y + 8}" y2="${y + 8}" stroke="${ENCRE}" stroke-width="1.2"/>`;
    s += t(Math.max(x(l.v), x(l.haut ?? l.v)) + 4, y + 10.5, o.fmt(l.v), { s: 9 });
  });
  for (const se of o.seuils ?? []) s += `<line x1="${x(se.v)}" x2="${x(se.v)}" y1="${y0 - 8}" y2="${H - 22}" stroke="${SEUIL}" stroke-width="1.5" stroke-dasharray="5 3"/>` + t(x(se.v), y0 - 10, se.nom, { a: 'middle', s: 8.5, c: SEUIL, g: true });
  return svg(W, H, s, titre);
}

function histogramme(titre: string, valeurs: Map<number, number>, o: { xNom: string; pas?: number; sousTitre?: string; second?: Map<number, number>; legende?: [string, string] }): string {
  const W = 520, H = 230, g = 44, d = 14, y0 = 46, yb = H - 34;
  const cles = [...valeurs.keys(), ...(o.second?.keys() ?? [])];
  const min = Math.min(...cles), max = Math.max(...cles);
  const tot = [...valeurs.values()].reduce((a, b) => a + b, 0), tot2 = o.second ? [...o.second.values()].reduce((a, b) => a + b, 0) : 1;
  const pm = Math.max(...[...valeurs.values()].map((v) => v / tot), ...(o.second ? [...o.second.values()].map((v) => v / tot2) : [0]));
  const lw = (W - g - d) / (max - min + 1);
  let s = o.sousTitre ? t(10, 32, o.sousTitre, { s: 9, c: GRIS }) : '';
  for (let k = 0; k <= 4; k++) { const p = (pm * k) / 4; const y = yb - (p / pm) * (yb - y0); s += `<line x1="${g}" x2="${W - d}" y1="${y}" y2="${y}" stroke="${GRILLE}"/>` + t(g - 4, y + 3, (100 * p).toFixed(0) + ' %', { a: 'end', s: 8.5, c: GRIS }); }
  for (let v = min; v <= max; v++) {
    const x = g + (v - min) * lw;
    const p = (valeurs.get(v) ?? 0) / tot;
    if (p > 0) s += `<rect x="${(x + 1).toFixed(1)}" y="${(yb - (p / pm) * (yb - y0)).toFixed(1)}" width="${Math.max(1, lw - 2).toFixed(1)}" height="${((p / pm) * (yb - y0)).toFixed(1)}" fill="${DOUX}"/>`;
    if ((v - min) % (o.pas ?? 5) === 0) s += t(x + lw / 2, yb + 12, String(v), { a: 'middle', s: 8.5, c: GRIS });
  }
  if (o.second) {
    let pts = '';
    for (let v = min; v <= max; v++) pts += `${(g + (v - min) * lw + lw / 2).toFixed(1)},${(yb - (((o.second.get(v) ?? 0) / tot2) / pm) * (yb - y0)).toFixed(1)} `;
    s += `<polyline points="${pts}" fill="none" stroke="${ENCRE}" stroke-width="2"/>`;
    s += `<rect x="${W - 190}" y="26" width="10" height="10" fill="${DOUX}"/>` + t(W - 176, 35, o.legende![0], { s: 9 }) + `<line x1="${W - 100}" x2="${W - 88}" y1="31" y2="31" stroke="${ENCRE}" stroke-width="2"/>` + t(W - 84, 35, o.legende![1], { s: 9 });
  }
  s += t((g + W - d) / 2, H - 6, o.xNom, { a: 'middle', s: 9.5 });
  return svg(W, H, s, titre);
}

/** Courbe d'une métrique au fil des versions, avec seuil. */
function evolution(titre: string, points: { nom: string; v: number | null }[], o: { min: number; max: number; seuil: number; nomSeuil: string; fmt: (v: number) => string; bonSi: 'dessous' | 'dessus' }): string {
  const W = 360, H = 190, g = 44, d = 20, y0 = 40, yb = H - 30;
  const x = (i: number) => g + (i * (W - g - d)) / Math.max(1, points.length - 1);
  const y = (v: number) => yb - ((Math.max(o.min, Math.min(o.max, v)) - o.min) / (o.max - o.min)) * (yb - y0);
  let s = '';
  for (let k = 0; k <= 4; k++) { const v = o.min + ((o.max - o.min) * k) / 4; s += `<line x1="${g}" x2="${W - d}" y1="${y(v)}" y2="${y(v)}" stroke="${GRILLE}"/>` + t(g - 4, y(v) + 3, o.fmt(v), { a: 'end', s: 8.5, c: GRIS }); }
  s += `<line x1="${g}" x2="${W - d}" y1="${y(o.seuil)}" y2="${y(o.seuil)}" stroke="${SEUIL}" stroke-width="1.5" stroke-dasharray="5 3"/>` + t(W - d, y(o.seuil) + (o.bonSi === 'dessous' ? -4 : 11), o.nomSeuil, { a: 'end', s: 8.5, c: SEUIL, g: true });
  const ok = points.map((p, i) => ({ ...p, i })).filter((p) => p.v !== null) as { nom: string; v: number; i: number }[];
  s += `<polyline points="${ok.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}" fill="none" stroke="${TEINTE}" stroke-width="2"/>`;
  for (const p of ok) s += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="4" fill="${TEINTE}" stroke="#fff" stroke-width="2"/>` + t(x(p.i), y(p.v) - 8, o.fmt(p.v), { a: 'middle', s: 8.5 });
  points.forEach((p, i) => { s += t(x(i), H - 12, p.nom, { a: 'middle', s: 8.5, c: GRIS }); });
  return svg(W, H, s, titre);
}

const extraire = (a: Agregat, prefixe: string) => { const mp = new Map<number, number>(); for (const k in a) if (k.startsWith(prefixe)) mp.set(Number(k.slice(prefixe.length)), a[k]); return mp; };
const NOMS: Record<string, string> = { aleatoire: 'aléatoire', glouton: 'glouton', chasseur: 'chasseur de signaux', parieur: 'parieur de ruptures', bloqueur: 'bloqueur', 'specialiste-matiere': 'spécialiste Matière', 'specialiste-technique': 'spécialiste Technique', 'specialiste-echelle': 'spécialiste Échelle', 'specialiste-lien': 'spécialiste Lien' };

function main() {
  const fichier = process.argv[2] ?? 'simulations/resume-final.json';
  const dossier = 'docs/graphiques';
  fs.mkdirSync(dossier, { recursive: true });
  const ecrire = (nom: string, s: string) => { fs.writeFileSync(path.join(dossier, nom), s); console.log('  ' + nom); };
  if (fs.existsSync(fichier)) {
    const r = JSON.parse(fs.readFileSync(fichier, 'utf8')) as Resume;
    for (const nb of Object.keys(r.melange).map(Number)) {
      const a = r.melange[nb];
      const ps = strategies(a).map((s) => partStrategie(a, s, nb)).sort((x, y) => y.ratio - x.ratio);
      ecrire(`strategies-${nb}j.svg`, barres(`Victoires par stratégie — ${nb} joueurs`, ps.map((p, i) => ({ nom: NOMS[p.nom] ?? p.nom, v: p.ratio, bas: p.ratioBas, haut: p.ratioHaut, fort: i === 0 })), { max: 1.6, fmt: (v) => v.toFixed(2).replace('.', ','), seuils: [{ v: 1, nom: 'part attendue' }, { v: 1.3, nom: 'seuil 1,3' }], sousTitre: `taux de victoire × ${nb} (1 = part attendue), IC 95 %, ${a.parties} parties` }));
      const sieges = Array.from({ length: nb }, (_, s) => { const w = wilson(a[`siege.${s}.victoires`], a[`siege.${s}.parties`]); return { nom: s === 0 ? '1er joueur en 2025' : `${s + 1}e joueur`, v: w.p, bas: w.bas, haut: w.haut, fort: s === 0 }; });
      ecrire(`sieges-${nb}j.svg`, barres(`Victoires par position — ${nb} joueurs`, sieges, { max: Math.min(1, 2 / nb), fmt: (v) => (100 * v).toFixed(1).replace('.', ',') + ' %', seuils: [{ v: 1 / nb, nom: `1/${nb}` }], sousTitre: 'taux de victoire selon l’ordre de jeu de la première décennie' }));
      ecrire(`scores-${nb}j.svg`, histogramme(`Distribution des scores — ${nb} joueurs`, extraire(a, 'histScore.'), { xNom: 'score final (points)', second: extraire(a, 'histGagnant.'), legende: ['tous', 'gagnants'] }));
      ecrire(`duree-${nb}j.svg`, histogramme(`Durée simulée — ${nb} joueurs`, extraire(a, 'histCoups.'), { xNom: 'nombre de décisions par partie', pas: 5 }));
      ecrire(`types-${nb}j.svg`, barres(`Sociétés de 2075 — ${nb} joueurs`, typesStats(a).sort((x, y) => y.part - x.part).map((ty, i) => ({ nom: ty.nom.replace(/^(La|Le|L’) ?/, ''), v: ty.part, fort: i === 0 })), { max: 0.5, fmt: (v) => (100 * v).toFixed(0) + ' %', seuils: [{ v: 0.4, nom: 'seuil 40 %' }], sousTitre: 'part des parties par type de société finale' }));
    }
    const tout: Agregat = {};
    for (const nb in r.melange) for (const k in r.melange[nb]) if (k.startsWith('carte.')) tout[k] = (tout[k] ?? 0) + r.melange[nb][k];
    const cs = cartesStats(tout).sort((x, y) => y.delta - x.delta);
    // puissance des cartes : toutes les cartes triées, en bâtons fins autour de zéro
    const W = 720, H = 250, g = 44, d = 12, y0 = 44, yb = H - 30, mx = 0.1;
    const yy = (v: number) => (y0 + yb) / 2 - (Math.max(-mx, Math.min(mx, v)) / mx) * ((yb - y0) / 2);
    let s = t(10, 32, 'écart de taux de victoire du joueur associé à la carte, en points ; une barre par carte, triées ; trait = IC 95 %', { s: 9, c: GRIS });
    for (const v of [-0.08, -0.04, 0, 0.04, 0.08]) s += `<line x1="${g}" x2="${W - d}" y1="${yy(v)}" y2="${yy(v)}" stroke="${Math.abs(v) === 0.08 ? SEUIL : v === 0 ? ENCRE : GRILLE}" ${Math.abs(v) === 0.08 ? 'stroke-dasharray="5 3" stroke-width="1.5"' : ''}/>` + t(g - 4, yy(v) + 3, (v > 0 ? '+' : '') + (100 * v).toFixed(0), { a: 'end', s: 8.5, c: Math.abs(v) === 0.08 ? SEUIL : GRIS });
    const lw = (W - g - d) / cs.length;
    cs.forEach((c, i) => {
      const x = g + i * lw;
      const coul = { T: TEINTE, S: '#3d4a63', R: '#8c1c13', V: '#8a6d1a' }[c.id[0]] ?? TEINTE;
      s += `<rect x="${(x + 0.8).toFixed(1)}" y="${Math.min(yy(0), yy(c.delta)).toFixed(1)}" width="${(lw - 1.6).toFixed(1)}" height="${Math.max(0.8, Math.abs(yy(c.delta) - yy(0))).toFixed(1)}" fill="${coul}"/><line x1="${x + lw / 2}" x2="${x + lw / 2}" y1="${yy(c.haut)}" y2="${yy(c.bas)}" stroke="${ENCRE}" stroke-width="0.5"/>`;
    });
    for (const i of [0, 1, cs.length - 2, cs.length - 1]) s += t(g + i * lw + lw / 2, cs[i].delta > 0 ? yy(cs[i].haut) - 4 - (i % 2) * 9 : yy(cs[i].bas) + 10 + (i % 2) * 9, cs[i].id, { a: i < 2 ? 'start' : 'end', s: 8.5 });
    [['T', 'tendances', TEINTE], ['S', 'signaux', '#3d4a63'], ['R', 'ruptures', '#8c1c13'], ['V', 'visions', '#8a6d1a']].forEach(([, nom, c], k) => { s += `<rect x="${g + k * 90}" y="${H - 16}" width="10" height="10" fill="${c}"/>` + t(g + k * 90 + 14, H - 7, nom, { s: 9 }); });
    s += t(W - d, yy(0.08) - 4, 'seuil ± 8 points', { a: 'end', s: 8.5, c: SEUIL, g: true });
    ecrire('cartes.svg', svg(W, H, s, 'Puissance des cartes (toutes tables mélangées)'));
  }
  // évolution au fil des versions
  const versions = fs.readdirSync('simulations').filter((f) => /^resume-v[\d.]+\.json$/.test(f)).sort((a, b) => parseFloat(a.slice(8)) - parseFloat(b.slice(8)));
  if (versions.length > 1) {
    const rs = versions.map((f) => JSON.parse(fs.readFileSync(path.join('simulations', f), 'utf8')) as Resume);
    const nom = (r: Resume) => 'v' + r.version;
    const c1 = rs.map((r) => ({ nom: nom(r), v: Math.max(...Object.keys(r.melange).flatMap((nb) => strategies(r.melange[nb]).map((s) => partStrategie(r.melange[nb], s, Number(nb)).ratio))) }));
    const c4 = rs.map((r) => ({ nom: nom(r), v: Math.min(...Object.keys(r.melange).map((nb) => r.melange[nb]['mi3.dernier.victoires'] / r.melange[nb]['mi3.dernier.parties'])) }));
    const c3 = rs.map((r) => ({ nom: nom(r), v: r.duels['expert-glouton'] ? r.duels['expert-glouton']['strat.expert.victoires'] / r.duels['expert-glouton']['strat.expert.parties'] : null }));
    const ant = rs.map((r) => ({ nom: nom(r), v: r.melange[4] ? r.melange[4]['score.anticipation'] / r.melange[4]['score.total'] : null }));
    ecrire('evolution-c1.svg', evolution('C1 — pire ratio d’une stratégie non experte', c1, { min: 1, max: 1.8, seuil: 1.3, nomSeuil: 'seuil ≤ 1,3', fmt: (v) => v.toFixed(2).replace('.', ','), bonSi: 'dessous' }));
    ecrire('evolution-c4.svg', evolution('C4 — le dernier en 2055 gagne (pire configuration)', c4, { min: 0, max: 0.2, seuil: 0.1, nomSeuil: 'seuil ≥ 10 %', fmt: (v) => (100 * v).toFixed(1).replace('.', ',') + ' %', bonSi: 'dessus' }));
    ecrire('evolution-c3.svg', evolution('C3 — l’expert bat le glouton (2 joueurs)', c3, { min: 0.3, max: 0.9, seuil: 0.6, nomSeuil: 'seuil ≥ 60 %', fmt: (v) => (100 * v).toFixed(0) + ' %', bonSi: 'dessus' }));
    ecrire('evolution-anticipation.svg', evolution('Part de l’anticipation dans le score (4 joueurs)', ant, { min: 0, max: 0.8, seuil: 0.4, nomSeuil: 'repère 40 %', fmt: (v) => (100 * v).toFixed(0) + ' %', bonSi: 'dessous' }));
  }
  if (fs.existsSync('simulations/adverse-final.json')) {
    const a = JSON.parse(fs.readFileSync('simulations/adverse-final.json', 'utf8')) as { ratios: number[] };
    const mp = new Map<number, number>();
    for (const x of a.ratios) { const k = Math.round(x * 20); mp.set(k, (mp.get(k) ?? 0) + 1); }
    const W = 520, H = 220, g = 40, d = 14, y0 = 46, yb = H - 34, min = 0, max = 32;
    const pm = Math.max(...mp.values());
    const lw = (W - g - d) / (max - min + 1);
    let s = t(10, 32, `${a.ratios.length} variantes de poids évaluées face au vivier de référence (ratio victoires / part attendue, évaluation de sélection)`, { s: 9, c: GRIS });
    for (let k = min; k <= max; k++) { const n = mp.get(k) ?? 0; const x = g + (k - min) * lw; if (n) s += `<rect x="${x + 1}" y="${yb - (n / pm) * (yb - y0)}" width="${lw - 2}" height="${(n / pm) * (yb - y0)}" fill="${DOUX}"/>`; if (k % 4 === 0) s += t(x + lw / 2, yb + 12, (k / 20).toFixed(1).replace('.', ','), { a: 'middle', s: 8.5, c: GRIS }); }
    const xs = g + (26 - min) * lw + lw / 2;
    s += `<line x1="${xs}" x2="${xs}" y1="${y0 - 6}" y2="${yb}" stroke="${SEUIL}" stroke-width="1.5" stroke-dasharray="5 3"/>` + t(xs, y0 - 8, 'seuil 1,3', { a: 'middle', s: 8.5, c: SEUIL, g: true }) + t((g + W - d) / 2, H - 6, 'ratio de la variante', { a: 'middle', s: 9.5 }) + t(g - 4, y0 + 3, String(pm), { a: 'end', s: 8.5, c: GRIS });
    ecrire('adverse.svg', svg(W, H, s, 'Test adverse — distribution des variantes explorées'));
  }
}
main();
