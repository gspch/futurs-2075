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
