// Partie partageable : la graine, la table et la suite des coups tiennent dans le fragment d'URL.
// Format : #p=<version>;<graine>;<sièges>;<coups>  — sièges : H (humain), F/M/D (bot facile, moyen, difficile).
import type { Coup } from '../../moteur/src/types';

export type TypeSiege = 'H' | 'F' | 'M' | 'D';
export interface PartiePartagee { version: string; graine: number; sieges: TypeSiege[]; coups: Coup[] }

export function encoderCoup(c: Coup): string {
  switch (c.t) {
    case 'vision': return 'v' + c.carte;
    case 'installer': return 'i' + c.carte;
    case 'inflechir': return 'f' + c.id;
    case 'veiller': return 'w' + c.uid;
    case 'parier': return (c.lecture === 1 ? 'h' : 'b') + c.uid;
    case 'renoncer': return 'n';
    case 'preparer': return 'r' + c.carte;
    case 'prospecter': return 'd';
    case 'passer': return 'x';
  }
}
export function decoderCoup(s: string): Coup {
  const n = Number(s.slice(1));
  switch (s[0]) {
    case 'v': return { t: 'vision', carte: n };
    case 'i': return { t: 'installer', carte: n };
    case 'f': return { t: 'inflechir', id: n };
    case 'w': return { t: 'veiller', uid: n };
    case 'h': return { t: 'parier', uid: n, lecture: 1 };
    case 'b': return { t: 'parier', uid: n, lecture: 0 };
    case 'n': return { t: 'renoncer' };
    case 'r': return { t: 'preparer', carte: n };
    case 'd': return { t: 'prospecter' };
    case 'x': return { t: 'passer' };
    default: throw new Error('Coup illisible : ' + s);
  }
}
export function encoderPartie(p: PartiePartagee): string {
  return `p=${p.version};${p.graine};${p.sieges.join('')};${p.coups.map(encoderCoup).join('.')}`;
}
export function decoderPartie(fragment: string): PartiePartagee | null {
  const m = /p=([^;]+);(-?\d+);([HFMD]{2,5});([a-z0-9.]*)/.exec(fragment);
  if (!m) return null;
  try {
    return { version: m[1], graine: Number(m[2]), sieges: m[3].split('') as TypeSiege[], coups: m[4] ? m[4].split('.').map(decoderCoup) : [] };
  } catch { return null; }
}
