# Itérations des règles

Chaque version des règles est un tag git. Pour chacune : hypothèse, changement, métriques avant et après, conclusion.
Sauf mention contraire, les mesures d'itération portent sur 2 000 parties par configuration (2, 3, 4, 5 joueurs, tables mélangées
tirées parmi les 9 stratégies non expertes) et 300 duels expert par adversaire, graine 2075 :

```
npm run sim -- explorer --parties 2000 --duels 300 --graine 2075
```

Les résumés agrégés sont dans `simulations/`. La validation finale (10 000 parties par configuration) est dans `docs/RAPPORT_EQUILIBRAGE.md`.

Lecture des colonnes : **C1** = pire ratio victoires/part attendue d'une stratégie non experte (seuil ≤ 1,30) ; **C2** = avantage du premier joueur en points (< 3) ;
**C3** = victoires de l'expert contre aléatoire / contre glouton à 2 joueurs (≥ 75 % / ≥ 60 %) ; **C4** = victoires du dernier en 2055, pire configuration (≥ 10 %) ;
**C5** = pire écart de taux de victoire lié à une carte (≤ 8 pts) ; **C6** = part du type de société le plus fréquent (≤ 40 %) ; **C8** = nombre moyen de coups à moins de 10 % du meilleur (≥ 2).

## v0.1 — Premier jet jouable

Règles de départ : 5 jetons d'attention, pas de 2 cases par décennie, bascule en bout de piste, pari précoce 3 pts / tardif 1 pt, rupture anticipée 4 pts.

| C1 | C2 | C3 | C4 | C5 | C6 | C8 |
|----|----|----|----|----|----|----|
| ✘ 1,72 (chasseur, 5 j.) | ✔ 1,4 | ✔ 93 % / ✘ 51 % | ✘ 1,0 % | ✔ 4,8 | ✔ 30 % | ✔ 4,5 |

Constats :
- **Le jeu est un jeu de paris, pas de trajectoires.** L'anticipation pèse 16 à 18 points sur 25 ; à 2 joueurs on veille 18 fois pour 11 tendances installées. Le chasseur de signaux écrase tout à 4-5 joueurs.
- **Les axes s'emballent** : plus de 2 bascules par partie, presque tous les mondes finissent dans un coin ; le type « équilibre » n'existe pas.
- **Aucun retour possible** à 4-5 joueurs (1 à 3,5 %).
- L'expert ne bat pas le glouton (51 %) : la recherche n'apporte rien quand le meilleur coup est presque toujours « parier ».

## Calibrage des bots (sans changement de règles)

Avant de toucher aux règles, vérification que le diagnostic ne vient pas de bots mal réglés : recherche évolutionnaire sur les poids de l'évaluation
(`npm run adverse -- --adopter 1`), deux passes, les meilleurs poids deviennent la référence « glouton » (`bots/src/poids.json`).
Les archétypes (chasseur, parieur, bloqueur, spécialistes) sont définis comme des déformations de cette référence.
Ce calibrage est refait après chaque changement de règles (`outils/iteration.sh`) : **on ne compare jamais des règles nouvelles avec des joueurs réglés pour les anciennes.**

v0.1 avec bots calibrés : C1 ✘ 1,55 (chasseur, 5 j.) · C2 ✔ 2,5 · C3 ✔ 95 % / ✔ 64 % · C4 ✘ 1,2 % · C5 ✔ 5,0 · C6 ✔ 16 % · C8 ✔ 4,3.
Le défaut est confirmé : anticipation = 17 points sur 25, 19 à 29 veilles par partie. C'est bien un problème de règles.

## v0.2 — L'attention devient rare et disputée

**Hypothèse.** Le jeu est un jeu de paris parce que l'attention ne coûte rien : 5 jetons qui reviennent vite, et tout le monde peut parier sur le même signal.
Si l'attention est rare (3 jetons) et si chaque lecture d'un signal n'accepte qu'un seul pari (premier arrivé, premier servi), les paris redeviennent un choix et une course.

**Changement.** `jetonsAttention` 5 → 3 ; `placesParLecture` = 1 (une place ▲ et une place ▼ par signal) ; `ptsRupture` 4 → 3.

