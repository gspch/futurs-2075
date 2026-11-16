// Génère les PDF du jeu depuis les mêmes fichiers de contenu que le jeu web :
//   docs/CARTES.pdf (cartes 63 × 88 mm, 9 par page A4, traits de coupe, dos, plateau, jetons)
//   docs/REGLES.pdf (depuis docs/REGLES.md), docs/AIDE_DE_JEU.pdf, docs/RAPPORT_EQUILIBRAGE.pdf
// Usage : npm run pdf            (nécessite Playwright + Chromium : `npx playwright install chromium`)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { marked } from 'marked';
import { CONTENU as C, PARAMETRES as P } from '../contenu';
import { effetTendance, effetSignal, effetRupture, effetVision, FLECHE } from '../recit/recit';
import { motifCarte, pictoAxe, pictoType, logo, COULEURS_AXES, COULEURS_AXES_CLAIR, COULEUR_SIGNAL, COULEUR_RUPTURE, COULEUR_VISION, ENCRE, PAPIER, AMBRE } from '../recit/visuel';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)).replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POLICE = `"DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
const SERIF = `"DejaVu Serif", Georgia, serif`;

// ---------- Cartes ----------
const CSS_CARTES = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: ${POLICE}; color: #000; }
.page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; }
.grille { position: absolute; left: 10.5mm; top: 16.5mm; width: 189mm; height: 264mm; display: grid; grid-template-columns: repeat(3, 63mm); grid-template-rows: repeat(3, 88mm); }
.coupe { position: absolute; inset: 0; }
.pied { position: absolute; left: 10.5mm; right: 10.5mm; bottom: 5mm; font-size: 6.5pt; color: #444; display: flex; justify-content: space-between; }
.c { width: 63mm; height: 88mm; padding: 3mm; position: relative; }
.c .cadre { width: 100%; height: 100%; border: 0.8mm solid var(--c); border-radius: 3mm; overflow: hidden; display: flex; flex-direction: column; background: #fff; }
.c .bandeau { background: var(--c); color: #fff; padding: 1.2mm 1.8mm; font-size: 7.2pt; font-weight: 700; display: flex; align-items: center; gap: 1.2mm; }
.c .bandeau .force { margin-left: auto; background: #fff; color: #000; border-radius: 50%; width: 5.2mm; height: 5.2mm; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 800; }
.c .motif { height: 21mm; background: var(--cc); border-bottom: 0.3mm solid var(--c); }
.c .motif svg { width: 100%; height: 100%; display: block; }
.c .corps { padding: 1.6mm 2mm 1.4mm; display: flex; flex-direction: column; flex: 1; gap: 1mm; min-height: 0; }
.c .titre { font-family: ${SERIF}; font-weight: 700; font-size: 11pt; line-height: 1.1; }
.c .ambiance { font-size: 7.8pt; font-style: italic; color: #222; line-height: 1.2; }
.c .effet { margin-top: auto; border-top: 0.3mm solid #000; padding-top: 1mm; font-size: 7.4pt; line-height: 1.22; }
.c .effet b { font-weight: 800; }
.c .bas { display: flex; justify-content: space-between; font-size: 5.6pt; color: #333; padding: 0 2mm 1mm; }
.dos .cadre { border-width: 1.2mm; align-items: center; justify-content: center; gap: 3mm; background: var(--cc); }
.dos .nom { font-family: ${SERIF}; font-size: 15pt; font-weight: 700; color: var(--c); }
.dos .type { font-size: 9pt; letter-spacing: .15em; text-transform: uppercase; font-weight: 700; }
.dos .trame { position: absolute; inset: 3mm; border-radius: 3mm; opacity: .5; }
`;

function traitsDeCoupe(): string {
  // Traits dans les marges, dans le prolongement de chaque ligne de coupe de la grille 3 × 3.
  const x0 = 10.5, y0 = 16.5, w = 63, h = 88, L = 5, d = 1.5;
  let s = '';
  for (let i = 0; i <= 3; i++) {
    const x = x0 + i * w, y = y0 + i * h;
    s += `<line x1="${x}" y1="${y0 - d - L}" x2="${x}" y2="${y0 - d}"/><line x1="${x}" y1="${y0 + 3 * h + d}" x2="${x}" y2="${y0 + 3 * h + d + L}"/>`;
    s += `<line x1="${x0 - d - L}" y1="${y}" x2="${x0 - d}" y2="${y}"/><line x1="${x0 + 3 * w + d}" y1="${y}" x2="${x0 + 3 * w + d + L}" y2="${y}"/>`;
  }
  return `<svg class="coupe" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg"><g stroke="#000" stroke-width="0.2">${s}</g></svg>`;
}

