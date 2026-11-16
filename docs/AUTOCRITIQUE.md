# Autocritique

Ce document dit ce qui ne va pas, ce qui n'a pas été vérifié, et ce que la méthode ne peut pas voir. Les chiffres renvoient à `RAPPORT_EQUILIBRAGE.md`.

## Faiblesses connues du jeu

1. **Le dernier ne revient pas assez à 4 et 5 joueurs.** Critère 4 non atteint dans ces configurations (environ 7 % et 5 % contre 10 % visés ; atteint à 2 et 3 joueurs).
   Cause identifiée : à 5 joueurs chacun n'a que 10 actions ; après 2055 il en reste 4, trop peu pour remonter 8 points d'écart. Sept leviers ont été essayés (voir `ITERATIONS.md`) ;
   la valeur est passée de 1 % à 5 %, pas au-delà. C'est la plus grande faiblesse mesurée.
2. **À 4-5 joueurs on regarde presque autant qu'on construit.** Une action sur deux est une veille. Le jeu se veut un jeu de trajectoires ; à cinq, il tire vers le jeu d'observation.
3. **La durée en ligne à 5 joueurs est sous la cible** (19 minutes estimées pour 20), et celle à 4 joueurs sur table est proche du plafond (72 minutes estimées pour 75). Ces durées reposent sur des hypothèses de conversion non mesurées.
4. **Peu d'actions par joueur à 5** (10 dans toute la partie). Chaque décision pèse lourd, mais un joueur peut passer une décennie entière sans rien installer.
5. **Les visions radicales (cases 1 et 9) sont plus difficiles** que les réformistes : la carte la plus défavorable du jeu est une vision (écart de taux de victoire d'environ 5 points, dans le seuil de 8 mais visible).
6. **L'expert n'écrase pas le glouton.** Il gagne nettement mais pas massivement : soit le jeu n'a pas une profondeur immense au-delà d'un coup d'anticipation bien évalué, soit mon expert est médiocre.
   Je ne sais pas trancher. Un expert plus fort (arbre plus profond, meilleure inférence des visions adverses) le dirait.
7. **Deux joueurs.** Les critères passent, mais la partie est un duel d'influence sans la dimension d'alliances de circonstance qui fait l'intérêt du jeu à 3 et plus. Aucune règle spécifique n'a été écrite.
8. **Manipulations sur table.** Le suivi de l'ancrage (couchée → redressée → jeton) sur une vingtaine de tendances, le calcul des forces de quatre axes à chaque bilan, les jetons précoces : c'est beaucoup. Le jeu web cache ce coût ; la table le révélera.
9. **Faiseur de roi : non mesuré.** Le cahier des charges l'interdit ; je n'ai pas de métrique qui le prouve absent. Les visions secrètes le rendent involontaire plutôt qu'impossible : au dernier tour, pousser un axe d'une case peut déplacer 3 points de vision chez un autre.
10. **Élimination de fait.** Personne n'est éliminé, mais un joueur dont la voie principale s'est fermée en 2055 joue vingt ans avec un objectif mort. Il lui reste l'héritage et l'anticipation ; est-ce assez pour rester à la table avec plaisir ?

## Ce que la simulation ne mesure pas

- **Le plaisir.** Aucun bot ne s'ennuie, ne jubile, ne se sent trahi. Un jeu peut satisfaire les huit critères et être ennuyeux.
- **La clarté.** Les bots ne lisent pas les règles. Ils ne se trompent jamais sur la lecture ▲/▼ d'un signal, n'oublient jamais une tendance au bilan, ne confondent pas « penche vers » et « est du côté de ».
  La règle la plus risquée à cet égard est la double lecture des signaux selon un axe de contexte différent de l'axe modifié.
- **La narration.** Le récit de fin de partie est généré par gabarits ; il est correct, pas forcément évocateur. Savoir si les joueurs *racontent* leur partie (« on a fermé l'Abondance en 2055 et tout a déraillé ») ne se simule pas.
- **La négociation et le bluff.** Les bots ne se parlent pas. À table, « je vise la case 7, aide-moi à freiner » change tout. Le jeu réel est probablement plus politique — et le faiseur de roi plus présent — que le jeu simulé.
- **La mise en place et le rangement**, le temps d'explication des règles, la fatigue en fin de partie.
- **L'apprentissage.** Les bots jouent leur millième partie. Une première partie humaine ressemble sans doute davantage au bot « facile ».
- **La lisibilité des cartes imprimées** en conditions réelles (éclairage, distance, daltonisme) : vérifiée à l'écran, pas sur papier.
- **Les stratégies que mes bots n'imaginent pas.** Le test adverse explore l'espace des *poids d'une même fonction d'évaluation*. Une stratégie d'une autre nature (coalition tacite, temporisation délibérée, blocage coordonné) lui échappe.
  « Aucune variante ne dépasse le seuil » signifie « aucune variante de cette famille », pas « aucune stratégie ».

## Limites de la méthode

- **Les bots partagent une évaluation commune.** Ils sont donc proches en force par construction : le critère 1 est plus facile à satisfaire que si les stratégies étaient écrites indépendamment.
  Les archétypes restent distincts dans leurs actes (le chasseur veille davantage, le parieur se prépare davantage, les spécialistes installent surtout sur leur axe), mais ce sont des cousins.
- **Le calibrage est refait à chaque version.** C'est honnête pour comparer des règles, mais cela veut dire que « le glouton » de la v1.0 n'est pas celui de la v0.1.
- **Critère 5.** « Présence d'une carte » a été interprété comme association carte-joueur (voir `DECISIONS.md`, D11). La seconde moitié du critère (« 85 % des cartes apparaissent dans des parties gagnantes ») est satisfaite trivialement à 100 % sur 40 000 parties et n'apprend rien.
- **Critère 8.** « À moins de 10 % de la valeur du meilleur coup » est mesuré sur le score final attendu selon l'expert, une échelle où beaucoup de coups se ressemblent. La mesure stricte sur la marge (score du joueur moins meilleur score adverse) est donnée à côté ; elle est plus basse.
- **Critère 7.** La conversion décisions → minutes repose sur des constantes que j'ai choisies (38 secondes par décision à table). Aucune n'a été chronométrée.
- **Traçabilité.** Les versions 0.4 à 0.6 ont été développées d'un trait et partagent un commit ; la v0.6 n'a été mesurée qu'en exploration (1 500 parties, bots non recalibrés).
  Les tags n'ont pas pu être poussés sur le dépôt distant, ni la release créée, ni le site déployé sur GitHub Pages (voir `DECISIONS.md`, D12 et D13).
- **Aucune partie humaine.** Ni moi ni personne n'a joué ce jeu autour d'une table.

## Cinq questions précises à vérifier en partie test

1. **Lecture des signaux.** Après avoir regardé un signal, un joueur sait-il dire sans aide quelle lecture va se réaliser, et pourquoi ? Mesure : nombre de questions de règle posées sur les signaux pendant la partie ; nombre de paris posés sur une lecture impossible.
2. **Viser juste.** Au troisième bilan, les joueurs voient-ils venir le dépassement de leur case cible ? Est-ce vécu comme un retournement savoureux ou comme une injustice ? Mesure : à la fin, demander à chacun à quel moment il a compris qu'il fallait freiner.
3. **Durée et manipulations.** Combien de temps dure réellement une première partie à 4, mise en place comprise, et un bilan (hypothèse : 2 min 30) ? Quelqu'un oublie-t-il de redresser ou de verrouiller une tendance ?
4. **Le dernier.** Le joueur dont la vision est manifestement perdue en 2055 reste-t-il engagé jusqu'en 2075 ? Que fait-il de ses dernières actions, et qu'en dit-il après ?
5. **Faiseur de roi.** Au dernier tour de table, un joueur hors course choisit-il de fait le vainqueur ? Mesure : rejouer le dernier tour à visions révélées et compter les coups qui changent le gagnant sans changer le rang de leur auteur.

Ces cinq questions sont reprises dans l'issue « Aucune partie test avec des humains ».