| | C1 | C2 | C3 | C4 | C5 | C6 | C8 | anticipation / score moyen (4 j.) |
|--|----|----|----|----|----|----|----|----|
| avant (v0.1 calibrée) | ✘ 1,55 | ✔ 2,5 | ✔ 95 % / ✔ 64 % | ✘ 1,2 % | ✔ 5,0 | ✔ 16 % | ✔ 4,3 | 17,4 / 25,7 |
| après (v0.2) | ✘ 1,40 (glouton, 5 j.) | ✔ −2,5 | ✔ 92 % / ✘ 57 % | ✘ 1,7 % | ✔ 5,5 | ✔ 16 % | ✔ 4,2 | 8,6 / 18,6 |

**Conclusion.** Hypothèse confirmée : l'anticipation passe de deux tiers à un peu moins de la moitié des points, on installe plus qu'on ne parie à 2 et 3 joueurs,
le chasseur ne domine plus. Reste : glouton trop fort à 4-5 joueurs, toujours plus de 2 bascules par partie, et le dernier ne revient jamais à 4-5 joueurs
(à 2 joueurs il gagne 25 % du temps, à 3 joueurs 10 %). L'expert repasse sous 60 % contre le glouton : à surveiller, pas à corriger par les règles pour l'instant.

## v0.3 — Un pas par décennie, bascule avant le bout de piste

**Hypothèse.** Les axes s'emballent parce qu'ils peuvent avancer de 2 cases par décennie : en trois bilans un axe est en bout de piste, la voie opposée se ferme,
et le reste de la partie n'a plus d'enjeu sur cet axe. Avec un pas d'une seule case (« l'axe avance d'une case vers le côté le plus lourd », règle aussi plus simple à table)
et une bascule à 4 cases du centre, les axes restent disputés plus longtemps.

**Changement.** `pasMaxAxe` 2 → 1 ; `seuilBascule` = 4 (cases 1 et 9) au lieu du bout de piste.

| | C1 | C2 | C3 | C4 | C5 | C6 | C8 | bascules / partie (4 j.) |
|--|----|----|----|----|----|----|----|----|
| avant (v0.2) | ✘ 1,40 | ✔ −2,5 | ✔ 92 % / ✘ 57 % | ✘ 1,7 % | ✔ 5,5 | ✔ 16 % | ✔ 4,2 | 2,5 |
| après (v0.3) | ✘ 1,36 (glouton, 5 j.) | ✘ −3,6 (5 j.) | ✔ 91 % / ✘ 43 % | ✘ 1,5 % | ✔ 5,0 | ✔ 18 % | ✔ 4,3 | 2,0 |

**Conclusion.** Hypothèse à moitié confirmée : un peu moins de bascules, règle plus simple, mais **le jeu s'est aplati** — l'expert tombe à 43 % contre le glouton
(critère 3 dégradé) : quand chaque axe ne fait qu'avancer d'un pas vers le plus lourd, pousser « toujours plus » suffit et anticiper n'apporte rien.
Le dernier ne revient toujours pas (un diagnostic dédié montre qu'à 5 joueurs, même entre bots identiques, l'écart moyen de 8,5 points en 2055 n'est jamais remonté :
le meneur continue de gagner des points de vision par simple inertie). Leviers essayés sans effet sur C4 : barème de vision concave, ruptures plus nombreuses en fin de partie,
bonus de cohérence sur l'héritage. Le pas d'une case est conservé pour sa lisibilité, mais il faut une autre voie pour redonner de la profondeur : voir v0.4.

## v0.4 — Viser juste : les visions ont une cible, pas une direction

**Hypothèse.** Le jeu est plat et sans retour parce que « souhaitable » veut dire « le plus loin possible » : le meneur n'a qu'à laisser l'inertie travailler pour lui.
Si chaque vision vise une **case précise** (réformiste : 2 cases du centre ; radicale : 4 cases), l'inertie devient un danger pour celui-là même qui l'a créée :
il faut freiner à temps, et les adversaires peuvent pousser *dans le même sens* pour faire dépasser la cible. C'est aussi plus juste sur le fond : un futur souhaitable n'est pas un extrême.