function carte(couleur: string, clair: string, bandeau: string, motif: string, titre: string, ambiance: string, effet: string, bas: [string, string]): string {
  return `<div class="c" style="--c:${couleur};--cc:${clair}"><div class="cadre"><div class="bandeau">${bandeau}</div><div class="motif">${motif}</div><div class="corps"><div class="titre">${esc(titre)}</div><div class="ambiance">${esc(ambiance)}</div><div class="effet">${effet}</div></div><div class="bas"><span>${bas[0]}</span><span>${bas[1]}</span></div></div></div>`;
}

function facesCartes(): string[] {
  const out: string[] = [];
  C.tendances.forEach((t, i) => out.push(carte(COULEURS_AXES[t.axe], COULEURS_AXES_CLAIR[t.axe],
    `${pictoAxe(t.axe, '#fff', 13)} ${pictoType('tendance', '#fff', 11)} ${esc(C.axes[t.axe].nom)} ${FLECHE[t.pole]} ${esc(C.axes[t.axe].poles[t.pole])}<span class="force">${t.force}</span>`,
    motifCarte(t.id, 'tendance', COULEURS_AXES[t.axe], t.pole), t.titre, t.texte, `<b>TENDANCE.</b> ${esc(effetTendance(C, i))}`, [t.id, `tendance · ${t.domaine}`])));
  C.signaux.forEach((s, i) => { const ef = effetSignal(C, i); out.push(carte(COULEUR_SIGNAL, '#e7eaf1',
    `${pictoType('signal', '#fff', 13)} Signal faible`, motifCarte(s.id, 'signal', COULEUR_SIGNAL), s.titre, s.texte,
    `<b>${esc(ef.contexte)}.</b><br>${esc(ef.haut)}.<br>${esc(ef.bas)}.`, [s.id, `signal · ${s.domaine}`])); });
  C.ruptures.forEach((r, i) => { const ef = effetRupture(C, i); out.push(carte(COULEUR_RUPTURE, '#f6dedb',
    `${pictoType('rupture', '#fff', 13)} Rupture`, motifCarte(r.id, 'rupture', COULEUR_RUPTURE), r.titre, r.texte,
    `${esc(ef.terrain)}<br><b>Si dé ≤ tension :</b> ${esc(ef.effets.join(' ; '))}.`, [r.id, `rupture · ${r.domaine}`])); });
  C.visions.forEach((v, i) => { const ef = effetVision(C, i); out.push(carte(COULEUR_VISION, '#f4ecd0',
    `${pictoType('vision', '#fff', 13)} Vision — futur souhaitable`, motifCarte(v.id, 'vision', COULEUR_VISION), v.titre, v.texte,
    `<b>★ Principal :</b> ${esc(ef.principal)}. Écart 0/1/2/3 : ${P.baremePrincipal.slice(0, 4).join('/')} pts.<br><b>☆ Secondaire :</b> ${esc(ef.secondaire)}. Écart 0/1/2 : ${P.baremeSecondaire.slice(0, 3).join('/')} pts.`, [v.id, 'vision · secrète'])); });
  return out;
}
function dos(type: 'tendance' | 'signal' | 'rupture' | 'vision', couleur: string, clair: string, nom: string): string {
  return `<div class="c dos" style="--c:${couleur};--cc:${clair}"><div class="cadre">${pictoType(type, couleur, 54)}<div class="nom">Aiguillages</div><div class="type">${nom}</div></div></div>`;
}

