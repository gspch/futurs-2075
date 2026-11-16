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