**Changement.** Cartes Vision : objectif principal et secondaire = (axe, case). Barèmes selon l'écart à la case visée : principal `10 / 7 / 4 / 1`, secondaire `5 / 3 / 1`.
Deux visions principales par pôle : une réformiste (case 3 ou 7, secondaire à 3 cases du centre) et une radicale (case 1 ou 9, secondaire à 2 cases).

| | C1 | C2 | C3 | C4 (2 / 3 / 4 / 5 j.) | C5 | C6 | C8 | meneur de 2055 gagne (5 j.) |
|--|----|----|----|----|----|----|----|----|
| avant (v0.3) | ✘ 1,36 | ✘ −3,6 | ✔ 91 % / ✘ 43 % | ✘ 21 / 7,4 / 3,0 / 1,5 % | ✔ 5,0 | ✔ 18 % | ✔ 4,3 | 56 % |
| après (v0.4) | ✘ 1,37 (chasseur, 4 j.) | ✔ −2,2 | ✔ 93 % / ✔ 62 % | ✘ 29 / 12 / 6,7 / 3,9 % | ✔ 5,0 | ✔ 16 % | ✔ 4,0 | 43 % |

**Conclusion.** Hypothèse confirmée sur la profondeur (l'expert rebat le glouton, +19 points) et sur le suspense (le meneur de 2055 ne gagne plus que 43 à 49 % des parties à 4-5 joueurs,
le dernier revient deux à trois fois plus souvent). Insuffisant pour C4 à 4-5 joueurs. Nouveau défaut mis en évidence : installer étant devenu risqué, les bots veillent sans arrêt
(21 à 31 veilles par partie, dont un tiers sans pari) : regarder ne coûte qu'un tour. Voir v0.5.

## v0.5 — Regarder coûte un jeton

**Hypothèse.** Les bots veillent sans arrêt parce que regarder un signal ne coûte qu'un tour. Si l'attention est vraiment la ressource rare du jeu, regarder doit en consommer.

**Changement.** Veiller = poser un jeton d'attention sur le signal, le regarder, puis orienter ce jeton (▲ ou ▼) ou le retirer (il ne revient qu'au bilan).
On ne parie plus que sur le signal qu'on vient de regarder. Sans jeton libre, pas de veille.

| | C1 | C2 | C3 | C4 (2 / 3 / 4 / 5 j.) | C5 | C6 | C8 | veilles / installations (2 j.) |
|--|----|----|----|----|----|----|----|----|
| avant (v0.4) | ✘ 1,37 | ✔ −2,2 | ✔ 93 % / ✔ 62 % | ✘ 29 / 12 / 6,7 / 3,9 % | ✔ 5,0 | ✔ 16 % | ✔ 4,0 | 21 / 12 |
| après (v0.5) | ✘ 1,33 (chasseur, 4 j.) | ✔ 1,5 | ✔ 95 % / ✘ 56 % | ✘ 29 / 14 / 6,2 / 3,4 % | ✔ 4,6 | ✔ 16 % | ✔ 3,1 | 13 / 17 |