function pagePlateau(): string {
  const axes = C.axes.map((ax, a) => {
    let cases = '';
    for (let i = 0; i <= P.pisteMax; i++) {
      const seuil = Math.abs(i - P.pisteMax / 2) === (P.seuilBascule as number);
      cases += `<div style="flex:1;height:17mm;border:${seuil ? '1mm' : '0.4mm'} solid ${COULEURS_AXES[a]};border-radius:2mm;background:${i === P.pisteMax / 2 ? '#fff' : COULEURS_AXES_CLAIR[a]};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:13pt;font-weight:700">${i}${seuil ? '<span style="font-size:5.5pt;font-weight:400">non-retour</span>' : i === P.pisteMax / 2 ? '<span style="font-size:5.5pt;font-weight:400">2025</span>' : ''}</div>`;
    }
    return `<div style="border:0.6mm solid ${COULEURS_AXES[a]};border-left-width:3mm;border-radius:3mm;padding:2mm 3mm;margin-bottom:3mm">
      <div style="display:flex;align-items:center;gap:2mm;font-size:12pt;font-weight:800;color:${COULEURS_AXES[a]}">${pictoAxe(a, COULEURS_AXES[a], 20)} ${esc(ax.nom)} <span style="font-weight:400;font-size:9pt;color:#333">${esc(ax.question)}</span></div>
      <div style="display:flex;align-items:center;gap:2mm;margin-top:1.5mm"><div style="width:26mm;font-weight:800;font-size:10pt">◀ ${esc(ax.poles[0])}<div style="font-weight:400;font-size:6.5pt">tendances de ce pôle : à gauche du plateau</div></div><div style="flex:1;display:flex;gap:1mm">${cases}</div><div style="width:26mm;font-weight:800;font-size:10pt;text-align:right">${esc(ax.poles[1])} ▶<div style="font-weight:400;font-size:6.5pt">tendances de ce pôle : à droite du plateau</div></div></div></div>`;
  }).join('');
  const frise = Array.from({ length: P.decennies }, (_, d) => `<div style="flex:1;border:0.5mm solid #000;border-radius:2mm;padding:2mm;text-align:center;font-weight:700">${2025 + 10 * d}-${2035 + 10 * d}</div>`).join('');
  return `<div style="width:297mm;height:210mm;padding:8mm 10mm;page-break-after:always;font-family:${POLICE}">
    <div style="display:flex;align-items:center;gap:4mm;margin-bottom:3mm">${logo(40)}<div style="font-family:${SERIF};font-size:20pt;font-weight:700">Aiguillages — plateau du monde</div><div style="margin-left:auto;font-size:8pt;text-align:right">Un pion par axe, départ en case ${P.pisteMax / 2}.<br>Les cases à bord épais sont les points de non-retour.</div></div>
    ${axes}
    <div style="display:flex;gap:3mm;align-items:stretch"><div style="flex:1.1"><div style="font-weight:800;font-size:9pt;margin-bottom:1mm">Décennie en cours (un marqueur)</div><div style="display:flex;gap:1.5mm">${frise}</div></div>
    <div style="flex:1;border:0.5mm solid ${COULEUR_SIGNAL};border-radius:2mm;padding:2mm;font-size:8pt"><b>Horizon.</b> Posez les signaux face cachée sur deux rangées à côté du plateau : <b>Proches</b> (résolus à ce bilan) et <b>Lointains</b> (résolus au suivant).</div>
    <div style="flex:1;border:0.5mm solid ${COULEUR_RUPTURE};border-radius:2mm;padding:2mm;font-size:8pt"><b>Ruptures latentes.</b> Face visible, deux au plus. Chaque rupture reste deux bilans, puis se dissipe.</div></div></div>`;
}

