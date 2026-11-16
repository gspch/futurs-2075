// Point d'accès unique au contenu du jeu (cartes et paramètres), partagé par le simulateur et le jeu web.
import cartes from './cartes.json';
import parametres from './parametres.json';
import type { Contenu, Parametres } from '../moteur/src/types';

export const CONTENU = cartes as unknown as Contenu;
export const PARAMETRES = parametres as unknown as Parametres;