**Conclusion.** Confirmée à 2-3 joueurs (on installe de nouveau plus qu'on ne veille), partielle à 4-5 joueurs où l'on veille encore un tour sur deux.
C1 frôle le seuil. L'expert contre le glouton retombe à 56 % (intervalle [50 ; 61], 300 parties : à remesurer sur 10 000). C8 baisse parce qu'il y a moins de coups légaux (6,7 contre 10,4), pas moins de coups défendables en proportion.

## v0.6 — Construire paie autant qu'anticiper

**Hypothèse.** L'anticipation pèse encore la moitié des points parce qu'une tendance installée ne rapporte qu'un point d'héritage, moins qu'un pari tardif réussi par action.
En doublant l'héritage, bâtir la trajectoire redevient le cœur du jeu, et un joueur mal parti peut se refaire en accompagnant le futur probable.

**Changement.** `ptsHeritage` 1 → 2.

Mesure exploratoire (1 500 parties par configuration, bots non recalibrés) : C1 1,38 (glouton, 5 j.) ; C4 4,6 % (5 j.) et 8,0 % (4 j.) ; héritage = un tiers du score (6,1 points sur 18,0 à 4 joueurs,
contre 2,6 sur 14,6) ; 23 installations pour 23 veilles à 4 joueurs (contre 20 / 26).

**Conclusion.** Confirmée : les trois sources de points s'équilibrent (vision 5,0 · héritage 6,1 · anticipation 6,9 à 4 joueurs). Le retour du dernier progresse sans atteindre le seuil. Mesure complète faite avec la v0.7, qui ajoute un seul changement.

## v0.7 — Les moins avancés ouvrent la décennie

**Hypothèse.** Avec une seule place par lecture, l'ordre du tour compte : jouer premier, c'est choisir son signal. Si le joueur qui a le moins de points d'anticipation
ouvre chaque décennie (au lieu d'une simple rotation), on corrige à la fois le biais de position constaté à 5 joueurs et un peu de l'avance du meneur.

**Changement.** `ordreRattrapage` : à chaque nouvelle décennie, le premier joueur est celui qui a le moins de points d'anticipation (à égalité, le plus proche à gauche de l'ancien premier joueur). Le tour continue dans le sens horaire.

| | C1 | C2 | C3 | C4 (2 / 3 / 4 / 5 j.) | C5 | C6 | C8 | score moyen à 4 j. (vision / héritage / anticipation) |
|--|----|----|----|----|----|----|----|----|
| avant (v0.5, dernière mesure complète) | ✘ 1,33 | ✔ 1,5 | ✔ 95 % / ✘ 56 % | ✘ 29 / 14 / 6,2 / 3,4 % | ✔ 4,6 | ✔ 16 % | ✔ 3,1 | 5,1 / 2,6 / 6,8 |
| après (v0.6 + v0.7) | ✔ 1,24 (parieur, 5 j.) | ✔ −0,5 | ✔ 96 % / ✘ 58 % | ✘ 29 / 14 / 7,4 / 5,1 % | ✔ 5,1 | ✔ 16 % | ✔ 3,1 | 5,1 / 4,9 / 6,2 |

**Conclusion.** Confirmée pour l'équité de position (les cinq sièges gagnent entre 19,5 et 20,9 % des parties à 5 joueurs) et, avec la v0.6, pour C1 : **plus aucune stratégie simple ne dépasse 1,3 fois sa part.**
Le retour du dernier continue de progresser (5,1 % à 5 joueurs contre 1,0 % en v0.1) sans atteindre 10 % à 4 et 5 joueurs : critère **non atteint** dans ces deux configurations.
L'expert contre le glouton est à la limite du seuil sur 300 parties (58 %, intervalle [52 ; 63]) ; une mesure séparée sur 600 parties donne 65,5 % : la mesure finale sur 10 000 parties tranchera.

## v1.0 — Gel des règles

Aucun changement de règle par rapport à la v0.7. Les bots de référence sont recalibrés une dernière fois avec des bornes de recherche élargies, puis :
mesure finale sur 10 000 parties par configuration et test adverse (`docs/RAPPORT_EQUILIBRAGE.md`).

### Correspondance versions → commits

Les tags `v0.1` à `v1.0` existent dans le dépôt de travail mais **n'ont pas pu être poussés** : la session de développement n'était autorisée à pousser que sa branche (voir `DECISIONS.md`, D12).
Pour les recréer : `git tag -a <version> <commit>` avec la table ci-dessous. Les versions 0.4, 0.5 et 0.6 ont été développées d'un trait et partagent un commit ; leurs paramètres respectifs sont décrits plus haut.

| Version | Commit | Paramètres caractéristiques |
|---|---|---|
| v0.1 | `88d639f` | 5 jetons, pas de 2, bascule en bout de piste |
| v0.2 | `a0124ff` | 3 jetons, 1 place par lecture, rupture 3 pts |
| v0.3 | `2ef1c93` | pas de 1, bascule à 4 cases |
| v0.4 – v0.6 | voir `git log` (« Règles v0.4 à v0.6 ») | visions à cible ; veille payante ; héritage 2 pts |
| v0.7, v1.0 | voir `git log` (« Règles v1.0 ») | ordre de rattrapage ; gel |