function pageJetons(): string {
  const formes = ['●', '■', '▲', '◆', '★'];
  const noms = ['rouge / rond', 'bleu / carré', 'vert / triangle', 'violet / losange', 'or / étoile'];
  const coul = ['#b0452f', '#1a5f8f', '#2f6b3a', '#5e3f8a', '#8a6d1a'];
  const rond = (c: string, t: string, d = 16) => `<div style="width:${d}mm;height:${d}mm;border:0.6mm solid ${c};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${d * 0.9}pt;color:${c};font-weight:800">${t}</div>`;
  const lignes = formes.map((f, j) => `<div style="margin-bottom:5mm"><div style="font-weight:800;font-size:9pt;margin-bottom:1.5mm">Joueur ${j + 1} — ${noms[j]} : ${P.jetonsAttention} jetons d’attention (verso « + » = pari précoce), 14 marqueurs de propriété, 1 marqueur de score</div><div style="display:flex;flex-wrap:wrap;gap:2mm;align-items:center">${Array.from({ length: P.jetonsAttention }, () => rond(coul[j], f + '<span style="font-size:7pt">att.</span>') + rond(coul[j], f + '+')).join('')}${Array.from({ length: 14 }, () => rond(coul[j], f, 10)).join('')}${rond(coul[j], f + '<span style="font-size:6pt">pts</span>', 13)}</div></div>`).join('');
  const piste = Array.from({ length: 41 }, (_, i) => `<div style="width:8.4mm;height:8.4mm;border:0.3mm solid #000;display:flex;align-items:center;justify-content:center;font-size:7pt;${i % 5 === 0 ? 'font-weight:800;background:#eee' : ''}">${i}</div>`).join('');
  return `<div class="page" style="padding:12mm;height:auto;min-height:297mm"><div style="font-family:${SERIF};font-size:16pt;font-weight:700;margin-bottom:4mm">Jetons et pions à découper</div>${lignes}
    <div style="font-weight:800;font-size:9pt;margin:2mm 0 1.5mm">4 pions d’axe, 1 marqueur de décennie, 1 marqueur de premier joueur, 8 marqueurs « voie fermée », jetons « ancrage » (◐ installée / 🔒 verrouillée, recto verso)</div>
    <div style="display:flex;flex-wrap:wrap;gap:2mm;align-items:center">${C.axes.map((_, a) => `<div style="width:16mm;height:16mm;border:0.8mm solid ${COULEURS_AXES[a]};border-radius:50%;display:flex;align-items:center;justify-content:center">${pictoAxe(a, COULEURS_AXES[a], 28)}</div>`).join('')}${rond('#000', '⌛')}${rond('#000', '1er')}${Array.from({ length: 8 }, () => `<div style="border:0.5mm solid ${COULEUR_RUPTURE};color:${COULEUR_RUPTURE};font-weight:800;font-size:7pt;padding:1.5mm 2mm;border-radius:1.5mm">VOIE FERMÉE</div>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:1.5mm;margin-top:3mm">${Array.from({ length: 30 }, () => `<div style="width:9mm;height:9mm;border:0.4mm solid #000;border-radius:1.5mm;display:flex;align-items:center;justify-content:center;font-size:8pt">◐|■</div>`).join('')}</div>
    <div style="font-weight:800;font-size:9pt;margin:5mm 0 1.5mm">Piste d’anticipation (points publics)</div><div style="display:flex;flex-wrap:wrap;gap:0">${piste}</div>
    <p style="font-size:8pt;margin-top:4mm">On peut aussi remplacer ces jetons par des cubes ou des pions de couleur, et un dé à ${P.facesDe} faces ordinaire. Sur une tendance : le marqueur de son propriétaire ; couchée = émergente, redressée = installée, jeton ■ = verrouillée.</p></div>`;
}

function htmlCartes(): string {
  const faces = facesCartes();
  const pages: string[] = [];
  const nbPages = Math.ceil(faces.length / 9);
  for (let p = 0; p < nbPages; p++) {
    pages.push(`<div class="page">${traitsDeCoupe()}<div class="grille">${faces.slice(p * 9, p * 9 + 9).join('')}</div><div class="pied"><span>Aiguillages — règles v${esc(P.version)} — cartes 63 × 88 mm, imprimer à 100 % (sans mise à l’échelle)</span><span>Faces ${p + 1}/${nbPages} · CC BY-SA 4.0</span></div></div>`);
  }
  const lesDos: [Parameters<typeof dos>[0], string, string, string, number][] = [['tendance', ENCRE, '#e3e6ee', 'Tendance', C.tendances.length], ['signal', COULEUR_SIGNAL, '#e7eaf1', 'Signal faible', C.signaux.length], ['rupture', COULEUR_RUPTURE, '#f6dedb', 'Rupture', C.ruptures.length], ['vision', COULEUR_VISION, '#f4ecd0', 'Vision', C.visions.length]];
  for (const [t, c, cc, nom, n] of lesDos) {
    pages.push(`<div class="page">${traitsDeCoupe()}<div class="grille">${Array.from({ length: 9 }, () => dos(t, c, cc, nom)).join('')}</div><div class="pied"><span>Dos « ${nom} » — à imprimer au verso des ${n} cartes correspondantes (${Math.ceil(n / 9)} feuille${n > 9 ? 's' : ''}), ou à utiliser avec des protège-cartes opaques</span><span>CC BY-SA 4.0</span></div></div>`);
  }
  pages.push(pageJetons());
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aiguillages — cartes</title><style>${CSS_CARTES}</style></head><body>${pages.join('')}</body></html>`;
}

