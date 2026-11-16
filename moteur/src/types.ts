// Types du moteur d'Aiguillages. Tout l'état est sérialisable en JSON.

export interface Cible { axe: number; pole: number }

export interface DefAxe { id: string; nom: string; poles: [string, string] | string[]; question: string }
export interface CarteTendance { id: string; titre: string; texte: string; domaine: string; axe: number; pole: number; force: number; prerequis?: Cible }
export interface Lecture { titre: string; axe: number; pole: number }
export interface CarteSignal { id: string; titre: string; texte: string; domaine: string; condition: number | null; haut: Lecture | null; bas: Lecture | null }
export type Effet =
  | { type: 'deplacer'; axe: number; pole: number; n: number }
  | { type: 'purger'; axe: number; pole: number; n: number }
  | { type: 'rebattre' };
export interface CarteRupture { id: string; titre: string; texte: string; domaine: string; terrain: Cible; tensionMin: number; effets: Effet[] }
/** Objectif d'une vision : amener l'axe exactement sur une case. */
export interface CibleVision { axe: number; pole: number; case: number }
export interface CarteVision { id: string; titre: string; texte: string; principal: CibleVision; secondaire: CibleVision }
export interface TypeSociete { id: string; axe: number | null; pole: number | null; nom: string; texte: string }

export interface Contenu {
  nom: string;
  axes: DefAxe[];
  domaines: string[];
  tendances: CarteTendance[];
  signaux: CarteSignal[];
  ruptures: CarteRupture[];
  visions: CarteVision[];
  types: TypeSociete[];
}

export interface Parametres {
  version: string;
  decennies: number;
  actionsParDecennie: Record<string, number>;
  tailleMain: number;
  mainMax: number;
  piocheProspecter: number;
  jetonsAttention: number;
  signauxParDecennie: number;
  pisteMax: number;
  pasMaxAxe: number;
  coutInflechir: number[];
  ageVerrou: number;
  forceSignal: number;
  ptsSignalPrecoce: number;
  ptsSignalTardif: number;
  ptsRupture: number;
  /** points de vision selon l'écart (en cases) entre l'axe et la case visée : index 0 = pile sur la cible */
  baremePrincipal: number[];
  baremeSecondaire: number[];
  ptsHeritage: number;
  rupturesLatentesMax: number;
  facesDe: number;
  [cle: string]: unknown;
}

/** Tendance posée sur la table. id = index de la carte Tendance, ou 100 + index du Signal dont elle est née. */
export interface TendanceEnJeu {
  id: number;
  axe: number;
  pole: number;
  force: number;
  /** joueur qui l'a installée, -1 pour une tendance née d'un signal */
  proprio: number;
  /** 0 = émergente, 1 = installée, 2 = verrouillée */
  age: number;
  /** décennie de pose (0 = 2025-2035) */
  pose: number;
  /** pour une tendance née d'un signal : 0 = lecture basse, 1 = lecture haute ; sinon -1 */
  lecture: number;
}

export interface Pari { j: number; lecture: number; precoce: boolean }
/** Signal face cachée dans l'Horizon. carte = -1 dans une observation si le joueur ne l'a pas regardé. */
export interface SignalHorizon { uid: number; carte: number; zone: number; paris: Pari[] }
export interface RuptureLatente { carte: number; age: number; prepares: number[] }

export interface Joueur {
  main: number[];
  choixVisions: number[];
  vision: number;
  /** jetons d'attention disponibles */
  attention: number;
  /** jetons dépensés pour infléchir, rendus au bilan */
  depense: number;
  /** points d'anticipation (publics) */
  anticipation: number;
  /** uid des signaux de l'Horizon que ce joueur a regardés */
  connus: number[];
}

export type Phase = 'visions' | 'actions' | 'veille' | 'fin';

export interface Etat {
  nbJoueurs: number;
  rng: number;
  phase: Phase;
  decennie: number;
  /** tour de table en cours dans la décennie (0..actionsParDecennie-1) */
  tour: number;
  /** rang du joueur courant dans le tour de table (0..nbJoueurs-1) */
  rang: number;
  premier: number;
  courant: number;
  axes: number[];
  /** valeurs des axes en 2025 puis à chaque fin de décennie */
  histoire: number[][];
  /** voies fermées, index axe*2+pole */
  fermees: boolean[];
  tendances: TendanceEnJeu[];
  piocheT: number[];
  defausseT: number[];
  piocheS: number[];
  piocheR: number[];
  piocheV: number[];
  horizon: SignalHorizon[];
  ruptures: RuptureLatente[];
  /** signaux déjà résolus (publics) et ruptures déjà révélées (publiques) */
  signauxResolus: number[];
  rupturesVues: number[];
  joueurs: Joueur[];
  prochainUid: number;
  nbCoups: number;
  /** uid du signal en cours de veille (phase « veille »), 0 sinon */
  veille: number;
}

export type Coup =
  | { t: 'vision'; carte: number }
  | { t: 'installer'; carte: number }
  | { t: 'inflechir'; id: number }
  | { t: 'veiller'; uid: number }
  | { t: 'parier'; uid: number; lecture: number }
  | { t: 'renoncer' }
  | { t: 'preparer'; carte: number }
  | { t: 'prospecter' }
  | { t: 'passer' };

export interface Gain { j: number; pts: number }
export type Evenement =
  | { t: 'decennie'; d: number; premier: number }
  | { t: 'ruptureRevelee'; carte: number }
  | { t: 'signauxPoses'; n: number; zone: number }
  | { t: 'vision'; j: number }
  | { t: 'installer'; j: number; carte: number }
  | { t: 'inflechir'; j: number; id: number; proprio: number }
  | { t: 'veiller'; j: number; uid: number }
  | { t: 'parier'; j: number; uid: number; lecture: number; precoce: boolean }
  | { t: 'renoncer'; j: number }
  | { t: 'preparer'; j: number; carte: number }
  | { t: 'prospecter'; j: number; n: number }
  | { t: 'passer'; j: number }
  | { t: 'bilan'; d: number }
  | { t: 'mouvement'; axe: number; de: number; a: number; net: number }
  | { t: 'signalAmplifie'; uid: number; carte: number; lecture: number; gains: Gain[] }
  | { t: 'signalEteint'; uid: number; carte: number; raison: 'bruit' | 'centre' | 'sansLecture' | 'voieFermee' }
  | { t: 'ruptureDe'; carte: number; tension: number; de: number; declenchee: boolean }
  | { t: 'rupture'; carte: number; gains: Gain[] }
  | { t: 'ruptureDissipee'; carte: number }
  | { t: 'deplacement'; axe: number; de: number; a: number }
  | { t: 'purge'; ids: number[] }
  | { t: 'rebattre' }
  | { t: 'bascule'; axe: number; poleFerme: number }
  | { t: 'verrou'; ids: number[] }
  | { t: 'fin' };

export interface Score { vision: number; heritage: number; anticipation: number; total: number }
export interface ConfigPartie { nbJoueurs: number; graine: number }
