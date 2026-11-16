// Identité visuelle partagée entre le jeu web et les PDF : couleurs, pictogrammes et motifs SVG générés.
// Tout est dessiné par le code (aucune image sous droits). Chaque axe a une couleur ET une forme :
// les cartes restent lisibles en noir et blanc.
import type { Contenu } from '../moteur/src/types';

export const ENCRE = '#14213d';
export const PAPIER = '#f6f1e4';
export const AMBRE = '#d98e1f';
export const COULEURS_AXES = ['#2f6b3a', '#5e3f8a', '#1a5f8f', '#b0452f'];
export const COULEURS_AXES_CLAIR = ['#dcebd9', '#e4dcf0', '#d7e6f1', '#f3ddd5'];
export const COULEURS_JOUEURS = ['#b0452f', '#1a5f8f', '#2f6b3a', '#5e3f8a', '#8a6d1a'];
export const FORMES_JOUEURS = ['●', '■', '▲', '◆', '★'];
export const COULEUR_SIGNAL = '#3d4a63';
export const COULEUR_RUPTURE = '#8c1c13';
export const COULEUR_VISION = '#8a6d1a';

/** Pictogramme d'axe (viewBox 24×24, trait `c`). Matière : losange ; Technique : hexagone ; Échelle : cercles concentriques ; Lien : anneaux liés. */
export function pictoAxe(axe: number, c = 'currentColor', taille = 24): string {
  const corps = [
    `<path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M12 7 L17 12 L12 17 L7 12 Z" fill="${c}"/>`,
    `<path d="M12 2 L20.7 7 V17 L12 22 L3.3 17 V7 Z" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="12" cy="12" r="3.2" fill="${c}"/>`,
    `<circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="${c}"/>`,
    `<circle cx="8.5" cy="12" r="6.3" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="15.5" cy="12" r="6.3" fill="none" stroke="${c}" stroke-width="2.4"/>`,
  ][axe];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${taille}" height="${taille}" aria-hidden="true">${corps}</svg>`;
}

/** Pictogramme de type de carte : tendance (flèche épaisse), signal (ondes), rupture (éclair), vision (étoile polaire). */
export function pictoType(type: 'tendance' | 'signal' | 'rupture' | 'vision', c = 'currentColor', taille = 24): string {
  const corps = {
    tendance: `<path d="M3 15 H14 V20 L22 12 L14 4 V9 H3 Z" fill="${c}"/>`,
    signal: `<circle cx="5" cy="12" r="2.2" fill="${c}"/><path d="M10 6 A8 8 0 0 1 10 18 M14.5 3 A12.5 12.5 0 0 1 14.5 21" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
    rupture: `<path d="M14 1 L4 13 H11 L9 23 L20 10 H13 Z" fill="${c}"/>`,
    vision: `<path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" fill="${c}"/>`,
  }[type];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${taille}" height="${taille}" aria-hidden="true">${corps}</svg>`;
}

function hasard(graine: number): () => number {
  let s = graine | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function graineDe(id: string): number { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h; }

/**
 * Motif d'illustration d'une carte (SVG 200×90) : des voies qui s'écartent à un aiguillage.
 * Tendance : voies parallèles qui penchent vers le pôle ; signal : pointillés qui se dédoublent ;
 * rupture : voies brisées ; vision : voies qui convergent vers un point.
 */
export function motifCarte(id: string, type: 'tendance' | 'signal' | 'rupture' | 'vision', couleur: string, pole = 1): string {
  const r = hasard(graineDe(id));
  const W = 200, H = 90;
  let d = '';
  if (type === 'tendance') {
    const n = 4 + Math.floor(r() * 3);
    const sens = pole === 1 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const y0 = 12 + (i * (H - 24)) / (n - 1);
      const k = 30 + r() * 110;
      const dy = sens * (-8 - r() * 22);
      d += `<path d="M0 ${y0.toFixed(1)} H${k.toFixed(0)} C${(k + 40).toFixed(0)} ${y0.toFixed(1)} ${(k + 30).toFixed(0)} ${(y0 + dy).toFixed(1)} ${W} ${(y0 + dy).toFixed(1)}" fill="none" stroke="${couleur}" stroke-width="${(1.5 + r() * 2.5).toFixed(1)}" stroke-linecap="round" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`;
    }
    const x = pole === 1 ? W - 26 : 8;
    d += `<path d="${pole === 1 ? `M${x} 35 l14 10 l-14 10` : `M${x + 14} 35 l-14 10 l14 10`}" fill="none" stroke="${couleur}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (type === 'signal') {
    const y = 45, k = 70 + r() * 40;
    d += `<path d="M0 ${y} H${k}" fill="none" stroke="${couleur}" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    d += `<path d="M${k} ${y} C${k + 40} ${y} ${k + 40} 14 ${W} 14" fill="none" stroke="${couleur}" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round"/>`;
    d += `<path d="M${k} ${y} C${k + 40} ${y} ${k + 40} 76 ${W} 76" fill="none" stroke="${couleur}" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round"/>`;
    for (let i = 0; i < 9; i++) d += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}" fill="${couleur}" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`;
    d += `<circle cx="${k}" cy="${y}" r="5" fill="${couleur}"/>`;
  } else if (type === 'rupture') {
    const k = 80 + r() * 40;
    for (let i = 0; i < 4; i++) {
      const y0 = 16 + i * 19;
      const saut = (r() - 0.5) * 34;
      d += `<path d="M0 ${y0} H${(k - 6 + i * 3).toFixed(0)}" fill="none" stroke="${couleur}" stroke-width="3" stroke-linecap="round"/>`;
      d += `<path d="M${(k + 12 + i * 3).toFixed(0)} ${(y0 + saut).toFixed(0)} L${W} ${(y0 + saut * 1.6).toFixed(0)}" fill="none" stroke="${couleur}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
    }
    d += `<path d="M${k + 8} 0 L${k - 4} 30 L${k + 10} 42 L${k - 6} 66 L${k + 6} 90" fill="none" stroke="${couleur}" stroke-width="2" stroke-dasharray="3 3"/>`;
  } else {
    const cx = 150 + r() * 20, cy = 30 + r() * 20;
    for (let i = 0; i < 7; i++) d += `<path d="M0 ${(6 + i * 13).toFixed(0)} Q${(cx - 70).toFixed(0)} ${(6 + i * 13).toFixed(0)} ${cx.toFixed(0)} ${cy.toFixed(0)}" fill="none" stroke="${couleur}" stroke-width="1.6" opacity="${(0.35 + i * 0.08).toFixed(2)}"/>`;
    d += `<path d="M${cx} ${cy - 13} l3 10 l10 3 l-10 3 l-3 10 l-3 -10 l-10 -3 l10 -3 Z" fill="${couleur}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${d}</svg>`;
}

/** Logo : un aiguillage (une voie qui se sépare en deux). */
export function logo(taille = 48, c1 = ENCRE, c2 = AMBRE): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${taille}" height="${taille}" role="img" aria-label="Aiguillages"><rect width="48" height="48" rx="10" fill="${c1}"/><path d="M6 30 H20 C28 30 28 14 42 14" fill="none" stroke="${c2}" stroke-width="4" stroke-linecap="round"/><path d="M6 30 H20 C30 30 32 36 42 36" fill="none" stroke="${PAPIER}" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="30" r="3.4" fill="${PAPIER}"/></svg>`;
}

export function domaineAbrege(C: Contenu, d: string): string { void C; return d.charAt(0).toUpperCase() + d.slice(1); }