// ---------- Documents (règles, rapport) depuis Markdown ----------
const CSS_DOC = `
@page { size: A4; margin: 14mm 15mm 15mm; }
* { box-sizing: border-box; }
body { font-family: ${POLICE}; font-size: 9.3pt; line-height: 1.36; color: #111; margin: 0; }
h1 { font-family: ${SERIF}; font-size: 22pt; margin: 0 0 2mm; color: ${ENCRE}; }
h2 { font-family: ${SERIF}; font-size: 13.5pt; margin: 5mm 0 1.5mm; color: ${ENCRE}; border-bottom: 0.6mm solid ${AMBRE}; padding-bottom: .6mm; break-after: avoid; }
h3 { font-size: 10.5pt; margin: 3mm 0 1mm; break-after: avoid; }
p { margin: 0 0 1.8mm; } ul, ol { margin: 0 0 1.8mm; padding-left: 5mm; } li { margin-bottom: .6mm; }
table { border-collapse: collapse; width: 100%; margin: 1.5mm 0 2.5mm; font-size: 8.6pt; break-inside: avoid; }
th, td { border: 0.3mm solid #333; padding: 1mm 1.6mm; text-align: left; vertical-align: top; }
th { background: #e8e2d0; }
blockquote { margin: 2mm 0; padding: 1.5mm 3mm; border-left: 1.5mm solid ${AMBRE}; background: ${PAPIER}; break-inside: avoid; }
blockquote p:last-child { margin-bottom: 0; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.2pt; background: #eee; padding: 0 .6mm; }
pre { background: #eee; padding: 2mm; font-size: 7.8pt; white-space: pre-wrap; break-inside: avoid; } pre code { background: none; padding: 0; }
img, svg.fig { max-width: 100%; }
.entete { display: flex; align-items: center; gap: 4mm; margin-bottom: 3mm; }
.schema { break-inside: avoid; margin: 2mm 0; }
.deuxcol { columns: 2; column-gap: 7mm; }
figure { margin: 2mm 0; break-inside: avoid; } figcaption { font-size: 8pt; color: #333; }
`;

