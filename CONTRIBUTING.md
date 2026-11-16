# Contribuer à Aiguillages

Merci de votre intérêt. Le jeu est développé en ouvert : règles, cartes, code, simulations et décisions sont dans ce dépôt.
Toute contribution est la bienvenue, à une condition : **une affirmation sur l'équilibre s'appuie sur des données**.

## Mettre en route

```bash
npm ci            # Node 22
npm test          # règles critiques + 100 parties aléatoires
npm run dev       # le jeu web en local
npm run sim -- explorer --parties 2000 --duels 300   # mesurer les critères d'équilibre
```

## Proposer une carte

1. Ajoutez-la dans `contenu/cartes.json` (le schéma `contenu/schemas/cartes.schema.json` est vérifié par les tests).
2. Respectez la symétrie : chaque pôle a 7 tendances (5 de force 1, 2 de force 2 avec prérequis sur un autre axe), 2 ruptures, 2 visions. Une carte en plus d'un côté appelle sa contrepartie de l'autre.
3. Contenu : ancré dans un débat prospectif réel, **qualitatif** (aucun chiffre présenté comme un fait s'il n'est pas exact et sourcé), ton neutre, aucune entreprise, marque ou personne réelle. Titre ≤ 48 caractères, texte ≤ 140.
4. Le jeu ne dépasse pas 120 cartes : une carte ajoutée en remplace une autre.
5. Lancez `npm test` puis la simulation, et joignez le tableau des critères à votre demande de fusion. Le critère 5 (aucune carte à plus de 8 points d'écart de taux de victoire) doit rester vert.

## Proposer une règle

Une règle = une hypothèse. Dans votre demande de fusion ou votre issue (étiquette `règles`) :

- l'**hypothèse** (« le dernier ne revient pas parce que… ») ;
- le **changement**, de préférence un paramètre de `contenu/parametres.json` ; si le moteur doit changer, ajoutez le test correspondant dans `moteur/tests/` ;
- les **métriques avant et après** : `outils/iteration.sh <version>` recalibre les bots de référence puis mesure les huit critères (2 000 parties par configuration). Donnez la graine ;
- la **conclusion**, y compris si le jeu s'aplatit (critères 3, 4, 6 ou 8 dégradés).

On n'équilibre jamais en affaiblissant un bot : on corrige les règles ou les cartes.

## Signaler un déséquilibre

Ouvrez une issue avec l'étiquette `équilibrage` et **les données** : la commande, la graine, le résumé produit. Exemples :

```bash
npm run adverse -- --generations 12 --population 24      # chercher une stratégie dominante
npm run sim -- duel --bots expert,glouton --parties 1000 --graine 42
```

Un lien de partie (bouton « Partager » du jeu en ligne) vaut mieux qu'un récit : il rejoue la partie coup par coup.

## Interface et accessibilité

Étiquette `interface`. Le jeu doit rester utilisable au clavier, lisible sans dépendre de la couleur (chaque axe a une forme, chaque joueur un symbole), et jouable sur téléphone.

## Style

- TypeScript strict. Aucune règle hors de `moteur/` : le web et le simulateur passent par `coupsLegaux()` et `jouer()`.
- Messages de commit en français, qui disent pourquoi.
- Les données brutes de simulation ne sont pas versionnées ; seuls les résumés (`simulations/`) le sont, avec la commande et la graine.

## Licences

En contribuant, vous acceptez que votre code soit publié sous licence MIT et votre contenu (règles, textes, visuels) sous CC BY-SA 4.0.
