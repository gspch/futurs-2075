// Rendu HTML des cartes (main, fiches de détail, choix de vision). Les textes d'effet viennent de recit/.
import { CONTENU as C } from '../../contenu';
import { effetTendance, effetSignal, effetRupture, effetVision, ciblePole, FLECHE } from '../../recit/recit';
import { motifCarte, pictoAxe, pictoType, COULEURS_AXES, COULEUR_SIGNAL, COULEUR_RUPTURE, COULEUR_VISION } from '../../recit/visuel';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export interface OptionsCarte { grande?: boolean; attrs?: string; classes?: string; bouton?: boolean }

function enveloppe(classes: string, o: OptionsCarte, label: string, contenu: string): string {
  const balise = o.bouton === false ? 'div' : 'button';
  return `<${balise} class="carte ${classes} ${o.grande ? 'grande' : ''} ${o.classes ?? ''}" ${o.attrs ?? ''} ${balise === 'button' ? 'type="button"' : ''} aria-label="${esc(label)}" title="${esc(label)}">${contenu}</${balise}>`;
}

export function carteTendance(i: number, o: OptionsCarte = {}): string {
  const t = C.tendances[i];
  const effet = effetTendance(C, i);
  return enveloppe(`a${t.axe}`, o, `Tendance : ${t.titre}. ${effet}`, `
    <div class="bandeau">${pictoAxe(t.axe, '#fff', 16)} ${esc(C.axes[t.axe].nom)} ${FLECHE[t.pole]} ${esc(C.axes[t.axe].poles[t.pole])}<span class="force" title="force">${t.force}</span></div>
    <div class="motif">${motifCarte(t.id, 'tendance', COULEURS_AXES[t.axe], t.pole)}</div>
    <div class="corps"><div class="titre">${esc(t.titre)}</div><div class="ambiance">${esc(t.texte)}</div>
    <div class="effet">${pictoType('tendance', 'currentColor', 12)} ${esc(effet)}</div></div>`);
}

export function carteSignal(i: number, o: OptionsCarte = {}): string {
  const s = C.signaux[i];
  const ef = effetSignal(C, i);
  return enveloppe('t-signal', o, `Signal faible : ${s.titre}. ${ef.contexte}. ${ef.haut}. ${ef.bas}.`, `
    <div class="bandeau">${pictoType('signal', '#fff', 16)} Signal faible · ${esc(s.domaine)}</div>
    <div class="motif">${motifCarte(s.id, 'signal', COULEUR_SIGNAL)}</div>
    <div class="corps"><div class="titre">${esc(s.titre)}</div><div class="ambiance">${esc(s.texte)}</div>
    <div class="effet"><strong>${esc(ef.contexte)}</strong><br>${esc(ef.haut)}<br>${esc(ef.bas)}</div></div>`);
}

export function carteSignalCachee(numero: number, o: OptionsCarte = {}): string {
  return enveloppe('t-signal', o, `Signal faible n° ${numero}, face cachée`, `
    <div class="bandeau">${pictoType('signal', '#fff', 16)} Signal faible</div>
    <div class="motif">${motifCarte('dos' + numero, 'signal', COULEUR_SIGNAL)}</div>
    <div class="corps"><div class="titre">Signal n° ${numero} — face cachée</div><div class="ambiance">Quelque chose bouge, mais quoi ? Veillez pour le regarder en secret.</div>
    <div class="effet">Un signal s’amplifie en tendance, ou s’éteint, selon le contexte au moment du bilan.</div></div>`);
}

export function carteRupture(i: number, o: OptionsCarte = {}): string {
  const r = C.ruptures[i];
  const ef = effetRupture(C, i);
  return enveloppe('t-rupture', o, `Rupture : ${r.titre}. ${ef.terrain} Effets : ${ef.effets.join(' ; ')}.`, `
    <div class="bandeau">${pictoType('rupture', '#fff', 16)} Rupture · ${esc(r.domaine)}</div>
    <div class="motif">${motifCarte(r.id, 'rupture', COULEUR_RUPTURE)}</div>
    <div class="corps"><div class="titre">${esc(r.titre)}</div><div class="ambiance">${esc(r.texte)}</div>
    <div class="effet">${esc(ef.terrain)}<br><strong>Si elle se déclenche :</strong> ${esc(ef.effets.join(' ; '))}.</div></div>`);
}

export function carteVision(i: number, o: OptionsCarte = {}): string {
  const v = C.visions[i];
  const ef = effetVision(C, i);
  return enveloppe('t-vision', o, `Vision : ${v.titre}. Principal : ${ef.principal}. Secondaire : ${ef.secondaire}.`, `
    <div class="bandeau">${pictoType('vision', '#fff', 16)} Vision — futur souhaitable</div>
    <div class="motif">${motifCarte(v.id, 'vision', COULEUR_VISION)}</div>
    <div class="corps"><div class="titre">${esc(v.titre)}</div><div class="ambiance">${esc(v.texte)}</div>
    <div class="effet"><strong>★ Principal :</strong> ${esc(ef.principal)}<br><strong>☆ Secondaire :</strong> ${esc(ef.secondaire)}</div></div>`);
}
export { ciblePole };