function mdVersHtml(fichier: string, titre: string): string {
  let md = fs.readFileSync(fichier, 'utf8');
  // {{param:nom}} → valeur du paramètre ; {{schema:nom}} → schéma SVG généré ; images relatives → inlinées
  md = md.replace(/\{\{param:([\w.]+)\}\}/g, (_, k: string) => { let v: unknown = P; for (const part of k.split('.')) v = (v as Record<string, unknown>)[part]; return Array.isArray(v) ? v.join(' / ') : String(v); });
  md = md.replace(/\{\{schema:(\w+)\}\}/g, (_, k: string) => (SCHEMAS[k]?.() ?? `[schéma ${k} manquant]`).replace(/font-size="([\d.]+)"/g, (_m, n: string) => `font-size="${(Number(n) * 0.76).toFixed(2)}"`));
  let html = marked.parse(md, { async: false }) as string;
  html = html.replace(/<img src="([^"]+\.svg)"([^>]*)>/g, (tout, src: string) => { const f = path.resolve(path.dirname(fichier), src); return fs.existsSync(f) ? `<figure>${fs.readFileSync(f, 'utf8').replace(/<\?xml[^>]*>/, '')}</figure>` : tout; });
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>${CSS_DOC}</style></head><body>${html}</body></html>`;
}

const SCHEMAS: Record<string, () => string> = {
  /** Schéma de mise en place : plateau, colonnes de tendances, horizon, ruptures, zones des joueurs. */
  miseEnPlace(): string {
    const b = (x: number, y: number, w: number, h: number, t: string, c = '#000', f = '#fff', s = 7) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${f}" stroke="${c}" stroke-width="0.7"/><text x="${x + w / 2}" y="${y + h / 2 + s / 3}" font-size="${s}" text-anchor="middle" fill="#000">${t}</text>`;
    let s = '';
    C.axes.forEach((ax, a) => {
      const y = 22 + a * 17;
      s += b(4, y, 50, 14, `tendances ◀ ${ax.poles[0]}`, COULEURS_AXES[a], COULEURS_AXES_CLAIR[a], 4.4);
      for (let i = 0; i <= 10; i++) s += `<rect x="${58 + i * 8.6}" y="${y + 2}" width="7.6" height="10" rx="1" fill="${i === 5 ? '#fff' : COULEURS_AXES_CLAIR[a]}" stroke="${COULEURS_AXES[a]}" stroke-width="${i === 1 || i === 9 ? 1.4 : 0.5}"/>`;
      s += `<circle cx="${58 + 5 * 8.6 + 3.8}" cy="${y + 7}" r="3.2" fill="${COULEURS_AXES[a]}"/><text x="${58 + 47}" y="${y - 0.3}" font-size="4.4" text-anchor="middle" fill="#000" font-weight="700">${ax.nom}</text>`;
      s += b(156, y, 50, 14, `tendances ${ax.poles[1]} ▶`, COULEURS_AXES[a], COULEURS_AXES_CLAIR[a], 4.4);
    });
    s += `<text x="4" y="13" font-size="5.5" font-weight="700">Plateau du monde : 4 pions en case 5 ; bord épais = point de non-retour</text>`;
    const bloc = (x: number, y: number, w: number, h: number, c: string, f: string, l1: string, l2: string) => b(x, y, w, h, '', c, f) + `<text x="${x + w / 2}" y="${y + h / 2 - 1}" font-size="4.6" text-anchor="middle" font-weight="700">${l1}</text><text x="${x + w / 2}" y="${y + h / 2 + 5}" font-size="4.2" text-anchor="middle">${l2}</text>`;
    s += bloc(212, 22, 64, 20, COULEUR_SIGNAL, '#e7eaf1', 'Horizon — signaux proches', `${P.signauxParDecennie} cartes face cachée`);
    s += bloc(212, 45, 64, 20, COULEUR_SIGNAL, '#e7eaf1', 'Horizon — signaux lointains', `${P.signauxParDecennie} cartes face cachée`);
    s += bloc(212, 68, 64, 21, COULEUR_RUPTURE, '#f6dedb', 'Rupture latente', '1 carte face visible');
    s += b(4, 95, 30, 12, 'pioche Tendances', '#000', '#eee', 3.6) + b(37, 95, 30, 12, 'pioche Signaux', '#000', '#eee', 3.6) + b(70, 95, 30, 12, 'pioche Ruptures', '#000', '#eee', 3.6) + b(103, 95, 24, 12, 'défausse', '#000', '#fff', 3.6);
    s += bloc(132, 93, 144, 16, COULEUR_VISION, '#f4ecd0', 'Devant chaque joueur', `1 vision secrète (choisie parmi 2), ${P.tailleMain} tendances en main, ${P.jetonsAttention} jetons d’attention, ses marqueurs`);
    return `<div class="schema"><svg class="fig" viewBox="0 0 280 112" xmlns="http://www.w3.org/2000/svg" font-family="DejaVu Sans, sans-serif">${s}</svg></div>`;
  },
  /** Schéma du cycle de vie d'une tendance et d'un signal. */
  cycles(): string {
    const b = (x: number, y: number, w: number, t: string, u: string, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="2" fill="#fff" stroke="${c}" stroke-width="0.8"/><text x="${x + w / 2}" y="${y + 7}" font-size="6" text-anchor="middle" font-weight="700">${t}</text><text x="${x + w / 2}" y="${y + 13}" font-size="5" text-anchor="middle">${u}</text>`;
    const f = (x: number, y: number, t = '') => `<path d="M${x} ${y} h10 m-3 -2.5 l3 2.5 l-3 2.5" fill="none" stroke="#000" stroke-width="0.8"/><text x="${x + 5}" y="${y - 4}" font-size="3.6" text-anchor="middle">${t}</text>`;
    let s = `<text x="2" y="12" font-size="6" font-weight="700">Tendance</text>` + b(34, 2, 52, '◌ Émergente', `infléchir : ${P.coutInflechir[0]} jeton`, ENCRE) + f(88, 10, 'bilan') + b(100, 2, 52, '◐ Installée', `infléchir : ${P.coutInflechir[1]} jetons`, ENCRE) + f(154, 10, 'bilan') + b(166, 2, 60, '■ Verrouillée', 'intouchable (sauf rupture)', ENCRE);
    s += `<text x="2" y="34" font-size="6" font-weight="700">Signal</text>` + b(34, 24, 52, 'Lointain', `pari précoce : ${P.ptsSignalPrecoce} pts`, COULEUR_SIGNAL) + f(88, 32, 'bilan') + b(100, 24, 52, 'Proche', `pari tardif : ${P.ptsSignalTardif} pt`, COULEUR_SIGNAL) + f(154, 32, 'bilan') + b(166, 24, 60, 'Tendance ■ force ' + P.forceSignal, 'ou extinction, selon le contexte', COULEUR_SIGNAL);
    s += `<text x="2" y="56" font-size="6" font-weight="700">Rupture</text>` + b(34, 46, 52, 'Révélée', 'début de décennie', COULEUR_RUPTURE) + f(88, 54, 'tient') + b(100, 46, 52, 'Encore latente', 'un dernier bilan', COULEUR_RUPTURE) + f(154, 54, 'tient') + b(166, 46, 60, 'Dissipée', 'dé ≤ tension : elle éclate', COULEUR_RUPTURE);
    return `<div class="schema"><svg class="fig" viewBox="0 0 230 64" xmlns="http://www.w3.org/2000/svg" font-family="DejaVu Sans, sans-serif">${s}</svg></div>`;
  },
};

function htmlAide(): string {
  const f = fs.readFileSync(path.join(racine, 'docs/AIDE_DE_JEU.md'), 'utf8');
  void f;
  return mdVersHtml(path.join(racine, 'docs/AIDE_DE_JEU.md'), 'Aiguillages — aide de jeu').replace('</style>', `body{font-size:8.9pt} h1{font-size:18pt} h2{font-size:11.5pt;margin-top:3mm} @page{margin:11mm 12mm}</style>`);
}

async function main() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.error('Playwright est requis pour générer les PDF : npm i -D playwright && npx playwright install chromium'); process.exit(1); }
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const quoi = process.argv.slice(2);
  const veut = (n: string) => quoi.length === 0 || quoi.includes(n);
  const ecrire = async (nom: string, html: string, opts: Record<string, unknown> = {}) => {
    await page.setContent(html, { waitUntil: 'load' });
    const sortie = path.join(racine, 'docs', nom);
    await page.pdf({ path: sortie, format: 'A4', printBackground: true, preferCSSPageSize: true, ...opts });
    const n = (fs.readFileSync(sortie).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    console.log(`${nom} : ${n} page(s)`);
    fs.mkdirSync(path.join(racine, 'web/public/pdf'), { recursive: true });
    fs.copyFileSync(sortie, path.join(racine, 'web/public/pdf', nom));
  };
  if (veut('cartes')) {
    await ecrire('CARTES.pdf', htmlCartes());
    // le plateau est en paysage : PDF séparé fusionné ensuite serait plus lourd ; on le publie à part
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aiguillages — plateau</title><style>@page{size:A4 landscape;margin:0} body{margin:0}</style></head><body>${pagePlateau()}</body></html>`);
    await page.pdf({ path: path.join(racine, 'docs/PLATEAU.pdf'), format: 'A4', landscape: true, printBackground: true });
    fs.copyFileSync(path.join(racine, 'docs/PLATEAU.pdf'), path.join(racine, 'web/public/pdf/PLATEAU.pdf'));
    console.log('PLATEAU.pdf : 1 page');
  }
  const pied = { displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: `<div style="font-size:7pt;width:100%;text-align:center;color:#555;font-family:sans-serif">Aiguillages — règles v${P.version} — CC BY-SA 4.0 — <span class="pageNumber"></span>/<span class="totalPages"></span></div>` };
  if (veut('regles') && fs.existsSync(path.join(racine, 'docs/REGLES.md'))) await ecrire('REGLES.pdf', mdVersHtml(path.join(racine, 'docs/REGLES.md'), 'Aiguillages — règles du jeu'), pied);
  if (veut('aide') && fs.existsSync(path.join(racine, 'docs/AIDE_DE_JEU.md'))) await ecrire('AIDE_DE_JEU.pdf', htmlAide());
  if (veut('rapport') && fs.existsSync(path.join(racine, 'docs/RAPPORT_EQUILIBRAGE.md'))) await ecrire('RAPPORT_EQUILIBRAGE.pdf', mdVersHtml(path.join(racine, 'docs/RAPPORT_EQUILIBRAGE.md'), 'Aiguillages — rapport d’équilibrage'), pied);
  await nav.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
